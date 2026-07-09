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

import { Loader } from '@/components/Loader';
import { useAuth } from '@/hooks/authContext';
import { uploadAttachment, listAttachments } from '@/services/projects/attachment.service';
import {
  canAssemblerTransition,
  getAssemblerAssignments,
  mapAddressLink,
  mapTelLink,
} from '@/services/projects/assembler.service';
import { useAppUser } from '@/services/projects/users.service';
import {
  AssemblerAssignment,
  Attachment,
  ProjectItemStatus,
} from '@/types/projects';

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
    if (!user?.uid || !projectId || !itemId) return;
    setIsLoading(true);
    setError(null);
    try {
      const assignments = await getAssemblerAssignments(user.uid);
      const current = assignments.find(
        item => item.projectId === projectId && item.itemId === itemId,
      );
      if (!current) {
        setAssignment(null);
        setError('Item nao atribuido a este montador.');
        return;
      }
      setAssignment(current);
      const itemAttachments = await listAttachments(projectId, itemId);
      setAttachments(
        itemAttachments.filter(
          attachment => attachment.visibility === 'assembler',
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar item.');
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    if (user === null) {
      router.push('/login');
      return;
    }
    load();
  }, [user, projectId, itemId]);

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
      const data = await response.json();
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

  if (!appUser?.roles.includes('assembler')) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="gray.50" p={4}>
        <Text fontWeight="700">Acesso restrito a montadores.</Text>
      </Flex>
    );
  }

  const phoneLink = mapTelLink(assignment?.customerPhone);
  const addressLink = mapAddressLink(assignment?.customerAddress);
  const next = nextAssemblerStatus(assignment?.itemStatus);

  return (
    <>
      <Head>
        <title>Item do Montador | JRM Compensados</title>
      </Head>
      <Box minH="100vh" bg="gray.50" p={{ base: 4, md: 8 }}>
        <VStack align="stretch" gap={4} maxW="760px" mx="auto">
          <Button alignSelf="flex-start" variant="outline" onClick={() => router.push('/montador')}>
            Voltar
          </Button>

          {error ? (
            <Box bg="red.50" borderRadius="8px" p={4}>
              <Text color="red.700">{error}</Text>
            </Box>
          ) : null}

          {assignment ? (
            <Box bg="white" borderRadius="8px" boxShadow="sm" p={5}>
              <VStack align="stretch" gap={4}>
                <Box>
                  <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }}>
                    {assignment.itemName ?? 'Item de montagem'}
                  </Heading>
                  <Text color="gray.600">{assignment.customerName}</Text>
                </Box>

                <Stack direction={{ base: 'column', md: 'row' }} gap={3}>
                  {phoneLink ? (
                    <Button asChild bgColor="orange.500" color="white">
                      <Link href={phoneLink}>Ligar para cliente</Link>
                    </Button>
                  ) : null}
                  {addressLink ? (
                    <Button asChild variant="outline">
                      <Link href={addressLink} target="_blank" rel="noreferrer">
                        Abrir mapa
                      </Link>
                    </Button>
                  ) : null}
                </Stack>

                <Box>
                  <Text color="gray.600">Endereço</Text>
                  <Text fontWeight="700">
                    {assignment.customerAddress ?? 'Nao informado'}
                  </Text>
                </Box>

                <Box>
                  <Text color="gray.600">Etapa atual</Text>
                  <Text fontSize="xl" fontWeight="900">
                    {assignment.itemStatus}
                  </Text>
                </Box>

                <Button
                  size="lg"
                  bgColor="orange.500"
                  color="white"
                  _hover={{ bgColor: 'orange.400' }}
                  disabled={!next || isSaving}
                  loading={isSaving}
                  onClick={advanceStatus}
                >
                  {next ? `Atualizar etapa para ${next}` : 'Sem próxima etapa'}
                </Button>

                <Box>
                  <Text fontWeight="800" mb={2}>
                    Arquivos técnicos
                  </Text>
                  {attachments.length === 0 ? (
                    <Text color="gray.600">Nenhum arquivo técnico liberado.</Text>
                  ) : (
                    <VStack align="stretch" gap={2}>
                      {attachments.map(attachment => (
                        <Link
                          key={attachment.id}
                          href={attachment.downloadUrl}
                          color="orange.500"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {attachment.originalFileName}
                        </Link>
                      ))}
                    </VStack>
                  )}
                </Box>

                <Box>
                  <Text fontWeight="800" mb={2}>
                    Fotos da montagem
                  </Text>
                  <Input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={uploadPhotos}
                  />
                </Box>
              </VStack>
            </Box>
          ) : null}
        </VStack>
      </Box>
    </>
  );
}
