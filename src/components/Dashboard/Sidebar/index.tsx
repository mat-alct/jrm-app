import { Flex, Image } from '@chakra-ui/react';

export const Sidebar = () => {
  return (
    <Flex
      direction="column"
      maxW="16rem"
      minH="100vh"
      h="100%"
      bg="gray.100"
      w="100%"
      border="2px solid gray.800"
    >
      <Image src="/images/logo.svg" alt="Logotipo" boxSize="120px" mx="auto" />
    </Flex>
  );
};
