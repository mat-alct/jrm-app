import { Flex, Heading, HStack } from '@chakra-ui/react';

import { SearchBar } from './SearchBar';

interface HeaderProps {
  pageTitle: string;
  hasSearch?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, hasSearch }) => {
  return (
    <Flex align="center" justify="space-between">
      <Heading color="gray.700">{pageTitle}</Heading>
      {hasSearch && (
        <HStack spacing={8}>
          {/* <IconButton
          colorScheme="orange"
          aria-label="Notifications"
          icon={<FaBell />}
        /> */}
          <SearchBar />
        </HStack>
      )}
    </Flex>
  );
};
