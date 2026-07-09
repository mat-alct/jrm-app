import {
  Button,
  chakra,
  Field,
  Heading,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';
import React from 'react';

import { AppCard } from '@/components/ui/card';

interface ClientLoginWithCodeProps {
  error?: string;
  isSubmitting?: boolean;
  onSubmit: (accessCode: string) => Promise<void> | void;
}

export function ClientLoginWithCode({
  error,
  isSubmitting = false,
  onSubmit,
}: ClientLoginWithCodeProps) {
  const [accessCode, setAccessCode] = React.useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(accessCode.trim().toUpperCase());
  }

  return (
    <chakra.form
      maxW="420px"
      mx="auto"
      w="100%"
      onSubmit={event => {
        void handleSubmit(event);
      }}
    >
      <AppCard>
        <VStack align="stretch" gap={4}>
          <VStack align="stretch" gap={2}>
            <Heading as="h1" fontSize="2xl" fontWeight="600" color="app.text">
              Acesso ao projeto
            </Heading>
            <Text color="app.textSecondary">
              Informe a senha enviada pela equipe para consultar e aprovar os itens.
            </Text>
          </VStack>
          <Field.Root invalid={Boolean(error)}>
            <Field.Label fontSize="13px" fontWeight="500" color="app.textSecondary">
              Senha de acesso
            </Field.Label>
            <Input
              value={accessCode}
              onChange={event => setAccessCode(event.target.value)}
              autoComplete="one-time-code"
              maxLength={12}
              placeholder="Ex.: A2B3C4"
              textTransform="uppercase"
              bg="app.surface"
              borderColor="app.borderStrong"
              rounded="lg"
              _focusVisible={{
                borderColor: 'app.accent',
                shadow: 'focus',
                outline: 'none',
              }}
            />
            {error ? <Field.ErrorText>{error}</Field.ErrorText> : null}
          </Field.Root>
          {error?.toLowerCase().includes('expirado') ? (
            <Text color="app.textMuted" fontSize="sm">
              Entre em contato com a loja para liberar um novo acesso.
            </Text>
          ) : null}
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!accessCode.trim()}
            bg="app.ink"
            color="white"
            rounded="lg"
            fontWeight="600"
            _hover={{ bg: 'app.inkHover' }}
            _focusVisible={{ shadow: 'focus', outline: 'none' }}
          >
            Entrar
          </Button>
        </VStack>
      </AppCard>
    </chakra.form>
  );
}
