import { Flex, Icon, Input } from '@chakra-ui/react';
import React from 'react';
import { RiSearchLine } from 'react-icons/ri';

export const SearchBar = () => {
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
      bg="gray.200"
      borderRadius="full"
    >
      <Input
        color="gray.700"
        variant="unstyled"
        px="4"
        mr="4"
        placeholder="Buscar na plataforma"
        _placeholder={{ color: 'gray.400' }}
      />
      <Icon as={RiSearchLine} fontSize="20" />
    </Flex>
  );
};
