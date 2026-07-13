import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

import type { CuttingPlan } from '@/domain/cutting-plan';
import {
  approveStoredCuttingPlan,
  getCuttingPlan,
  invalidateStoredCuttingPlan,
  saveCuttingPlan,
} from '@/services/cuttingPlans.service';
import { auth } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import { resetEmulator } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD, seedEmulator } from '@/tests/helpers/seedEmulator';

const timestamp = Timestamp.fromDate(new Date('2026-07-10T12:00:00.000Z'));
const plan = {
  id: 'plan-1',
  orderId: 'pending',
  version: 1,
  status: 'draft',
  optimizationMode: 'balanced',
  settings: {},
  inputSnapshot: { pieces: [], materials: [] },
  sheets: [],
  cutSequence: [],
  metrics: {},
  pricing: { totalCost: 250 },
  algorithmVersion: 'test',
  createdAt: timestamp,
  updatedAt: timestamp,
} as unknown as CuttingPlan;

describe('cutting plan persistence integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
    await signInWithEmailAndPassword(
      auth,
      'vendedor@seed.jrm',
      SEED_USER_PASSWORD,
    );
    await adminDb.doc('orders/order-1').set({ orderCode: 1 });
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('salva, recupera, aprova e invalida o plano no pedido', async () => {
    await saveCuttingPlan('order-1', plan);
    await expect(getCuttingPlan('order-1')).resolves.toMatchObject({
      id: 'plan-1',
      orderId: 'order-1',
      status: 'draft',
    });

    await expect(approveStoredCuttingPlan('order-1')).resolves.toMatchObject({
      status: 'approved',
    });
    await expect(invalidateStoredCuttingPlan('order-1')).resolves.toMatchObject(
      {
        status: 'outdated',
      },
    );
    expect((await adminDb.doc('orders/order-1').get()).data()).toMatchObject({
      serviceType: 'cutting_plan',
      cuttingPlan: { status: 'outdated' },
    });
  });
});
