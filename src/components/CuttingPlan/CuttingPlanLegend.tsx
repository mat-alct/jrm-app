import { Flex, Text } from '@chakra-ui/react';
import React from 'react';

const items = [
  { label: 'Peças', color: '#fed7aa', border: '#1f2937' },
  { label: 'Sobras reutilizáveis', color: '#bbf7d0', border: '#15803d' },
  { label: 'Desperdício', color: '#e5e7eb', border: '#94a3b8' },
  { label: 'Bordas removidas', color: '#fee2e2', border: '#991b1b' },
  { label: 'Linhas de corte', color: '#fff', border: '#dc2626' },
  { label: 'Fita de borda', color: '#fff', border: '#7c3aed' },
];

export const CuttingPlanLegend = ({ compact = false }: { compact?: boolean }) => (
  <Flex gap={compact ? 2 : 4} wrap="wrap" fontSize={compact ? '9px' : 'xs'}>
    {items.map(item => (
      <Flex key={item.label} align="center" gap={1.5}>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: compact ? 12 : 16,
            height: compact ? 8 : 11,
            background: item.color,
            border: `2px ${item.label === 'Linhas de corte' ? 'dashed' : 'solid'} ${
              item.border
            }`,
          }}
        />
        <Text>{item.label}</Text>
      </Flex>
    ))}
  </Flex>
);
