import { Badge, Box, HStack, Text, VStack } from '@chakra-ui/react';
import Link from 'next/link';
import React from 'react';

import { ProjectItem } from '@/types/projects';
import { isDelayed } from '@/utils/projects/delay';

export function sortQueueByDeadline(items: ProjectItem[]): ProjectItem[] {
  return [...items].sort((a, b) => {
    if (!a.deadlineCurrent && !b.deadlineCurrent) return 0;
    if (!a.deadlineCurrent) return 1;
    if (!b.deadlineCurrent) return -1;
    return a.deadlineCurrent.toMillis() - b.deadlineCurrent.toMillis();
  });
}

interface DesignerQueueProps {
  items: ProjectItem[];
}

export const DesignerQueue: React.FC<DesignerQueueProps> = ({ items }) => {
  const sorted = sortQueueByDeadline(items);

  if (sorted.length === 0) {
    return (
      <Text color="gray.500" fontSize="sm">
        Nenhum item na sua fila no momento.
      </Text>
    );
  }

  return (
    <VStack align="stretch" gap={3}>
      {sorted.map(item => (
        <Link
          key={item.id}
          href={`/projetos/${item.projectId}/itens/${item.id}`}
        >
          <Box
            borderWidth="1px"
            borderColor={
              item.status === 'alteracao_solicitada' ? 'orange.400' : 'gray.200'
            }
            bg={item.status === 'alteracao_solicitada' ? 'orange.50' : 'white'}
            borderRadius="md"
            p={4}
            _hover={{ borderColor: 'orange.300' }}
          >
            <HStack justify="space-between" wrap="wrap" gap={2}>
              <Box>
                <Text fontWeight="semibold">{item.name}</Text>
                <Text fontSize="sm" color="gray.500">
                  {item.environment}
                </Text>
              </Box>
              <HStack gap={2}>
                {item.status === 'alteracao_solicitada' && (
                  <Badge colorScheme="orange">Alteração solicitada</Badge>
                )}
                {isDelayed(item) && <Badge colorScheme="red">Atrasado</Badge>}
              </HStack>
            </HStack>
          </Box>
        </Link>
      ))}
    </VStack>
  );
};
