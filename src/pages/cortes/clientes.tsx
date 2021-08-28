import {
  Button,
  HStack,
  Icon,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import firebase from 'firebase/app';
import Head from 'next/head';
import React from 'react';
import { useForm } from 'react-hook-form';
import { RiAddLine, RiRefreshLine } from 'react-icons/ri';
import { useQuery } from 'react-query';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { SelectWithSearch } from '../../components/Form/Select';
import { FormModal } from '../../components/Modal/FormModal';
import { useCustomer } from '../../hooks/customer';
import { areas } from '../../utils/listOfAreas';

interface CreateCustomerProps {
  firstName: string;
  lastName: string;
  telephone?: string;
  address?: string;
  area?: {
    value: string;
  };
}

const Clientes: React.FC = () => {
  const toast = useToast();
  const { createCustomer, getCustomers } = useCustomer();
  const { data, refetch, isFetching, isLoading } = useQuery('customers', () =>
    getCustomers(),
  );

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

  const handleCreateCustomer = async ({
    firstName,
    lastName,
    address,
    area,
    telephone,
  }: CreateCustomerProps) => {
    try {
      onCloseCreateCustomer();

      // Function to capitalize and strip first name and last name to save in database
      const capitalizeAndStrip = (input: string) => {
        if (input) {
          const updatedInput = input
            .replace(/\S+/g, txt => {
              // uppercase first letter and add rest unchanged
              return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            })
            .trim();

          return updatedInput;
        }

        return input;
      };

      // Default props
      const name = `${capitalizeAndStrip(firstName)} ${capitalizeAndStrip(
        lastName,
      )}`;
      const city = 'Angra dos Reis';
      const state = 'Rio de Janeiro';
      const createdAt = firebase.firestore.Timestamp.fromDate(new Date());
      const updatedAt = firebase.firestore.Timestamp.fromDate(new Date());

      await createCustomer({
        name,
        createdAt,
        updatedAt,
        state,
        city,
        area: area?.value,
        address,
        telephone,
      });

      toast({
        status: 'success',
        title: 'Cliente criado com sucesso',
        isClosable: true,
      });
    } catch {
      toast({
        status: 'error',
        title: 'Erro ao criar cliente',
        isClosable: true,
      });
    }
  };

  const areasToSelect = areas.map(area => {
    return {
      value: area,
      label: area,
    };
  });

  return (
    <>
      <Head>
        <title>Clientes | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Clientes" isLoading={createCustomerIsSubmitting}>
          <Button
            colorScheme="gray"
            onClick={() => refetch()}
            disabled={createCustomerIsSubmitting || isFetching}
            leftIcon={<Icon as={RiRefreshLine} fontSize="20" />}
          >
            Atualizar
          </Button>
          <Button
            colorScheme="orange"
            onClick={onOpenCreateCustomer}
            disabled={createCustomerIsSubmitting || isFetching}
            leftIcon={<Icon as={RiAddLine} fontSize="20" />}
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
            <HStack spacing={8}>
              <FormInput
                {...createCustomerRegister('firstName')}
                error={createCustomerErrors.firstName}
                maxWidth="none"
                name="firstName"
                label="Nome *"
                size="md"
              />
              <FormInput
                {...createCustomerRegister('lastName')}
                error={createCustomerErrors.lastName}
                maxWidth="none"
                name="lastName"
                label="Sobrenome *"
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
            <SelectWithSearch
              options={areasToSelect}
              control={createCustomerControl}
              name="area"
              label="Bairro"
              hasDefaultValue="Japuíba"
            />
          </VStack>
        </FormModal>
      </Dashboard>
    </>
  );
};

export default Clientes;
