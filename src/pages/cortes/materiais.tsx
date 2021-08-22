import { Button, Flex, Heading, HStack } from '@chakra-ui/react';
import React from 'react';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';

const Materiais = () => {
  return (
    <>
      <Dashboard>
        <Header pageTitle="Materiais">
          <Button colorScheme="gray">Atualizar</Button>
          <Button colorScheme="orange">Novo Material</Button>
        </Header>
      </Dashboard>
    </>
  );
};

export default Materiais;
