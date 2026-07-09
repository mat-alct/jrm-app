import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Link,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { FiFileText } from 'react-icons/fi';

import { Loader } from '@/components/Loader';
import { ModelViewerPreview } from '@/components/projects/ModelViewerPreview';
import { AppCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusPill } from '@/components/ui/status-pill';
import { useAuth } from '@/hooks/authContext';
import {
  canAssemblerTransition,
  getAssemblerAssignments,
  listItemAssemblerAssignments,
  mapAddressLink,
  mapTelLink,
} from '@/services/projects/assembler.service';
import {
  filterAttachmentsByRole,
  listAttachments,
  uploadAttachment,
} from '@/services/projects/attachment.service';
import { useAppUser } from '@/services/projects/users.service';
import {
  AssemblerAssignment,
  Attachment,
  ProjectItemStatus,
} from '@/types/projects';
import { isModel3DAttachment } from '@/utils/projects/attachments';
import {
  canAccessRoles,
  isAdmin,
} from '@/utils/projects/permissions';

const ASSEMBLER_FLOW: ProjectItemStatus[] = [
  'em_producao',
  'pronto_para_montagem',
  'montagem_concluida',
];

function nextAssemblerStatus(
  status: ProjectItemStatus | undefined,
): ProjectItemStatus | null {
  if (!status) return null;
  const index = ASSEMBLER_FLOW.indexOf(status);
  if (index < 0 || index >= ASSEMBLER_FLOW.length - 1) return null;
  const next = ASSEMBLER_FLOW[index + 1];
  return canAssemblerTransition(status, next) ? next : null;
}

export default function AssemblerItemPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: appUser, isLoading: isUserLoading } = useAppUser();
  const projectId = String(router.query.projectId ?? '');
  const itemId = String(router.query.itemId ?? '');

  const [assignment, setAssignment] =
    React.useState<AssemblerAssignment | null>(null);
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    if (!user?.uid || !appUser || !projectId || !itemId) return;
    setIsLoading(true);
    setError(null);
    try {
      const assignments = isAdmin(appUser.roles)
        ? await listItemAssemblerAssignments(projectId, itemId)
        : await getAssemblerAssignments(user.uid);
      const current = assignments.find(
        item =>
          item.projectId === projectId &&
          item.itemId === itemId &&
          (isAdmin(appUser.roles) || item.assemblerId === user.uid),
      );
      if (!current) {
        setAssignment(null);
        setError(
          isAdmin(appUser.roles)
            ? 'Nenhum montador atribuido a este item.'
            : 'Item nao atribuido a este montador.',
        );
        return;
      }
      setAssignment(current);
      const itemAttachments = await listAttachments(projectId, itemId);
      setAttachments(filterAttachmentsByRole(itemAttachments, appUser.roles));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar item.');
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    if (user === null) {
      void router.push('/login');
      return;
    }
    void load();
  }, [appUser, user, projectId, itemId]);

  async function advanceStatus() {
    if (!assignment?.itemStatus || !user?.uid) return;
    const next = nextAssemblerStatus(assignment.itemStatus);
    if (!next) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/assembler/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, itemId, nextStatus: next }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'Erro ao atualizar etapa.');
      }
      setAssignment({ ...assignment, itemStatus: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar etapa.');
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!user?.uid || files.length === 0) return;

    setIsSaving(true);
    setError(null);
    try {
      await Promise.all(
        files.map(file =>
          uploadAttachment({
            projectId,
            itemId,
            file,
            category: 'montagem',
            visibility: 'assembler',
            uploadedBy: user.uid,
            uploadedByName: appUser?.name,
            uploadedByRole: 'assembler',
          }),
        ),
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar fotos.');
    } finally {
      setIsSaving(false);
    }
  }

  if (user === undefined || isUserLoading || isLoading) {
    return <Loader />;
  }

  if (!appUser || !canAccessRoles(appUser.roles, ['assembler'])) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="app.canvas" p={4}>
        <Text fontWeight="700">Acesso restrito a montadores.</Text>
      </Flex>
    );
  }

  const admin = isAdmin(appUser.roles);
  const phoneLink = mapTelLink(assignment?.customerPhone);
  const addressLink = mapAddressLink(assignment?.customerAddress);
  const next = nextAssemblerStatus(assignment?.itemStatus);
  const modelAttachments = attachments.filter(isModel3DAttachment);
  const documentAttachments = attachments.filter(
    attachment => !modelAttachments.includes(attachment),
  );

  return (
    <>
      <Head>
        <title>Item do Montador | JRM Compensados</title>
      </Head>
      <Box minH="100vh" bg="app.canvas" p={{ base: 4, md: 8 }}>
        <VStack align="stretch" gap={4} maxW="760px" mx="auto">
          <Button
            alignSelf="flex-start"
            variant="outline"
            borderColor="app.borderStrong"
            color="app.text"
            rounded="lg"
            _hover={{ bg: 'app.sunken' }}
            _focusVisible={{ shadow: 'focus', outline: 'none' }}
            onClick={() => {
              void router.push('/montador');
            }}
          >
            Voltar
          </Button>

          {error ? (
            <Box
              bg="red.50"
              borderRadius="12px"
              border="1px solid"
              borderColor="red.200"
              p={4}
            >
              <Text color="red.700">{error}</Text>
            </Box>
          ) : null}

          {assignment ? (
            <AppCard>
              <VStack align="stretch" gap={4}>
                <Box>
                  <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="600">
                    {assignment.itemName ?? 'Item de montagem'}
                  </Heading>
                  <Text color="app.textSecondary">{assignment.customerName}</Text>
                </Box>

                <Stack direction={{ base: 'column', md: 'row' }} gap={3}>
                  {phoneLink ? (
                    <Button
                      asChild
                      bg="app.ink"
                      color="white"
                      rounded="lg"
                      fontWeight="600"
                      _hover={{ bg: 'app.inkHover' }}
                      _focusVisible={{ shadow: 'focus', outline: 'none' }}
                    >
                      <Link href={phoneLink}>Ligar para cliente</Link>
                    </Button>
                  ) : null}
                  {addressLink ? (
                    <Button
                      asChild
                      variant="outline"
                      borderColor="app.borderStrong"
                      color="app.text"
                      rounded="lg"
                      _hover={{ bg: 'app.sunken' }}
                      _focusVisible={{ shadow: 'focus', outline: 'none' }}
                    >
                      <Link href={addressLink} target="_blank" rel="noreferrer">
                        Abrir mapa
                      </Link>
                    </Button>
                  ) : null}
                </Stack>

                <Box>
                  <Text color="app.textSecondary">Endereço</Text>
                  <Text fontWeight="600" color="app.text">
                    {assignment.customerAddress ?? 'Nao informado'}
                  </Text>
                </Box>

                <Box>
                  <Text color="app.textSecondary" mb={2}>
                    Etapa atual
                  </Text>
                  <StatusPill
                    palette="blue"
                    label={assignment.itemStatus ?? 'Status indisponível'}
                  />
                </Box>

                {!admin && (
                  <Button
                    size="lg"
                    bg="app.ink"
                    color="white"
                    rounded="lg"
                    fontWeight="600"
                    _hover={{ bg: 'app.inkHover' }}
                    _focusVisible={{ shadow: 'focus', outline: 'none' }}
                    disabled={!next || isSaving}
                    loading={isSaving}
                    onClick={() => {
                      void advanceStatus();
                    }}
                  >
                    {next ? `Atualizar etapa para ${next}` : 'Sem próxima etapa'}
                  </Button>
                )}

                <Box>
                  <Text fontWeight="600" color="app.text" mb={2}>
                    Arquivos técnicos
                  </Text>
                  {attachments.length === 0 ? (
                    <EmptyState
                      icon={FiFileText}
                      title="Nenhum arquivo técnico liberado"
                      description="Quando a equipe disponibilizar arquivos deste item, eles aparecem aqui."
                    />
                  ) : (
                    <VStack align="stretch" gap={3}>
                      {modelAttachments.map(attachment =>
                        attachment.downloadUrl ? (
                          <ModelViewerPreview
                            key={attachment.id}
                            compact
                            src={attachment.downloadUrl}
                            fileName={attachment.originalFileName}
                          />
                        ) : null,
                      )}
                      {documentAttachments.map(attachment => (
                        <Link
                          key={attachment.id}
                          href={attachment.downloadUrl}
                          color="app.accentEmphasis"
                          target="_blank"
                          rel="noreferrer"
                          fontWeight="600"
                        >
                          {attachment.originalFileName}
                        </Link>
                      ))}
                    </VStack>
                  )}
                </Box>

                {!admin && (
                  <Box>
                    <Text fontWeight="600" color="app.text" mb={2}>
                      Fotos da montagem
                    </Text>
                    <Input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      bg="app.surface"
                      borderColor="app.borderStrong"
                      rounded="lg"
                      _focusVisible={{
                        borderColor: 'app.accent',
                        shadow: 'focus',
                        outline: 'none',
                      }}
                      onChange={event => {
                        void uploadPhotos(event);
                      }}
                    />
                  </Box>
                )}
              </VStack>
            </AppCard>
          ) : null}
        </VStack>
      </Box>
    </>
  );
}
