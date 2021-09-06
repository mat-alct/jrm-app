import { Flex } from '@chakra-ui/react';

import { Content } from './Content';
import { Sidebar } from './Sidebar';

export const Dashboard: React.FC = ({ children }) => {
  const sidebarWidth = '17rem';
  return (
    <Flex bg="#FFF" w="100%">
      <Sidebar sidebarWidth={sidebarWidth} />
      <Content sidebarWidth={sidebarWidth}>{children}</Content>
    </Flex>
  );
};
