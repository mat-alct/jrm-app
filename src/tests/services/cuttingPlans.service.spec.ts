import { doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';

import type { CuttingPlan } from '@/domain/cutting-plan';
import {
  approveStoredCuttingPlan,
  getCuttingPlan,
  invalidateStoredCuttingPlan,
  saveCuttingPlan,
} from '@/services/cuttingPlans.service';

jest.mock('@/services/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ path: 'orders/order-1' })),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  Timestamp: jest.requireActual<typeof import('firebase/firestore')>(
    'firebase/firestore',
  ).Timestamp,
}));

const timestamp = Timestamp.fromDate(new Date('2026-07-10T12:00:00.000Z'));
const plan = (status: CuttingPlan['status'] = 'draft'): CuttingPlan =>
  ({
    id: 'plan-1',
    orderId: 'pending',
    version: 1,
    status,
    optimizationMode: 'balanced',
    settings: {},
    inputSnapshot: { pieces: [], materials: [] },
    sheets: [],
    cutSequence: [],
    metrics: {},
    pricing: {},
    algorithmVersion: 'test',
    createdAt: timestamp,
    updatedAt: timestamp,
  }) as unknown as CuttingPlan;

describe('cuttingPlans.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recupera o plano embutido no pedido', async () => {
    jest.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ cuttingPlan: plan() }),
    } as never);

    await expect(getCuttingPlan('order-1')).resolves.toMatchObject({
      id: 'plan-1',
    });
    expect(doc).toHaveBeenCalledWith({}, 'orders', 'order-1');
  });

  it('retorna null para pedido ausente ou sem plano', async () => {
    jest.mocked(getDoc)
      .mockResolvedValueOnce({ exists: () => false } as never)
      .mockResolvedValueOnce({ exists: () => true, data: () => ({}) } as never);
    await expect(getCuttingPlan('missing')).resolves.toBeNull();
    await expect(getCuttingPlan('without-plan')).resolves.toBeNull();
  });

  it('salva o plano vinculado ao pedido e remove undefined aninhado', async () => {
    const saved = await saveCuttingPlan('order-1', {
      ...plan(),
      approvedAt: undefined,
      inputSnapshot: {
        pieces: [{ optional: undefined }] as never,
        materials: [],
      },
    });

    expect(saved.orderId).toBe('order-1');
    expect(saved.inputSnapshot.pieces[0]).not.toHaveProperty('optional');
    const update = jest.mocked(updateDoc).mock.calls[0][1] as unknown as {
      cuttingPlan: CuttingPlan;
      serviceType: string;
    };
    expect(update.cuttingPlan.orderId).toBe('order-1');
    expect(update.serviceType).toBe('cutting_plan');
  });

  it('aprova e invalida um plano existente', async () => {
    jest.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ cuttingPlan: plan() }),
    } as never);

    await expect(approveStoredCuttingPlan('order-1')).resolves.toMatchObject({
      status: 'approved',
    });
    await expect(invalidateStoredCuttingPlan('order-1')).resolves.toMatchObject({
      status: 'outdated',
    });
  });

  it('não aprova nem invalida quando não existe plano', async () => {
    jest.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);
    await expect(approveStoredCuttingPlan('missing')).resolves.toBeNull();
    await expect(invalidateStoredCuttingPlan('missing')).resolves.toBeNull();
    expect(updateDoc).not.toHaveBeenCalled();
  });
});
