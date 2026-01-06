'use client';

import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Stack,
  Text,
  Textarea,
  useBreakpointValue,
  SimpleGrid,
  Switch, // Novo
  Badge,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form'; // Adicionado Controller

import {
  deleteDoc,
  doc,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../services/firebase';

import { useOrder } from '../../hooks/order';
import { Cutlist } from '../../types';
import { capitalizeAndStrip } from '../../utils/capitalizeAndStripString';
import { areas } from '../../utils/listOfAreas';
import { normalizeTelephoneInput } from '../../utils/normalizeTelephone';
import {
  createOrderSchema,
  createEstimateSchema,
} from '../../utils/yup/novoservicoValidations';
import { FormDatePicker } from '../Form/DatePicker';
import { FormInput } from '../Form/Input';
import { FormRadio } from '../Form/Radio';
import { FormSelect } from '../Form/Select';

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
  // city removido
  orderStore: string;
  deliveryType: string;
  paymentType: string;
  deliveryDate: Date;
  ps: string;
  sellerPassword: string;
  isUrgent: boolean; // Novo
  amountDue: string; // Novo
}

export const OrderData = ({
  orderType,
  cutlist,
  estimateId,
}: OrderDataProps) => {
  const validationSchema =
    orderType === 'Orçamento' ? createEstimateSchema : createOrderSchema;

  const {
    register: createOrderRegister,
    handleSubmit: createOrderHandleSubmit,
    control: createOrderControl,
    setValue: createOrderSetValue,
    setError: createOrderSetError,
    watch, // Novo: para observar se é urgente
    formState: { errors: createOrderErrors },
  } = useForm<CreateOrderProps>({
    resolver: yupResolver(validationSchema as any),
    defaultValues: {
      isUrgent: false,
    },
  });

  const router = useRouter();
  const isLabelHorizontal = useBreakpointValue({ base: false, lg: true });
  const [tel, setTel] = React.useState('');
  const { createEstimate, createOrder } = useOrder();

  // Observa o valor de 'isUrgent' para mudar a cor do card
  const isUrgent = watch('isUrgent');

  const handleSubmitOrder: SubmitHandler<
    CreateOrderProps
  > = async orderData => {
    // --- LÓGICA DE SENHA DO VENDEDOR ---
    const sellersRef = collection(db, 'sellers');
    const q = query(
      sellersRef,
      where('password', '==', orderData.sellerPassword),
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      createOrderSetError('sellerPassword', {
        type: 'value',
        message: 'Senha inválida',
      });
      return;
    }

    const sellerDoc = querySnapshot.docs[0].data() as { name: string };
    const seller = sellerDoc.name;
    // ------------------------------------

    if (orderType === 'Serviço' && orderData.deliveryType === 'Entrega') {
      if (!orderData.telephone) {
        createOrderSetError('telephone', {
          type: 'required',
          message: 'Telefone obrigatório para entrega.',
        });
        return;
      }
      if (!orderData.address) {
        createOrderSetError('address', {
          type: 'required',
          message: 'Endereço obrigatório para entrega.',
        });
        return;
      }
      if (!orderData.area) {
        createOrderSetError('area', {
          type: 'required',
          message: 'Bairro obrigatório para entrega.',
        });
        return;
      }
    }

    const name = `${capitalizeAndStrip(orderData.firstName)} ${capitalizeAndStrip(orderData.lastName)}`;
    const createdAt = Timestamp.fromDate(new Date());
    const updatedAt = Timestamp.fromDate(new Date());

    const customerId = '';

    const customer = {
      name,
      telephone: orderData.telephone
        ? orderData.telephone.replace(/[^A-Z0-9]/gi, '')
        : '',
      address: orderData.address,
      area: orderData.area,
      city: '', // Removido do form, enviando vazio
      state: 'Rio de Janeiro',
      customerId,
    };

    if (orderType === 'Orçamento') {
      try {
        await createEstimate({
          cutlist,
          name,
          customerId,
          telephone: orderData.telephone
            ? orderData.telephone.replace(/[^A-Z0-9]/gi, '')
            : '',
          createdAt,
          updatedAt,
        });
        localStorage.removeItem('app@jrmcompensados:cutlist');
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
        amountDue: orderData.amountDue || 'Total', // Se vazio, assume Total
        isUrgent: orderData.isUrgent, // Novo
        seller,
        ps: orderData.ps,
        deliveryDate: Timestamp.fromDate(orderData.deliveryDate),
        createdAt,
        updatedAt,
      });

      localStorage.removeItem('app@jrmcompensados:cutlist');

      if (estimateId) {
        const estimateToDeleteRef = doc(db, 'estimates', estimateId);
        await deleteDoc(estimateToDeleteRef);
      }

      router.push('/cortes/listadecortes');
    } catch {}
  };

  return (
    <Stack
      gap={6}
      mt={8}
      as="form"
      onSubmit={createOrderHandleSubmit(handleSubmitOrder)}
    >
      <HStack gap={4} mb={2}>
        <Heading color="gray.600" size="lg" whiteSpace="nowrap">
          Dados do {orderType}
        </Heading>
        <Box borderTop="2px" borderColor="gray.200" w="100%" />
      </HStack>

      {/* CARD 1: DADOS DO CLIENTE */}
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        shadow="sm"
        borderWidth="1px"
        borderColor="gray.100"
      >
        <Heading size="md" mb={4} color="gray.700">
          1. Informações do Cliente
        </Heading>
        <SimpleGrid columns={[1, 1, 2]} spacing={4}>
          <FormInput
            {...createOrderRegister('firstName')}
            name="firstName"
            label="Nome"
            error={createOrderErrors.firstName}
            size="md"
          />
          <FormInput
            {...createOrderRegister('lastName')}
            name="lastName"
            label="Sobrenome"
            error={createOrderErrors.lastName}
            size="md"
          />
          <FormInput
            {...createOrderRegister('telephone')}
            error={createOrderErrors.telephone}
            name="telephone"
            label="Telefone"
            value={tel}
            onChange={e => setTel(normalizeTelephoneInput(e.target.value, tel))}
            size="md"
          />
        </SimpleGrid>

        {orderType === 'Serviço' && (
          <SimpleGrid columns={[1, 1, 2]} spacing={4} mt={4}>
            <FormInput
              {...createOrderRegister('address')}
              error={createOrderErrors.address}
              name="address"
              label="Endereço"
              size="md"
            />
            <FormSelect
              options={areas.map(area => ({ value: area, label: area }))}
              name="area"
              control={createOrderControl}
              label="Bairro"
              placeholder="Selecione o bairro..."
              isClearable
            />
          </SimpleGrid>
        )}
      </Box>

      {/* CARD 2: DETALHES DA ENTREGA E LOJA (Apenas Serviço) */}
      {orderType === 'Serviço' && (
        <Box
          bg={isUrgent ? 'red.50' : 'white'}
          p={6}
          borderRadius="lg"
          shadow="sm"
          borderWidth={isUrgent ? '2px' : '1px'}
          borderColor={isUrgent ? 'red.200' : 'gray.100'}
          transition="all 0.3s"
        >
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md" color="gray.700">
              2. Entrega e Prazos
            </Heading>
            {isUrgent && (
              <Badge colorScheme="red" fontSize="0.9em">
                URGENTE
              </Badge>
            )}
          </Flex>

          <SimpleGrid columns={[1, 1, 2]} spacing={8}>
            <Stack gap={4}>
              <FormRadio
                options={['Japuíba', 'Frade']}
                label="Loja do Pedido:"
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
            </Stack>

            <Stack gap={4}>
              {/* DATA DE ENTREGA + URGENTE */}
              <Box>
                <Flex align="flex-end" gap={4}>
                  <Box flex="1">
                    <FormDatePicker
                      name="deliveryDate"
                      control={createOrderControl}
                    />
                  </Box>
                  <Box pb={2}>
                    <Controller
                      control={createOrderControl}
                      name="isUrgent"
                      render={({ field: { onChange, value } }) => (
                        <Flex align="center" gap={2}>
                          <Switch.Root
                            colorScheme="red"
                            checked={value}
                            onCheckedChange={e => onChange(e.checked)}
                            size="lg"
                          >
                            <Switch.HiddenInput />
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                            <Switch.Label fontWeight="bold" color="red.500">
                              Urgente?
                            </Switch.Label>
                          </Switch.Root>
                        </Flex>
                      )}
                    />
                  </Box>
                </Flex>
              </Box>

              <Flex direction="column">
                <Text mb="8px" color="gray.700" fontWeight="bold">
                  Observações:
                </Text>
                <Textarea
                  {...createOrderRegister('ps')}
                  size="sm"
                  resize="vertical"
                  placeholder="Instruções especiais..."
                  bg="white"
                />
              </Flex>
            </Stack>
          </SimpleGrid>
        </Box>
      )}

      {/* CARD 3: PAGAMENTO E VENDEDOR (Apenas Serviço, exceto Senha) */}
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        shadow="sm"
        borderWidth="1px"
        borderColor="gray.100"
      >
        <Heading size="md" mb={4} color="gray.700">
          {orderType === 'Serviço'
            ? '3. Pagamento e Finalização'
            : '2. Finalização'}
        </Heading>

        <SimpleGrid columns={[1, 1, 2]} spacing={8} alignItems="flex-start">
          {orderType === 'Serviço' && (
            <Stack gap={4}>
              <FormRadio
                // Opções atualizadas conforme pedido
                options={['Pago', 'Receber na Entrega']}
                label="Situação do Pagamento:"
                name="paymentType"
                control={createOrderControl}
                isHorizontal
              />

              {/* CAMPO NOVO: VALOR A RECEBER */}
              <Box>
                <FormInput
                  {...createOrderRegister('amountDue')}
                  name="amountDue"
                  label="Valor a Receber (R$)"
                  placeholder="Vazio = Receber Total | Ex: 500,00"
                  size="md"
                  helperText="Deixe em branco se for receber o valor total."
                />
              </Box>
            </Stack>
          )}

          <Box>
            <FormInput
              {...createOrderRegister('sellerPassword')}
              error={createOrderErrors.sellerPassword}
              name="sellerPassword"
              label="Senha do Vendedor:"
              type="password"
              placeholder="Digite sua senha..."
              size="md"
            />

            <Button
              colorScheme="orange"
              size="lg"
              width="100%"
              mt={6}
              type="submit"
              disabled={cutlist.length < 1}
              boxShadow="md"
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
            >
              {orderType === 'Orçamento'
                ? 'Salvar Orçamento'
                : 'Confirmar Pedido'}
            </Button>
          </Box>
        </SimpleGrid>
      </Box>
    </Stack>
  );
};
