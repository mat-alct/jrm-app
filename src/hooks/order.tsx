import { toaster } from '@/components/ui/toaster';
import { useMutation } from '@tanstack/react-query';
import { v4 } from 'uuid';
import React, { createContext, ReactNode, useContext } from 'react';

// Importações do Firebase Modular
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  getCountFromServer, // Novo: Para contar total de itens
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '../services/firebase';
import { queryClient } from '../services/queryClient';
import { Estimate, Order } from '../types';
import { removeUndefinedAndEmptyFields } from '../utils/removeUndefinedAndEmpty';

// Interface atualizada para paginação numerada
export interface PagedResult {
  data: (DocumentData & { id: string })[];
  totalCount: number; // Total de itens para calcular páginas
  currentPage: number;
}

interface OrderContext {
  createEstimate: (estimateData: Estimate) => Promise<void>;
  createOrder: (orderData: Order) => Promise<void>;
  // Agora aceita 'page' (número) em vez de cursor
  getOrders: (orderFilter: string, page: number) => Promise<PagedResult>;
  getOrdersBySearch: (
    searchFilter: number | undefined,
    type: string,
  ) => Promise<(DocumentData & { id: string })[]>;
}

interface OrderPropsWithOrderCode extends Order {
  orderCode: number;
  orderPrice: number;
}

interface EstimatePropsWithEstimateCode extends Estimate {
  estimateCode: number;
  estimatePrice: number;
}

const OrderContext = createContext<OrderContext>({} as OrderContext);

type OrderProviderProps = {
  children: ReactNode;
};

export const OrderProvider = ({ children }: OrderProviderProps) => {
  const toast = toaster;

  // --- MUTATIONS ---
  const createEstimateMutation = useMutation({
    mutationFn: async (estimateData: EstimatePropsWithEstimateCode) => {
      const estimateRef = doc(db, 'estimates', v4());
      await setDoc(estimateRef, estimateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: OrderPropsWithOrderCode) => {
      const orderRef = doc(db, 'orders', v4());
      await setDoc(orderRef, orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // --- METHODS ---
  const createEstimate = async (estimateData: Estimate) => {
    try {
      removeUndefinedAndEmptyFields(estimateData);
      const counterRef = doc(db, 'counters', 'estimates');
      const counterSnap = await getDoc(counterRef);
      const estimateCode = counterSnap.exists() ? counterSnap.data()?.code : 1;
      const estimatePrice = estimateData.cutlist.reduce(
        (prev, curr) => prev + curr.price,
        0,
      );

      await createEstimateMutation.mutateAsync({
        ...estimateData,
        estimateCode,
        estimatePrice,
      });

      if (counterSnap.exists()) {
        await updateDoc(counterRef, { code: increment(1) });
      } else {
        await setDoc(counterRef, { code: 2 });
      }
      toast.create({
        type: 'success',
        description: 'Orçamento criado com sucesso',
      });
    } catch (err) {
      console.error('Erro ao criar orçamento:', err);
      toast.create({ type: 'error', description: 'Erro ao criar orçamento.' });
      throw err;
    }
  };

  const createOrder = async (orderData: Order) => {
    try {
      removeUndefinedAndEmptyFields(orderData);
      if (orderData.customer) removeUndefinedAndEmptyFields(orderData.customer);

      const counterRef = doc(db, 'counters', 'orders');
      const counterSnap = await getDoc(counterRef);
      const orderCode = counterSnap.exists() ? counterSnap.data()?.code : 1;
      const orderPrice = orderData.cutlist.reduce(
        (prev, curr) => prev + curr.price,
        0,
      );

      await createOrderMutation.mutateAsync({
        ...orderData,
        orderCode,
        orderPrice,
      });

      if (counterSnap.exists()) {
        await updateDoc(counterRef, { code: increment(1) });
      } else {
        await setDoc(counterRef, { code: 2 });
      }
      toast.create({
        type: 'success',
        description: 'Pedido criado com sucesso',
      });
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
      toast.create({ type: 'error', description: 'Erro ao criar pedido.' });
      throw err;
    }
  };

  // --- BUSCA COM PAGINAÇÃO NUMERADA ---
  const getOrders = async (
    orderFilter: string,
    page: number,
  ): Promise<PagedResult> => {
    // Regra: Paginação apenas para 'Concluído' e 'Orçamento'
    const isPaginationRequired =
      orderFilter === 'Concluído' || orderFilter === 'Orçamento';
    const limitSize = 20;

    // Se não tiver paginação, a página é sempre 1 e traz tudo (mas vamos manter a estrutura)
    // Na prática, se for Produção/Transporte, vamos ignorar o limit no query final, mas buscar tudo

    let baseQuery;
    let dataQuery;
    let totalCount = 0;

    const collectionName = orderFilter === 'Orçamento' ? 'estimates' : 'orders';
    const colRef = collection(db, collectionName);

    // 1. Montar Query Base (Filtros)
    let constraints: any[] = [];

    if (orderFilter === 'Orçamento') {
      // Orçamentos não tem campo status, busca tudo ordenado
      constraints.push(orderBy('estimateCode', 'desc'));
    } else {
      // Pedidos tem filtro de status
      constraints.push(where('orderStatus', '==', orderFilter));
      constraints.push(orderBy('orderCode', 'desc'));
    }

    // 2. Contar Total (Necessário para saber número de páginas)
    // Criamos uma query apenas com os filtros (sem limites) para contar
    const countQ = query(
      colRef,
      ...constraints.filter(c => c.type !== 'orderBy'),
    );
    // Nota: orderBy as vezes atrapalha o count se não tiver indice, mas where é essencial
    // Na verdade, para count, orderBy não importa.

    // Filtros para count (remover orderBy para economizar/evitar erros de index no count se possivel)
    let countConstraints = [...constraints].filter(c => c.type === 'where');
    const qForCount = query(colRef, ...countConstraints);

    const snapshotCount = await getCountFromServer(qForCount);
    totalCount = snapshotCount.data().count;

    // 3. Buscar Dados da Página
    if (isPaginationRequired) {
      // Pular os itens das páginas anteriores
      // Ex: Página 1 (skip 0), Página 2 (skip 20)
      // Nota: 'offset' não existe nativamente no client SDK Web v9 em todas as versões de forma simples com query(),
      // mas podemos simular pegando todos ou usando lógica de cursor se fosse sequencial.
      // PORÉM, para pular para página 3 direto, o ideal é carregar tudo ou usar uma lógica de index.
      // DADO O VOLUME (Casa do Marceneiro), vamos usar a estratégia de carregar TODOS os IDs e filtrar no cliente?
      // NÃO, vamos tentar fazer o fetch correto.
      // O Firestore Client SDK não tem 'offset' eficiente, mas vamos usar a lógica de "Carregar até chegar lá" ou assumir que o usuário navega sequencialmente?
      // O usuário pediu "Pagina 1, 2, 3".
      // Vamos usar a abordagem de: Buscar todos os documentos LIMITADOS se for pouco, ou usar startAfter se tivermos o cursor.
      // SOLUÇÃO ROBUSTA PARA PAGINAÇÃO NUMERADA NO FIRESTORE (SEM OFFSET):
      // Infelizmente o Firestore não suporta "Pule 500 registros" nativamente de forma barata.
      // Mas suporta "limit".
      // VAMOS SIMPLIFICAR: Como provavelmente não são milhões de registros,
      // para ir para página 3, infelizmente a melhor UX sem cursor prévio é carregar mais dados ou ter os cursors em cache.
      // TRUQUE DO USUÁRIO: O usuário quer ver "30 ao 21" (Pag 1).
      // Isso é orderBy desc.
      // Se a página for > 1, precisamos do último doc da página anterior.
      // Como não temos isso fácil clicando no "3", vamos fazer o seguinte:
      // Vamos carregar a query completa (sem limit) apenas dos IDs ou dados leves? Não.
      // MUDANÇA DE ESTRATÉGIA: Vamos usar o CLIENT-SIDE pagination para filtros pequenos (Produção/Transporte)
      // e SERVER-SIDE simulado para Concluídos.
      // Se o usuário quer paginação estrita, o ideal é usar `getDocs` e filtrar na memória se for < 500 itens.
      // Se for > 500, precisamos de cursor.
      // VOU USAR A ESTRATÉGIA DE CURSOR SALVO NO COMPONENTE? Não, o hook deve ser stateless.
      // VAMOS TENTAR FAZER SEM OFFSET (Pois pode não escalar), mas vou usar o índice do array se trouxermos tudo.
      // ESPERA! O usuário disse "independente de quantos" para Produção. E "apenas 20" para Concluídos.
      // Se for Concluído (pode ter milhares):
      // Infelizmente, sem offset, "Ir para página 5" é difícil.
      // Mas vou assumir que você navegará sequencialmente ou usarei a técnica de carregar X documentos.
      // ATUALIZAÇÃO: Para atender exatamente o pedido (botões 1, 2, 3), vou implementar a paginação recuperando
      // os dados com `limit(page * 20)` e pegando o final? Isso gasta muita leitura.
      // VOU USAR O `limit` e `startAfter` com o cursor sendo passado?
      // Não, a interface pede `page: number`.
      // VAMOS USAR UMA ABORDAGEM HÍBRIDA EFICIENTE:
      // Como não temos `offset` no SDK web client padrão (ele existe no Admin SDK ou Node),
      // a paginação numerada exata é complexa.
      // MAS, vou usar a lógica de buscar TUDO para esses status específicos se não forem muitos,
      // OU, se forem muitos, implemento apenas Next/Prev.
      // REVISÃO: O usuário pediu "Pagina 1, Pagina 2".
      // Vou buscar TODOS os documentos (apenas metadados se possível, mas aqui buscarei tudo)
      // e realizar o slice no Javascript para garantir a UX perfeita que ele pediu.
      // O custo de leitura será = Total de documentos do status.
      // Se tiver 1000 pedidos concluídos, lerá 1000. É aceitável para um app administrativo pequeno.
      // Se Produção/Transporte => Traz tudo.
      // Se Concluído/Orçamento => Traz tudo e corta no array?
      // O usuário disse: "Apenas 20 concluídos por página". Isso implica em economia de dados?
      // Se for para economizar dados, tem que ser Next/Prev.
      // Se for para ter UX de números (1, 2, 3), tem que ler tudo ou ter cache de cursores.
      // DECISÃO: Vou fazer a paginação no FRONT-END (Buscando tudo do Firestore) para garantir a ordenação e numeração exatas.
      // É a única forma de garantir "Ir para página 10" sem complexidade extrema de cursores.
      // Se ficar lento no futuro, migramos para cursor.
      // ATENÇÃO: O `limitSize` será aplicado no array final, não no banco.
      // EXCETO se for muitos dados, aí travamos.
      // NOVA ABORDAGEM: Query Server-Side com Cursor é melhor.
      // Mas como passar página 3?
      // Vou manter a interface de paginação Next/Prev visualmente adaptada.
      // Mas o usuário pediu "Pagina 1, 2, 3".
      // VOU FAZER O SEGUINTE:
      // Para "Concluído" e "Orçamento":
      // Vou buscar APENAS os 20 itens corretos se tivermos o cursor.
      // Como não temos, vou buscar tudo e paginar no cliente. É o mais seguro para garantir a ordem "30 ao 21".
      // ESPERA, se eu buscar tudo, eu gasto leitura.
      // O "offset" existe no Firestore SDK mais novo?
      // Não oficialmente de forma barata.
      // VAMOS VOLTAR AO BÁSICO:
      // Vou usar `limit` no server.
      // Se página = 1, limit(20).
      // Se página = 2, precisamos pular 20.
      // Vou fazer um loop de query interno se page > 1? Não, muito lento.
      // SOLUÇÃO FINAL PARA O HOOK:
      // Vou usar a paginação no Cliente (Client-Side Pagination) para garantir o comportamento exato.
      // O Firestore vai trazer "Todos os documentos desse status".
      // O Hook vai retornar `data.slice(...)`.
      // PONTOS POSITIVOS: Ordenação perfeita (30->21), Numeração fácil.
      // PONTOS NEGATIVOS: Lê todos os docs. (Aceitável para < 2000 docs).
      // Vamos lá.
    }

    const snapshot = await getDocs(query(colRef, ...constraints));

    // Mapeia tudo
    const allData = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

    // Aplica a paginação no array (slice) se necessário
    let paginatedData = allData;

    if (isPaginationRequired) {
      const startIndex = (page - 1) * limitSize;
      const endIndex = startIndex + limitSize;
      paginatedData = allData.slice(startIndex, endIndex);
    }

    return {
      data: paginatedData,
      totalCount: allData.length, // Total real vindo do banco
      currentPage: page,
    };
  };

  const getOrdersBySearch = async (
    searchFilter: number | undefined,
    type: string,
  ) => {
    if (searchFilter) {
      const colRef = collection(db, type);
      const fieldCode = type === 'estimates' ? 'estimateCode' : 'orderCode';

      const q = query(colRef, where(fieldCode, '==', searchFilter), limit(1));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    }
    return [];
  };

  return (
    <OrderContext.Provider
      value={{ createEstimate, createOrder, getOrders, getOrdersBySearch }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export function useOrder(): OrderContext {
  const context = useContext(OrderContext);
  if (!context)
    throw new Error('useOrder must be used within an OrderProvider');
  return context;
}
