import type {
  CuttingPlan,
  CuttingPlanPiece,
  CuttingPlanResult,
  CuttingPlanStatus,
  CuttingPlanTimestamp,
} from './types';

interface BuildCuttingPlanInput {
  id: string;
  orderId: string;
  previousPlan?: CuttingPlan;
  result: CuttingPlanResult;
  status?: Exclude<CuttingPlanStatus, 'outdated'>;
  timestamp: CuttingPlanTimestamp;
}

const canonicalPiece = (piece: CuttingPlanPiece) => ({
  id: piece.id,
  referenceItemId: piece.referenceItemId,
  description: piece.description,
  widthMm: piece.widthMm,
  lengthMm: piece.lengthMm,
  quantity: piece.quantity,
  materialId: piece.materialId,
  grainDirection: piece.grainDirection,
  canRotate: piece.canRotate,
  edgeBandEdges: [...piece.edgeBandEdges].sort(),
});

export function cuttingPlanPiecesFingerprint(
  pieces: CuttingPlanPiece[],
): string {
  return JSON.stringify(
    [...pieces].sort((a, b) => a.id.localeCompare(b.id)).map(canonicalPiece),
  );
}

export function cuttingPlanMatchesPieces(
  plan: CuttingPlan,
  pieces: CuttingPlanPiece[],
): boolean {
  return (
    cuttingPlanPiecesFingerprint(plan.inputSnapshot.pieces) ===
    cuttingPlanPiecesFingerprint(pieces)
  );
}

export function buildCuttingPlan({
  id,
  orderId,
  previousPlan,
  result,
  status = 'draft',
  timestamp,
}: BuildCuttingPlanInput): CuttingPlan {
  return {
    ...result,
    id,
    orderId,
    version: (previousPlan?.version ?? 0) + 1,
    status,
    createdAt: previousPlan?.createdAt ?? timestamp,
    updatedAt: timestamp,
    approvedAt: status === 'approved' ? timestamp : undefined,
  };
}

export function approveCuttingPlan(
  plan: CuttingPlan,
  timestamp: CuttingPlanTimestamp,
): CuttingPlan {
  return {
    ...plan,
    status: 'approved',
    approvedAt: timestamp,
    updatedAt: timestamp,
  };
}

export function markCuttingPlanOutdated(
  plan: CuttingPlan,
  timestamp: CuttingPlanTimestamp,
): CuttingPlan {
  if (plan.status === 'outdated') return plan;
  return {
    ...plan,
    status: 'outdated',
    updatedAt: timestamp,
  };
}
