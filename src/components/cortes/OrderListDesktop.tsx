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
  FaFileArchive,
  FaHandshake,
  FaHistory,
  FaPrint,
  FaRegFileAlt,
  FaTags,
  FaTrash,
} from 'react-icons/fa';

import { formatBRL } from '@/utils/formatBRL';

import type {
  EstimateDocument,
  OrderDocument,
  OrderListCallbacks,
  OrderListProps,
} from './OrderListTypes';

type RowVisualProps = {
  bg: string;
  hoverBg: string;
};

type EstimateRowProps = {
  item: EstimateDocument;
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
  item: OrderDocument;
} & RowVisualProps &
  Pick<
    OrderListCallbacks,
    | 'onPrintResume'
    | 'onPrintLabels'
    | 'onPrintCuttingPlan'
    | 'onDownloadMachineFiles'
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
    onPrintCuttingPlan,
    onDownloadMachineFiles,
    onShowHistory,
    onConfirmStatus,
    onEdit,
    onDeactivate,
  }) => {
    const isUrgent = item?.isUrgent;
    const isDeactivated = item?.isDeactivated === true;
    const hasCuttingPlan =
      item?.serviceType === 'cutting_plan' &&
      item?.cuttingPlan &&
      item.cuttingPlan.status !== 'outdated';
    const edits = item.edits ?? [];
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
            {edits.length > 0 && (
              <Box
                as="span"
                title={`Editado ${edits.length}× — última: ${edits[edits.length - 1]?.editedBy}`}
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
        <Table.Cell textAlign="right" fontWeight="bold">
          {formatBRL((item.orderPrice ?? 0) + (item.freightPrice ?? 0))}
        </Table.Cell>
        <Table.Cell>
          <HStack gap={2} justify="flex-end">
            {hasCuttingPlan && (
              <IconButton
                colorScheme="gray"
                variant="outline"
                size="sm"
                aria-label="Imprimir plano de corte"
                title="Imprimir somente o plano de corte"
                onClick={() => onPrintCuttingPlan(item)}
              >
                <FaPrint />
              </IconButton>
            )}
            {hasCuttingPlan && (
              <IconButton
                colorScheme="gray"
                variant="outline"
                size="sm"
                aria-label="Baixar arquivos AC e AD"
                title="Baixar ZIP para a seccionadora"
                onClick={() => onDownloadMachineFiles(item)}
              >
                <FaFileArchive />
              </IconButton>
            )}
            {edits.length > 0 && (
              <IconButton
                aria-label="Histórico de edições"
                variant="ghost"
                colorScheme="purple"
                size="sm"
                onClick={() => onShowHistory(item)}
                title={`${edits.length} edição(ões)`}
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
  onPrintCuttingPlan,
  onDownloadMachineFiles,
  onApproveEstimate,
  onShowHistory,
  onConfirmStatus,
  onEdit,
  onDeactivate,
}) => {
  const tableSize =
    useBreakpointValue<'sm' | 'md'>(['sm', 'md'], { fallback: 'sm' }) ?? 'sm';

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
            {items.map((item, index) => {
              const isEven = index % 2 === 0;
              const isOrder = 'orderCode' in item;
              const isUrgent = isOrder && item.isUrgent;
              const isDeactivated = isOrder && item.isDeactivated === true;
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

              return 'estimateCode' in item ? (
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
                  onPrintCuttingPlan={onPrintCuttingPlan}
                  onDownloadMachineFiles={onDownloadMachineFiles}
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
