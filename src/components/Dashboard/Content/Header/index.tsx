import { Flex, Heading, HStack, Spinner } from '@chakra-ui/react';
import React from 'react';

interface HeaderProps {
  pageTitle: string;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  children,
  isLoading,
}) => {
  return (
    <Flex align="flex-end" justify="space-between" mb={8}>
      <Heading color="gray.700">
        {pageTitle}{' '}
        {isLoading && <Spinner size="sm" color="gray.500" marginLeft="4" />}
      </Heading>

      <HStack spacing={4}>{children}</HStack>
    </Flex>
  );
};
