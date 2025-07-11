'use client';

// --- Bloco de Importações ---
// Componentes de UI da biblioteca Chakra UI
import {
  Box,
  Button,
  HStack,
  Icon,
  Table,
  TableCaption,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
// Resolvedor do Yup para integração com react-hook-form
import { yupResolver } from '@hookform/resolvers/yup';
// Funções e tipos do Firebase v9+ para interagir com o banco de dados
import { addDoc, collection, doc, getDocs, setDoc } from 'firebase/firestore';
// Hooks e tipos do Next.js e React
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { useForm } from 'react-hook-form';
// Ícones
import { FaUserPlus } from 'react-icons/fa';
// Hook useQuery do TanStack React Query para data fetching
import { useQuery } from '@tanstack/react-query';

// --- Bloco de Importações Internas do Projeto ---
// Hooks e componentes customizados do seu projeto
import { useAuth } from '../../hooks/authContext';
import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { FormModal } from '../../components/Form/Modal';
import { Loader } from '../../components/Loader';
// Instância do banco de dados Firestore
import { db } from '../../services/firebase';
// Esquema de validação do Yup
import { createSellerSchema } from '../../utils/yup/vendedoresValidations';

// --- Interfaces e Tipos ---
// Define a estrutura de dados para os campos do formulário de criação de vendedor
interface CreateSellerData {
  name: string;
  password: string;
}

// Define a estrutura de um vendedor, incluindo o ID que vem do Firestore
interface Seller {
  id: string;
  name: string;
}

// --- Componente Principal: Vendedores ---
const Vendedores = () => {
  // --- Bloco de Hooks e Estados Iniciais ---

  // Lógica de proteção de rota: obtém o usuário do nosso contexto de autenticação
  const { user } = useAuth();
  const router = useRouter();

  // Efeito que executa quando o 'user' muda. Se não houver usuário, redireciona para o login.
  React.useEffect(() => {
    if (user === null) {
      router.push('/login');
    }
  }, [user, router]);

  // Hook do Chakra para controlar a abertura/fechamento do modal de criação
  const { onOpen, open, onClose } = useDisclosure();

  // --- Bloco de Busca de Dados (React Query) ---

  // Função assíncrona que busca os vendedores no Firestore usando a API v9+
  const getSellers = async () => {
    const sellersCollection = collection(db, 'sellers');
    const sellersSnapshot = await getDocs(sellersCollection);
    const sellersList = sellersSnapshot.docs.map(
      document =>
        ({
          id: document.id,
          name: document.data().name,
        }) as Seller,
    );
    return sellersList;
  };

  // Hook que busca os dados usando a função acima e gerencia o cache.
  // A sintaxe foi atualizada para o novo padrão de objeto do React Query.
  const { data, isFetching, isLoading } = useQuery({
    queryKey: ['sellers'],
    queryFn: getSellers,
  });

  // --- Bloco de Gerenciamento de Formulário ---

  // Configuração do react-hook-form para o formulário de criação de vendedor
  const {
    register: createSellerRegister,
    handleSubmit: createSellerHandleSubmit,
    formState: {
      errors: createSellerErrors,
      isSubmitting: createSellerIsSubmitting,
    },
  } = useForm<CreateSellerData>({
    resolver: yupResolver(createSellerSchema),
  });

  // --- Bloco de Funções de Manipulação (Handlers) ---

  // Função chamada ao submeter o formulário de criação de vendedor
  const handleCreateSeller = async (sellerData: CreateSellerData) => {
    // Pega a referência da coleção 'sellers'
    const sellersCollection = collection(db, 'sellers');

    // Adiciona um novo documento à coleção.
    // O Firestore irá gerar um ID automático.
    await addDoc(sellersCollection, {
      name: sellerData.name,
      password: sellerData.password,
      // Nota de segurança: A senha não é salva no documento.
      // Ela deve ser usada apenas para autenticação, não armazenada aqui.
    });

    onClose();
  };

  // --- Bloco de Renderização ---

  // Exibe um loader enquanto a autenticação do usuário está sendo verificada
  if (!user) {
    return <Loader />;
  }

  return (
    <>
      <Head>
        <title>Vendedores | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header
          pageTitle="Vendedores"
          isLoading={isFetching && !isLoading} // Mostra o spinner do header apenas no refetch em background
        >
          <Button
            colorScheme="orange"
            onClick={onOpen}
            disabled={createSellerIsSubmitting}
            // leftIcon={<Icon as={FaUserPlus} fontSize="20" />}
          >
            Novo Vendedor
          </Button>
        </Header>

        {/* Modal para criar novo vendedor */}
        <FormModal
          isOpen={open}
          title="Novo Vendedor"
          onClose={onClose}
          onSubmit={createSellerHandleSubmit(handleCreateSeller)}
        >
          <Box as="form" gap={4} mx="auto">
            <FormInput
              {...createSellerRegister('name')}
              error={createSellerErrors.name}
              name="name"
              label="Nome do Vendedor"
            />
            <FormInput
              {...createSellerRegister('password')}
              error={createSellerErrors.password}
              name="password"
              label="Senha (ID)"
            />
          </Box>
        </FormModal>

        {/* Tabela de dados que exibe os vendedores */}
        {/* Componente Table atualizado para o novo padrão aninhado */}
        <Box overflowX="auto">
          <Table.Root
            variant="outline"
            colorScheme="orange"
            whiteSpace="nowrap"
          >
            <TableCaption>Lista de Vendedores</TableCaption>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Nome</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data?.map(seller => (
                <Table.Row key={seller.id}>
                  <Table.Cell>{seller.name}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Dashboard>
    </>
  );
};

// Exportação direta do componente, sem o HOC 'withAuthUser'
export default Vendedores;
