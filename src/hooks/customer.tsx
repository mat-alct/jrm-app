import { useToast } from '@chakra-ui/react';
import firebase from 'firebase/app';
import React, { createContext, useContext } from 'react';
import { useMutation } from 'react-query';
import { v4 } from 'uuid';

import { queryClient } from '../services/queryClient';
import { Customer } from '../types';
import { removeUndefinedAndEmptyFields } from '../utils/removeUndefinedAndEmpty';

interface CustomerContext {
  createCustomer: (newCustomerData: Customer) => Promise<void>;
  getCustomers: () => Promise<
    (firebase.firestore.DocumentData & { id: string })[]
  >;
  removeCustomer: (id: string) => Promise<void>;
}

const CustomerContext = createContext<CustomerContext>({} as CustomerContext);

export const CustomerProvider: React.FC = ({ children }) => {
  const toast = useToast();

  // MUTATIONS

  const createCustomerMutation = useMutation(
    async (customerData: Customer) => {
      await firebase
        .firestore()
        .collection('customers')
        .doc(v4())
        .set(customerData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customers');
      },
      onError: () => {
        toast({
          status: 'error',
          title: 'Erro ao criar cliente',
          isClosable: true,
          description:
            'Um erro ocorreu durante a criação do cliente pelo React Query',
          position: 'top-right',
        });
      },
    },
  );

  const removeCustomerMutation = useMutation(
    async (id: string) => {
      await firebase.firestore().collection('customers').doc(id).delete();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customers');
      },
      onError: () => {
        toast({
          status: 'error',
          title: 'Erro ao remover cliente',
          isClosable: true,
          description:
            'Um erro ocorreu durante a remoção do cliente pelo React Query',
        });
      },
    },
  );

  // METHODS

  const createCustomer = async (newCustomerData: Customer) => {
    removeUndefinedAndEmptyFields(newCustomerData);

    await createCustomerMutation.mutateAsync(newCustomerData);
  };

  const getCustomers = async () => {
    const response = await firebase.firestore().collection('customers').get();

    const allCustomers = response.docs.map(doc =>
      Object.assign(doc.data() as Customer, { id: doc.id }),
    );

    return allCustomers;
  };

  const removeCustomer = async (id: string) => {
    await removeCustomerMutation.mutateAsync(id);
  };

  return (
    <CustomerContext.Provider
      value={{
        createCustomer,
        getCustomers,
        removeCustomer,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export function useCustomer(): CustomerContext {
  const context = useContext(CustomerContext);

  if (!context) {
    throw new Error('useCustomer must be used within an AuthProvider');
  }

  return context;
}
