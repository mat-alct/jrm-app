import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import Head from 'next/head';
import React from 'react';

import { AssemblerPaymentsTable } from '@/components/admin/AssemblerPaymentsTable';
import { Loader } from '@/components/Loader';
import { useAppUser } from '@/services/projects/users.service';
import {
  aggregatePendingByAssembler,
  createAssemblerPayment,
  listAssemblerPayments,
  listPendingAssemblerAssignments,
} from '@/services/projects/payment.service';
import { AssemblerAssignment, AssemblerPayment } from '@/types/projects';

export default function AdminAssemblerFinancePage() {
  const { data: appUser, isLoading: isUserLoading } = useAppUser();
  const [assignments, setAssignments] = React.useState<AssemblerAssignment[]>([]);
  const [payments, setPayments] = React.useState<AssemblerPayment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [pending, history] = await Promise.all([
        listPendingAssemblerAssignments(),
        listAssemblerPayments(),
      ]);
      setAssignments(pending);
      setPayments(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar financeiro.');
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function payAssignment(
    projectId: string,
    itemId: string,
    assignmentId: string,
    proofFile: File,
  ) {
    if (!appUser) return;
    setIsSaving(true);
    setError(null);
    try {
      await createAssemblerPayment(
        { projectId, itemId, assignmentId, proofFile, paidBy: appUser.id },
        { id: appUser.id, roles: appUser.roles },
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar pagamento.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isUserLoading || isLoading) {
    return <Loader />;
  }

  if (!appUser?.roles.includes('admin')) {
    return (
      <Box minH="100vh" bg="gray.50" p={6}>
        <Text fontWeight="700">Acesso restrito a administradores.</Text>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Financeiro Montadores | JRM Compensados</title>
      </Head>
      <Box minH="100vh" bg="gray.50" p={{ base: 4, md: 8 }}>
        <VStack align="stretch" gap={5} maxW="1100px" mx="auto">
          <Box>
            <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }}>
              Financeiro dos montadores
            </Heading>
            <Text color="gray.600">Pendências liberadas e histórico.</Text>
          </Box>

          {error ? (
            <Box bg="red.50" borderRadius="8px" p={4}>
              <Text color="red.700">{error}</Text>
            </Box>
          ) : null}

          <AssemblerPaymentsTable
            groups={aggregatePendingByAssembler(assignments)}
            isBusy={isSaving}
            onPay={payAssignment}
          />

          <Box bg="white" borderRadius="8px" boxShadow="sm" p={4}>
            <Text fontSize="lg" fontWeight="800" mb={3}>
              Histórico
            </Text>
            {payments.length === 0 ? (
              <Text color="gray.600">Nenhum pagamento registrado.</Text>
            ) : (
              <VStack align="stretch" gap={2}>
                {payments.map(payment => (
                  <Text key={payment.id}>
                    {payment.assemblerName ?? payment.assemblerId} · R${' '}
                    {payment.amount.toFixed(2)} · {payment.status}
                  </Text>
                ))}
              </VStack>
            )}
          </Box>
        </VStack>
      </Box>
    </>
  );
}
