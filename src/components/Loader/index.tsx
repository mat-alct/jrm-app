import { Flex, Spinner } from '@chakra-ui/react';

export const Loader = () => {
  return (
    <Flex h="100vh" align="center" justify="center" bg="app.canvas">
      <Spinner size="lg" color="app.accent" />
    </Flex>
  );
};
