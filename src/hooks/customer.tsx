import { useToast } from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import React, {
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { v4 } from 'uuid';

// 1. Importar as funções modulares do Firestore e a instância 'db'
import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAt,
} from 'firebase/firestore';

import { db } from '../services/firebase'; // Importa a instância do Firestore
import { queryClient } from '../services/queryClient';
import { Customer } from '../types';
import { removeUndefinedAndEmptyFields } from '../utils/removeUndefinedAndEmpty';

interface CustomerContextData {
  createCustomer: (newCustomerData: Customer) => Promise<void>;
  getCustomers: (
    searchFilter: string | undefined
  ) => Promise<(DocumentData & { id: string })[]>;
  removeCustomer: (id: string) => Promise<void>;
}

const CustomerContext = createContext<CustomerContextData>({} as CustomerContextData);

interface CustomerProviderProps {
  children: ReactNode;
}

export const CustomerProvider = ({ children }: CustomerProviderProps) => {
  const toast = useToast();

  // --- MUTATIONS ---

  const createCustomerMutation = useMutation(
    async (customerData: Customer) => {
      // 2. Novo padrão para criar/definir um documento
      const newCustomerRef = doc(db, 'customers', v4()); // Cria a referência do documento
      await setDoc(newCustomerRef, customerData); // Define os dados no documento
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      },
      onError: () => {
        toast({
          status: 'error',
          title: 'Erro ao criar cliente',
          isClosable: true,
          description:
            'Um erro ocorreu durante a criação do cliente.',
          position: 'top-right',
        });
      },
    }
  );

  const removeCustomerMutation = useMutation(
    async (id: string) => {
      // 3. Novo padrão para deletar um documento
      const customerDocRef = doc(db, 'customers', id); // Cria a referência
      await deleteDoc(customerDocRef); // Deleta o documento
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      },
      onError: () => {
        toast({
          status: 'error',
          title: 'Erro ao remover cliente',
          isClosable: true,
          description:
            'Um erro ocorreu durante a remoção do cliente.',
        });
      },
    }
  );

  // --- METHODS ---

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
    // A lógica interna desta função não muda
    const capitalizeAndStrip = (input: string) => {
      if (input) {
        return input
          .replace(/\S+/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
          .trim();
      }
      return input;
    };

    if (searchFilter) {
      const capitalizedFilter = capitalizeAndStrip(searchFilter);

      // 4. Novo padrão para realizar uma consulta (query)
      const customersCollectionRef = collection(db, 'customers'); // Referência da coleção
      const q = query( // Composição da query
        customersCollectionRef,
        orderBy('name'),
        startAt(capitalizedFilter),
        limit(5)
      );

      const querySnapshot = await getDocs(q); // Execução da query

      const allCustomers = querySnapshot.docs.map((document) => ({
        ...(document.data() as Customer),
        id: document.id,
      }));

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

export function useCustomer(): CustomerContextData {
  const context = useContext(CustomerContext);

  if (!context) {
    throw new Error('useCustomer deve ser usado dentro de um CustomerProvider');
  }

  return context;
}
