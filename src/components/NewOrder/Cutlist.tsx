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
  Grid,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
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
    resolver: yupResolver(createCutlistSchema as any),
    reValidateMode: 'onSubmit',
  });

  const radioSize = useBreakpointValue(['sm', 'sm', 'md'], { fallback: 'sm' });
  const tableSize = useBreakpointValue(['sm', 'sm', 'md'], { fallback: 'sm' });

  const { getAllMaterials } = useMaterial();

  // Busca de materiais
  const { data: materialData, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const data = await getAllMaterials();
      return data || [];
    },
  });

  // Prepara as opções para o Select
  const materialOptions = React.useMemo(() => {
    if (!materialData) return [];
    return materialData.map(m => ({
      label: m.name,
      value: m.id || '',
    }));
  }, [materialData]);

  const [pricePercent, setPricePercent] = useState<number>(75);

  const handleCreateCutlist: SubmitHandler<
    CreateCutlistProps
  > = cutlistFormData => {
    createCutlistReset({ sideA: 0, sideB: 0, amount: 0 });
    createCutlistSetValue('borderA', 0);
    createCutlistSetValue('borderB', 0);
    // Mantém o material selecionado para facilitar adição em série
    createCutlistSetValue('materialId', cutlistFormData.materialId);

    const materialUsed = materialData?.find(
      m => m.id === cutlistFormData.materialId,
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
    updateCutlist([...cutlist.filter(cut => cut.id !== cutId)], false);
  };

  const updateCut = (cutId: string) => {
    const cutToUpdate = cutlist.find(cut => cut.id === cutId);
    if (!cutToUpdate) return;
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
      {/* CARD UNIFICADO */}
      {/* CORREÇÃO: Removido overflow="hidden" para permitir que o Select ultrapasse os limites */}
      <Box
        bg="white"
        borderRadius="xl"
        shadow="sm"
        borderWidth="1px"
        borderColor="gray.200"
      >
        {/* TOPO: Estilo Padronizado */}
        {/* CORREÇÃO: Border Radius aplicado aqui manualmente para compensar a remoção do overflow hidden */}
        <Box
          p={6}
          bg="gray.50"
          borderBottomWidth="1px"
          borderColor="gray.200"
          borderTopRadius="xl"
        >
          <Flex
            align="center"
            justify={['center', 'space-between']}
            direction={['column', 'row']}
            gap={4}
          >
            <Box>
              <Heading color="gray.700" size="lg">
                Plano de Corte
              </Heading>
              <Text color="gray.500" fontSize="sm">
                Adicione peças para calcular o valor
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
                <HStack
                  gap={6}
                  px={4}
                  py={2}
                  bg="white"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="gray.200"
                >
                  <RadioGroup.Item value="75">
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemIndicator />
                    <RadioGroup.ItemText fontWeight="medium">
                      Balcão
                    </RadioGroup.ItemText>
                  </RadioGroup.Item>
                  <RadioGroup.Item value="50">
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemIndicator />
                    <RadioGroup.ItemText fontWeight="medium">
                      Marceneiro
                    </RadioGroup.ItemText>
                  </RadioGroup.Item>
                  <RadioGroup.Item value="1">
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemIndicator />
                    <RadioGroup.ItemText fontWeight="medium">
                      S/ Acréscimo
                    </RadioGroup.ItemText>
                  </RadioGroup.Item>
                </HStack>
              </RadioGroup.Root>

              <Text
                fontSize={['2xl', '3xl']}
                fontWeight="800"
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

        {/* FORMULÁRIO */}
        <Box
          p={6}
          as="form"
          onSubmit={createCutlistHandleSubmit(handleCreateCutlist)}
        >
          {/* CORREÇÃO: Grid ajustado com largura fixa para Qtd e mais espaço para Lados */}
          <Grid
            templateColumns={['1fr', '1fr', '3fr 70px 1.6fr 1.6fr 140px']}
            gap={4}
            alignItems="flex-end"
          >
            {/* 1. Material (3fr) */}
            <Box>
              <FormSelect
                name="materialId"
                control={createCutlistControl}
                isClearable
                placeholder={
                  isLoading ? 'Carregando...' : 'Selecione o Material'
                }
                options={materialOptions}
                // Adicionando menuPortalTarget se necessário, mas remover overflow hidden resolve a maioria dos casos
              />
            </Box>

            {/* 2. Qtd (Fixo 80px - reduzido) */}
            <Box>
              <FormInput
                {...createCutlistRegister('amount')}
                name="amount"
                label="Qtd"
                placeholder="00"
                error={createCutlistErrors.amount}
                size="md"
                type="number"
              />
            </Box>

            {/* 3. Lado A (Aumentado - 1.4fr) */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                Lado A / Fita
              </Text>
              <Flex gap={2}>
                <Box flex="1">
                  <FormInput
                    {...createCutlistRegister('sideA')}
                    name="sideA"
                    placeholder="0000"
                    error={createCutlistErrors.sideA}
                    size="md"
                  />
                </Box>
                {/* Select de Fita Aumentado para 90px */}
                <Box w="70px">
                  <FormSelect
                    control={createCutlistControl}
                    name="borderA"
                    options={borderOptions}
                    defaultValue={0}
                    placeholder=""
                  />
                </Box>
              </Flex>
            </Box>

            {/* 4. Lado B (Aumentado - 1.4fr) */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                Lado B / Fita
              </Text>
              <Flex gap={2}>
                <Box flex="1">
                  <FormInput
                    {...createCutlistRegister('sideB')}
                    name="sideB"
                    placeholder="0000"
                    error={createCutlistErrors.sideB}
                    size="md"
                  />
                </Box>
                {/* Select de Fita Aumentado para 90px */}
                <Box w="70px">
                  <FormSelect
                    control={createCutlistControl}
                    name="borderB"
                    options={borderOptions}
                    defaultValue={0}
                    placeholder=""
                  />
                </Box>
              </Flex>
            </Box>

            {/* 5. Botão (Fixo 140px) */}
            <Box>
              <Button
                colorScheme="orange"
                size="md"
                w="100%"
                type="submit"
                mb="2px"
              >
                <FaPlus style={{ marginRight: '8px' }} /> Adicionar
              </Button>
            </Box>
          </Grid>
        </Box>
      </Box>

      {/* TABELA DE PEÇAS */}
      {cutlist.length > 0 && (
        <Box
          overflowX="auto"
          bg="white"
          borderRadius="xl"
          shadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
        >
          <Table.Root
            variant="line"
            colorScheme="orange"
            // @ts-ignore
            size={tableSize}
            whiteSpace="nowrap"
          >
            {/* CORREÇÃO: Título da tabela preto e normal */}
            <TableCaption
              py={4}
              fontSize="md"
              fontWeight="normal"
              color="gray.800"
            >
              Peças adicionadas ao pedido
            </TableCaption>
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader>Tag</Table.ColumnHeader>
                <Table.ColumnHeader>Material</Table.ColumnHeader>
                <Table.ColumnHeader>Qtd</Table.ColumnHeader>
                <Table.ColumnHeader>Dimensões</Table.ColumnHeader>
                <Table.ColumnHeader>Fitas</Table.ColumnHeader>
                <Table.ColumnHeader>Preço</Table.ColumnHeader>
                <Table.ColumnHeader width="1%">Ações</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {cutlist.map(c => {
                const { avatar, gside, pside } = sortCutlistData({
                  sideA: c.sideA,
                  sideB: c.sideB,
                  borderA: c.borderA,
                  borderB: c.borderB,
                });
                return (
                  <Table.Row key={c.id}>
                    <Table.Cell>
                      <img
                        src={avatar.src}
                        alt="Tag"
                        width="35px"
                        height="35px"
                      />
                    </Table.Cell>
                    <Table.Cell fontWeight="medium">
                      {c.material.name}
                    </Table.Cell>
                    <Table.Cell>{c.amount}</Table.Cell>
                    <Table.Cell>
                      {gside} x {pside}
                    </Table.Cell>
                    <Table.Cell>
                      {c.borderA} | {c.borderB}
                    </Table.Cell>
                    <Table.Cell fontWeight="bold">{`R$ ${c.price},00`}</Table.Cell>
                    <Table.Cell>
                      <HStack gap={2}>
                        <IconButton
                          variant="ghost"
                          colorScheme="blue"
                          size="sm"
                          aria-label="Editar"
                          onClick={() => updateCut(c.id)}
                        >
                          <FaEdit />
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          colorScheme="red"
                          size="sm"
                          aria-label="Remover"
                          onClick={() => removeCut(c.id)}
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
