import { Alert, Button, HStack, Skeleton, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import React from 'react';

import { ClientLayout } from '@/components/client/ClientLayout';
import { ClientTrackingTimeline } from '@/components/client/ClientTrackingTimeline';
import { AppCard } from '@/components/ui/card';
import { ClientProjectDTO } from '@/types/projects';

async function fetchClientProject(): Promise<ClientProjectDTO> {
  const response = await fetch('/api/client-access/project');
  const data = (await response.json()) as ClientProjectDTO & { error?: string };
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
    void load();
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
          <Button
            variant="outline"
            borderColor="app.borderStrong"
            color="app.text"
            rounded="lg"
            _hover={{ bg: 'app.sunken' }}
            _focusVisible={{ shadow: 'focus', outline: 'none' }}
            onClick={() => {
              void router.push(`/cliente/${publicId}`);
            }}
          >
            Voltar para aprovação
          </Button>
        </HStack>

        {isLoading ? (
          <AppCard>
            <VStack align="stretch" gap={4}>
              <Skeleton h="28px" rounded="md" />
              <Skeleton h="18px" w="60%" rounded="md" />
              <Skeleton h="220px" rounded="xl" />
            </VStack>
          </AppCard>
        ) : null}

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

        {!isLoading && project ? <ClientTrackingTimeline project={project} /> : null}
      </VStack>
    </ClientLayout>
  );
}
