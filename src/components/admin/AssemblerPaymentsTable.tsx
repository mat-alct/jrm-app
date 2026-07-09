import { Button, Flex, Input, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { FiCreditCard } from 'react-icons/fi';

import { AppCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PendingByAssembler } from '@/services/projects/payment.service';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface AssemblerPaymentsTableProps {
  groups: PendingByAssembler[];
  isBusy?: boolean;
  onPay: (
    projectId: string,
    itemId: string,
    assignmentId: string,
    proofFile: File,
  ) => Promise<void> | void;
}

export function AssemblerPaymentsTable({
  groups,
  isBusy = false,
  onPay,
}: AssemblerPaymentsTableProps) {
  const [files, setFiles] = React.useState<Record<string, File | undefined>>({});

  return (
    <VStack align="stretch" gap={4}>
      {groups.length === 0 ? (
        <AppCard>
          <EmptyState
            icon={FiCreditCard}
            title="Nenhuma pendência liberada"
            description="Quando um item concluir a montagem e liberar pagamento, ele aparece aqui."
          />
        </AppCard>
      ) : (
        groups.map(group => (
          <AppCard key={group.assemblerId}>
            <VStack align="stretch" gap={3}>
              <Flex justify="space-between" gap={3} wrap="wrap">
                <Text fontSize="lg" fontWeight="600" color="app.text">
                  {group.assemblerName ?? group.assemblerId}
                </Text>
                <Text fontWeight="600" color="app.text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(group.total)}
                </Text>
              </Flex>
              {group.assignments.map(assignment => (
                <Flex
                  key={assignment.id}
                  borderTop="1px solid"
                  borderColor="app.border"
                  gap={3}
                  justify="space-between"
                  align={{ base: 'stretch', md: 'center' }}
                  pt={3}
                  wrap="wrap"
                >
                  <VStack align="stretch" gap={1}>
                    <Text fontWeight="600" color="app.text">
                      {assignment.customerName} · {assignment.itemName}
                    </Text>
                    <Text color="app.textSecondary" fontSize="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(assignment.amountToReceive)}
                    </Text>
                  </VStack>
                  <Input
                    maxW="260px"
                    type="file"
                    bg="app.surface"
                    borderColor="app.borderStrong"
                    rounded="lg"
                    _focusVisible={{
                      borderColor: 'app.accent',
                      shadow: 'focus',
                      outline: 'none',
                    }}
                    onChange={event =>
                      setFiles(current => ({
                        ...current,
                        [assignment.id]: event.target.files?.[0],
                      }))
                    }
                  />
                  <Button
                    loading={isBusy}
                    disabled={!files[assignment.id]}
                    bg="app.ink"
                    color="white"
                    rounded="lg"
                    fontWeight="600"
                    _hover={{ bg: 'app.inkHover' }}
                    _focusVisible={{ shadow: 'focus', outline: 'none' }}
                    onClick={() => {
                      if (!files[assignment.id]) return;
                      void onPay(
                        assignment.projectId,
                        assignment.itemId,
                        assignment.id,
                        files[assignment.id]!,
                      );
                    }}
                  >
                    Pagar
                  </Button>
                </Flex>
              ))}
            </VStack>
          </AppCard>
        ))
      )}
    </VStack>
  );
}
