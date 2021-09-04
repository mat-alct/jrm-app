import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import Head from 'next/head';
import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { FormRadio } from '../../components/Form/Radio';
import { Cutlist } from '../../components/NewOrder/Cutlist';
import { areas } from '../../utils/listOfAreas';

interface CreateOrderProps {
  firstName: string;
  lastName: string;
  telephone: string;
  customerId: string;
}

interface CutlistMaterial {
  materialId: string;
  name: string;
  width: number;
  height: number;
  price: number;
}

interface Cutlist {
  id: string;
  material: CutlistMaterial;
  amount: number;
  sideA: number;
  sideB: number;
  borderA: number;
  borderB: number;
  price: number;
}

const NovoServiço = () => {
  const [orderType, setOrderType] = useState('Serviço');

  // * Cutlist Data
  const [cutlist, setCutlist] = useState<Cutlist[]>([]);

  const updateCutlist = useCallback(
    (cutlistData: Cutlist[], maintainOldValues = true) => {
      if (maintainOldValues) {
        setCutlist(prevValue => [...prevValue, ...cutlistData]);
      } else {
        setCutlist([...cutlistData]);
      }
    },
    [],
  );

  // * Other data

  const validationCreateOrderSchema = Yup.object().shape({
    name: Yup.string(),
  });

  const {
    register: createOrderRegister,
    handleSubmit: createOrderHandleSubmit,
    control: createOrderControl,
    formState: {
      errors: createOrderErrors,
      isSubmitting: createOrderIsSubmitting,
    },
  } = useForm<CreateOrderProps>({
    resolver: yupResolver(validationCreateOrderSchema),
  });

  return (
    <>
      <Head>
        <title>Novo Serviço | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header
          pageTitle={`Novo ${
            orderType === 'Orçamento' ? 'Orçamento' : 'Serviço'
          }`}
          isLoading={createOrderIsSubmitting}
        >
          <RadioGroup
            colorScheme="orange"
            mb={4}
            size="lg"
            value={orderType}
            onChange={setOrderType}
          >
            <HStack spacing={8}>
              <Radio isChecked id="isOrder" name="isOrder" value="Serviço">
                Pedido
              </Radio>
              <Radio id="isEstimate" name="isEstimate" value="Orçamento">
                Orçamento
              </Radio>
            </HStack>
          </RadioGroup>
        </Header>

        {/* Plano de Corte */}
        <Cutlist cutlist={cutlist} updateCutlist={updateCutlist} />

        {/* Cliente */}
        <HStack spacing={4} mt={8}>
          <Heading color="gray.600" size="lg" whiteSpace="nowrap">
            Dados do Pedido
          </Heading>
          <Divider />
        </HStack>

        <Flex as="article" direction="column" maxW="1100px">
          <FormControl display="flex" alignItems="center" mt={8}>
            <FormLabel htmlFor="customer-signup" mb="0" color="gray.700">
              Utilizar cliente com cadastro?
            </FormLabel>
            <Switch id="customer-signup" />
          </FormControl>

          <Flex direction="column" align="left" mt={8}>
            <HStack spacing={8}>
              <FormInput name="customerFirstName" label="Nome" />
              <FormInput name="customerLastName" label="Sobrenome" />
              <FormInput name="customerTelephone" label="Telefone" />
            </HStack>
            {orderType === 'Serviço' && (
              <>
                <HStack spacing={8} mt={4}>
                  <FormInput name="customerStreet" label="Endereço" />
                  <FormControl>
                    <FormLabel htmlFor="area-switch" color="gray.700">
                      Bairro
                    </FormLabel>
                    <Select name="customerArea" w="100%" defaultValue="Japuíba">
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
                    <Select name="customerCity">
                      <option value="angra" selected>
                        Angra dos Reis
                      </option>
                      <option value="paraty">Paraty</option>
                    </Select>
                  </FormControl>
                </HStack>
                <VStack align="left" mt={8} spacing={8}>
                  <HStack>
                    <FormRadio
                      options={['Japuíba', 'Frade']}
                      label="Loja do pedido:"
                      name="orderStore"
                      control={createOrderControl}
                      isHorizontal
                    />

                    <FormRadio
                      options={['Retirar na Loja', 'Entrega']}
                      label="Tipo de Entrega:"
                      name="deliveryType"
                      control={createOrderControl}
                      isHorizontal
                    />

                    <Box minW="500px" w="100%">
                      <FormRadio
                        options={[
                          'Receber na Entrega',
                          'Parcialmente Pago',
                          'Pago',
                        ]}
                        label="Pagamento:"
                        name="paymentStatus"
                        control={createOrderControl}
                        isHorizontal
                      />
                    </Box>
                  </HStack>

                  <Flex direction="column">
                    <Text mb="8px" color="gray.700" fontWeight="bold">
                      Observações:
                    </Text>
                    <Textarea size="sm" />
                  </Flex>
                </VStack>
              </>
            )}
          </Flex>
        </Flex>

        <Button colorScheme="orange" isFullWidth my={16}>
          Confirmar
        </Button>
      </Dashboard>
    </>
  );
};

export default NovoServiço;
