import { Badge, Box, Button, Table, Tabs, Text } from '@chakra-ui/react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

import { DesignerQueue } from '@/components/designer/DesignerQueue';
import { toaster } from '@/components/ui/toaster';
import {
  useClaimDesignItem,
  useDesignQueue,
} from '@/services/projects/designer.service';
import { useProjects } from '@/services/projects/projectHooks';
import { useAppUser } from '@/services/projects/users.service';
import { ProjectItem } from '@/types/projects';
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

  const admin = isAdmin(appUser?.roles);
  const canSeeProjectsTab = admin || hasRole(appUser?.roles, 'seller');
  const canSeeDesignQueueTab = admin || hasRole(appUser?.roles, 'designer');

  const sellerOnly =
    !!appUser && !admin && hasRole(appUser.roles, 'seller');

  const {
    data: projects,
    isLoading,
    isFetching,
  } = useProjects({
    sellerId: sellerOnly ? user?.uid : undefined,
    search,
  });

  const {
    data: designQueue,
    isLoading: isLoadingQueue,
    isFetching: isFetchingQueue,
  } = useDesignQueue(!isLoadingAppUser && canSeeDesignQueueTab);
  const claimDesignItem = useClaimDesignItem();

  if (!user || isLoadingAppUser) {
    return <Loader />;
  }

  const defaultTab = canSeeProjectsTab ? 'projetos' : 'desenhos';

  const handleClaim = async (item: ProjectItem) => {
    if (!user) return;
    try {
      await claimDesignItem.mutateAsync({
        projectId: item.projectId,
        itemId: item.id,
        actor: { uid: user.uid, name: appUser?.name },
      });
      toaster.create({ type: 'success', description: 'Item assumido.' });
    } catch (error) {
      toaster.create({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Erro ao assumir item.',
      });
    }
  };

  return (
    <>
      <Head>
        <title>Projetos | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header
          pageTitle="Projetos"
          isLoading={(isFetching && !isLoading) || (isFetchingQueue && !isLoadingQueue)}
        >
          {canSeeProjectsTab && (
            <Link href="/projetos/novo" passHref>
              <Button colorScheme="orange">Novo Projeto</Button>
            </Link>
          )}
        </Header>

        <Tabs.Root defaultValue={defaultTab}>
          <Tabs.List mb={4}>
            {canSeeProjectsTab && (
              <Tabs.Trigger value="projetos">Projetos</Tabs.Trigger>
            )}
            {canSeeDesignQueueTab && (
              <Tabs.Trigger value="desenhos">Desenhos pendentes</Tabs.Trigger>
            )}
          </Tabs.List>

          {canSeeProjectsTab && (
            <Tabs.Content value="projetos">
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
            </Tabs.Content>
          )}

          {canSeeDesignQueueTab && (
            <Tabs.Content value="desenhos">
              <DesignerQueue
                items={designQueue ?? []}
                currentUserId={user.uid}
                onClaim={item => void handleClaim(item)}
                claimingItemId={claimDesignItem.variables?.itemId}
              />
            </Tabs.Content>
          )}
        </Tabs.Root>
      </Dashboard>
    </>
  );
};

export default ProjetosIndex;
