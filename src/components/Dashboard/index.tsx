import { Flex } from '@chakra-ui/react';

import { Content } from './Content';
import { Sidebar } from './Sidebar';

export const Dashboard: React.FC = ({ children }) => {
  return (
    <Flex bg="#FFF" w="100%">
      <Sidebar />
      <Content>{children}</Content>
    </Flex>
  );
};
