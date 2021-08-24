import { Button, Icon } from '@chakra-ui/react';
import React from 'react';
import { RiAddLine, RiRefreshLine } from 'react-icons/ri';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';

const Clientes: React.FC = () => {
  return (
    <Dashboard>
      <Header pageTitle="Clientes">
        <Button
          colorScheme="gray"
          leftIcon={<Icon as={RiRefreshLine} fontSize="20" />}
        >
          Atualizar
        </Button>
        <Button
          colorScheme="orange"
          leftIcon={<Icon as={RiAddLine} fontSize="20" />}
        >
          Novo Cliente
        </Button>
      </Header>
    </Dashboard>
  );
};

export default Clientes;
