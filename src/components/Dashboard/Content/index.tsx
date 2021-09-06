import { Box, Flex } from '@chakra-ui/react';
import React from 'react';

export const Content: React.FC = ({ children }) => {
  return (
    <Flex w="100%">
      <Box h="100%" w="17rem" />
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
