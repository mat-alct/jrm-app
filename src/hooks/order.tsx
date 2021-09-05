import { useToast } from '@chakra-ui/react';
import firebase from 'firebase/app';
import React, { createContext, useContext } from 'react';
import { useMutation } from 'react-query';
import { v4 } from 'uuid';

import { queryClient } from '../services/queryClient';
import { Estimate, Order } from '../types';
import { removeUndefinedAndEmptyFields } from '../utils/removeUndefinedAndEmpty';

interface OrderContext {
  createEstimate: (estimateData: Estimate) => Promise<void>;
  createOrder: (orderData: Order) => Promise<void>;
}

const OrderContext = createContext<OrderContext>({} as OrderContext);

export const OrderProvider: React.FC = ({ children }) => {
  const toast = useToast();

  // MUTATIONS
  const createEstimateMutation = useMutation(
    async (estimateData: Estimate) => {
      await firebase
        .firestore()
        .collection('estimates')
        .doc(v4())
        .set(estimateData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('estimates');
      },
      onError: () => {
        toast({
          status: 'error',
          title: 'Erro ao criar orçamento',
          description:
            'Um erro ocorreu durante a criação do orçamento pelo React Query',
        });
      },
    },
  );

  const createOrderMutation = useMutation(
    async (orderData: Order) => {
      await firebase.firestore().collection('orders').doc(v4()).set(orderData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('orders');
      },
      onError: () => {
        toast({
          status: 'error',
          title: 'Erro ao criar pedido',
          description:
            'Um erro ocorreu durante a criação do pedido pelo React Query',
        });
      },
    },
  );

  const createEstimate = async (estimateData: Estimate) => {
    try {
      removeUndefinedAndEmptyFields(estimateData);

      await createEstimateMutation.mutateAsync(estimateData);

      toast({
        status: 'success',
        description: 'Orçamento criado com sucesso',
      });
    } catch {
      toast({
        status: 'error',
        description: 'Erro ao criar orçamento',
      });
    }
  };

  const createOrder = async (orderData: Order) => {
    try {
      removeUndefinedAndEmptyFields(orderData);

      await createOrderMutation.mutateAsync(orderData);

      toast({
        status: 'success',
        description: 'Pedido criado com sucesso',
      });
    } catch {
      toast({
        status: 'error',
        description: 'Erro ao criar pedido',
      });
    }
  };

  return (
    <OrderContext.Provider value={{ createEstimate, createOrder }}>
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
