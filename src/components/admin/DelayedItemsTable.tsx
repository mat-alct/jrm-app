import { Box, Table, Text } from '@chakra-ui/react';
import Link from 'next/link';
import React from 'react';

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
      <Text color="gray.500" fontSize="sm">
        Nenhum item atrasado.
      </Text>
    );
  }

  return (
    <Box overflowX="auto">
      <Table.Root variant="outline" colorScheme="orange" whiteSpace="nowrap">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Cliente</Table.ColumnHeader>
            <Table.ColumnHeader>Item</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>Prazo</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map(item => {
            const project = projectsById[item.projectId];
            return (
              <Table.Row key={item.id}>
                <Table.Cell>
                  <Link href={`/projetos/${item.projectId}/itens/${item.id}`}>
                    {project?.customerName ?? '—'}
                  </Link>
                </Table.Cell>
                <Table.Cell>{item.name}</Table.Cell>
                <Table.Cell>{INTERNAL_STATUS_LABELS[item.status]}</Table.Cell>
                <Table.Cell>
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
  );
};
