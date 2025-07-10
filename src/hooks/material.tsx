'use client';

// --- 1. Bloco de Importações Atualizado ---
import { toaster } from '@/components/ui/toaster';
// A importação foi atualizada para a nova biblioteca @tanstack/react-query
import { useMutation } from '@tanstack/react-query';
import React, { createContext, ReactNode, useContext } from 'react';

// Importações modulares do Firebase v9+ para interagir com o Firestore
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

// Importação da instância do banco de dados e do queryClient
import { db } from '../services/firebase';
import { queryClient } from '../services/queryClient';
import { Material } from '../types';

// --- Interfaces e Contexto (sem grandes mudanças) ---
interface MaterialContext {
  createMaterial: (materialData: Material) => Promise<void>;
  getMaterials: (materialFilter: string) => Promise<Material[]>;
  getAllMaterials: () => Promise<{ value: string; label: string }[]>;
  removeMaterial: (id: string) => Promise<void>;
  updateMaterialPrice: (materialData: {
    id: string;
    newPrice: number;
  }) => Promise<void>;
}
const MaterialContext = createContext<MaterialContext>({} as MaterialContext);

// --- 2. Provider com Tipagem e Lógica Atualizadas ---
// A tipagem do Provider foi simplificada, removendo React.FC
interface MaterialProviderProps {
  children: ReactNode;
}

export const MaterialProvider = ({ children }: MaterialProviderProps) => {
  const toast = toaster;

  // --- MUTATIONS ATUALIZADAS PARA A NOVA SINTAXE ---

  // 3. Sintaxe do useMutation e invalidateQueries atualizada
  const createMaterialMutation = useMutation({
    mutationFn: async (materialData: Material) => {
      // Nova API para adicionar um documento a uma coleção
      const materialsCollection = collection(db, 'materials');
      await addDoc(materialsCollection, materialData);
    },
    onSuccess: () => {
      // Nova API para invalidar queries
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: () => {
      toast.create({
        type: 'error',
        title: 'Erro ao criar material',
      });
    },
  });

  const removeMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      // Nova API para referenciar e deletar um documento
      const materialRef = doc(db, 'materials', id);
      await deleteDoc(materialRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: () => {
      toast.create({
        type: 'error',
        title: 'Erro ao remover material',
      });
    },
  });

  const updateMaterialPriceMutation = useMutation({
    mutationFn: async ({ id, newPrice }: { id: string; newPrice: number }) => {
      // Nova API para atualizar um documento
      const materialRef = doc(db, 'materials', id);
      await updateDoc(materialRef, {
        price: newPrice,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: () => {
      toast.create({
        type: 'error',
        title: 'Erro ao atualizar preço',
      });
    },
  });

  // --- FUNÇÕES DO CONTEXTO (agora usam as mutations) ---

  const createMaterial = async (materialData: Material) => {
    await createMaterialMutation.mutateAsync(materialData);
  };

  const removeMaterial = async (id: string) => {
    await removeMaterialMutation.mutateAsync(id);
  };

  const updateMaterialPrice = async (materialData: {
    id: string;
    newPrice: number;
  }) => {
    await updateMaterialPriceMutation.mutateAsync(materialData);
  };

  // --- FUNÇÕES DE BUSCA (Adaptadas para o Firebase v9+) ---

  const getMaterials = async (materialFilter: string) => {
    // Nova API para criar uma query com filtro 'where'
    const materialsCollection = collection(db, 'materials');
    const q = query(
      materialsCollection,
      where('materialType', '==', materialFilter),
    );
    const querySnapshot = await getDocs(q);
    const materials = querySnapshot.docs.map(
      doc => ({ ...doc.data(), id: doc.id }) as unknown as Material,
    );
    return materials;
  };

  const getAllMaterials = async () => {
    // Nova API para buscar todos os documentos de uma coleção
    const materialsCollection = collection(db, 'materials');
    const querySnapshot = await getDocs(materialsCollection);
    const materialOptions = querySnapshot.docs.map(doc => ({
      value: doc.id,
      label: doc.data().name,
    }));
    return materialOptions;
  };

  // Fornece as funções para os componentes filhos
  return (
    <MaterialContext.Provider
      value={{
        createMaterial,
        getMaterials,
        getAllMaterials,
        removeMaterial,
        updateMaterialPrice,
      }}
    >
      {children}
    </MaterialContext.Provider>
  );
};

// --- Hook de Acesso (sem mudanças) ---
export const useMaterial = () => useContext(MaterialContext);
