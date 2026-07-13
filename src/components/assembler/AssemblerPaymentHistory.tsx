import { Box, Button, Flex, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { FiCreditCard } from 'react-icons/fi';

import { AppCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusPill } from '@/components/ui/status-pill';
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
  const getStatusPalette = (status: AssemblerPayment['status']) => {
    if (status === 'confirmado_pelo_montador') return 'green';
    if (status === 'pago') return 'blue';
    return 'yellow';
  };

  return (
    <AppCard title="Pagamentos">
      <VStack align="stretch" gap={3}>
        {payments.length === 0 ? (
          <EmptyState
            icon={FiCreditCard}
            title="Nenhum pagamento registrado"
            description="Os pagamentos confirmados e em processamento aparecem aqui."
          />
        ) : (
          payments.map(payment => (
            <Flex
              key={payment.id}
              borderTop="1px solid"
              borderColor="app.border"
              gap={3}
              justify="space-between"
              align={{ base: 'stretch', md: 'center' }}
              pt={3}
              wrap="wrap"
            >
              <Box>
                <Text
                  fontWeight="600"
                  color="app.text"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatAssemblerCurrency(payment.amount)}
                </Text>
                <StatusPill
                  mt={2}
                  palette={getStatusPalette(payment.status)}
                  label={payment.status}
                />
              </Box>
              <Flex align="center" gap={2} wrap="wrap">
                {payment.proofStoragePath ? (
                  <Text color="app.textMuted" fontSize="sm">
                    Comprovante anexado
                  </Text>
                ) : null}
                {payment.status === 'pago' && onConfirm ? (
                  <Button
                    size="sm"
                    loading={isBusy}
                    bg="app.ink"
                    color="white"
                    rounded="lg"
                    fontWeight="600"
                    _hover={{ bg: 'app.inkHover' }}
                    _focusVisible={{ shadow: 'focus', outline: 'none' }}
                    onClick={() => {
                      void onConfirm(payment.id);
                    }}
                  >
                    Confirmar recebimento
                  </Button>
                ) : null}
              </Flex>
            </Flex>
          ))
        )}
      </VStack>
    </AppCard>
  );
}
