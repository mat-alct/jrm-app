import { Box, Button, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

import { AddProjectItemModal } from '@/components/projects/AddProjectItemModal';
import { ClientAccessPanel } from '@/components/projects/ClientAccessPanel';
import { EditCustomerDataModal } from '@/components/projects/EditCustomerDataModal';
import { ProjectItemCard } from '@/components/projects/ProjectItemCard';
import { ProjectSummaryCards } from '@/components/projects/ProjectSummaryCards';
import { useProject, useProjectItems } from '@/services/projects/projectHooks';

import { Dashboard } from '../../../components/Dashboard';
import { Header } from '../../../components/Dashboard/Content/Header';
import { Loader } from '../../../components/Loader';
import { useAuth } from '../../../hooks/authContext';

const ProjectDetail = () => {
  const { user } = useAuth();
  const router = useRouter();
  const projectId = router.query.projectId as string;

  React.useEffect(() => {
    if (user === null) void router.push('/login');
  }, [user, router]);

  const { data: project, isLoading: isLoadingProject } = useProject(projectId);
  const { data: items, isLoading: isLoadingItems } = useProjectItems(projectId);
  const [isEditingCustomer, setIsEditingCustomer] = React.useState(false);
  const [isAddingItem, setIsAddingItem] = React.useState(false);

  if (!user || isLoadingProject) {
    return <Loader />;
  }

  if (!project) {
    return (
      <Dashboard>
        <Header pageTitle="Projeto não encontrado" />
        <Text color="gray.500">Este projeto não existe ou foi removido.</Text>
      </Dashboard>
    );
  }

  return (
    <>
      <Head>
        <title>{project.customerName} | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle={project.customerName} />

        <Stack gap={6}>
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={4}
          >
            <HStack justify="space-between" mb={3}>
              <Heading size="md">Dados do cliente</Heading>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingCustomer(true)}
              >
                Editar
              </Button>
            </HStack>
            <Stack gap={1} fontSize="sm">
              <Text>
                <b>Telefone:</b> {project.customerPhone}
              </Text>
              <Text>
                <b>E-mail:</b> {project.customerEmail ?? '—'}
              </Text>
              <Text>
                <b>Endereço:</b> {project.customerAddress ?? '—'}
              </Text>
              <Text>
                <b>Vendedor:</b> {project.sellerName ?? '—'}
              </Text>
            </Stack>
          </Box>

          {user && (
            <EditCustomerDataModal
              isOpen={isEditingCustomer}
              onClose={() => setIsEditingCustomer(false)}
              project={project}
              updatedBy={user.uid}
            />
          )}

          <ProjectSummaryCards summary={project.itemSummary} />

          <ClientAccessPanel
            projectId={projectId}
            expiresAt={project.clientLinkExpiresAt?.toDate().toISOString()}
          />

          <Box>
            <HStack justify="space-between" mb={3}>
              <Heading size="md">Itens</Heading>
              <Button
                size="sm"
                colorScheme="orange"
                variant="outline"
                onClick={() => setIsAddingItem(true)}
              >
                Adicionar item
              </Button>
            </HStack>
            <Stack gap={3}>
              {items?.map(item => (
                <ProjectItemCard
                  key={item.id}
                  projectId={projectId}
                  item={item}
                />
              ))}
              {!isLoadingItems && items?.length === 0 && (
                <Text color="gray.500">Nenhum item cadastrado.</Text>
              )}
            </Stack>
          </Box>

          {user && (
            <AddProjectItemModal
              isOpen={isAddingItem}
              onClose={() => setIsAddingItem(false)}
              projectId={projectId}
              createdBy={user.uid}
            />
          )}
        </Stack>
      </Dashboard>
    </>
  );
};

export default ProjectDetail;
