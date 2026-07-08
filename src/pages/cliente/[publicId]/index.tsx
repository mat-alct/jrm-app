import { Alert, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import React from 'react';

import { ClientLayout } from '@/components/client/ClientLayout';
import { ClientLoginWithCode } from '@/components/client/ClientLoginWithCode';
import { ClientProjectView } from '@/components/client/ClientProjectView';
import { ClientProjectDTO } from '@/types/projects';

async function fetchClientProject(): Promise<ClientProjectDTO> {
  const response = await fetch('/api/client-access/project');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Nao foi possivel carregar o projeto.');
  }
  return data;
}

export default function ClientPortalPage() {
  const router = useRouter();
  const publicId = String(router.query.publicId ?? '');
  const [project, setProject] = React.useState<ClientProjectDTO | null>(null);
  const [loginError, setLoginError] = React.useState<string | undefined>();
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isActionBusy, setIsActionBusy] = React.useState(false);

  async function loadProject() {
    setPageError(null);
    setProject(await fetchClientProject());
  }

  async function handleLogin(accessCode: string) {
    setIsLoading(true);
    setLoginError(undefined);
    setPageError(null);
    try {
      const response = await fetch('/api/client-access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId, accessCode }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Senha incorreta.');
      }
      await loadProject();
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : 'Nao foi possivel validar a senha.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function runAction(path: string, body?: Record<string, string>) {
    setIsActionBusy(true);
    setPageError(null);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Nao foi possivel executar a acao.');
      }
      await loadProject();
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setIsActionBusy(false);
    }
  }

  const isCompleted =
    project?.items.length &&
    project.items.every(item => item.clientStatusLabel === 'Finalizado');

  return (
    <ClientLayout
      contactPhone={project?.sellerContactPhone}
      title="Aprovação do Projeto | JRM Compensados"
    >
      {!project ? (
        <ClientLoginWithCode
          error={loginError}
          isSubmitting={isLoading}
          onSubmit={handleLogin}
        />
      ) : (
        <VStack align="stretch" gap={4}>
          <HStack justify="space-between" gap={3} wrap="wrap">
            <Button
              variant="outline"
              onClick={() => router.push(`/cliente/${publicId}/acompanhar`)}
            >
              Acompanhar andamento
            </Button>
          </HStack>

          {pageError ? (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{pageError}</Alert.Title>
                {pageError.toLowerCase().includes('expirado') ? (
                  <Alert.Description>
                    Entre em contato com a loja para liberar um novo acesso.
                  </Alert.Description>
                ) : null}
              </Alert.Content>
            </Alert.Root>
          ) : null}

          {isCompleted ? (
            <Alert.Root status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Projeto concluído</Alert.Title>
                <Alert.Description>
                  Todos os itens deste projeto foram finalizados.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}

          <ClientProjectView
            project={project}
            isBusy={isActionBusy}
            onApproveAll={() => runAction('/api/client-access/approve-all')}
            onApproveItem={itemId =>
              runAction('/api/client-access/approve-item', { itemId })
            }
            onRejectItem={itemId =>
              runAction('/api/client-access/reject-item', { itemId })
            }
            onRequestChange={itemId =>
              runAction('/api/client-access/request-change', { itemId })
            }
          />
          <Text color="gray.600" fontSize="sm">
            Após aprovar um item, recusas e alterações passam a ser tratadas pela
            equipe interna.
          </Text>
        </VStack>
      )}
    </ClientLayout>
  );
}
