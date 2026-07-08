import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import React from 'react';

import { AssemblerAssignment } from '@/types/projects';

interface AssemblerFinanceSummaryProps {
  assignments: AssemblerAssignment[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function AssemblerFinanceSummary({
  assignments,
}: AssemblerFinanceSummaryProps) {
  const pending = assignments
    .filter(assignment => assignment.paymentStatus === 'pendente')
    .reduce((sum, assignment) => sum + assignment.amountToReceive, 0);
  const waitingConfirmation = assignments
    .filter(assignment => assignment.paymentStatus === 'pago')
    .reduce((sum, assignment) => sum + assignment.amountToReceive, 0);

  return (
    <Box bg="white" borderRadius="8px" boxShadow="sm" p={4}>
      <VStack align="stretch" gap={3}>
        <Text fontSize="lg" fontWeight="800">
          Resumo financeiro
        </Text>
        <Flex justify="space-between" gap={3}>
          <Text color="gray.600">A receber</Text>
          <Text fontWeight="900">{formatCurrency(pending)}</Text>
        </Flex>
        <Flex justify="space-between" gap={3}>
          <Text color="gray.600">Aguardando confirmação</Text>
          <Text fontWeight="900">{formatCurrency(waitingConfirmation)}</Text>
        </Flex>
      </VStack>
    </Box>
  );
}

export { formatCurrency as formatAssemblerCurrency };
