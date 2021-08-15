import { Flex, Heading, HStack } from '@chakra-ui/react';

import { SearchBar } from '../SearchBar';

export const Header = () => {
  return (
    <Flex pt={16} align="center" justify="space-between" px={8}>
      <Heading>Novo Serviço</Heading>
      <HStack spacing={8}>
        {/* <IconButton
          colorScheme="orange"
          aria-label="Notifications"
          icon={<FaBell />}
        /> */}
        <SearchBar />
      </HStack>
    </Flex>
  );
};
