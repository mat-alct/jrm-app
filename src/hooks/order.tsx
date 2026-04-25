import { toaster } from '@/components/ui/toaster';
import { useMutation } from '@tanstack/react-query';
import { v4 } from 'uuid';
import React, { createContext, ReactNode, useContext } from 'react';

// Importações do Firebase Modular
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  getCountFromServer,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '../services/firebase';
import { queryClient } from '../services/queryClient';
import { Cutlist, Estimate, Order, OrderEdit } from '../types';
import { removeUndefinedAndEmptyFields } from '../utils/removeUndefinedAndEmpty';

export interface PagedResult {
  data: (DocumentData & { id: string })[];
  totalCount: number;
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

export type UpdateOrderCutlistResult =
  | { success: true; editedBy: string; priceDifference: number }
  | { success: false; reason: 'invalid-password' | 'order-missing' | 'error' };

interface OrderContext {
  createEstimate: (estimateData: Estimate) => Promise<void>;
  createOrder: (orderData: Order) => Promise<void>;
  getOrders: (
    orderFilter: string,
    lastDoc?: QueryDocumentSnapshot<DocumentData> | null,
  ) => Promise<PagedResult>;
  // Busca otimizada recebe string e trata internamente
  getOrdersBySearch: (
    searchFilter: string | undefined,
    type: string,
  ) => Promise<(DocumentData & { id: string })[]>;
  updateOrderCutlist: (
    id: string,
    newCutlist: Cutlist[],
    sellerPassword: string,
    shouldCharge: boolean,
  ) => Promise<UpdateOrderCutlistResult>;
}

interface OrderPropsWithOrderCode extends Order {
  orderCode: number;
  orderPrice: number;
}

interface EstimatePropsWithEstimateCode extends Estimate {
  estimateCode: number;
  estimatePrice: number;
}

const OrderContext = createContext<OrderContext>({} as OrderContext);

type OrderProviderProps = {
  children: ReactNode;
};

// Função auxiliar para capitalizar a busca (ex: "pedro silva" -> "Pedro Silva")
const capitalizeSearchTerm = (term: string) => {
  return term.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());
};

export const OrderProvider = ({ children }: OrderProviderProps) => {
  const toast = toaster;

  // --- MUTATIONS ---
  const createEstimateMutation = useMutation({
    mutationFn: async (estimateData: EstimatePropsWithEstimateCode) => {
      const estimateRef = doc(db, 'estimates', v4());
      await setDoc(estimateRef, estimateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: OrderPropsWithOrderCode) => {
      const orderRef = doc(db, 'orders', v4());
      await setDoc(orderRef, orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // --- METHODS ---
  const createEstimate = async (estimateData: Estimate) => {
    try {
      removeUndefinedAndEmptyFields(estimateData);
      const counterRef = doc(db, 'counters', 'estimates');
      const counterSnap = await getDoc(counterRef);
      const estimateCode = counterSnap.exists() ? counterSnap.data()?.code : 1;
      const estimatePrice = estimateData.cutlist.reduce(
        (prev, curr) => prev + curr.price,
        0,
      );

      await createEstimateMutation.mutateAsync({
        ...estimateData,
        estimateCode,
        estimatePrice,
      });

      if (counterSnap.exists()) {
        await updateDoc(counterRef, { code: increment(1) });
      } else {
        await setDoc(counterRef, { code: 2 });
      }
      toast.create({
        type: 'success',
        description: 'Orçamento criado com sucesso',
      });
    } catch (err) {
      console.error(err);
      toast.create({ type: 'error', description: 'Erro ao criar orçamento.' });
      throw err;
    }
  };

  const createOrder = async (orderData: Order) => {
    try {
      removeUndefinedAndEmptyFields(orderData);
      if (orderData.customer) removeUndefinedAndEmptyFields(orderData.customer);

      const counterRef = doc(db, 'counters', 'orders');
      const counterSnap = await getDoc(counterRef);
      const orderCode = counterSnap.exists() ? counterSnap.data()?.code : 1;
      const orderPrice = orderData.cutlist.reduce(
        (prev, curr) => prev + curr.price,
        0,
      );

      await createOrderMutation.mutateAsync({
        ...orderData,
        orderCode,
        orderPrice,
      });

      if (counterSnap.exists()) {
        await updateDoc(counterRef, { code: increment(1) });
      } else {
        await setDoc(counterRef, { code: 2 });
      }
      toast.create({
        type: 'success',
        description: 'Pedido criado com sucesso',
      });
    } catch (err) {
      console.error(err);
      toast.create({ type: 'error', description: 'Erro ao criar pedido.' });
      throw err;
    }
  };

  // --- PAGINAÇÃO (Mantida Lógica de Cursor) ---
  const getOrders = async (
    orderFilter: string,
    lastDoc?: QueryDocumentSnapshot<DocumentData> | null,
  ): Promise<PagedResult> => {
    const isPaginationRequired =
      orderFilter === 'Concluído' || orderFilter === 'Orçamento';
    const limitSize = 20;

    const collectionName = orderFilter === 'Orçamento' ? 'estimates' : 'orders';
    const colRef = collection(db, collectionName);

    // 1. Filtros Básicos
    let baseConstraints: any[] = [];
    if (orderFilter === 'Orçamento') {
      baseConstraints.push(orderBy('estimateCode', 'desc'));
    } else {
      baseConstraints.push(where('orderStatus', '==', orderFilter));
      baseConstraints.push(orderBy('orderCode', 'desc'));
    }

    // 2. Contar Total
    let totalCount = 0;
    const countConstraints = baseConstraints.filter(c => c.type === 'where');
    const countQuery = query(colRef, ...countConstraints);
    const countSnapshot = await getCountFromServer(countQuery);
    totalCount = countSnapshot.data().count;

    // 3. Buscar Dados
    let queryConstraints = [...baseConstraints];
    if (isPaginationRequired) {
      queryConstraints.push(limit(limitSize));
      if (lastDoc) {
        queryConstraints.push(startAfter(lastDoc));
      }
    }

    const q = query(colRef, ...queryConstraints);
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    const newLastDoc =
      snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { data, totalCount, lastDoc: newLastDoc };
  };

  // --- BUSCA HÍBRIDA (Número ou Nome Capitalizado) ---
  const getOrdersBySearch = async (
    searchFilter: string | undefined,
    type: string,
  ) => {
    if (!searchFilter) return [];

    const colRef = collection(db, type);
    const term = searchFilter.trim();
    const isNumeric = !isNaN(Number(term));

    let q;

    if (isNumeric) {
      // CASO 1: Busca por CÓDIGO (Exata)
      const fieldCode = type === 'estimates' ? 'estimateCode' : 'orderCode';
      const codeNumber = Number(term);

      console.log(`🔎 Buscando código exato: ${codeNumber}`);

      q = query(colRef, where(fieldCode, '==', codeNumber), limit(5));
    } else {
      // CASO 2: Busca por NOME (Começa com...)
      // Capitaliza o termo (ex: "pedro" -> "Pedro")
      const capitalizedStart = capitalizeSearchTerm(term);
      const capitalizedEnd = capitalizedStart + '\uf8ff'; // \uf8ff é o caractere mágico "fim" do Unicode

      const fieldName = type === 'estimates' ? 'name' : 'customer.name';

      console.log(
        `🔎 Buscando nome: "${capitalizedStart}" até "${capitalizedEnd}"`,
      );

      q = query(
        colRef,
        where(fieldName, '>=', capitalizedStart),
        where(fieldName, '<=', capitalizedEnd),
        orderBy(fieldName), // Importante: Ordena pelo nome para o filtro range funcionar
        limit(20), // Proteção contra travamento
      );
    }

    try {
      const snapshot = await getDocs(q);

      // Se não houver resultados, retorna array vazio (não baixa tudo do banco)
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (error: any) {
      console.error('Erro na busca:', error);

      // Se o Firebase pedir índice, avisa no console
      if (error.message.includes('index')) {
        console.warn(`
          ⚠️ FALTA ÍNDICE NO FIREBASE!
          O Firebase exige um índice composto para buscar e ordenar ao mesmo tempo.
          Abra o link acima no console para criar o índice automaticamente.
        `);
      }
      return [];
    }
  };

  const sumCutlistPrice = (items: Cutlist[]) =>
    items.reduce((acc, item) => acc + (item.price ?? 0), 0);

  // Remove campos `undefined` recursivamente (Firestore não aceita undefined).
  const stripUndefined = <T,>(value: T): T => {
    if (Array.isArray(value)) {
      return value.map(item => stripUndefined(item)) as unknown as T;
    }
    if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
      const out: Record<string, unknown> = {};
      Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
        if (v === undefined) return;
        out[k] = stripUndefined(v);
      });
      return out as T;
    }
    return value;
  };

  const updateOrderCutlist = async (
    id: string,
    newCutlist: Cutlist[],
    sellerPassword: string,
    shouldCharge: boolean,
  ): Promise<UpdateOrderCutlistResult> => {
    try {
      const sellersRef = collection(db, 'sellers');
      const sellerQuery = query(
        sellersRef,
        where('password', '==', sellerPassword),
      );
      const sellerSnap = await getDocs(sellerQuery);
      if (sellerSnap.empty) {
        return { success: false, reason: 'invalid-password' };
      }
      const editedBy = sellerSnap.docs[0].data().name as string;

      const orderRef = doc(db, 'orders', id);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        return { success: false, reason: 'order-missing' };
      }
      const order = orderSnap.data() as Order & { orderPrice?: number };

      const previousCutlist = order.cutlist ?? [];
      const previousOrderPrice =
        order.orderPrice ?? sumCutlistPrice(previousCutlist);
      const newOrderPrice = sumCutlistPrice(newCutlist);
      const priceDifference = newOrderPrice - previousOrderPrice;

      const edit: OrderEdit = stripUndefined({
        editedAt: Timestamp.fromDate(new Date()),
        editedBy,
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

      queryClient.invalidateQueries({ queryKey: ['orders'] });

      return { success: true, editedBy, priceDifference };
    } catch (err) {
      console.error('Erro ao atualizar pedido:', err);
      return { success: false, reason: 'error' };
    }
  };

  return (
    <OrderContext.Provider
      value={{
        createEstimate,
        createOrder,
        getOrders,
        getOrdersBySearch,
        updateOrderCutlist,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export function useOrder(): OrderContext {
  const context = useContext(OrderContext);
  if (!context)
    throw new Error('useOrder must be used within an OrderProvider');
  return context;
}
