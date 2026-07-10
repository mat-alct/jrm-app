import { CuttingPlanSettings } from './types';

export const CUTTING_PLAN_ALGORITHM_VERSION = 'guillotine-v1';

export const DEFAULT_CUTTING_PLAN_SETTINGS: CuttingPlanSettings = {
  sheetWidthMm: 1850,
  sheetLengthMm: 2750,
  edgeTrimMm: 10,
  kerfMm: 3.2,
  internalCutLossMm: 15,
  movementPrice: 3,
  edgeBandPricePerMeter: 2,
  reusableWasteMinWidthMm: 300,
  reusableWasteMinLengthMm: 300,
  balancedWeights: {
    waste: 0.5,
    movementCount: 0.3,
    sheetCount: 0.2,
  },
};
