import {
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { FiClipboard } from 'react-icons/fi';

import { Dashboard } from '@/components/Dashboard';
import { Header } from '@/components/Dashboard/Content/Header';
import { Loader } from '@/components/Loader';
import { AppCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusPill } from '@/components/ui/status-pill';
import { useAuth } from '@/hooks/authContext';
import {
  getAssemblerAssignments,
  sortAssignmentsByDueDate,
} from '@/services/projects/assembler.service';
import { useAppUser } from '@/services/projects/users.service';
import { AssemblerAssignment } from '@/types/projects';
import { canAccessRoles } from '@/utils/projects/permissions';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function isLate(assignment: AssemblerAssignment): boolean {
  return Boolean(
    assignment.dueAt && assignment.dueAt.toDate().getTime() < Date.now(),
  );
}

export default function AssemblerHomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: appUser, isLoading: isUserLoading } = useAppUser();
  const [assignments, setAssignments] = React.useState<AssemblerAssignment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user === null) {
      void router.push('/login');
      return;
    }
    if (!user?.uid) return;

    async function load() {
      try {
        setIsLoading(true);
        setAssignments(await getAssemblerAssignments(user!.uid));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar fila.');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [router, user]);

  if (user === undefined || isUserLoading || isLoading) {
    return <Loader />;
  }

  if (!canAccessRoles(appUser?.roles, ['assembler'])) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="app.canvas" p={4}>
        <Text fontWeight="700">Acesso restrito a montadores.</Text>
      </Flex>
    );
  }

  const orderedAssignments = sortAssignmentsByDueDate(assignments);

  return (
    <>
      <Head>
        <title>Montador | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Minha montagem" />
        <VStack align="stretch" gap={5} maxW="980px" mx="auto">
          <VStack align="stretch" gap={1}>
            <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="600">
              Minha montagem
            </Heading>
            <Text color="app.textSecondary">Itens atribuídos para execução.</Text>
          </VStack>

          {error ? (
            <AppCard bg="red.50" borderColor="red.200">
              <Text color="red.700">{error}</Text>
            </AppCard>
          ) : null}

          {orderedAssignments.length === 0 ? (
            <AppCard>
              <EmptyState
                icon={FiClipboard}
                title="Nenhum item atribuído"
                description="Os itens liberados para montagem aparecem aqui, ordenados por prazo."
              />
            </AppCard>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {orderedAssignments.map(assignment => (
                <AppCard key={assignment.id} interactive>
                <VStack align="stretch" gap={3}>
                  <Flex justify="space-between" gap={3}>
                    <VStack align="stretch" gap={1}>
                      <Text fontSize="lg" fontWeight="600" color="app.text">
                        {assignment.customerName ?? 'Cliente'}
                      </Text>
                      <Text color="app.textSecondary">
                        {assignment.itemEnvironment ?? 'Ambiente'}
                      </Text>
                    </VStack>
                    <StatusPill
                      palette={isLate(assignment) ? 'red' : 'green'}
                      label={isLate(assignment) ? 'Atrasado' : 'No prazo'}
                    />
                  </Flex>

                  <Text fontWeight="600" color="app.text">
                    {assignment.itemName ?? 'Item de montagem'}
                  </Text>
                  <Flex justify="space-between" gap={3}>
                    <Text color="app.textSecondary">Status</Text>
                    <Text fontWeight="600" color="app.text">
                      {assignment.itemStatus}
                    </Text>
                  </Flex>
                  <Flex justify="space-between" gap={3}>
                    <Text color="app.textSecondary">Prazo</Text>
                    <Text fontWeight="600" color="app.text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {assignment.dueAt
                        ? assignment.dueAt.toDate().toLocaleDateString('pt-BR')
                        : 'Sem prazo'}
                    </Text>
                  </Flex>
                  <Flex justify="space-between" gap={3}>
                    <Text color="app.textSecondary">A receber</Text>
                    <Text
                      fontWeight="600"
                      color="app.text"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatCurrency(assignment.amountToReceive)}
                    </Text>
                  </Flex>
                  <Button
                    bg="app.ink"
                    color="white"
                    rounded="lg"
                    fontWeight="600"
                    _hover={{ bg: 'app.inkHover' }}
                    _focusVisible={{ shadow: 'focus', outline: 'none' }}
                    onClick={() => {
                      void router.push(
                        `/montador/item/${assignment.projectId}/${assignment.itemId}`,
                      );
                    }}
                  >
                    Abrir item
                  </Button>
                </VStack>
                </AppCard>
              ))}
            </SimpleGrid>
          )}
        </VStack>
      </Dashboard>
    </>
  );
}
