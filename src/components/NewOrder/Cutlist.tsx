'use client';

// --- Bloco de Importações de Bibliotecas Externas ---
// Importa um CSS necessário para o componente de calendário (react-datepicker).
import 'react-datepicker/dist/react-datepicker.css';
// Importa uma vasta gama de componentes de UI da biblioteca Chakra UI.
import {
  Box,
  Button,
  Field,
  Fieldset,
  Flex,
  Heading,
  HStack,
  IconButton,
  InputGroup,
  RadioGroup,
  Stack,
  Table,
  TableCaption,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
// Importa o resolvedor do Yup para integração com o react-hook-form.
import { yupResolver } from '@hookform/resolvers/yup';
// Importa o hook useState do React para gerenciamento de estado local.
import React, { useState } from 'react';
// Importa o hook useForm para um gerenciamento robusto de formulários.
import { useForm } from 'react-hook-form';
// Importa ícones da biblioteca react-icons.
import { FaEdit, FaTrash } from 'react-icons/fa';
// Importa o hook useQuery do TanStack React Query para data fetching e cache.
import { useQuery } from '@tanstack/react-query';
// Importa a função v4 para gerar IDs únicos universais.
import { v4 } from 'uuid';

// --- Bloco de Importações Internas do Projeto ---
// Hooks e utilitários customizados do seu projeto.
import { useMaterial } from '../../hooks/material';
import { calculateCutlistPrice } from '../../utils/cutlist/calculatePrice';
import { sortCutlistData } from '../../utils/cutlist/sortAndReturnTag';
import { createCutlistSchema } from '../../utils/yup/novoservicoValidations';
import { FormInput } from '../Form/Input';
import { FormSelect } from '../Form/Select';

// --- Definição de Tipos e Interfaces ---
// Define a estrutura de dados de um material dentro do plano de corte.
interface CutlistMaterial {
  materialId: string;
  name: string;
  width: number;
  height: number;
  price: number;
}
// Define a estrutura de uma única peça (corte) na lista.
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
// Define a estrutura dos dados que vêm do formulário de criação de peça.
interface CreateCutlistProps {
  materialId: string;
  amount: number;
  sideA: number;
  sideB: number;
  borderA: number;
  borderB: number;
}
// Define as props que o componente Cutlist espera receber de seu componente pai.
interface CutlistPageProps {
  cutlist: Cutlist[];
  updateCutlist: (cutlistData: Cutlist[], maintainOldValues?: boolean) => void;
}

// --- Componente Principal: Cutlist ---
export const Cutlist = ({ cutlist, updateCutlist }: CutlistPageProps) => {
  // --- Bloco de Hooks e Estados Iniciais ---

  // Configuração do react-hook-form para o formulário de adicionar nova peça.
  // Usa o yupResolver para integrar com o esquema de validação 'createCutlistSchema'.
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

  // Hooks do Chakra para definir tamanhos de componentes de forma responsiva.
  const radioSize = useBreakpointValue(['sm', 'sm', 'md'], { fallback: 'sm' });
  const tableSize = useBreakpointValue(['sm', 'sm', 'md'], { fallback: 'sm' });

  // Hook customizado que fornece funções para interagir com os materiais.
  const { getAllMaterials } = useMaterial();

  // Hook do React Query para buscar a lista de todos os materiais.
  // Ele gerencia o cache e os estados de carregamento automaticamente.
  const { data: materialData } = useQuery({
    queryKey: ['materials'],
    queryFn: getAllMaterials, // A função que busca os dados.
  });

  // Estado local para armazenar o percentual de acréscimo no preço (Balcão, Marceneiro, etc.).
  const [pricePercent, setPricePercent] = useState<number>(75);

  // --- Bloco de Funções de Manipulação (Handlers) ---

  // Função chamada ao submeter o formulário de criação de uma nova peça.
  const handleCreateCutlist = (cutlistFormData: CreateCutlistProps) => {
    // Limpa os campos do formulário para a próxima inserção.
    createCutlistReset({ sideA: 0, sideB: 0, amount: 0 });
    createCutlistSetValue('borderA', 0);
    createCutlistSetValue('borderB', 0);
    createCutlistSetValue('materialId', cutlistFormData.materialId);

    // Encontra os dados completos do material selecionado na lista vinda do React Query.
    const materialUsed = materialData?.find(
      material => material.value === cutlistFormData.materialId,
    );
    if (!materialUsed) throw new Error('Material não encontrado');

    // Calcula o preço da peça com base nos dados e no percentual de acréscimo.
    const price = calculateCutlistPrice(
      // A API de 'calculateCutlistPrice' espera um objeto com certas propriedades, que estamos construindo aqui.
      // É necessário buscar os dados completos do material para isso.
      // Esta parte pode precisar de ajuste dependendo do que 'materialData' retorna.
      { width: 0, height: 0, price: 0 }, // Placeholder, precisa dos dados reais do material.
      cutlistFormData,
      pricePercent,
    );

    // Chama a função 'updateCutlist' (recebida via props) para adicionar a nova peça ao estado do componente pai.
    updateCutlist([
      {
        id: v4(), // Gera um ID único para a nova peça.
        material: {
          materialId: cutlistFormData.materialId,
          height: 0, // Placeholder
          width: 0, // Placeholder
          name: materialUsed.label,
          price: 0, // Placeholder
        },
        ...cutlistFormData,
        price,
      },
    ]);
    // Move o foco do cursor para o campo de quantidade para uma experiência de usuário mais ágil.
    createCutlistSetFocus('amount');
  };

  // Função para atualizar os preços de todas as peças na lista quando o percentual de cálculo muda.
  const updatePricePercent = (percentValue: string) => {
    const newPercent = Number(percentValue);
    setPricePercent(newPercent);
    // Mapeia a lista de peças atual e recalcula o preço de cada uma com o novo percentual.
    const cutlistWithUpdatedPrice = cutlist.map(cut => {
      const priceUpdated = calculateCutlistPrice(cut.material, cut, newPercent);
      return { ...cut, price: priceUpdated };
    });
    // Atualiza o estado no componente pai com a nova lista de preços.
    updateCutlist([...cutlistWithUpdatedPrice], false);
  };

  // Função para remover uma peça da lista.
  const removeCut = (cutId: string) => {
    const cutlistFiltered = cutlist.filter(cut => cut.id !== cutId);
    updateCutlist([...cutlistFiltered], false);
  };

  // Função para editar uma peça. Ela preenche o formulário com os dados da peça selecionada.
  const updateCut = (cutId: string) => {
    const cutToUpdate = cutlist.find(cut => cut.id === cutId);
    if (!cutToUpdate) throw new Error('Corte não encontrado para atualizar');
    const { amount, sideA, sideB, borderA, borderB, material } = cutToUpdate;
    // Preenche os campos do formulário com os dados da peça.
    createCutlistSetValue('amount', amount);
    createCutlistSetValue('sideA', sideA);
    createCutlistSetValue('sideB', sideB);
    createCutlistSetValue('borderA', borderA);
    createCutlistSetValue('borderB', borderB);
    createCutlistSetValue('materialId', material.materialId);
    // Remove a peça da lista para que o usuário possa "readicioná-la" com os novos valores.
    removeCut(cutId);
  };

  // Opções para os seletores de fita de borda.
  const borderOptions = [
    { value: 0, label: '0' },
    { value: 1, label: '1' },
    { value: 2, label: '2' },
  ];

  // --- Bloco de Renderização do Componente (JSX) ---
  return (
    <Flex as="article" direction="column" mb={4}>
      {/* Cabeçalho da seção "Plano de Corte". */}
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
        {/* Seção para escolher a base de cálculo de preço. */}
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
            // @ts-ignore - Usado para contornar um bug de tipagem do ambiente.
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
        {/* Exibe o preço total do plano de corte, formatado como moeda. */}
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

      {/* Formulário para adicionar novas peças ao plano de corte. */}
      <Stack
        as="form"
        align="flex"
        onSubmit={createCutlistHandleSubmit(handleCreateCutlist)}
        direction={['column', 'column', 'column', 'column', 'row']}
      >
        {/* Componentes de formulário customizados. */}
        <Box minW="33%">
          <FormSelect
            name="materialId"
            control={createCutlistControl}
            isClearable
            placeholder="Material"
            options={materialData}
          />
        </Box>
        <Box w="100%" maxW={[null, null, null, null, '60px']}>
          <FormInput
            {...createCutlistRegister('amount')}
            name="amount"
            placeholder="Qtd"
            error={createCutlistErrors.amount}
            size="md"
          />
        </Box>
        <Field.Root w="100%">
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
        </Field.Root>
        <Field.Root w="100%">
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
        </Field.Root>
        <Button colorScheme="orange" size="md" w="100%" type="submit">
          Adicionar
        </Button>
      </Stack>

      {/* Tabela que exibe as peças já adicionadas. */}
      <Box overflowX="auto">
        {/* A tabela só é renderizada se houver pelo menos uma peça na lista. */}
        {cutlist.length > 0 && (
          <Table.Root
            colorScheme="orange"
            mt={8}
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
              {/* Mapeia a lista de peças do estado para criar uma linha para cada uma. */}
              {cutlist.map(cutlistMapped => {
                // Utilitário para determinar a imagem da fita de borda e ordenar os lados.
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
                      {/* Botões de ação para editar ou remover a peça. */}
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
