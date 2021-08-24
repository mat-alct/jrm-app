import { Button, Icon, useDisclosure, VStack } from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useForm } from 'react-hook-form';
import { RiAddLine, RiRefreshLine } from 'react-icons/ri';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { FormModal } from '../../components/Modal/FormModal';
import { Customer } from '../../types';

const Clientes: React.FC = () => {
  const {
    onOpen: onOpenCreateCustomer,
    isOpen: isOpenCreateCustomer,
    onClose: onCloseCreateCustomer,
  } = useDisclosure();

  const validationCreateCustomerSchema = Yup.object().shape({
    name: Yup.string().required('Material obrigatório'),
  });

  // Create Customer useForm
  const {
    register: createCustomerRegister,
    handleSubmit: createCustomerHandleSubmit,
    formState: {
      errors: createCustomerErrors,
      isSubmitting: createCustomerIsSubmitting,
    },
  } = useForm<Customer>({
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
      >
        <VStack as="form" spacing={4} mx="auto" noValidate>
          <FormInput
            {...createCustomerRegister('name')}
            error={createCustomerErrors.name}
            maxWidth="none"
            name="name"
            label="Nome"
          />
        </VStack>
      </FormModal>
    </Dashboard>
  );
};

export default Clientes;
