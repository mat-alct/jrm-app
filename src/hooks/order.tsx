import { toaster } from "@/components/ui/toaster"
import { useMutation } from '@tanstack/react-query';
import { v4 } from 'uuid';
import React, { createContext, ReactNode, useContext } from 'react';

// 1. Importe as funções modulares do Firebase v9+
import firebase, {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  startAt,
  updateDoc,
  where,
  DocumentData,
} from 'firebase/firestore';

// 2. Importe a instância do Firestore do seu arquivo de serviços
import { db } from '../services/firebase';
import { queryClient } from '../services/queryClient';
import { Estimate, Order } from '../types';
import { removeUndefinedAndEmptyFields } from '../utils/removeUndefinedAndEmpty';

interface OrderContext {
  createEstimate: (estimateData: Estimate) => Promise<void>;
  createOrder: (orderData: Order) => Promise<void>;
  getOrders: (orderFilter: string) => Promise<(firebase.DocumentData & { id: string })[]>;
  getOrdersBySearch: (searchFilter: number | undefined, type: string) => Promise<(firebase.DocumentData & { id: string })[]>;
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

  // MUTATIONS
  const createEstimateMutation = useMutation({
    mutationFn: async (estimateData: EstimatePropsWithEstimateCode) => {
      const estimateRef = doc(db, 'estimates', v4());
      await setDoc(estimateRef, estimateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
    onError: () => toast.create({ type: 'error', title: 'Erro ao criar orçamento' }),
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: OrderPropsWithOrderCode) => {
      const orderRef = doc(db, 'orders', v4());
      await setDoc(orderRef, orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: () => toast.create({ type: 'error', title: 'Erro ao criar pedido' }),
  });


  const createEstimate = async (estimateData: Estimate) => {
    try {
      removeUndefinedAndEmptyFields(estimateData);
      const counterRef = doc(db, 'counters', 'estimates');
      const counterSnap = await getDoc(counterRef);
      const estimateCode = counterSnap.data()?.code;
      if (!estimateCode) throw new Error('Contador de orçamentos não encontrado');
      const estimatePrice = estimateData.cutlist.reduce((prev, curr) => prev + curr.price, 0);
      await createEstimateMutation.mutateAsync({ ...estimateData, estimateCode, estimatePrice });
      await updateDoc(counterRef, { code: increment(1) });
      toast.create({ type: 'success', description: 'Orçamento criado com sucesso' });
    } catch {
      toast.create({ type: 'error', description: 'Erro ao criar orçamento' });
    }
  };

  const createOrder = async (orderData: Order) => {
    try {
      removeUndefinedAndEmptyFields(orderData);
      removeUndefinedAndEmptyFields(orderData.customer);
      const counterRef = doc(db, 'counters', 'orders');
      const counterSnap = await getDoc(counterRef);
      const orderCode = counterSnap.data()?.code;
      if (!orderCode) throw new Error('Contador de pedidos não encontrado');
      const orderPrice = orderData.cutlist.reduce((prev, curr) => prev + curr.price, 0);
      await createOrderMutation.mutateAsync({ ...orderData, orderCode, orderPrice });
      await updateDoc(counterRef, { code: increment(1) });
      toast.create({ type: 'success', description: 'Pedido criado com sucesso' });
    } catch {
      toast.create({ type: 'error', description: 'Erro ao criar pedido' });
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

  const getOrdersBySearch = async (searchFilter: number | undefined, type: string) => {
    if (searchFilter) {
      const colRef = collection(db, type);
      const q = query(colRef, orderBy('orderCode'), startAt(searchFilter), limit(1));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    }
    return [];
  };

  return (
    <OrderContext.Provider value={{ createEstimate, createOrder, getOrders, getOrdersBySearch }}>
      {children}
    </OrderContext.Provider>
  );
};

export function useOrder(): OrderContext {
  const context = useContext(OrderContext);

  if (!context) {
    throw new Error('useOrder must be used within an AuthProvider');
  }

  return context;
}
