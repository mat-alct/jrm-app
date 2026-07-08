import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import Head from 'next/head';
import React from 'react';

import { AssemblerFinanceSummary } from '@/components/assembler/AssemblerFinanceSummary';
import { AssemblerPaymentHistory } from '@/components/assembler/AssemblerPaymentHistory';
import { Loader } from '@/components/Loader';
import { useAuth } from '@/hooks/authContext';
import { getAssemblerAssignments } from '@/services/projects/assembler.service';
import { listAssemblerPayments } from '@/services/projects/payment.service';
import { useAppUser } from '@/services/projects/users.service';
import { AssemblerAssignment, AssemblerPayment } from '@/types/projects';

export default function AssemblerFinancePage() {
  const { user } = useAuth();
  const { data: appUser, isLoading: isUserLoading } = useAppUser();
  const [assignments, setAssignments] = React.useState<AssemblerAssignment[]>([]);
  const [payments, setPayments] = React.useState<AssemblerPayment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    if (!user?.uid) return;
    setIsLoading(true);
    setError(null);
    try {
      const [assignmentData, paymentData] = await Promise.all([
        getAssemblerAssignments(user.uid),
        listAssemblerPayments(user.uid),
      ]);
      setAssignments(assignmentData);
      setPayments(paymentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar financeiro.');
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, [user?.uid]);

  async function confirmPayment(paymentId: string) {
    if (!appUser) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/assembler/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Erro ao confirmar recebimento.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar recebimento.');
    } finally {
      setIsSaving(false);
    }
  }

  if (user === undefined || isUserLoading || isLoading) {
    return <Loader />;
  }

  if (!appUser?.roles.includes('assembler')) {
    return (
      <Box minH="100vh" bg="gray.50" p={6}>
        <Text fontWeight="700">Acesso restrito a montadores.</Text>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Financeiro do Montador | JRM Compensados</title>
      </Head>
      <Box minH="100vh" bg="gray.50" p={{ base: 4, md: 8 }}>
        <VStack align="stretch" gap={5} maxW="760px" mx="auto">
          <Box>
            <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }}>
              Meu financeiro
            </Heading>
            <Text color="gray.600">Valores pendentes e pagamentos recebidos.</Text>
          </Box>

          {error ? (
            <Box bg="red.50" borderRadius="8px" p={4}>
              <Text color="red.700">{error}</Text>
            </Box>
          ) : null}

          <AssemblerFinanceSummary assignments={assignments} />
          <AssemblerPaymentHistory
            payments={payments}
            isBusy={isSaving}
            onConfirm={confirmPayment}
          />
        </VStack>
      </Box>
    </>
  );
}
