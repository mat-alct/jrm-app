import { Button, Icon, useDisclosure, VStack } from '@chakra-ui/react';
import React from 'react';
import { RiAddLine, RiRefreshLine } from 'react-icons/ri';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { FormModal } from '../../components/Modal/FormModal';

const Clientes: React.FC = () => {
  const {
    onOpen: onOpenCreateCustomer,
    isOpen: isOpenCreateCustomer,
    onClose: onCloseCreateCustomer,
  } = useDisclosure();

  return (
    <Dashboard>
      <Header pageTitle="Clientes">
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
        onSubmit={() => console.log('ok')}
      >
        <VStack as="form" spacing={4} mx="auto" noValidate>
          <FormInput
            {...register('name')}
            error={errors.name}
            maxWidth="none"
            name="name"
            label="Material"
          />
        </VStack>
      </FormModal>
    </Dashboard>
  );
};

export default Clientes;
