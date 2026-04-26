// src/pages/cortes/listadecortes.tsx
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  RadioGroup,
  Stack,
  Table,
  TableCaption,
  Text,
  useBreakpointValue,
  Center,
  Spinner,
  Alert,
} from '@chakra-ui/react';
import { format } from 'date-fns';
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
  FaCheck,
  FaEdit,
  FaHandshake,
  FaHistory,
  FaRegFileAlt,
  FaTags,
  FaTrash,
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
  const tableSize = useBreakpointValue(['sm', 'md'], { fallback: 'sm' });

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

          {/* MOBILE: lista em cards (base / sm) */}
          <Box display={['block', 'block', 'none']}>
            {isLoading ? (
              <Center p={10}>
                <Spinner color="orange.500" />
              </Center>
            ) : !dataToShow?.length ? (
              <Box
                bg="white"
                borderWidth="1px"
                borderRadius="lg"
                shadow="sm"
                p={6}
                textAlign="center"
                color="gray.600"
              >
                Nenhum registro encontrado
              </Box>
            ) : (
              <Stack gap={3}>
                <Text fontSize="xs" color="gray.500" px={1}>
                  {`${dataToShow.length} registro(s) ${searchQuery ? 'encontrados' : 'nesta página'}`}
                </Text>
                {dataToShow.map((item: any) => {
                  const isUrgent = item?.isUrgent;

                  if (isEstimateList) {
                    return (
                      <Box
                        key={item.id}
                        bg="white"
                        borderWidth="1px"
                        borderColor="gray.200"
                        borderRadius="xl"
                        shadow="sm"
                        p={4}
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontSize="sm" color="gray.500" fontWeight="bold">
                            #{item.estimateCode}
                          </Text>
                          <Box
                            as="span"
                            px={2}
                            py={1}
                            borderRadius="md"
                            fontSize="xs"
                            fontWeight="bold"
                            bg="gray.100"
                            color="gray.800"
                          >
                            Pendente
                          </Box>
                        </Flex>
                        <Text fontSize="lg" fontWeight="bold" color="gray.800">
                          {item.name}
                        </Text>
                        <Text
                          fontSize="lg"
                          fontWeight="bold"
                          color="orange.600"
                          mt={2}
                        >
                          R$ {item.estimatePrice},00
                        </Text>
                        <Stack
                          direction="row"
                          gap={2}
                          mt={3}
                          justify="space-between"
                        >
                          <Button
                            flex="1"
                            size="md"
                            variant="outline"
                            colorScheme="gray"
                            onClick={() => handlePrintResume(item, 'estimate')}
                          >
                            <FaRegFileAlt /> Resumo
                          </Button>
                          <Button
                            flex="1"
                            size="md"
                            colorScheme="green"
                            onClick={() => approveEstimate(item.id)}
                          >
                            <FaHandshake /> Aprovar
                          </Button>
                          <IconButton
                            colorScheme="red"
                            variant="outline"
                            size="md"
                            aria-label="Remover"
                            onClick={() => handleRemove(item.id, 'estimates')}
                          >
                            <FaTrash />
                          </IconButton>
                        </Stack>
                      </Box>
                    );
                  }

                  const statusBg =
                    item.orderStatus === 'Concluído'
                      ? 'green.100'
                      : item.orderStatus === 'Em Produção'
                        ? 'orange.100'
                        : 'blue.100';
                  const statusColor =
                    item.orderStatus === 'Concluído'
                      ? 'green.800'
                      : item.orderStatus === 'Em Produção'
                        ? 'orange.800'
                        : 'blue.800';
                  const nextLabel =
                    item.orderStatus === 'Em Produção'
                      ? 'Liberar para Transporte'
                      : item.orderStatus === 'Liberado para Transporte'
                        ? 'Concluir pedido'
                        : null;

                  return (
                    <Box
                      key={item.id}
                      bg={isUrgent ? 'red.50' : 'white'}
                      borderWidth="1px"
                      borderColor={isUrgent ? 'red.300' : 'gray.200'}
                      borderRadius="xl"
                      shadow="sm"
                      p={4}
                    >
                      <Flex justify="space-between" align="center" mb={2}>
                        <Text fontSize="sm" color="gray.500" fontWeight="bold">
                          #{item.orderCode}
                        </Text>
                        <Box
                          as="span"
                          px={2}
                          py={1}
                          borderRadius="md"
                          fontSize="xs"
                          fontWeight="bold"
                          display="inline-flex"
                          alignItems="center"
                          gap={1}
                          bg={statusBg}
                          color={statusColor}
                        >
                          {isUrgent && <FaExclamationTriangle />}
                          {item.orderStatus}
                          {item.edits?.length > 0 && <FaHistory />}
                        </Box>
                      </Flex>

                      <Text fontSize="lg" fontWeight="bold" color="gray.800">
                        {item.customer?.name || 'Cliente Removido'}
                      </Text>
                      {item.customer?.telephone && (
                        <Text fontSize="sm" color="gray.600">
                          {item.customer.telephone}
                        </Text>
                      )}

                      <Flex
                        justify="space-between"
                        align="center"
                        mt={2}
                        gap={3}
                        wrap="wrap"
                      >
                        <Text fontSize="xs" color="gray.500">
                          {item.deliveryDate?.seconds
                            ? `Entrega ${format(new Date(item.deliveryDate.seconds * 1000), 'dd/MM/yyyy')}`
                            : 'Sem data de entrega'}
                        </Text>
                        <Text
                          fontSize="lg"
                          fontWeight="bold"
                          color="orange.600"
                        >
                          R$ {item.orderPrice},00
                        </Text>
                      </Flex>

                      {/* Botões secundários */}
                      <Flex gap={2} mt={3} wrap="wrap">
                        <Button
                          flex="1"
                          minW="100px"
                          size="md"
                          variant="outline"
                          colorScheme="gray"
                          onClick={() => handlePrintResume(item, 'order')}
                        >
                          <FaRegFileAlt /> Resumo
                        </Button>
                        <Button
                          flex="1"
                          minW="100px"
                          size="md"
                          variant="outline"
                          colorScheme="gray"
                          onClick={() => handlePrintLabels(item)}
                        >
                          <FaTags /> Etiquetas
                        </Button>
                        {item.edits?.length > 0 && (
                          <IconButton
                            size="md"
                            variant="outline"
                            colorScheme="purple"
                            aria-label="Histórico de edições"
                            onClick={() => setHistoryOrder(item)}
                          >
                            <FaHistory />
                          </IconButton>
                        )}
                        {item.orderStatus === 'Em Produção' && (
                          <IconButton
                            size="md"
                            variant="outline"
                            colorScheme="blue"
                            aria-label="Editar"
                            onClick={() =>
                              router.push(`/cortes/editar/${item.id}`)
                            }
                          >
                            <FaEdit />
                          </IconButton>
                        )}
                      </Flex>

                      {/* Botão principal (avançar status) */}
                      {nextLabel && (
                        <Button
                          mt={3}
                          w="100%"
                          size="lg"
                          colorScheme="green"
                          onClick={() => setConfirmingStatusOrder(item)}
                        >
                          <FaCheck /> {nextLabel}
                        </Button>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>

          {/* DESKTOP / TABLET: tabela (md+) */}
          <Box
            display={['none', 'none', 'block']}
            overflowX="auto"
            borderWidth="1px"
            borderRadius="lg"
            bg="white"
            shadow="sm"
          >
            {isLoading ? (
              <Center p={10}>
                <Spinner color="orange.500" />
              </Center>
            ) : (
              <>
                <Table.Root
                  variant="line"
                  colorScheme="orange"
                  // @ts-ignore
                  size={tableSize}
                  whiteSpace="nowrap"
                >
                  <TableCaption mt={4} mb={4} textAlign="left" px={4}>
                    {dataToShow?.length
                      ? `${dataToShow.length} registro(s) ${searchQuery ? 'encontrados' : 'nesta página'}`
                      : 'Nenhum registro encontrado'}
                  </TableCaption>
                  <Table.Header bg="gray.50">
                    <Table.Row>
                      <Table.ColumnHeader>Código</Table.ColumnHeader>
                      <Table.ColumnHeader>Cliente</Table.ColumnHeader>
                      <Table.ColumnHeader>Status</Table.ColumnHeader>
                      {!isEstimateList && (
                        <Table.ColumnHeader textAlign="right">
                          Entrega
                        </Table.ColumnHeader>
                      )}
                      <Table.ColumnHeader textAlign="right">
                        Preço
                      </Table.ColumnHeader>
                      <Table.ColumnHeader width="1%">Ações</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {dataToShow.map((item: any, index: number) => {
                      // LÓGICA DE FUNDO ZEBRADO + URGENTE
                      const isEven = index % 2 === 0;
                      const isUrgent = item?.isUrgent;
                      let rowBg = isEven ? 'white' : 'gray.50';
                      let hoverBg = isEven ? 'gray.50' : 'gray.100';

                      if (isUrgent && !isEstimateList) {
                        rowBg = 'red.50';
                        hoverBg = 'red.100';
                      }

                      if (isEstimateList) {
                        return (
                          <Table.Row
                            key={item.id}
                            bg={rowBg}
                            _hover={{ bg: hoverBg }}
                          >
                            <Table.Cell fontWeight="bold">
                              {item.estimateCode}
                            </Table.Cell>
                            <Table.Cell>{item.name}</Table.Cell>
                            <Table.Cell>Orçamento</Table.Cell>
                            <Table.Cell>
                              <Box
                                as="span"
                                px={2}
                                py={1}
                                borderRadius="md"
                                fontSize="xs"
                                fontWeight="bold"
                                bg="gray.100"
                                color="gray.800"
                              >
                                Pendente
                              </Box>
                            </Table.Cell>
                            <Table.Cell
                              textAlign="right"
                              fontWeight="bold"
                            >{`R$ ${item.estimatePrice},00`}</Table.Cell>
                            <Table.Cell>
                              <HStack gap={2} justify="flex-end">
                                {/* Botão Manual para Orçamento */}
                                <IconButton
                                  colorScheme="gray"
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Imprimir Orçamento"
                                  onClick={() =>
                                    handlePrintResume(item, 'estimate')
                                  }
                                >
                                  <FaRegFileAlt />
                                </IconButton>

                                <IconButton
                                  colorScheme="red"
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Remover"
                                  onClick={() =>
                                    handleRemove(item.id, 'estimates')
                                  }
                                >
                                  <FaTrash />
                                </IconButton>
                                <IconButton
                                  colorScheme="green"
                                  size="sm"
                                  aria-label="Aprovar"
                                  onClick={() => approveEstimate(item.id)}
                                >
                                  <FaHandshake />
                                </IconButton>
                              </HStack>
                            </Table.Cell>
                          </Table.Row>
                        );
                      }

                      return (
                        <Table.Row
                          key={item.id}
                          bg={rowBg}
                          _hover={{ bg: hoverBg }}
                        >
                          <Table.Cell fontWeight="bold">
                            {item.orderCode}
                          </Table.Cell>
                          <Table.Cell>
                            <Flex direction="column">
                              <Text fontWeight="medium">
                                {item.customer?.name || 'Cliente Removido'}
                              </Text>
                              {item.customer?.telephone && (
                                <Text fontSize="xs" color="gray.500">
                                  {item.customer.telephone}
                                </Text>
                              )}
                            </Flex>
                          </Table.Cell>
                          <Table.Cell>
                            <Box
                              as="span"
                              px={2}
                              py={1}
                              borderRadius="md"
                              fontSize="xs"
                              fontWeight="bold"
                              display="inline-flex"
                              alignItems="center"
                              gap={1}
                              bg={
                                item.orderStatus === 'Concluído'
                                  ? 'green.100'
                                  : item.orderStatus === 'Em Produção'
                                    ? 'orange.100'
                                    : 'blue.100'
                              }
                              color={
                                item.orderStatus === 'Concluído'
                                  ? 'green.800'
                                  : item.orderStatus === 'Em Produção'
                                    ? 'orange.800'
                                    : 'blue.800'
                              }
                            >
                              {isUrgent && <FaExclamationTriangle />}
                              {item.orderStatus}
                              {item.edits?.length > 0 && (
                                <Box
                                  as="span"
                                  title={`Editado ${item.edits.length}× — última: ${item.edits[item.edits.length - 1]?.editedBy}`}
                                  ml={1}
                                  display="inline-flex"
                                  alignItems="center"
                                >
                                  <FaHistory />
                                </Box>
                              )}
                            </Box>
                          </Table.Cell>
                          <Table.Cell textAlign="right">
                            {item.deliveryDate?.seconds
                              ? format(
                                  new Date(item.deliveryDate.seconds * 1000),
                                  'dd/MM/yyyy',
                                )
                              : '-'}
                          </Table.Cell>
                          <Table.Cell
                            textAlign="right"
                            fontWeight="bold"
                          >{`R$ ${item.orderPrice},00`}</Table.Cell>
                          <Table.Cell>
                            <HStack gap={2} justify="flex-end">
                              {/* Botão Manual para Pedido */}
                              <IconButton
                                colorScheme="gray"
                                variant="ghost"
                                size="sm"
                                aria-label="Imprimir Resumo"
                                onClick={() => handlePrintResume(item, 'order')}
                              >
                                <FaRegFileAlt />
                              </IconButton>

                              <IconButton
                                aria-label="Etiquetas"
                                variant="ghost"
                                colorScheme="gray"
                                size="sm"
                                onClick={() => handlePrintLabels(item)}
                              >
                                <FaTags />
                              </IconButton>

                              {item.edits?.length > 0 && (
                                <IconButton
                                  aria-label="Histórico de edições"
                                  variant="ghost"
                                  colorScheme="purple"
                                  size="sm"
                                  onClick={() => setHistoryOrder(item)}
                                  title={`${item.edits.length} edição(ões)`}
                                >
                                  <FaHistory />
                                </IconButton>
                              )}

                              {item.orderStatus === 'Em Produção' && (
                                <IconButton
                                  colorScheme="blue"
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Editar"
                                  onClick={() =>
                                    router.push(`/cortes/editar/${item.id}`)
                                  }
                                >
                                  <FaEdit />
                                </IconButton>
                              )}
                              {item.orderStatus !== 'Concluído' && (
                                <IconButton
                                  colorScheme="green"
                                  size="sm"
                                  aria-label="Concluir"
                                  onClick={() => setConfirmingStatusOrder(item)}
                                >
                                  <FaCheck />
                                </IconButton>
                              )}
                            </HStack>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </>
            )}
          </Box>

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
