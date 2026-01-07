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
} from '@chakra-ui/react';
import { format } from 'date-fns';
// CORREÇÃO: Adicionar QueryDocumentSnapshot e DocumentData aos imports
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
  FaRegFileAlt,
  FaTags,
  FaTrash,
} from 'react-icons/fa';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { SearchBar } from '../../components/SearchBar';
import { toaster } from '@/components/ui/toaster';
import { useAuth } from '../../hooks/authContext';
// CORREÇÃO: Importar PagedResult
import { useOrder, PagedResult } from '../../hooks/order';
import { db } from '../../services/firebase';
import { Estimate, Order } from '../../types';

const Cortes: React.FC = () => {
  const { user } = useAuth();

  const [ordersFilter, setOrdersFilter] = useState('Em Produção');

  const toast = toaster;
  const { getOrders, getOrdersBySearch } = useOrder();
  const router = Router;

  // --- QUERY INFINITA (PAGINAÇÃO) ---
  const {
    data: ordersData,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isInitialLoading,
  } = useInfiniteQuery({
    queryKey: ['orders', ordersFilter],
    // CORREÇÃO: Tipagem explícita do pageParam e retorno da função
    queryFn: ({ pageParam }) => getOrders(ordersFilter, pageParam),
    // CORREÇÃO: Definir initialPageParam como null com tipagem explícita para satisfazer o TS
    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
    getNextPageParam: lastPage => lastPage.lastDoc || null,
  });

  const radioSize = useBreakpointValue(['sm', 'sm', 'md'], { fallback: 'sm' });
  const tableSize = useBreakpointValue(['sm', 'md'], { fallback: 'sm' });

  // ... (Funções approveEstimate, updateCutlistStatus, handleRemove mantêm-se iguais) ...
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

  // CORREÇÃO: Tipagem explicita no flatMap usando PagedResult
  const dataToShow =
    searchCode && searchData
      ? searchData
      : ordersData?.pages.flatMap((page: PagedResult) => page.data) || [];

  const isEstimateList = ordersFilter === 'Orçamento';
  const isLoading = searchCode ? isSearchLoading : isInitialLoading;

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

          {/* TABELA */}
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
              <Table.Root
                variant="line"
                colorScheme="orange"
                // @ts-ignore
                size={tableSize}
                whiteSpace="nowrap"
              >
                <TableCaption mb={4} textAlign="left" px={4}>
                  {dataToShow?.length
                    ? `${dataToShow.length} registro(s) exibido(s)`
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
                  {/* Lógica de renderização unificada para evitar duplicação visual */}
                  {dataToShow.map((item: any) => {
                    // Se for Orçamento
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

                    // Se for Pedido
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
            )}

            {/* BOTÃO CARREGAR MAIS */}
            {!searchCode && hasNextPage && (
              <Center p={4} borderTopWidth="1px" borderColor="gray.100">
                <Button
                  onClick={() => fetchNextPage()}
                  loading={isFetchingNextPage}
                  disabled={isFetchingNextPage}
                  variant="outline"
                  colorScheme="orange"
                  size="sm"
                >
                  Carregar Mais
                </Button>
              </Center>
            )}
          </Box>
        </Stack>
      </Dashboard>
    </>
  );
};

export default Cortes;
