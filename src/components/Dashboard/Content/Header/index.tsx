import {
  Box,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Spinner,
  useBreakpointValue,
} from '@chakra-ui/react';
import React from 'react';
import { RiMenuLine } from 'react-icons/ri';

import { useSidebarDrawer } from '../../../../hooks/sidebar';

interface HeaderProps {
  pageTitle: string;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  children,
  isLoading,
}) => {
  const { onOpen } = useSidebarDrawer();
  const isWideVersion = useBreakpointValue([false, false, false, true]);

  return (
    <Flex
      direction={['column', 'column', 'column', 'row']}
      w="100%"
      align="center"
      justify="space-between"
      mb={[8, 8, 8, 16]}
    >
      <Flex
        align="center"
        justify="space-between"
        mb={[4, 4, 4, 0]}
        w={['100%', '100%', '100%', '']}
      >
        {/* Hamburguer Menu Item */}
        {!isWideVersion && (
          <IconButton
            aria-label="Open navigation"
            fontSize="24"
            variant="subtle"
            onClick={onOpen}
            mr="2"

          >
            <RiMenuLine />
          </IconButton>
        )}

        <Heading color="gray.700">
          {pageTitle}
          {isLoading && <Spinner size="sm" color="gray.500" marginLeft="4" />}
        </Heading>

        {/* Box to align IconButton left and Heading center in mobile */}
        {!isWideVersion && <Box />}
      </Flex>

      <HStack gap={4}>{children}</HStack>
    </Flex>
  );
};
