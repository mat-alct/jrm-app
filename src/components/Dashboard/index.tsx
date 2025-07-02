import { Flex } from '@chakra-ui/react';
// 1. Importe o React para usar seus tipos
import React from 'react';

import { Content } from './Content';
import { Sidebar } from './Sidebar';

// 2. Crie uma interface para as props do componente
interface DashboardProps {
  children: React.ReactNode;
}

// 3. Remova o : React.FC e use a interface de props
export const Dashboard = ({ children }: DashboardProps) => {
  return (
    <Flex bg="#FFF" w="100%">
      <Sidebar />
      <Content>{children}</Content>
    </Flex>
  );
};
