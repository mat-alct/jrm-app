import { Flex } from '@chakra-ui/react';
import React from 'react';

export const Content: React.FC = ({ children }) => {
  return (
    <Flex w="100%">
      <Flex
        direction="column"
        as="main"
        py={[4, 4, 8, 8, 16]}
        px={[8, 8, 16, 16, 32]}
        w="100%"
      >
        {children}
      </Flex>
    </Flex>
  );
};
