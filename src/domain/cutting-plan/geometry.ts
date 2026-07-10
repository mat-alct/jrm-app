import {
  CuttingPlanGenerationError,
  CuttingPlanPiece,
  CuttingPlanPlacement,
  CuttingPlanRegion,
  CuttingPlanSettings,
} from './types';

export interface PieceOrientation {
  heightMm: number;
  rotated: boolean;
  widthMm: number;
}

export const regionArea = (
  region: Pick<CuttingPlanRegion, 'heightMm' | 'widthMm'>,
) => region.widthMm * region.heightMm;

export function getUsableSheetArea(
  settings: CuttingPlanSettings,
  sheetWidthMm = settings.sheetWidthMm,
  sheetLengthMm = settings.sheetLengthMm,
): CuttingPlanRegion {
  const widthMm = sheetWidthMm - settings.edgeTrimMm * 2;
  const heightMm = sheetLengthMm - settings.edgeTrimMm * 2;

  if (
    sheetWidthMm <= 0 ||
    sheetLengthMm <= 0 ||
    settings.edgeTrimMm < 0 ||
    widthMm <= 0 ||
    heightMm <= 0 ||
    settings.kerfMm < 0 ||
    settings.internalCutLossMm < 0
  ) {
    throw new CuttingPlanGenerationError(
      'INVALID_SETTINGS',
      'As dimensões da chapa e as perdas de corte precisam ser válidas.',
    );
  }

  return {
    id: 'usable-area',
    xMm: settings.edgeTrimMm,
    yMm: settings.edgeTrimMm,
    widthMm,
    heightMm,
  };
}

export function regionsOverlap(
  a: Pick<CuttingPlanRegion, 'heightMm' | 'widthMm' | 'xMm' | 'yMm'>,
  b: Pick<CuttingPlanRegion, 'heightMm' | 'widthMm' | 'xMm' | 'yMm'>,
): boolean {
  return !(
    a.xMm + a.widthMm <= b.xMm ||
    b.xMm + b.widthMm <= a.xMm ||
    a.yMm + a.heightMm <= b.yMm ||
    b.yMm + b.heightMm <= a.yMm
  );
}

export function hasOverlappingPlacements(
  placements: CuttingPlanPlacement[],
): boolean {
  for (let index = 0; index < placements.length; index += 1) {
    for (let other = index + 1; other < placements.length; other += 1) {
      if (regionsOverlap(placements[index], placements[other])) return true;
    }
  }
  return false;
}

export function getPieceOrientations(
  piece: CuttingPlanPiece,
): PieceOrientation[] {
  const base = {
    widthMm: piece.widthMm,
    heightMm: piece.lengthMm,
    rotated: false,
  };

  if (
    !piece.canRotate ||
    piece.grainDirection !== 'none' ||
    piece.widthMm === piece.lengthMm
  ) {
    return [base];
  }

  return [
    base,
    {
      widthMm: piece.lengthMm,
      heightMm: piece.widthMm,
      rotated: true,
    },
  ];
}

export function calculateEdgeBandLengthMeters(
  pieces: CuttingPlanPiece[],
): number {
  const totalMm = pieces.reduce((total, piece) => {
    const edgeLength = piece.edgeBandEdges.reduce((pieceTotal, edge) => {
      return (
        pieceTotal +
        (edge === 'top' || edge === 'bottom'
          ? piece.widthMm
          : piece.lengthMm)
      );
    }, 0);
    return total + edgeLength * piece.quantity;
  }, 0);

  return totalMm / 1000;
}

export function isReusableRegion(
  region: Pick<CuttingPlanRegion, 'heightMm' | 'widthMm'>,
  settings: CuttingPlanSettings,
): boolean {
  const direct =
    region.widthMm >= settings.reusableWasteMinWidthMm &&
    region.heightMm >= settings.reusableWasteMinLengthMm;
  const rotated =
    region.widthMm >= settings.reusableWasteMinLengthMm &&
    region.heightMm >= settings.reusableWasteMinWidthMm;
  return direct || rotated;
}
