// src/pages/cortes/listadecortes.tsx
import {
  Box,
  Button,
  Flex,
  HStack,
  RadioGroup,
  Stack,
  Text,
  useBreakpointValue,
  Alert,
} from '@chakra-ui/react';
import {
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import Head from 'next/head';
import Router from 'next/router';
import React, { useState } from 'react';
import {
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { SearchBar } from '../../components/SearchBar';
import dynamic from 'next/dynamic';
// IMPORTAÇÃO DOS COMPONENTES DE IMPRESSÃO (lazy — só baixa quando o usuário imprime)
const Tags = dynamic(
  () => import('../../components/Printables/Tags').then((m) => m.Tags),
  { ssr: false },
);
const OrderResume = dynamic(
  () =>
    import('../../components/Printables/OrderResume').then((m) => m.OrderResume),
  { ssr: false },
);
const EstimateResume = dynamic(
  () =>
    import('../../components/Printables/EstimateResume').then(
      (m) => m.EstimateResume,
    ),
  { ssr: false },
);
// DIÁLOGOS (lazy — só baixam quando abertos)
const HistoryDialog = dynamic(
  () =>
    import('../../components/cortes/HistoryDialog').then(
      (m) => m.HistoryDialog,
    ),
  { ssr: false },
);
const ConfirmStatusDialog = dynamic(
  () =>
    import('../../components/cortes/ConfirmStatusDialog').then(
      (m) => m.ConfirmStatusDialog,
    ),
  { ssr: false },
);
// LISTAS (lazy — só uma das duas é montada por vez, conforme breakpoint)
const OrderListMobile = dynamic(
  () =>
    import('../../components/cortes/OrderListMobile').then(
      (m) => m.OrderListMobile,
    ),
  { ssr: false },
);
const OrderListDesktop = dynamic(
  () =>
    import('../../components/cortes/OrderListDesktop').then(
      (m) => m.OrderListDesktop,
    ),
  { ssr: false },
);
import { toaster } from '@/components/ui/toaster';
import { useAuth } from '../../hooks/authContext';
import { useOrder } from '../../hooks/order';
import { db } from '../../services/firebase';
import { Estimate, Order } from '../../types';

// Definindo tipo para o estado de impressão
type PrintItemType = {
  data: any;
  type: 'order' | 'estimate';
} | null;

const Cortes: React.FC = () => {
  const { user } = useAuth();

  const [ordersFilter, setOrdersFilter] = useState('Em Produção');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<
    (QueryDocumentSnapshot<DocumentData> | null)[]
  >([null]);

  // ESTADO PARA CONTROLAR A IMPRESSÃO DE ETIQUETAS E RESUMOS
  const [printingLabelsOrder, setPrintingLabelsOrder] = useState<Order | null>(
    null,
  );
  const [printingResume, setPrintingResume] = useState<PrintItemType>(null);

  // Pedido cujo histórico de edições está aberto no diálogo
  const [historyOrder, setHistoryOrder] = useState<any | null>(null);

  // Pedido com confirmação de avanço de status pendente
  const [confirmingStatusOrder, setConfirmingStatusOrder] = useState<
    any | null
  >(null);
  const [advancingStatus, setAdvancingStatus] = useState(false);

  const toast = toaster;
  const { getOrders, getOrdersBySearch } = useOrder();
  const router = Router;

  const {
    data: pagedResult,
    isLoading: isInitialLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['orders', ordersFilter, currentPage],
    queryFn: async () => {
      const cursor = pageCursors[currentPage - 1];
      return getOrders(ordersFilter, cursor);
    },
    placeholderData: previousData => previousData,
  });

  // Atualiza os cursores
  React.useEffect(() => {
    if (pagedResult?.lastDoc) {
      setPageCursors(prev => {
        const newCursors = [...prev];
        newCursors[currentPage] = pagedResult.lastDoc;
        return newCursors;
      });
    }
  }, [pagedResult, currentPage]);

  const radioSize = useBreakpointValue(['sm', 'sm', 'md'], { fallback: 'sm' });
  const isMobile = useBreakpointValue(
    { base: true, md: false },
    { fallback: 'base' },
  );

  // --- Ações ---
  const handlePrintLabels = (orderData: any) => {
    setPrintingLabelsOrder(orderData);
  };

  const handlePrintResume = (data: any, type: 'order' | 'estimate') => {
    setPrintingResume({ data, type });
  };

  const approveEstimate = async (id: string) => {
    try {
      const estimateRef = doc(db, 'estimates', id);
      const estimateSnap = await getDoc(estimateRef);
      if (estimateSnap.exists()) {
        const estimateData = {
          ...estimateSnap.data(),
          id: estimateSnap.id,
        } as Estimate & { id: string };
        router.push({
          pathname: '/cortes/novoservico',
          query: {
            orderType: 'estimate',
            cutlist: JSON.stringify(estimateData.cutlist),
            estimateId: estimateData.id,
          },
        });
      }
    } catch (error) {
      toast.create({
        type: 'error',
        description: 'Erro ao carregar orçamento.',
      });
    }
  };

  const updateCutlistStatus = async (id: string) => {
    let nextState;
    setAdvancingStatus(true);
    try {
      const orderRef = doc(db, 'orders', id);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;
      const order = { ...orderSnap.data(), id: orderSnap.id } as Order & {
        id: string;
      };

      switch (order.orderStatus) {
        case 'Em Produção':
          nextState = 'Liberado para Transporte';
          break;
        case 'Liberado para Transporte':
          nextState = 'Concluído';
          break;
        default:
          nextState = null;
          break;
      }

      if (nextState) {
        await updateDoc(orderRef, { orderStatus: nextState });
        refetch();
        toast.create({
          type: 'success',
          description: `Status atualizado para ${nextState}`,
        });
      }
    } catch {
      toast.create({ type: 'error', description: 'Erro ao concluir etapa' });
    } finally {
      setAdvancingStatus(false);
      setConfirmingStatusOrder(null);
    }
  };

  const handleRemove = async (id: string, type: 'orders' | 'estimates') => {
    try {
      const docRef = doc(db, type, id);
      await deleteDoc(docRef);
      refetch();
      toast.create({
        type: 'success',
        description: 'Item excluído com sucesso',
      });
    } catch {
      toast.create({ type: 'error', description: 'Erro ao remover item' });
    }
  };

  // --- Busca ---
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const currentSearchType =
    ordersFilter === 'Orçamento' ? 'estimates' : 'orders';

  const handleSearchOrder = async (search: string) => {
    setSearchQuery(search || undefined);
  };

  const { data: searchData, isLoading: isSearchLoading } = useQuery({
    queryKey: ['orders_search', searchQuery, currentSearchType],
    queryFn: () => getOrdersBySearch(searchQuery, currentSearchType),
    enabled: !!searchQuery,
  });

  React.useEffect(() => {
    if (user === null) router.push('/login');
  }, [user, router]);

  if (!user) return <Loader />;

  const dataToShow =
    searchQuery && searchData ? searchData : pagedResult?.data || [];
  const isEstimateList = ordersFilter === 'Orçamento';
  const isLoading = searchQuery ? isSearchLoading : isInitialLoading;

  const totalCount = pagedResult?.totalCount || 0;
  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const showPagination =
    !searchQuery &&
    (ordersFilter === 'Concluído' || ordersFilter === 'Orçamento') &&
    totalPages > 1;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <>
      <Head>
        <title>Cortes | JRM Compensados</title>
      </Head>

      <Dashboard>
        <Stack gap={6}>
          <Header pageTitle="Lista de Cortes" />

          {/* ÁREA DE COMPONENTES DE IMPRESSÃO (CARREGADOS SOB DEMANDA) */}

          {/* Etiquetas */}
          {printingLabelsOrder && (
            <Tags
              order={printingLabelsOrder}
              onAfterPrint={() => setPrintingLabelsOrder(null)}
            />
          )}

          {/* Resumo de Pedido (montado apenas quando necessário) */}
          {printingResume && printingResume.type === 'order' && (
            <OrderResume
              order={printingResume.data}
              autoPrint={true}
              onAfterPrint={() => setPrintingResume(null)}
            />
          )}

          {/* Resumo de Orçamento (montado apenas quando necessário) */}
          {printingResume && printingResume.type === 'estimate' && (
            <EstimateResume
              estimate={printingResume.data}
              autoPrint={true}
              onAfterPrint={() => setPrintingResume(null)}
            />
          )}

          {/* Diálogo: histórico de edições do pedido (lazy — só monta após primeiro open) */}
          {historyOrder && (
            <HistoryDialog
              order={historyOrder}
              onClose={() => setHistoryOrder(null)}
              onSelectVersion={snap => {
                setHistoryOrder(null);
                handlePrintResume(snap, 'order');
              }}
            />
          )}

          {/* Diálogo: confirmação de avanço de status (lazy — só monta após primeiro open) */}
          {confirmingStatusOrder && (
            <ConfirmStatusDialog
              order={confirmingStatusOrder}
              onCancel={() => setConfirmingStatusOrder(null)}
              onConfirm={updateCutlistStatus}
              loading={advancingStatus}
            />
          )}

          <Flex
            direction={['column', 'column', 'column', 'row']}
            align={['stretch', 'stretch', 'stretch', 'center']}
            justify="space-between"
            gap={4}
            bg="white"
            p={4}
            borderRadius="md"
            shadow="sm"
            borderWidth="1px"
          >
            <Box w={['100%', '100%', '100%', '300px']}>
              <SearchBar
                handleUpdateSearch={handleSearchOrder}
                placeholder={
                  isEstimateList ? 'Buscar Orçamento...' : 'Buscar Pedido...'
                }
                width="100%"
              />
            </Box>

            <Box overflowX="auto" pb={[2, 2, 0]}>
              <RadioGroup.Root
                colorScheme="orange"
                // @ts-ignore
                size={radioSize}
                value={ordersFilter}
                onValueChange={e => {
                  if (e.value) {
                    setOrdersFilter(e.value);
                    setSearchQuery(undefined);
                    setCurrentPage(1);
                    setPageCursors([null]);
                  }
                }}
              >
                <Stack direction="row" gap={4}>
                  {[
                    'Em Produção',
                    'Liberado para Transporte',
                    'Concluído',
                    'Orçamento',
                  ].map(status => (
                    <RadioGroup.Item key={status} value={status}>
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <RadioGroup.ItemText
                        whiteSpace="nowrap"
                        fontWeight="medium"
                      >
                        {status === 'Em Produção' && radioSize === 'sm'
                          ? 'Produção'
                          : status === 'Liberado para Transporte' &&
                              radioSize === 'sm'
                            ? 'Liberados'
                            : status}
                      </RadioGroup.ItemText>
                    </RadioGroup.Item>
                  ))}
                </Stack>
              </RadioGroup.Root>
            </Box>
          </Flex>

          {isError && (
            <Alert.Root status="error" borderRadius="md">
              <Alert.Indicator>
                <FaExclamationTriangle />
              </Alert.Indicator>
              <Alert.Title>Erro ao carregar dados.</Alert.Title>
              <Alert.Description>
                Verifique o Console. {(error as any)?.message}
              </Alert.Description>
            </Alert.Root>
          )}

          {/* LISTA: mobile (cards) ou desktop (tabela), conforme breakpoint */}
          {isMobile ? (
            <OrderListMobile
              items={dataToShow}
              isEstimateList={isEstimateList}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onPrintResume={handlePrintResume}
              onPrintLabels={handlePrintLabels}
              onApproveEstimate={approveEstimate}
              onRemove={handleRemove}
              onShowHistory={setHistoryOrder}
              onConfirmStatus={setConfirmingStatusOrder}
              onEdit={(id) => router.push(`/cortes/editar/${id}`)}
            />
          ) : (
            <OrderListDesktop
              items={dataToShow}
              isEstimateList={isEstimateList}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onPrintResume={handlePrintResume}
              onPrintLabels={handlePrintLabels}
              onApproveEstimate={approveEstimate}
              onRemove={handleRemove}
              onShowHistory={setHistoryOrder}
              onConfirmStatus={setConfirmingStatusOrder}
              onEdit={(id) => router.push(`/cortes/editar/${id}`)}
            />
          )}

          {/* PAGINAÇÃO (compartilhada entre mobile e desktop) */}
          {showPagination && !isLoading && (
            <Flex
              p={[3, 3, 4]}
              justify={['center', 'center', 'flex-end']}
              align="center"
              gap={4}
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              shadow="sm"
              wrap="wrap"
            >
              <Text fontSize="sm" color="gray.500">
                Página {currentPage} de {totalPages}
              </Text>
              <HStack gap={2}>
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="orange"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <FaChevronLeft style={{ marginRight: '6px' }} /> Anterior
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="orange"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={
                    currentPage === totalPages || !pageCursors[currentPage]
                  }
                >
                  Próximo <FaChevronRight style={{ marginLeft: '6px' }} />
                </Button>
              </HStack>
            </Flex>
          )}
        </Stack>
      </Dashboard>
    </>
  );
};

export default Cortes;
