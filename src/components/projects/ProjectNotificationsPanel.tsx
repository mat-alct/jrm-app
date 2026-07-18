import { Badge, Box, HStack, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import React from 'react';

import { ProjectNotification } from '@/types/projects';

interface ProjectNotificationsPanelProps {
  projectId: string;
  notifications: ProjectNotification[];
}

export const ProjectNotificationsPanel: React.FC<
  ProjectNotificationsPanelProps
> = ({ projectId, notifications }) => {
  const sorted = [...notifications].sort((a, b) => {
    if (!!a.resolvedAt !== !!b.resolvedAt) {
      return a.resolvedAt ? 1 : -1;
    }
    return b.createdAt.toMillis() - a.createdAt.toMillis();
  });

  if (sorted.length === 0) {
    return <Text color="gray.500">Nenhuma notificação neste projeto.</Text>;
  }

  return (
    <Stack gap={3}>
      {sorted.map(notification => (
        <Link
          key={notification.id}
          href={`/projetos/${projectId}/itens/${notification.itemId}`}
        >
          <Box
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={4}
            opacity={notification.resolvedAt ? 0.6 : 1}
            _hover={{ borderColor: 'orange.300' }}
          >
            <HStack justify="space-between" wrap="wrap" gap={2} mb={1}>
              <Text fontWeight="semibold">{notification.itemName}</Text>
              {notification.resolvedAt ? (
                <Badge colorPalette="gray">Resolvida</Badge>
              ) : (
                <Badge colorPalette="red">Pendente</Badge>
              )}
            </HStack>
            <Text fontSize="sm">{notification.message}</Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              {notification.createdByName ?? 'Desenhista'}
            </Text>
          </Box>
        </Link>
      ))}
    </Stack>
  );
};
