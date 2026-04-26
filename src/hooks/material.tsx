'use client';

// --- Bloco de Importações de Bibliotecas Externas ---
// Importa o hook useToast do Chakra UI para exibir notificações.
import { toaster } from '@/components/ui/toaster';
// Importa o hook useMutation do TanStack React Query para lidar com operações de escrita/alteração de dados.
import { useMutation } from '@tanstack/react-query';
// Importa hooks e tipos essenciais do React para criar o contexto e o componente.
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react';
// Importa funções modulares do Firebase v9+ para interagir com o banco de dados Firestore.
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

// --- Bloco de Importações Internas do Projeto ---
// Importa a instância do banco de dados e o cliente do React Query dos seus arquivos de serviço.
import { db } from '../services/firebase';
import { queryClient } from '../services/queryClient';
// Importa o tipo 'Material' que define a estrutura de dados de um material.
import { Material } from '../types';

// --- Definição do Contexto ---

// Define a "interface" ou o "contrato" das funções que este contexto fornecerá aos componentes.
interface MaterialContext {
  createMaterial: (materialData: Material) => Promise<void>;
  getMaterials: (materialFilter: string) => Promise<Material[]>;
  getAllMaterials: () => Promise<Material[]>;
  removeMaterial: (id: string) => Promise<void>;
  updateMaterialPrice: (materialData: {
    id: string;
    newPrice: number;
  }) => Promise<void>;
}
// Cria o Contexto React. O valor inicial é um objeto vazio, pois ele sempre será usado dentro de um Provider.
const MaterialContext = createContext<MaterialContext>({} as MaterialContext);

// --- Componente Provedor (Provider) ---

// Define o tipo das props para o nosso provedor, garantindo que ele aceite componentes filhos.
interface MaterialProviderProps {
  children: ReactNode;
}

// Este é o componente que irá "abraçar" partes da sua aplicação para fornecer as funções de manipulação de materiais.
export const MaterialProvider = ({ children }: MaterialProviderProps) => {
  // Hook do Chakra UI para exibir notificações (toasts) de sucesso ou erro.
  const toast = toaster;

  // --- Bloco de Mutações (Operações de Escrita) ---

  // 'useMutation' para CRIAR um novo material.
  const createMaterialMutation = useMutation({
    // 'mutationFn' é a função assíncrona que executa a tarefa principal: adicionar um documento no Firestore.
    mutationFn: async (materialData: Material) => {
      const materialsCollection = collection(db, 'materials');
      await addDoc(materialsCollection, materialData);
    },
    // 'onSuccess' é chamado automaticamente se a 'mutationFn' for bem-sucedida.
    onSuccess: () => {
      // Invalida o cache da query 'materials', forçando o React Query a buscar os dados novamente na próxima vez.
      // Isso mantém a lista de materiais na tela sempre atualizada.
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    // 'onError' é chamado automaticamente se a 'mutationFn' falhar.
    onError: () => {
      toast.create({
        type: 'error',
        title: 'Erro ao criar material',
      });
    },
  });

  // 'useMutation' para REMOVER um material.
  const removeMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
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

  // 'useMutation' para ATUALIZAR o preço de um material.
  const updateMaterialPriceMutation = useMutation({
    mutationFn: async ({ id, newPrice }: { id: string; newPrice: number }) => {
      const materialRef = doc(db, 'materials', id);
      // Atualiza apenas os campos 'price' e 'updatedAt' do documento.
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

  // --- Bloco de Funções Expostas pelo Contexto ---

  // Estabilizando referências dos mutateAsync para useCallback abaixo.
  const { mutateAsync: createMaterialAsync } = createMaterialMutation;
  const { mutateAsync: removeMaterialAsync } = removeMaterialMutation;
  const { mutateAsync: updateMaterialPriceAsync } = updateMaterialPriceMutation;

  const createMaterial = useCallback(
    async (materialData: Material) => {
      await createMaterialAsync(materialData);
    },
    [createMaterialAsync],
  );

  const removeMaterial = useCallback(
    async (id: string) => {
      await removeMaterialAsync(id);
    },
    [removeMaterialAsync],
  );

  const updateMaterialPrice = useCallback(
    async (materialData: { id: string; newPrice: number }) => {
      await updateMaterialPriceAsync(materialData);
    },
    [updateMaterialPriceAsync],
  );

  // --- Bloco de Funções de Busca de Dados ---

  const getMaterials = useCallback(async (materialFilter: string) => {
    const materialsCollection = collection(db, 'materials');
    const q = query(
      materialsCollection,
      where('materialType', '==', materialFilter),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      d => ({ ...d.data(), id: d.id }) as unknown as Material,
    );
  }, []);

  const getAllMaterials = useCallback(async (): Promise<Material[]> => {
    const materialsCollection = collection(db, 'materials');
    const querySnapshot = await getDocs(materialsCollection);
    return querySnapshot.docs.map(
      doc => ({ ...doc.data(), id: doc.id }) as Material,
    );
  }, []);

  const value = useMemo<MaterialContext>(
    () => ({
      createMaterial,
      getMaterials,
      getAllMaterials,
      removeMaterial,
      updateMaterialPrice,
    }),
    [
      createMaterial,
      getMaterials,
      getAllMaterials,
      removeMaterial,
      updateMaterialPrice,
    ],
  );

  return (
    <MaterialContext.Provider value={value}>
      {children}
    </MaterialContext.Provider>
  );
};

// --- Hook de Acesso ao Contexto ---
// Este hook customizado simplifica o uso do contexto nos componentes.
// Em vez de importar 'useContext' e 'MaterialContext' em todo lugar,
// os componentes podem simplesmente chamar 'useMaterial()'.
export const useMaterial = () => useContext(MaterialContext);
