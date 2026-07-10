import { CuttingPlanSettings } from './types';

export const CUTTING_PLAN_ALGORITHM_VERSION = 'guillotine-v3';

// O campo de fase do arquivo .AC tem um caractere e o perfil giben-cortecloud-v1
// só aceita os dígitos 2 a 5. Cada nível equivale a uma mudança de direção da
// serra, então um padrão nunca pode alternar de direção mais de quatro vezes.
export const MAX_GUILLOTINE_CUT_LEVELS = 4;

export const DEFAULT_CUTTING_PLAN_SETTINGS: CuttingPlanSettings = {
  sheetWidthMm: 1850,
  sheetLengthMm: 2750,
  edgeTrimMm: 10,
  kerfMm: 3.2,
  internalEdgeTrimMm: 7.5,
  movementPrice: 3,
  edgeBandPricePerMeter: 2,
  balancedWeights: {
    waste: 0.5,
    movementCount: 0.3,
    sheetCount: 0.2,
  },
};
