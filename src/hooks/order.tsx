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

interface OrderPropsWithOrderCode extends Order {
  orderCode: number;
}

interface EstimatePropsWithEstimateCode extends Estimate {
  estimateCode: number;
}

const OrderContext = createContext<OrderContext>({} as OrderContext);

export const OrderProvider: React.FC = ({ children }) => {
  const toast = useToast();

  // MUTATIONS
  const createEstimateMutation = useMutation(
    async (estimateData: EstimatePropsWithEstimateCode) => {
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
    async (orderData: OrderPropsWithOrderCode) => {
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

      // Get auto increment code from counters collection
      const estimateCodeData = await firebase
        .firestore()
        .collection('counters')
        .doc('estimates')
        .get()
        .then(doc => doc.data());

      if (!estimateCodeData?.code) {
        throw new Error();
      }

      // Store estimate data in firebase
      await createEstimateMutation.mutateAsync({
        ...estimateData,
        estimateCode: estimateCodeData.code,
      });

      // Increment +1 in firebase counter collection to use in new estimates
      const increment = firebase.firestore.FieldValue.increment(1);

      await firebase
        .firestore()
        .collection('counters')
        .doc('orders')
        .update({ code: increment });

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
      removeUndefinedAndEmptyFields(orderData.customer);

      // Get auto increment code from counters collection
      const orderCodeData = await firebase
        .firestore()
        .collection('counters')
        .doc('orders')
        .get()
        .then(doc => doc.data());

      if (!orderCodeData?.code) {
        throw new Error();
      }

      // Store order data in firebase
      await createOrderMutation.mutateAsync({
        ...orderData,
        orderCode: orderCodeData.code,
      });

      // Increment +1 in firebase counter collection to use in new orders
      const increment = firebase.firestore.FieldValue.increment(1);

      await firebase
        .firestore()
        .collection('counters')
        .doc('orders')
        .update({ code: increment });

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
