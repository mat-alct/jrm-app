import { Button, HStack, Icon, useDisclosure, VStack } from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useForm } from 'react-hook-form';
import { RiAddLine, RiRefreshLine } from 'react-icons/ri';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { RadioButton } from '../../components/Form/RadioButton';
import { SelectWithSearch } from '../../components/Form/Select';
import { FormModal } from '../../components/Modal/FormModal';
import { Customer } from '../../types';
import { areas } from '../../utils/listOfAreas';

interface CreateCustomerProps {
  firstName: string;
  lastName: string;
  telephone?: string;
  address?: string;
  city?: string;
}

const Clientes: React.FC = () => {
  const {
    onOpen: onOpenCreateCustomer,
    isOpen: isOpenCreateCustomer,
    onClose: onCloseCreateCustomer,
  } = useDisclosure();

  const validationCreateCustomerSchema = Yup.object().shape({
    firstName: Yup.string().required('Nome obrigatório'),
    lastName: Yup.string().required('Sobrenome obrigatório'),
    telephone: Yup.string(),
    address: Yup.string(),
    area: Yup.object().shape({
      value: Yup.string(),
      label: Yup.string(),
    }),
    city: Yup.string(),
  });

  // Create Customer useForm
  const {
    register: createCustomerRegister,
    handleSubmit: createCustomerHandleSubmit,
    control: createCustomerControl,
    formState: {
      errors: createCustomerErrors,
      isSubmitting: createCustomerIsSubmitting,
    },
  } = useForm<CreateCustomerProps>({
    resolver: yupResolver(validationCreateCustomerSchema),
  });

  const handleCreateCustomer = (customerData: Customer) => {
    onCloseCreateCustomer();
    console.log(customerData);
  };

  const areasToSelect = areas.map(area => {
    return {
      value: area,
      label: area,
    };
  });

  return (
    <Dashboard>
      <Header pageTitle="Clientes" isLoading={createCustomerIsSubmitting}>
        <Button
          colorScheme="gray"
          leftIcon={<Icon as={RiRefreshLine} fontSize="20" />}
        >
          Atualizar
        </Button>
        <Button
          colorScheme="orange"
          leftIcon={<Icon as={RiAddLine} fontSize="20" />}
          onClick={onOpenCreateCustomer}
        >
          Novo Cliente
        </Button>
      </Header>

      {/* Modals */}

      {/* New Customer Modal */}
      <FormModal
        isOpen={isOpenCreateCustomer}
        onClose={onCloseCreateCustomer}
        title="Novo cliente"
        onSubmit={createCustomerHandleSubmit(handleCreateCustomer)}
        size="lg"
      >
        <VStack as="form" spacing={4} mx="auto" noValidate>
          <HStack spacing={8}>
            <FormInput
              {...createCustomerRegister('firstName')}
              error={createCustomerErrors.firstName}
              maxWidth="none"
              name="firstName"
              label="Nome"
              size="md"
            />
            <FormInput
              {...createCustomerRegister('lastName')}
              error={createCustomerErrors.lastName}
              maxWidth="none"
              name="lastName"
              label="Sobrenome"
              size="md"
            />
          </HStack>
          <FormInput
            {...createCustomerRegister('telephone')}
            error={createCustomerErrors.telephone}
            maxWidth="none"
            name="telephone"
            label="Telefone"
            size="md"
          />

          <FormInput
            {...createCustomerRegister('address')}
            error={createCustomerErrors.address}
            maxWidth="none"
            name="address"
            size="md"
            label="Endereço"
          />
          <HStack spacing={8} w="100%">
            <SelectWithSearch
              options={areasToSelect}
              control={createCustomerControl}
              name="area"
              label="Bairro"
            />
            <RadioButton
              control={createCustomerControl}
              name="city"
              options={['Angra dos Reis', 'Paraty']}
              label="Cidade"
            />
          </HStack>
        </VStack>
      </FormModal>
    </Dashboard>
  );
};

export default Clientes;
