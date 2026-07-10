import type { GibenExportProfileSettings } from '../../machine-settings';
import type {
  CuttingPlanPlacement,
  CuttingPlanSheet,
  EdgeBandEdge,
} from '../../types';

export type GibenCutPhase = 2 | 3 | 4 | 5;
export type GibenCutAxis = 'X' | 'Y';

export interface GibenEdgeBand {
  description: string;
  heightMm: number;
  thicknessMm: number;
}

export interface GibenTreePlacement {
  designHeightMm: number;
  designWidthMm: number;
  edgeBandEdges: EdgeBandEdge[];
  localPartNumber: number;
  placement: CuttingPlanPlacement;
  requestedQuantity: number;
}

export interface GibenCutSegment {
  childGroup?: GibenCutGroup;
  cutQuantity: number;
  finalPiece?: GibenTreePlacement;
  sizeMm: number;
}

export interface GibenCutGroup {
  axis: GibenCutAxis;
  parentHeightMm: number;
  parentWidthMm: number;
  phase: GibenCutPhase;
  segments: GibenCutSegment[];
}

export interface GibenOffcut {
  heightMm: number;
  letter: string;
  sequenceNumber: number;
  widthMm: number;
}

export interface GibenPattern {
  globalPatternNumber: number;
  localPatternIndex: number;
  offcuts: GibenOffcut[];
  orientedHeightMm: number;
  orientedWidthMm: number;
  placements: GibenTreePlacement[];
  repeatCount: number;
  rootCutGroup: GibenCutGroup;
  rotatedFromStock: boolean;
  sheet: CuttingPlanSheet;
  stockLengthMm: number;
  stockWidthMm: number;
}

export interface GibenMaterialPlan {
  acMaterialKey: string;
  adMaterialCode: string;
  materialId: string;
  materialLabel: string;
  patterns: GibenPattern[];
  thicknessMm: number;
}

export interface GibenExportContext {
  customerName: string;
  generatedAt: Date;
  operatorName: string;
  orderId: string;
  profile: GibenExportProfileSettings;
}

export interface GibenExportPair {
  ac: string;
  ad: string;
  baseName: string;
  materialName: string;
}

export interface GibenExportResult {
  pairs: GibenExportPair[];
  profileId: 'giben-cortecloud-v1';
}

export class GibenExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GibenExportError';
  }
}
