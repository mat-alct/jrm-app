import { Flex, Text } from '@chakra-ui/react';
import { IconType } from 'react-icons';

export interface EmptyStateProps {
  icon: IconType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => (
  <Flex direction="column" align="center" justify="center" py="12" px="4" gap="3">
    <Flex
      w="48px"
      h="48px"
      rounded="full"
      align="center"
      justify="center"
      bg="app.sunken"
      color="app.textMuted"
    >
      <Icon size={20} />
    </Flex>
    <Text fontSize="sm" fontWeight="600" color="app.text" textAlign="center">
      {title}
    </Text>
    {description && (
      <Text fontSize="xs" color="app.textMuted" textAlign="center" maxW="320px">
        {description}
      </Text>
    )}
    {action}
  </Flex>
);
