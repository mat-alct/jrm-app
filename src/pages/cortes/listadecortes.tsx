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
  useBreakpointValue,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import Head from 'next/head';
import Router from 'next/router';
import React, { useState } from 'react';
import { FaCheck, FaEdit, FaHandshake, FaTrash } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { EstimateResume } from '../../components/Printables/EstimateResume';
import { OrderResume } from '../../components/Printables/OrderResume';
import { Tags } from '../../components/Printables/Tags';
import { SearchBar } from '../../components/SearchBar';
import { toaster } from '@/components/ui/toaster';
import { useAuth } from '../../hooks/authContext';
import { useOrder } from '../../hooks/order';
import { db } from '../../services/firebase';
import { Estimate, Order } from '../../types';

const Cortes: React.FC = () => {
  const { user } = useAuth();
  const [ordersFilter, setOrdersFilter] = useState('Em Produção');
  const toast = toaster;
  const { getOrders, getOrdersBySearch } = useOrder();
  const router = Router;

  const { data: ordersData, refetch } = useQuery({
    queryKey: ['orders', ordersFilter],
    queryFn: () => getOrders(ordersFilter),
  });

  const radioSize = useBreakpointValue(['sm', 'sm', 'md', 'md', 'lg', 'lg']);

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
        description: `${type === 'orders' ? 'Pedido' : 'Orçamento'} excluído com sucesso`,
      });
    } catch {
      toast.create({
        type: 'error',
        description: `Erro ao remover ${type === 'orders' ? 'Pedido' : 'Orçamento'}`,
      });
    }
  };

  // --- Busca ---
  const [searchFilter, setSearchFilter] = useState<number | undefined>(
    undefined,
  );
  const [searchType, setSearchType] = useState<string>('orders');

  const handleSearchOrder = async (search: string) => {
    setSearchFilter(search ? Number(search) : undefined);
  };

  const { data: searchData } = useQuery({
    queryKey: ['orders', searchFilter, searchType],
    queryFn: () => getOrdersBySearch(searchFilter, searchType),
    enabled: !!searchFilter,
  });

  React.useEffect(() => {
    if (user === null) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return <Loader />;
  }

  const dataToShow = searchFilter && searchData ? searchData : ordersData;
  const isEstimateList = searchFilter
    ? searchType === 'estimates'
    : ordersFilter === 'Orçamento';

  return (
    <>
      <Head>
        <title>Cortes | JRM Compensados</title>
      </Head>

      <Dashboard>
        <Header pageTitle="Lista de Cortes">
          {!searchFilter && (
            <RadioGroup.Root
              colorScheme="orange"
              // @ts-ignore
              size={radioSize}
              value={ordersFilter}
              // CORREÇÃO: Verifica se e.value existe antes de atualizar o estado
              onValueChange={e => {
                if (e.value) setOrdersFilter(e.value);
              }}
            >
              <Stack direction={['column', 'row']} gap={[2, 4]}>
                {[
                  'Em Produção',
                  'Liberado para Transporte',
                  'Concluído',
                  'Orçamento',
                ].map(status => (
                  <RadioGroup.Item key={status} value={status}>
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemIndicator />
                    <RadioGroup.ItemText>
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
          )}
        </Header>

        <Flex direction="column" mb={8}>
          <SearchBar
            handleUpdateSearch={handleSearchOrder}
            minW="300px"
            placeholder="Digite o número do pedido"
          />
          <RadioGroup.Root
            colorScheme="orange"
            value={searchType}
            // CORREÇÃO: Verifica se e.value existe antes de atualizar o estado
            onValueChange={e => {
              if (e.value) setSearchType(e.value);
            }}
            mt={4}
          >
            <HStack gap={4}>
              <RadioGroup.Item value="orders">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>Pedidos</RadioGroup.ItemText>
              </RadioGroup.Item>
              <RadioGroup.Item value="estimates">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>Orçamentos</RadioGroup.ItemText>
              </RadioGroup.Item>
            </HStack>
          </RadioGroup.Root>
        </Flex>

        <Box overflowX="auto">
          <Table.Root
            variant="line"
            colorScheme="orange"
            mt={8}
            whiteSpace="nowrap"
          >
            <TableCaption>Lista de Cortes</TableCaption>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Código</Table.ColumnHeader>
                <Table.ColumnHeader>Cliente</Table.ColumnHeader>
                {!isEstimateList && (
                  <Table.ColumnHeader>Loja</Table.ColumnHeader>
                )}
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                {!isEstimateList && (
                  <Table.ColumnHeader textAlign="right">
                    Data de Entrega
                  </Table.ColumnHeader>
                )}
                <Table.ColumnHeader textAlign="right">Preço</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {!isEstimateList &&
                dataToShow
                  ?.sort((a: any, b: any) => b.orderCode - a.orderCode)
                  .map((order: any) => (
                    <Table.Row key={order.id}>
                      <Table.Cell>{order.orderCode}</Table.Cell>
                      <Table.Cell>
                        {order.customer?.name || 'Cliente Removido'}
                      </Table.Cell>
                      <Table.Cell>{order.orderStore}</Table.Cell>
                      <Table.Cell>{order.orderStatus}</Table.Cell>
                      <Table.Cell textAlign="right">
                        {order.deliveryDate?.seconds
                          ? format(
                              new Date(order.deliveryDate.seconds * 1000),
                              'dd/MM/yyyy',
                            )
                          : '-'}
                      </Table.Cell>
                      <Table.Cell textAlign="right">{`R$ ${order.orderPrice},00`}</Table.Cell>
                      <Table.Cell>
                        <HStack gap={4}>
                          <OrderResume order={order} />
                          <Tags order={order} />

                          <IconButton
                            colorScheme="orange"
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
                                colorScheme="orange"
                                size="sm"
                                disabled
                                aria-label="Editar"
                              >
                                <FaEdit />
                              </IconButton>
                              <IconButton
                                colorScheme="orange"
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

              {isEstimateList &&
                dataToShow
                  ?.sort((a: any, b: any) => b.estimateCode - a.estimateCode)
                  .map((estimate: any) => (
                    <Table.Row key={estimate.id}>
                      <Table.Cell>{estimate.estimateCode}</Table.Cell>
                      <Table.Cell>{estimate.name}</Table.Cell>
                      <Table.Cell>Orçamento</Table.Cell>
                      <Table.Cell textAlign="right">{`R$ ${estimate.estimatePrice},00`}</Table.Cell>
                      <Table.Cell>
                        <HStack gap={4}>
                          <EstimateResume estimate={estimate} />

                          <IconButton
                            colorScheme="orange"
                            size="sm"
                            aria-label="Remover"
                            onClick={() =>
                              handleRemove(estimate.id, 'estimates')
                            }
                          >
                            <FaTrash />
                          </IconButton>

                          <IconButton
                            colorScheme="orange"
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
      </Dashboard>
    </>
  );
};

export default Cortes;
