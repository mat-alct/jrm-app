import { Box, Table, Text } from '@chakra-ui/react';
import Link from 'next/link';
import React from 'react';
import { FiClock } from 'react-icons/fi';

import { AppCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Project, ProjectItem } from '@/types/projects';
import { INTERNAL_STATUS_LABELS } from '@/utils/projects/status';

interface DelayedItemsTableProps {
  items: ProjectItem[];
  projectsById: Record<string, Project>;
}

export const DelayedItemsTable: React.FC<DelayedItemsTableProps> = ({
  items,
  projectsById,
}) => {
  if (items.length === 0) {
    return (
      <AppCard>
        <EmptyState
          icon={FiClock}
          title="Nenhum item atrasado."
          description="Os itens fora do prazo aparecem nesta lista."
        />
      </AppCard>
    );
  }

  return (
    <AppCard>
      <Box overflowX="auto">
        <Table.Root whiteSpace="nowrap">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader
                bg="app.sunken"
                color="app.textMuted"
                fontSize="11px"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                Cliente
              </Table.ColumnHeader>
              <Table.ColumnHeader
                bg="app.sunken"
                color="app.textMuted"
                fontSize="11px"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                Item
              </Table.ColumnHeader>
              <Table.ColumnHeader
                bg="app.sunken"
                color="app.textMuted"
                fontSize="11px"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                Status
              </Table.ColumnHeader>
              <Table.ColumnHeader
                bg="app.sunken"
                color="app.textMuted"
                fontSize="11px"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                Prazo
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map(item => {
              const project = projectsById[item.projectId];
              return (
                <Table.Row key={item.id} borderColor="app.border">
                  <Table.Cell>
                    <Link href={`/projetos/${item.projectId}/itens/${item.id}`}>
                      <Text color="app.text" fontWeight="500">
                        {project?.customerName ?? '—'}
                      </Text>
                    </Link>
                  </Table.Cell>
                  <Table.Cell color="app.textSecondary">{item.name}</Table.Cell>
                  <Table.Cell color="app.textSecondary">
                    {INTERNAL_STATUS_LABELS[item.status]}
                  </Table.Cell>
                  <Table.Cell color="red.600" fontWeight="600">
                    {item.deadlineCurrent
                      ? item.deadlineCurrent.toDate().toLocaleDateString('pt-BR')
                      : '—'}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Box>
    </AppCard>
  );
};
