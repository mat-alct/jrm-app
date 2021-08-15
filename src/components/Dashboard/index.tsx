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
    <Flex>
      <Sidebar />
      <Flex direction="column" w="100%">
        <Header pageTitle={pageTitle} />
        <Content>{children}</Content>
      </Flex>
    </Flex>
  );
};
