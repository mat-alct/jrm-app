import { Flex, Spinner } from '@chakra-ui/react';

export const Loader = () => {
  return (
    <Flex h="100vh" align="center" justify="center">
      <Spinner size="lg" />
    </Flex>
  );
};
