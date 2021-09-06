import {
  Box,
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
import React, { useCallback, useEffect, useState } from 'react';
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
import { OrderData } from '../../components/NewOrder/OrderData';
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
  sellerPassword: string;
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
  // * Cutlist Data
  const [cutlist, setCutlist] = useState<Cutlist[]>([]);

  const updateCutlist = useCallback(
    (cutlistData: Cutlist[], maintainOldValues = true) => {
      if (maintainOldValues) {
        setCutlist(prevValue => {
          localStorage.setItem(
            'app@jrmcompensados:cutlist',
            JSON.stringify([...prevValue, ...cutlistData]),
          );

          return [...prevValue, ...cutlistData];
        });
      } else {
        setCutlist([...cutlistData]);

        localStorage.setItem(
          'app@jrmcompensados:cutlist',
          JSON.stringify([...cutlistData]),
        );
      }
    },
    [],
  );

  useEffect(() => {
    const cutlistFromStorage = localStorage.getItem(
      'app@jrmcompensados:cutlist',
    );

    if (cutlistFromStorage) {
      setCutlist(JSON.parse(cutlistFromStorage));
    }
  }, []);

  // Change between "Serviço" e "Orçamento"
  const [orderType, setOrderType] = useState<'Serviço' | 'Orçamento'>(
    'Serviço',
  );

  const validationCreateOrderSchema = Yup.object().shape({
    firstName: Yup.string().required('Nome obrigatório'),
    lastName: Yup.string().required('Sobrenome obrigatório'),
    telephone: Yup.string(),
    address: Yup.string(),
    area: Yup.string(),
    city: Yup.string(),
    orderStore: Yup.string(),
    deliveryType: Yup.string(),
    paymentType: Yup.string(),
    ps: Yup.string(),
    deliveryDate: Yup.date().required('Data de Entrega obrigatória'),
    sellerPassword: Yup.string().required('Senha do vendedor obrigatória'),
  });

  const {
    register: createOrderRegister,
    handleSubmit: createOrderHandleSubmit,
    control: createOrderControl,
    setValue: createOrderSetValue,
    setError: createOrderSetError,
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

  // * Order data
  const { createEstimate, createOrder } = useOrder();

  const handleSubmitOrder = async (orderData: CreateOrderProps) => {
    // Check seller password

    const sellerDoc = await firebase
      .firestore()
      .collection('sellers')
      .doc(orderData.sellerPassword)
      .get()
      .then(doc => doc.data() as { name: string });

    if (!sellerDoc) {
      createOrderSetError('sellerPassword', {
        type: 'value',
        message: 'Senha inválida',
      });

      return;
    }

    const seller = sellerDoc.name;

    // Check if it's delivery and address is present in orderData. If address is not present, throw a validation error.
    if (orderData.deliveryType === 'Entrega' && orderData.telephone === '') {
      createOrderSetError('telephone', {
        type: 'required',
        message:
          'Pedido marcado como entrega. O telefone é obrigatório nesse caso.',
      });

      return;
    }

    if (orderData.deliveryType === 'Entrega' && orderData.address === '') {
      createOrderSetError('address', {
        type: 'required',
        message:
          'Pedido marcado como entrega. O endereço é obrigatório nesse caso.',
      });

      return;
    }

    if (orderData.deliveryType === 'Entrega' && orderData.area === undefined) {
      createOrderSetError('area', {
        type: 'required',
        message:
          'Pedido marcado como entrega. O bairro é obrigatório nesse caso.',
      });

      return;
    }

    if (orderData.deliveryType === 'Entrega' && orderData.city === undefined) {
      createOrderSetError('city', {
        type: 'required',
        message:
          'Pedido marcado como entrega. A cidade é obrigatória nesse caso.',
      });

      return;
    }

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
      seller,
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

        <OrderData orderType={orderType} />
      </Dashboard>
    </>
  );
};

export default NovoServiço;
