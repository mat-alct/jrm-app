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
  Table,
  TableCaption,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
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
              <Radio value={1}>Sem Acréscimo</Radio>
            </HStack>
          </RadioGroup>
        </FormControl>
        <Text whiteSpace="nowrap" fontSize="2xl" color="green.500">
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

      <HStack
        as="form"
        align="flex"
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

      {/* Tabela de peças */}
      {cutlist.length > 0 && (
        <Table colorScheme="orange" mt={4}>
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
                  <Td>{cutlistMapped.material.name}</Td>
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
    </Flex>
  );
};
