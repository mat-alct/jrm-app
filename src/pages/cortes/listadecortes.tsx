// src/pages/cortes/listadecortes.tsx
import {
  Alert,
  Box,
  Button,
  Flex,
  HStack,
  RadioGroup,
  Stack,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import {
  doc,
  DocumentData,
  getDoc,
  QueryDocumentSnapshot,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Router from 'next/router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
} from 'react-icons/fa';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { SearchBar } from '../../components/SearchBar';
// IMPORTAÇÃO DOS COMPONENTES DE IMPRESSÃO (lazy — só baixa quando o usuário imprime)
const Tags = dynamic(
  () => import('../../components/Printables/Tags').then(m => m.Tags),
  { ssr: false },
);
const CuttingPlanPrint = dynamic(
  () =>
    import('../../components/Printables/CuttingPlanPrint').then(
      m => m.CuttingPlanPrint,
    ),
  { ssr: false },
);
const OrderResume = dynamic(
  () =>
    import('../../components/Printables/OrderResume').then(m => m.OrderResume),
  { ssr: false },
);
const EstimateResume = dynamic(
  () =>
    import('../../components/Printables/EstimateResume').then(
      m => m.EstimateResume,
    ),
  { ssr: false },
);
// DIÁLOGOS (lazy — só baixam quando abertos)
const HistoryDialog = dynamic(
  () =>
    import('../../components/cortes/HistoryDialog').then(m => m.HistoryDialog),
  { ssr: false },
);
const ConfirmStatusDialog = dynamic(
  () =>
    import('../../components/cortes/ConfirmStatusDialog').then(
      m => m.ConfirmStatusDialog,
    ),
  { ssr: false },
);
const ConfirmDeactivateDialog = dynamic(
  () =>
    import('../../components/cortes/ConfirmDeactivateDialog').then(
      m => m.ConfirmDeactivateDialog,
    ),
  { ssr: false },
);
// LISTAS (lazy — só uma das duas é montada por vez, conforme breakpoint)
const OrderListMobile = dynamic(
  () =>
    import('../../components/cortes/OrderListMobile').then(
      m => m.OrderListMobile,
    ),
  { ssr: false },
);
const OrderListDesktop = dynamic(
  () =>
    import('../../components/cortes/OrderListDesktop').then(
      m => m.OrderListDesktop,
    ),
  { ssr: false },
);
import { toaster } from '@/components/ui/toaster';
import {
  downloadGibenZip,
  exportCuttingPlanToGiben,
} from '@/domain/cutting-plan';
import {
  CUTTING_MACHINE_QUERY_KEY,
  getCuttingMachineConfiguration,
} from '@/services/cuttingMachine.service';

import { useAuth } from '../../hooks/authContext';
import { useOrder } from '../../hooks/order';
import { db } from '../../services/firebase';
import { queryClient } from '../../services/queryClient';
import { EstimateDocument, OrderDocument, OrderListItem } from '../../types';

// Definindo tipo para o estado de impressão
type PrintItemType =
  | { data: OrderDocument; type: 'order' }
  | { data: EstimateDocument; type: 'estimate' }
  | null;

const Cortes: React.FC = () => {
  const { user } = useAuth();

  const [ordersFilter, setOrdersFilter] = useState('Em Produção');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<
    (QueryDocumentSnapshot<DocumentData> | null)[]
  >([null]);

  // ESTADO PARA CONTROLAR A IMPRESSÃO DE ETIQUETAS E RESUMOS
  const [printingLabelsOrder, setPrintingLabelsOrder] =
    useState<OrderDocument | null>(null);
  const [printingResume, setPrintingResume] = useState<PrintItemType>(null);
  const [printingPlanOrder, setPrintingPlanOrder] =
    useState<OrderDocument | null>(null);

  // Pedido cujo histórico de edições está aberto no diálogo
  const [historyOrder, setHistoryOrder] = useState<OrderDocument | null>(null);

  // Pedido com confirmação de avanço de status pendente
  const [confirmingStatusOrder, setConfirmingStatusOrder] =
    useState<OrderDocument | null>(null);
  const [advancingStatus, setAdvancingStatus] = useState(false);

  // Pedido com confirmação de desativação pendente
  const [deactivatingOrder, setDeactivatingOrder] =
    useState<OrderDocument | null>(null);
  const [deactivatingLoading, setDeactivatingLoading] = useState(false);

  const toast = toaster;
  const { getOrders, getOrdersBySearch } = useOrder();
  const router = Router;

  const { data: machineConfiguration } = useQuery({
    queryKey: CUTTING_MACHINE_QUERY_KEY,
    queryFn: getCuttingMachineConfiguration,
  });

  const {
    data: pagedResult,
    isLoading: isInitialLoading,
    isError,
    error,
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

  const radioSize =
    useBreakpointValue<'sm' | 'md'>(['sm', 'sm', 'md'], {
      fallback: 'sm',
    }) ?? 'sm';
  const isMobile = useBreakpointValue(
    { base: true, md: false },
    { fallback: 'base' },
  );

  // --- Ações ---
  // Handlers em useCallback: refs estáveis garantem que cards/rows memoizados
  // não re-renderizem quando o pai atualiza (ex: abrir um Dialog).
  const handlePrintLabels = useCallback((orderData: OrderDocument) => {
    setPrintingLabelsOrder(orderData);
  }, []);

  const handlePrintCuttingPlan = useCallback((orderData: OrderDocument) => {
    setPrintingPlanOrder(orderData);
  }, []);

  const handleDownloadMachineFiles = useCallback(
    async (orderData: OrderDocument) => {
      if (!machineConfiguration || !orderData.cuttingPlan) {
        toast.create({
          type: 'error',
          description: 'Plano ou parâmetros da máquina indisponíveis.',
        });
        return;
      }
      try {
        const orderIdentifier = String(orderData.orderCode ?? orderData.id);
        const result = exportCuttingPlanToGiben(orderData.cuttingPlan, {
          orderId: orderIdentifier,
          customerName: orderData.customer?.name ?? 'CLIENTE',
          operatorName:
            user?.displayName ?? user?.email ?? orderData.seller ?? 'OPERADOR',
          generatedAt: new Date(),
          profile: machineConfiguration.exportProfile,
        });
        await downloadGibenZip(result, `${orderIdentifier}-arquivos-giben.zip`);
        toast.create({
          type: 'success',
          description: `${result.pairs.length} par(es) AC/AD gerado(s). Valide na máquina antes de cortar.`,
        });
      } catch (downloadError) {
        toast.create({
          type: 'error',
          description:
            downloadError instanceof Error
              ? downloadError.message
              : 'Não foi possível gerar os arquivos da máquina.',
        });
      }
    },
    [machineConfiguration, toast, user],
  );

  const handlePrintResume = useCallback(
    (data: OrderListItem, type: 'order' | 'estimate') => {
      if (type === 'order' && 'orderCode' in data) {
        setPrintingResume({ data, type });
      } else if (type === 'estimate' && 'estimateCode' in data) {
        setPrintingResume({ data, type });
      }
    },
    [],
  );

  const approveEstimate = useCallback(
    async (id: string) => {
      try {
        const estimateRef = doc(db, 'estimates', id);
        const estimateSnap = await getDoc(estimateRef);
        if (estimateSnap.exists()) {
          const estimateData = {
            ...estimateSnap.data(),
            id: estimateSnap.id,
          } as EstimateDocument;
          void router.push({
            pathname: '/cortes/novoservico',
            query: {
              orderType: 'estimate',
              cutlist: JSON.stringify(estimateData.cutlist),
              estimateId: estimateData.id,
              ...(estimateData.area ? { area: estimateData.area } : {}),
            },
          });
        }
      } catch {
        toast.create({
          type: 'error',
          description: 'Erro ao carregar orçamento.',
        });
      }
    },
    [router, toast],
  );

  const updateCutlistStatus = useCallback(
    async (id: string) => {
      let nextState;
      setAdvancingStatus(true);
      try {
        const orderRef = doc(db, 'orders', id);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) return;
        const order = {
          ...orderSnap.data(),
          id: orderSnap.id,
        } as OrderDocument;

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
          const now = Timestamp.fromDate(new Date());
          await updateDoc(
            orderRef,
            nextState === 'Liberado para Transporte'
              ? { orderStatus: nextState, updatedAt: now, releasedAt: now }
              : { orderStatus: nextState, updatedAt: now },
          );
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['orders'] }),
            queryClient.invalidateQueries({ queryKey: ['home-stats'] }),
            queryClient.invalidateQueries({
              queryKey: ['home-next-deliveries'],
            }),
            queryClient.invalidateQueries({
              queryKey: ['home-next-deadlines'],
            }),
            queryClient.invalidateQueries({ queryKey: ['home-timeline'] }),
          ]);
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
    },
    [toast],
  );

  const handleEdit = useCallback(
    (id: string) => {
      void router.push(`/cortes/editar/${id}`);
    },
    [router],
  );

  const deactivateOrder = useCallback(
    async (id: string) => {
      setDeactivatingLoading(true);
      try {
        const orderRef = doc(db, 'orders', id);
        const now = Timestamp.fromDate(new Date());
        await updateDoc(orderRef, {
          isDeactivated: true,
          deactivatedAt: now,
          updatedAt: now,
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['orders'] }),
          queryClient.invalidateQueries({ queryKey: ['orders_search'] }),
          queryClient.invalidateQueries({ queryKey: ['home-stats'] }),
          queryClient.invalidateQueries({ queryKey: ['home-next-deliveries'] }),
          queryClient.invalidateQueries({ queryKey: ['home-timeline'] }),
        ]);
        toast.create({
          type: 'success',
          description: 'Pedido desativado',
        });
      } catch {
        toast.create({
          type: 'error',
          description: 'Erro ao desativar pedido',
        });
      } finally {
        setDeactivatingLoading(false);
        setDeactivatingOrder(null);
      }
    },
    [toast],
  );

  // --- Busca ---
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const currentSearchType =
    ordersFilter === 'Orçamento' ? 'estimates' : 'orders';

  const handleSearchOrder = (search: string) => {
    setSearchQuery(search || undefined);
  };

  const { data: searchData, isLoading: isSearchLoading } = useQuery({
    queryKey: ['orders_search', searchQuery, currentSearchType],
    queryFn: () => getOrdersBySearch(searchQuery, currentSearchType),
    enabled: !!searchQuery,
  });

  React.useEffect(() => {
    if (user === null) void router.push('/login');
  }, [user, router]);

  // useMemo evita criar [] novo a cada render quando lista está vazia
  // (caso contrário o React.memo nos cards/rows não tem efeito).
  // Mantido antes do early return para respeitar Rules of Hooks.
  const dataToShow = useMemo(
    () => (searchQuery && searchData ? searchData : pagedResult?.data || []),
    [searchQuery, searchData, pagedResult?.data],
  );

  if (!user) return <Loader />;

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

          {/* Plano de corte isolado */}
          {printingPlanOrder && (
            <CuttingPlanPrint
              order={printingPlanOrder}
              onAfterPrint={() => setPrintingPlanOrder(null)}
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
              onConfirm={id => void updateCutlistStatus(id)}
              loading={advancingStatus}
            />
          )}

          {/* Diálogo: confirmação de desativação (lazy — só monta após primeiro open) */}
          {deactivatingOrder && (
            <ConfirmDeactivateDialog
              order={deactivatingOrder}
              onCancel={() => setDeactivatingOrder(null)}
              onConfirm={id => void deactivateOrder(id)}
              loading={deactivatingLoading}
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
                {error instanceof Error ? error.message : 'Tente novamente.'}
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
              onPrintCuttingPlan={handlePrintCuttingPlan}
              onDownloadMachineFiles={order =>
                void handleDownloadMachineFiles(order)
              }
              onApproveEstimate={id => void approveEstimate(id)}
              onShowHistory={setHistoryOrder}
              onConfirmStatus={setConfirmingStatusOrder}
              onEdit={handleEdit}
              onDeactivate={setDeactivatingOrder}
            />
          ) : (
            <OrderListDesktop
              items={dataToShow}
              isEstimateList={isEstimateList}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onPrintResume={handlePrintResume}
              onPrintLabels={handlePrintLabels}
              onPrintCuttingPlan={handlePrintCuttingPlan}
              onDownloadMachineFiles={order =>
                void handleDownloadMachineFiles(order)
              }
              onApproveEstimate={id => void approveEstimate(id)}
              onShowHistory={setHistoryOrder}
              onConfirmStatus={setConfirmingStatusOrder}
              onEdit={handleEdit}
              onDeactivate={setDeactivatingOrder}
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
