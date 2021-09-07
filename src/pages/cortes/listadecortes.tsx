import {
  HStack,
  IconButton,
  Radio,
  RadioGroup,
  Table,
  TableCaption,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import firebase from 'firebase/app';
import Head from 'next/head';
import Router from 'next/router';
import React, { useState } from 'react';
import {
  FaCheck,
  FaEdit,
  FaHandshake,
  FaRegFileAlt,
  FaTrash,
} from 'react-icons/fa';
import { useQuery } from 'react-query';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Tags } from '../../components/Printables/Tags';
import { useOrder } from '../../hooks/order';
import { Estimate } from '../../types';

const Cortes: React.FC = () => {
  const [ordersFilter, setOrdersFilter] = useState('Em produção');
  const toast = useToast();
  const { getOrders } = useOrder();

  const { data: ordersData, refetch } = useQuery(['orders', ordersFilter], () =>
    getOrders(ordersFilter),
  );

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

  return (
    <>
      <Head>
        <title>Cortes | JRM Compensados</title>
      </Head>

      <Dashboard>
        <Header pageTitle="Lista de Cortes">
          <RadioGroup
            colorScheme="orange"
            size="lg"
            value={ordersFilter}
            onChange={setOrdersFilter}
          >
            <HStack spacing={4}>
              <Radio
                isChecked
                id="Em produção"
                name="Em produção"
                value="Em produção"
              >
                Em produção
              </Radio>
              <Radio
                id="Liberado para transporte"
                name="Liberado para transporte"
                value="Liberado para transporte"
              >
                Liberados para transporte
              </Radio>
              <Radio id="Concluído" name="Concluído" value="Concluído">
                Concluídos
              </Radio>
              <Radio id="Orçamento" name="Orçamento" value="Orçamento">
                Orçamentos
              </Radio>
            </HStack>
          </RadioGroup>
        </Header>
        <Table variant="simple" colorScheme="orange">
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
                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Remover"
                          icon={<FaRegFileAlt />}
                        />

                        <Tags order={order} />

                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          onClick={() => handleRemove(order.id, 'orders')}
                          aria-label="Remover"
                          icon={<FaTrash />}
                        />
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
                          icon={<FaCheck />}
                        />
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
                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Comprovante"
                          icon={<FaRegFileAlt />}
                        />

                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Remover"
                          onClick={() => handleRemove(estimate.id, 'estimates')}
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
      </Dashboard>
    </>
  );
};

export default Cortes;
