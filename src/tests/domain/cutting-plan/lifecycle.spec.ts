import { Timestamp } from 'firebase/firestore';

import type { CuttingPlan } from '@/domain/cutting-plan';
import {
  approveCuttingPlan,
  buildCuttingPlan,
  cutlistToCuttingPlanInput,
  cutlistToCuttingPlanPieces,
  cuttingPlanMatchesPieces,
  DEFAULT_CUTTING_PLAN_SETTINGS,
  generateCuttingPlan,
  markCuttingPlanOutdated,
} from '@/domain/cutting-plan';
import type { Cutlist } from '@/types';

const now = Timestamp.fromDate(new Date('2026-07-10T12:00:00.000Z'));
const later = Timestamp.fromDate(new Date('2026-07-10T13:00:00.000Z'));

const cut = (overrides: Partial<Cutlist> = {}): Cutlist => ({
  id: 'cut-1',
  description: 'Porta esquerda',
  material: {
    materialId: 'material-1',
    name: 'MDF Branco 15mm',
    width: 2750,
    height: 1850,
    price: 220,
  },
  amount: 2,
  sideA: 500,
  sideB: 800,
  borderA: 2,
  borderB: 1,
  price: 100,
  grainDirection: 'none',
  canRotate: true,
  ...overrides,
});

const buildPlan = (cutlist: Cutlist[] = [cut()]): CuttingPlan => {
  const result = generateCuttingPlan(
    cutlistToCuttingPlanInput({
      cutlist,
      optimizationMode: 'balanced',
      settings: DEFAULT_CUTTING_PLAN_SETTINGS,
    }),
  );
  return buildCuttingPlan({
    id: 'plan-1',
    orderId: 'pending',
    result,
    timestamp: now,
  });
};

describe('cutlist adapter and cutting plan lifecycle', () => {
  it('converte peças, material, espessura, fita e rotação', () => {
    const converted = cutlistToCuttingPlanInput({
      cutlist: [cut()],
      optimizationMode: 'best_yield',
    });

    expect(converted.optimizationMode).toBe('best_yield');
    expect(converted.materials).toEqual([
      expect.objectContaining({
        id: 'material-name:mdf branco 15mm',
        unitPrice: 220,
        thicknessMm: 15,
      }),
    ]);
    expect(converted.pieces[0]).toMatchObject({
      id: 'cut-1',
      referenceItemId: 'cut-1',
      description: 'Porta esquerda',
      quantity: 2,
      widthMm: 500,
      lengthMm: 800,
      materialId: 'material-name:mdf branco 15mm',
      edgeBandEdges: ['top', 'bottom', 'left'],
      canRotate: true,
    });
  });

  it('deriva rotação automaticamente a partir do sentido do veio', () => {
    const [converted] = cutlistToCuttingPlanPieces([
      cut({ grainDirection: 'along_length', canRotate: true }),
    ]);
    expect(converted.canRotate).toBe(false);
  });

  it('agrupa ids diferentes quando o nome completo da chapa é igual', () => {
    const converted = cutlistToCuttingPlanInput({
      cutlist: [
        cut({ id: 'cut-a' }),
        cut({
          id: 'cut-b',
          material: {
            ...cut().material,
            materialId: 'material-2',
          },
        }),
      ],
      optimizationMode: 'balanced',
    });

    expect(converted.materials).toHaveLength(1);
    expect(new Set(converted.pieces.map(piece => piece.materialId)).size).toBe(
      1,
    );
  });

  it('mantém nomes de chapa diferentes em planos separados', () => {
    const converted = cutlistToCuttingPlanInput({
      cutlist: [
        cut({ id: 'cut-a' }),
        cut({
          id: 'cut-b',
          material: {
            ...cut().material,
            materialId: 'material-2',
            name: 'MDF Preto 15mm',
          },
        }),
      ],
      optimizationMode: 'balanced',
    });

    expect(converted.materials).toHaveLength(2);
    expect(generateCuttingPlan(converted).sheets).toHaveLength(2);
  });

  it('exige que a espessura esteja no nome completo da chapa', () => {
    expect(() =>
      cutlistToCuttingPlanInput({
        cutlist: [cut({ material: { ...cut().material, name: 'MDF Branco' } })],
        optimizationMode: 'balanced',
      }),
    ).toThrow('15mm');
  });

  it('cria versões, aprova e preserva a data original', () => {
    const first = buildPlan();
    const approved = approveCuttingPlan(first, later);
    const second = buildCuttingPlan({
      id: 'plan-2',
      orderId: 'order-1',
      previousPlan: approved,
      result: generateCuttingPlan(
        cutlistToCuttingPlanInput({
          cutlist: [cut()],
          optimizationMode: 'fewer_cuts',
        }),
      ),
      timestamp: later,
    });

    expect(approved.status).toBe('approved');
    expect(approved.approvedAt).toEqual(later);
    expect(second.version).toBe(2);
    expect(second.createdAt).toEqual(now);
    expect(second.status).toBe('draft');
  });

  it('detecta alteração dimensional ou de quantidade sem depender da ordem', () => {
    const plan = buildPlan([cut(), cut({ id: 'cut-2' })]);
    expect(
      cuttingPlanMatchesPieces(
        plan,
        cutlistToCuttingPlanPieces([cut({ id: 'cut-2' }), cut()]),
      ),
    ).toBe(true);
    expect(
      cuttingPlanMatchesPieces(
        plan,
        cutlistToCuttingPlanPieces([cut(), cut({ id: 'cut-2', amount: 3 })]),
      ),
    ).toBe(false);
  });

  it('marca plano alterado como desatualizado', () => {
    expect(markCuttingPlanOutdated(buildPlan(), later)).toMatchObject({
      status: 'outdated',
      updatedAt: later,
    });
  });
});
