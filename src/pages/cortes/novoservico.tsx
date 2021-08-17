import {
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Select,
  Switch,
  VStack,
} from '@chakra-ui/react';
import Head from 'next/head';
import React from 'react';

import { Dashboard } from '../../components/Dashboard';
import { FormInput } from '../../components/Form/Input';
import { areas } from '../../utils/listOfAreas';

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

        {/* Cliente */}
        <Flex as="article" direction="column" maxW="700px">
          <FormControl display="flex" alignItems="center" mt={8}>
            <FormLabel htmlFor="customer-signup" mb="0" color="gray.700">
              Utilizar cliente com cadastro?
            </FormLabel>
            <Switch id="customer-signup" />
          </FormControl>

          <Flex direction="column" align="left" mt={8}>
            <HStack spacing={8}>
              <FormInput size="sm" name="customerFirstName" label="Nome" />
              <FormInput size="sm" name="customerLastName" label="Sobrenome" />
              <FormInput size="sm" name="customerTelephone" label="Telefone" />
            </HStack>
            <HStack spacing={8} mt={4}>
              <FormInput size="sm" name="customerStreet" label="Endereço" />
              <FormControl>
                <FormLabel htmlFor="area-switch" color="gray.700">
                  Bairro
                </FormLabel>
                <Select
                  name="customerArea"
                  size="sm"
                  maxW="250px"
                  w="100%"
                  defaultValue="Japuíba"
                >
                  {areas.map(area => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="city-switch" color="gray.700">
                  Cidade
                </FormLabel>
                <Select name="customerCity" size="sm">
                  <option value="angra" selected>
                    Angra dos Reis
                  </option>
                  <option value="paraty">Paraty</option>
                </Select>
              </FormControl>
            </HStack>
          </Flex>
        </Flex>

        {/* Pedidos */}
        <Flex as="article" direction="column" maxW="700px">
          <HStack spacing={4} mt={16}>
            <Heading color="gray.600" size="lg" whiteSpace="nowrap">
              Pedido
            </Heading>
            <Divider />
          </HStack>
          <VStack align="left" />
        </Flex>
      </Dashboard>
    </>
  );
};

export default NovoServiço;
