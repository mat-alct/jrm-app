import { Button, Flex } from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useForm } from 'react-hook-form';

import { searchCustomerSchema } from '../../utils/yup/clientesValidations';
import { FormInput } from '../Form/Input';

interface SearchBarProps {
  handleUpdateSearch: (search: string) => void;
}

interface SearchProps {
  customerName: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ handleUpdateSearch }) => {
  // Create Customer Search useForm
  const {
    register: searchRegister,
    handleSubmit: searchHandleSubmit,
    formState: { errors: searchErrors, isSubmitting: searchIsSubmitting },
  } = useForm<SearchProps>({
    resolver: yupResolver(searchCustomerSchema),
  });

  const handleSearch = () => {};
  return (
    <Flex
      as="form"
      onSubmit={searchHandleSubmit(handleSearch)}
      maxW="300px"
      mb={4}
    >
      <FormInput
        {...searchRegister('customerName')}
        name="customerName"
        placeholder="Digite o nome do cliente"
        borderRightRadius="none"
        error={searchErrors.customerName}
      />
      <Button
        isDisabled={searchIsSubmitting}
        colorScheme="gray"
        type="submit"
        borderLeftRadius="none"
      >
        Buscar
      </Button>
    </Flex>
  );
};
