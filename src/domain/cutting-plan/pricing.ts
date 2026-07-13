import { calculateEdgeBandLengthMeters } from './geometry';
import {
  CuttingPlanPiece,
  CuttingPlanPricing,
  CuttingPlanSettings,
  CuttingPlanSheet,
} from './types';

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export function calculateCuttingPlanPricing(input: {
  movementCount: number;
  pieces: CuttingPlanPiece[];
  settings: CuttingPlanSettings;
  sheets: CuttingPlanSheet[];
}): CuttingPlanPricing {
  const { movementCount, pieces, settings, sheets } = input;
  const sheetGroups = new Map<
    string,
    { count: number; materialName: string; unitPrice: number }
  >();

  sheets.forEach(sheet => {
    const current = sheetGroups.get(sheet.material.id);
    sheetGroups.set(sheet.material.id, {
      count: (current?.count ?? 0) + 1,
      materialName: sheet.material.name,
      unitPrice: sheet.material.unitPrice,
    });
  });

  const sheetItems = [...sheetGroups.entries()]
    .map(([materialId, item]) => ({
      materialId,
      materialName: item.materialName,
      count: item.count,
      unitPrice: item.unitPrice,
      subtotal: roundCurrency(item.count * item.unitPrice),
    }))
    .sort((a, b) => a.materialName.localeCompare(b.materialName));

  const sheetsCost = roundCurrency(
    sheetItems.reduce((total, item) => total + item.subtotal, 0),
  );
  const movementsCost = roundCurrency(movementCount * settings.movementPrice);
  const edgeBandLengthMeters = calculateEdgeBandLengthMeters(pieces);
  const edgeBandCost = roundCurrency(
    edgeBandLengthMeters * settings.edgeBandPricePerMeter,
  );

  return {
    sheetItems,
    sheetsCost,
    movementPrice: settings.movementPrice,
    movementsCost,
    edgeBandPricePerMeter: settings.edgeBandPricePerMeter,
    edgeBandCost,
    totalCost: roundCurrency(sheetsCost + movementsCost + edgeBandCost),
  };
}
