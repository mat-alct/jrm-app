import { Box, Flex } from '@chakra-ui/react';
import React from 'react';

export const Content: React.FC = ({ children }) => {
  return (
    <Box ml={[0, 0, 0, '17rem']} w="100%">
      <Flex
        direction="column"
        as="main"
        py={[4, 4, 8, 8, 16]}
        px={[8, 8, 8, 16, 16]}
        position={[null, null, null, 'relative']}
        mx="auto"
        w="100%"
      >
        {children}
      </Flex>
    </Box>
  );
};
