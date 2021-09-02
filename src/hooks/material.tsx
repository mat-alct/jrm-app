import { useToast } from '@chakra-ui/react';
import firebase from 'firebase/app';
import React, { createContext, useContext, useState } from 'react';
import { useMutation } from 'react-query';
import { v4 } from 'uuid';

import { queryClient } from '../services/queryClient';
import { Material } from '../types';

interface UpdateMaterialPriceProps {
  id: string;
  newPrice: number;
}
interface MaterialContext {
  createMaterial: (newMaterialData: Material) => Promise<void>;
  getMaterials: (
    type: string,
  ) => Promise<(firebase.firestore.DocumentData & { id: string })[]>;
  getAllMaterials: () => Promise<
    (firebase.firestore.DocumentData & { id: string })[]
  >;
  removeMaterial: (id: string) => Promise<void>;
  updateMaterialPrice: (data: UpdateMaterialPriceProps) => Promise<void>;
  materialOptions: { value: string; label: string }[];
}

const MaterialContext = createContext<MaterialContext>({} as MaterialContext);

export const MaterialProvider: React.FC = ({ children }) => {
  const toast = useToast();
  const [materialOptions, setMaterialOptions] = useState<
    { value: string; label: string }[]
  >([]);

  // MUTATIONS

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

  const removeMaterialMutation = useMutation(
    async (id: string) => {
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
    try {
      await createMaterialMutation.mutateAsync(newMaterialData);

      toast({
        status: 'success',
        title: 'Material criado com sucesso',
        isClosable: true,
      });
    } catch {
      toast({
        status: 'error',
        title: 'Erro ao criar material',
        isClosable: true,
        description: 'Um erro ocorreu durante a criação do material',
      });
    }
  };

  const getMaterials = async (type: string) => {
    const response = await firebase
      .firestore()
      .collection('materials')
      .where('materialType', '==', type)
      .get();

    const materials = response.docs.map(doc =>
      Object.assign(doc.data() as Material, { id: doc.id }),
    );

    return materials;
  };

  const getAllMaterials = async () => {
    const response = await firebase.firestore().collection('materials').get();

    const materials = response.docs.map(doc =>
      Object.assign(doc.data() as Material, { id: doc.id }),
    );

    const materialsOptions = materials.map(material => {
      return {
        value: material.id,
        label: material.name,
      };
    });

    setMaterialOptions(materialsOptions);

    return materials;
  };

  const removeMaterial = async (id: string) => {
    try {
      await removeMaterialMutation.mutateAsync(id);

      toast({
        status: 'success',
        title: 'Material removido com sucesso',
        isClosable: true,
      });
    } catch {
      toast({
        status: 'error',
        title: 'Erro ao remover material',
        isClosable: true,
        description: 'Um erro ocorreu durante a remoção do material',
      });
    }
  };

  const updateMaterialPrice = async ({
    id,
    newPrice,
  }: UpdateMaterialPriceProps) => {
    try {
      await updatePriceMutation.mutateAsync({ id, newPrice });

      toast({
        status: 'success',
        title: 'Preço atualizado com sucesso',
        isClosable: true,
      });
    } catch {
      toast({
        status: 'error',
        title: 'Erro ao atualizar preço do material',
        isClosable: true,
        description:
          'Um erro ocorreu durante a atualização do preço do material',
      });
    }
  };

  return (
    <MaterialContext.Provider
      value={{
        createMaterial,
        getMaterials,
        removeMaterial,
        updateMaterialPrice,
        getAllMaterials,
        materialOptions,
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
