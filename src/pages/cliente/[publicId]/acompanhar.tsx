import { Alert, Button, HStack, Spinner, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import React from 'react';

import { ClientLayout } from '@/components/client/ClientLayout';
import { ClientTrackingTimeline } from '@/components/client/ClientTrackingTimeline';
import { ClientProjectDTO } from '@/types/projects';

async function fetchClientProject(): Promise<ClientProjectDTO> {
  const response = await fetch('/api/client-access/project');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Nao foi possivel carregar o projeto.');
  }
  return data;
}

export default function ClientTrackingPage() {
  const router = useRouter();
  const publicId = String(router.query.publicId ?? '');
  const [project, setProject] = React.useState<ClientProjectDTO | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await fetchClientProject();
        if (active) setProject(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Erro inesperado.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <ClientLayout
      contactPhone={project?.sellerContactPhone}
      title="Acompanhamento | JRM Compensados"
    >
      <VStack align="stretch" gap={4}>
        <HStack justify="space-between" gap={3} wrap="wrap">
          <Button variant="outline" onClick={() => router.push(`/cliente/${publicId}`)}>
            Voltar para aprovação
          </Button>
        </HStack>

        {isLoading ? <Spinner alignSelf="center" /> : null}

        {error ? (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{error}</Alert.Title>
              <Alert.Description>
                Entre em contato com a loja se o acesso estiver expirado.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : null}

        {project ? <ClientTrackingTimeline project={project} /> : null}
      </VStack>
    </ClientLayout>
  );
}
