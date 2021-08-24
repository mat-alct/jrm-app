import { useToast } from '@chakra-ui/react';
import firebase from 'firebase/app';
import React, { createContext, useContext } from 'react';
import { useMutation } from 'react-query';
import { v4 } from 'uuid';

import { queryClient } from '../services/queryClient';
import { Material } from '../types';

interface MaterialContext {
  createMaterial: (newMaterialData: Material) => Promise<void>;
  getMaterials: () => Promise<
    (firebase.firestore.DocumentData & { id: string })[]
  >;
  removeMaterial: (id: string) => Promise<void>;
}

const MaterialContext = createContext<MaterialContext>({} as MaterialContext);

export const MaterialProvider: React.FC = ({ children }) => {
  const toast = useToast();

  const createMaterialMutation = useMutation(
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
    await createMaterialMutation.mutateAsync(newMaterialData);
  };

  const getMaterials = async () => {
    const response = await firebase.firestore().collection('materials').get();

    const allMaterials = response.docs.map(doc =>
      Object.assign(doc.data(), { id: doc.id }),
    );

    return allMaterials;
  };

  const removeMaterial = async (id: string) => {
    await firebase.firestore().collection('materials').doc(id).delete();
  };

  return (
    <MaterialContext.Provider
      value={{ createMaterial, getMaterials, removeMaterial }}
    >
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
