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
  DocumentData,
} from 'firebase/firestore';

import { db } from '../services/firebase';
import { queryClient } from '../services/queryClient';
import { Estimate, Order } from '../types';
import { removeUndefinedAndEmptyFields } from '../utils/removeUndefinedAndEmpty';

interface OrderContext {
  createEstimate: (estimateData: Estimate) => Promise<void>;
  createOrder: (orderData: Order) => Promise<void>;
  getOrders: (
    orderFilter: string,
  ) => Promise<(DocumentData & { id: string })[]>;
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
    // O onError aqui é apenas um fallback, trataremos no try/catch principal
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

      // Busca o contador de orçamentos
      const counterRef = doc(db, 'counters', 'estimates');
      const counterSnap = await getDoc(counterRef);

      // Se não existir, começa do 1
      const estimateCode = counterSnap.exists() ? counterSnap.data()?.code : 1;

      const estimatePrice = estimateData.cutlist.reduce(
        (prev, curr) => prev + curr.price,
        0,
      );

      // Cria o documento
      await createEstimateMutation.mutateAsync({
        ...estimateData,
        estimateCode,
        estimatePrice,
      });

      // Atualiza o contador
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
      throw err; // CORREÇÃO IMPRESCINDÍVEL: Repassa o erro para parar o fluxo na tela
    }
  };

  const createOrder = async (orderData: Order) => {
    try {
      // Limpeza de campos undefined
      removeUndefinedAndEmptyFields(orderData);
      if (orderData.customer) removeUndefinedAndEmptyFields(orderData.customer);

      // Busca o contador de pedidos
      const counterRef = doc(db, 'counters', 'orders');
      const counterSnap = await getDoc(counterRef);

      const orderCode = counterSnap.exists() ? counterSnap.data()?.code : 1;

      const orderPrice = orderData.cutlist.reduce(
        (prev, curr) => prev + curr.price,
        0,
      );

      // Cria o documento
      await createOrderMutation.mutateAsync({
        ...orderData,
        orderCode,
        orderPrice,
      });

      // Atualiza o contador
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
      // Aqui você pode inspecionar o 'err' no console do navegador para ver se é permissão, conexão, etc.
      toast.create({
        type: 'error',
        description: 'Erro ao criar pedido. Tente novamente.',
      });
      throw err; // CORREÇÃO IMPRESCINDÍVEL: Repassa o erro para parar o fluxo na tela
    }
  };

  const getOrders = async (orderFilter: string) => {
    if (orderFilter === 'Orçamento') {
      const estimatesCol = collection(db, 'estimates');
      const estimatesSnapshot = await getDocs(estimatesCol);
      return estimatesSnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    }

    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, where('orderStatus', '==', orderFilter));
    const ordersSnapshot = await getDocs(q);
    return ordersSnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  };

  const getOrdersBySearch = async (
    searchFilter: number | undefined,
    type: string,
  ) => {
    if (searchFilter) {
      const colRef = collection(db, type);
      // Seleciona o campo correto baseado no tipo de busca
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
