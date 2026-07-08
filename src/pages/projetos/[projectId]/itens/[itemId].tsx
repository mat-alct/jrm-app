import { Box, Button, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

import { DesignerUploadPanel } from '@/components/designer/DesignerUploadPanel';
import { AssignDesignerModal } from '@/components/projects/AssignDesignerModal';
import { AttachmentList } from '@/components/projects/AttachmentList';
import { AttachmentUploader } from '@/components/projects/AttachmentUploader';
import { ProjectItemStatusBadge } from '@/components/projects/ProjectItemStatusBadge';
import { ProjectItemTimeline } from '@/components/projects/ProjectItemTimeline';
import { useAttachments } from '@/services/projects/attachmentHooks';
import { useItemVersions } from '@/services/projects/designer.service';
import {
  useItemStatusHistory,
  useProjectItem,
  useUpdateItemStatus,
} from '@/services/projects/projectHooks';
import { useAppUser } from '@/services/projects/users.service';
import { ProjectItemStatus, UserRole } from '@/types/projects';
import { canAssignDesigner, isAdmin } from '@/utils/projects/permissions';
import { canTransition } from '@/utils/projects/status';

import { Dashboard } from '../../../../components/Dashboard';
import { Header } from '../../../../components/Dashboard/Content/Header';
import { Loader } from '../../../../components/Loader';
import { toaster } from '../../../../components/ui/toaster';
import { useAuth } from '../../../../hooks/authContext';

const ALL_STATUSES: ProjectItemStatus[] = [
  'orcamento_criado',
  'aguardando_desenho',
  'projeto_desenhado',
  'aguardando_aprovacao_cliente',
  'alteracao_solicitada',
  'recusado_pelo_cliente',
  'aprovado',
  'aguardando_separacao_materiais',
  'em_producao',
  'pronto_para_transporte',
  'em_transporte',
  'em_montagem',
  'montagem_concluida',
  'finalizado',
  'cancelado',
];

function actorRole(roles: UserRole[] | undefined): UserRole {
  if (!roles || roles.length === 0) return 'seller';
  if (roles.includes('admin')) return 'admin';
  return roles[0];
}

const ProjectItemDetail = () => {
  const { user } = useAuth();
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const itemId = router.query.itemId as string;

  React.useEffect(() => {
    if (user === null) router.push('/login');
  }, [user, router]);

  const { data: appUser } = useAppUser();
  const { data: item, isLoading: isLoadingItem } = useProjectItem(
    projectId,
    itemId,
  );
  const { data: history } = useItemStatusHistory(projectId, itemId);
  const { data: attachments } = useAttachments(projectId, itemId);
  const { data: versions } = useItemVersions(projectId, itemId);
  const updateStatus = useUpdateItemStatus(projectId, itemId);
  const [isAssignDesignerOpen, setIsAssignDesignerOpen] = React.useState(false);

  const handleTransition = async (next: ProjectItemStatus) => {
    if (!user || !appUser) return;

    try {
      await updateStatus.mutateAsync({
        next,
        actor: { uid: user.uid, role: actorRole(appUser.roles) },
      });
      toaster.create({ type: 'success', description: 'Status atualizado.' });
    } catch (error) {
      toaster.create({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Erro ao atualizar status.',
      });
    }
  };

  if (!user || isLoadingItem) {
    return <Loader />;
  }

  if (!item) {
    return (
      <Dashboard>
        <Header pageTitle="Item não encontrado" />
        <Text color="gray.500">Este item não existe ou foi removido.</Text>
      </Dashboard>
    );
  }

  const admin = isAdmin(appUser?.roles);
  const availableTransitions = ALL_STATUSES.filter(status =>
    canTransition(item.status, status, { isAdmin: admin }),
  );

  return (
    <>
      <Head>
        <title>{item.name} | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle={item.name} />

        <Stack gap={6}>
          <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
            <HStack justify="space-between" mb={3}>
              <Heading size="md">Status atual</Heading>
              <ProjectItemStatusBadge status={item.status} />
            </HStack>
            <Stack gap={1} fontSize="sm">
              <Text><b>Ambiente:</b> {item.environment}</Text>
              {item.material && <Text><b>Material:</b> {item.material}</Text>}
              {item.finish && <Text><b>Acabamento:</b> {item.finish}</Text>}
              {item.measurements && <Text><b>Medidas:</b> {item.measurements}</Text>}
              {item.description && <Text><b>Descrição:</b> {item.description}</Text>}
              {item.notes && <Text><b>Observações:</b> {item.notes}</Text>}
              <Text><b>Preço:</b> {item.customerPrice}</Text>
            </Stack>

            {availableTransitions.length > 0 && (
              <Box mt={4}>
                <Text fontWeight="semibold" mb={2} fontSize="sm">
                  Alterar status
                </Text>
                <HStack wrap="wrap" gap={2}>
                  {availableTransitions.map(status => (
                    <Button
                      key={status}
                      size="sm"
                      variant="outline"
                      colorScheme="orange"
                      loading={updateStatus.isPending}
                      onClick={() => handleTransition(status)}
                    >
                      <ProjectItemStatusBadge status={status} />
                    </Button>
                  ))}
                </HStack>
              </Box>
            )}
          </Box>

          {item.requiresDesigner && (
            <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
              <HStack justify="space-between" mb={3}>
                <Heading size="md">Desenho</Heading>
                {canAssignDesigner(appUser?.roles) && (
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="orange"
                    onClick={() => setIsAssignDesignerOpen(true)}
                  >
                    {item.designerId ? 'Reatribuir desenhista' : 'Atribuir desenhista'}
                  </Button>
                )}
              </HStack>
              <Stack gap={1} fontSize="sm" mb={3}>
                <Text><b>Desenhista:</b> {item.designerName ?? '—'}</Text>
                <Text>
                  <b>Prazo:</b>{' '}
                  {item.deadlineCurrent
                    ? item.deadlineCurrent.toDate().toLocaleDateString('pt-BR')
                    : '—'}
                </Text>
              </Stack>

              {user &&
                appUser &&
                item.designerId === user.uid &&
                item.status === 'aguardando_desenho' && (
                  <DesignerUploadPanel
                    projectId={projectId}
                    itemId={itemId}
                    actor={{ uid: user.uid, role: 'designer' }}
                  />
                )}

              {versions && versions.length > 0 && (
                <Stack gap={2} mt={4}>
                  <Text fontWeight="semibold" fontSize="sm">
                    Versões
                  </Text>
                  {versions.map(version => (
                    <Box
                      key={version.id}
                      borderWidth="1px"
                      borderColor="gray.200"
                      borderRadius="md"
                      p={2}
                      fontSize="sm"
                    >
                      <Text fontWeight="medium">Versão {version.versionNumber}</Text>
                      {version.description && <Text>{version.description}</Text>}
                      <Text color="gray.500" fontSize="xs">
                        {version.attachmentIds.length} arquivo(s)
                      </Text>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {/* Reservado para AssignAssemblerModal / painel de assignments (Via B) — integração no CP2 */}

          <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
            <Heading size="md" mb={3}>
              Histórico
            </Heading>
            <ProjectItemTimeline history={history ?? []} />
          </Box>

          <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
            <Heading size="md" mb={3}>
              Anexos do item
            </Heading>
            <Stack gap={4}>
              {user && (
                <AttachmentUploader
                  projectId={projectId}
                  itemId={itemId}
                  uploadedBy={user.uid}
                  uploadedByRole={admin ? 'admin' : appUser?.roles?.[0] ?? 'seller'}
                  categorySuggestions={Array.from(
                    new Set((attachments ?? []).map(a => a.category)),
                  )}
                />
              )}
              <AttachmentList
                projectId={projectId}
                itemId={itemId}
                attachments={attachments ?? []}
                viewerRoles={appUser?.roles}
              />
            </Stack>
          </Box>
        </Stack>

        {user && (
          <AssignDesignerModal
            isOpen={isAssignDesignerOpen}
            onClose={() => setIsAssignDesignerOpen(false)}
            projectId={projectId}
            itemId={itemId}
            actor={{ uid: user.uid, role: actorRole(appUser?.roles) }}
          />
        )}
      </Dashboard>
    </>
  );
};

export default ProjectItemDetail;
