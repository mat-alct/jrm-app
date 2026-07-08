import {
  Badge,
  Box,
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

import { Loader } from '@/components/Loader';
import { useAuth } from '@/hooks/authContext';
import { useAppUser } from '@/services/projects/users.service';
import {
  getAssemblerAssignments,
  sortAssignmentsByDueDate,
} from '@/services/projects/assembler.service';
import { AssemblerAssignment } from '@/types/projects';

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
      router.push('/login');
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
    load();
  }, [router, user]);

  if (user === undefined || isUserLoading || isLoading) {
    return <Loader />;
  }

  if (!appUser?.roles.includes('assembler')) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="gray.50" p={4}>
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
      <Box minH="100vh" bg="gray.50" p={{ base: 4, md: 8 }}>
        <VStack align="stretch" gap={5} maxW="980px" mx="auto">
          <Box>
            <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }}>
              Minha montagem
            </Heading>
            <Text color="gray.600">Itens atribuídos para execução.</Text>
          </Box>

          {error ? (
            <Box bg="red.50" borderRadius="8px" p={4}>
              <Text color="red.700">{error}</Text>
            </Box>
          ) : null}

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            {orderedAssignments.map(assignment => (
              <Box
                key={assignment.id}
                bg="white"
                border="1px solid"
                borderColor="gray.100"
                borderRadius="8px"
                boxShadow="sm"
                p={4}
              >
                <VStack align="stretch" gap={3}>
                  <Flex justify="space-between" gap={3}>
                    <Box>
                      <Text fontSize="lg" fontWeight="900">
                        {assignment.customerName ?? 'Cliente'}
                      </Text>
                      <Text color="gray.600">
                        {assignment.itemEnvironment ?? 'Ambiente'}
                      </Text>
                    </Box>
                    {isLate(assignment) ? (
                      <Badge colorPalette="red">Atrasado</Badge>
                    ) : (
                      <Badge colorPalette="green">No prazo</Badge>
                    )}
                  </Flex>

                  <Text fontWeight="700">
                    {assignment.itemName ?? 'Item de montagem'}
                  </Text>
                  <Flex justify="space-between" gap={3}>
                    <Text color="gray.600">Status</Text>
                    <Text fontWeight="700">{assignment.itemStatus}</Text>
                  </Flex>
                  <Flex justify="space-between" gap={3}>
                    <Text color="gray.600">Prazo</Text>
                    <Text fontWeight="700">
                      {assignment.dueAt
                        ? assignment.dueAt.toDate().toLocaleDateString('pt-BR')
                        : 'Sem prazo'}
                    </Text>
                  </Flex>
                  <Flex justify="space-between" gap={3}>
                    <Text color="gray.600">A receber</Text>
                    <Text fontWeight="900">
                      {formatCurrency(assignment.amountToReceive)}
                    </Text>
                  </Flex>
                  <Button
                    bgColor="orange.500"
                    color="white"
                    _hover={{ bgColor: 'orange.400' }}
                    onClick={() =>
                      router.push(
                        `/montador/item/${assignment.projectId}/${assignment.itemId}`,
                      )
                    }
                  >
                    Abrir item
                  </Button>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </VStack>
      </Box>
    </>
  );
}
