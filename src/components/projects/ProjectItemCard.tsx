import { Badge, Box, HStack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import React from 'react';

import { ProjectItem } from '@/types/projects';
import { isDelayed } from '@/utils/projects/delay';

import { ProjectItemStatusBadge } from './ProjectItemStatusBadge';

interface ProjectItemCardProps {
  projectId: string;
  item: ProjectItem;
}

export const ProjectItemCard: React.FC<ProjectItemCardProps> = ({
  projectId,
  item,
}) => (
  <Link href={`/projetos/${projectId}/itens/${item.id}`}>
    <Box
      borderWidth="1px"
      borderColor="gray.200"
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
          {isDelayed(item) && <Badge colorPalette="red">Atrasado</Badge>}
          <ProjectItemStatusBadge status={item.status} />
        </HStack>
      </HStack>
    </Box>
  </Link>
);
