import { Flex, Heading, HStack } from '@chakra-ui/react';

import { SearchBar } from '../SearchBar';

interface HeaderProps {
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle }) => {
  return (
    <Flex pt={16} align="center" justify="space-between" px={8}>
      <Heading>{pageTitle}</Heading>
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
