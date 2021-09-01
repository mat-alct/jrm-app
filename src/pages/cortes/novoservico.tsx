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
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { RadioButton } from '../../components/Form/RadioButton';
import { FormSelect } from '../../components/Form/Select';
import { areas } from '../../utils/listOfAreas';

interface CreateOrderProps {
  name: string;
}

const NovoServiço = () => {
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [isEstimate, setIsEstimate] = useState(0);

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
        <Header pageTitle="Novo Serviço" isLoading={createOrderIsSubmitting}>
          <RadioGroup value={isEstimate} colorScheme="orange" mb={4} size="lg">
            <HStack spacing={8}>
              <Radio value={1} isChecked id="isOrder" name="isOrder">
                Pedido
              </Radio>
              <Radio value={0} id="isEstimate" name="isEstimate">
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
          <FormControl mt={4} mb={8}>
            <FormLabel mb={0}>Base de cálculo</FormLabel>
            <RadioGroup value={isEstimate} colorScheme="orange">
              <HStack spacing={4}>
                <Radio value={0} isChecked id="isOrder" name="isOrder">
                  Balcão
                </Radio>
                <Radio value={1} id="isEstimate" name="isEstimate">
                  Marceneiro
                </Radio>
                <Radio value={1} id="isEstimate" name="isEstimate">
                  Sem Acréscimo
                </Radio>
              </HStack>
            </RadioGroup>
          </FormControl>

          <HStack align="center">
            <FormSelect
              name="material"
              control={createOrderControl}
              isClearable
              placeholder="Material"
              options={[
                {
                  value: 'ok',
                  label: 'MDF BRANCO TX 2 FACES COMUM 15MM',
                },
                {
                  value: 'ok2',
                  label: 'MDF BRANCO TX 2 FACES ULTRA 18MM',
                },
              ]}
            />
            <FormInput size="md" name="amount" placeholder="Quantidade" />
            <FormInput size="md" name="sideA" placeholder="Medida A" />
            <FormSelect
              control={createOrderControl}
              name="borderA"
              options={[
                {
                  value: 'ok',
                  label: '1',
                },
                {
                  value: 'ok2',
                  label: '2',
                },
              ]}
            />
            <FormInput size="md" name="sideB" placeholder="Medida B" />
            <FormSelect
              name="borderB"
              control={createOrderControl}
              options={[
                {
                  value: 'ok',
                  label: '1',
                },
                {
                  value: 'ok2',
                  label: '2',
                },
              ]}
            />
            <Button colorScheme="orange" size="md" w="100%">
              Adicionar
            </Button>
          </HStack>
          <Table colorScheme="orange" my={8}>
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
              <Tr>
                <Td>
                  <Image
                    src="/images/tags/G0P0.svg"
                    alt="Etiqueta"
                    boxSize="50px"
                  />
                </Td>
                <Td>MDF BRANCO TX 2 FACES COMUM 15MM</Td>
                <Td isNumeric>1</Td>
                <Td isNumeric>2750</Td>
                <Td isNumeric>1850</Td>
                <Td isNumeric>R$ 400,00</Td>
                <Td>
                  <HStack spacing={4}>
                    <IconButton
                      colorScheme="orange"
                      size="sm"
                      aria-label="Editar"
                      icon={<FaEdit />}
                    />
                    <IconButton
                      colorScheme="orange"
                      size="sm"
                      aria-label="Remover"
                      icon={<FaTrash />}
                    />
                  </HStack>
                </Td>
              </Tr>
              <Tr>
                <Td>
                  <Image
                    src="/images/tags/G0P0.svg"
                    alt="Etiqueta"
                    boxSize="50px"
                  />
                </Td>
                <Td>MDF BRANCO TX 2 FACES COMUM 15MM</Td>
                <Td isNumeric>1</Td>
                <Td isNumeric>2750</Td>
                <Td isNumeric>1850</Td>
                <Td isNumeric>R$ 400,00</Td>
                <Td>
                  <HStack spacing={4}>
                    <IconButton
                      colorScheme="orange"
                      size="sm"
                      aria-label="Editar"
                      icon={<FaEdit />}
                    />
                    <IconButton
                      colorScheme="orange"
                      size="sm"
                      aria-label="Remover"
                      icon={<FaTrash />}
                    />
                  </HStack>
                </Td>
              </Tr>
              <Tr>
                <Td>
                  <Image
                    src="/images/tags/G0P0.svg"
                    alt="Etiqueta"
                    boxSize="50px"
                  />
                </Td>
                <Td>MDF BRANCO TX 2 FACES COMUM 15MM</Td>
                <Td isNumeric>1</Td>
                <Td isNumeric>2750</Td>
                <Td isNumeric>1850</Td>
                <Td isNumeric>R$ 400,00</Td>
                <Td>
                  <HStack spacing={4}>
                    <IconButton
                      colorScheme="orange"
                      size="sm"
                      aria-label="Editar"
                      icon={<FaEdit />}
                    />
                    <IconButton
                      colorScheme="orange"
                      size="sm"
                      aria-label="Remover"
                      icon={<FaTrash />}
                    />
                  </HStack>
                </Td>
              </Tr>
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
