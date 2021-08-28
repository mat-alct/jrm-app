import { Flex, Icon, Input } from '@chakra-ui/react';
import React from 'react';
import { RiSearchLine } from 'react-icons/ri';

interface SearchBarProps {
  handleSearch: (search: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ handleSearch }) => {
  return (
    <Flex
      as="label"
      flex="1"
      py="2"
      px="4"
      maxWidth={400}
      alignSelf="center"
      color="gray.400"
      position="relative"
      bg="#fff"
      borderRadius="full"
      border="1px solid"
      borderColor="gray.200"
    >
      <Icon as={RiSearchLine} fontSize="20" />
      <Input
        color="gray.700"
        variant="unstyled"
        px="4"
        ml="2"
        placeholder="Buscar"
        _placeholder={{ color: 'gray.400' }}
        onChange={e => handleSearch(e.target.value)}
      />
    </Flex>
  );
};
