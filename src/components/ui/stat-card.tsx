import { Flex, Text } from '@chakra-ui/react';
import { IconType } from 'react-icons';

import { AppCard } from './card';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: IconType;
  palette?: string;
  hint?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  palette = 'brand',
  hint,
}) => (
  <AppCard p="5">
    <Flex align="flex-start" justify="space-between" gap="3">
      <Flex direction="column" gap="1" minW="0">
        <Text
          fontSize="11px"
          fontWeight="600"
          textTransform="uppercase"
          letterSpacing="0.05em"
          color="app.textMuted"
          truncate
        >
          {label}
        </Text>
        <Text
          fontSize="26px"
          fontWeight="600"
          color="app.text"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </Text>
        {hint && (
          <Text fontSize="xs" color="app.textMuted">
            {hint}
          </Text>
        )}
      </Flex>
      {Icon && (
        <Flex
          flexShrink={0}
          w="36px"
          h="36px"
          rounded="lg"
          align="center"
          justify="center"
          colorPalette={palette}
          bg="colorPalette.100"
          color="colorPalette.600"
        >
          <Icon size={16} />
        </Flex>
      )}
    </Flex>
  </AppCard>
);
