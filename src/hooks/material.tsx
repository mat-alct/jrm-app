import { useToast } from '@chakra-ui/react';
import firebase from 'firebase/app';
import React, { createContext, useContext } from 'react';
import { useMutation } from 'react-query';
import { v4 } from 'uuid';

import { queryClient } from '../services/queryClient';
import { Material } from '../types';

interface MaterialContext {
  createMaterial: (newMaterialData: Material) => Promise<void>;
}

const MaterialContext = createContext<MaterialContext>({} as MaterialContext);

export const MaterialProvider: React.FC = ({ children }) => {
  const toast = useToast();

  const createUserMutation = useMutation(
    async (materialData: Material) => {
      await firebase
        .firestore()
        .collection('materials')
        .doc(v4())
        .set(materialData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('materials');
      },
      onError: () => {
        toast({
          status: 'error',
          title: 'Erro ao criar material',
          isClosable: true,
          description:
            'Um erro ocorreu durante a criação do material pelo React Query',
          position: 'top-right',
        });
      },
    },
  );

  const createMaterial = async (newMaterialData: Material) => {
    await createUserMutation.mutateAsync(newMaterialData);
  };

  return (
    <MaterialContext.Provider value={{ createMaterial }}>
      {children}
    </MaterialContext.Provider>
  );
};

export function useMaterial(): MaterialContext {
  const context = useContext(MaterialContext);

  if (!context) {
    throw new Error('useMaterial must be used within an AuthProvider');
  }

  return context;
}
