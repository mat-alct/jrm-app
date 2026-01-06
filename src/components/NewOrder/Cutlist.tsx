'use client';

import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  RadioGroup,
  Stack,
  Table,
  TableCaption,
  Text,
  useBreakpointValue,
  SimpleGrid,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form'; // Importei SubmitHandler
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
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
  amount: number;
  sideA: number;
  sideB: number;
  borderA: number;
  borderB: number;
  price: number;
}

interface CutlistPageProps {
  cutlist: Cutlist[];
  updateCutlist: (cutlistData: Cutlist[], maintainOldValues?: boolean) => void;
}

export const Cutlist = ({ cutlist, updateCutlist }: CutlistPageProps) => {
  const {
    register: createCutlistRegister,
    handleSubmit: createCutlistHandleSubmit,
    control: createCutlistControl,
    reset: createCutlistReset,
    setValue: createCutlistSetValue,
    setFocus: createCutlistSetFocus,
    formState: { errors: createCutlistErrors },
  } = useForm<CreateCutlistProps>({
    // CORREÇÃO: 'as any' resolve o conflito de tipagem estrita
    resolver: yupResolver(createCutlistSchema as any),
    reValidateMode: 'onSubmit',
  });

  const radioSize = useBreakpointValue(['sm', 'sm', 'md'], { fallback: 'sm' });
  const tableSize = useBreakpointValue(['sm', 'sm', 'md'], { fallback: 'sm' });

  const { getAllMaterials } = useMaterial();

  const { data: materialData } = useQuery({
    queryKey: ['materials'],
    queryFn: getAllMaterials,
  });

  const [pricePercent, setPricePercent] = useState<number>(75);

  // CORREÇÃO: Tipagem explícita do handler
  const handleCreateCutlist: SubmitHandler<
    CreateCutlistProps
  > = cutlistFormData => {
    createCutlistReset({ sideA: 0, sideB: 0, amount: 0 });
    createCutlistSetValue('borderA', 0);
    createCutlistSetValue('borderB', 0);
    createCutlistSetValue('materialId', cutlistFormData.materialId);

    const materialUsed = materialData?.find(
      material => material.id === cutlistFormData.materialId,
    );
    if (!materialUsed) throw new Error('Material não encontrado');

    const price = calculateCutlistPrice(
      {
        width: materialUsed.width,
        height: materialUsed.height,
        price: materialUsed.price,
      },
      cutlistFormData,
      pricePercent,
    );

    updateCutlist([
      {
        id: v4(),
        material: {
          materialId: cutlistFormData.materialId,
          height: materialUsed.height,
          width: materialUsed.width,
          name: materialUsed.name,
          price: materialUsed.price,
        },
        ...cutlistFormData,
        price,
      },
    ]);
    createCutlistSetFocus('amount');
  };

  const updatePricePercent = (percentValue: string) => {
    const newPercent = Number(percentValue);
    setPricePercent(newPercent);
    const cutlistWithUpdatedPrice = cutlist.map(cut => {
      const priceUpdated = calculateCutlistPrice(cut.material, cut, newPercent);
      return { ...cut, price: priceUpdated };
    });
    updateCutlist([...cutlistWithUpdatedPrice], false);
  };

  const removeCut = (cutId: string) => {
    const cutlistFiltered = cutlist.filter(cut => cut.id !== cutId);
    updateCutlist([...cutlistFiltered], false);
  };

  const updateCut = (cutId: string) => {
    const cutToUpdate = cutlist.find(cut => cut.id === cutId);
    if (!cutToUpdate) throw new Error('Corte não encontrado para atualizar');
    const { amount, sideA, sideB, borderA, borderB, material } = cutToUpdate;
    createCutlistSetValue('amount', amount);
    createCutlistSetValue('sideA', sideA);
    createCutlistSetValue('sideB', sideB);
    createCutlistSetValue('borderA', borderA);
    createCutlistSetValue('borderB', borderB);
    createCutlistSetValue('materialId', material.materialId);
    removeCut(cutId);
  };

  const borderOptions = [
    { value: 0, label: '0' },
    { value: 1, label: '1' },
    { value: 2, label: '2' },
  ];

  return (
    <Stack gap={6} mb={8}>
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        shadow="sm"
        borderWidth="1px"
        borderColor="gray.100"
      >
        <Flex
          align="center"
          justify={['center', 'space-between']}
          direction={['column', 'row']}
          gap={4}
        >
          <Box>
            <Heading color="gray.700" size="lg" mb={1}>
              Plano de Corte
            </Heading>
            <Text color="gray.500" fontSize="sm">
              Adicione as peças e defina o preço
            </Text>
          </Box>

          <Flex direction="column" align={['center', 'flex-end']} gap={2}>
            <RadioGroup.Root
              colorScheme="orange"
              value={String(pricePercent)}
              onValueChange={e => {
                if (e.value) updatePricePercent(e.value);
              }}
              // @ts-ignore
              size={radioSize}
            >
              <HStack gap={[2, 4]} p={2} bg="gray.50" borderRadius="md">
                <RadioGroup.Item value="75">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>Balcão</RadioGroup.ItemText>
                </RadioGroup.Item>
                <RadioGroup.Item value="50">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>Marceneiro</RadioGroup.ItemText>
                </RadioGroup.Item>
                <RadioGroup.Item value="1">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>Sem Acréscimo</RadioGroup.ItemText>
                </RadioGroup.Item>
              </HStack>
            </RadioGroup.Root>

            <Text
              whiteSpace="nowrap"
              fontSize={['2xl', '3xl']}
              fontWeight="bold"
              color="green.600"
            >
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(cutlist.reduce((prev, curr) => prev + curr.price, 0))}
            </Text>
          </Flex>
        </Flex>
      </Box>

      <Box
        as="form"
        onSubmit={createCutlistHandleSubmit(handleCreateCutlist)}
        bg="white"
        p={6}
        borderRadius="lg"
        shadow="sm"
        borderWidth="1px"
        borderColor="gray.100"
      >
        {/* CORREÇÃO: 'spacing' alterado para 'gap' */}
        <SimpleGrid columns={[1, 1, 2, 6]} gap={4} alignItems="flex-end">
          <Box gridColumn={['span 1', 'span 1', 'span 2']}>
            <FormSelect
              name="materialId"
              control={createCutlistControl}
              isClearable
              placeholder="Selecione o Material"
              options={
                materialData?.map(material => ({
                  label: material.name,
                  value: material.id || '',
                })) || []
              }
            />
          </Box>

          <Box>
            <FormInput
              {...createCutlistRegister('amount')}
              name="amount"
              placeholder="Qtd"
              error={createCutlistErrors.amount}
              size="md"
              type="number"
            />
          </Box>

          <Box gridColumn={['span 1', 'span 1', 'span 1', 'span 1.5']}>
            <Flex gap={2}>
              <Box w="100%">
                <FormInput
                  {...createCutlistRegister('sideA')}
                  name="sideA"
                  placeholder="Lado A (mm)"
                  error={createCutlistErrors.sideA}
                  size="md"
                />
              </Box>
              <Box w="70px">
                <FormSelect
                  control={createCutlistControl}
                  name="borderA"
                  options={borderOptions}
                  defaultValue={0}
                />
              </Box>
            </Flex>
          </Box>

          <Box gridColumn={['span 1', 'span 1', 'span 1', 'span 1.5']}>
            <Flex gap={2}>
              <Box w="100%">
                <FormInput
                  {...createCutlistRegister('sideB')}
                  name="sideB"
                  placeholder="Lado B (mm)"
                  error={createCutlistErrors.sideB}
                  size="md"
                />
              </Box>
              <Box w="70px">
                <FormSelect
                  control={createCutlistControl}
                  name="borderB"
                  options={borderOptions}
                  defaultValue={0}
                />
              </Box>
            </Flex>
          </Box>

          <Button colorScheme="orange" size="md" w="100%" type="submit">
            Adicionar
          </Button>
        </SimpleGrid>
      </Box>

      {cutlist.length > 0 && (
        <Box
          overflowX="auto"
          bg="white"
          borderRadius="lg"
          shadow="sm"
          borderWidth="1px"
          borderColor="gray.100"
        >
          <Table.Root
            variant="line"
            colorScheme="orange"
            // @ts-ignore
            size={tableSize}
            whiteSpace="nowrap"
          >
            <TableCaption>Peças adicionadas</TableCaption>
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader>Tag</Table.ColumnHeader>
                <Table.ColumnHeader>Material</Table.ColumnHeader>
                <Table.ColumnHeader>Qtd</Table.ColumnHeader>
                <Table.ColumnHeader>Dimensões (A x B)</Table.ColumnHeader>
                <Table.ColumnHeader>Fitas (A | B)</Table.ColumnHeader>
                <Table.ColumnHeader>Preço</Table.ColumnHeader>
                <Table.ColumnHeader width="1%">Ações</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {cutlist.map(cutlistMapped => {
                const { avatar, gside, pside } = sortCutlistData({
                  sideA: cutlistMapped.sideA,
                  sideB: cutlistMapped.sideB,
                  borderA: cutlistMapped.borderA,
                  borderB: cutlistMapped.borderB,
                });
                return (
                  <Table.Row key={cutlistMapped.id}>
                    <Table.Cell>
                      <img
                        src={avatar.src}
                        alt="Etiqueta"
                        width="35px"
                        height="35px"
                      />
                    </Table.Cell>
                    <Table.Cell fontWeight="medium">
                      {cutlistMapped.material.name}
                    </Table.Cell>
                    <Table.Cell>{cutlistMapped.amount}</Table.Cell>
                    <Table.Cell>
                      {gside} x {pside}
                    </Table.Cell>
                    <Table.Cell>
                      {cutlistMapped.borderA} | {cutlistMapped.borderB}
                    </Table.Cell>
                    <Table.Cell fontWeight="bold">{`R$ ${cutlistMapped.price},00`}</Table.Cell>
                    <Table.Cell>
                      <HStack gap={2}>
                        <IconButton
                          variant="ghost"
                          colorScheme="blue"
                          size="sm"
                          aria-label="Editar"
                          onClick={() => updateCut(cutlistMapped.id)}
                        >
                          <FaEdit />
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          colorScheme="red"
                          size="sm"
                          aria-label="Remover"
                          onClick={() => removeCut(cutlistMapped.id)}
                        >
                          <FaTrash />
                        </IconButton>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Stack>
  );
};
