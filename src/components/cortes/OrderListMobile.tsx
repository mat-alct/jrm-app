/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Box,
  Button,
  Center,
  Flex,
  IconButton,
  Spinner,
  Stack,
  Text,
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

type EstimateCardProps = {
  item: any;
} & Pick<OrderListCallbacks, 'onPrintResume' | 'onApproveEstimate'>;

const EstimateCard = React.memo<EstimateCardProps>(
  ({ item, onPrintResume, onApproveEstimate }) => (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      shadow="sm"
      p={4}
    >
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontSize="sm" color="gray.500" fontWeight="bold">
          #{item.estimateCode}
        </Text>
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
      </Flex>
      <Text fontSize="lg" fontWeight="bold" color="gray.800">
        {item.name}
      </Text>
      <Text fontSize="lg" fontWeight="bold" color="orange.600" mt={2}>
        R$ {item.estimatePrice},00
      </Text>
      <Stack direction="row" gap={2} mt={3} justify="space-between">
        <Button
          flex="1"
          size="md"
          variant="outline"
          colorScheme="gray"
          onClick={() => onPrintResume(item, 'estimate')}
        >
          <FaRegFileAlt /> Resumo
        </Button>
        <Button
          flex="1"
          size="md"
          colorScheme="green"
          onClick={() => onApproveEstimate(item.id)}
        >
          <FaHandshake /> Aprovar
        </Button>
      </Stack>
    </Box>
  ),
);
EstimateCard.displayName = 'EstimateCard';

type OrderCardProps = {
  item: any;
} & Pick<
  OrderListCallbacks,
  | 'onPrintResume'
  | 'onPrintLabels'
  | 'onShowHistory'
  | 'onConfirmStatus'
  | 'onEdit'
  | 'onDeactivate'
>;

const OrderCard = React.memo<OrderCardProps>(
  ({
    item,
    onPrintResume,
    onPrintLabels,
    onShowHistory,
    onConfirmStatus,
    onEdit,
    onDeactivate,
  }) => {
    const isUrgent = item?.isUrgent;
    const isDeactivated = item?.isDeactivated === true;
    const statusBg = isDeactivated
      ? 'gray.200'
      : item.orderStatus === 'Concluído'
        ? 'green.100'
        : item.orderStatus === 'Em Produção'
          ? 'orange.100'
          : 'blue.100';
    const statusColor = isDeactivated
      ? 'gray.600'
      : item.orderStatus === 'Concluído'
        ? 'green.800'
        : item.orderStatus === 'Em Produção'
          ? 'orange.800'
          : 'blue.800';
    const nextLabel =
      item.orderStatus === 'Em Produção'
        ? 'Liberar para Transporte'
        : item.orderStatus === 'Liberado para Transporte'
          ? 'Concluir pedido'
          : null;

    const cardBg = isDeactivated
      ? 'gray.100'
      : isUrgent
        ? 'red.50'
        : 'white';
    const cardBorder = isDeactivated
      ? 'gray.300'
      : isUrgent
        ? 'red.300'
        : 'gray.200';

    return (
      <Box
        bg={cardBg}
        borderWidth="1px"
        borderColor={cardBorder}
        borderRadius="xl"
        shadow="sm"
        p={4}
        opacity={isDeactivated ? 0.75 : 1}
      >
        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize="sm" color="gray.500" fontWeight="bold">
            #{item.orderCode}
          </Text>
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
            bg={statusBg}
            color={statusColor}
          >
            {isUrgent && <FaExclamationTriangle />}
            {isDeactivated ? 'Desativado' : item.orderStatus}
            {item.edits?.length > 0 && <FaHistory />}
          </Box>
        </Flex>

        <Text
          fontSize="lg"
          fontWeight="bold"
          color={isDeactivated ? 'gray.500' : 'gray.800'}
          textDecoration={isDeactivated ? 'line-through' : undefined}
        >
          {item.customer?.name || 'Cliente Removido'}
        </Text>
        {item.customer?.telephone && (
          <Text fontSize="sm" color="gray.600">
            {item.customer.telephone}
          </Text>
        )}

        <Flex
          justify="space-between"
          align="center"
          mt={2}
          gap={3}
          wrap="wrap"
        >
          <Text fontSize="xs" color="gray.500">
            {item.deliveryDate?.seconds
              ? `Entrega ${format(new Date(item.deliveryDate.seconds * 1000), 'dd/MM/yyyy')}`
              : 'Sem data de entrega'}
          </Text>
          <Text
            fontSize="lg"
            fontWeight="bold"
            color={isDeactivated ? 'gray.500' : 'orange.600'}
            textDecoration={isDeactivated ? 'line-through' : undefined}
          >
            R$ {(item.orderPrice ?? 0) + (item.freightPrice ?? 0)},00
          </Text>
        </Flex>

        <Flex gap={2} mt={3} wrap="wrap">
          {item.edits?.length > 0 && (
            <IconButton
              size="md"
              variant="outline"
              colorScheme="purple"
              aria-label="Histórico de edições"
              onClick={() => onShowHistory(item)}
            >
              <FaHistory />
            </IconButton>
          )}
          <Button
            flex="1"
            minW="100px"
            size="md"
            variant="outline"
            colorScheme="gray"
            onClick={() => onPrintResume(item, 'order')}
          >
            <FaRegFileAlt /> Resumo
          </Button>
          <Button
            flex="1"
            minW="100px"
            size="md"
            variant="outline"
            colorScheme="gray"
            onClick={() => onPrintLabels(item)}
          >
            <FaTags /> Etiquetas
          </Button>
          {!isDeactivated && item.orderStatus === 'Em Produção' && (
            <IconButton
              size="md"
              variant="outline"
              colorScheme="blue"
              aria-label="Editar"
              onClick={() => onEdit(item.id)}
            >
              <FaEdit />
            </IconButton>
          )}
          {!isDeactivated && item.orderStatus !== 'Concluído' && (
            <IconButton
              size="md"
              variant="outline"
              colorScheme="red"
              aria-label="Desativar"
              onClick={() => onDeactivate(item)}
            >
              <FaTrash />
            </IconButton>
          )}
        </Flex>

        {!isDeactivated && nextLabel && (
          <Button
            mt={3}
            w="100%"
            size="lg"
            colorScheme="green"
            onClick={() => onConfirmStatus(item)}
          >
            <FaCheck /> {nextLabel}
          </Button>
        )}
      </Box>
    );
  },
);
OrderCard.displayName = 'OrderCard';

const OrderListMobileImpl: React.FC<OrderListProps> = ({
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
  if (isLoading) {
    return (
      <Center p={10}>
        <Spinner color="orange.500" />
      </Center>
    );
  }

  if (!items?.length) {
    return (
      <Box
        bg="white"
        borderWidth="1px"
        borderRadius="lg"
        shadow="sm"
        p={6}
        textAlign="center"
        color="gray.600"
      >
        Nenhum registro encontrado
      </Box>
    );
  }

  return (
    <Stack gap={3}>
      <Text fontSize="xs" color="gray.500" px={1}>
        {`${items.length} registro(s) ${searchQuery ? 'encontrados' : 'nesta página'}`}
      </Text>
      {items.map((item: any) =>
        isEstimateList ? (
          <EstimateCard
            key={item.id}
            item={item}
            onPrintResume={onPrintResume}
            onApproveEstimate={onApproveEstimate}
          />
        ) : (
          <OrderCard
            key={item.id}
            item={item}
            onPrintResume={onPrintResume}
            onPrintLabels={onPrintLabels}
            onShowHistory={onShowHistory}
            onConfirmStatus={onConfirmStatus}
            onEdit={onEdit}
            onDeactivate={onDeactivate}
          />
        ),
      )}
    </Stack>
  );
};

export const OrderListMobile = React.memo(OrderListMobileImpl);
OrderListMobile.displayName = 'OrderListMobile';

export default OrderListMobile;
