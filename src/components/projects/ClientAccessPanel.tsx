import { Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import React from 'react';

import { AppCard } from '@/components/ui/card';

interface ProvisionResponse {
  publicId: string;
  accessCode: string;
}

interface ClientAccessPanelProps {
  projectId: string;
  baseUrl?: string;
  expiresAt?: string;
}

export function ClientAccessPanel({
  projectId,
  baseUrl,
  expiresAt,
}: ClientAccessPanelProps) {
  const [credentials, setCredentials] = React.useState<ProvisionResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const origin =
    baseUrl ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  const clientLink = credentials
    ? `${origin}/cliente/${credentials.publicId}`
    : '';

  async function provisionAccess() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/client-access/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = (await response.json()) as ProvisionResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'Nao foi possivel gerar o acesso.');
      }
      setCredentials(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  }

  async function copyLink() {
    if (!clientLink || !navigator.clipboard) return;
    await navigator.clipboard.writeText(clientLink);
  }

  return (
    <AppCard>
      <VStack align="stretch" gap={3}>
        <Flex justify="space-between" gap={3} align="center">
          <Heading as="h2" fontSize="lg" fontWeight="600" color="app.text">
            Acesso do cliente
          </Heading>
          <Button
            size="sm"
            loading={isLoading}
            bg="app.ink"
            color="white"
            rounded="lg"
            fontWeight="600"
            _hover={{ bg: 'app.inkHover' }}
            _focusVisible={{ shadow: 'focus', outline: 'none' }}
            onClick={() => {
              void provisionAccess();
            }}
          >
            {credentials ? 'Regenerar senha' : 'Gerar senha'}
          </Button>
        </Flex>

        {credentials ? (
          <Box>
            <Text color="app.textSecondary" fontSize="sm">
              Link
            </Text>
            <Text fontWeight="600" wordBreak="break-all" color="app.text">
              {clientLink}
            </Text>
            <Text color="app.textSecondary" fontSize="sm" mt={2}>
              Senha exibida uma vez
            </Text>
            <Text
              fontSize="2xl"
              fontWeight="600"
              color="app.text"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {credentials.accessCode}
            </Text>
            {expiresAt ? (
              <>
                <Text color="app.textSecondary" fontSize="sm" mt={2}>
                  Validade
                </Text>
                <Text fontWeight="600" color="app.text">
                  {new Date(expiresAt).toLocaleDateString('pt-BR')}
                </Text>
              </>
            ) : null}
            <Button
              mt={3}
              size="sm"
              variant="outline"
              borderColor="app.borderStrong"
              color="app.text"
              rounded="lg"
              _hover={{ bg: 'app.sunken' }}
              _focusVisible={{ shadow: 'focus', outline: 'none' }}
              onClick={() => {
                void copyLink();
              }}
            >
              Copiar link
            </Button>
          </Box>
        ) : null}

        {error ? (
          <Text color="red.600" fontSize="sm">
            {error}
          </Text>
        ) : null}
      </VStack>
    </AppCard>
  );
}
