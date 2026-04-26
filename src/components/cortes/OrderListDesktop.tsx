/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Box,
  Center,
  Flex,
  HStack,
  IconButton,
  Spinner,
  Table,
  TableCaption,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import React from 'react';
import {
  FaCheck,
  FaEdit,
  FaExclamationTriangle,
  FaHandshake,
  FaHistory,
  FaRegFileAlt,
  FaTags,
  FaTrash,
} from 'react-icons/fa';

import type { OrderListProps } from './OrderListTypes';

export const OrderListDesktop: React.FC<OrderListProps> = ({
  items,
  isEstimateList,
  isLoading,
  searchQuery,
  onPrintResume,
  onPrintLabels,
  onApproveEstimate,
  onRemove,
  onShowHistory,
  onConfirmStatus,
  onEdit,
}) => {
  const tableSize = useBreakpointValue(['sm', 'md'], { fallback: 'sm' });

  return (
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
          <TableCaption mt={4} mb={4} textAlign="left" px={4}>
            {items?.length
              ? `${items.length} registro(s) ${searchQuery ? 'encontrados' : 'nesta página'}`
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
              <Table.ColumnHeader textAlign="right">Preço</Table.ColumnHeader>
              <Table.ColumnHeader width="1%">Ações</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((item: any, index: number) => {
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
                        <IconButton
                          colorScheme="gray"
                          variant="ghost"
                          size="sm"
                          aria-label="Imprimir Orçamento"
                          onClick={() => onPrintResume(item, 'estimate')}
                        >
                          <FaRegFileAlt />
                        </IconButton>
                        <IconButton
                          colorScheme="red"
                          variant="ghost"
                          size="sm"
                          aria-label="Remover"
                          onClick={() => onRemove(item.id, 'estimates')}
                        >
                          <FaTrash />
                        </IconButton>
                        <IconButton
                          colorScheme="green"
                          size="sm"
                          aria-label="Aprovar"
                          onClick={() => onApproveEstimate(item.id)}
                        >
                          <FaHandshake />
                        </IconButton>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                );
              }

              return (
                <Table.Row key={item.id} bg={rowBg} _hover={{ bg: hoverBg }}>
                  <Table.Cell fontWeight="bold">{item.orderCode}</Table.Cell>
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
                      <IconButton
                        colorScheme="gray"
                        variant="ghost"
                        size="sm"
                        aria-label="Imprimir Resumo"
                        onClick={() => onPrintResume(item, 'order')}
                      >
                        <FaRegFileAlt />
                      </IconButton>
                      <IconButton
                        aria-label="Etiquetas"
                        variant="ghost"
                        colorScheme="gray"
                        size="sm"
                        onClick={() => onPrintLabels(item)}
                      >
                        <FaTags />
                      </IconButton>
                      {item.edits?.length > 0 && (
                        <IconButton
                          aria-label="Histórico de edições"
                          variant="ghost"
                          colorScheme="purple"
                          size="sm"
                          onClick={() => onShowHistory(item)}
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
                          onClick={() => onEdit(item.id)}
                        >
                          <FaEdit />
                        </IconButton>
                      )}
                      {item.orderStatus !== 'Concluído' && (
                        <IconButton
                          colorScheme="green"
                          size="sm"
                          aria-label="Concluir"
                          onClick={() => onConfirmStatus(item)}
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
      )}
    </Box>
  );
};

export default OrderListDesktop;
