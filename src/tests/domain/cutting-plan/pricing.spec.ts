import {
  calculateCuttingPlanPricing,
  DEFAULT_CUTTING_PLAN_SETTINGS,
} from '@/domain/cutting-plan';
import type {
  CuttingPlanPiece,
  CuttingPlanSheet,
} from '@/domain/cutting-plan';

const material = {
  id: 'mdf-white',
  name: 'MDF Branco 15mm',
  unitPrice: 200,
};

const sheet = (id: string): CuttingPlanSheet => ({
  id,
  number: Number(id.replace(/\D/g, '')),
  material,
  totalWidthMm: 1850,
  totalLengthMm: 2750,
  usableArea: {
    id: `${id}-usable`,
    xMm: 10,
    yMm: 10,
    widthMm: 1830,
    heightMm: 2730,
  },
  placements: [],
  cuts: [],
  wasteRegions: [],
});

const piece: CuttingPlanPiece = {
  id: 'piece-1',
  referenceItemId: 'item-1',
  description: 'Porta',
  widthMm: 500,
  lengthMm: 1000,
  quantity: 2,
  materialId: material.id,
  grainDirection: 'none',
  canRotate: true,
  edgeBandEdges: ['top', 'bottom'],
};

describe('cutting plan pricing', () => {
  it('cobra chapas inteiras, movimentos e fita separadamente', () => {
    const pricing = calculateCuttingPlanPricing({
      sheets: [sheet('sheet-1'), sheet('sheet-2')],
      movementCount: 10,
      pieces: [piece],
      settings: DEFAULT_CUTTING_PLAN_SETTINGS,
    });

    expect(pricing.sheetItems).toEqual([
      {
        materialId: material.id,
        materialName: material.name,
        count: 2,
        unitPrice: 200,
        subtotal: 400,
      },
    ]);
    expect(pricing.sheetsCost).toBe(400);
    expect(pricing.movementsCost).toBe(30);
    expect(pricing.edgeBandCost).toBe(4);
    expect(pricing.totalCost).toBe(434);
  });
});
