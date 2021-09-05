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
  Switch,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import firebase from 'firebase/app';
import Head from 'next/head';
import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { FormRadio } from '../../components/Form/Radio';
import { FormSelect } from '../../components/Form/Select';
import { Cutlist } from '../../components/NewOrder/Cutlist';
import { useOrder } from '../../hooks/order';
import { areas } from '../../utils/listOfAreas';
import { normalizeTelephoneInput } from '../../utils/normalizeTelephone';

interface CreateOrderProps {
  firstName: string;
  lastName: string;
  telephone: string;
  address: string;
  area: string;
  city: string;
  orderStore: string;
  deliveryType: string;
  paymentType: string;
  ps: string;
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
  // Change between "Serviço" e "Orçamento"
  const [orderType, setOrderType] = useState('Serviço');

  // NormalizeTelephone
  const [tel, setTel] = useState('');

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

  // * Order data
  const { createEstimate, createOrder } = useOrder();

  const validationCreateOrderSchema = Yup.object().shape({
    firstName: Yup.string().required(),
    lastName: Yup.string().required(),
    telephone: Yup.string(),
    address: Yup.string(),
    area: Yup.string(),
    city: Yup.string(),
    orderStore: Yup.string(),
    deliveryType: Yup.string(),
    paymentType: Yup.string(),
    ps: Yup.string(),
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

  const handleSubmitOrder = async (orderData: CreateOrderProps) => {
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
    const name = `${capitalizeAndStrip(
      orderData.firstName,
    )} ${capitalizeAndStrip(orderData.lastName)}`;

    // If it's a estimate, uses createEstimate function and end submit
    if (orderType === 'Orçamento') {
      await createEstimate({
        cutlist,
        name,
        telephone: orderData.telephone.replace(/[^A-Z0-9]/gi, ''),
        createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
        updatedAt: firebase.firestore.Timestamp.fromDate(new Date()),
      });

      return;
    }

    // Create data with customer data
    const customer = {
      name,
      telephone: orderData.telephone.replace(/[^A-Z0-9]/gi, ''),
      address: orderData.address,
      area: orderData.area,
      city: orderData.city,
      state: 'Rio de Janeiro',
      customerId: '',
    };

    await createOrder({
      cutlist,
      customer,
      orderStatus: 'Em produção',
      orderStore: orderData.orderStore,
      paymentType: orderData.paymentType,
      deliveryType: orderData.deliveryType,
      seller: 'Mateus',
      ps: orderData.ps,
      createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
      updatedAt: firebase.firestore.Timestamp.fromDate(new Date()),
    });
  };

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

        <Flex
          as="form"
          direction="column"
          onSubmit={createOrderHandleSubmit(handleSubmitOrder)}
        >
          <FormControl display="flex" alignItems="center" mt={8}>
            <FormLabel htmlFor="customer-signup" mb="0" color="gray.700">
              Utilizar cliente com cadastro?
            </FormLabel>
            <Switch id="customer-signup" />
          </FormControl>

          <Flex direction="column" align="left" mt={8}>
            <HStack spacing={8} align="flex-start">
              <FormInput
                {...createOrderRegister('firstName')}
                name="firstName"
                label="Nome"
                error={createOrderErrors.firstName}
              />
              <FormInput
                {...createOrderRegister('lastName')}
                name="lastName"
                label="Sobrenome"
                error={createOrderErrors.lastName}
              />
              <FormInput
                {...createOrderRegister('telephone')}
                error={createOrderErrors.telephone}
                name="telephone"
                label="Telefone"
                value={tel}
                onChange={e =>
                  setTel((prevValue: string): string =>
                    normalizeTelephoneInput(e.target.value, prevValue),
                  )
                }
              />
            </HStack>
            {orderType === 'Serviço' && (
              <>
                <HStack spacing={8} mt={4} align="flex-start">
                  <FormInput
                    {...createOrderRegister('address')}
                    error={createOrderErrors.address}
                    name="address"
                    label="Endereço"
                  />
                  <FormSelect
                    options={areas.map(area => {
                      return { value: area, label: area };
                    })}
                    name="area"
                    control={createOrderControl}
                    label="Bairro"
                  />
                  <FormSelect
                    options={[
                      { value: 'Angra dos Reis', label: 'Angra dos Reis' },
                      { value: 'Paraty', label: 'Paraty' },
                    ]}
                    name="city"
                    control={createOrderControl}
                    label="Cidade"
                  />
                </HStack>
                <VStack align="left" mt={8} spacing={8}>
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

                  <FormRadio
                    options={[
                      'Receber na Entrega',
                      'Parcialmente Pago',
                      'Pago',
                    ]}
                    label="Pagamento:"
                    name="paymentType"
                    control={createOrderControl}
                    isHorizontal
                  />

                  <Flex direction="column">
                    <Text mb="8px" color="gray.700" fontWeight="bold">
                      Observações:
                    </Text>
                    <Textarea
                      {...createOrderRegister('ps')}
                      error={createOrderErrors.ps}
                      size="sm"
                    />
                  </Flex>
                </VStack>
              </>
            )}
          </Flex>

          <Button colorScheme="orange" isFullWidth my={16} type="submit">
            Confirmar
          </Button>
        </Flex>
      </Dashboard>
    </>
  );
};

export default NovoServiço;
