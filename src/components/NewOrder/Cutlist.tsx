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
  useDisclosure,
  Badge,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaCog,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowsAltH,
  FaArrowsAltV,
} from 'react-icons/fa';
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
  hasHingeHoles?: boolean;
  hingeHolesSide?: 'Maior' | 'Menor';
  hingeHolesQuantity?: number;
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

  const {
    open: isOptionsOpen,
    onToggle: onToggleOptions,
    onClose: onCloseOptions,
  } = useDisclosure();

  const [hasHinge, setHasHinge] = useState(false);
  const [hingeSide, setHingeSide] = useState<'Maior' | 'Menor'>('Maior');
  const [pricePercent, setPricePercent] = useState<number>(75);

  const { data: materialData, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const data = await getAllMaterials();
      return data || [];
    },
  });

  const materialOptions = React.useMemo(() => {
    if (!materialData) return [];
    return materialData.map(m => ({
      label: m.name,
      value: m.id || '',
    }));
  }, [materialData]);

  // Função para calcular furos automaticamente com a nova regra
  const calculateHoles = (
    sideA: number,
    sideB: number,
    sideSelected: 'Maior' | 'Menor',
  ): number => {
    const length =
      sideSelected === 'Maior'
        ? Math.max(sideA, sideB)
        : Math.min(sideA, sideB);

    // Se a peça for menor que 80cm, garante o mínimo de 2 furos (nas pontas)
    if (length < 800) return 2;

    // Regra:
    // Posição 1: 100mm
    // Próximas: +600mm
    // Limite: Length - 100mm
    // Fórmula: 1 + floor((Length - 200) / 600)
    const count = 1 + Math.floor((length - 200) / 600);
    return Math.max(2, count);
  };

  const handleCreateCutlist: SubmitHandler<
    CreateCutlistProps
  > = cutlistFormData => {
    createCutlistReset({ sideA: 0, sideB: 0, amount: 0 });
    createCutlistSetValue('borderA', 0);
    createCutlistSetValue('borderB', 0);
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

    let calculatedQty = undefined;
    if (hasHinge) {
      calculatedQty = calculateHoles(
        cutlistFormData.sideA,
        cutlistFormData.sideB,
        hingeSide,
      );
    }

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
        hasHingeHoles: hasHinge,
        hingeHolesSide: hasHinge ? hingeSide : undefined,
        hingeHolesQuantity: calculatedQty,
      },
    ]);

    // RESET TOTAL
    setHasHinge(false);
    setHingeSide('Maior');
    onCloseOptions();
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

    if (cutToUpdate.hasHingeHoles) {
      setHasHinge(true);
      if (cutToUpdate.hingeHolesSide) setHingeSide(cutToUpdate.hingeHolesSide);
      if (!isOptionsOpen) onToggleOptions();
    } else {
      setHasHinge(false);
      onCloseOptions();
    }

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
        borderRadius="xl"
        shadow="md"
        borderWidth="1px"
        borderColor="gray.200"
        overflow="hidden"
      >
        <Box
          p={6}
          bgGradient="to-r"
          gradientFrom="gray.50"
          gradientTo="white"
          borderBottomWidth="1px"
          borderColor="gray.200"
        >
          <Flex
            align="center"
            justify={['center', 'space-between']}
            direction={['column', 'row']}
            gap={4}
          >
            <Box>
              <Heading color="gray.800" size="lg" letterSpacing="tight">
                Plano de Corte
              </Heading>
              <Text color="gray.500" fontSize="sm">
                Adicione as peças para compor o pedido
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
                <HStack gap={2} bg="gray.100" p={1} borderRadius="lg">
                  {['75', '50', '1'].map(val => (
                    <RadioGroup.Item
                      key={val}
                      value={val}
                      p={2}
                      borderRadius="md"
                      _checked={{
                        bg: 'white',
                        shadow: 'sm',
                        color: 'orange.600',
                      }}
                    >
                      <RadioGroup.ItemHiddenInput />
                      <Text fontSize="xs" fontWeight="bold" px={2}>
                        {val === '75'
                          ? 'Balcão'
                          : val === '50'
                            ? 'Marceneiro'
                            : 'Custo'}
                      </Text>
                    </RadioGroup.Item>
                  ))}
                </HStack>
              </RadioGroup.Root>

              <Text
                fontSize={['2xl', '3xl']}
                fontWeight="800"
                color="orange.500"
                letterSpacing="tight"
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
          p={6}
          as="form"
          onSubmit={createCutlistHandleSubmit(handleCreateCutlist)}
        >
          <Grid
            templateColumns={['1fr', '1fr', '3fr 70px 1.6fr 1.6fr 160px']}
            gap={4}
            alignItems="flex-end"
          >
            <Box>
              <FormSelect
                name="materialId"
                control={createCutlistControl}
                isClearable
                placeholder={
                  isLoading ? 'Carregando...' : 'Selecione o Material'
                }
                options={materialOptions}
              />
            </Box>

            <Box>
              <FormInput
                {...createCutlistRegister('amount')}
                name="amount"
                label="Qtd"
                placeholder="0"
                error={createCutlistErrors.amount}
                size="md"
                type="number"
                textAlign="center"
              />
            </Box>

            <Box>
              <Text
                fontSize="xs"
                fontWeight="bold"
                mb={2}
                color="gray.500"
                textTransform="uppercase"
              >
                Lado A / Fita
              </Text>
              <Flex gap={2}>
                <Box flex="1">
                  <FormInput
                    {...createCutlistRegister('sideA')}
                    name="sideA"
                    placeholder="mm"
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
                    placeholder=""
                  />
                </Box>
              </Flex>
            </Box>

            <Box>
              <Text
                fontSize="xs"
                fontWeight="bold"
                mb={2}
                color="gray.500"
                textTransform="uppercase"
              >
                Lado B / Fita
              </Text>
              <Flex gap={2}>
                <Box flex="1">
                  <FormInput
                    {...createCutlistRegister('sideB')}
                    name="sideB"
                    placeholder="mm"
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
                    placeholder=""
                  />
                </Box>
              </Flex>
            </Box>

            <Box>
              <Flex gap={2} align="center" pb="2px">
                <IconButton
                  aria-label="Opções de Furação"
                  colorScheme={hasHinge ? 'green' : 'gray'}
                  variant={hasHinge ? 'solid' : 'outline'}
                  onClick={onToggleOptions}
                  size="md"
                >
                  <FaCog />
                </IconButton>

                <Button
                  colorScheme="orange"
                  size="md"
                  flex="1"
                  type="submit"
                  fontWeight="bold"
                >
                  <FaPlus style={{ marginRight: '8px' }} /> ADD
                </Button>
              </Flex>
            </Box>
          </Grid>

          {/* ÁREA DE FURAÇÃO */}
          {isOptionsOpen && (
            <Box
              mt={5}
              p={5}
              bg={hasHinge ? 'green.50' : 'gray.50'}
              borderRadius="lg"
              border="1px solid"
              borderColor={hasHinge ? 'green.200' : 'gray.200'}
              position="relative"
            >
              {hasHinge && (
                <Badge
                  position="absolute"
                  top="-10px"
                  left="20px"
                  colorScheme="green"
                  variant="solid"
                  px={2}
                >
                  FURAÇÃO ATIVADA
                </Badge>
              )}

              <Flex align="flex-end" gap={6} wrap="wrap">
                {/* Status */}
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    mb={2}
                    color="gray.500"
                    textTransform="uppercase"
                  >
                    Status
                  </Text>
                  <Button
                    onClick={() => setHasHinge(!hasHinge)}
                    colorScheme={hasHinge ? 'green' : 'gray'}
                    variant={hasHinge ? 'solid' : 'outline'}
                    size="sm"
                  >
                    {hasHinge ? (
                      <FaCheckCircle style={{ marginRight: 8 }} />
                    ) : (
                      <FaTimesCircle style={{ marginRight: 8 }} />
                    )}
                    {hasHinge ? 'Com Furação' : 'Sem Furação'}
                  </Button>
                </Box>

                {/* Seleção de Lado */}
                {hasHinge && (
                  <Box>
                    <Text
                      fontSize="xs"
                      fontWeight="bold"
                      mb={2}
                      color="gray.500"
                      textTransform="uppercase"
                    >
                      Posição dos Furos
                    </Text>
                    <HStack gap={2}>
                      <Button
                        size="sm"
                        colorScheme="green"
                        variant={hingeSide === 'Maior' ? 'solid' : 'outline'}
                        onClick={() => setHingeSide('Maior')}
                      >
                        <FaArrowsAltH style={{ marginRight: 6 }} /> Lado Maior
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="green"
                        variant={hingeSide === 'Menor' ? 'solid' : 'outline'}
                        onClick={() => setHingeSide('Menor')}
                      >
                        <FaArrowsAltV style={{ marginRight: 6 }} /> Lado Menor
                      </Button>
                    </HStack>
                    <Text
                      fontSize="xs"
                      color="green.600"
                      mt={2}
                      fontWeight="medium"
                    >
                      * Cálculo Automático: Margem 10cm + Passos de 60cm.
                    </Text>
                  </Box>
                )}
              </Flex>
            </Box>
          )}
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
            <TableCaption
              py={4}
              fontSize="sm"
              fontWeight="medium"
              color="gray.500"
            >
              {cutlist.length} peças adicionadas
            </TableCaption>
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader color="gray.600">
                  Esquema
                </Table.ColumnHeader>
                <Table.ColumnHeader color="gray.600">
                  Material
                </Table.ColumnHeader>
                <Table.ColumnHeader color="gray.600">Qtd</Table.ColumnHeader>
                <Table.ColumnHeader color="gray.600">
                  Dimensões / Furação
                </Table.ColumnHeader>
                <Table.ColumnHeader color="gray.600">
                  Fitas (A|B)
                </Table.ColumnHeader>
                <Table.ColumnHeader color="gray.600">Preço</Table.ColumnHeader>
                <Table.ColumnHeader width="1%"> </Table.ColumnHeader>
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
                  <Table.Row key={c.id} _hover={{ bg: 'orange.50' }}>
                    <Table.Cell>
                      <img
                        src={avatar.src}
                        alt="Tag"
                        width="35px"
                        height="35px"
                        style={{
                          borderRadius: '4px',
                          border: '1px solid #eee',
                        }}
                      />
                    </Table.Cell>
                    <Table.Cell fontWeight="medium" color="gray.700">
                      {c.material.name}
                    </Table.Cell>
                    <Table.Cell fontWeight="bold">{c.amount}</Table.Cell>
                    <Table.Cell>
                      <Flex direction="column" justify="center">
                        <Text fontWeight="bold">
                          {gside} x {pside}
                        </Text>
                        {c.hasHingeHoles && (
                          <Flex align="center" gap={1} mt={1}>
                            <Badge
                              colorScheme="green"
                              variant="subtle"
                              fontSize="0.6em"
                              borderRadius="full"
                              px={2}
                            >
                              {c.hingeHolesQuantity} Furos
                            </Badge>
                            <Text fontSize="xs" color="gray.500">
                              (Lado {c.hingeHolesSide === 'Maior' ? 'M' : 'm'})
                            </Text>
                          </Flex>
                        )}
                      </Flex>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="outline" colorScheme="gray">
                        {c.borderA}
                      </Badge>{' '}
                      |{' '}
                      <Badge variant="outline" colorScheme="gray">
                        {c.borderB}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell
                      fontWeight="bold"
                      color="green.600"
                    >{`R$ ${c.price},00`}</Table.Cell>
                    <Table.Cell>
                      <HStack gap={1}>
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
