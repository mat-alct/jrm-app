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
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { FaCheck, FaEdit, FaRegFileAlt, FaTag, FaTrash } from 'react-icons/fa';
import { useQuery } from 'react-query';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { useOrder } from '../../hooks/order';

const Cortes: React.FC = () => {
  const [ordersFilter, setOrdersFilter] = useState('Em produção');
  const { getOrders } = useOrder();

  const { data: ordersData } = useQuery(['orders', ordersFilter], () =>
    getOrders(ordersFilter),
  );

  return (
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
            <Th>Loja</Th>
            <Th>Status</Th>
            <Th isNumeric>Data de Entrega</Th>
            <Th isNumeric>Preço</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {ordersData
            ?.sort((a, b) => b.orderCode - a.orderCode)
            .map(order => (
              <Tr key={order.id}>
                <Td>{order.orderCode}</Td>
                <Td>{order.customer.name}</Td>
                <Td>{order.orderStore}</Td>
                <Td>{order.orderStatus}</Td>
                <Td isNumeric>25/11/21</Td>
                <Td isNumeric>{`R$ ${
                  order.orderPrice || order.estimatePrice
                },00`}</Td>
                <Td>
                  <HStack spacing={4}>
                    <IconButton
                      colorScheme="orange"
                      size="sm"
                      aria-label="Remover"
                      icon={<FaRegFileAlt />}
                    />
                    <IconButton
                      colorScheme="orange"
                      size="sm"
                      aria-label="Remover"
                      icon={<FaTag />}
                    />

                    <IconButton
                      colorScheme="orange"
                      size="sm"
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
        </Tbody>
      </Table>
    </Dashboard>
  );
};

export default Cortes;
