import { Flex, Text } from '@chakra-ui/react';
import React from 'react';

interface CuttingPlanLegendProps {
  compact?: boolean;
  edgeTrimMm?: number;
  internalTrimMm?: number;
}

export const CuttingPlanLegend = ({
  compact = false,
  edgeTrimMm,
  internalTrimMm,
}: CuttingPlanLegendProps) => {
  const items = [
    {
      label: 'Peça sem fita',
      style: { background: '#fff', border: '1px dashed #9ca3af' },
    },
    {
      label: 'Fita de borda',
      style: { background: '#fff', border: '3px solid #050505' },
    },
    {
      label: 'Sobra',
      style: {
        background:
          'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 3px, #9ca3af 3px, #9ca3af 5px)',
        border: '1px dashed #6b7280',
      },
    },
    {
      label: `Margem externa${edgeTrimMm === undefined ? '' : ` (${edgeTrimMm} mm)`}`,
      style: {
        background:
          'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 3px, #6b7280 3px, #6b7280 4px)',
        border: '1px solid #374151',
      },
    },
    {
      label: `Ajuste interno${internalTrimMm === undefined ? '' : ` (${internalTrimMm} mm por lado)`}`,
      style: {
        background:
          'repeating-linear-gradient(-45deg, #d1d5db, #d1d5db 2px, #111827 2px, #111827 3px)',
        border: '1px solid #111827',
      },
    },
  ];

  return (
    <Flex gap={compact ? 2 : 4} wrap="wrap" fontSize={compact ? '9px' : 'xs'}>
      {items.map(item => (
        <Flex key={item.label} align="center" gap={1.5}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: compact ? 12 : 16,
              height: compact ? 8 : 11,
              boxSizing: 'border-box',
              ...item.style,
            }}
          />
          <Text>{item.label}</Text>
        </Flex>
      ))}
    </Flex>
  );
};
