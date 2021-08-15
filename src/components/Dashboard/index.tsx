import { Flex } from '@chakra-ui/react';

import { Content } from './Content';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const Dashboard: React.FC = ({ children }) => {
  return (
    <Flex>
      <Sidebar />
      <Flex direction="column" w="100%">
        <Header />
        <Content>{children}</Content>
      </Flex>
    </Flex>
  );
};
