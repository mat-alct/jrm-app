import { useToast } from '@chakra-ui/react';
import firebase from 'firebase/app';
import React, { createContext, useContext } from 'react';
import { useMutation } from '@tanstack/react-query';
import { v4 } from 'uuid';

import { queryClient } from '../services/queryClient';
import { Estimate, Order } from '../types';
import { removeUndefinedAndEmptyFields } from '../utils/removeUndefinedAndEmpty';

interface OrderContext {
  createEstimate: (estimateData: Estimate) => Promise<void>;
  createOrder: (orderData: Order) => Promise<void>;
  getOrders: (
    orderFilter: string,
  ) => Promise<(firebase.firestore.DocumentData & { id: string })[]>;
  getOrdersBySearch: (
    searchFilter: number | undefined,
    type: string,
  ) => Promise<(firebase.firestore.DocumentData & { id: string })[]>;
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

      // Create a const that takes total price
      const estimatePrice = estimateData.cutlist.reduce((prev, curr) => {
        return prev + curr.price;
      }, 0);

      // Store estimate data in firebase
      await createEstimateMutation.mutateAsync({
        ...estimateData,
        estimateCode: estimateCodeData.code,
        estimatePrice,
      });

      // Increment +1 in firebase counter collection to use in new estimates
      const increment = firebase.firestore.FieldValue.increment(1);

      await firebase
        .firestore()
        .collection('counters')
        .doc('estimates')
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

      // Create a const that takes total price
      const orderPrice = orderData.cutlist.reduce((prev, curr) => {
        return prev + curr.price;
      }, 0);

      // Store order data in firebase
      await createOrderMutation.mutateAsync({
        ...orderData,
        orderCode: orderCodeData.code,
        orderPrice,
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

  const getOrders = async (orderFilter: string) => {
    if (orderFilter === 'Orçamento') {
      const allEstimates = await firebase
        .firestore()
        .collection('estimates')
        .get()
        .then(response =>
          response.docs.map(doc =>
            Object.assign(doc.data() as Estimate, { id: doc.id }),
          ),
        );

      return allEstimates;
    }

    const response = await firebase
      .firestore()
      .collection('orders')
      .where('orderStatus', '==', orderFilter)
      .get();

    const allOrders = response.docs.map(doc =>
      Object.assign(doc.data() as Order, { id: doc.id }),
    );

    return allOrders;
  };

  const getOrdersBySearch = async (
    searchFilter: number | undefined,
    type: string,
  ) => {
    if (searchFilter) {
      const response = await firebase
        .firestore()
        .collection(type)
        .orderBy('orderCode')
        .startAt(searchFilter)
        .limit(1)
        .get();

      const allOrders = response.docs.map(doc =>
        Object.assign(doc.data(), { id: doc.id }),
      );

      return allOrders;
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
    throw new Error('useOrder must be used within an AuthProvider');
  }

  return context;
}
