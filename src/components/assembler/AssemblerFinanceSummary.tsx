import { SimpleGrid } from '@chakra-ui/react';
import React from 'react';

import { StatCard } from '@/components/ui/stat-card';
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
    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
      <StatCard label="A receber" value={formatCurrency(pending)} />
      <StatCard
        label="Aguardando confirmação"
        value={formatCurrency(waitingConfirmation)}
      />
    </SimpleGrid>
  );
}

export { formatCurrency as formatAssemblerCurrency };
