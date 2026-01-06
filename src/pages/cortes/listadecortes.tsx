// src/pages/cortes/listadecortes.tsx
import {
  Box,
  Flex,
  HStack,
  IconButton,
  RadioGroup,
  Stack,
  Table,
  TableCaption,
  Text,
  useBreakpointValue,
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

const Cortes: React.FC = () => {
  const { user } = useAuth();

  // O filtro principal controla tanto a visualização quanto o contexto da busca
  const [ordersFilter, setOrdersFilter] = useState('Em Produção');

  const toast = toaster;
  const { getOrders, getOrdersBySearch } = useOrder();
  const router = Router;

  // Busca Principal (Lista padrão)
  const { data: ordersData, refetch } = useQuery({
    queryKey: ['orders', ordersFilter],
    queryFn: () => getOrders(ordersFilter),
  });

  const radioSize = useBreakpointValue(['sm', 'sm', 'md'], { fallback: 'sm' });
  const tableSize = useBreakpointValue(['sm', 'md'], { fallback: 'sm' });

  // --- Funções de Ação ---
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
        description: 'Erro ao carregar orçamento para aprovação.',
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
        await updateDoc(orderRef, {
          orderStatus: nextState,
        });
        refetch();
        toast.create({
          type: 'success',
          description: `Status atualizado para ${nextState}`,
        });
      }
    } catch {
      toast.create({
        type: 'error',
        description: 'Erro ao concluir etapa do pedido',
      });
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

  // Determina automaticamente o tipo de busca baseado na aba atual
  const currentSearchType =
    ordersFilter === 'Orçamento' ? 'estimates' : 'orders';

  const handleSearchOrder = async (search: string) => {
    setSearchCode(search ? Number(search) : undefined);
  };

  const { data: searchData } = useQuery({
    queryKey: ['orders_search', searchCode, currentSearchType],
    queryFn: () => getOrdersBySearch(searchCode, currentSearchType),
    enabled: !!searchCode, // Só busca se houver algo digitado
  });

  React.useEffect(() => {
    if (user === null) router.push('/login');
  }, [user, router]);

  if (!user) return <Loader />;

  // Se houver busca ativa, mostra o resultado da busca. Senão, mostra a lista filtrada por status.
  const dataToShow = searchCode && searchData ? searchData : ordersData;
  const isEstimateList = ordersFilter === 'Orçamento'; // Flag para saber se estamos exibindo orçamentos

  return (
    <>
      <Head>
        <title>Cortes | JRM Compensados</title>
      </Head>

      <Dashboard>
        <Stack gap={6}>
          <Header pageTitle="Lista de Cortes" />

          {/* TOOLBAR: Busca + Filtros Inline */}
          <Flex
            direction={['column', 'column', 'column', 'row']} // Em PC (row), fica tudo na mesma linha
            align={['stretch', 'stretch', 'stretch', 'center']}
            justify="space-between"
            gap={4}
            bg="white"
            p={4}
            borderRadius="md"
            shadow="sm"
            borderWidth="1px"
          >
            {/* Barra de Busca (Esquerda) */}
            <Box w={['100%', '100%', '100%', '300px']}>
              <SearchBar
                handleUpdateSearch={handleSearchOrder}
                placeholder={
                  isEstimateList ? 'Buscar Orçamento...' : 'Buscar Pedido...'
                }
                width="100%"
              />
            </Box>

            {/* Filtros de Status (Direita - Inline) */}
            <Box overflowX="auto" pb={[2, 2, 0]}>
              <RadioGroup.Root
                colorScheme="orange"
                // @ts-ignore
                size={radioSize}
                value={ordersFilter}
                onValueChange={e => {
                  if (e.value) {
                    setOrdersFilter(e.value);
                    setSearchCode(undefined); // Limpa a busca ao trocar de aba
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
            <Table.Root
              variant="line"
              colorScheme="orange"
              // @ts-ignore
              size={tableSize}
              whiteSpace="nowrap"
            >
              <TableCaption mb={4} textAlign="left" px={4}>
                {dataToShow?.length
                  ? `${dataToShow.length} registro(s) encontrado(s)`
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
                {/* LISTAGEM DE PEDIDOS */}
                {!isEstimateList &&
                  dataToShow
                    ?.sort((a: any, b: any) => b.orderCode - a.orderCode)
                    .map((order: any) => (
                      <Table.Row key={order.id} _hover={{ bg: 'gray.50' }}>
                        <Table.Cell fontWeight="bold">
                          {order.orderCode}
                        </Table.Cell>
                        <Table.Cell>
                          <Flex direction="column">
                            <Text fontWeight="medium">
                              {order.customer?.name || 'Cliente Removido'}
                            </Text>
                            {order.customer?.telephone && (
                              <Text fontSize="xs" color="gray.500">
                                {order.customer.telephone}
                              </Text>
                            )}
                          </Flex>
                        </Table.Cell>
                        <Table.Cell>{order.orderStore}</Table.Cell>
                        <Table.Cell>
                          <Box
                            as="span"
                            px={2}
                            py={1}
                            borderRadius="md"
                            fontSize="xs"
                            fontWeight="bold"
                            bg={
                              order.orderStatus === 'Concluído'
                                ? 'green.100'
                                : order.orderStatus === 'Em Produção'
                                  ? 'orange.100'
                                  : 'blue.100'
                            }
                            color={
                              order.orderStatus === 'Concluído'
                                ? 'green.800'
                                : order.orderStatus === 'Em Produção'
                                  ? 'orange.800'
                                  : 'blue.800'
                            }
                          >
                            {order.orderStatus}
                          </Box>
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          {order.deliveryDate?.seconds
                            ? format(
                                new Date(order.deliveryDate.seconds * 1000),
                                'dd/MM/yyyy',
                              )
                            : '-'}
                        </Table.Cell>
                        <Table.Cell textAlign="right" fontWeight="bold">
                          {`R$ ${order.orderPrice},00`}
                        </Table.Cell>
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
                              onClick={() => handleRemove(order.id, 'orders')}
                              aria-label="Remover"
                              disabled={order.orderStatus !== 'Concluído'}
                            >
                              <FaTrash />
                            </IconButton>
                            {order.orderStatus !== 'Concluído' && (
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
                                  aria-label="Concluir Etapa"
                                  onClick={() => updateCutlistStatus(order.id)}
                                >
                                  <FaCheck />
                                </IconButton>
                              </>
                            )}
                          </HStack>
                        </Table.Cell>
                      </Table.Row>
                    ))}

                {/* LISTAGEM DE ORÇAMENTOS */}
                {isEstimateList &&
                  dataToShow
                    ?.sort((a: any, b: any) => b.estimateCode - a.estimateCode)
                    .map((estimate: any) => (
                      <Table.Row key={estimate.id} _hover={{ bg: 'gray.50' }}>
                        <Table.Cell fontWeight="bold">
                          {estimate.estimateCode}
                        </Table.Cell>
                        <Table.Cell>{estimate.name}</Table.Cell>
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
                        <Table.Cell textAlign="right" fontWeight="bold">
                          {`R$ ${estimate.estimatePrice},00`}
                        </Table.Cell>
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
                                handleRemove(estimate.id, 'estimates')
                              }
                            >
                              <FaTrash />
                            </IconButton>
                            <IconButton
                              colorScheme="green"
                              size="sm"
                              aria-label="Aprovar"
                              onClick={() => approveEstimate(estimate.id)}
                            >
                              <FaHandshake />
                            </IconButton>
                          </HStack>
                        </Table.Cell>
                      </Table.Row>
                    ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </Stack>
      </Dashboard>
    </>
  );
};

export default Cortes;
