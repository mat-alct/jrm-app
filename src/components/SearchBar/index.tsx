import { Button, Flex, FlexProps } from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';

import { searchCustomerSchema } from '../../utils/yup/clientesValidations';
import { FormInput } from '../Form/Input';

// Interface para as PROPS do componente (o que ele recebe de fora)
interface SearchBarProps extends FlexProps {
  handleUpdateSearch: (search: string) => void;
  placeholder?: string;
}

// Interface para os DADOS do formulário.
// CORREÇÃO: 'customerName' agora é opcional (?) para casar com o schema do Yup
// que não possui .required(). Isso resolve o erro de 'Resolver mismatch'.
interface SearchFormValues {
  customerName?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  handleUpdateSearch,
  placeholder,
  ...rest
}) => {
  // Configuração do formulário
  const {
    register: searchRegister,
    handleSubmit: searchHandleSubmit,
    formState: { errors: searchErrors, isSubmitting: searchIsSubmitting },
  } = useForm<SearchFormValues>({
    // O 'as any' aqui é seguro pois estamos importando o schema correto,
    // e serve para evitar conflitos estritos de tipagem entre versões do Yup e RHF.
    resolver: yupResolver(searchCustomerSchema as any),
  });

  // Função de submit
  // CORREÇÃO: Tipamos explicitamente 'data' como SearchFormValues
  const handleSearch: SubmitHandler<SearchFormValues> = data => {
    // Garantimos que passamos uma string, mesmo que venha undefined do formulário
    handleUpdateSearch(data.customerName || '');
  };

  return (
    <Flex
      as="form"
      // O handleSubmit agora aceita nossa função sem erros de tipo
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
        // CORREÇÃO: Usando 'disabled' (padrão HTML/Chakra v3) em vez de 'isDisabled'
        disabled={searchIsSubmitting}
        colorScheme="gray"
        type="submit"
        borderLeftRadius="none"
      >
        Buscar
      </Button>
    </Flex>
  );
};
