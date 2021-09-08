import { Button, Flex, FlexProps } from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useForm } from 'react-hook-form';

import { searchCustomerSchema } from '../../utils/yup/clientesValidations';
import { FormInput } from '../Form/Input';

interface SearchBarProps extends FlexProps {
  handleUpdateSearch: (search: string) => void;
}

interface SearchProps {
  customerName: string;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  handleUpdateSearch,
  placeholder,
  ...rest
}) => {
  // Create Customer Search useForm
  const {
    register: searchRegister,
    handleSubmit: searchHandleSubmit,
    formState: { errors: searchErrors, isSubmitting: searchIsSubmitting },
  } = useForm<SearchProps>({
    resolver: yupResolver(searchCustomerSchema),
  });

  const handleSearch = (search: SearchProps) => {
    handleUpdateSearch(search.customerName);
  };

  return (
    <Flex
      as="form"
      onSubmit={searchHandleSubmit(handleSearch)}
      maxW={[null, null, null, '300px']}
      {...rest}
    >
      <FormInput
        {...searchRegister('customerName')}
        name="customerName"
        placeholder={placeholder || 'Digite o nome do cliente'}
        borderRightRadius="none"
        formNoValidate
        error={searchErrors.customerName}
        size="md"
        w="100%"
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
