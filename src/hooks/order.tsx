import { useToast } from '@chakra-ui/react';
import firebase from 'firebase/app';
import React, { createContext, useContext } from 'react';
import { useMutation } from 'react-query';
import { v4 } from 'uuid';

import { queryClient } from '../services/queryClient';
import { Estimate } from '../types';

interface OrderContext {
  createEstimate: (estimateData: Estimate) => Promise<void>;
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
          title: 'Erro ao criar cliente',
          description:
            'Um erro ocorreu durante a criação do cliente pelo React Query',
        });
      },
    },
  );

  const createEstimate = async (estimateData: Estimate) => {
    try {
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

  return (
    <OrderContext.Provider value={{ createEstimate }}>
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
