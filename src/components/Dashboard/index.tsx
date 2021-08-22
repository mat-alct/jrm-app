import { Flex } from '@chakra-ui/react';

import { Content } from './Content';
import { Sidebar } from './Sidebar';

export const Dashboard: React.FC = ({ children }) => {
  return (
    <Flex bg="#FFFAFA" w="100%">
      <Sidebar />
      <Content>{children}</Content>
      {/* <Flex direction="column" px={16} pt={16} w="100%">
        <Header pageTitle={pageTitle} />

      </Flex> */}
    </Flex>
  );
};
