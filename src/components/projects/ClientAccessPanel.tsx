import { Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import React from 'react';

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
      const data = await response.json();
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
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.100"
      borderRadius="8px"
      p={4}
    >
      <VStack align="stretch" gap={3}>
        <Flex justify="space-between" gap={3} align="center">
          <Heading as="h2" fontSize="lg">
            Acesso do cliente
          </Heading>
          <Button size="sm" loading={isLoading} onClick={provisionAccess}>
            {credentials ? 'Regenerar senha' : 'Gerar senha'}
          </Button>
        </Flex>

        {credentials ? (
          <Box>
            <Text color="gray.600" fontSize="sm">
              Link
            </Text>
            <Text fontWeight="700" wordBreak="break-all">
              {clientLink}
            </Text>
            <Text color="gray.600" fontSize="sm" mt={2}>
              Senha exibida uma vez
            </Text>
            <Text fontSize="2xl" fontWeight="900">
              {credentials.accessCode}
            </Text>
            {expiresAt ? (
              <>
                <Text color="gray.600" fontSize="sm" mt={2}>
                  Validade
                </Text>
                <Text fontWeight="700">
                  {new Date(expiresAt).toLocaleDateString('pt-BR')}
                </Text>
              </>
            ) : null}
            <Button mt={3} size="sm" variant="outline" onClick={copyLink}>
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
    </Box>
  );
}
