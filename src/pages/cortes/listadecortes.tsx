import {
  Box,
  Flex,
  HStack,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableCaption,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useBreakpointValue,
  useToast,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import firebase from 'firebase/app';
import Head from 'next/head';
import Router from 'next/router';
import { AuthAction, withAuthUser } from 'next-firebase-auth';
import React, { useState } from 'react';
import { FaCheck, FaEdit, FaHandshake, FaTrash } from 'react-icons/fa';
import { useQuery } from 'react-query';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { EstimateResume } from '../../components/Printables/EstimateResume';
import { OrderResume } from '../../components/Printables/OrderResume';
import { Tags } from '../../components/Printables/Tags';
import { SearchBar } from '../../components/SearchBar';
import { useOrder } from '../../hooks/order';
import { Estimate, Order } from '../../types';

const Cortes: React.FC = () => {
  const [ordersFilter, setOrdersFilter] = useState('Em Produção');
  const toast = useToast();
  const { getOrders, getOrdersBySearch } = useOrder();

  const { data: ordersData, refetch } = useQuery(['orders', ordersFilter], () =>
    getOrders(ordersFilter),
  );

  const radioSize = useBreakpointValue(['sm', 'sm', 'md', 'md', 'lg', 'lg']);

  // Function to approve a estimate and push to new order page
  const approveEstimate = async (id: string) => {
    const estimateData = await firebase
      .firestore()
      .collection('estimates')
      .doc(id)
      .get()
      .then(doc => Object.assign(doc.data() as Estimate, { id: doc.id }));

    // Push to new order page with estimate params
    Router.push({
      pathname: '/cortes/novoservico',
      query: {
        orderType: 'estimate',
        cutlist: JSON.stringify(estimateData.cutlist),
        estimateId: estimateData.id,
      },
    });
  };

  // Function to finish a cutlist
  const updateCutlistStatus = async (id: string) => {
    let nextState;

    try {
      const order = await firebase
        .firestore()
        .collection('orders')
        .doc(id)
        .get()
        .then(doc => Object.assign(doc.data() as Order, { id: doc.id }));

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

      await firebase.firestore().collection('orders').doc(id).update({
        orderStatus: nextState,
      });

      refetch();

      toast({
        status: 'success',
        description: `Status atualizado de ${order.orderStatus} para ${nextState}`,
      });
    } catch {
      toast({
        status: 'error',
        description: 'Erro ao concluir etapa do pedido',
      });
    }
  };

  // Functions to remove order and estimates
  const handleRemove = async (id: string, type: 'orders' | 'estimates') => {
    try {
      await firebase.firestore().collection(type).doc(id).delete();

      refetch();

      toast({
        status: 'success',
        description: `${
          type === 'orders' ? 'Pedido' : 'Orçamento'
        } excluído com sucesso`,
      });
    } catch {
      toast({
        status: 'error',
        description: `Erro ao remover ${
          type === 'orders' ? 'Pedido' : 'Orçamento'
        }`,
      });
    }
  };

  // Search order function
  const [searchFilter, setSearchFilter] = useState<number | undefined>(
    undefined,
  );
  const [searchType, setSearchType] = useState<string>('orders');

  const handleSearchOrder = async (search: string) => {
    setSearchFilter(Number(search));
  };

  const { data: searchData } = useQuery(
    ['orders', searchFilter, searchType],
    () => getOrdersBySearch(searchFilter, searchType),
  );

  return (
    <>
      <Head>
        <title>Cortes | JRM Compensados</title>
      </Head>

      <Dashboard>
        <Header pageTitle="Lista de Cortes">
          {searchData && searchData.length === 0 && (
            <RadioGroup
              colorScheme="orange"
              size={radioSize}
              value={ordersFilter}
              onChange={setOrdersFilter}
              whiteSpace="nowrap"
            >
              <Stack direction={['column', 'row']} spacing={[2, 4]}>
                <Radio
                  isChecked
                  id="Em Produção"
                  name="Em Produção"
                  value="Em Produção"
                >
                  {radioSize === 'sm' ? 'Produção' : 'Em produção'}
                </Radio>
                <Radio
                  id="Liberado para Transporte"
                  name="Liberado para Transporte"
                  value="Liberado para Transporte"
                >
                  {radioSize === 'sm'
                    ? 'Liberados'
                    : 'Liberados para transporte'}
                </Radio>
                <Radio id="Concluído" name="Concluído" value="Concluído">
                  Concluídos
                </Radio>
                <Radio id="Orçamento" name="Orçamento" value="Orçamento">
                  Orçamentos
                </Radio>
              </Stack>
            </RadioGroup>
          )}
        </Header>

        {/* SearchBar */}
        <Flex direction="column">
          <SearchBar
            handleUpdateSearch={handleSearchOrder}
            minW="300px"
            placeholder="Digite o número do pedido"
          />
          <RadioGroup
            colorScheme="orange"
            value={searchType}
            onChange={setSearchType}
            mt={4}
          >
            <HStack spacing={4}>
              <Radio isChecked id="orders" name="orders" value="orders">
                Pedidos
              </Radio>
              <Radio id="estimates" name="estimates" value="estimates">
                Orçamentos
              </Radio>
            </HStack>
          </RadioGroup>
        </Flex>

        {/* Lista de cortes caso não exista busca */}
        {searchData && searchData.length === 0 && (
          <Box overflowX="auto">
            <Table
              variant="simple"
              colorScheme="orange"
              mt={8}
              whiteSpace="nowrap"
            >
              <TableCaption>Lista de Cortes</TableCaption>
              <Thead>
                <Tr>
                  <Th>Código</Th>
                  <Th>Cliente</Th>
                  {ordersFilter !== 'Orçamento' && <Th>Loja</Th>}
                  <Th>Status</Th>
                  {ordersFilter !== 'Orçamento' && (
                    <Th isNumeric>Data de Entrega</Th>
                  )}
                  <Th isNumeric>Preço</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {/* Table in case of NOT estimate */}
                {ordersFilter !== 'Orçamento' &&
                  ordersData
                    ?.sort((a, b) => b.orderCode - a.orderCode)
                    .map(order => (
                      <Tr key={order.id}>
                        <Td>{order.orderCode}</Td>
                        <Td>{order.customer.name}</Td>
                        <Td>{order.orderStore}</Td>
                        <Td>{order.orderStatus}</Td>
                        <Td isNumeric>
                          {format(
                            new Date(order.deliveryDate.seconds * 1000),
                            'dd/MM/yyyy',
                          )}
                        </Td>
                        <Td isNumeric>{`R$ ${order.orderPrice},00`}</Td>
                        <Td>
                          <HStack spacing={4}>
                            <OrderResume order={order} />

                            <Tags order={order} />

                            <IconButton
                              colorScheme="orange"
                              size="sm"
                              onClick={() => handleRemove(order.id, 'orders')}
                              aria-label="Remover"
                              icon={<FaTrash />}
                              disabled
                            />
                            {order.orderStatus !== 'Concluído' && (
                              <>
                                <IconButton
                                  colorScheme="orange"
                                  size="sm"
                                  disabled
                                  aria-label="Editar"
                                  icon={<FaEdit />}
                                />
                                <IconButton
                                  colorScheme="orange"
                                  size="sm"
                                  aria-label="Concluir"
                                  onClick={() => updateCutlistStatus(order.id)}
                                  icon={<FaCheck />}
                                />
                              </>
                            )}
                          </HStack>
                        </Td>
                      </Tr>
                    ))}

                {/* Table in case of estimate */}
                {ordersFilter === 'Orçamento' &&
                  ordersData
                    ?.sort((a, b) => b.estimateCode - a.estimateCode)
                    .map(estimate => (
                      <Tr key={estimate.id}>
                        <Td>{estimate.estimateCode}</Td>
                        <Td>{estimate.name}</Td>
                        <Td>Orçamento</Td>
                        <Td isNumeric>{`R$ ${estimate.estimatePrice},00`}</Td>
                        <Td>
                          <HStack spacing={4}>
                            <EstimateResume estimate={estimate} />

                            <IconButton
                              colorScheme="orange"
                              size="sm"
                              aria-label="Remover"
                              disabled
                              onClick={() =>
                                handleRemove(estimate.id, 'estimates')
                              }
                              icon={<FaTrash />}
                            />

                            <IconButton
                              colorScheme="orange"
                              size="sm"
                              aria-label="Aprovar"
                              icon={<FaHandshake />}
                              onClick={() => approveEstimate(estimate.id)}
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* Lista de cortes caso não exista busca */}
        {searchData && searchData.length > 0 && (
          <Box overflowX="auto">
            <Table
              variant="simple"
              colorScheme="orange"
              mt={8}
              whiteSpace="nowrap"
            >
              <TableCaption>Lista de Cortes</TableCaption>
              <Thead>
                <Tr>
                  <Th>Código</Th>
                  <Th>Cliente</Th>
                  {ordersFilter !== 'Orçamento' && <Th>Loja</Th>}
                  <Th>Status</Th>
                  {ordersFilter !== 'Orçamento' && (
                    <Th isNumeric>Data de Entrega</Th>
                  )}
                  <Th isNumeric>Preço</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {/* Table in case of NOT estimate */}
                {searchType !== 'estimates' &&
                  searchData
                    ?.sort((a, b) => b.orderCode - a.orderCode)
                    .map(order => (
                      <Tr key={order.id}>
                        <Td>{order.orderCode}</Td>
                        <Td>{order.customer.name}</Td>
                        <Td>{order.orderStore}</Td>
                        <Td>{order.orderStatus}</Td>
                        <Td isNumeric>
                          {format(
                            new Date(order.deliveryDate.seconds * 1000),
                            'dd/MM/yyyy',
                          )}
                        </Td>
                        <Td isNumeric>{`R$ ${order.orderPrice},00`}</Td>
                        <Td>
                          <HStack spacing={4}>
                            <OrderResume order={order} />

                            <Tags order={order} />

                            <IconButton
                              colorScheme="orange"
                              size="sm"
                              onClick={() => handleRemove(order.id, 'orders')}
                              aria-label="Remover"
                              disabled
                              icon={<FaTrash />}
                            />
                            {order.orderStatus !== 'Concluído' && (
                              <>
                                <IconButton
                                  colorScheme="orange"
                                  size="sm"
                                  disabled
                                  aria-label="Editar"
                                  icon={<FaEdit />}
                                />
                                <IconButton
                                  colorScheme="orange"
                                  size="sm"
                                  aria-label="Concluir"
                                  onClick={() => updateCutlistStatus(order.id)}
                                  icon={<FaCheck />}
                                />
                              </>
                            )}
                          </HStack>
                        </Td>
                      </Tr>
                    ))}

                {/* Table in case of estimate */}
                {searchType === 'estimates' &&
                  searchData
                    ?.sort((a, b) => b.estimateCode - a.estimateCode)
                    .map(estimate => (
                      <Tr key={estimate.id}>
                        <Td>{estimate.estimateCode}</Td>
                        <Td>{estimate.name}</Td>
                        <Td>Orçamento</Td>
                        <Td isNumeric>{`R$ ${estimate.estimatePrice},00`}</Td>
                        <Td>
                          <HStack spacing={4}>
                            <EstimateResume estimate={estimate} />

                            <IconButton
                              colorScheme="orange"
                              size="sm"
                              aria-label="Remover"
                              disabled
                              onClick={() =>
                                handleRemove(estimate.id, 'estimates')
                              }
                              icon={<FaTrash />}
                            />

                            <IconButton
                              colorScheme="orange"
                              size="sm"
                              aria-label="Aprovar"
                              icon={<FaHandshake />}
                              onClick={() => approveEstimate(estimate.id)}
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* Table in case of search */}
      </Dashboard>
    </>
  );
};

export default withAuthUser({
  whenAuthed: AuthAction.RENDER,
  whenUnauthedAfterInit: AuthAction.REDIRECT_TO_LOGIN,
  whenUnauthedBeforeInit: AuthAction.SHOW_LOADER,
  authPageURL: '/login',
  LoaderComponent: Loader,
})(Cortes);
