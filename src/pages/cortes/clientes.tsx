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
import { FormModal } from '../../components/Modal/FormModal';
import { Customer } from '../../types';
// import { areas } from '../../utils/listOfAreas';

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
            />
            <FormInput
              {...createCustomerRegister('lastName')}
              error={createCustomerErrors.lastName}
              maxWidth="none"
              name="lastName"
              label="Sobrenome"
            />
          </HStack>
          <FormInput
            {...createCustomerRegister('telephone')}
            error={createCustomerErrors.telephone}
            maxWidth="none"
            name="telephone"
            label="Telefone"
          />

          <FormInput
            {...createCustomerRegister('address')}
            error={createCustomerErrors.address}
            maxWidth="none"
            name="address"
            label="Endereço"
          />
          <RadioButton
            control={createCustomerControl}
            name="city"
            options={['Angra dos Reis', 'Paraty']}
            label="Cidade"
          />
        </VStack>
      </FormModal>
    </Dashboard>
  );
};

export default Clientes;
