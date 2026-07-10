import {
  CuttingPlanGenerationError,
  CuttingPlanPiece,
  CuttingPlanPlacement,
  CuttingPlanRegion,
  CuttingPlanSettings,
  EdgeBandEdge,
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
    settings.internalEdgeTrimMm < 0
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

  if (piece.widthMm === piece.lengthMm) {
    return [base];
  }

  const orientations = [
    base,
    {
      widthMm: piece.lengthMm,
      heightMm: piece.widthMm,
      rotated: true,
    },
  ];

  if (piece.grainDirection === 'none') {
    return piece.canRotate ? orientations : [base];
  }

  // O veio da chapa inteira percorre seu comprimento (2750 mm). Portanto a
  // dimensão escolhida da peça precisa ficar no eixo Y da chapa.
  const requiredGrainDimension =
    piece.grainDirection === 'along_length'
      ? Math.max(piece.widthMm, piece.lengthMm)
      : Math.min(piece.widthMm, piece.lengthMm);

  return orientations.filter(
    orientation =>
      Math.abs(orientation.heightMm - requiredGrainDimension) < 0.000001,
  );
}

const ROTATED_EDGE: Record<EdgeBandEdge, EdgeBandEdge> = {
  top: 'right',
  right: 'bottom',
  bottom: 'left',
  left: 'top',
};

export function rotateEdgeBandEdges(
  edges: EdgeBandEdge[],
  rotated: boolean,
): EdgeBandEdge[] {
  return rotated ? edges.map(edge => ROTATED_EDGE[edge]) : [...edges];
}

export function calculateEdgeBandLengthMeters(
  pieces: CuttingPlanPiece[],
): number {
  const totalMm = pieces.reduce((total, piece) => {
    const edgeLength = piece.edgeBandEdges.reduce((pieceTotal, edge) => {
      return (
        pieceTotal +
        (edge === 'top' || edge === 'bottom' ? piece.widthMm : piece.lengthMm)
      );
    }, 0);
    return total + edgeLength * piece.quantity;
  }, 0);

  return totalMm / 1000;
}
