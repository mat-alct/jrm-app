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

import type { OrderListCallbacks, OrderListProps } from './OrderListTypes';

type RowVisualProps = {
  bg: string;
  hoverBg: string;
};

type EstimateRowProps = {
  item: any;
} & RowVisualProps &
  Pick<OrderListCallbacks, 'onPrintResume' | 'onApproveEstimate'>;

const EstimateRow = React.memo<EstimateRowProps>(
  ({ item, bg, hoverBg, onPrintResume, onApproveEstimate }) => (
    <Table.Row bg={bg} _hover={{ bg: hoverBg }}>
      <Table.Cell fontWeight="bold">{item.estimateCode}</Table.Cell>
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
  ),
);
EstimateRow.displayName = 'EstimateRow';

type OrderRowProps = {
  item: any;
} & RowVisualProps &
  Pick<
    OrderListCallbacks,
    | 'onPrintResume'
    | 'onPrintLabels'
    | 'onShowHistory'
    | 'onConfirmStatus'
    | 'onEdit'
    | 'onDeactivate'
  >;

const OrderRow = React.memo<OrderRowProps>(
  ({
    item,
    bg,
    hoverBg,
    onPrintResume,
    onPrintLabels,
    onShowHistory,
    onConfirmStatus,
    onEdit,
    onDeactivate,
  }) => {
    const isUrgent = item?.isUrgent;
    const isDeactivated = item?.isDeactivated === true;
    return (
      <Table.Row
        bg={bg}
        _hover={{ bg: hoverBg }}
        opacity={isDeactivated ? 0.65 : 1}
        color={isDeactivated ? 'gray.500' : undefined}
        textDecoration={isDeactivated ? 'line-through' : undefined}
      >
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
              isDeactivated
                ? 'gray.200'
                : item.orderStatus === 'Concluído'
                  ? 'green.100'
                  : item.orderStatus === 'Em Produção'
                    ? 'orange.100'
                    : 'blue.100'
            }
            color={
              isDeactivated
                ? 'gray.600'
                : item.orderStatus === 'Concluído'
                  ? 'green.800'
                  : item.orderStatus === 'Em Produção'
                    ? 'orange.800'
                    : 'blue.800'
            }
          >
            {isUrgent && <FaExclamationTriangle />}
            {isDeactivated ? 'Desativado' : item.orderStatus}
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
            ? format(new Date(item.deliveryDate.seconds * 1000), 'dd/MM/yyyy')
            : '-'}
        </Table.Cell>
        <Table.Cell
          textAlign="right"
          fontWeight="bold"
        >{`R$ ${(item.orderPrice ?? 0) + (item.freightPrice ?? 0)},00`}</Table.Cell>
        <Table.Cell>
          <HStack gap={2} justify="flex-end">
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
            {!isDeactivated && item.orderStatus === 'Em Produção' && (
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
            {!isDeactivated && item.orderStatus !== 'Concluído' && (
              <IconButton
                colorScheme="red"
                variant="ghost"
                size="sm"
                aria-label="Desativar"
                onClick={() => onDeactivate(item)}
                title="Desativar pedido"
              >
                <FaTrash />
              </IconButton>
            )}
            {!isDeactivated && item.orderStatus !== 'Concluído' && (
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
  },
);
OrderRow.displayName = 'OrderRow';

const OrderListDesktopImpl: React.FC<OrderListProps> = ({
  items,
  isEstimateList,
  isLoading,
  searchQuery,
  onPrintResume,
  onPrintLabels,
  onApproveEstimate,
  onShowHistory,
  onConfirmStatus,
  onEdit,
  onDeactivate,
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
              const isDeactivated = item?.isDeactivated === true;
              let bg = isEven ? 'white' : 'gray.50';
              let hoverBg = isEven ? 'gray.50' : 'gray.100';

              if (isUrgent && !isEstimateList && !isDeactivated) {
                bg = 'red.50';
                hoverBg = 'red.100';
              }
              if (isDeactivated) {
                bg = 'gray.100';
                hoverBg = 'gray.200';
              }

              return isEstimateList ? (
                <EstimateRow
                  key={item.id}
                  item={item}
                  bg={bg}
                  hoverBg={hoverBg}
                  onPrintResume={onPrintResume}
                  onApproveEstimate={onApproveEstimate}
                />
              ) : (
                <OrderRow
                  key={item.id}
                  item={item}
                  bg={bg}
                  hoverBg={hoverBg}
                  onPrintResume={onPrintResume}
                  onPrintLabels={onPrintLabels}
                  onShowHistory={onShowHistory}
                  onConfirmStatus={onConfirmStatus}
                  onEdit={onEdit}
                  onDeactivate={onDeactivate}
                />
              );
            })}
          </Table.Body>
        </Table.Root>
      )}
    </Box>
  );
};

export const OrderListDesktop = React.memo(OrderListDesktopImpl);
OrderListDesktop.displayName = 'OrderListDesktop';

export default OrderListDesktop;
