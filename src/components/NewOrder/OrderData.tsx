"use client";
// @ts-nocheck
/* eslint-disable no-empty */
import {
  Box,
  Button,
  Fieldset,
  Flex,
  Heading,
  HStack,
  List,
  ListItem,
  Stack,
  Switch,
  Text,
  Textarea,
  useBreakpointValue,
  VStack,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
// 1. Importação atualizada para @tanstack/react-query
import { useQuery } from '@tanstack/react-query';

// 2. Importações modulares do Firebase v9+
import { deleteDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

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
import { useBoolean } from '@/hooks/useBoolean';

// --- Interfaces (sem mudanças) ---
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

// 3. Tipagem do componente simplificada
export const OrderData = ({ orderType, cutlist, estimateId }: OrderDataProps) => {
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

  const [customerId, setCustomerId] = useState('');
  const [tel, setTel] = useState('');
  const [customerRegistered, setCustomerRegistered] = useBoolean(false);
  const [searchFilter, setSearchFilter] = useState<string | undefined>(undefined);
  const { getCustomers } = useCustomer();

  const { data: searchedCustomers } = useQuery({
    queryKey: ['customers', searchFilter],
    queryFn: () => getCustomers(searchFilter),
  });

  const handleSearch = (search: string) => {
    setSearchFilter(search);
  };

  const handleSetCustomerId = (id: string) => {
    if (customerId === id) {
      setCustomerId('');
      return;
    }
    const customerSelected = searchedCustomers?.find((customer) => customer.id === id);
    if (!customerSelected) throw new Error('Cliente não encontrado');
    createOrderSetValue('firstName', customerSelected.name.split(' ')[0]);
    createOrderSetValue('lastName', customerSelected.name.split(' ')[1] || '');
    setTel(normalizeTelephoneInput(customerSelected.telephone, ''));
    createOrderSetValue('telephone', customerSelected.telephone);
    createOrderSetValue('address', customerSelected.address);
    createOrderSetValue('area', customerSelected.area);
    createOrderSetValue('city', customerSelected.city);
    setCustomerId(id);
  };

  const { createEstimate, createOrder } = useOrder();

  const handleSubmitOrder: SubmitHandler<CreateOrderProps> = async (orderData: CreateOrderProps) => {
    // 5. Chamadas ao Firebase atualizadas para o padrão modular (v9+)
    const sellerRef = doc(db, 'sellers', orderData.sellerPassword);
    const sellerSnap = await getDoc(sellerRef);
    const sellerDoc = sellerSnap.data() as { name: string } | undefined;

    if (!sellerDoc) {
      createOrderSetError('sellerPassword', { type: 'value', message: 'Senha inválida' });
      return;
    }
    const seller = sellerDoc.name;

    if (orderData.deliveryType === 'Entrega' && orderData.telephone === '') {
      createOrderSetError('telephone', { type: 'required', message: 'Pedido marcado como entrega. O telefone é obrigatório nesse caso.' });
      return;
    }
    if (orderData.deliveryType === 'Entrega' && orderData.address === '') {
      createOrderSetError('address', { type: 'required', message: 'Pedido marcado como entrega. O endereço é obrigatório nesse caso.' });
      return;
    }
    if (orderData.deliveryType === 'Entrega' && orderData.area === undefined) {
      createOrderSetError('area', { type: 'required', message: 'Pedido marcado como entrega. O bairro é obrigatório nesse caso.' });
      return;
    }
    if (orderData.deliveryType === 'Entrega' && orderData.city === undefined) {
      createOrderSetError('city', { type: 'required', message: 'Pedido marcado como entrega. A cidade é obrigatória nesse caso.' });
      return;
    }

    const name = `${capitalizeAndStrip(orderData.firstName)} ${capitalizeAndStrip(orderData.lastName)}`;
    const createdAt = Timestamp.fromDate(new Date());
    const updatedAt = Timestamp.fromDate(new Date());
    const customer = {
      name,
      telephone: orderData.telephone.replace(/[^A-Z0-9]/gi, ''),
      address: orderData.address,
      area: orderData.area,
      city: orderData.city,
      state: 'Rio de Janeiro',
      customerId,
    };

    if (orderType === 'Orçamento') {
      try {
        await createEstimate({ cutlist, name, customerId, telephone: orderData.telephone.replace(/[^A-Z0-9]/gi, ''), createdAt, updatedAt });
        localStorage.removeItem('app@jrmcompensados:cutlist');
        router.push('/cortes/listadecortes');
        return;
      } catch {}
    }

    try {
      await createOrder({ cutlist, customer, orderStatus: 'Em Produção', orderStore: orderData.orderStore, paymentType: orderData.paymentType, deliveryType: orderData.deliveryType, seller, ps: orderData.ps, deliveryDate: Timestamp.fromDate(orderData.deliveryDate), createdAt, updatedAt });
      localStorage.removeItem('app@jrmcompensados:cutlist');
      if (estimateId) {
        const estimateToDeleteRef = doc(db, 'estimates', estimateId);
        await deleteDoc(estimateToDeleteRef);
      }
      router.push('/cortes/listadecortes');
    } catch {}
  };

  return (
    // O JSX restante permanece o mesmo, pois já usa componentes reutilizáveis.
    <>
      <HStack gap={4} mt={8} mb={4}>
        <Heading color="gray.600" size="lg" whiteSpace="nowrap">Dados do Pedido</Heading>
        <Box divideX="2px" />
      </HStack>
      <Fieldset.Root display="flex" alignItems="center" maxW="300px" mt={4}>
        <Fieldset.Legend mb="0" color="gray.700">Utilizar cliente com cadastro?</Fieldset.Legend>
        <Switch.Root colorScheme="orange" onChange={() => { setCustomerId(''); setCustomerRegistered.toggle(); }}/>
      </Fieldset.Root>
      {customerRegistered && <SearchBar mt={4} handleUpdateSearch={handleSearch} minW="300px" />}
      {customerRegistered && searchedCustomers && (
        <List.Root mt={8} gap={4}>
          <Stack direction={['column', 'column', 'row']} gap={[4, 4, 4, 8]}>
            {searchedCustomers?.map(customer => (
              <ListItem key={customer.id}>
                <Flex align="center">
                  <Flex direction="column" w="100%">
                    <Text fontWeight="700">{`${customer.name}`}</Text>
                    <Text fontSize="sm">{`${customer.address}, ${customer.area}`}</Text>
                    <Text fontSize="sm">{`Tel: ${customer.telephone}`}</Text>
                    <Button size="sm" colorScheme={customer.id === customerId ? 'green' : 'gray'} onClick={() => handleSetCustomerId(customer.id)}>
                      {customer.id === customerId ? 'Selecionado' : 'Selecionar'}
                    </Button>
                  </Flex>
                </Flex>
              </ListItem>
            ))}
          </Stack>
        </List.Root>
      )}
      <Flex as="form" direction="column" align="left" mt={8} onSubmit={createOrderHandleSubmit(handleSubmitOrder)}>
        <Stack direction={['column', 'column', 'column', 'row']} gap={[4, 4, 4, 8]} align="flex-start">
          <FormInput {...createOrderRegister('firstName')} name="firstName" label="Nome" error={createOrderErrors.firstName} readOnly={Boolean(customerId)} size="md"/>
          <FormInput {...createOrderRegister('lastName')} name="lastName" label="Sobrenome" error={createOrderErrors.lastName} readOnly={Boolean(customerId)} size="md"/>
          <FormInput {...createOrderRegister('telephone')} error={createOrderErrors.telephone} name="telephone" label="Telefone" value={tel} onChange={e => setTel((prevValue: string): string => normalizeTelephoneInput(e.target.value, prevValue))} readOnly={Boolean(customerId)} size="md"/>
        </Stack>
        {orderType === 'Serviço' && (
          <>
            <Stack direction={['column', 'column', 'column', 'row']} gap={[4, 4, 4, 8]} mt={[4, 4, 4, 8]} align="flex-start">
              <FormInput {...createOrderRegister('address')} error={createOrderErrors.address} name="address" label="Endereço" readOnly={Boolean(customerId)} size="md"/>
              <FormSelect options={areas.map(area => ({ value: area, label: area }))} name="area" control={createOrderControl} label="Bairro" isDisabled={Boolean(customerId)} placeholder="Selecione o bairro..." isClearable/>
              <FormSelect options={[{ value: 'Angra dos Reis', label: 'Angra dos Reis' }, { value: 'Paraty', label: 'Paraty' }]} name="city" control={createOrderControl} label="Cidade" isDisabled={Boolean(customerId)} placeholder="Selecione a cidade..." isClearable/>
            </Stack>
            <VStack align="left" mt={8} gap={[4, 4, 4, 8]}>
              <FormRadio options={['Japuíba', 'Frade']} label="Loja do pedido:" name="orderStore" control={createOrderControl} isHorizontal isLabelHorizontal={isLabelHorizontal}/>
              <FormRadio options={['Retirar na Loja', 'Entrega']} label="Tipo de Entrega:" name="deliveryType" control={createOrderControl} isHorizontal isLabelHorizontal={isLabelHorizontal}/>
              <FormRadio options={['Pago', 'Parcialmente Pago', 'Receber na Entrega']} label="Pagamento:" name="paymentType" control={createOrderControl} isHorizontal isLabelHorizontal={isLabelHorizontal}/>
              <FormDatePicker name="deliveryDate" control={createOrderControl} />
              <Flex direction="column"><Text mb="8px" color="gray.700" fontWeight="bold">Observações:</Text><Textarea {...createOrderRegister('ps')} size="sm"/></Flex>
            </VStack>
          </>
        )}
        <Box mt={[8, 8, 8, 16]} mx="auto">
          <FormInput {...createOrderRegister('sellerPassword')} error={createOrderErrors.sellerPassword} name="sellerPassword" label="Senha:" type="password" maxW="300px" variant="flushed" isHorizontal/>
        </Box>
        <Button colorScheme="orange" size="lg" width="100%" my={8} type="submit" disabled={cutlist.length < 1}>Confirmar Pedido</Button>
      </Flex>
    </>
  );
};