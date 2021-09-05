import { Flex } from '@chakra-ui/react';

export const Content: React.FC = ({ children }) => {
  return (
    <Flex direction="column" as="main" p={16} w="100%" maxW="1366px" mx="auto">
      {children}
    </Flex>
  );
};
