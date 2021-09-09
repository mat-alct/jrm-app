/* eslint-disable no-empty */
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
  Stack,
  Switch,
  Text,
  Textarea,
  useBoolean,
  useBreakpointValue,
  VStack,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import firebase from 'firebase/app';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from 'react-query';

import { useCustomer } from '../../hooks/customer';
import { useOrder } from '../../hooks/order';
import { Cutlist } from '../../types';
import { capitalizeAndStrip } from '../../utils/capitalizeAndStripString';
import { areas } from '../../utils/listOfAreas';
import { normalizeTelephoneInput } from '../../utils/normalizeTelephone';
import { createOrderSchema } from '../../utils/yup/novoservicoValidations';
import { FormDatePicker } from '../Form/DatePicker';
import { FormInput } from '../Form/Input';
import { FormRadio } from '../Form/Radio';
import { FormSelect } from '../Form/Select';
import { SearchBar } from '../SearchBar';

interface OrderDataProps {
  orderType: string;
  cutlist: Cutlist[];
  estimateId: string | undefined;
}

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

export const OrderData: React.FC<OrderDataProps> = ({
  orderType,
  cutlist,
  estimateId,
}) => {
  const {
    register: createOrderRegister,
    handleSubmit: createOrderHandleSubmit,
    control: createOrderControl,
    setValue: createOrderSetValue,
    setError: createOrderSetError,
    formState: { errors: createOrderErrors },
  } = useForm<CreateOrderProps>({
    resolver: yupResolver(createOrderSchema),
  });

  const router = useRouter();
  const isLabelHorizontal = useBreakpointValue([false, false, false, true]);

  // CustomerID if a customer is registered
  const [customerId, setCustomerId] = useState('');

  // State used to normalize tel number
  const [tel, setTel] = useState('');

  // change between customer registered or not
  const [customerRegistered, setCustomerRegistered] = useBoolean(false);

  // Find customers using react-query based on searchFilter
  const [searchFilter, setSearchFilter] = useState<string | undefined>(
    undefined,
  );

  const { getCustomers } = useCustomer();

  // Customers found in search. Automatically updates after a new search
  const { data: searchedCustomers } = useQuery(
    ['customers', searchFilter],
    () => getCustomers(searchFilter),
  );

  // Update searchFilter
  const handleSearch = (search: string) => {
    setSearchFilter(search);
  };

  // Set a customer ID if a registered customer is selected.
  const handleSetCustomerId = (id: string) => {
    // unselect customer if it's already selected
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

    // Set customer fields with registered customer data.
    // All fields will be readonly after it, unless you unselect a registered customer.
    createOrderSetValue('firstName', customerSelected.name.split(' ')[0]);
    createOrderSetValue('lastName', customerSelected.name.split(' ')[1]);
    setTel(normalizeTelephoneInput(customerSelected.telephone, ''));
    createOrderSetValue('telephone', customerSelected.telephone);
    createOrderSetValue('address', customerSelected.address);
    createOrderSetValue('area', customerSelected.area);
    createOrderSetValue('city', customerSelected.city);

    setCustomerId(id);
  };

  const { createEstimate, createOrder } = useOrder();

  const handleSubmitOrder = async (orderData: CreateOrderProps) => {
    // Check seller password. Set an error in sellerPassword input if it's incorrect.
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

    // Check if it's delivery and [address, area, city and telephone] are present in orderData.
    // If address is not present, throw a validation error.
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
      try {
        await createEstimate({
          cutlist,
          name,
          customerId,
          telephone: orderData.telephone.replace(/[^A-Z0-9]/gi, ''),
          createdAt,
          updatedAt,
        });

        localStorage.removeItem('app@jrmcompensados:cutlist');

        // Push to listadecortes page
        router.push('/cortes/listadecortes');

        return;
      } catch {}
    }

    try {
      await createOrder({
        cutlist,
        customer,
        orderStatus: 'Em Produção',
        orderStore: orderData.orderStore,
        paymentType: orderData.paymentType,
        deliveryType: orderData.deliveryType,
        seller,
        ps: orderData.ps,
        deliveryDate: orderData.deliveryDate,
        createdAt,
        updatedAt,
      });

      localStorage.removeItem('app@jrmcompensados:cutlist');

      // Remove estimate with same if if it exists in query params
      if (estimateId) {
        await firebase
          .firestore()
          .collection('estimates')
          .doc(estimateId)
          .delete();
      }

      // Push to listadecortes page
      router.push('/cortes/listadecortes');
    } catch {}
  };

  return (
    <>
      <HStack spacing={4} mt={8} mb={4}>
        <Heading color="gray.600" size="lg" whiteSpace="nowrap">
          Dados do Pedido
        </Heading>
        <Divider />
      </HStack>

      {/* Use registered customer switch */}
      <FormControl display="flex" alignItems="center" maxW="300px" mt={4}>
        <FormLabel mb="0" color="gray.700">
          Utilizar cliente com cadastro?
        </FormLabel>
        <Switch
          colorScheme="orange"
          onChange={() => {
            setCustomerId('');

            // alter customRegistered true/false
            setCustomerRegistered.toggle();
          }}
        />
      </FormControl>

      {customerRegistered && (
        <SearchBar mt={4} handleUpdateSearch={handleSearch} minW="300px" />
      )}

      {customerRegistered && searchedCustomers && (
        // List of searched customers
        <List mt={8} spacing={4}>
          <Stack direction={['column', 'column', 'row']} spacing={[4, 4, 4, 8]}>
            {searchedCustomers?.map(customer => (
              <ListItem key={customer.id}>
                <Flex align="center">
                  <Flex direction="column" w="100%">
                    <Text fontWeight="700">{`${customer.name}`}</Text>
                    <Text fontSize="sm">{`${customer.address}, ${customer.area}`}</Text>
                    <Text fontSize="sm">{`Tel: ${customer.telephone}`}</Text>
                    <Button
                      size="sm"
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
          </Stack>
        </List>
      )}

      <Flex
        as="form"
        direction="column"
        align="left"
        mt={8}
        onSubmit={createOrderHandleSubmit(handleSubmitOrder)}
      >
        <Stack
          direction={['column', 'column', 'column', 'row']}
          spacing={[4, 4, 4, 8]}
          align="flex-start"
        >
          <FormInput
            {...createOrderRegister('firstName')}
            name="firstName"
            label="Nome"
            error={createOrderErrors.firstName}
            isReadOnly={Boolean(customerId)}
            size="md"
          />
          <FormInput
            {...createOrderRegister('lastName')}
            name="lastName"
            label="Sobrenome"
            error={createOrderErrors.lastName}
            isReadOnly={Boolean(customerId)}
            size="md"
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
            size="md"
          />
        </Stack>

        {/* Inputs will not be displayed if it's a estimate */}
        {orderType === 'Serviço' && (
          <>
            <Stack
              direction={['column', 'column', 'column', 'row']}
              spacing={[4, 4, 4, 8]}
              mt={[4, 4, 4, 8]}
              align="flex-start"
            >
              <FormInput
                {...createOrderRegister('address')}
                error={createOrderErrors.address}
                name="address"
                label="Endereço"
                isReadOnly={Boolean(customerId)}
                size="md"
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
                isClearable
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
                isClearable
              />
            </Stack>

            <VStack align="left" mt={8} spacing={[4, 4, 4, 8]}>
              <FormRadio
                options={['Japuíba', 'Frade']}
                label="Loja do pedido:"
                name="orderStore"
                control={createOrderControl}
                isHorizontal
                isLabelHorizontal={isLabelHorizontal}
              />

              <FormRadio
                options={['Retirar na Loja', 'Entrega']}
                label="Tipo de Entrega:"
                name="deliveryType"
                control={createOrderControl}
                isHorizontal
                isLabelHorizontal={isLabelHorizontal}
              />

              <FormRadio
                options={['Pago', 'Parcialmente Pago', 'Receber na Entrega']}
                label="Pagamento:"
                name="paymentType"
                control={createOrderControl}
                isHorizontal
                isLabelHorizontal={isLabelHorizontal}
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

        <Box mt={[8, 8, 8, 16]} mx="auto">
          <FormInput
            {...createOrderRegister('sellerPassword')}
            error={createOrderErrors.sellerPassword}
            name="sellerPassword"
            label="Senha:"
            type="password"
            maxW="300px"
            variant="flushed"
            isHorizontal
          />
        </Box>

        <Button
          colorScheme="orange"
          size="lg"
          isFullWidth
          my={8}
          type="submit"
          disabled={cutlist.length < 1}
        >
          Confirmar Pedido
        </Button>
      </Flex>
    </>
  );
};
