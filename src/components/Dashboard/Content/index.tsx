import { Flex } from '@chakra-ui/react';
import React from 'react';

export const Content: React.FC = ({ children }) => {
  return (
    <Flex w="100%">
      <Flex
        direction="column"
        as="main"
        py={[4, 4, 8, 8, 16]}
        px={8}
        ml={[null, null, null, null, 16, 32]}
        w="100%"
        maxW="1366px"
        mx="auto"
      >
        {children}
      </Flex>
    </Flex>
  );
};
