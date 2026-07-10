import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase/firestore';

import {
  buildCuttingPlan,
  cutlistToCuttingPlanInput,
  generateCuttingPlan,
} from '@/domain/cutting-plan';

import { auth } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import {
  createEstimate,
  createOrder,
  getOrders,
  getOrdersBySearch,
  stripUndefined,
  updateOrderCutlist,
} from '@/services/orders.service';
import {
  createMaterial,
  getAllMaterials,
  getMaterials,
  removeMaterial,
  updateMaterialPrice,
} from '@/services/materials.service';
import { Cutlist, Estimate, Material, Order } from '@/types';
import { resetEmulator } from '@/tests/helpers/emulator';
import {
  seedEmulator,
  SEED_MATERIAL_NAME,
  SEED_USER_PASSWORD,
} from '@/tests/helpers/seedEmulator';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

function cutlist(id: string, price: number): Cutlist {
  return {
    id,
    material: {
      materialId: 'mat-1',
      name: SEED_MATERIAL_NAME,
      width: 2750,
      height: 1850,
      price: 220,
    },
    amount: 1,
    sideA: 100,
    sideB: 50,
    borderA: 0,
    borderB: 0,
    price,
  };
}

function order(
  overrides: Omit<Partial<Order>, 'customer'> & {
    customer?: Partial<Order['customer']>;
  } = {},
): Order {
  const { customer, ...rest } = overrides;
  return {
    cutlist: [cutlist('cut-1', 100)],
    customer: {
      name: 'Pedro Silva',
      telephone: '24999990000',
      address: 'Rua Um',
      area: 'Centro',
      city: 'Volta Redonda',
      state: 'RJ',
      ...(customer ?? {}),
    },
    deliveryType: 'Entrega',
    paymentType: 'Dinheiro',
    seller: 'Vendedor Seed',
    orderStatus: 'Concluído',
    deliveryDate: Timestamp.fromDate(new Date('2026-02-01T12:00:00.000Z')),
    createdAt: Timestamp.fromDate(new Date('2026-01-15T12:00:00.000Z')),
    updatedAt: Timestamp.fromDate(new Date('2026-01-15T12:00:00.000Z')),
    ...rest,
  };
}

function estimate(overrides: Partial<Estimate> = {}): Estimate {
  return {
    name: 'Pedro Silva',
    telephone: '24999990000',
    cutlist: [cutlist('estimate-cut-1', 80)],
    createdAt: Timestamp.fromDate(new Date('2026-01-15T12:00:00.000Z')),
    updatedAt: Timestamp.fromDate(new Date('2026-01-15T12:00:00.000Z')),
    ...overrides,
  };
}

function adminOrderData(overrides: Parameters<typeof order>[0] = {}) {
  return {
    ...order(overrides),
    deliveryDate: AdminTimestamp.fromDate(new Date('2026-02-01T12:00:00.000Z')),
    createdAt: AdminTimestamp.fromDate(new Date('2026-01-15T12:00:00.000Z')),
    updatedAt: AdminTimestamp.fromDate(new Date('2026-01-15T12:00:00.000Z')),
  };
}

function cuttingPlanFor(items: Cutlist[]) {
  const timestamp = Timestamp.fromDate(new Date('2026-01-15T12:00:00.000Z'));
  return buildCuttingPlan({
    id: 'plan-integration',
    orderId: 'pending',
    status: 'approved',
    timestamp,
    result: generateCuttingPlan(
      cutlistToCuttingPlanInput({
        cutlist: items,
        optimizationMode: 'balanced',
      }),
    ),
  });
}

function adminCuttingPlanFor(items: Cutlist[]) {
  const plan = stripUndefined(cuttingPlanFor(items));
  const timestamp = AdminTimestamp.fromDate(
    new Date('2026-01-15T12:00:00.000Z'),
  );

  return {
    ...plan,
    createdAt: timestamp,
    updatedAt: timestamp,
    approvedAt: timestamp,
  };
}

describe('legacy orders/materials services integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
    await adminDb.doc('sellers/seller-pass').set({ name: 'Vendedor Seed' });
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('creates orders and estimates with sequential counters and strips undefined fields', async () => {
    await signInAs('vendedor@seed.jrm');
    await adminDb.doc('counters/orders').set({ code: 10 });
    await adminDb.doc('counters/estimates').set({ code: 20 });

    await createOrder(
      order({
        amountDue: undefined,
        customer: {
          name: 'Ana Lima',
          telephone: undefined,
        },
      }),
    );
    await createOrder(order({ customer: { name: 'Bruno Costa' } }));
    await createEstimate(estimate({ telephone: undefined }));

    const ordersSnap = await adminDb
      .collection('orders')
      .where('seller', '==', 'Vendedor Seed')
      .get();
    expect(ordersSnap.docs.map(doc => doc.data().orderCode).sort()).toEqual([
      1, 10, 11,
    ]);
    const createdOrder = ordersSnap.docs.find(
      doc => doc.data().orderCode === 10,
    );
    expect(createdOrder?.data()).toMatchObject({
      orderPrice: 100,
      customer: { name: 'Ana Lima' },
    });
    expect(createdOrder?.data().amountDue).toBeUndefined();
    expect(createdOrder?.data().customer.telephone).toBeUndefined();

    const estimatesSnap = await adminDb
      .collection('estimates')
      .orderBy('estimateCode')
      .get();
    expect(estimatesSnap.docs.map(doc => doc.data().estimateCode)).toEqual([
      20,
    ]);
    expect(estimatesSnap.docs[0].data()).toMatchObject({ estimatePrice: 80 });
    expect(estimatesSnap.docs[0].data().telephone).toBeUndefined();
  });

  it('paginates completed orders with stable order and count, then searches by capitalized customer name', async () => {
    await signInAs('vendedor@seed.jrm');
    const batch = adminDb.batch();
    for (let code = 1; code <= 25; code += 1) {
      batch.set(adminDb.collection('orders').doc(`paged-${code}`), {
        ...adminOrderData({
          customer: { name: code === 7 ? 'Pedro Silva' : `Cliente ${code}` },
        }),
        orderCode: code,
        orderPrice: code,
      });
    }
    await batch.commit();

    const firstPage = await getOrders('Concluído');
    expect(firstPage.totalCount).toBe(25);
    expect(firstPage.data.map(item => item.orderCode)).toEqual(
      Array.from({ length: 20 }, (_, index) => 25 - index),
    );

    const secondPage = await getOrders('Concluído', firstPage.lastDoc);
    expect(secondPage.data.map(item => item.orderCode)).toEqual([
      5, 4, 3, 2, 1,
    ]);

    await expect(getOrdersBySearch('pedro silva', 'orders')).resolves.toEqual([
      expect.objectContaining({
        id: 'paged-7',
        customer: expect.objectContaining({ name: 'Pedro Silva' }),
      }),
    ]);
  });

  it('creates an order with the saved cutting plan, linked id and calculated price', async () => {
    await signInAs('vendedor@seed.jrm');
    const items = [cutlist('cut-plan', 999)];
    const cuttingPlan = cuttingPlanFor(items);

    await createOrder(
      order({
        cutlist: items,
        serviceType: 'cutting_plan',
        cuttingPlan,
      }),
    );

    const snapshot = await adminDb
      .collection('orders')
      .where('serviceType', '==', 'cutting_plan')
      .get();
    expect(snapshot.docs).toHaveLength(1);
    const created = snapshot.docs[0];
    expect(created.data()).toMatchObject({
      orderPrice: cuttingPlan.pricing.totalCost,
      cuttingPlan: {
        id: 'plan-integration',
        orderId: created.id,
        status: 'approved',
      },
    });
  });

  it('updates order cutlist only with a valid seller password and records edit history', async () => {
    await signInAs('vendedor@seed.jrm');
    await adminDb.doc('orders/order-to-edit').set({
      ...adminOrderData(),
      orderCode: 99,
      orderPrice: 100,
      serviceType: 'cutting_plan',
      cuttingPlan: adminCuttingPlanFor([cutlist('cut-1', 100)]),
    });

    await expect(
      updateOrderCutlist(
        'order-to-edit',
        [cutlist('new-cut', 160)],
        'wrong',
        true,
      ),
    ).resolves.toEqual({ success: false, reason: 'invalid-password' });
    const unchangedOrder = (
      await adminDb.doc('orders/order-to-edit').get()
    ).data();
    expect(unchangedOrder).toMatchObject({ orderPrice: 100 });
    expect(unchangedOrder?.edits).toBeUndefined();

    await expect(
      updateOrderCutlist(
        'order-to-edit',
        [cutlist('new-cut', 160)],
        'seller-pass',
        true,
      ),
    ).resolves.toEqual({
      success: true,
      editedBy: 'Vendedor Seed',
      priceDifference: 60,
    });

    const editedOrder = (
      await adminDb.doc('orders/order-to-edit').get()
    ).data();
    expect(editedOrder).toMatchObject({
      orderPrice: 160,
      cutlist: [expect.objectContaining({ id: 'new-cut', price: 160 })],
      edits: [
        expect.objectContaining({
          editedBy: 'Vendedor Seed',
          previousOrderPrice: 100,
          priceDifference: 60,
          shouldCharge: true,
        }),
      ],
      cuttingPlan: expect.objectContaining({ status: 'outdated' }),
    });
  });

  it('performs material CRUD through the extracted material service', async () => {
    await signInAs('vendedor@seed.jrm');
    const materialData: Material = {
      name: 'Compensado Naval',
      width: 2200,
      height: 1600,
      price: 180,
      materialType: 'Compensado',
      createdAt: Timestamp.fromDate(new Date('2026-01-15T12:00:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-01-15T12:00:00.000Z')),
    };

    await createMaterial(materialData);

    const [created] = await getMaterials('Compensado');
    expect(created).toMatchObject({
      name: 'Compensado Naval',
      price: 180,
      materialType: 'Compensado',
    });

    await updateMaterialPrice({ id: created.id!, newPrice: 195 });
    await expect(getAllMaterials()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.id, price: 195 }),
      ]),
    );

    await removeMaterial(created.id!);
    await expect(getMaterials('Compensado')).resolves.toEqual([]);
  });
});
