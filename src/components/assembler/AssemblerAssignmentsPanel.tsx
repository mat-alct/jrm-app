import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import React from 'react';

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
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.100"
      borderRadius="8px"
      p={4}
    >
      <VStack align="stretch" gap={3}>
        <Text fontSize="lg" fontWeight="800">
          Montadores atribuídos
        </Text>
        {assignments.length === 0 ? (
          <Text color="gray.600">Nenhum montador atribuído.</Text>
        ) : (
          assignments.map(assignment => (
            <Flex
              key={assignment.id}
              borderTop="1px solid"
              borderColor="gray.100"
              gap={3}
              justify="space-between"
              pt={3}
            >
              <Box>
                <Text fontWeight="700">
                  {assignment.assemblerName ?? assignment.assemblerId}
                </Text>
                <Text color="gray.600" fontSize="sm">
                  {assignment.paymentStatus}
                </Text>
              </Box>
              {canViewValues ? (
                <Text fontWeight="800">
                  {formatCurrency(assignment.amountToReceive)}
                </Text>
              ) : null}
            </Flex>
          ))
        )}
      </VStack>
    </Box>
  );
}
