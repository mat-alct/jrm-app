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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowsAltH,
  FaArrowsAltV,
  FaChevronDown,
} from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { v4 } from 'uuid';

import { useMaterial } from '../../hooks/material';
import { findAreaFreight, useAreas } from '../../hooks/useAreas';
import { RoundedCorners } from '../../types';
import { calculateCutlistPrice } from '../../utils/cutlist/calculatePrice';
import { sortCutlistData } from '../../utils/cutlist/sortAndReturnTag';
import { createCutlistSchema } from '../../utils/yup/novoservicoValidations';
import { FormInput } from '../Form/Input';
import { FormSelect } from '../Form/Select';
import {
  TagSchemaSvg,
  countCorners,
  emptyCorners,
} from './TagSchemaSvg';

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
  hasDrawerSlot?: boolean;
  drawerSlotSide?: 'Maior' | 'Menor';
  hasRoundedCorners?: boolean;
  roundedCorners?: RoundedCorners;
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
  selectedArea?: string;
  deliveryType?: string;
}

type CutlistRowProps = {
  cut: Cutlist;
  onEdit: (cutId: string) => void;
  onRemove: (cutId: string) => void;
};

const CutlistRow = React.memo<CutlistRowProps>(({ cut, onEdit, onRemove }) => {
  const { avatar, gside, pside } = sortCutlistData({
    sideA: cut.sideA,
    sideB: cut.sideB,
    borderA: cut.borderA,
    borderB: cut.borderB,
  });

  const gborder = cut.sideA >= cut.sideB ? cut.borderA : cut.borderB;
  const pborder = cut.sideA >= cut.sideB ? cut.borderB : cut.borderA;

  return (
    <Table.Row _hover={{ bg: 'orange.50' }}>
      <Table.Cell>
        {cut.hasRoundedCorners ? (
          <Box
            width="35px"
            height="35px"
            borderRadius="4px"
            border="1px solid #eee"
            overflow="hidden"
          >
            <TagSchemaSvg
              gborder={gborder}
              pborder={pborder}
              corners={cut.roundedCorners}
              size={35}
            />
          </Box>
        ) : (
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
        )}
      </Table.Cell>
      <Table.Cell fontWeight="medium" color="gray.700">
        {cut.material.name}
      </Table.Cell>
      <Table.Cell fontWeight="bold">{cut.amount}</Table.Cell>
      <Table.Cell>
        <Flex direction="column" justify="center">
          <Text fontWeight="bold">
            {gside} x {pside}
          </Text>
          {cut.hasHingeHoles && (
            <Flex align="center" gap={1} mt={1}>
              <Badge
                colorScheme="green"
                variant="subtle"
                fontSize="0.6em"
                borderRadius="full"
                px={2}
              >
                {cut.hingeHolesQuantity} Furos
              </Badge>
              <Text fontSize="xs" color="gray.500">
                (Lado {cut.hingeHolesSide === 'Maior' ? 'maior' : 'menor'})
              </Text>
            </Flex>
          )}
          {cut.hasDrawerSlot && (
            <Flex align="center" gap={1} mt={1}>
              <Badge
                colorScheme="orange"
                variant="subtle"
                fontSize="0.6em"
                borderRadius="full"
                px={2}
              >
                Rasgo
              </Badge>
              <Text fontSize="xs" color="gray.500">
                (Lado {cut.drawerSlotSide === 'Maior' ? 'maior' : 'menor'})
              </Text>
            </Flex>
          )}
          {cut.hasRoundedCorners && (
            <Flex align="center" gap={1} mt={1}>
              <Badge
                colorScheme="purple"
                variant="subtle"
                fontSize="0.6em"
                borderRadius="full"
                px={2}
              >
                Boleado x{countCorners(cut.roundedCorners)}
              </Badge>
            </Flex>
          )}
        </Flex>
      </Table.Cell>
      <Table.Cell>
        <Badge variant="outline" colorScheme="gray">
          {cut.borderA}
        </Badge>{' '}
        |{' '}
        <Badge variant="outline" colorScheme="gray">
          {cut.borderB}
        </Badge>
      </Table.Cell>
      <Table.Cell
        fontWeight="bold"
        color="green.600"
      >{`R$ ${cut.price},00`}</Table.Cell>
      <Table.Cell>
        <HStack gap={1}>
          <IconButton
            variant="ghost"
            colorScheme="blue"
            size="sm"
            aria-label="Editar"
            onClick={() => onEdit(cut.id)}
          >
            <FaEdit />
          </IconButton>
          <IconButton
            variant="ghost"
            colorScheme="red"
            size="sm"
            aria-label="Remover"
            onClick={() => onRemove(cut.id)}
          >
            <FaTrash />
          </IconButton>
        </HStack>
      </Table.Cell>
    </Table.Row>
  );
});
CutlistRow.displayName = 'CutlistRow';

export const Cutlist = ({
  cutlist,
  updateCutlist,
  selectedArea,
  deliveryType,
}: CutlistPageProps) => {
  const isStorePickup = deliveryType === 'Retirar na Loja';
  const showFreightValue = !isStorePickup && !!selectedArea;
  const {
    register: createCutlistRegister,
    handleSubmit: createCutlistHandleSubmit,
    control: createCutlistControl,
    reset: createCutlistReset,
    setValue: createCutlistSetValue,
    setError: createCutlistSetError,
    formState: { errors: createCutlistErrors },
  } = useForm<CreateCutlistProps>({
    resolver: yupResolver(createCutlistSchema as any),
    reValidateMode: 'onSubmit',
  });

  const radioSize = useBreakpointValue(['sm', 'sm', 'md'], { fallback: 'sm' });
  const tableSize = useBreakpointValue(['sm', 'sm', 'md'], { fallback: 'sm' });

  const { getAllMaterials } = useMaterial();
  const { data: areas } = useAreas();
  const freightFromArea = findAreaFreight(areas, selectedArea);
  const brl = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const {
    open: isOptionsOpen,
    onOpen: onOpenOptions,
    onToggle: onToggleOptions,
    onClose: onCloseOptions,
  } = useDisclosure();

  // Tipo de detalhe extra: nenhum, furação (dobradiça), rasgo (gaveta) ou
  // canto boleado. Mutuamente exclusivos — uma peça só pode ter um deles.
  const [extraType, setExtraType] = useState<
    'none' | 'hinge' | 'slot' | 'round'
  >('none');
  const [extraSide, setExtraSide] = useState<'Maior' | 'Menor'>('Maior');
  const [roundedCorners, setRoundedCorners] = useState<RoundedCorners>(
    emptyCorners(),
  );
  const [pricePercent, setPricePercent] = useState<number>(75);

  const toggleCorner = useCallback((corner: keyof RoundedCorners) => {
    setRoundedCorners(prev => ({ ...prev, [corner]: !prev[corner] }));
  }, []);

  // Peça boleada não pode ter fita: zera borderA/borderB sempre que entrar em 'round'.
  useEffect(() => {
    if (extraType === 'round') {
      createCutlistSetValue('borderA', 0);
      createCutlistSetValue('borderB', 0);
    }
  }, [extraType, createCutlistSetValue]);

  const { data: materialData, isLoading } = useQuery({
    queryKey: ['materials', 'all'],
    queryFn: async () => (await getAllMaterials()) || [],
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
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
    // Rasgo de gaveta exige quantidade par (R$5 por par).
    if (extraType === 'slot' && cutlistFormData.amount % 2 !== 0) {
      createCutlistSetError('amount', {
        type: 'value',
        message: 'Qtd deve ser par para rasgo',
      });
      return;
    }

    if (extraType === 'round' && countCorners(roundedCorners) === 0) {
      createCutlistSetError('amount', {
        type: 'value',
        message: 'Selecione ao menos um canto boleado',
      });
      return;
    }

    createCutlistReset({ sideA: undefined, sideB: undefined, amount: 0 } as any);
    createCutlistSetValue('borderA', 0);
    createCutlistSetValue('borderB', 0);
    createCutlistSetValue('materialId', cutlistFormData.materialId);

    const materialUsed = materialData?.find(
      m => m.id === cutlistFormData.materialId,
    );
    if (!materialUsed) throw new Error('Material não encontrado');

    const hasHinge = extraType === 'hinge';
    const hasSlot = extraType === 'slot';
    const hasRound = extraType === 'round';
    const cornerCount = hasRound ? countCorners(roundedCorners) : 0;

    let calculatedQty = 0;
    if (hasHinge) {
      calculatedQty = calculateHoles(
        cutlistFormData.sideA,
        cutlistFormData.sideB,
        extraSide,
      );
    }

    const price = calculateCutlistPrice(
      {
        width: materialUsed.width,
        height: materialUsed.height,
        price: materialUsed.price,
      },
      {
        ...cutlistFormData,
        hingeHolesQuantity: calculatedQty,
        hasDrawerSlot: hasSlot,
        roundedCornersCount: cornerCount,
      },
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
        hasHingeHoles: hasHinge,
        hingeHolesSide: hasHinge ? extraSide : undefined,
        hingeHolesQuantity: calculatedQty,
        hasDrawerSlot: hasSlot,
        drawerSlotSide: hasSlot ? extraSide : undefined,
        hasRoundedCorners: hasRound,
        roundedCorners: hasRound ? { ...roundedCorners } : undefined,
      },
    ]);

    // RESET TOTAL
    setExtraType('none');
    setExtraSide('Maior');
    setRoundedCorners(emptyCorners());
    onCloseOptions();
    // Volta foco ao primeiro campo (Material) para iniciar nova navegação por setas
    document.getElementById('materialId')?.focus();
  };

  const updatePricePercent = (percentValue: string) => {
    const newPercent = Number(percentValue);
    setPricePercent(newPercent);
    const cutlistWithUpdatedPrice = cutlist.map(cut => {
      const priceUpdated = calculateCutlistPrice(
        cut.material,
        {
          amount: cut.amount,
          sideA: cut.sideA,
          sideB: cut.sideB,
          borderA: cut.borderA,
          borderB: cut.borderB,
          hingeHolesQuantity: cut.hingeHolesQuantity,
          hasDrawerSlot: cut.hasDrawerSlot,
          roundedCornersCount: cut.hasRoundedCorners
            ? countCorners(cut.roundedCorners)
            : 0,
        },
        newPercent,
      );
      return { ...cut, price: priceUpdated };
    });
    updateCutlist([...cutlistWithUpdatedPrice], false);
  };

  // Mantém ref atualizada para a cutlist corrente, permitindo que removeCut/
  // updateCut sejam useCallback estáveis (sem cutlist nas deps), o que é
  // requisito para o React.memo dos CutlistRow funcionar.
  const cutlistRef = useRef(cutlist);
  useEffect(() => {
    cutlistRef.current = cutlist;
  }, [cutlist]);

  const removeCut = useCallback(
    (cutId: string) => {
      updateCutlist(
        cutlistRef.current.filter(cut => cut.id !== cutId),
        false,
      );
    },
    [updateCutlist],
  );

  const updateCut = useCallback(
    (cutId: string) => {
      const cutToUpdate = cutlistRef.current.find(cut => cut.id === cutId);
      if (!cutToUpdate) return;
      const { amount, sideA, sideB, borderA, borderB, material } = cutToUpdate;
      createCutlistSetValue('amount', amount);
      createCutlistSetValue('sideA', sideA);
      createCutlistSetValue('sideB', sideB);
      createCutlistSetValue('borderA', borderA);
      createCutlistSetValue('borderB', borderB);
      createCutlistSetValue('materialId', material.materialId);

      if (cutToUpdate.hasHingeHoles) {
        setExtraType('hinge');
        if (cutToUpdate.hingeHolesSide) setExtraSide(cutToUpdate.hingeHolesSide);
        setRoundedCorners(emptyCorners());
        onOpenOptions();
      } else if (cutToUpdate.hasDrawerSlot) {
        setExtraType('slot');
        if (cutToUpdate.drawerSlotSide)
          setExtraSide(cutToUpdate.drawerSlotSide);
        setRoundedCorners(emptyCorners());
        onOpenOptions();
      } else if (cutToUpdate.hasRoundedCorners) {
        setExtraType('round');
        setRoundedCorners(cutToUpdate.roundedCorners ?? emptyCorners());
        onOpenOptions();
      } else {
        setExtraType('none');
        setRoundedCorners(emptyCorners());
        onCloseOptions();
      }

      removeCut(cutId);
    },
    [createCutlistSetValue, onOpenOptions, onCloseOptions, removeCut],
  );

  const borderOptions = [
    { value: 0, label: '0' },
    { value: 1, label: '1' },
    { value: 2, label: '2' },
  ];

  // Navegação por setas: → próximo campo, ← campo anterior.
  // Em inputs de texto só pula se o cursor estiver na borda (não atrapalha edição).
  // Em selects (react-select) pula direto — ArrowDown continua abrindo o menu.
  const arrowNavFields = [
    'materialId',
    'amount',
    'sideA',
    'borderA',
    'sideB',
    'borderB',
    'addCutBtn',
  ];

  const focusFieldByIdx = useCallback((idx: number) => {
    const id = arrowNavFields[idx];
    if (!id) return;
    const el = document.getElementById(id) as HTMLElement | null;
    el?.focus();
  }, []);

  const handleArrowNav = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const active = document.activeElement as HTMLElement | null;
      if (!active) return;
      const idx = arrowNavFields.indexOf(active.id);
      if (idx === -1) return;

      // Boundary check: para inputs de texto, só pula se cursor estiver na borda.
      // Para inputs onde selectionStart é null (ex: type=number no Chrome) ou
      // para react-select (input vazio), tratamos como sempre na borda.
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement
      ) {
        let start: number | null = null;
        let end: number | null = null;
        try {
          start = active.selectionStart;
          end = active.selectionEnd;
        } catch {
          /* alguns tipos não suportam selection */
        }
        if (start !== null && end !== null) {
          const len = active.value.length;
          if (e.key === 'ArrowLeft' && (start !== 0 || end !== 0)) return;
          if (e.key === 'ArrowRight' && (start !== len || end !== len)) return;
        }
      }

      const target = idx + (e.key === 'ArrowRight' ? 1 : -1);
      if (target < 0 || target >= arrowNavFields.length) return;
      e.preventDefault();
      e.stopPropagation();
      focusFieldByIdx(target);
    },
    [focusFieldByIdx],
  );

  return (
    <Stack gap={6} mb={3}>
      <Box
        bg="white"
        borderRadius="xl"
        shadow="md"
        borderWidth="1px"
        borderColor="gray.200"
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
                        color: 'yellow.700',
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

              <Flex align="baseline" gap={2} wrap="wrap" justify={['center', 'flex-end']}>
                <Text
                  fontSize={['2xl', '3xl']}
                  fontWeight="800"
                  color="orange.500"
                  letterSpacing="tight"
                  lineHeight="1"
                >
                  {brl(cutlist.reduce((prev, curr) => prev + curr.price, 0))}
                </Text>
                {!isStorePickup && (
                  <>
                    <Text
                      fontSize={['md', 'lg']}
                      fontWeight="700"
                      color="orange.500"
                      lineHeight="1"
                    >
                      +
                    </Text>
                    {showFreightValue ? (
                      <Text
                        fontSize={['md', 'lg']}
                        fontWeight="700"
                        color="orange.500"
                        lineHeight="1"
                      >
                        {brl(freightFromArea)}{' '}
                        <Text
                          as="span"
                          fontSize={['xs', 'sm']}
                          fontWeight="bold"
                          color="orange.700"
                          letterSpacing="wide"
                        >
                          (FRETE)
                        </Text>
                      </Text>
                    ) : (
                      <Text
                        fontSize={['md', 'lg']}
                        fontWeight="800"
                        color="orange.500"
                        letterSpacing="wide"
                        lineHeight="1"
                      >
                        FRETE
                      </Text>
                    )}
                  </>
                )}
              </Flex>
            </Flex>
          </Flex>
        </Box>

        <Box
          p={6}
          as="form"
          onSubmit={createCutlistHandleSubmit(handleCreateCutlist)}
          onKeyDownCapture={handleArrowNav}
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
                    isDisabled={extraType === 'round'}
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
                    isDisabled={extraType === 'round'}
                  />
                </Box>
              </Flex>
            </Box>

            <Box>
              <Flex gap={2} align="center" pb="2px">
                <IconButton
                  aria-label="Opções de Detalhe"
                  colorScheme={
                    extraType === 'hinge'
                      ? 'green'
                      : extraType === 'slot'
                        ? 'orange'
                        : extraType === 'round'
                          ? 'purple'
                          : 'gray'
                  }
                  variant={extraType !== 'none' ? 'solid' : 'outline'}
                  onClick={onToggleOptions}
                  size="md"
                >
                  <FaChevronDown />
                </IconButton>

                <Button
                  id="addCutBtn"
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

          {/* ÁREA DE DETALHE (Furação, Rasgo ou Boleado) */}
          {isOptionsOpen && (
            <Box
              mt={5}
              p={5}
              bg={
                extraType === 'hinge'
                  ? 'green.50'
                  : extraType === 'slot'
                    ? 'orange.50'
                    : extraType === 'round'
                      ? 'purple.50'
                      : 'gray.50'
              }
              borderRadius="lg"
              border="1px solid"
              borderColor={
                extraType === 'hinge'
                  ? 'green.200'
                  : extraType === 'slot'
                    ? 'orange.200'
                    : extraType === 'round'
                      ? 'purple.200'
                      : 'gray.200'
              }
              position="relative"
            >
              {extraType !== 'none' && (
                <Badge
                  position="absolute"
                  top="-10px"
                  left="20px"
                  colorScheme={
                    extraType === 'hinge'
                      ? 'green'
                      : extraType === 'slot'
                        ? 'orange'
                        : 'purple'
                  }
                  variant="solid"
                  px={2}
                >
                  {extraType === 'hinge'
                    ? 'FURAÇÃO ATIVADA'
                    : extraType === 'slot'
                      ? 'RASGO ATIVADO'
                      : 'BOLEADO ATIVADO'}
                </Badge>
              )}

              <Flex align="center" gap={6} wrap="wrap">
                {/* Tipo de Detalhe */}
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    mb={2}
                    color="gray.500"
                    textTransform="uppercase"
                  >
                    Tipo de Detalhe
                  </Text>
                  <HStack gap={2} wrap="wrap">
                    <Button
                      onClick={() => setExtraType('none')}
                      colorScheme="gray"
                      variant={extraType === 'none' ? 'solid' : 'outline'}
                      size="sm"
                    >
                      <FaTimesCircle style={{ marginRight: 6 }} /> Nenhum
                    </Button>
                    <Button
                      onClick={() => setExtraType('hinge')}
                      colorScheme="green"
                      variant={extraType === 'hinge' ? 'solid' : 'outline'}
                      size="sm"
                    >
                      <FaCheckCircle style={{ marginRight: 6 }} /> Furação
                    </Button>
                    <Button
                      onClick={() => setExtraType('slot')}
                      colorScheme="orange"
                      variant={extraType === 'slot' ? 'solid' : 'outline'}
                      size="sm"
                    >
                      <FaCheckCircle style={{ marginRight: 6 }} /> Rasgo
                    </Button>
                    <Button
                      onClick={() => setExtraType('round')}
                      colorScheme="purple"
                      variant={extraType === 'round' ? 'solid' : 'outline'}
                      size="sm"
                    >
                      <FaCheckCircle style={{ marginRight: 6 }} /> Boleado
                    </Button>
                  </HStack>
                </Box>

                {/* Seleção de Lado (Furação / Rasgo) */}
                {(extraType === 'hinge' || extraType === 'slot') && (
                  <Box>
                    <Text
                      fontSize="xs"
                      fontWeight="bold"
                      mb={2}
                      color="gray.500"
                      textTransform="uppercase"
                    >
                      {extraType === 'hinge'
                        ? 'Posição dos Furos'
                        : 'Posição do Rasgo'}
                    </Text>
                    <HStack gap={2}>
                      <Button
                        size="sm"
                        colorScheme={extraType === 'hinge' ? 'green' : 'orange'}
                        variant={extraSide === 'Maior' ? 'solid' : 'outline'}
                        onClick={() => setExtraSide('Maior')}
                      >
                        <FaArrowsAltH style={{ marginRight: 6 }} /> Lado Maior
                      </Button>
                      <Button
                        size="sm"
                        colorScheme={extraType === 'hinge' ? 'green' : 'orange'}
                        variant={extraSide === 'Menor' ? 'solid' : 'outline'}
                        onClick={() => setExtraSide('Menor')}
                      >
                        <FaArrowsAltV style={{ marginRight: 6 }} /> Lado Menor
                      </Button>
                    </HStack>
                  </Box>
                )}

                {/* Seleção interativa dos cantos a bolear */}
                {extraType === 'round' && (
                  <Box>
                    <Text
                      fontSize="xs"
                      fontWeight="bold"
                      mb={2}
                      color="gray.500"
                      textTransform="uppercase"
                    >
                      Cantos a Bolear
                    </Text>
                    <Flex align="center" gap={3}>
                      <TagSchemaSvg
                        gborder={0}
                        pborder={0}
                        corners={roundedCorners}
                        interactive
                        size={88}
                        onToggleCorner={toggleCorner}
                      />
                      <Text fontSize="xs" color="purple.700">
                        {countCorners(roundedCorners)} canto(s) · +R${' '}
                        {countCorners(roundedCorners) * 5},00 por peça
                      </Text>
                    </Flex>
                  </Box>
                )}
              </Flex>

              {extraType === 'slot' && (
                <Text fontSize="xs" color="orange.700" mt={3} fontWeight="bold">
                  ⚠ Quantidade deve ser par — R$5 por par de peças
                </Text>
              )}
              {extraType === 'round' && (
                <Text fontSize="xs" color="purple.700" mt={2}>
                  Peça orientada com o lado maior na horizontal.
                </Text>
              )}
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
              {cutlist.map(c => (
                <CutlistRow
                  key={c.id}
                  cut={c}
                  onEdit={updateCut}
                  onRemove={removeCut}
                />
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Stack>
  );
};
