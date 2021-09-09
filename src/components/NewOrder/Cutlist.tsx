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
  InputGroup,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableCaption,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useBreakpointValue,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useQuery } from 'react-query';
import { v4 } from 'uuid';

import { useMaterial } from '../../hooks/material';
import { calculateCutlistPrice } from '../../utils/cutlist/calculatePrice';
import { sortCutlistData } from '../../utils/cutlist/sortAndReturnTag';
import { createCutlistSchema } from '../../utils/yup/novoservicoValidations';
import { FormInput } from '../Form/Input';
import { FormSelect } from '../Form/Select';

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
  amount: number | string;
  sideA: number | string;
  sideB: number | string;
  borderA: number;
  borderB: number;
}

interface CutlistPageProps {
  cutlist: Cutlist[];
  updateCutlist: (cutlistData: Cutlist[], maintainOldValues?: boolean) => void;
}

export const Cutlist: React.FC<CutlistPageProps> = ({
  cutlist,
  updateCutlist,
}) => {
  const {
    register: createCutlistRegister,
    handleSubmit: createCutlistHandleSubmit,
    control: createCutlistControl,
    reset: createCutlistReset,
    setValue: createCutlistSetValue,
    setFocus: createCutlistSetFocus,
    formState: { errors: createCutlistErrors },
  } = useForm<CreateCutlistProps>({
    resolver: yupResolver(createCutlistSchema),
    reValidateMode: 'onSubmit',
  });

  const radioSize = useBreakpointValue(['sm', 'sm', 'md', 'md', 'lg', 'lg']);
  const tableSize = useBreakpointValue(['sm', 'sm', 'md', 'md', 'lg', 'lg']);

  const { getAllMaterials, materialOptions } = useMaterial();

  const { data: materialData } = useQuery('materials', () => getAllMaterials());

  const [pricePercent, setPricePercent] = useState<number>(75);

  const handleCreateCutlist = (cutlistFormData: CreateCutlistProps) => {
    // Reset Form
    createCutlistReset({ sideA: '', sideB: '', amount: '' });
    createCutlistSetValue('borderA', 0);
    createCutlistSetValue('borderB', 0);
    createCutlistSetValue('materialId', cutlistFormData.materialId);

    const materialUsed = materialData?.find(
      material => material.id === cutlistFormData.materialId,
    );

    if (!materialUsed) {
      throw new Error();
    }

    // Make a copy of cutlistFormData and transform string values in
    const cutlistFormDataTransformed = {
      ...cutlistFormData,
      amount: Number(cutlistFormData.amount),
      sideA: Number(cutlistFormData.sideA),
      sideB: Number(cutlistFormData.sideB),
    };

    const price = calculateCutlistPrice(
      {
        width: materialUsed.width,
        height: materialUsed.height,
        price: materialUsed.price,
      },
      cutlistFormDataTransformed,
      pricePercent,
    );

    updateCutlist([
      {
        id: v4(),
        material: {
          materialId: cutlistFormDataTransformed.materialId,
          height: materialUsed.height,
          width: materialUsed.width,
          name: materialUsed.name,
          price: materialUsed.price,
        },
        amount: cutlistFormDataTransformed.amount,
        borderA: cutlistFormDataTransformed.borderA,
        borderB: cutlistFormDataTransformed.borderB,
        sideA: cutlistFormDataTransformed.sideA,
        sideB: cutlistFormDataTransformed.sideB,
        price,
      },
    ]);

    createCutlistSetFocus('amount');
  };

  const updatePricePercent = (percentValue: string) => {
    setPricePercent(Number(percentValue));

    const cutlistWithUpdatedPrice = cutlist.map(cut => {
      const { amount, borderB, borderA, sideB, sideA } = cut;

      const priceUpdated = calculateCutlistPrice(
        {
          width: cut.material.width,
          height: cut.material.height,
          price: cut.material.price,
        },
        {
          amount,
          borderA,
          borderB,
          sideA,
          sideB,
        },
        Number(percentValue),
      );

      return {
        ...cut,
        price: priceUpdated,
      };
    });

    updateCutlist([...cutlistWithUpdatedPrice], false);
  };

  const removeCut = (cutId: string) => {
    const cutlistFiltered = cutlist.filter(cut => cut.id !== cutId);

    updateCutlist([...cutlistFiltered], false);
  };

  const updateCut = (cutId: string) => {
    const cutToUpdate = cutlist.find(cut => cut.id === cutId);

    if (!cutToUpdate) {
      throw new Error();
    }

    const { amount, sideA, sideB, borderA, borderB, material } = cutToUpdate;

    // Set values to form
    createCutlistSetValue('amount', amount);
    createCutlistSetValue('sideA', sideA);
    createCutlistSetValue('sideB', sideB);
    createCutlistSetValue('borderA', borderA);
    createCutlistSetValue('borderB', borderB);
    createCutlistSetValue('materialId', material.materialId);

    // Remove from cutlist table
    removeCut(cutId);
  };

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

  return (
    <Flex as="article" direction="column" mb={4}>
      <HStack spacing={4}>
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
            size={radioSize}
          >
            <HStack spacing={[2, 2, 4]}>
              <Radio value={75} isChecked>
                Balcão
              </Radio>
              <Radio value={50}>Marceneiro</Radio>
              <Radio value={1}>Sem Acréscimo</Radio>
            </HStack>
          </RadioGroup>
        </FormControl>
        <Text
          whiteSpace="nowrap"
          fontSize={['sm', 'md', 'xl', '2xl', '3xl']}
          color="green.500"
        >
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(
            cutlist.reduce((prev, curr) => {
              return prev + curr.price;
            }, 0),
          )}
        </Text>
      </Flex>

      <Stack
        as="form"
        align="flex"
        onSubmit={createCutlistHandleSubmit(handleCreateCutlist)}
        direction={['column', 'column', 'column', 'row']}
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
        <Box w="100%" maxW={[null, null, null, '60px']}>
          <FormInput
            {...createCutlistRegister('amount')}
            name="amount"
            placeholder="Qtd"
            error={createCutlistErrors.amount}
            size="md"
          />
        </Box>

        <InputGroup w="100%">
          <Box mr={2} w="100%">
            <FormInput
              {...createCutlistRegister('sideA')}
              name="sideA"
              placeholder="Lado A"
              error={createCutlistErrors.sideA}
              size="md"
            />
          </Box>
          <Box w="100%" maxW="90px">
            <FormSelect
              control={createCutlistControl}
              name="borderA"
              options={borderOptions}
              defaultValue={0}
            />
          </Box>
        </InputGroup>
        <InputGroup w="100%">
          <Box w="100%" mr={2}>
            <FormInput
              {...createCutlistRegister('sideB')}
              name="sideB"
              placeholder="Lado B"
              error={createCutlistErrors.sideB}
              size="md"
            />
          </Box>
          <Box w="100%" maxW="90px">
            <FormSelect
              name="borderB"
              control={createCutlistControl}
              options={borderOptions}
              defaultValue={0}
            />
          </Box>
        </InputGroup>

        <Button colorScheme="orange" size="md" w="100%" type="submit">
          Adicionar
        </Button>
      </Stack>

      {/* Tabela de peças */}
      <Box overflowX="auto">
        {cutlist.length > 0 && (
          <Table
            colorScheme="orange"
            mt={8}
            size={tableSize}
            whiteSpace="nowrap"
          >
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
                  <Tr key={cutlistMapped.id}>
                    <Td>
                      <img
                        src={avatar.src}
                        alt="Etiqueta"
                        width="45px"
                        height="45px"
                      />
                    </Td>
                    <Td whiteSpace="nowrap">{cutlistMapped.material.name}</Td>
                    <Td isNumeric>{cutlistMapped.amount}</Td>
                    <Td isNumeric>{gside}</Td>
                    <Td isNumeric>{pside}</Td>
                    <Td isNumeric>{cutlistMapped.price}</Td>
                    <Td>
                      <HStack spacing={4}>
                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Editar"
                          icon={<FaEdit />}
                          onClick={() => updateCut(cutlistMapped.id)}
                        />
                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Remover"
                          icon={<FaTrash />}
                          onClick={() => removeCut(cutlistMapped.id)}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Box>
    </Flex>
  );
};
