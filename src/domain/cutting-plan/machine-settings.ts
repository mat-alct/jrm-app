import { DEFAULT_CUTTING_PLAN_SETTINGS } from './defaults';
import type { CuttingPlanSettings } from './types';

export interface GibenExportProfileSettings {
  defaultAcHeaderFlag: 0 | 1;
  defaultEdgeBandDescription: string;
  defaultEdgeBandHeightMm: number;
  defaultEdgeBandThicknessMm: number;
  id: 'giben-cortecloud-v1';
  labelImageDirectory: string;
}

export interface CuttingMachineConfiguration {
  cutting: CuttingPlanSettings;
  exportProfile: GibenExportProfileSettings;
}

export const DEFAULT_GIBEN_EXPORT_PROFILE: GibenExportProfileSettings = {
  id: 'giben-cortecloud-v1',
  defaultAcHeaderFlag: 0,
  labelImageDirectory: 'C:\\cortecloud\\etiquetas',
  defaultEdgeBandThicknessMm: 0.4,
  defaultEdgeBandHeightMm: 22,
  defaultEdgeBandDescription: 'FITA',
};

export const DEFAULT_CUTTING_MACHINE_CONFIGURATION: CuttingMachineConfiguration =
  {
    cutting: {
      ...DEFAULT_CUTTING_PLAN_SETTINGS,
      balancedWeights: {
        ...DEFAULT_CUTTING_PLAN_SETTINGS.balancedWeights,
      },
    },
    exportProfile: { ...DEFAULT_GIBEN_EXPORT_PROFILE },
  };

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export function normalizeCuttingMachineConfiguration(value?: {
  cutting?: Partial<CuttingPlanSettings> & {
    internalCutLossMm?: number;
  };
  exportProfile?: Partial<GibenExportProfileSettings>;
}): CuttingMachineConfiguration {
  const defaults = DEFAULT_CUTTING_MACHINE_CONFIGURATION;
  const cutting = value?.cutting;
  const legacyInternalLoss = finiteOr(
    cutting?.internalCutLossMm,
    defaults.cutting.internalEdgeTrimMm * 2,
  );
  const flag = value?.exportProfile?.defaultAcHeaderFlag;

  return {
    cutting: {
      sheetWidthMm: finiteOr(
        cutting?.sheetWidthMm,
        defaults.cutting.sheetWidthMm,
      ),
      sheetLengthMm: finiteOr(
        cutting?.sheetLengthMm,
        defaults.cutting.sheetLengthMm,
      ),
      edgeTrimMm: finiteOr(cutting?.edgeTrimMm, defaults.cutting.edgeTrimMm),
      internalEdgeTrimMm: finiteOr(
        cutting?.internalEdgeTrimMm,
        legacyInternalLoss / 2,
      ),
      kerfMm: finiteOr(cutting?.kerfMm, defaults.cutting.kerfMm),
      movementPrice: finiteOr(
        cutting?.movementPrice,
        defaults.cutting.movementPrice,
      ),
      edgeBandPricePerMeter: finiteOr(
        cutting?.edgeBandPricePerMeter,
        defaults.cutting.edgeBandPricePerMeter,
      ),
      balancedWeights: {
        waste: finiteOr(
          cutting?.balancedWeights?.waste,
          defaults.cutting.balancedWeights.waste,
        ),
        movementCount: finiteOr(
          cutting?.balancedWeights?.movementCount,
          defaults.cutting.balancedWeights.movementCount,
        ),
        sheetCount: finiteOr(
          cutting?.balancedWeights?.sheetCount,
          defaults.cutting.balancedWeights.sheetCount,
        ),
      },
    },
    exportProfile: {
      id: 'giben-cortecloud-v1',
      defaultAcHeaderFlag: flag === 1 ? 1 : 0,
      labelImageDirectory:
        value?.exportProfile?.labelImageDirectory?.trim() ||
        defaults.exportProfile.labelImageDirectory,
      defaultEdgeBandThicknessMm: finiteOr(
        value?.exportProfile?.defaultEdgeBandThicknessMm,
        defaults.exportProfile.defaultEdgeBandThicknessMm,
      ),
      defaultEdgeBandHeightMm: finiteOr(
        value?.exportProfile?.defaultEdgeBandHeightMm,
        defaults.exportProfile.defaultEdgeBandHeightMm,
      ),
      defaultEdgeBandDescription:
        value?.exportProfile?.defaultEdgeBandDescription?.trim() ||
        defaults.exportProfile.defaultEdgeBandDescription,
    },
  };
}

export function validateCuttingMachineConfiguration(
  configuration: CuttingMachineConfiguration,
): void {
  const { cutting, exportProfile } = configuration;
  const positive = [
    cutting.sheetWidthMm,
    cutting.sheetLengthMm,
    cutting.movementPrice,
    cutting.edgeBandPricePerMeter,
    exportProfile.defaultEdgeBandThicknessMm,
    exportProfile.defaultEdgeBandHeightMm,
  ];
  const nonNegative = [
    cutting.edgeTrimMm,
    cutting.internalEdgeTrimMm,
    cutting.kerfMm,
    cutting.balancedWeights.waste,
    cutting.balancedWeights.movementCount,
    cutting.balancedWeights.sheetCount,
  ];

  if (positive.some(value => !Number.isFinite(value) || value <= 0)) {
    throw new Error('Os parâmetros positivos da máquina são inválidos.');
  }
  if (nonNegative.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error('As perdas e pesos da máquina não podem ser negativos.');
  }
  if (
    cutting.sheetWidthMm <= cutting.edgeTrimMm * 2 ||
    cutting.sheetLengthMm <= cutting.edgeTrimMm * 2
  ) {
    throw new Error('O refilo elimina toda a área útil da chapa.');
  }
  if (!exportProfile.labelImageDirectory.trim()) {
    throw new Error('Informe o diretório de imagens das etiquetas.');
  }
}
