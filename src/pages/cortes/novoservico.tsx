/* eslint-disable no-console */
import 'react-datepicker/dist/react-datepicker.css';

import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Table,
  TableCaption,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { getDay } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Head from 'next/head';
import React, { useCallback, useRef, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { useForm } from 'react-hook-form';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useQuery } from 'react-query';
import { v4 } from 'uuid';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { RadioButton } from '../../components/Form/RadioButton';
import { FormSelect } from '../../components/Form/Select';
import { Cutlist } from '../../components/NewOrder/Cutlist';
import { useMaterial } from '../../hooks/material';
import { calculateCutlistPrice } from '../../utils/cutlist/calculatePrice';
import { sortCutlistData } from '../../utils/cutlist/sortAndReturnTag';
import { areas } from '../../utils/listOfAreas';
import { createCutlistSchema } from '../../utils/yup/novoservicoValidations';

interface CreateOrderProps {
  name: string;
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

interface CreateCutlistProps {
  materialId: string;
  // some values need to be string to reset form
  amount: number | string;
  sideA: number | string;
  sideB: number | string;
  borderA: number;
  borderB: number;
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

  const [startDate, setStartDate] = useState<Date | null>(new Date());

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

  const isWeekday = (date: Date) => {
    const day = getDay(date);
    return day !== 0 && day !== 6;
  };

  registerLocale('ptBR', ptBR);

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
        <HStack spacing={4}>
          <Heading color="gray.600" size="lg" whiteSpace="nowrap">
            Cliente
          </Heading>
          <Divider />
        </HStack>

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

        <HStack spacing={4} mt={16}>
          <Heading color="gray.600" size="lg" whiteSpace="nowrap">
            Pedido
          </Heading>
          <Divider />
        </HStack>

        <Flex as="article" direction="column" maxW="700px">
          <VStack align="left" mt={8} spacing={8}>
            <RadioButton
              name="orderType"
              options={['Produção', 'Orçamento']}
              label="Tipo do pedido:"
              control={createOrderControl}
            />
            <RadioButton
              name="orderStore"
              options={['Japuíba', 'Frade']}
              label="Loja do pedido:"
              control={createOrderControl}
            />
            <RadioButton
              name="deliveryType"
              options={['Retirar na Loja', 'Entrega']}
              label="Tipo de Entrega:"
              control={createOrderControl}
            />
            <RadioButton
              name="paymentStatus"
              options={['Receber na Entrega', 'Pago']}
              label="Pagamento:"
              control={createOrderControl}
            />

            <FormControl display="flex" flexDirection="row">
              <FormLabel color="gray.700" mb={0} minW="150px">
                Data de Entrega:
              </FormLabel>
              <Box border="2px solid gray.500" bg="gray.200" p="1px">
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date) => setStartDate(date)}
                  locale="ptBR"
                  dateFormat="P"
                  filterDate={isWeekday}
                />
              </Box>
            </FormControl>

            <HStack whiteSpace="nowrap" spacing={4}>
              <RadioButton
                name="discount"
                options={['Balcão', 'Marceneiro', 'Sem acréscimo']}
                label="Desconto:"
                defaultValue="Balcão"
                control={createOrderControl}
              />
              <Text w="100%" color="green.500" fontWeight="700" fontSize="lg">
                R$ 20,00
              </Text>
            </HStack>

            <Flex direction="column">
              <Text mb="8px" color="gray.700" fontWeight="bold" mt={4}>
                Observações:
              </Text>
              <Textarea size="sm" />
            </Flex>
          </VStack>
        </Flex>

        <Button colorScheme="orange" isFullWidth mb={16}>
          Confirmar
        </Button>
      </Dashboard>
    </>
  );
};

export default NovoServiço;
