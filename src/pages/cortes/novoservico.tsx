import {
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  List,
  ListItem,
  Radio,
  RadioGroup,
  Switch,
  Text,
  Textarea,
  useBoolean,
  VStack,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import firebase from 'firebase/app';
import Head from 'next/head';
import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from 'react-query';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormDatePicker } from '../../components/Form/DatePicker';
import { FormInput } from '../../components/Form/Input';
import { FormRadio } from '../../components/Form/Radio';
import { FormSelect } from '../../components/Form/Select';
import { Cutlist } from '../../components/NewOrder/Cutlist';
import { SearchBar } from '../../components/SearchBar';
import { useCustomer } from '../../hooks/customer';
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
  deliveryDate: Date;
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
    deliveryDate: Yup.date().required('Data de Entrega obrigatória'),
  });

  const {
    register: createOrderRegister,
    handleSubmit: createOrderHandleSubmit,
    control: createOrderControl,
    setValue: createOrderSetValue,
    formState: {
      errors: createOrderErrors,
      isSubmitting: createOrderIsSubmitting,
    },
  } = useForm<CreateOrderProps>({
    resolver: yupResolver(validationCreateOrderSchema),
  });

  // change between customer registered or not
  const [customerRegistered, setCustomerRegistered] = useBoolean(false);
  // NormalizeTelephone
  const [tel, setTel] = useState('');
  const [searchFilter, setSearchFilter] = useState<string | undefined>(
    undefined,
  );
  const [customerId, setCustomerId] = useState('');

  const { getCustomers } = useCustomer();
  const { data: searchedCustomers } = useQuery(
    ['customers', searchFilter],
    () => getCustomers(searchFilter),
  );

  const handleSetCustomerId = (id: string) => {
    if (customerId === id) {
      setCustomerId('');

      return;
    }

    const customerSelected = searchedCustomers?.find(
      customer => customer.id === id,
    );

    if (!customerSelected) {
      throw new Error();
    }

    createOrderSetValue('firstName', customerSelected.name.split(' ')[0]);
    createOrderSetValue('lastName', customerSelected.name.split(' ')[1]);
    setTel(normalizeTelephoneInput(customerSelected.telephone, ''));
    createOrderSetValue('address', customerSelected.address);
    createOrderSetValue('area', customerSelected.area);
    createOrderSetValue('city', customerSelected.city);

    setCustomerId(id);
  };

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

    // Create a name const with firstName and lastName capitalized and striped
    const name = `${capitalizeAndStrip(
      orderData.firstName,
    )} ${capitalizeAndStrip(orderData.lastName)}`;

    // Set createdAt and updatedAt values to now
    const createdAt = firebase.firestore.Timestamp.fromDate(new Date());
    const updatedAt = firebase.firestore.Timestamp.fromDate(new Date());

    // Create a customer const with all customer data
    const customer = {
      name,
      telephone: orderData.telephone.replace(/[^A-Z0-9]/gi, ''),
      address: orderData.address,
      area: orderData.area,
      city: orderData.city,
      state: 'Rio de Janeiro',
      customerId,
    };

    // If it's a estimate, uses createEstimate function and end submit
    if (orderType === 'Orçamento') {
      await createEstimate({
        cutlist,
        name,
        customerId,
        telephone: orderData.telephone.replace(/[^A-Z0-9]/gi, ''),
        createdAt,
        updatedAt,
      });

      return;
    }

    await createOrder({
      cutlist,
      customer,
      orderStatus: 'Em produção',
      orderStore: orderData.orderStore,
      paymentType: orderData.paymentType,
      deliveryType: orderData.deliveryType,
      seller: 'Mateus',
      ps: orderData.ps,
      deliveryDate: orderData.deliveryDate,
      createdAt,
      updatedAt,
    });
  };

  const handleSearch = (search: string) => {
    setSearchFilter(search);
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

        <FormControl display="flex" alignItems="center" maxW="300px" mt={4}>
          <FormLabel htmlFor="customer-signup" mb="0" color="gray.700">
            Utilizar cliente com cadastro?
          </FormLabel>
          <Switch
            value="ok"
            id="customer-signup"
            colorScheme="orange"
            onChange={() => {
              setCustomerId('');

              setCustomerRegistered.toggle();
            }}
          />
        </FormControl>

        {customerRegistered && (
          <SearchBar mt={4} handleUpdateSearch={handleSearch} minW="400px" />
        )}

        {customerRegistered && searchedCustomers && (
          <List mt={8} spacing={4}>
            <HStack spacing={8}>
              {searchedCustomers?.map(customer => (
                <ListItem key={customer.id}>
                  <Flex align="center">
                    <Flex direction="column">
                      <Text fontWeight="700">{`${customer.name}`}</Text>
                      <Text fontSize="sm">{`${
                        customer?.address || 'Rua não cadastrada'
                      }, ${customer?.area || 'Bairro não cadastrado'}`}</Text>
                      <Text fontSize="sm">{`Tel: ${
                        customer?.telephone || 'Telefone não cadastrado'
                      }`}</Text>
                      <Button
                        colorScheme={
                          customer.id === customerId ? 'green' : 'gray'
                        }
                        onClick={() => handleSetCustomerId(customer.id)}
                      >
                        {customer.id === customerId
                          ? 'Selecionado'
                          : 'Selecionar'}
                      </Button>
                    </Flex>
                  </Flex>
                </ListItem>
              ))}
            </HStack>
          </List>
        )}

        <Flex
          as="form"
          direction="column"
          onSubmit={createOrderHandleSubmit(handleSubmitOrder)}
        >
          <Flex direction="column" align="left" mt={8}>
            <HStack spacing={8} align="flex-start">
              <FormInput
                {...createOrderRegister('firstName')}
                name="firstName"
                label="Nome"
                error={createOrderErrors.firstName}
                isReadOnly={Boolean(customerId)}
              />
              <FormInput
                {...createOrderRegister('lastName')}
                name="lastName"
                label="Sobrenome"
                error={createOrderErrors.lastName}
                isReadOnly={Boolean(customerId)}
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
                isReadOnly={Boolean(customerId)}
              />
            </HStack>

            {orderType === 'Serviço' && (
              <>
                <HStack spacing={8} mt={4} mb={4} align="flex-start">
                  <FormInput
                    {...createOrderRegister('address')}
                    error={createOrderErrors.address}
                    name="address"
                    label="Endereço"
                    isReadOnly={Boolean(customerId)}
                  />
                  <FormSelect
                    options={areas.map(area => {
                      return { value: area, label: area };
                    })}
                    name="area"
                    control={createOrderControl}
                    label="Bairro"
                    isDisabled={Boolean(customerId)}
                    placeholder="Selecione o bairro..."
                  />
                  <FormSelect
                    options={[
                      { value: 'Angra dos Reis', label: 'Angra dos Reis' },
                      { value: 'Paraty', label: 'Paraty' },
                    ]}
                    name="city"
                    control={createOrderControl}
                    label="Cidade"
                    isDisabled={Boolean(customerId)}
                    placeholder="Selecione a cidade..."
                  />
                </HStack>

                <VStack align="left" mt={4} spacing={8}>
                  <FormRadio
                    options={['Japuíba', 'Frade']}
                    label="Loja do pedido:"
                    name="orderStore"
                    control={createOrderControl}
                    isHorizontal
                    isLabelHorizontal
                  />

                  <FormRadio
                    options={['Retirar na Loja', 'Entrega']}
                    label="Tipo de Entrega:"
                    name="deliveryType"
                    control={createOrderControl}
                    isHorizontal
                    isLabelHorizontal
                  />

                  <FormRadio
                    options={[
                      'Pago',
                      'Parcialmente Pago',
                      'Receber na Entrega',
                    ]}
                    label="Pagamento:"
                    name="paymentType"
                    control={createOrderControl}
                    isHorizontal
                    isLabelHorizontal
                  />

                  <FormDatePicker
                    name="deliveryDate"
                    control={createOrderControl}
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

          <Button
            colorScheme="orange"
            size="lg"
            isFullWidth
            my={16}
            type="submit"
            disabled={cutlist.length < 1}
          >
            Confirmar Pedido
          </Button>
        </Flex>
      </Dashboard>
    </>
  );
};

export default NovoServiço;
