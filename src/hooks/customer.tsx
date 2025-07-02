import { useToast } from '@chakra-ui/react';
import firebase from 'firebase/app';
import React, { createContext, useContext } from 'react';
import { useMutation } from '@tanstack/react-query';
import { v4 } from 'uuid';

import { queryClient } from '../services/queryClient';
import { Customer } from '../types';
import { removeUndefinedAndEmptyFields } from '../utils/removeUndefinedAndEmpty';

interface CustomerContext {
  createCustomer: (newCustomerData: Customer) => Promise<void>;
  getCustomers: (
    searchFilter: string | undefined,
  ) => Promise<(firebase.firestore.DocumentData & { id: string })[]>;
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
    try {
      removeUndefinedAndEmptyFields(newCustomerData);

      await createCustomerMutation.mutateAsync(newCustomerData);

      toast({
        status: 'success',
        title: 'Cliente criado com sucesso',
        isClosable: true,
      });
    } catch {
      toast({
        status: 'error',
        title: 'Erro ao criar cliente',
        isClosable: true,
      });
    }
  };

  const getCustomers = async (searchFilter: string | undefined) => {
    const capitalizeAndStrip = (input: string) => {
      if (input) {
        const updatedInput = input
          .replace(/\S+/g, txt => {
            // uppercase first letter and add rest unchanged
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
          })
          .trim();

        return updatedInput;
      }

      return input;
    };

    if (searchFilter) {
      const response = await firebase
        .firestore()
        .collection('customers')
        .orderBy('name')
        .startAt(capitalizeAndStrip(searchFilter))
        .limit(5)
        .get();

      const allCustomers = response.docs.map(doc =>
        Object.assign(doc.data() as Customer, { id: doc.id }),
      );

      return allCustomers;
    }

    return [];
  };

  const removeCustomer = async (id: string) => {
    try {
      await removeCustomerMutation.mutateAsync(id);

      toast({
        status: 'success',
        title: 'Cliente removido com sucesso',
      });
    } catch {
      toast({
        status: 'error',
        title: 'Erro ao remover cliente',
      });
    }
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
