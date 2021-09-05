import {
  Button,
  HStack,
  Icon,
  IconButton,
  Table,
  TableCaption,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import firebase from 'firebase/app';
import Head from 'next/head';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { RiAddLine, RiRefreshLine } from 'react-icons/ri';
import { useQuery } from 'react-query';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { FormModal } from '../../components/Form/Modal';
import { FormSelect } from '../../components/Form/Select';
import { SearchBar } from '../../components/SearchBar';
import { useCustomer } from '../../hooks/customer';
import { areas } from '../../utils/listOfAreas';
import { createCustomerSchema } from '../../utils/yup/clientesValidations';

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
  const [searchFilter, setSearchFilter] = useState<string | undefined>(
    undefined,
  );

  const { createCustomer, getCustomers, removeCustomer } = useCustomer();
  const { data, refetch, isFetching, isLoading } = useQuery(
    ['customers', searchFilter],
    () => getCustomers(searchFilter),
  );

  const {
    onOpen: onOpenCreateCustomer,
    isOpen: isOpenCreateCustomer,
    onClose: onCloseCreateCustomer,
  } = useDisclosure();

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
    resolver: yupResolver(createCustomerSchema),
  });

  const handleCreateCustomer = async ({
    firstName,
    lastName,
    address,
    area,
    telephone,
  }: CreateCustomerProps) => {
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

    const name = `${capitalizeAndStrip(firstName)} ${capitalizeAndStrip(
      lastName,
    )}`;

    await createCustomer({
      name,
      createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
      updatedAt: firebase.firestore.Timestamp.fromDate(new Date()),
      state: 'Rio de Janeiro',
      city: 'Angra dos Reis',
      area: area?.value,
      address,
      telephone,
    });
  };

  const handleRemoveCustomer = async (id: string) => {
    await removeCustomer(id);
  };

  const handleSearch = (search: string) => {
    setSearchFilter(search);
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
        <Header
          pageTitle="Clientes"
          isLoading={isFetching || isLoading || createCustomerIsSubmitting}
        >
          {/* Search */}

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
                name="firstName"
                label="Nome *"
              />
              <FormInput
                {...createCustomerRegister('lastName')}
                error={createCustomerErrors.lastName}
                name="lastName"
                label="Sobrenome *"
              />
            </HStack>
            <FormInput
              {...createCustomerRegister('telephone')}
              error={createCustomerErrors.telephone}
              name="telephone"
              label="Telefone"
            />

            <FormInput
              {...createCustomerRegister('address')}
              error={createCustomerErrors.address}
              name="address"
              label="Endereço"
            />
            <FormSelect
              options={areasToSelect}
              control={createCustomerControl}
              name="area"
              label="Bairro"
              placeholder="Selecione..."
            />
          </VStack>
        </FormModal>

        {/* Customers table */}

        {/* If not searched */}
        <SearchBar handleUpdateSearch={handleSearch} />

        {!searchFilter && (
          <Text color="red" mb={4}>
            * É necessário pesquisar o cliente para obter os resultados
          </Text>
        )}

        {/* Table */}
        {searchFilter && (
          <>
            <Table variant="striped" colorScheme="orange">
              <TableCaption>Lista de Clientes</TableCaption>
              <Thead>
                <Tr>
                  <Th>Nome</Th>
                  <Th>Telefone</Th>
                  <Th>Endereço</Th>
                  <Th>Bairro</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {data?.map(customer => {
                  return (
                    <Tr key={customer.id}>
                      <Td>{customer.name}</Td>
                      <Td>{customer.telephone}</Td>
                      <Td>{customer.address}</Td>
                      <Td>{customer.area}</Td>
                      <Td>
                        <HStack spacing={4}>
                          {/* Update Price button */}
                          <IconButton
                            colorScheme="orange"
                            size="sm"
                            aria-label="Editar"
                            icon={<FaEdit />}
                            disabled={createCustomerIsSubmitting}
                            // onClick={() => handleClickOnUpdatePrice(material.id)}
                          />
                          {/* Remove Material Button */}
                          <IconButton
                            colorScheme="orange"
                            size="sm"
                            aria-label="Remover"
                            icon={<FaTrash />}
                            onClick={() => handleRemoveCustomer(customer.id)}
                            disabled={createCustomerIsSubmitting}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </>
        )}
      </Dashboard>
    </>
  );
};

export default Clientes;
