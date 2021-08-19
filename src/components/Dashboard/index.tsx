import { Flex } from '@chakra-ui/react';

import { Content } from './Content';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface DashboardProps {
  pageTitle: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  children,
  pageTitle,
}) => {
  return (
    <Flex bg="#FFFAFA" w="100%">
      <Sidebar />
      <Flex direction="column" px={16} pt={16} ml="240px">
        <Header pageTitle={pageTitle} />
        <Content>{children}</Content>
      </Flex>
    </Flex>
  );
};
