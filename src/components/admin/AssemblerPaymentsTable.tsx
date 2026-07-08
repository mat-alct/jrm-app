import { Box, Button, Flex, Input, Text, VStack } from '@chakra-ui/react';
import React from 'react';

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
        <Box bg="white" borderRadius="8px" p={4}>
          <Text color="gray.600">Nenhuma pendência liberada para pagamento.</Text>
        </Box>
      ) : (
        groups.map(group => (
          <Box key={group.assemblerId} bg="white" borderRadius="8px" boxShadow="sm" p={4}>
            <VStack align="stretch" gap={3}>
              <Flex justify="space-between" gap={3} wrap="wrap">
                <Text fontSize="lg" fontWeight="900">
                  {group.assemblerName ?? group.assemblerId}
                </Text>
                <Text fontWeight="900">{formatCurrency(group.total)}</Text>
              </Flex>
              {group.assignments.map(assignment => (
                <Flex
                  key={assignment.id}
                  borderTop="1px solid"
                  borderColor="gray.100"
                  gap={3}
                  justify="space-between"
                  pt={3}
                  wrap="wrap"
                >
                  <Box>
                    <Text fontWeight="800">
                      {assignment.customerName} · {assignment.itemName}
                    </Text>
                    <Text color="gray.600" fontSize="sm">
                      {formatCurrency(assignment.amountToReceive)}
                    </Text>
                  </Box>
                  <Input
                    maxW="260px"
                    type="file"
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
                    onClick={() =>
                      files[assignment.id] &&
                      onPay(
                        assignment.projectId,
                        assignment.itemId,
                        assignment.id,
                        files[assignment.id]!,
                      )
                    }
                  >
                    Pagar
                  </Button>
                </Flex>
              ))}
            </VStack>
          </Box>
        ))
      )}
    </VStack>
  );
}
