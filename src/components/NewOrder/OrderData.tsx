'use client';

import {
  Box,
  Button,
  Flex,
  Heading,
  Stack,
  Text,
  Textarea,
  SimpleGrid,
  Grid,
  Switch,
  Icon,
} from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/router';
import React from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { FaExclamationTriangle, FaCheckCircle, FaLock } from 'react-icons/fa';

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
  deliveryType: string;
  paymentType: string;
  deliveryDate: Date;
  ps: string;
  sellerPassword: string;
  isUrgent: boolean;
  amountDue: string;
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
    watch,
    formState: { errors: createOrderErrors },
  } = useForm<CreateOrderProps>({
    resolver: yupResolver(validationSchema as any),
    defaultValues: { isUrgent: false },
  });

  const router = useRouter();
  const [tel, setTel] = React.useState('');
  const { createEstimate, createOrder } = useOrder();

  const isUrgent = watch('isUrgent');
  const paymentType = watch('paymentType');

  const handleSubmitOrder: SubmitHandler<
    CreateOrderProps
  > = async orderData => {
    // --- LÓGICA DE SENHA ---
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
    const seller = querySnapshot.docs[0].data().name as string | undefined;
    if (!seller) {
      createOrderSetError('sellerPassword', {
        type: 'value',
        message: 'Vendedor sem nome cadastrado. Avise o administrador.',
      });
      return;
    }

    if (orderType === 'Serviço' && orderData.deliveryType === 'Entrega') {
      if (!orderData.telephone)
        return createOrderSetError('telephone', {
          type: 'required',
          message: 'Telefone obrigatório.',
        });
      if (!orderData.address)
        return createOrderSetError('address', {
          type: 'required',
          message: 'Endereço obrigatório.',
        });
      if (!orderData.area)
        return createOrderSetError('area', {
          type: 'required',
          message: 'Bairro obrigatório.',
        });
    }

    const name = `${capitalizeAndStrip(orderData.firstName)} ${capitalizeAndStrip(orderData.lastName)}`;
    const now = Timestamp.fromDate(new Date());

    const customer = {
      name,
      telephone: orderData.telephone
        ? orderData.telephone.replace(/[^A-Z0-9]/gi, '')
        : '',
      address: orderData.address,
      area: orderData.area,
      city: '',
      state: 'Rio de Janeiro',
      customerId: '',
    };

    if (orderType === 'Orçamento') {
      try {
        await createEstimate({
          cutlist,
          name,
          customerId: '',
          telephone: customer.telephone,
          createdAt: now,
          updatedAt: now,
        });
        localStorage.removeItem('app@jrmcompensados:cutlist');
        router.push('/cortes/listadecortes');
      } catch (err) {
        console.error('Erro ao criar orçamento:', err);
        toaster.create({
          type: 'error',
          description: 'Não foi possível criar o orçamento.',
        });
      }
      return;
    }

    try {
      await createOrder({
        cutlist,
        customer,
        orderStatus: 'Em Produção',
        paymentType: orderData.paymentType,
        deliveryType: orderData.deliveryType,
        amountDue: orderData.amountDue || 'Total',
        isUrgent: orderData.isUrgent,
        seller,
        ps: orderData.ps,
        deliveryDate: Timestamp.fromDate(orderData.deliveryDate),
        createdAt: now,
        updatedAt: now,
      });
      localStorage.removeItem('app@jrmcompensados:cutlist');
      if (estimateId) await deleteDoc(doc(db, 'estimates', estimateId));
      router.push('/cortes/listadecortes');
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
      toaster.create({
        type: 'error',
        description: 'Não foi possível criar o pedido.',
      });
    }
  };

  return (
    <Stack
      gap={6}
      mt={8}
      as="form"
      onSubmit={createOrderHandleSubmit(handleSubmitOrder)}
    >
      {/* 1. DADOS DO CLIENTE */}
      <Box
        bg="white"
        borderRadius="xl"
        shadow="sm"
        borderWidth="1px"
        borderColor="gray.200"
        overflow="hidden"
      >
        {/* HEADER PADRONIZADO */}
        <Box p={6} bg="gray.50" borderBottomWidth="1px" borderColor="gray.200">
          <Heading size="md" color="gray.700">
            1. Dados do Cliente
          </Heading>
        </Box>
        {/* BODY */}
        <Box p={6}>
          <SimpleGrid columns={[1, 1, 3]} gap={4}>
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
              onChange={e =>
                setTel(normalizeTelephoneInput(e.target.value, tel))
              }
              size="md"
            />
          </SimpleGrid>
        </Box>
      </Box>

      {/* 2. DADOS DO SERVIÇO */}
      {orderType === 'Serviço' && (
        <Box
          bg="white"
          borderRadius="xl"
          shadow="sm"
          borderWidth={isUrgent ? '2px' : '1px'}
          borderColor={isUrgent ? 'red.500' : 'gray.200'}
          overflow="hidden"
          transition="all 0.3s"
        >
          {/* HEADER PADRONIZADO COM DESTAQUE DE URGÊNCIA */}
          <Box
            p={6}
            bg={isUrgent ? 'red.500' : 'gray.50'}
            borderBottomWidth="1px"
            borderColor={isUrgent ? 'red.600' : 'gray.200'}
            color={isUrgent ? 'white' : 'inherit'}
          >
            <Flex justify="space-between" align="center">
              <Heading
                size="md"
                color={isUrgent ? 'white' : 'gray.700'}
                display="flex"
                alignItems="center"
                gap={2}
              >
                2. Detalhes do Serviço
                {isUrgent && <Icon as={FaExclamationTriangle} color="white" />}
              </Heading>

              <Controller
                control={createOrderControl}
                name="isUrgent"
                render={({ field: { onChange, value } }) => (
                  <Box
                    as="label"
                    cursor="pointer"
                    bg={value ? 'white' : 'gray.200'}
                    px={4}
                    py={1}
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    gap={3}
                  >
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
                    </Switch.Root>
                    <Text
                      fontWeight="bold"
                      color={value ? 'red.600' : 'gray.500'}
                      fontSize="sm"
                    >
                      {value ? 'URGENTE' : 'Normal'}
                    </Text>
                  </Box>
                )}
              />
            </Flex>
          </Box>

          {/* BODY */}
          <Box p={6}>
            <Stack gap={6}>
              {/* Grid 2/3 e 1/3 */}
              <Grid templateColumns={['1fr', '1fr', '2fr 1fr']} gap={4}>
                <FormInput
                  {...createOrderRegister('address')}
                  error={createOrderErrors.address}
                  name="address"
                  label="Endereço de Entrega"
                  size="md"
                />
                <FormSelect
                  options={areas.map(area => ({ value: area, label: area }))}
                  name="area"
                  control={createOrderControl}
                  label="Bairro"
                  placeholder="Selecione..."
                  isClearable
                />
              </Grid>

              <Box borderTopWidth="1px" borderColor="gray.100" my={2} />

              {/* Grid 2 colunas — Logística+Data | Pagamento+Valor */}
              <SimpleGrid columns={[1, 1, 2]} gap={6}>
                {/* Coluna 1: Logística + Previsão */}
                <Stack
                  gap={4}
                  bg="gray.50"
                  p={4}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="gray.200"
                >
                  <Box>
                    <FormRadio
                      options={['Retirar na Loja', 'Entrega']}
                      label="Logística"
                      name="deliveryType"
                      control={createOrderControl}
                    />
                    {createOrderErrors.deliveryType && (
                      <Text fontSize="xs" color="red.500" mt={1}>
                        {createOrderErrors.deliveryType.message as string}
                      </Text>
                    )}
                  </Box>
                  <Box>
                    <Text
                      mb={2}
                      fontWeight="medium"
                      color="gray.700"
                      fontSize="sm"
                    >
                      Prazo do pedido
                    </Text>
                    <FormDatePicker
                      name="deliveryDate"
                      control={createOrderControl}
                    />
                  </Box>
                </Stack>

                {/* Coluna 2: Pagamento + Valor a Receber */}
                <Stack
                  gap={4}
                  bg="gray.50"
                  p={4}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="gray.200"
                >
                  <Box>
                    <FormRadio
                      options={['Pago', 'Receber na Entrega']}
                      label="Status Pagamento"
                      name="paymentType"
                      control={createOrderControl}
                    />
                    {createOrderErrors.paymentType && (
                      <Text fontSize="xs" color="red.500" mt={1}>
                        {createOrderErrors.paymentType.message as string}
                      </Text>
                    )}
                  </Box>
                  {paymentType === 'Receber na Entrega' ? (
                    <Box
                      bg="orange.50"
                      p={3}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="orange.200"
                    >
                      <FormInput
                        {...createOrderRegister('amountDue')}
                        name="amountDue"
                        label="Valor a Receber (R$)"
                        placeholder="Ex: 500,00"
                        size="md"
                        bg="white"
                      />
                      <Text fontSize="xs" color="orange.700" mt={1}>
                        * Se vazio, cobraremos o total.
                      </Text>
                    </Box>
                  ) : (
                    <Box
                      bg="white"
                      p={3}
                      borderRadius="md"
                      borderWidth="1px"
                      borderStyle="dashed"
                      borderColor="gray.300"
                    >
                      <Text fontSize="xs" color="gray.500">
                        Selecione &ldquo;Receber na Entrega&rdquo; para informar
                        o valor a cobrar.
                      </Text>
                    </Box>
                  )}
                </Stack>
              </SimpleGrid>

              <Box>
                <Text mb="2px" color="gray.700" fontWeight="medium">
                  Observações
                </Text>
                <Textarea
                  {...createOrderRegister('ps')}
                  rows={4}
                  placeholder="Instruções..."
                />
              </Box>
            </Stack>
          </Box>
        </Box>
      )}

      {/* 3. BARRA DE FINALIZAÇÃO */}
      <Box
        bg="white"
        p={6}
        borderRadius="xl"
        shadow="sm"
        borderWidth="1px"
        borderColor="gray.200"
        mt={4}
      >
        <Flex
          direction={['column', 'column', 'row']}
          align="center"
          justify="space-between"
          gap={6}
        >
          {/* Lado Esquerdo: Senha (Limitado a 300px) */}
          <Box w="100%" maxW="300px">
            <Text mb={2} fontWeight="bold" color="gray.700">
              Senha do Vendedor
            </Text>
            <Flex align="center" gap={3}>
              <Icon as={FaLock} color="orange.500" boxSize={5} />
              <FormInput
                {...createOrderRegister('sellerPassword')}
                error={createOrderErrors.sellerPassword}
                name="sellerPassword"
                type="password"
                size="lg"
                bg="gray.50"
                borderWidth="1px"
                borderColor="gray.300"
                color="gray.800"
              />
            </Flex>
          </Box>

          {/* Lado Direito: Botão (Expande com flex=1) */}
          <Box flex="1" w="100%">
            <Button
              colorScheme="orange"
              size="xl"
              height="60px"
              fontSize="xl"
              width="100%"
              type="submit"
              disabled={cutlist.length < 1}
              display="flex"
              gap={3}
              _hover={{ bg: 'orange.400', transform: 'scale(1.02)' }}
              transition="all 0.2s"
              mt={[4, 4, 8]}
            >
              {orderType === 'Orçamento'
                ? 'SALVAR ORÇAMENTO'
                : 'CONFIRMAR PEDIDO'}
              <Icon as={FaCheckCircle} />
            </Button>
          </Box>
        </Flex>
      </Box>
    </Stack>
  );
};
