import { useToast } from '@chakra-ui/react';
import firebase from 'firebase/app';
import React, { createContext, useContext } from 'react';
import { useMutation } from 'react-query';
import { v4 } from 'uuid';

import { queryClient } from '../services/queryClient';
import { Material } from '../types';

interface UpdateMaterialPriceProps {
  id: string;
  newPrice: number;
}

interface MaterialInterfaceProps {
  id: string;
  name: string;
  width: number;
  height: number;
  price: string;
}

interface MaterialContext {
  createMaterial: (newMaterialData: Material) => Promise<void>;
  getMaterials: () => Promise<MaterialInterfaceProps[]>;
  removeMaterial: (id: string) => Promise<void>;
  updateMaterialPrice: (data: UpdateMaterialPriceProps) => Promise<void>;
}

const MaterialContext = createContext<MaterialContext>({} as MaterialContext);

export const MaterialProvider: React.FC = ({ children }) => {
  const toast = useToast();

  // MUTATIONS

  const createMaterialMutation = useMutation(
    async (materialData: Material) => {
      const id = v4();

      await firebase
        .firestore()
        .collection('materials')
        .doc(id)
        .set({ ...materialData });

      try {
        const interfaceData = await firebase
          .firestore()
          .collection('interfaces')
          .doc('materials')
          .get();

        await firebase
          .firestore()
          .collection('interfaces')
          .doc('materials')
          .update({
            materials: [
              ...interfaceData.data()?.materials,
              {
                id,
                name: materialData.name,
                width: materialData.width,
                height: materialData.height,
                price: materialData.price,
              },
            ],
          });
      } catch {
        await firebase.firestore().collection('materials').doc(id).delete();
      }
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

  const removeMaterialMutation = useMutation(
    async (id: string) => {
      // Remove Material from interface
      const interfaceData = await firebase
        .firestore()
        .collection('interfaces')
        .doc('materials')
        .get();

      const interfaceFiltered = interfaceData
        .data()
        ?.materials.filter(
          (material: MaterialInterfaceProps) => material.id !== id,
        );

      await firebase
        .firestore()
        .collection('interfaces')
        .doc('materials')
        .update({
          materials: [...interfaceFiltered],
        });

      // Remove Material from materials collection
      await firebase.firestore().collection('materials').doc(id).delete();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('materials');
      },
      onError: () => {
        toast({
          status: 'error',
          title: 'Erro ao remover material',
          isClosable: true,
          description:
            'Um erro ocorreu durante a remoção do material pelo React Query',
        });
      },
    },
  );

  const updatePriceMutation = useMutation(
    async ({ id, newPrice }: UpdateMaterialPriceProps) => {
      await firebase
        .firestore()
        .collection('materials')
        .doc(id)
        .update({ price: newPrice });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('materials');
      },
      onError: () => {
        toast({
          status: 'error',
          title: 'Erro ao atualizar o preço do material',
          isClosable: true,
          description:
            'Um erro ocorreu durante a atualização do preço do material pelo React Query',
        });
      },
    },
  );

  // METHODS

  const createMaterial = async (newMaterialData: Material) => {
    await createMaterialMutation.mutateAsync(newMaterialData);
  };

  const getMaterials = async () => {
    const response = await firebase
      .firestore()
      .collection('interfaces')
      .doc('materials')
      .get();

    const allMaterials: MaterialInterfaceProps[] = response.data()?.materials;

    return allMaterials;
  };

  const removeMaterial = async (id: string) => {
    await removeMaterialMutation.mutateAsync(id);
  };

  const updateMaterialPrice = async ({
    id,
    newPrice,
  }: UpdateMaterialPriceProps) => {
    await updatePriceMutation.mutateAsync({ id, newPrice });
  };

  return (
    <MaterialContext.Provider
      value={{
        createMaterial,
        getMaterials,
        removeMaterial,
        updateMaterialPrice,
      }}
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
