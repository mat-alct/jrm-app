import { Box, Button, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

import { AssemblerAssignmentsPanel } from '@/components/assembler/AssemblerAssignmentsPanel';
import { AssignAssemblerModal } from '@/components/assembler/AssignAssemblerModal';
import { DesignerUploadPanel } from '@/components/designer/DesignerUploadPanel';
import { AssignDesignerModal } from '@/components/projects/AssignDesignerModal';
import { AttachmentList } from '@/components/projects/AttachmentList';
import { AttachmentUploader } from '@/components/projects/AttachmentUploader';
import { ItemBudgetForm } from '@/components/projects/ItemBudgetForm';
import { ProjectItemStatusBadge } from '@/components/projects/ProjectItemStatusBadge';
import { ProjectItemTimeline } from '@/components/projects/ProjectItemTimeline';
import { useUsersByRole } from '@/services/projects/adminUsers';
import {
  assignAssemblers,
  AssignAssemblerInput,
  listItemAssemblerAssignments,
} from '@/services/projects/assembler.service';
import { useAttachments } from '@/services/projects/attachmentHooks';
import { saveItemBudget, sendBudgetToClient } from '@/services/projects/budget.service';
import { useItemVersions } from '@/services/projects/designer.service';
import {
  useItemStatusHistory,
  useProjectItem,
  useUpdateItemStatus,
} from '@/services/projects/projectHooks';
import { useAppUser } from '@/services/projects/users.service';
import { ProjectItemStatus, UserRole } from '@/types/projects';
import {
  canAssignAssembler,
  canAssignDesigner,
  canEditItemStatus,
  hasRole,
  isAdmin,
} from '@/utils/projects/permissions';
import { canTransition } from '@/utils/projects/status';

import { Dashboard } from '../../../../components/Dashboard';
import { Header } from '../../../../components/Dashboard/Content/Header';
import { Loader } from '../../../../components/Loader';
import { toaster } from '../../../../components/ui/toaster';
import { useAuth } from '../../../../hooks/authContext';

const ALL_STATUSES: ProjectItemStatus[] = [
  'projeto_criado',
  'aguardando_desenho',
  'aguardando_orcamento',
  'aguardando_aprovacao_cliente',
  'alteracao_solicitada',
  'recusado_pelo_cliente',
  'aguardando_atribuicao_montador',
  'em_producao',
  'pronto_para_montagem',
  'montagem_concluida',
  'aguardando_pagamento_montador',
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
  const [isAssignAssemblerOpen, setIsAssignAssemblerOpen] = React.useState(false);

  const queryClient = useQueryClient();
  const { data: assemblers } = useUsersByRole('assembler');
  const { data: assignments } = useQuery({
    queryKey: ['projects', projectId, 'items', itemId, 'assemblerAssignments'],
    queryFn: () => listItemAssemblerAssignments(projectId, itemId),
    enabled: !!projectId && !!itemId,
  });
  const assignAssemblersMutation = useMutation({
    mutationFn: (rows: AssignAssemblerInput[]) => {
      if (!appUser) throw new Error('Usuário não carregado.');
      return assignAssemblers(projectId, itemId, rows, {
        id: appUser.id,
        roles: appUser.roles,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'items', itemId, 'assemblerAssignments'],
      });
      toaster.create({ type: 'success', description: 'Montadores atribuídos.' });
      setIsAssignAssemblerOpen(false);
    },
    onError: (error: Error) => {
      toaster.create({
        type: 'error',
        description: error.message || 'Erro ao atribuir montadores.',
      });
    },
  });

  const saveBudgetMutation = useMutation({
    mutationFn: (values: {
      lines: { description: string; amount: number }[];
      customerAmount: number;
      suggestedAssemblerAmount: number;
    }) => {
      if (!appUser) throw new Error('Usuário não carregado.');
      return saveItemBudget(projectId, itemId, values, {
        id: appUser.id,
        name: appUser.name,
        roles: appUser.roles,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'items', itemId],
      });
      toaster.create({ type: 'success', description: 'Orçamento salvo.' });
    },
    onError: (error: Error) => {
      toaster.create({
        type: 'error',
        description: error.message || 'Erro ao salvar orçamento.',
      });
    },
  });

  const sendBudgetMutation = useMutation({
    mutationFn: () => {
      if (!user || !appUser) throw new Error('Usuário não carregado.');
      return sendBudgetToClient(projectId, itemId, {
        id: appUser.id,
        roles: appUser.roles,
        role: actorRole(appUser.roles),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'items', itemId],
      });
      toaster.create({
        type: 'success',
        description: 'Orçamento enviado ao cliente.',
      });
    },
    onError: (error: Error) => {
      toaster.create({
        type: 'error',
        description: error.message || 'Erro ao enviar orçamento.',
      });
    },
  });

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
  // Desenhistas comuns nao veem valores financeiros (spec secao 4).
  const canSeePrice = admin || !hasRole(appUser?.roles, 'designer');
  // Vendedor acompanha status, mas quem edita e admin/desenhista/montador (spec secao 4).
  const availableTransitions = canEditItemStatus(appUser?.roles)
    ? ALL_STATUSES.filter(status =>
        canTransition(item.status, status, { isAdmin: admin }),
      )
    : [];

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
              {canSeePrice && <Text><b>Preço:</b> {item.customerPrice}</Text>}
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

          {canSeePrice && !hasRole(appUser?.roles, 'assembler') && (
            <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
              <Heading size="md" mb={3}>
                Orçamento
              </Heading>
              {item.status === 'aguardando_orcamento' ? (
                <ItemBudgetForm
                  initialBudget={item.budget}
                  isSubmitting={saveBudgetMutation.isPending}
                  onSubmit={async values => {
                    await saveBudgetMutation.mutateAsync(values);
                  }}
                />
              ) : item.budget ? (
                <Stack gap={1} fontSize="sm">
                  <Text><b>Valor ao cliente:</b> {item.budget.customerAmount}</Text>
                  <Text><b>Custo interno:</b> {item.budget.totalCost}</Text>
                  <Text>
                    <b>Sugestão para o montador:</b>{' '}
                    {item.budget.suggestedAssemblerAmount}
                  </Text>
                </Stack>
              ) : (
                <Text color="gray.500" fontSize="sm">
                  Orçamento ainda não preenchido.
                </Text>
              )}
              {item.budget && item.status === 'aguardando_orcamento' && (
                <Button
                  mt={3}
                  size="sm"
                  colorScheme="orange"
                  loading={sendBudgetMutation.isPending}
                  onClick={() => sendBudgetMutation.mutate()}
                >
                  Enviar orçamento ao cliente
                </Button>
              )}
            </Box>
          )}

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

          <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
            <HStack justify="space-between" mb={3}>
              <Heading size="md">Montadores</Heading>
              {canAssignAssembler(appUser?.roles) && (
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="orange"
                  onClick={() => setIsAssignAssemblerOpen(open => !open)}
                >
                  {isAssignAssemblerOpen ? 'Fechar' : 'Atribuir montador'}
                </Button>
              )}
            </HStack>
            {isAssignAssemblerOpen && (
              <Box mb={4}>
                <AssignAssemblerModal
                  assemblers={assemblers ?? []}
                  suggestedAmount={item.budget?.suggestedAssemblerAmount}
                  isSubmitting={assignAssemblersMutation.isPending}
                  onSubmit={async rows => {
                    await assignAssemblersMutation.mutateAsync(rows);
                  }}
                />
              </Box>
            )}
            <AssemblerAssignmentsPanel
              assignments={assignments ?? []}
              canViewValues={admin}
            />
          </Box>

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
