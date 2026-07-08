import { Box, Button, Flex, Text, VStack } from '@chakra-ui/react';
import React from 'react';

import { AssemblerPayment } from '@/types/projects';

import { formatAssemblerCurrency } from './AssemblerFinanceSummary';

interface AssemblerPaymentHistoryProps {
  payments: AssemblerPayment[];
  isBusy?: boolean;
  onConfirm?: (paymentId: string) => Promise<void> | void;
}

export function AssemblerPaymentHistory({
  payments,
  isBusy = false,
  onConfirm,
}: AssemblerPaymentHistoryProps) {
  return (
    <Box bg="white" borderRadius="8px" boxShadow="sm" p={4}>
      <VStack align="stretch" gap={3}>
        <Text fontSize="lg" fontWeight="800">
          Pagamentos
        </Text>
        {payments.length === 0 ? (
          <Text color="gray.600">Nenhum pagamento registrado.</Text>
        ) : (
          payments.map(payment => (
            <Flex
              key={payment.id}
              borderTop="1px solid"
              borderColor="gray.100"
              gap={3}
              justify="space-between"
              pt={3}
              wrap="wrap"
            >
              <Box>
                <Text fontWeight="800">
                  {formatAssemblerCurrency(payment.amount)}
                </Text>
                <Text color="gray.600" fontSize="sm">
                  {payment.status}
                </Text>
              </Box>
              {payment.proofStoragePath ? (
                <Text color="gray.600" fontSize="sm">
                  Comprovante anexado
                </Text>
              ) : null}
              {payment.status === 'pago' && onConfirm ? (
                <Button
                  size="sm"
                  loading={isBusy}
                  onClick={() => onConfirm(payment.id)}
                >
                  Confirmar recebimento
                </Button>
              ) : null}
            </Flex>
          ))
        )}
      </VStack>
    </Box>
  );
}
