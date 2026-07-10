export type CuttingPlanOptimizationMode =
  | 'fewer_cuts'
  | 'best_yield'
  | 'balanced';

export type CuttingPlanStatus = 'draft' | 'approved' | 'outdated';

export type GrainDirection = 'none' | 'along_width' | 'along_length';

export type EdgeBandEdge = 'top' | 'right' | 'bottom' | 'left';

export type CutOrientation = 'horizontal' | 'vertical';

export interface CuttingPlanTimestamp {
  nanoseconds: number;
  seconds: number;
}

export interface CuttingPlanBalancedWeights {
  sheetCount: number;
  movementCount: number;
  waste: number;
}

export interface CuttingPlanSettings {
  balancedWeights: CuttingPlanBalancedWeights;
  edgeBandPricePerMeter: number;
  edgeTrimMm: number;
  internalCutLossMm: number;
  kerfMm: number;
  movementPrice: number;
  reusableWasteMinLengthMm: number;
  reusableWasteMinWidthMm: number;
  sheetLengthMm: number;
  sheetWidthMm: number;
}

export interface CuttingPlanMaterial {
  color?: string;
  finish?: string;
  id: string;
  name: string;
  pattern?: string;
  sheetLengthMm?: number;
  sheetWidthMm?: number;
  thicknessMm?: number;
  unitPrice: number;
}

export interface CuttingPlanPiece {
  canRotate: boolean;
  color?: string;
  description: string;
  edgeBandEdges: EdgeBandEdge[];
  finish?: string;
  grainDirection: GrainDirection;
  id: string;
  lengthMm: number;
  materialId: string;
  pattern?: string;
  quantity: number;
  referenceItemId: string;
  thicknessMm?: number;
  widthMm: number;
}

export interface CuttingPlanInput {
  materials: CuttingPlanMaterial[];
  optimizationMode: CuttingPlanOptimizationMode;
  pieces: CuttingPlanPiece[];
  settings: CuttingPlanSettings;
}

export interface CuttingPlanRegion {
  heightMm: number;
  id: string;
  widthMm: number;
  xMm: number;
  yMm: number;
}

export interface CuttingPlanPlacement extends CuttingPlanRegion {
  description: string;
  edgeBandEdges: EdgeBandEdge[];
  grainDirection: GrainDirection;
  originalPieceId: string;
  pieceInstanceId: string;
  referenceItemId: string;
  rotated: boolean;
  sourceRegionId: string;
}

export type CuttingPlanWasteReason =
  | 'remainder'
  | 'kerf_and_internal_loss';

export interface CuttingPlanWasteRegion extends CuttingPlanRegion {
  reason: CuttingPlanWasteReason;
  reusable: boolean;
}

export interface CuttingPlanCut {
  id: string;
  internalCutLossMm: number;
  kerfLossMm: number;
  kind: 'edge_trim' | 'piece';
  lengthMm: number;
  orientation: CutOrientation;
  positionMm: number;
  startMm: number;
  resultRegionIds: string[];
  sheetId: string;
  step: number;
  targetRegionId: string;
  targetRegion: CuttingPlanRegion;
}

export interface CuttingPlanSheet {
  cuts: CuttingPlanCut[];
  id: string;
  material: CuttingPlanMaterial;
  number: number;
  placements: CuttingPlanPlacement[];
  totalLengthMm: number;
  totalWidthMm: number;
  usableArea: CuttingPlanRegion;
  wasteRegions: CuttingPlanWasteRegion[];
}

export interface CuttingPlanMetrics {
  discardedWasteAreaMm2: number;
  edgeBandLengthMeters: number;
  movementCount: number;
  reusableWasteAreaMm2: number;
  sheetCount: number;
  totalSheetAreaMm2: number;
  usedAreaMm2: number;
  utilizationPercentage: number;
  wastePercentage: number;
}

export interface CuttingPlanSheetPriceItem {
  count: number;
  materialId: string;
  materialName: string;
  subtotal: number;
  unitPrice: number;
}

export interface CuttingPlanPricing {
  edgeBandCost: number;
  edgeBandPricePerMeter: number;
  movementPrice: number;
  movementsCost: number;
  sheetItems: CuttingPlanSheetPriceItem[];
  sheetsCost: number;
  totalCost: number;
}

export interface CuttingPlanInputSnapshot {
  materials: CuttingPlanMaterial[];
  pieces: CuttingPlanPiece[];
}

export interface CuttingPlanResult {
  algorithmVersion: string;
  cutSequence: CuttingPlanCut[];
  inputSnapshot: CuttingPlanInputSnapshot;
  metrics: CuttingPlanMetrics;
  optimizationMode: CuttingPlanOptimizationMode;
  pricing: CuttingPlanPricing;
  settings: CuttingPlanSettings;
  sheets: CuttingPlanSheet[];
}

export interface CuttingPlan extends CuttingPlanResult {
  approvedAt?: CuttingPlanTimestamp;
  createdAt: CuttingPlanTimestamp;
  id: string;
  orderId: string;
  status: CuttingPlanStatus;
  updatedAt: CuttingPlanTimestamp;
  version: number;
}

export type CuttingPlanErrorCode =
  | 'EMPTY_PIECES'
  | 'INVALID_SETTINGS'
  | 'INVALID_PIECE'
  | 'MATERIAL_NOT_FOUND'
  | 'PIECE_TOO_LARGE';

export class CuttingPlanGenerationError extends Error {
  constructor(
    public readonly code: CuttingPlanErrorCode,
    message: string,
    public readonly pieceId?: string,
  ) {
    super(message);
    this.name = 'CuttingPlanGenerationError';
  }
}
