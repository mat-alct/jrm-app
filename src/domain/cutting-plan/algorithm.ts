import { CUTTING_PLAN_ALGORITHM_VERSION } from './defaults';
import {
  getPieceOrientations,
  getUsableSheetArea,
  hasOverlappingPlacements,
  regionArea,
  rotateEdgeBandEdges,
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

const otherOrientation = (
  orientation: CuttingPlanCut['orientation'],
): CuttingPlanCut['orientation'] =>
  orientation === 'vertical' ? 'horizontal' : 'vertical';

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

const cloneMaterial = (material: CuttingPlanMaterial): CuttingPlanMaterial => ({
  ...material,
});

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
  return piece.materialId;
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
  const internal = depth > 0 ? input.settings.internalEdgeTrimMm * 2 : 0;
  const kerf = input.settings.kerfMm;
  return { internal, kerf, total: internal + kerf };
}

function createLossRegion(input: {
  heightMm: number;
  id: string;
  reason: CuttingPlanWasteRegion['reason'];
  widthMm: number;
  xMm: number;
  yMm: number;
}): CuttingPlanWasteRegion | null {
  if (input.widthMm <= EPSILON || input.heightMm <= EPSILON) return null;
  return {
    ...input,
  };
}

function createCutLossRegions(input: {
  heightMm: number;
  id: string;
  internalEdgeTrimMm: number;
  kerfMm: number;
  orientation: CuttingPlanCut['orientation'];
  widthMm: number;
  xMm: number;
  yMm: number;
}): CuttingPlanWasteRegion[] {
  const {
    heightMm,
    id,
    internalEdgeTrimMm,
    kerfMm,
    orientation,
    widthMm,
    xMm,
    yMm,
  } = input;
  const regions: CuttingPlanWasteRegion[] = [];
  const vertical = orientation === 'vertical';
  let offset = 0;

  const append = (
    sizeMm: number,
    reason: CuttingPlanWasteRegion['reason'],
    suffix: string,
  ) => {
    if (sizeMm <= EPSILON) return;
    const region = createLossRegion({
      id: `${id}-${suffix}`,
      xMm: xMm + (vertical ? offset : 0),
      yMm: yMm + (vertical ? 0 : offset),
      widthMm: vertical ? sizeMm : widthMm,
      heightMm: vertical ? heightMm : sizeMm,
      reason,
    });
    if (region) regions.push(region);
    offset += sizeMm;
  };

  append(internalEdgeTrimMm, 'internal_trim', 'trim-before');
  append(kerfMm, 'kerf', 'kerf');
  append(internalEdgeTrimMm, 'internal_trim', 'trim-after');

  return regions;
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
    sourceRegionId: region.id,
    grainDirection: expandedPiece.piece.grainDirection,
    edgeBandEdges: rotateEdgeBandEdges(
      expandedPiece.piece.edgeBandEdges,
      orientation.rotated,
    ),
  };

  const firstIsVertical = splitPreference === 'vertical_first';
  const firstPieceSize = firstIsVertical ? pieceWidth : pieceHeight;
  const firstRegionSize = firstIsVertical ? region.widthMm : region.heightMm;
  const firstNeedsCut = firstRegionSize - firstPieceSize > EPSILON;
  const firstLoss = cutLossAtDepth(freeRegion.depth, planInput);
  if (
    firstNeedsCut &&
    firstRegionSize - firstPieceSize + EPSILON < firstLoss.total
  ) {
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

    lossRegions.push(
      ...createCutLossRegions(
        firstIsVertical
          ? {
              id: `${region.id}-first-cut-loss`,
              xMm: region.xMm + pieceWidth,
              yMm: region.yMm,
              widthMm: firstLoss.total,
              heightMm: region.heightMm,
              orientation: 'vertical',
              kerfMm: firstLoss.kerf,
              internalEdgeTrimMm: firstLoss.internal / 2,
            }
          : {
              id: `${region.id}-first-cut-loss`,
              xMm: region.xMm,
              yMm: region.yMm + pieceHeight,
              widthMm: region.widthMm,
              heightMm: firstLoss.total,
              orientation: 'horizontal',
              kerfMm: firstLoss.kerf,
              internalEdgeTrimMm: firstLoss.internal / 2,
            },
      ),
    );

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
      targetRegion: { ...region },
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

    lossRegions.push(
      ...createCutLossRegions(
        firstIsVertical
          ? {
              id: `${firstNeedsCut ? firstStripId : region.id}-second-cut-loss`,
              xMm: region.xMm,
              yMm: region.yMm + pieceHeight,
              widthMm: pieceWidth,
              heightMm: secondLoss.total,
              orientation: 'horizontal',
              kerfMm: secondLoss.kerf,
              internalEdgeTrimMm: secondLoss.internal / 2,
            }
          : {
              id: `${firstNeedsCut ? firstStripId : region.id}-second-cut-loss`,
              xMm: region.xMm + pieceWidth,
              yMm: region.yMm,
              widthMm: secondLoss.total,
              heightMm: pieceHeight,
              orientation: 'vertical',
              kerfMm: secondLoss.kerf,
              internalEdgeTrimMm: secondLoss.internal / 2,
            },
      ),
    );

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
      targetRegion: firstIsVertical
        ? {
            id: firstNeedsCut ? firstStripId : region.id,
            xMm: region.xMm,
            yMm: region.yMm,
            widthMm: pieceWidth,
            heightMm: region.heightMm,
          }
        : {
            id: firstNeedsCut ? firstStripId : region.id,
            xMm: region.xMm,
            yMm: region.yMm,
            widthMm: region.widthMm,
            heightMm: pieceHeight,
          },
      resultRegionIds: [placementId, secondRemainderId],
      kerfLossMm: secondLoss.kerf,
      internalCutLossMm: secondLoss.internal,
    });
  }

  return { placement, freeRegions, lossRegions, cuts };
}

function directionalTrimCuts(input: {
  orientation: CuttingPlanCut['orientation'];
  otherDirectionPrepared: boolean;
  panelId: string;
  placements: CuttingPlanPlacement[];
  region: CuttingPlanRegion;
  settings: CuttingPlanInput['settings'];
  sheetId: string;
}): PendingCut[] {
  const {
    orientation,
    otherDirectionPrepared,
    panelId,
    placements,
    region,
    settings,
    sheetId,
  } = input;
  if (settings.edgeTrimMm <= EPSILON) return [];

  const perpendicularPadding = otherDirectionPrepared ? 0 : settings.edgeTrimMm;
  const isVertical = orientation === 'vertical';
  const startMm = isVertical
    ? region.yMm - perpendicularPadding
    : region.xMm - perpendicularPadding;
  const lengthMm =
    (isVertical ? region.heightMm : region.widthMm) + perpendicularPadding * 2;
  const regionEnd = isVertical
    ? region.xMm + region.widthMm
    : region.yMm + region.heightMm;
  const placementTouchesTrailingEdge = placements.some(placement => {
    const contained =
      placement.xMm + EPSILON >= region.xMm &&
      placement.yMm + EPSILON >= region.yMm &&
      placement.xMm + placement.widthMm <=
        region.xMm + region.widthMm + EPSILON &&
      placement.yMm + placement.heightMm <=
        region.yMm + region.heightMm + EPSILON;
    if (!contained) return false;
    const placementEnd = isVertical
      ? placement.xMm + placement.widthMm
      : placement.yMm + placement.heightMm;
    return Math.abs(placementEnd - regionEnd) <= EPSILON;
  });
  // A borda inicial precisa ser acertada quando a direção é usada. A borda
  // oposta só vira um movimento separado se uma peça realmente encostar nela;
  // caso contrário, o refilo fica embutido na sobra retirada por inteiro.
  const positions = [isVertical ? region.xMm : region.yMm];
  if (placementTouchesTrailingEdge) positions.push(regionEnd);

  return positions.map(positionMm => ({
    sheetId,
    kind: 'edge_trim',
    orientation,
    positionMm,
    startMm,
    lengthMm,
    targetRegionId: panelId,
    targetRegion: { ...region, id: panelId },
    resultRegionIds: [panelId],
    kerfLossMm: 0,
    internalCutLossMm: 0,
  }));
}

function scheduleDirectionalCuts(input: {
  primaryOrientation: CuttingPlanCut['orientation'];
  settings: CuttingPlanInput['settings'];
  sheet: WorkingSheet;
  state: { nextStep: number };
}): CuttingPlanCut[] {
  const { primaryOrientation, settings, sheet, state } = input;
  const pending = sheet.cuts
    .filter(cut => cut.kind === 'piece')
    .sort((a, b) => a.step - b.step)
    .map(({ id: _id, step: _step, ...cut }) => cut);
  const availablePanels = new Set([sheet.usableArea.id]);
  const preparedDirections = new Map<
    string,
    Set<CuttingPlanCut['orientation']>
  >([[sheet.usableArea.id, new Set()]]);
  const scheduled: CuttingPlanCut[] = [];

  const append = (cut: PendingCut) => {
    const step = state.nextStep;
    state.nextStep += 1;
    scheduled.push({
      ...cut,
      id: `${sheet.id}-cut-${String(step).padStart(4, '0')}`,
      step,
    });
  };

  const ensureDirectionPrepared = (
    panelId: string,
    region: CuttingPlanRegion,
    orientation: CuttingPlanCut['orientation'],
  ) => {
    const directions = preparedDirections.get(panelId) ?? new Set();
    if (directions.has(orientation)) return;
    directionalTrimCuts({
      sheetId: sheet.id,
      panelId,
      placements: sheet.placements,
      region,
      orientation,
      otherDirectionPrepared: directions.has(otherOrientation(orientation)),
      settings,
    }).forEach(append);
    directions.add(orientation);
    preparedDirections.set(panelId, directions);
  };

  while (pending.length > 0) {
    const executable = pending
      .map((cut, index) => ({ cut, index }))
      .filter(({ cut }) => availablePanels.has(cut.targetRegionId));
    if (executable.length === 0) {
      throw new Error(
        `Sequência guilhotinada inválida na chapa ${sheet.number}.`,
      );
    }
    const selected =
      executable.find(({ cut }) => cut.orientation === primaryOrientation) ??
      executable[0];
    const [cut] = pending.splice(selected.index, 1);
    ensureDirectionPrepared(
      cut.targetRegionId,
      cut.targetRegion,
      cut.orientation,
    );
    append(cut);

    const inheritedDirections = new Set(
      preparedDirections.get(cut.targetRegionId) ?? [],
    );
    availablePanels.delete(cut.targetRegionId);
    cut.resultRegionIds.forEach(resultId => {
      availablePanels.add(resultId);
      preparedDirections.set(resultId, new Set(inheritedDirections));
    });
  }

  sheet.placements.forEach(placement => {
    const inheritedDirections =
      preparedDirections.get(placement.id) ??
      preparedDirections.get(placement.sourceRegionId) ??
      new Set<CuttingPlanCut['orientation']>();
    preparedDirections.set(placement.id, new Set(inheritedDirections));
    ensureDirectionPrepared(placement.id, placement, primaryOrientation);
    ensureDirectionPrepared(
      placement.id,
      placement,
      otherOrientation(primaryOrientation),
    );
  });

  return scheduled;
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
}): WorkingSheet {
  const { material, number, planInput } = input;
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
  const offcutAreaMm2 = sheets.reduce(
    (total, sheet) =>
      total +
      sheet.wasteRegions
        .filter(region => region.reason === 'remainder')
        .reduce((sheetTotal, region) => sheetTotal + regionArea(region), 0),
    0,
  );
  const processLossAreaMm2 = Math.max(
    0,
    totalSheetAreaMm2 - usedAreaMm2 - offcutAreaMm2,
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
    offcutAreaMm2,
    processLossAreaMm2,
    utilizationPercentage: percentage(usedAreaMm2),
    offcutPercentage: percentage(totalSheetAreaMm2 - usedAreaMm2),
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
      const material = materialById.get(firstPiece.materialId)!;
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

  const scheduleState = { nextStep: 1 };
  const primaryOrientation =
    configuration.splitPreferences[0] === 'vertical_first'
      ? 'vertical'
      : 'horizontal';
  const finalizedSheets: CuttingPlanSheet[] = sheets.map(sheet => {
    const remainderRegions: CuttingPlanWasteRegion[] = sheet.freeRegions.map(
      ({ region }) => ({
        ...region,
        reason: 'remainder',
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
      cuts: scheduleDirectionalCuts({
        sheet,
        settings: input.settings,
        primaryOrientation,
        state: scheduleState,
      }),
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
        (edge === 'top' || edge === 'bottom' ? piece.widthMm : piece.lengthMm),
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
  return maximum - minimum <= EPSILON
    ? 0
    : (value - minimum) / (maximum - minimum);
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
        a.result.metrics.processLossAreaMm2 -
          b.result.metrics.processLossAreaMm2 ||
        a.configurationId.localeCompare(b.configurationId)
      );
    })[0];
  }

  if (input.optimizationMode === 'best_yield') {
    return [...candidates].sort((a, b) => {
      return (
        a.result.metrics.sheetCount - b.result.metrics.sheetCount ||
        a.result.metrics.processLossAreaMm2 -
          b.result.metrics.processLossAreaMm2 ||
        a.result.metrics.movementCount - b.result.metrics.movementCount ||
        a.configurationId.localeCompare(b.configurationId)
      );
    })[0];
  }

  const sheetCounts = candidates.map(item => item.result.metrics.sheetCount);
  const movements = candidates.map(item => item.result.metrics.movementCount);
  const processLoss = candidates.map(
    item => item.result.metrics.processLossAreaMm2,
  );
  const weights = input.settings.balancedWeights;

  return [...candidates].sort((a, b) => {
    const score = (candidate: CandidateResult) =>
      weights.sheetCount *
        normalized(candidate.result.metrics.sheetCount, sheetCounts) +
      weights.movementCount *
        normalized(candidate.result.metrics.movementCount, movements) +
      weights.waste *
        normalized(candidate.result.metrics.processLossAreaMm2, processLoss);
    return (
      score(a) - score(b) || a.configurationId.localeCompare(b.configurationId)
    );
  })[0];
}

export function generateCuttingPlan(
  input: CuttingPlanInput,
): CuttingPlanResult {
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
