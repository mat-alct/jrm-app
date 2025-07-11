'use client';

// --- Bloco de Importações ---
// Importa componentes de UI da biblioteca Chakra UI.
import {
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  RadioGroup,
  Table,
  TableCaption,
  useBreakpointValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
// Importa o resolvedor do Yup para integração com o react-hook-form.
import { yupResolver } from '@hookform/resolvers/yup';
// Importa a função Timestamp do Firebase para lidar com datas.
import { Timestamp } from 'firebase/firestore';
// Importa o hook de roteamento do Next.js.
import Head from 'next/head';
import { useRouter } from 'next/router';
// Importa hooks do React.
import React, { useState } from 'react';
// Importa o hook de gerenciamento de formulários.
import { useForm } from 'react-hook-form';
// Importa ícones da biblioteca react-icons.
import { FaEdit, FaTrash } from 'react-icons/fa';
import { RiAddLine, RiRefreshLine } from 'react-icons/ri';
// Importa o hook useQuery para data fetching e cache.
import { useQuery } from '@tanstack/react-query';

// --- Bloco de Importações Internas do Projeto ---
// Hooks e componentes customizados do seu projeto.
import { useAuth } from '../../hooks/authContext';
import { useMaterial } from '../../hooks/material';
import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { FormModal } from '../../components/Form/Modal';
import { FormRadio } from '../../components/Form/Radio';
import { Loader } from '../../components/Loader';
import { Material } from '../../types';
import {
  createMaterialSchema,
  updatePriceSchema,
} from '../../utils/yup/materiaisValidations';

//    Versão simplificada de Material.
interface CreateMaterialFormData {
  name: string;
  width: number;
  height: number;
  price: number;
  materialType: 'MDF' | 'Compensado';
}

// --- Definição de Tipos e Interfaces ---
// Define a estrutura de dados para a atualização de preço.
interface updatePriceProps {
  newPrice: number;
}

// --- Componente Principal: Materiais ---
const Materiais = () => {
  // --- Bloco de Hooks e Estados Iniciais ---

  // Lógica de autenticação: obtém o usuário e protege a rota.
  const { user } = useAuth();
  const router = useRouter();

  // Efeito que roda quando o estado 'user' muda. Se não houver usuário, redireciona para o login.
  React.useEffect(() => {
    if (user === null) {
      router.push('/login');
    }
  }, [user, router]);

  // Hook do Chakra para definir tamanhos de componentes responsivamente.
  const buttonSize = useBreakpointValue(['sm', 'sm', 'sm', 'md'], {
    fallback: 'sm',
  });

  // Estado para guardar o ID do material que está sendo editado.
  const [updatingMaterialId, setUpdatingMaterialId] = useState('');
  // Estado para filtrar os materiais exibidos na tabela (MDF ou Compensado).
  const [materialFilter, setMaterialFilter] = useState('MDF');

  // Hook customizado para obter as funções de manipulação de materiais (criar, buscar, remover, etc.).
  const {
    createMaterial,
    getMaterials,
    getAllMaterials,
    removeMaterial,
    updateMaterialPrice,
  } = useMaterial();

  getAllMaterials;

  // Hooks 'useDisclosure' do Chakra para controlar a abertura/fechamento dos modais.
  // Um para o modal de atualizar preço.
  const {
    onOpen: onOpenPrice,
    open: isOpenPrice,
    onClose: onClosePrice,
  } = useDisclosure();
  // Outro para o modal de criar novo material.
  const { onOpen, open, onClose } = useDisclosure();

  // --- Bloco de Busca de Dados (Data Fetching) ---

  // useQuery do @tanstack/react-query para buscar e gerenciar o cache dos materiais.
  // A chave da query ['materials', materialFilter] faz com que a busca seja refeita automaticamente quando o filtro muda.
  const { data, refetch, isFetching, isLoading } = useQuery({
    queryKey: ['materials', materialFilter],
    queryFn: () => getMaterials(materialFilter),
  });

  // --- Bloco de Gerenciamento de Formulários ---

  // Configuração do react-hook-form para o formulário de CRIAÇÃO de material.
  // Usa o yupResolver para integrar com o esquema de validação 'createMaterialSchema'.
  const {
    register: createMaterialRegister,
    handleSubmit: createMaterialHandleSubmit,
    control: createMaterialControl,
    formState: {
      errors: createMaterialErrors,
      isSubmitting: createMaterialIsSubmitting,
    },
  } = useForm<CreateMaterialFormData>({
    resolver: yupResolver(createMaterialSchema as any),
  });

  // Configuração do react-hook-form para o formulário de ATUALIZAÇÃO de preço.
  const {
    register: updatePriceRegister,
    handleSubmit: updatePriceHandleSubmit,
    formState: {
      errors: updatePriceErrors,
      isSubmitting: updatePriceIsSubmitting,
    },
  } = useForm<updatePriceProps>({
    resolver: yupResolver(updatePriceSchema),
  });

  // --- Bloco de Funções de Manipulação (Handlers) ---

  // Função chamada ao submeter o formulário de criação de material.
  const handleCreateMaterial = async (formData: CreateMaterialFormData) => {
    onClose(); // Fecha o modal.
    // Chama a função do contexto para criar o material, adicionando timestamps.
    await createMaterial({
      ...formData,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    });
  };

  // Função chamada ao submeter o formulário de atualização de preço.
  const handleUpdatePrice = async ({ newPrice }: updatePriceProps) => {
    onClosePrice(); // Fecha o modal de preço.
    // Chama a função do contexto para atualizar o preço do material selecionado.
    await updateMaterialPrice({ id: updatingMaterialId, newPrice });
  };

  // Função chamada quando o usuário clica no ícone de editar preço.
  const handleClickOnUpdatePrice = (id: string) => {
    setUpdatingMaterialId(id); // Guarda o ID do material.
    onOpenPrice(); // Abre o modal de atualização de preço.
  };

  // Função chamada quando o usuário clica no ícone de lixeira.
  const handleRemoveMaterial = async (id: string) => {
    await removeMaterial(id); // Chama a função do contexto para remover o material.
  };

  // --- Bloco de Renderização ---

  // Se o usuário ainda não foi verificado, exibe um loader para proteger a página.
  if (!user) {
    return <Loader />;
  }

  // Renderiza o conteúdo da página se o usuário estiver autenticado.
  return (
    <>
      {/* Configura o título da aba do navegador. */}
      <Head>
        <title>Materiais | JRM Compensados</title>
      </Head>
      {/* Componente de Layout principal. */}
      <Dashboard>
        {/* Cabeçalho da página, com título e botões de ação. */}
        <Header
          pageTitle="Materiais"
          isLoading={isFetching || isLoading || updatePriceIsSubmitting}
        >
          {/* Botão para forçar a atualização da lista de materiais. */}
          <Button
            colorScheme="gray"
            onClick={() => refetch()}
            disabled={createMaterialIsSubmitting || isFetching}
            leftIcon={<Icon as={RiRefreshLine} fontSize="20" />}
            // @ts-ignore
            size={buttonSize}
          >
            Atualizar
          </Button>
          {/* Botão para abrir o modal de criação de novo material. */}
          <Button
            colorScheme="orange"
            onClick={onOpen}
            disabled={createMaterialIsSubmitting || isFetching}
            leftIcon={<Icon as={RiAddLine} fontSize="20" />}
            // @ts-ignore
            size={buttonSize}
          >
            Novo Material
          </Button>
          <Button
            colorScheme="orange"
            onClick={getAllMaterials}
            disabled={createMaterialIsSubmitting || isFetching}
            leftIcon={<Icon as={RiAddLine} fontSize="20" />}
            // @ts-ignore
            size={buttonSize}
          >
            GetMaterials
          </Button>
        </Header>

        {/* Modal para criar novo material. Controlado pelo useDisclosure. */}
        <FormModal
          isOpen={open}
          title="Novo Material"
          onClose={onClose}
          onSubmit={createMaterialHandleSubmit(handleCreateMaterial as any)}
        >
          <Box as="form" gap={4} mx="auto">
            {/* Inputs do formulário de criação. */}
            <FormInput
              {...createMaterialRegister('name')}
              error={createMaterialErrors.name}
              name="name"
              label="Material"
            />
            <HStack gap={8}>
              <FormInput
                {...createMaterialRegister('width')}
                error={createMaterialErrors.width}
                name="width"
                label="Largura"
              />
              <FormInput
                {...createMaterialRegister('height')}
                error={createMaterialErrors.height}
                name="height"
                label="Altura"
              />
              <FormInput
                {...createMaterialRegister('price')}
                error={createMaterialErrors.price}
                name="price"
                label="Preço"
              />
            </HStack>
            <FormRadio
              control={createMaterialControl}
              name="materialType"
              label="Categoria"
              defaultValue="MDF"
              isHorizontal
              options={['MDF', 'Compensado']}
            />
          </Box>
        </FormModal>

        {/* Modal para atualizar preço. */}
        <FormModal
          isOpen={isOpenPrice}
          title="Atualizar Preço"
          onClose={onClosePrice}
          onSubmit={updatePriceHandleSubmit(handleUpdatePrice)}
        >
          <Box as="form" gap={4} mx="auto">
            <FormInput
              {...updatePriceRegister('newPrice')}
              error={updatePriceErrors.newPrice}
              name="newPrice"
              label="Novo preço"
            />
          </Box>
        </FormModal>

        {/* Filtro para alternar entre MDF e Compensado. */}
        <RadioGroup.Root
          onValueChange={e => {
            if (e.value) {
              setMaterialFilter(e.value);
            }
          }}
          value={materialFilter}
          colorScheme="orange"
          mb={4}
        >
          <HStack gap={4}>
            <RadioGroup.Item value="MDF">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator />
              <RadioGroup.ItemText>MDF</RadioGroup.ItemText>
            </RadioGroup.Item>
            <RadioGroup.Item value="Compensado">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator />
              <RadioGroup.ItemText>Compensado</RadioGroup.ItemText>
            </RadioGroup.Item>
          </HStack>
        </RadioGroup.Root>

        {/* Tabela de dados que exibe os materiais. */}
        <Box overflowX="auto">
          <Table.Root variant="line" colorScheme="orange" whiteSpace="nowrap">
            <TableCaption>Lista de Materiais</TableCaption>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Material</Table.ColumnHeader>
                <Table.ColumnHeader>Largura (mm)</Table.ColumnHeader>
                <Table.ColumnHeader>Altura (mm)</Table.ColumnHeader>
                <Table.ColumnHeader>Preço</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {/* Mapeia os dados recebidos do useQuery e renderiza uma linha para cada material. */}
              {data
                ?.sort((a, b) => a.name.localeCompare(b.name))
                .map(material => (
                  <Table.Row key={material.id}>
                    <Table.Cell>{material.name}</Table.Cell>
                    <Table.Cell>{material.width}</Table.Cell>
                    <Table.Cell>{material.height}</Table.Cell>
                    <Table.Cell>{`R$ ${material.price}`}</Table.Cell>
                    <Table.Cell>
                      {/* Botões de ação para cada linha da tabela. */}
                      <HStack gap={4}>
                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Editar"
                          onClick={() => {
                            if (material.id) {
                              handleClickOnUpdatePrice(material.id);
                            }
                          }}
                          disabled={updatePriceIsSubmitting}
                        >
                          <FaEdit />
                        </IconButton>
                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Remover"
                          onClick={() => {
                            if (material.id) {
                              handleRemoveMaterial(material.id);
                            }
                          }}
                          disabled={updatePriceIsSubmitting}
                        >
                          <FaTrash />
                        </IconButton>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Dashboard>
    </>
  );
};

// Exporta o componente como padrão da página.
export default Materiais;
