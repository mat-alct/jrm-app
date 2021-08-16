import { Button, Divider, Heading, HStack, VStack } from '@chakra-ui/react';
import Head from 'next/head';

import { Dashboard } from '../../components/Dashboard';
import { FormInput } from '../../components/Form/Input';

const NovoServiço = () => {
  return (
    <>
      <Head>
        <title>Novo Serviço | JRM Compensados</title>
      </Head>
      <Dashboard pageTitle="Novo Serviço">
        <HStack spacing={4}>
          <Heading color="gray.600" size="lg" whiteSpace="nowrap">
            Cliente
          </Heading>
          <Divider />
        </HStack>
        <HStack spacing={8} mt={8}>
          <Button colorScheme="orange">Cliente Rápido</Button>
          <Button colorScheme="orange" disabled>
            Cliente Cadastrado
          </Button>
        </HStack>
        <VStack align="left" spacing={4} mt={8} maxW="900px" w="100%">
          <HStack spacing={8}>
            <FormInput name="customerName" label="Nome do Cliente" />
            <FormInput name="customerTelephone" label="Telefone" />
          </HStack>
          <HStack spacing={8}>
            <FormInput name="customerStreet" label="Endereço" />
            <FormInput name="customerArea" label="Bairro" />
            <FormInput name="customerCity" label="Cidade" />
          </HStack>
        </VStack>
        <HStack spacing={4} mt={16}>
          <Heading color="gray.600" size="lg" whiteSpace="nowrap">
            Pedido
          </Heading>
          <Divider />
        </HStack>
      </Dashboard>
    </>
  );
};

export default NovoServiço;
