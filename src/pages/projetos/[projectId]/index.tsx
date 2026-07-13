import { Box, Heading, Stack, Text } from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

import { AttachmentList } from '@/components/projects/AttachmentList';
import { AttachmentUploader } from '@/components/projects/AttachmentUploader';
import { ClientAccessPanel } from '@/components/projects/ClientAccessPanel';
import { ProjectItemCard } from '@/components/projects/ProjectItemCard';
import { ProjectSummaryCards } from '@/components/projects/ProjectSummaryCards';
import { useAttachments } from '@/services/projects/attachmentHooks';
import { useProject, useProjectItems } from '@/services/projects/projectHooks';
import { useAppUser } from '@/services/projects/users.service';
import { isAdmin } from '@/utils/projects/permissions';

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

  const { data: appUser } = useAppUser();
  const { data: project, isLoading: isLoadingProject } = useProject(projectId);
  const { data: items, isLoading: isLoadingItems } = useProjectItems(projectId);
  const { data: attachments } = useAttachments(projectId);

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
            <Heading size="md" mb={3}>
              Dados do cliente
            </Heading>
            <Stack gap={1} fontSize="sm">
              <Text>
                <b>Telefone:</b> {project.customerPhone}
              </Text>
              <Text>
                <b>E-mail:</b> {project.customerEmail}
              </Text>
              <Text>
                <b>Endereço:</b> {project.customerAddress}
              </Text>
              <Text>
                <b>Vendedor:</b> {project.sellerName ?? '—'}
              </Text>
            </Stack>
          </Box>

          <ProjectSummaryCards summary={project.itemSummary} />

          <ClientAccessPanel
            projectId={projectId}
            expiresAt={project.clientLinkExpiresAt?.toDate().toISOString()}
          />

          <Box>
            <Heading size="md" mb={3}>
              Itens
            </Heading>
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

          <Box
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={4}
          >
            <Heading size="md" mb={3}>
              Anexos do projeto
            </Heading>
            <Stack gap={4}>
              {user && (
                <AttachmentUploader
                  projectId={projectId}
                  uploadedBy={user.uid}
                  uploadedByRole={
                    appUser?.roles && isAdmin(appUser.roles)
                      ? 'admin'
                      : (appUser?.roles?.[0] ?? 'seller')
                  }
                  categorySuggestions={Array.from(
                    new Set((attachments ?? []).map(a => a.category)),
                  )}
                />
              )}
              <AttachmentList
                projectId={projectId}
                attachments={attachments ?? []}
                viewerRoles={appUser?.roles}
              />
            </Stack>
          </Box>
        </Stack>
      </Dashboard>
    </>
  );
};

export default ProjectDetail;
