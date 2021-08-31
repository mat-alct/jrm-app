import {
  Button,
  Flex,
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
  useToast,
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
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { SelectWithSearch } from '../../components/Form/Select';
import { FormModal } from '../../components/Modal/FormModal';
import { Pagination } from '../../components/Pagination';
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

interface SearchProps {
  customerName: string;
}

const Clientes: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState<string | undefined>(
    undefined,
  );

  const toast = useToast();
  const { createCustomer, getCustomers, removeCustomer } = useCustomer();
  const { data, refetch, isFetching, isLoading } = useQuery(
    ['customers', searchFilter],
    () => getCustomers(searchFilter),
  );

  const handleSearch = (search: SearchProps) => {
    setSearchFilter(search.customerName);
  };

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

  const validationSearchSchema = Yup.object().shape({
    customerName: Yup.string(),
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

  // Create Customer Search useForm
  const {
    register: searchRegister,
    handleSubmit: searchHandleSubmit,
    formState: { errors: searchErrors, isSubmitting: searchIsSubmitting },
  } = useForm<SearchProps>({
    resolver: yupResolver(validationSearchSchema),
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

  const handleRemoveCustomer = async (id: string) => {
    try {
      await removeCustomer(id);

      toast({
        status: 'success',
        title: 'Cliente removido com sucesso',
      });
    } catch {
      toast({
        status: 'error',
        title: 'Erro ao remover cliente',
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
        <Header
          pageTitle="Clientes"
          isLoading={isFetching || isLoading || createCustomerIsSubmitting}
        >
          {/* Search */}
          <Flex
            as="form"
            justify="flex-start"
            align="center"
            maxW="300px"
            onSubmit={searchHandleSubmit(handleSearch)}
          >
            <FormInput
              {...searchRegister('customerName')}
              name="customerName"
              placeholder="Digite o nome do cliente"
              size="md"
              borderRightRadius="none"
              error={searchErrors.customerName}
            />
            <Button
              isDisabled={searchIsSubmitting}
              colorScheme="orange"
              type="submit"
              borderLeftRadius="none"
            >
              Buscar
            </Button>
          </Flex>
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

        {/* Customers table */}

        {/* If not searched */}
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

            <Pagination
              totalCountOfRegisters={data?.length || 1}
              registersPerPage={10}
              onPageChange={setPage}
              currentPage={page}
            />
          </>
        )}
      </Dashboard>
    </>
  );
};

export default Clientes;
