import { Box, Text, VStack } from '@chakra-ui/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React from 'react';

import { StatusHistory } from '@/types/projects';
import { INTERNAL_ROLE_LABELS, INTERNAL_STATUS_LABELS } from '@/utils/projects/status';

interface ProjectItemTimelineProps {
  history: StatusHistory[];
}

export const ProjectItemTimeline: React.FC<ProjectItemTimelineProps> = ({
  history,
}) => {
  const sorted = [...history].sort(
    (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis(),
  );

  if (sorted.length === 0) {
    return (
      <Text color="gray.500" fontSize="sm">
        Nenhuma alteração de status registrada ainda.
      </Text>
    );
  }

  return (
    <VStack align="stretch" gap={3}>
      {sorted.map(entry => (
        <Box
          key={entry.id}
          borderLeftWidth="3px"
          borderColor="orange.400"
          pl={3}
        >
          <Text fontWeight="semibold" fontSize="sm">
            {INTERNAL_STATUS_LABELS[entry.toStatus]}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {format(entry.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
            {' · '}
            {entry.changedByName
              ? `${entry.changedByName} · ${INTERNAL_ROLE_LABELS[entry.changedByRole]}`
              : INTERNAL_ROLE_LABELS[entry.changedByRole]}
          </Text>
          {entry.note && (
            <Text fontSize="sm" mt={1}>
              {entry.note}
            </Text>
          )}
        </Box>
      ))}
    </VStack>
  );
};
