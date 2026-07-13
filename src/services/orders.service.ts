import {
  arrayUnion,
  collection,
  doc,
  DocumentData,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  QueryConstraint,
  QueryDocumentSnapshot,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { v4 } from 'uuid';

import type { CuttingPlan } from '@/domain/cutting-plan';
import {
  cutlistToCuttingPlanPieces,
  cuttingPlanMatchesPieces,
  markCuttingPlanOutdated,
} from '@/domain/cutting-plan';
import {
  Cutlist,
  Estimate,
  EstimateDocument,
  Order,
  OrderDocument,
  OrderEdit,
  OrderListItem,
} from '@/types';
import { removeUndefinedAndEmptyFields } from '@/utils/removeUndefinedAndEmpty';

import { db } from './firebase';
import { getSellerByPassword } from './sellers';

export interface PagedResult {
  data: OrderListItem[];
  totalCount: number;
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

export type OrderCollection = 'estimates' | 'orders';

export type UpdateOrderCutlistResult =
  | { success: true; editedBy: string; priceDifference: number }
  | { success: false; reason: 'invalid-password' | 'order-missing' | 'error' };

interface OrderPropsWithOrderCode extends Order {
  orderCode: number;
  orderPrice: number;
}

interface EstimatePropsWithEstimateCode extends Estimate {
  estimateCode: number;
  estimatePrice: number;
}

const capitalizeSearchTerm = (term: string) =>
  term.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());

const stripUndefinedValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(item => stripUndefinedValue(item));
  }
  if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, item]) => {
      if (item === undefined) return;
      out[key] = stripUndefinedValue(item);
    });
    return out;
  }
  return value;
};

export const stripUndefined = <T>(value: T): T =>
  stripUndefinedValue(value) as T;

const sumCutlistPrice = (items: Cutlist[]) =>
  items.reduce((acc, item) => acc + (item.price ?? 0), 0);

async function writeEstimate(
  estimateData: EstimatePropsWithEstimateCode,
): Promise<void> {
  const estimateRef = doc(db, 'estimates', v4());
  await setDoc(estimateRef, stripUndefined(estimateData));
}

async function writeOrder(orderData: OrderPropsWithOrderCode): Promise<void> {
  const orderId = v4();
  const orderRef = doc(db, 'orders', orderId);
  const cuttingPlan = orderData.cuttingPlan
    ? { ...orderData.cuttingPlan, orderId }
    : undefined;
  await setDoc(orderRef, stripUndefined({ ...orderData, cuttingPlan }));
}

export async function createEstimate(estimateData: Estimate): Promise<void> {
  removeUndefinedAndEmptyFields(estimateData);

  const counterRef = doc(db, 'counters', 'estimates');
  const counterSnap = await getDoc(counterRef);
  const counterData: unknown = counterSnap.data();
  const storedEstimateCode =
    counterData && typeof counterData === 'object' && 'code' in counterData
      ? counterData.code
      : undefined;
  const estimateCode =
    counterSnap.exists() && typeof storedEstimateCode === 'number'
      ? storedEstimateCode
      : 1;
  const estimatePrice = sumCutlistPrice(estimateData.cutlist);

  await writeEstimate({
    ...estimateData,
    estimateCode,
    estimatePrice,
  });

  if (counterSnap.exists()) {
    await updateDoc(counterRef, { code: increment(1) });
  } else {
    await setDoc(counterRef, { code: 2 });
  }
}

export async function createOrder(orderData: Order): Promise<void> {
  removeUndefinedAndEmptyFields(orderData);
  if (orderData.customer) removeUndefinedAndEmptyFields(orderData.customer);

  const counterRef = doc(db, 'counters', 'orders');
  const counterSnap = await getDoc(counterRef);
  const counterData: unknown = counterSnap.data();
  const storedOrderCode =
    counterData && typeof counterData === 'object' && 'code' in counterData
      ? counterData.code
      : undefined;
  const orderCode =
    counterSnap.exists() && typeof storedOrderCode === 'number'
      ? storedOrderCode
      : 1;
  const orderPrice =
    orderData.cuttingPlan && orderData.cuttingPlan.status !== 'outdated'
      ? orderData.cuttingPlan.pricing.totalCost
      : sumCutlistPrice(orderData.cutlist);

  await writeOrder({
    ...orderData,
    orderCode,
    orderPrice,
  });

  if (counterSnap.exists()) {
    await updateDoc(counterRef, { code: increment(1) });
  } else {
    await setDoc(counterRef, { code: 2 });
  }
}

export async function getOrders(
  orderFilter: string,
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null,
): Promise<PagedResult> {
  const isPaginationRequired =
    orderFilter === 'Concluído' || orderFilter === 'Orçamento';
  const limitSize = 20;

  const collectionName = orderFilter === 'Orçamento' ? 'estimates' : 'orders';
  const colRef = collection(db, collectionName);

  const baseConstraints: QueryConstraint[] = [];
  if (orderFilter === 'Orçamento') {
    baseConstraints.push(orderBy('estimateCode', 'desc'));
  } else {
    baseConstraints.push(where('orderStatus', '==', orderFilter));
    baseConstraints.push(orderBy('orderCode', 'desc'));
  }

  const countQuery =
    orderFilter === 'Orçamento'
      ? query(colRef)
      : query(colRef, where('orderStatus', '==', orderFilter));
  const countSnapshot = await getCountFromServer(countQuery);
  const totalCount = countSnapshot.data().count;

  const queryConstraints = [...baseConstraints];
  if (isPaginationRequired) {
    queryConstraints.push(limit(limitSize));
    if (lastDoc) queryConstraints.push(startAfter(lastDoc));
  }

  const snapshot = await getDocs(query(colRef, ...queryConstraints));
  const rawData: OrderListItem[] = snapshot.docs.map(snapshotDocument =>
    orderFilter === 'Orçamento'
      ? ({
          ...(snapshotDocument.data() as Omit<EstimateDocument, 'id'>),
          id: snapshotDocument.id,
        } satisfies EstimateDocument)
      : ({
          ...(snapshotDocument.data() as Omit<OrderDocument, 'id'>),
          id: snapshotDocument.id,
        } satisfies OrderDocument),
  );
  const data =
    orderFilter === 'Orçamento'
      ? rawData
      : rawData.filter(
          item => !('orderCode' in item) || item.isDeactivated !== true,
        );
  const newLastDoc =
    snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

  return { data, totalCount, lastDoc: newLastDoc };
}

export async function getOrdersBySearch(
  searchFilter: string | undefined,
  type: OrderCollection,
): Promise<OrderListItem[]> {
  if (!searchFilter) return [];

  const colRef = collection(db, type);
  const term = searchFilter.trim();
  const isNumeric = !isNaN(Number(term));

  const searchQuery = isNumeric
    ? query(
        colRef,
        where(
          type === 'estimates' ? 'estimateCode' : 'orderCode',
          '==',
          Number(term),
        ),
        limit(5),
      )
    : query(
        colRef,
        where(
          type === 'estimates' ? 'name' : 'customer.name',
          '>=',
          capitalizeSearchTerm(term),
        ),
        where(
          type === 'estimates' ? 'name' : 'customer.name',
          '<=',
          `${capitalizeSearchTerm(term)}\uf8ff`,
        ),
        orderBy(type === 'estimates' ? 'name' : 'customer.name'),
        limit(20),
      );

  try {
    const snapshot = await getDocs(searchQuery);
    return snapshot.docs.map(snapshotDocument =>
      type === 'estimates'
        ? ({
            ...(snapshotDocument.data() as Omit<EstimateDocument, 'id'>),
            id: snapshotDocument.id,
          } satisfies EstimateDocument)
        : ({
            ...(snapshotDocument.data() as Omit<OrderDocument, 'id'>),
            id: snapshotDocument.id,
          } satisfies OrderDocument),
    );
  } catch (error: unknown) {
    console.error('Erro na busca:', error);
    if (error instanceof Error && error.message.includes('index')) {
      console.warn(`
          ⚠️ FALTA ÍNDICE NO FIREBASE!
          O Firebase exige um índice composto para buscar e ordenar ao mesmo tempo.
          Abra o link acima no console para criar o índice automaticamente.
        `);
    }
    return [];
  }
}

export async function updateOrderCutlist(
  id: string,
  newCutlist: Cutlist[],
  sellerPassword: string,
  shouldCharge: boolean,
  cuttingPlan?: CuttingPlan,
): Promise<UpdateOrderCutlistResult> {
  try {
    const sellerRecord = await getSellerByPassword(sellerPassword);
    if (!sellerRecord) return { success: false, reason: 'invalid-password' };

    const orderRef = doc(db, 'orders', id);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return { success: false, reason: 'order-missing' };

    const order = orderSnap.data() as Order & { orderPrice?: number };
    const previousCutlist = order.cutlist ?? [];
    const previousOrderPrice =
      order.orderPrice ?? sumCutlistPrice(previousCutlist);
    const now = Timestamp.fromDate(new Date());
    let nextCuttingPlan = cuttingPlan
      ? { ...cuttingPlan, orderId: id, updatedAt: now }
      : order.cuttingPlan;
    if (
      !cuttingPlan &&
      nextCuttingPlan &&
      !cuttingPlanMatchesPieces(
        nextCuttingPlan,
        cutlistToCuttingPlanPieces(newCutlist),
      )
    ) {
      nextCuttingPlan = markCuttingPlanOutdated(nextCuttingPlan, now);
    }
    const newOrderPrice =
      nextCuttingPlan && nextCuttingPlan.status !== 'outdated'
        ? nextCuttingPlan.pricing.totalCost
        : sumCutlistPrice(newCutlist);
    const priceDifference = newOrderPrice - previousOrderPrice;

    const edit: OrderEdit = stripUndefined({
      editedAt: now,
      editedBy: sellerRecord.name,
      previousCutlist,
      previousOrderPrice,
      priceDifference,
      shouldCharge: priceDifference === 0 ? false : shouldCharge,
    });

    const updatePayload: DocumentData = {
      cutlist: stripUndefined(newCutlist),
      orderPrice: newOrderPrice,
      updatedAt: now,
      edits: arrayUnion(edit),
    };
    if (nextCuttingPlan) {
      updatePayload.cuttingPlan = stripUndefined(nextCuttingPlan);
      updatePayload.serviceType = 'cutting_plan';
    }
    await updateDoc(orderRef, updatePayload);

    return {
      success: true,
      editedBy: sellerRecord.name,
      priceDifference,
    };
  } catch (err) {
    console.error('Erro ao atualizar pedido:', err);
    return { success: false, reason: 'error' };
  }
}
