import {
  Button,
  Field,
  Heading,
  Input,
  Text,
  VStack,
  chakra,
} from '@chakra-ui/react';
import React from 'react';

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
      bg="white"
      border="1px solid"
      borderColor="gray.100"
      borderRadius="8px"
      boxShadow="sm"
      maxW="420px"
      mx="auto"
      p={{ base: 5, md: 7 }}
      w="100%"
      onSubmit={handleSubmit}
    >
      <VStack align="stretch" gap={4}>
        <Heading as="h1" fontSize="2xl">
          Acesso ao projeto
        </Heading>
        <Text color="gray.600">
          Informe a senha enviada pela equipe para consultar e aprovar os itens.
        </Text>
        <Field.Root invalid={Boolean(error)}>
          <Field.Label>Senha de acesso</Field.Label>
          <Input
            value={accessCode}
            onChange={event => setAccessCode(event.target.value)}
            autoComplete="one-time-code"
            maxLength={12}
            placeholder="Ex.: A2B3C4"
            textTransform="uppercase"
          />
          {error ? <Field.ErrorText>{error}</Field.ErrorText> : null}
        </Field.Root>
        {error?.toLowerCase().includes('expirado') ? (
          <Text color="gray.600" fontSize="sm">
            Entre em contato com a loja para liberar um novo acesso.
          </Text>
        ) : null}
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={!accessCode.trim()}
          bgColor="orange.500"
          color="white"
          _hover={{ bgColor: 'orange.400' }}
        >
          Entrar
        </Button>
      </VStack>
    </chakra.form>
  );
}
