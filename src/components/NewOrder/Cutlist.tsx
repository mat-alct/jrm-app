'use client';

// --- Bloco de Importações de Bibliotecas Externas ---
import 'react-datepicker/dist/react-datepicker.css';
import {
  Box,
  Button,
  Field,
  Fieldset,
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
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { v4 } from 'uuid';

// --- Bloco de Importações Internas do Projeto ---
import { useMaterial } from '../../hooks/material';
import { calculateCutlistPrice } from '../../utils/cutlist/calculatePrice';
import { sortCutlistData } from '../../utils/cutlist/sortAndReturnTag';
import { createCutlistSchema } from '../../utils/yup/novoservicoValidations';
import { FormInput } from '../Form/Input';
import { FormSelect } from '../Form/Select';

// --- Definição de Tipos e Interfaces ---
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
}

interface CutlistPageProps {
  cutlist: Cutlist[];
  updateCutlist: (cutlistData: Cutlist[], maintainOldValues?: boolean) => void;
}

// --- Componente Principal: Cutlist ---
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
    resolver: yupResolver(createCutlistSchema),
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

  const handleCreateCutlist = (cutlistFormData: CreateCutlistProps) => {
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

    // CORREÇÃO DE LÓGICA: Salva os dados REAIS do material (height, width, price)
    // ao invés de salvar 0. Isso previne o erro de NaN ao recalcular o preço.
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
      // Como agora temos os dados reais do material salvos em 'cut.material',
      // o recálculo funcionará perfeitamente.
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
    <Flex as="article" direction="column" mb={4}>
      <HStack gap={4}>
        <Heading color="gray.600" size="lg" whiteSpace="nowrap">
          Plano de Corte
        </Heading>
        <Box borderTop="2px" borderColor="gray.300" w="100%" />
      </HStack>
      <Flex
        align="center"
        justify={['center', 'space-between']}
        direction={['column', 'row']}
      >
        <Fieldset.Root mt={4} mb={8}>
          <Fieldset.Legend mb={0}>Base de cálculo</Fieldset.Legend>
          <RadioGroup.Root
            colorScheme="orange"
            value={String(pricePercent)}
            onValueChange={e => {
              if (e.value) {
                updatePricePercent(e.value);
              }
            }}
            // @ts-ignore
            size={radioSize}
          >
            <HStack gap={[2, 2, 4]}>
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
        </Fieldset.Root>
        <Text
          whiteSpace="nowrap"
          fontSize={['md', 'md', 'xl', '2xl', '3xl']}
          color="green.500"
          mb={[8, 0]}
        >
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(cutlist.reduce((prev, curr) => prev + curr.price, 0))}
        </Text>
      </Flex>

      {/* --- FORMULÁRIO DE ADIÇÃO DE PEÇAS --- */}
      <Stack
        as="form"
        // CORREÇÃO VISUAL: No mobile ('stretch') os campos ocupam 100% da largura.
        // No desktop ('flex-end') eles alinham na base, ao lado do botão.
        alignItems={['stretch', 'stretch', 'stretch', 'stretch', 'flex-end']}
        gap={4}
        onSubmit={createCutlistHandleSubmit(handleCreateCutlist)}
        direction={['column', 'column', 'column', 'column', 'row']}
      >
        <Box minW="33%" w={['100%', '100%', '100%', '100%', '33%']}>
          <FormSelect
            name="materialId"
            control={createCutlistControl}
            isClearable
            placeholder="Material"
            // CORREÇÃO: Mapeia os dados do material para o formato correto do select
            options={
              materialData?.map(material => ({
                label: material.name,
                value: material.id || '',
              })) || []
            }
          />
        </Box>

        <Box w={['100%', '100%', '100%', '100%', '80px']}>
          <FormInput
            {...createCutlistRegister('amount')}
            name="amount"
            placeholder="Qtd"
            error={createCutlistErrors.amount}
            size="md"
          />
        </Box>

        {/* LADO A */}
        <Field.Root w="100%">
          {/* CORREÇÃO VISUAL: Flex garante que Input e Select fiquem lado a lado */}
          <Flex width="100%">
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
          </Flex>
        </Field.Root>

        {/* LADO B */}
        <Field.Root w="100%">
          {/* CORREÇÃO VISUAL: Flex garante que Input e Select fiquem lado a lado */}
          <Flex width="100%">
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
                control={createCutlistControl}
                name="borderB"
                options={borderOptions}
                defaultValue={0}
              />
            </Box>
          </Flex>
        </Field.Root>

        <Button
          colorScheme="orange"
          size="md"
          w={['100%', 'auto']}
          px={8}
          type="submit"
        >
          Adicionar
        </Button>
      </Stack>

      <Box overflowX="auto">
        {cutlist.length > 0 && (
          <Table.Root
            colorScheme="orange"
            mt={8}
            // @ts-ignore
            size={tableSize}
            whiteSpace="nowrap"
          >
            <TableCaption>Lista de peças</TableCaption>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Fita de Borda</Table.ColumnHeader>
                <Table.ColumnHeader>Material</Table.ColumnHeader>
                <Table.ColumnHeader>Qtd</Table.ColumnHeader>
                <Table.ColumnHeader>Lado A</Table.ColumnHeader>
                <Table.ColumnHeader>Lado B</Table.ColumnHeader>
                <Table.ColumnHeader>Preço</Table.ColumnHeader>
                <Table.ColumnHeader />
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
                        width="45px"
                        height="45px"
                      />
                    </Table.Cell>
                    <Table.Cell whiteSpace="nowrap">
                      {cutlistMapped.material.name}
                    </Table.Cell>
                    <Table.Cell>{cutlistMapped.amount}</Table.Cell>
                    <Table.Cell>{gside}</Table.Cell>
                    <Table.Cell>{pside}</Table.Cell>
                    <Table.Cell>{cutlistMapped.price}</Table.Cell>
                    <Table.Cell>
                      <HStack gap={4}>
                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Editar"
                          onClick={() => updateCut(cutlistMapped.id)}
                        >
                          <FaEdit />
                        </IconButton>
                        <IconButton
                          colorScheme="orange"
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
        )}
      </Box>
    </Flex>
  );
};
