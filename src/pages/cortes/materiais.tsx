import { Button, Flex, Heading, HStack } from '@chakra-ui/react';
import React from 'react';

import { Dashboard } from '../../components/Dashboard';

const Materiais = () => {
  return (
    <>
      <Dashboard>
        <Flex direction="column">
          <Flex justify="space-between" w="100%">
            <Heading>Lista de materiais</Heading>
            <HStack spacing={4}>
              <Button colorScheme="gray">Atualizar</Button>
              <Button colorScheme="orange">Novo Material</Button>
            </HStack>
          </Flex>
        </Flex>
      </Dashboard>
    </>
  );
};

export default Materiais;
