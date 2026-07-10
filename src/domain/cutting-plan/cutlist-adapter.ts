import type { Cutlist } from '@/types';

import { DEFAULT_CUTTING_PLAN_SETTINGS } from './defaults';
import type {
  CuttingPlanInput,
  CuttingPlanMaterial,
  CuttingPlanOptimizationMode,
  CuttingPlanPiece,
  CuttingPlanSettings,
  EdgeBandEdge,
} from './types';
import { CuttingPlanGenerationError } from './types';

const normalizeText = (value?: string) => value?.trim() || undefined;

export const normalizeMaterialName = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');

export const materialIdentityFromName = (name: string): string =>
  `material-name:${normalizeMaterialName(name)}`;

export const thicknessFromMaterialName = (name: string): number => {
  const match = name.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*mm(?:\s|$)/i);
  if (!match) {
    throw new CuttingPlanGenerationError(
      'INVALID_MATERIAL_NAME',
      `A chapa “${name}” precisa informar a espessura no nome (ex.: 15mm).`,
    );
  }
  const value = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) {
    throw new CuttingPlanGenerationError(
      'INVALID_MATERIAL_NAME',
      `A espessura informada no nome da chapa “${name}” é inválida.`,
    );
  }
  return value;
};

const machineMaterialCodes = (name: string) => {
  const [adMaterialCode, acMaterialKey] = name
    .split(/\s+-\s+/)
    .map(part => part.trim());
  return {
    adMaterialCode: adMaterialCode || undefined,
    acMaterialKey: acMaterialKey || undefined,
  };
};

const edgeBandEdges = (borderA: number, borderB: number): EdgeBandEdge[] => {
  const edges: EdgeBandEdge[] = [];
  if (borderA >= 1) edges.push('top');
  if (borderA >= 2) edges.push('bottom');
  if (borderB >= 1) edges.push('left');
  if (borderB >= 2) edges.push('right');
  return edges;
};

export function cutlistToCuttingPlanPieces(
  cutlist: Cutlist[],
): CuttingPlanPiece[] {
  return cutlist.map((item, index) => {
    const grainDirection = item.grainDirection ?? 'none';
    return {
      id: item.id,
      referenceItemId: item.id,
      description:
        normalizeText(item.description) ??
        `Peça ${index + 1} — ${item.material.name}`,
      widthMm: Number(item.sideA),
      lengthMm: Number(item.sideB),
      quantity: Number(item.amount),
      materialId: materialIdentityFromName(item.material.name),
      grainDirection,
      canRotate: grainDirection === 'none',
      edgeBandEdges: edgeBandEdges(item.borderA, item.borderB),
    };
  });
}

export function cutlistToCuttingPlanMaterials(
  cutlist: Cutlist[],
): CuttingPlanMaterial[] {
  const byId = new Map<string, CuttingPlanMaterial>();
  cutlist.forEach(item => {
    const id = materialIdentityFromName(item.material.name);
    const existing = byId.get(id);
    if (existing) {
      existing.unitPrice = Math.max(
        existing.unitPrice,
        Number(item.material.price),
      );
      return;
    }
    const { acMaterialKey, adMaterialCode } = machineMaterialCodes(
      item.material.name,
    );
    byId.set(id, {
      id,
      name: item.material.name,
      unitPrice: Number(item.material.price),
      thicknessMm: thicknessFromMaterialName(item.material.name),
      sheetWidthMm: Math.min(item.material.width, item.material.height),
      sheetLengthMm: Math.max(item.material.width, item.material.height),
      acMaterialKey,
      adMaterialCode,
    });
  });
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function cutlistToCuttingPlanInput(input: {
  cutlist: Cutlist[];
  optimizationMode: CuttingPlanOptimizationMode;
  settings?: CuttingPlanSettings;
}): CuttingPlanInput {
  return {
    pieces: cutlistToCuttingPlanPieces(input.cutlist),
    materials: cutlistToCuttingPlanMaterials(input.cutlist),
    optimizationMode: input.optimizationMode,
    settings: input.settings ?? DEFAULT_CUTTING_PLAN_SETTINGS,
  };
}
