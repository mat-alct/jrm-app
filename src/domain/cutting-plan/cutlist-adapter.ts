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

const normalizeText = (value?: string) => value?.trim() || undefined;

const inferThickness = (name: string): number | undefined => {
  const match = name.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*mm(?:\s|$)/i);
  if (!match) return undefined;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
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
      materialId: item.material.materialId,
      thicknessMm:
        item.thicknessMm ?? inferThickness(item.material.name),
      finish: normalizeText(item.finish),
      color: normalizeText(item.color),
      pattern: normalizeText(item.pattern),
      grainDirection,
      canRotate: grainDirection === 'none' && item.canRotate !== false,
      edgeBandEdges: edgeBandEdges(item.borderA, item.borderB),
    };
  });
}

export function cutlistToCuttingPlanMaterials(
  cutlist: Cutlist[],
): CuttingPlanMaterial[] {
  const byId = new Map<string, CuttingPlanMaterial>();
  cutlist.forEach(item => {
    if (byId.has(item.material.materialId)) return;
    byId.set(item.material.materialId, {
      id: item.material.materialId,
      name: item.material.name,
      unitPrice: Number(item.material.price),
      thicknessMm:
        item.thicknessMm ?? inferThickness(item.material.name),
      finish: normalizeText(item.finish),
      color: normalizeText(item.color),
      pattern: normalizeText(item.pattern),
    });
  });
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
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
