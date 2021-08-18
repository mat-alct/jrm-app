import {
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Select,
  Switch,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import Head from 'next/head';
import React from 'react';

import { Dashboard } from '../../components/Dashboard';
import { FormInput } from '../../components/Form/Input';
import { RadioButton } from '../../components/Form/RadioButton';
import { SelectWithSearch } from '../../components/Form/Select';
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
          <VStack align="left" mt={8} spacing={4}>
            <RadioButton
              name="orderType"
              options={['Produção', 'Orçamento']}
              changeFunction={() => console.log('ok')}
              label="Tipo do pedido:"
            />
            <RadioButton
              name="orderStore"
              options={['Japuíba', 'Frade']}
              changeFunction={() => console.log('ok')}
              label="Loja do pedido:"
            />
            <RadioButton
              name="deliveryType"
              options={['Retirar na Loja', 'Entrega']}
              changeFunction={() => console.log('ok')}
              label="Tipo de Entrega:"
            />
            <RadioButton
              name="paymentStatus"
              options={['Receber na Entrega', 'Pago']}
              changeFunction={() => console.log('ok')}
              label="Pagamento:"
            />
            <RadioButton
              name="discount"
              options={['Balcão', 'Marceneiro', 'Sem acréscimo']}
              changeFunction={() => console.log('ok')}
              label="Desconto:"
            />
            <Flex direction="column">
              <Text mb="8px" color="gray.700" fontWeight="bold" mt={4}>
                Observações:
              </Text>
              <Textarea size="sm" />
            </Flex>
          </VStack>
        </Flex>

        {/* Plano de Corte */}
        <Flex as="article" direction="column" mb={16}>
          <HStack spacing={4} mt={16}>
            <Heading color="gray.600" size="lg" whiteSpace="nowrap">
              Plano de Corte
            </Heading>
            <Divider />
          </HStack>
          <HStack mt={8} align="center">
            <SelectWithSearch
              options={[
                {
                  value: 'ok',
                  label: 'MDF BRANCO TX 2 FACES COMUM 15MM',
                },
                {
                  value: 'ok2',
                  label: 'MDF BRANCO TX 2 FACES ULTRA 18MM',
                },
              ]}
            />
            <FormInput size="md" name="amount" placeholder="Quantidade" />
            <FormInput size="md" name="sideA" placeholder="Medida A" />
            <FormInput size="md" name="borderA" placeholder="Fita A" />
            <FormInput size="md" name="sideB" placeholder="Medida B" />
            <FormInput size="md" name="borderB" placeholder="Fita B" />
            <Button colorScheme="orange" size="md" w="100%">
              Adicionar
            </Button>
          </HStack>
        </Flex>
      </Dashboard>
    </>
  );
};

export default NovoServiço;
