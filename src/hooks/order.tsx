import { toaster } from '@/components/ui/toaster';
import { useMutation } from '@tanstack/react-query';
import { v4 } from 'uuid';
import React, { createContext, ReactNode, useContext } from 'react';

// Importações do Firebase Modular
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  startAfter, // Importante para paginação
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '../services/firebase';
import { queryClient } from '../services/queryClient';
import { Estimate, Order } from '../types';
import { removeUndefinedAndEmptyFields } from '../utils/removeUndefinedAndEmpty';

// CORREÇÃO: Exportamos a interface para usar no useInfiniteQuery
export interface PagedResult {
  data: (DocumentData & { id: string })[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

interface OrderContext {
  createEstimate: (estimateData: Estimate) => Promise<void>;
  createOrder: (orderData: Order) => Promise<void>;
  // CORREÇÃO: Assinatura compatível com React Query v5 (aceita undefined e null)
  getOrders: (
    orderFilter: string,
    pageParam?: QueryDocumentSnapshot<DocumentData> | null,
  ) => Promise<PagedResult>;
  getOrdersBySearch: (
    searchFilter: number | undefined,
    type: string,
  ) => Promise<(DocumentData & { id: string })[]>;
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
      console.error('Erro ao criar orçamento:', err);
      toast.create({
        type: 'error',
        description: 'Erro ao criar orçamento. Verifique o console.',
      });
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
      console.error('Erro ao criar pedido:', err);
      toast.create({
        type: 'error',
        description: 'Erro ao criar pedido. Tente novamente.',
      });
      throw err;
    }
  };

  // --- BUSCA COM PAGINAÇÃO ---
  const getOrders = async (
    orderFilter: string,
    pageParam?: QueryDocumentSnapshot<DocumentData> | null,
  ): Promise<PagedResult> => {
    // Regra: Paginação apenas para 'Concluído' e 'Orçamento'
    const isPaginationRequired =
      orderFilter === 'Concluído' || orderFilter === 'Orçamento';
    const limitSize = 20;

    let q;

    if (orderFilter === 'Orçamento') {
      const estimatesCol = collection(db, 'estimates');
      // Inicia com a ordenação padrão
      let constraints: any[] = [orderBy('estimateCode', 'desc')];

      if (isPaginationRequired) {
        constraints.push(limit(limitSize));
        // Se houver cursor (pageParam), começa após ele
        if (pageParam) constraints.push(startAfter(pageParam));
      }

      q = query(estimatesCol, ...constraints);
    } else {
      // Busca Pedidos (Orders)
      const ordersCol = collection(db, 'orders');

      // Inicia com filtro de status e ordenação
      let constraints: any[] = [
        where('orderStatus', '==', orderFilter),
        orderBy('orderCode', 'desc'),
      ];

      if (isPaginationRequired) {
        constraints.push(limit(limitSize));
        // Se houver cursor (pageParam), começa após ele
        if (pageParam) constraints.push(startAfter(pageParam));
      }

      // Se NÃO for paginação (Produção/Transporte), não adiciona limit() nem startAfter()
      // e o Firestore trará todos os documentos que correspondem ao filtro.

      q = query(ordersCol, ...constraints);
    }

    const snapshot = await getDocs(q);

    const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

    // Define o último documento para ser usado como cursor na próxima página
    // Se a paginação não for requerida, lastDoc pode ser null ou ignorado pelo front
    const lastDoc =
      isPaginationRequired && snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1]
        : null;

    return { data, lastDoc };
  };

  const getOrdersBySearch = async (
    searchFilter: number | undefined,
    type: string,
  ) => {
    if (searchFilter) {
      const colRef = collection(db, type);
      const fieldCode = type === 'estimates' ? 'estimateCode' : 'orderCode';

      const q = query(colRef, where(fieldCode, '==', searchFilter), limit(1));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    }
    return [];
  };

  return (
    <OrderContext.Provider
      value={{ createEstimate, createOrder, getOrders, getOrdersBySearch }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export function useOrder(): OrderContext {
  const context = useContext(OrderContext);

  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }

  return context;
}
