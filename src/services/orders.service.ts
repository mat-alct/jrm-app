import { v4 } from 'uuid';
import {
  arrayUnion,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

import { Cutlist, Estimate, Order, OrderEdit } from '@/types';
import { removeUndefinedAndEmptyFields } from '@/utils/removeUndefinedAndEmpty';

import { db } from './firebase';
import { getSellerByPassword } from './sellers';

export interface PagedResult {
  data: (DocumentData & { id: string })[];
  totalCount: number;
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

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

export const stripUndefined = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(item => stripUndefined(item)) as unknown as T;
  }
  if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (item === undefined) return;
      out[key] = stripUndefined(item);
    });
    return out as T;
  }
  return value;
};

const sumCutlistPrice = (items: Cutlist[]) =>
  items.reduce((acc, item) => acc + (item.price ?? 0), 0);

async function writeEstimate(
  estimateData: EstimatePropsWithEstimateCode,
): Promise<void> {
  const estimateRef = doc(db, 'estimates', v4());
  await setDoc(estimateRef, stripUndefined(estimateData));
}

async function writeOrder(orderData: OrderPropsWithOrderCode): Promise<void> {
  const orderRef = doc(db, 'orders', v4());
  await setDoc(orderRef, stripUndefined(orderData));
}

export async function createEstimate(estimateData: Estimate): Promise<void> {
  removeUndefinedAndEmptyFields(estimateData);

  const counterRef = doc(db, 'counters', 'estimates');
  const counterSnap = await getDoc(counterRef);
  const estimateCode = counterSnap.exists() ? counterSnap.data()?.code : 1;
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
  const orderCode = counterSnap.exists() ? counterSnap.data()?.code : 1;
  const orderPrice = sumCutlistPrice(orderData.cutlist);

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

  const baseConstraints: any[] = [];
  if (orderFilter === 'Orçamento') {
    baseConstraints.push(orderBy('estimateCode', 'desc'));
  } else {
    baseConstraints.push(where('orderStatus', '==', orderFilter));
    baseConstraints.push(orderBy('orderCode', 'desc'));
  }

  const countConstraints = baseConstraints.filter(c => c.type === 'where');
  const countQuery = query(colRef, ...countConstraints);
  const countSnapshot = await getCountFromServer(countQuery);
  const totalCount = countSnapshot.data().count;

  const queryConstraints = [...baseConstraints];
  if (isPaginationRequired) {
    queryConstraints.push(limit(limitSize));
    if (lastDoc) queryConstraints.push(startAfter(lastDoc));
  }

  const snapshot = await getDocs(query(colRef, ...queryConstraints));
  const rawData = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  const data =
    orderFilter === 'Orçamento'
      ? rawData
      : rawData.filter(d => (d as any).isDeactivated !== true);
  const newLastDoc =
    snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

  return { data, totalCount, lastDoc: newLastDoc };
}

export async function getOrdersBySearch(
  searchFilter: string | undefined,
  type: string,
): Promise<(DocumentData & { id: string })[]> {
  if (!searchFilter) return [];

  const colRef = collection(db, type);
  const term = searchFilter.trim();
  const isNumeric = !isNaN(Number(term));

  const searchQuery = isNumeric
    ? query(
        colRef,
        where(type === 'estimates' ? 'estimateCode' : 'orderCode', '==', Number(term)),
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
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch (error: any) {
    console.error('Erro na busca:', error);
    if (error.message.includes('index')) {
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
): Promise<UpdateOrderCutlistResult> {
  try {
    const sellerRecord = await getSellerByPassword(sellerPassword);
    if (!sellerRecord) return { success: false, reason: 'invalid-password' };

    const orderRef = doc(db, 'orders', id);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return { success: false, reason: 'order-missing' };

    const order = orderSnap.data() as Order & { orderPrice?: number };
    const previousCutlist = order.cutlist ?? [];
    const previousOrderPrice = order.orderPrice ?? sumCutlistPrice(previousCutlist);
    const newOrderPrice = sumCutlistPrice(newCutlist);
    const priceDifference = newOrderPrice - previousOrderPrice;

    const edit: OrderEdit = stripUndefined({
      editedAt: Timestamp.fromDate(new Date()),
      editedBy: sellerRecord.name,
      previousCutlist,
      previousOrderPrice,
      priceDifference,
      shouldCharge: priceDifference === 0 ? false : shouldCharge,
    });

    await updateDoc(orderRef, {
      cutlist: stripUndefined(newCutlist),
      orderPrice: newOrderPrice,
      updatedAt: Timestamp.fromDate(new Date()),
      edits: arrayUnion(edit),
    });

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
