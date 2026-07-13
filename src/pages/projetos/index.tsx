import { Badge, Box, Button, Table, Text } from '@chakra-ui/react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

import { useProjects } from '@/services/projects/projectHooks';
import { useAppUser } from '@/services/projects/users.service';
import { hasRole, isAdmin } from '@/utils/projects/permissions';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { SearchBar } from '../../components/SearchBar';
import { useAuth } from '../../hooks/authContext';

const ProjetosIndex = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { data: appUser, isLoading: isLoadingAppUser } = useAppUser();
  const [search, setSearch] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (user === null) void router.push('/login');
  }, [user, router]);

  const sellerOnly =
    !!appUser && !isAdmin(appUser.roles) && hasRole(appUser.roles, 'seller');

  const {
    data: projects,
    isLoading,
    isFetching,
  } = useProjects({
    sellerId: sellerOnly ? user?.uid : undefined,
    search,
  });

  if (!user || isLoadingAppUser) {
    return <Loader />;
  }

  return (
    <>
      <Head>
        <title>Projetos | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Projetos" isLoading={isFetching && !isLoading}>
          <Link href="/projetos/novo" passHref>
            <Button colorScheme="orange">Novo Projeto</Button>
          </Link>
        </Header>

        <Box mb={4} w={['100%', '100%', '320px']}>
          <SearchBar
            handleUpdateSearch={value => setSearch(value || undefined)}
            placeholder="Buscar por cliente..."
            width="100%"
          />
        </Box>

        <Box overflowX="auto">
          <Table.Root
            variant="outline"
            colorScheme="orange"
            whiteSpace="nowrap"
          >
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Cliente</Table.ColumnHeader>
                <Table.ColumnHeader>Vendedor</Table.ColumnHeader>
                <Table.ColumnHeader>Itens</Table.ColumnHeader>
                <Table.ColumnHeader>Atrasados</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {projects?.map(project => (
                <Table.Row
                  key={project.id}
                  cursor="pointer"
                  onClick={() => void router.push(`/projetos/${project.id}`)}
                  _hover={{ bg: 'orange.50' }}
                >
                  <Table.Cell>{project.customerName}</Table.Cell>
                  <Table.Cell>{project.sellerName ?? '—'}</Table.Cell>
                  <Table.Cell>{project.itemSummary.total}</Table.Cell>
                  <Table.Cell>
                    {project.itemSummary.atrasados > 0 ? (
                      <Badge colorScheme="red">
                        {project.itemSummary.atrasados}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          {!isLoading && projects?.length === 0 && (
            <Text mt={4} color="gray.500">
              Nenhum projeto encontrado.
            </Text>
          )}
        </Box>
      </Dashboard>
    </>
  );
};

export default ProjetosIndex;
