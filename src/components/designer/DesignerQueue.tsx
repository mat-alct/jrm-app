import { Button, HStack, Text, VStack } from '@chakra-ui/react';
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
  currentUserId?: string;
  onClaim?: (item: ProjectItem) => void;
  claimingItemId?: string;
}

export const DesignerQueue: React.FC<DesignerQueueProps> = ({
  items,
  currentUserId,
  onClaim,
  claimingItemId,
}) => {
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
      {sorted.map(item => {
        const isClaimed = !!item.designerId;
        const isOwnClaim = isClaimed && item.designerId === currentUserId;

        return (
          <AppCard
            key={item.id}
            borderColor={
              item.status === 'alteracao_solicitada'
                ? 'brand.200'
                : 'app.border'
            }
            bg={
              item.status === 'alteracao_solicitada'
                ? 'app.accentSubtle'
                : 'app.surface'
            }
          >
            <HStack justify="space-between" wrap="wrap" gap={2}>
              <Link href={`/projetos/${item.projectId}/itens/${item.id}`}>
                <VStack align="stretch" gap={1}>
                  <Text fontWeight="600" color="app.text">
                    {item.name}
                  </Text>
                  <Text fontSize="sm" color="app.textMuted">
                    {item.environment}
                  </Text>
                </VStack>
              </Link>
              <HStack gap={2}>
                {item.status === 'alteracao_solicitada' && (
                  <StatusPill palette="orange" label="Alteração solicitada" />
                )}
                {isDelayed(item) && (
                  <StatusPill palette="red" label="Atrasado" />
                )}
                {isClaimed ? (
                  <StatusPill
                    palette={isOwnClaim ? 'green' : 'gray'}
                    label={
                      isOwnClaim
                        ? 'Atribuído a você'
                        : `Atribuído a ${item.designerName ?? 'alguém'}`
                    }
                  />
                ) : (
                  onClaim && (
                    <Button
                      size="sm"
                      colorPalette="orange"
                      loading={claimingItemId === item.id}
                      onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        onClaim(item);
                      }}
                    >
                      Assumir
                    </Button>
                  )
                )}
              </HStack>
            </HStack>
          </AppCard>
        );
      })}
    </VStack>
  );
};
