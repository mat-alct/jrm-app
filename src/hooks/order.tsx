import { toaster } from '@/components/ui/toaster';
import { useMutation } from '@tanstack/react-query';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

import {
  createEstimate as createEstimateService,
  createOrder as createOrderService,
  getOrders as getOrdersService,
  getOrdersBySearch as getOrdersBySearchService,
  PagedResult,
  updateOrderCutlist as updateOrderCutlistService,
  UpdateOrderCutlistResult,
} from '../services/orders.service';
import { queryClient } from '../services/queryClient';
import { Cutlist, Estimate, Order } from '../types';

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

const OrderContext = createContext<OrderContext>({} as OrderContext);

type OrderProviderProps = {
  children: ReactNode;
};

export const OrderProvider = ({ children }: OrderProviderProps) => {
  // --- MUTATIONS ---
  const createEstimateMutation = useMutation({
    mutationFn: createEstimateService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: createOrderService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const { mutateAsync: createEstimateAsync } = createEstimateMutation;
  const { mutateAsync: createOrderAsync } = createOrderMutation;

  // --- METHODS ---
  const createEstimate = useCallback(
    async (estimateData: Estimate) => {
      try {
        await createEstimateAsync(estimateData);
        toaster.create({
          type: 'success',
          description: 'Orçamento criado com sucesso',
        });
      } catch (err) {
        console.error(err);
        toaster.create({
          type: 'error',
          description: 'Erro ao criar orçamento.',
        });
        throw err;
      }
    },
    [createEstimateAsync],
  );

  const createOrder = useCallback(
    async (orderData: Order) => {
      try {
        await createOrderAsync(orderData);
        toaster.create({
          type: 'success',
          description: 'Pedido criado com sucesso',
        });
      } catch (err) {
        console.error(err);
        toaster.create({
          type: 'error',
          description: 'Erro ao criar pedido.',
        });
        throw err;
      }
    },
    [createOrderAsync],
  );

  const getOrders = useCallback(getOrdersService, []);

  const getOrdersBySearch = useCallback(getOrdersBySearchService, []);

  const updateOrderCutlist = useCallback(async (
    id: string,
    newCutlist: Cutlist[],
    sellerPassword: string,
    shouldCharge: boolean,
  ): Promise<UpdateOrderCutlistResult> => {
    const result = await updateOrderCutlistService(
      id,
      newCutlist,
      sellerPassword,
      shouldCharge,
    );
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
    return result;
  }, []);

  const value = useMemo<OrderContext>(
    () => ({
      createEstimate,
      createOrder,
      getOrders,
      getOrdersBySearch,
      updateOrderCutlist,
    }),
    [
      createEstimate,
      createOrder,
      getOrders,
      getOrdersBySearch,
      updateOrderCutlist,
    ],
  );

  return (
    <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
  );
};

export function useOrder(): OrderContext {
  const context = useContext(OrderContext);
  if (!context)
    throw new Error('useOrder must be used within an OrderProvider');
  return context;
}
