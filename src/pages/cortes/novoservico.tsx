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
  Image,
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
import React, { useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { useForm } from 'react-hook-form';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useQuery } from 'react-query';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { RadioButton } from '../../components/Form/RadioButton';
import { FormSelect } from '../../components/Form/Select';
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
  material: CutlistMaterial;
  amount: number;
  sideA: number;
  sideB: number;
  borderA: number;
  borderB: number;
  price: number;
}

interface AvatarProps {
  height: number;
  src: string;
  width: number;
}

interface CutlistTable {
  gside: number;
  pside: number;
  material: string;
  price: number;
}
interface CreateCutlistProps {
  materialId: string;
  amount: number;
  sideA: number;
  sideB: number;
  borderA: number;
  borderB: number;
}

const NovoServiço = () => {
  const [orderType, setOrderType] = useState('Serviço');

  // * Cutlist Data
  const { getAllMaterials, materialOptions } = useMaterial();
  const {
    register: createCutlistRegister,
    handleSubmit: createCutlistHandleSubmit,
    control: createCutlistControl,
    reset: createCutlistReset,
    formState: { errors: createCutlistErrors },
  } = useForm<CreateCutlistProps>({
    resolver: yupResolver(createCutlistSchema),
  });

  const { data: materialData } = useQuery('materials', () => getAllMaterials());

  const [cutlist, setCutlist] = useState<Cutlist[]>([]);
  const [pricePercent, setPricePercent] = useState<number>(75);

  const borderOptions = [
    {
      value: 0,
      label: '0',
    },
    {
      value: 1,
      label: '1',
    },
    {
      value: 2,
      label: '2',
    },
  ];

  const updatePricePercent = (percentValue: string) => {
    // TODO: Make all prices from cutlist change when pricePercent is changed
    setPricePercent(Number(percentValue));
  };

  const handleCreateCutlist = (cutlistFormData: CreateCutlistProps) => {
    createCutlistReset();

    const materialUsed = materialData?.find(
      material => material.id === cutlistFormData.materialId,
    );

    if (!materialUsed) {
      throw new Error();
    }

    const price = calculateCutlistPrice(
      {
        width: materialUsed.width,
        height: materialUsed.height,
        price: materialUsed.price,
      },
      cutlistFormData,
    );

    setCutlist(prevValue => [
      ...prevValue,
      {
        material: {
          materialId: cutlistFormData.materialId,
          height: materialUsed.height,
          width: materialUsed.width,
          name: materialUsed.name,
          price: materialUsed.price,
        },
        amount: cutlistFormData.amount,
        borderA: cutlistFormData.borderA,
        borderB: cutlistFormData.borderB,
        sideA: cutlistFormData.sideA,
        sideB: cutlistFormData.sideB,
        price,
      },
    ]);
  };

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
        <Flex as="article" direction="column" mb={4}>
          <HStack spacing={4} mt={8}>
            <Heading color="gray.600" size="lg" whiteSpace="nowrap">
              Plano de Corte
            </Heading>
            <Divider />
          </HStack>
          <Flex align="center" justify="space-between">
            <FormControl mt={4} mb={8}>
              <FormLabel mb={0}>Base de cálculo</FormLabel>
              <RadioGroup
                colorScheme="orange"
                value={pricePercent}
                onChange={percentValue => updatePricePercent(percentValue)}
              >
                <HStack spacing={4}>
                  <Radio value={75} isChecked>
                    Balcão
                  </Radio>
                  <Radio value={50}>Marceneiro</Radio>
                  <Radio value={0}>Sem Acréscimo</Radio>
                </HStack>
              </RadioGroup>
            </FormControl>
            <Text whiteSpace="nowrap" fontSize="2xl" color="green.500">
              R$ 00,00
            </Text>
          </Flex>

          <HStack
            as="form"
            align="center"
            noValidate
            onSubmit={createCutlistHandleSubmit(handleCreateCutlist)}
          >
            <Box minW="33%">
              <FormSelect
                name="materialId"
                control={createCutlistControl}
                isClearable
                placeholder="Material"
                options={materialOptions}
              />
            </Box>
            <FormInput
              {...createCutlistRegister('amount')}
              name="amount"
              placeholder="Quantidade"
              error={createCutlistErrors.amount}
            />
            <FormInput
              {...createCutlistRegister('sideA')}
              name="sideA"
              placeholder="Medida A"
              error={createCutlistErrors.sideA}
            />
            <FormSelect
              control={createCutlistControl}
              name="borderA"
              options={borderOptions}
              placeholder="Fita A"
              defaultValue={0}
            />
            <FormInput
              {...createCutlistRegister('sideB')}
              name="sideB"
              placeholder="Medida B"
              error={createCutlistErrors.sideB}
            />
            <FormSelect
              name="borderB"
              control={createCutlistControl}
              options={borderOptions}
              placeholder="Fita B"
              defaultValue={0}
            />
            <Button colorScheme="orange" size="md" w="100%" type="submit">
              Adicionar
            </Button>
          </HStack>
          <Table colorScheme="orange" my={4}>
            <TableCaption>Lista de peças</TableCaption>
            <Thead>
              <Tr>
                <Th>Fita de Borda</Th>
                <Th>Material</Th>
                <Th isNumeric>Qtd</Th>
                <Th isNumeric>Lado A</Th>
                <Th isNumeric>Lado B</Th>
                <Th isNumeric>Preço</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {cutlist.map(cutlistMapped => {
                const { avatar, gside, pside } = sortCutlistData({
                  sideA: cutlistMapped.sideA,
                  sideB: cutlistMapped.sideB,
                  borderA: cutlistMapped.borderA,
                  borderB: cutlistMapped.borderB,
                });

                return (
                  <Tr>
                    <Td>
                      <img
                        src={avatar.src}
                        alt="Etiqueta"
                        width="45px"
                        height="45px"
                      />
                    </Td>
                    <Td>{cutlistMapped.material.name}</Td>
                    <Td isNumeric>{cutlistMapped.amount}</Td>
                    <Td isNumeric>{gside}</Td>
                    <Td isNumeric>{pside}</Td>
                    <Td isNumeric>{cutlistMapped.price}</Td>
                    <Td>
                      <HStack spacing={4}>
                        {/* Update Price button */}
                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Editar"
                          icon={<FaEdit />}
                        />
                        {/* Remove Material Button */}
                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Remover"
                          icon={<FaTrash />}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Flex>

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
