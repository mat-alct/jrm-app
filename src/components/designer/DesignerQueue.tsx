import { HStack, Text, VStack } from '@chakra-ui/react';
import Link from 'next/link';
import React from 'react';
import { FiPenTool } from 'react-icons/fi';

import { AppCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusPill } from '@/components/ui/status-pill';
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
      <AppCard>
        <EmptyState
          icon={FiPenTool}
          title="Nenhum item na sua fila no momento."
          description="Quando um item entrar em desenho, ele aparece aqui."
        />
      </AppCard>
    );
  }

  return (
    <VStack align="stretch" gap={3}>
      {sorted.map(item => (
        <Link
          key={item.id}
          href={`/projetos/${item.projectId}/itens/${item.id}`}
        >
          <AppCard
            interactive
            borderColor={item.status === 'alteracao_solicitada' ? 'brand.200' : 'app.border'}
            bg={item.status === 'alteracao_solicitada' ? 'app.accentSubtle' : 'app.surface'}
          >
            <HStack justify="space-between" wrap="wrap" gap={2}>
              <VStack align="stretch" gap={1}>
                <Text fontWeight="600" color="app.text">{item.name}</Text>
                <Text fontSize="sm" color="app.textMuted">
                  {item.environment}
                </Text>
              </VStack>
              <HStack gap={2}>
                {item.status === 'alteracao_solicitada' && (
                  <StatusPill palette="orange" label="Alteração solicitada" />
                )}
                {isDelayed(item) && <StatusPill palette="red" label="Atrasado" />}
              </HStack>
            </HStack>
          </AppCard>
        </Link>
      ))}
    </VStack>
  );
};
