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
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import Head from 'next/head';
import Router from 'next/router';
import React, { useState } from 'react';
import {
  FaCheck,
  FaEdit,
  FaHandshake,
  FaRegFileAlt,
  FaTags,
  FaTrash,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
  FaDatabase,
} from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { SearchBar } from '../../components/SearchBar';
import { toaster } from '@/components/ui/toaster';
import { useAuth } from '../../hooks/authContext';
import { useOrder } from '../../hooks/order';
import { db } from '../../services/firebase';
import { Estimate, Order } from '../../types';
import { seedDatabase } from '../../utils/seedDatabase'; // Import da função de Seed

const Cortes: React.FC = () => {
  const { user } = useAuth();

  // Estados de Filtro e Paginação
  const [ordersFilter, setOrdersFilter] = useState('Em Produção');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSeeding, setIsSeeding] = useState(false); // Estado do botão de Seed

  const toast = toaster;
  const { getOrders, getOrdersBySearch } = useOrder();
  const router = Router;

  // --- QUERY PADRÃO COM PAGINAÇÃO ---
  const {
    data: pagedResult,
    isLoading: isInitialLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['orders', ordersFilter, currentPage],
    queryFn: () => getOrders(ordersFilter, currentPage),
    placeholderData: previousData => previousData,
  });

  const radioSize = useBreakpointValue(['sm', 'sm', 'md'], { fallback: 'sm' });
  const tableSize = useBreakpointValue(['sm', 'md'], { fallback: 'sm' });

  // --- Funções de Ação ---

  // Função temporária para gerar dados
  const handleSeed = async () => {
    if (
      !window.confirm('Isso vai criar 35 pedidos falsos no banco. Continuar?')
    )
      return;
    setIsSeeding(true);
    try {
      await seedDatabase();
      toast.create({
        type: 'success',
        description: '35 Pedidos criados! Atualizando...',
      });
      refetch();
    } catch (error) {
      console.error(error);
      toast.create({ type: 'error', description: 'Erro ao criar pedidos.' });
    } finally {
      setIsSeeding(false);
    }
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
  const [searchCode, setSearchCode] = useState<number | undefined>(undefined);
  const currentSearchType =
    ordersFilter === 'Orçamento' ? 'estimates' : 'orders';

  const handleSearchOrder = async (search: string) => {
    setSearchCode(search ? Number(search) : undefined);
  };

  const { data: searchData, isLoading: isSearchLoading } = useQuery({
    queryKey: ['orders_search', searchCode, currentSearchType],
    queryFn: () => getOrdersBySearch(searchCode, currentSearchType),
    enabled: !!searchCode,
  });

  React.useEffect(() => {
    if (user === null) router.push('/login');
  }, [user, router]);

  if (!user) return <Loader />;

  // Se tem busca, mostra resultado da busca. Se não, mostra dados paginados do hook.
  const dataToShow =
    searchCode && searchData ? searchData : pagedResult?.data || [];
  const isEstimateList = ordersFilter === 'Orçamento';
  const isLoading = searchCode ? isSearchLoading : isInitialLoading;

  // Lógica de Paginação Visual
  const totalCount = pagedResult?.totalCount || 0;
  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const showPagination =
    !searchCode &&
    (ordersFilter === 'Concluído' || ordersFilter === 'Orçamento') &&
    totalPages > 1;

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          size="sm"
          variant={i === currentPage ? 'solid' : 'outline'}
          colorScheme="orange"
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </Button>,
      );
    }
    return buttons;
  };

  return (
    <>
      <Head>
        <title>Cortes | JRM Compensados</title>
      </Head>

      <Dashboard>
        <Stack gap={6}>
          <Header pageTitle="Lista de Cortes" />

          {/* TOOLBAR */}
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

            {/* BOTÃO MÁGICO TEMPORÁRIO PARA SEED */}
            <Button
              colorScheme="purple"
              onClick={handleSeed}
              loading={isSeeding}
              size="sm"
              variant="outline"
            >
              <FaDatabase style={{ marginRight: '8px' }} /> Gerar Massa de Teste
            </Button>

            <Box overflowX="auto" pb={[2, 2, 0]}>
              <RadioGroup.Root
                colorScheme="orange"
                // @ts-ignore
                size={radioSize}
                value={ordersFilter}
                onValueChange={e => {
                  if (e.value) {
                    setOrdersFilter(e.value);
                    setSearchCode(undefined);
                    setCurrentPage(1);
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
                Verifique o Console para links de índice do Firebase.{' '}
                {(error as any)?.message}
              </Alert.Description>
            </Alert.Root>
          )}

          <Box
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
                  <TableCaption mb={4} textAlign="left" px={4}>
                    {dataToShow?.length
                      ? `${dataToShow.length} registro(s) nesta página`
                      : 'Nenhum registro encontrado'}
                  </TableCaption>
                  <Table.Header bg="gray.50">
                    <Table.Row>
                      <Table.ColumnHeader>Código</Table.ColumnHeader>
                      <Table.ColumnHeader>Cliente</Table.ColumnHeader>
                      {!isEstimateList && (
                        <Table.ColumnHeader>Loja</Table.ColumnHeader>
                      )}
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
                    {dataToShow.map((item: any) => {
                      if (isEstimateList) {
                        return (
                          <Table.Row key={item.id} _hover={{ bg: 'gray.50' }}>
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
                                <IconButton
                                  aria-label="Resumo"
                                  variant="ghost"
                                  colorScheme="gray"
                                  size="sm"
                                  disabled
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
                        <Table.Row key={item.id} _hover={{ bg: 'gray.50' }}>
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
                          <Table.Cell>{item.orderStore}</Table.Cell>
                          <Table.Cell>
                            <Box
                              as="span"
                              px={2}
                              py={1}
                              borderRadius="md"
                              fontSize="xs"
                              fontWeight="bold"
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
                              {item.orderStatus}
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
                              <IconButton
                                aria-label="Resumo"
                                variant="ghost"
                                colorScheme="gray"
                                size="sm"
                                disabled
                              >
                                <FaRegFileAlt />
                              </IconButton>
                              <IconButton
                                aria-label="Etiquetas"
                                variant="ghost"
                                colorScheme="gray"
                                size="sm"
                                disabled
                              >
                                <FaTags />
                              </IconButton>
                              <IconButton
                                colorScheme="red"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemove(item.id, 'orders')}
                                aria-label="Remover"
                                disabled={item.orderStatus !== 'Concluído'}
                              >
                                <FaTrash />
                              </IconButton>
                              {item.orderStatus !== 'Concluído' && (
                                <>
                                  <IconButton
                                    colorScheme="blue"
                                    variant="ghost"
                                    size="sm"
                                    disabled
                                    aria-label="Editar"
                                  >
                                    <FaEdit />
                                  </IconButton>
                                  <IconButton
                                    colorScheme="green"
                                    size="sm"
                                    aria-label="Concluir"
                                    onClick={() => updateCutlistStatus(item.id)}
                                  >
                                    <FaCheck />
                                  </IconButton>
                                </>
                              )}
                            </HStack>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>

                {/* COMPONENTE DE PAGINAÇÃO */}
                {showPagination && (
                  <Flex
                    p={4}
                    justify="flex-end"
                    align="center"
                    borderTopWidth="1px"
                    borderColor="gray.100"
                    gap={2}
                  >
                    <Text fontSize="sm" color="gray.500" mr={4}>
                      Página {currentPage} de {totalPages}
                    </Text>

                    <IconButton
                      aria-label="Anterior"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <FaChevronLeft />
                    </IconButton>

                    {renderPaginationButtons()}

                    <IconButton
                      aria-label="Próximo"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(p => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <FaChevronRight />
                    </IconButton>
                  </Flex>
                )}
              </>
            )}
          </Box>
        </Stack>
      </Dashboard>
    </>
  );
};

export default Cortes;
