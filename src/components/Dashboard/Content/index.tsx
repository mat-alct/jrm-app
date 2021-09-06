import { Box, Flex } from '@chakra-ui/react';
import React from 'react';

interface ContentProps {
  sidebarWidth: string;
}

export const Content: React.FC<ContentProps> = ({ children, sidebarWidth }) => {
  return (
    <Flex w="100%">
      {/* Box with the size of sidebar. Used to align */}
      <Box h="100%" w={sidebarWidth} />
      <Flex
        direction="column"
        as="main"
        py={16}
        w="100%"
        maxW="1366px"
        mx="auto"
      >
        {children}
      </Flex>
    </Flex>
  );
};
