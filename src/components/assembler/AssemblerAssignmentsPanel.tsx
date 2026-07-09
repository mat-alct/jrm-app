import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { FiUsers } from 'react-icons/fi';

import { AppCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusPill } from '@/components/ui/status-pill';
import { AssemblerAssignment } from '@/types/projects';

interface AssemblerAssignmentsPanelProps {
  assignments: AssemblerAssignment[];
  canViewValues: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function AssemblerAssignmentsPanel({
  assignments,
  canViewValues,
}: AssemblerAssignmentsPanelProps) {
  return (
    <AppCard>
      <VStack align="stretch" gap={3}>
        <Text fontSize="lg" fontWeight="600" color="app.text">
          Montadores atribuídos
        </Text>
        {assignments.length === 0 ? (
          <EmptyState
            icon={FiUsers}
            title="Nenhum montador atribuído"
            description="As atribuições deste item aparecem aqui depois do vínculo com a equipe."
          />
        ) : (
          assignments.map(assignment => (
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
              <Box>
                <Text fontWeight="600" color="app.text">
                  {assignment.assemblerName ?? assignment.assemblerId}
                </Text>
                <StatusPill mt={2} palette="gray" label={assignment.paymentStatus} />
              </Box>
              {canViewValues ? (
                <Text fontWeight="600" color="app.text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(assignment.amountToReceive)}
                </Text>
              ) : null}
            </Flex>
          ))
        )}
      </VStack>
    </AppCard>
  );
}
