import { CUTTING_PLAN_ALGORITHM_VERSION } from './defaults';
import {
  getPieceOrientations,
  getUsableSheetArea,
  hasOverlappingPlacements,
  isReusableRegion,
  regionArea,
} from './geometry';
import { calculateCuttingPlanPricing } from './pricing';
import {
  CuttingPlanCut,
  CuttingPlanGenerationError,
  CuttingPlanInput,
  CuttingPlanMaterial,
  CuttingPlanMetrics,
  CuttingPlanPiece,
  CuttingPlanPlacement,
  CuttingPlanRegion,
  CuttingPlanResult,
  CuttingPlanSheet,
  CuttingPlanWasteRegion,
} from './types';

const EPSILON = 0.000001;

type SortStrategy =
  | 'area_desc'
  | 'dimension_groups'
  | 'height_desc'
  | 'long_side_desc'
  | 'width_desc';

type RegionSelection = 'best_area_fit' | 'best_short_side' | 'first_fit';

type SplitPreference = 'horizontal_first' | 'vertical_first';

interface CandidateConfiguration {
  id: string;
  regionSelection: RegionSelection;
  sortStrategy: SortStrategy;
  splitPreferences: SplitPreference[];
}

interface ExpandedPiece {
  instanceId: string;
  piece: CuttingPlanPiece;
}

interface FreeRegion {
  depth: number;
  region: CuttingPlanRegion;
}

interface WorkingSheet extends CuttingPlanSheet {
  freeRegions: FreeRegion[];
}

type PendingCut = Omit<CuttingPlanCut, 'id' | 'step'>;

interface PlacementSimulation {
  cuts: PendingCut[];
  freeRegions: FreeRegion[];
  lossRegions: CuttingPlanWasteRegion[];
  placement: CuttingPlanPlacement;
}

interface PlacementOption extends PlacementSimulation {
  optionScore: number[];
  regionIndex: number;
  sheetIndex: number;
  splitPreference: SplitPreference;
}

interface CandidateResult {
  configurationId: string;
  result: CuttingPlanResult;
}

const CANDIDATE_CONFIGURATIONS: CandidateConfiguration[] = [
  {
    id: 'dimension-rows',
    sortStrategy: 'dimension_groups',
    regionSelection: 'first_fit',
    splitPreferences: ['horizontal_first'],
  },
  {
    id: 'dimension-columns',
    sortStrategy: 'dimension_groups',
    regionSelection: 'first_fit',
    splitPreferences: ['vertical_first'],
  },
  {
    id: 'area-best-fit',
    sortStrategy: 'area_desc',
    regionSelection: 'best_area_fit',
    splitPreferences: ['horizontal_first', 'vertical_first'],
  },
  {
    id: 'long-side-best-fit',
    sortStrategy: 'long_side_desc',
    regionSelection: 'best_short_side',
    splitPreferences: ['vertical_first', 'horizontal_first'],
  },
  {
    id: 'width-strips',
    sortStrategy: 'width_desc',
    regionSelection: 'best_area_fit',
    splitPreferences: ['vertical_first'],
  },
  {
    id: 'height-strips',
    sortStrategy: 'height_desc',
    regionSelection: 'best_area_fit',
    splitPreferences: ['horizontal_first'],
  },
];

const cloneSettings = (settings: CuttingPlanInput['settings']) => ({
  ...settings,
  balancedWeights: { ...settings.balancedWeights },
});

const clonePiece = (piece: CuttingPlanPiece): CuttingPlanPiece => ({
  ...piece,
  edgeBandEdges: [...piece.edgeBandEdges],
});

const cloneMaterial = (
  material: CuttingPlanMaterial,
): CuttingPlanMaterial => ({ ...material });

const compareNumbers = (a: number, b: number) => {
  if (Math.abs(a - b) <= EPSILON) return 0;
  return a < b ? -1 : 1;
};

const compareScoreArrays = (a: number[], b: number[]) => {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const comparison = compareNumbers(a[index] ?? 0, b[index] ?? 0);
    if (comparison !== 0) return comparison;
  }
  return 0;
};

export function getPieceCompatibilityKey(piece: CuttingPlanPiece): string {
  return [
    piece.materialId,
    piece.thicknessMm ?? '',
    piece.finish ?? '',
    piece.color ?? '',
    piece.pattern ?? '',
    piece.grainDirection,
  ].join('|');
}

function validateInput(input: CuttingPlanInput): void {
  getUsableSheetArea(input.settings);

  if (input.pieces.length === 0) {
    throw new CuttingPlanGenerationError(
      'EMPTY_PIECES',
      'Adicione ao menos uma peça antes de gerar o plano.',
    );
  }

  const materials = new Set(input.materials.map(material => material.id));
  input.pieces.forEach(piece => {
    if (!materials.has(piece.materialId)) {
      throw new CuttingPlanGenerationError(
        'MATERIAL_NOT_FOUND',
        `O material da peça “${piece.description}” não foi encontrado.`,
        piece.id,
      );
    }
    if (
      !Number.isFinite(piece.widthMm) ||
      !Number.isFinite(piece.lengthMm) ||
      piece.widthMm <= 0 ||
      piece.lengthMm <= 0 ||
      !Number.isInteger(piece.quantity) ||
      piece.quantity <= 0
    ) {
      throw new CuttingPlanGenerationError(
        'INVALID_PIECE',
        `A peça “${piece.description}” possui medidas ou quantidade inválidas.`,
        piece.id,
      );
    }
  });
}

function expandPieces(pieces: CuttingPlanPiece[]): ExpandedPiece[] {
  return pieces.flatMap(piece =>
    Array.from({ length: piece.quantity }, (_, index) => ({
      piece,
      instanceId: `${piece.id}-${String(index + 1).padStart(3, '0')}`,
    })),
  );
}

function sortExpandedPieces(
  pieces: ExpandedPiece[],
  strategy: SortStrategy,
): ExpandedPiece[] {
  const result = [...pieces];
  result.sort((a, b) => {
    const aArea = a.piece.widthMm * a.piece.lengthMm;
    const bArea = b.piece.widthMm * b.piece.lengthMm;
    const aLong = Math.max(a.piece.widthMm, a.piece.lengthMm);
    const bLong = Math.max(b.piece.widthMm, b.piece.lengthMm);
    const aShort = Math.min(a.piece.widthMm, a.piece.lengthMm);
    const bShort = Math.min(b.piece.widthMm, b.piece.lengthMm);

    let comparison = 0;
    if (strategy === 'dimension_groups') {
      comparison = bLong - aLong || bShort - aShort || bArea - aArea;
    } else if (strategy === 'long_side_desc') {
      comparison = bLong - aLong || bShort - aShort || bArea - aArea;
    } else if (strategy === 'width_desc') {
      comparison = b.piece.widthMm - a.piece.widthMm || bArea - aArea;
    } else if (strategy === 'height_desc') {
      comparison = b.piece.lengthMm - a.piece.lengthMm || bArea - aArea;
    } else {
      comparison = bArea - aArea || bLong - aLong;
    }

    return (
      comparison ||
      a.piece.id.localeCompare(b.piece.id) ||
      a.instanceId.localeCompare(b.instanceId)
    );
  });
  return result;
}

function cutLossAtDepth(
  depth: number,
  input: CuttingPlanInput,
): { internal: number; kerf: number; total: number } {
  const internal = depth > 0 ? input.settings.internalCutLossMm : 0;
  const kerf = input.settings.kerfMm;
  return { internal, kerf, total: internal + kerf };
}

function createLossRegion(input: {
  heightMm: number;
  id: string;
  widthMm: number;
  xMm: number;
  yMm: number;
}): CuttingPlanWasteRegion | null {
  if (input.widthMm <= EPSILON || input.heightMm <= EPSILON) return null;
  return {
    ...input,
    reusable: false,
    reason: 'kerf_and_internal_loss',
  };
}

function simulatePlacement(input: {
  expandedPiece: ExpandedPiece;
  freeRegion: FreeRegion;
  orientation: ReturnType<typeof getPieceOrientations>[number];
  planInput: CuttingPlanInput;
  sheetId: string;
  splitPreference: SplitPreference;
}): PlacementSimulation | null {
  const {
    expandedPiece,
    freeRegion,
    orientation,
    planInput,
    sheetId,
    splitPreference,
  } = input;
  const region = freeRegion.region;
  const pieceWidth = orientation.widthMm;
  const pieceHeight = orientation.heightMm;

  if (
    pieceWidth - region.widthMm > EPSILON ||
    pieceHeight - region.heightMm > EPSILON
  ) {
    return null;
  }

  const placementId = `${sheetId}-piece-${expandedPiece.instanceId}`;
  const placement: CuttingPlanPlacement = {
    id: placementId,
    pieceInstanceId: expandedPiece.instanceId,
    originalPieceId: expandedPiece.piece.id,
    referenceItemId: expandedPiece.piece.referenceItemId,
    description: expandedPiece.piece.description,
    xMm: region.xMm,
    yMm: region.yMm,
    widthMm: pieceWidth,
    heightMm: pieceHeight,
    rotated: orientation.rotated,
    grainDirection: expandedPiece.piece.grainDirection,
    edgeBandEdges: [...expandedPiece.piece.edgeBandEdges],
  };

  const firstIsVertical = splitPreference === 'vertical_first';
  const firstPieceSize = firstIsVertical ? pieceWidth : pieceHeight;
  const firstRegionSize = firstIsVertical ? region.widthMm : region.heightMm;
  const firstNeedsCut = firstRegionSize - firstPieceSize > EPSILON;
  const firstLoss = cutLossAtDepth(freeRegion.depth, planInput);
  if (firstNeedsCut && firstRegionSize - firstPieceSize + EPSILON < firstLoss.total) {
    return null;
  }

  const firstStripId = `${region.id}-${firstIsVertical ? 'left' : 'top'}-strip`;
  const firstRemainderId = `${region.id}-${firstIsVertical ? 'right' : 'bottom'}`;
  const secondRegionSize = firstIsVertical ? region.heightMm : region.widthMm;
  const secondPieceSize = firstIsVertical ? pieceHeight : pieceWidth;
  const secondNeedsCut = secondRegionSize - secondPieceSize > EPSILON;
  const secondDepth = freeRegion.depth + (firstNeedsCut ? 1 : 0);
  const secondLoss = cutLossAtDepth(secondDepth, planInput);
  if (
    secondNeedsCut &&
    secondRegionSize - secondPieceSize + EPSILON < secondLoss.total
  ) {
    return null;
  }

  const secondRemainderId = `${firstNeedsCut ? firstStripId : region.id}-${
    firstIsVertical ? 'bottom' : 'right'
  }`;
  const freeRegions: FreeRegion[] = [];
  const lossRegions: CuttingPlanWasteRegion[] = [];
  const cuts: PendingCut[] = [];

  if (firstNeedsCut) {
    const firstRemainder: CuttingPlanRegion = firstIsVertical
      ? {
          id: firstRemainderId,
          xMm: region.xMm + pieceWidth + firstLoss.total,
          yMm: region.yMm,
          widthMm: region.widthMm - pieceWidth - firstLoss.total,
          heightMm: region.heightMm,
        }
      : {
          id: firstRemainderId,
          xMm: region.xMm,
          yMm: region.yMm + pieceHeight + firstLoss.total,
          widthMm: region.widthMm,
          heightMm: region.heightMm - pieceHeight - firstLoss.total,
        };

    if (regionArea(firstRemainder) > EPSILON) {
      freeRegions.push({
        region: firstRemainder,
        depth: freeRegion.depth + 1,
      });
    }

    const firstLossRegion = createLossRegion(
      firstIsVertical
        ? {
            id: `${region.id}-first-cut-loss`,
            xMm: region.xMm + pieceWidth,
            yMm: region.yMm,
            widthMm: firstLoss.total,
            heightMm: region.heightMm,
          }
        : {
            id: `${region.id}-first-cut-loss`,
            xMm: region.xMm,
            yMm: region.yMm + pieceHeight,
            widthMm: region.widthMm,
            heightMm: firstLoss.total,
          },
    );
    if (firstLossRegion) lossRegions.push(firstLossRegion);

    cuts.push({
      sheetId,
      kind: 'piece',
      orientation: firstIsVertical ? 'vertical' : 'horizontal',
      positionMm: firstIsVertical
        ? region.xMm + pieceWidth
        : region.yMm + pieceHeight,
      startMm: firstIsVertical ? region.yMm : region.xMm,
      lengthMm: firstIsVertical ? region.heightMm : region.widthMm,
      targetRegionId: region.id,
      resultRegionIds: [
        secondNeedsCut ? firstStripId : placementId,
        firstRemainderId,
      ],
      kerfLossMm: firstLoss.kerf,
      internalCutLossMm: firstLoss.internal,
    });
  }

  if (secondNeedsCut) {
    const secondRemainder: CuttingPlanRegion = firstIsVertical
      ? {
          id: secondRemainderId,
          xMm: region.xMm,
          yMm: region.yMm + pieceHeight + secondLoss.total,
          widthMm: pieceWidth,
          heightMm: region.heightMm - pieceHeight - secondLoss.total,
        }
      : {
          id: secondRemainderId,
          xMm: region.xMm + pieceWidth + secondLoss.total,
          yMm: region.yMm,
          widthMm: region.widthMm - pieceWidth - secondLoss.total,
          heightMm: pieceHeight,
        };

    if (regionArea(secondRemainder) > EPSILON) {
      freeRegions.push({
        region: secondRemainder,
        depth: secondDepth + 1,
      });
    }

    const secondLossRegion = createLossRegion(
      firstIsVertical
        ? {
            id: `${firstNeedsCut ? firstStripId : region.id}-second-cut-loss`,
            xMm: region.xMm,
            yMm: region.yMm + pieceHeight,
            widthMm: pieceWidth,
            heightMm: secondLoss.total,
          }
        : {
            id: `${firstNeedsCut ? firstStripId : region.id}-second-cut-loss`,
            xMm: region.xMm + pieceWidth,
            yMm: region.yMm,
            widthMm: secondLoss.total,
            heightMm: pieceHeight,
          },
    );
    if (secondLossRegion) lossRegions.push(secondLossRegion);

    cuts.push({
      sheetId,
      kind: 'piece',
      orientation: firstIsVertical ? 'horizontal' : 'vertical',
      positionMm: firstIsVertical
        ? region.yMm + pieceHeight
        : region.xMm + pieceWidth,
      startMm: firstIsVertical ? region.xMm : region.yMm,
      lengthMm: firstIsVertical ? pieceWidth : pieceHeight,
      targetRegionId: firstNeedsCut ? firstStripId : region.id,
      resultRegionIds: [placementId, secondRemainderId],
      kerfLossMm: secondLoss.kerf,
      internalCutLossMm: secondLoss.internal,
    });
  }

  return { placement, freeRegions, lossRegions, cuts };
}

function edgeTrimCuts(
  sheet: WorkingSheet,
  edgeTrimMm: number,
): PendingCut[] {
  if (edgeTrimMm <= EPSILON) return [];
  const usable = sheet.usableArea;
  return [
    {
      sheetId: sheet.id,
      kind: 'edge_trim',
      orientation: 'vertical',
      positionMm: edgeTrimMm,
      startMm: 0,
      lengthMm: sheet.totalLengthMm,
      targetRegionId: sheet.id,
      resultRegionIds: [`${sheet.id}-left-trim`, `${sheet.id}-after-left-trim`],
      kerfLossMm: 0,
      internalCutLossMm: 0,
    },
    {
      sheetId: sheet.id,
      kind: 'edge_trim',
      orientation: 'vertical',
      positionMm: sheet.totalWidthMm - edgeTrimMm,
      startMm: 0,
      lengthMm: sheet.totalLengthMm,
      targetRegionId: `${sheet.id}-after-left-trim`,
      resultRegionIds: [`${sheet.id}-usable-width`, `${sheet.id}-right-trim`],
      kerfLossMm: 0,
      internalCutLossMm: 0,
    },
    {
      sheetId: sheet.id,
      kind: 'edge_trim',
      orientation: 'horizontal',
      positionMm: edgeTrimMm,
      startMm: usable.xMm,
      lengthMm: usable.widthMm,
      targetRegionId: `${sheet.id}-usable-width`,
      resultRegionIds: [`${sheet.id}-top-trim`, `${sheet.id}-after-top-trim`],
      kerfLossMm: 0,
      internalCutLossMm: 0,
    },
    {
      sheetId: sheet.id,
      kind: 'edge_trim',
      orientation: 'horizontal',
      positionMm: sheet.totalLengthMm - edgeTrimMm,
      startMm: usable.xMm,
      lengthMm: usable.widthMm,
      targetRegionId: `${sheet.id}-after-top-trim`,
      resultRegionIds: [usable.id, `${sheet.id}-bottom-trim`],
      kerfLossMm: 0,
      internalCutLossMm: 0,
    },
  ];
}

function appendCuts(
  sheet: WorkingSheet,
  pendingCuts: PendingCut[],
  state: { nextStep: number },
): void {
  pendingCuts.forEach(pendingCut => {
    const step = state.nextStep;
    state.nextStep += 1;
    sheet.cuts.push({
      ...pendingCut,
      id: `${pendingCut.sheetId}-cut-${String(step).padStart(4, '0')}`,
      step,
    });
  });
}

function createWorkingSheet(input: {
  material: CuttingPlanMaterial;
  number: number;
  planInput: CuttingPlanInput;
  state: { nextStep: number };
}): WorkingSheet {
  const { material, number, planInput, state } = input;
  const totalWidthMm = material.sheetWidthMm ?? planInput.settings.sheetWidthMm;
  const totalLengthMm =
    material.sheetLengthMm ?? planInput.settings.sheetLengthMm;
  const id = `sheet-${String(number).padStart(3, '0')}`;
  const usableArea = {
    ...getUsableSheetArea(planInput.settings, totalWidthMm, totalLengthMm),
    id: `${id}-usable`,
  };
  const sheet: WorkingSheet = {
    id,
    number,
    material: cloneMaterial(material),
    totalWidthMm,
    totalLengthMm,
    usableArea,
    placements: [],
    cuts: [],
    wasteRegions: [],
    freeRegions: [{ region: usableArea, depth: 0 }],
  };
  appendCuts(sheet, edgeTrimCuts(sheet, planInput.settings.edgeTrimMm), state);
  return sheet;
}

function placementOptionScore(input: {
  configuration: CandidateConfiguration;
  freeRegion: FreeRegion;
  simulation: PlacementSimulation;
}): number[] {
  const { configuration, freeRegion, simulation } = input;
  const leftoverArea =
    regionArea(freeRegion.region) - regionArea(simulation.placement);
  const shortSideLeftover = Math.min(
    freeRegion.region.widthMm - simulation.placement.widthMm,
    freeRegion.region.heightMm - simulation.placement.heightMm,
  );

  if (configuration.regionSelection === 'first_fit') {
    return [simulation.cuts.length];
  }
  if (configuration.regionSelection === 'best_short_side') {
    return [shortSideLeftover, leftoverArea, simulation.cuts.length];
  }
  return [leftoverArea, shortSideLeftover, simulation.cuts.length];
}

function findPlacementOption(input: {
  configuration: CandidateConfiguration;
  expandedPiece: ExpandedPiece;
  planInput: CuttingPlanInput;
  sheets: WorkingSheet[];
}): PlacementOption | null {
  const { configuration, expandedPiece, planInput, sheets } = input;
  let best: PlacementOption | null = null;

  sheets.forEach((sheet, sheetIndex) => {
    sheet.freeRegions.forEach((freeRegion, regionIndex) => {
      getPieceOrientations(expandedPiece.piece).forEach(orientation => {
        configuration.splitPreferences.forEach(splitPreference => {
          const simulation = simulatePlacement({
            expandedPiece,
            freeRegion,
            orientation,
            planInput,
            sheetId: sheet.id,
            splitPreference,
          });
          if (!simulation) return;

          const option: PlacementOption = {
            ...simulation,
            sheetIndex,
            regionIndex,
            splitPreference,
            optionScore: placementOptionScore({
              configuration,
              freeRegion,
              simulation,
            }),
          };

          if (!best) {
            best = option;
            return;
          }
          const scoreComparison = compareScoreArrays(
            option.optionScore,
            best.optionScore,
          );
          if (
            scoreComparison < 0 ||
            (scoreComparison === 0 &&
              (option.sheetIndex < best.sheetIndex ||
                (option.sheetIndex === best.sheetIndex &&
                  option.regionIndex < best.regionIndex)))
          ) {
            best = option;
          }
        });
      });
    });
  });

  return best;
}

function calculateMetrics(
  sheets: CuttingPlanSheet[],
  edgeBandLengthMeters: number,
): CuttingPlanMetrics {
  const totalSheetAreaMm2 = sheets.reduce(
    (total, sheet) => total + sheet.totalWidthMm * sheet.totalLengthMm,
    0,
  );
  const usedAreaMm2 = sheets.reduce(
    (total, sheet) =>
      total +
      sheet.placements.reduce(
        (sheetTotal, placement) => sheetTotal + regionArea(placement),
        0,
      ),
    0,
  );
  const reusableWasteAreaMm2 = sheets.reduce(
    (total, sheet) =>
      total +
      sheet.wasteRegions
        .filter(region => region.reusable)
        .reduce(
          (sheetTotal, region) => sheetTotal + regionArea(region),
          0,
        ),
    0,
  );
  const discardedWasteAreaMm2 = Math.max(
    0,
    totalSheetAreaMm2 - usedAreaMm2 - reusableWasteAreaMm2,
  );
  const percentage = (area: number) =>
    totalSheetAreaMm2 === 0
      ? 0
      : Math.round((area / totalSheetAreaMm2) * 10000) / 100;

  return {
    sheetCount: sheets.length,
    movementCount: sheets.reduce(
      (total, sheet) => total + sheet.cuts.length,
      0,
    ),
    totalSheetAreaMm2,
    usedAreaMm2,
    reusableWasteAreaMm2,
    discardedWasteAreaMm2,
    utilizationPercentage: percentage(usedAreaMm2),
    wastePercentage: percentage(totalSheetAreaMm2 - usedAreaMm2),
    edgeBandLengthMeters,
  };
}

function runCandidate(
  input: CuttingPlanInput,
  configuration: CandidateConfiguration,
): CandidateResult {
  const materialById = new Map(
    input.materials.map(material => [material.id, material]),
  );
  const groups = new Map<string, ExpandedPiece[]>();
  expandPieces(input.pieces).forEach(expandedPiece => {
    const key = getPieceCompatibilityKey(expandedPiece.piece);
    groups.set(key, [...(groups.get(key) ?? []), expandedPiece]);
  });

  const sheets: WorkingSheet[] = [];
  const state = { nextStep: 1 };
  [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([, groupedPieces]) => {
      const firstPiece = groupedPieces[0].piece;
      const material = {
        ...materialById.get(firstPiece.materialId)!,
        thicknessMm: firstPiece.thicknessMm,
        finish: firstPiece.finish,
        color: firstPiece.color,
        pattern: firstPiece.pattern,
      };
      const groupSheets: WorkingSheet[] = [];
      const orderedPieces = sortExpandedPieces(
        groupedPieces,
        configuration.sortStrategy,
      );

      orderedPieces.forEach(expandedPiece => {
        let option = findPlacementOption({
          configuration,
          expandedPiece,
          planInput: input,
          sheets: groupSheets,
        });

        if (!option) {
          const sheet = createWorkingSheet({
            material,
            number: sheets.length + groupSheets.length + 1,
            planInput: input,
            state,
          });
          groupSheets.push(sheet);
          option = findPlacementOption({
            configuration,
            expandedPiece,
            planInput: input,
            sheets: groupSheets,
          });
        }

        if (!option) {
          throw new CuttingPlanGenerationError(
            'PIECE_TOO_LARGE',
            `A peça “${expandedPiece.piece.description}” não cabe na área útil da chapa com as perdas configuradas.`,
            expandedPiece.piece.id,
          );
        }

        const sheet = groupSheets[option.sheetIndex];
        sheet.freeRegions.splice(option.regionIndex, 1, ...option.freeRegions);
        sheet.placements.push(option.placement);
        sheet.wasteRegions.push(...option.lossRegions);
        appendCuts(sheet, option.cuts, state);
      });

      sheets.push(...groupSheets);
    });

  const finalizedSheets: CuttingPlanSheet[] = sheets.map(sheet => {
    const remainderRegions: CuttingPlanWasteRegion[] = sheet.freeRegions.map(
      ({ region }) => ({
        ...region,
        reason: 'remainder',
        reusable: isReusableRegion(region, input.settings),
      }),
    );
    const publicSheet: CuttingPlanSheet = {
      id: sheet.id,
      number: sheet.number,
      material: sheet.material,
      totalWidthMm: sheet.totalWidthMm,
      totalLengthMm: sheet.totalLengthMm,
      usableArea: sheet.usableArea,
      placements: sheet.placements,
      cuts: sheet.cuts,
      wasteRegions: [...sheet.wasteRegions, ...remainderRegions],
    };
    if (hasOverlappingPlacements(publicSheet.placements)) {
      throw new Error(`Sobreposição detectada na chapa ${publicSheet.number}.`);
    }
    return publicSheet;
  });

  const edgeBandLengthMeters = input.pieces.reduce((total, piece) => {
    const pieceEdgeMm = piece.edgeBandEdges.reduce(
      (sum, edge) =>
        sum +
        (edge === 'top' || edge === 'bottom'
          ? piece.widthMm
          : piece.lengthMm),
      0,
    );
    return total + (pieceEdgeMm * piece.quantity) / 1000;
  }, 0);
  const metrics = calculateMetrics(finalizedSheets, edgeBandLengthMeters);
  const pricing = calculateCuttingPlanPricing({
    sheets: finalizedSheets,
    movementCount: metrics.movementCount,
    pieces: input.pieces,
    settings: input.settings,
  });
  const cutSequence = finalizedSheets
    .flatMap(sheet => sheet.cuts)
    .sort((a, b) => a.step - b.step);

  return {
    configurationId: configuration.id,
    result: {
      algorithmVersion: CUTTING_PLAN_ALGORITHM_VERSION,
      optimizationMode: input.optimizationMode,
      settings: cloneSettings(input.settings),
      inputSnapshot: {
        pieces: input.pieces.map(clonePiece),
        materials: input.materials.map(cloneMaterial),
      },
      sheets: finalizedSheets,
      cutSequence,
      metrics,
      pricing,
    },
  };
}

function normalized(value: number, values: number[]): number {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return maximum - minimum <= EPSILON ? 0 : (value - minimum) / (maximum - minimum);
}

function selectCandidate(
  candidates: CandidateResult[],
  input: CuttingPlanInput,
): CandidateResult {
  if (input.optimizationMode === 'fewer_cuts') {
    return [...candidates].sort((a, b) => {
      return (
        a.result.metrics.movementCount - b.result.metrics.movementCount ||
        a.result.metrics.sheetCount - b.result.metrics.sheetCount ||
        a.result.metrics.discardedWasteAreaMm2 -
          b.result.metrics.discardedWasteAreaMm2 ||
        a.configurationId.localeCompare(b.configurationId)
      );
    })[0];
  }

  if (input.optimizationMode === 'best_yield') {
    return [...candidates].sort((a, b) => {
      return (
        a.result.metrics.sheetCount - b.result.metrics.sheetCount ||
        a.result.metrics.discardedWasteAreaMm2 -
          b.result.metrics.discardedWasteAreaMm2 ||
        a.result.metrics.movementCount - b.result.metrics.movementCount ||
        a.configurationId.localeCompare(b.configurationId)
      );
    })[0];
  }

  const sheetCounts = candidates.map(item => item.result.metrics.sheetCount);
  const movements = candidates.map(item => item.result.metrics.movementCount);
  const discardedWaste = candidates.map(
    item => item.result.metrics.discardedWasteAreaMm2,
  );
  const weights = input.settings.balancedWeights;

  return [...candidates].sort((a, b) => {
    const score = (candidate: CandidateResult) =>
      weights.sheetCount *
        normalized(candidate.result.metrics.sheetCount, sheetCounts) +
      weights.movementCount *
        normalized(candidate.result.metrics.movementCount, movements) +
      weights.waste *
        normalized(
          candidate.result.metrics.discardedWasteAreaMm2,
          discardedWaste,
        );
    return score(a) - score(b) || a.configurationId.localeCompare(b.configurationId);
  })[0];
}

export function generateCuttingPlan(input: CuttingPlanInput): CuttingPlanResult {
  validateInput(input);
  const candidates: CandidateResult[] = [];
  let lastError: unknown;

  CANDIDATE_CONFIGURATIONS.forEach(configuration => {
    try {
      candidates.push(runCandidate(input, configuration));
    } catch (error) {
      lastError = error;
    }
  });

  if (candidates.length === 0) {
    if (lastError instanceof Error) throw lastError;
    throw new CuttingPlanGenerationError(
      'PIECE_TOO_LARGE',
      'Não foi possível posicionar as peças nas chapas configuradas.',
    );
  }

  return selectCandidate(candidates, input).result;
}
