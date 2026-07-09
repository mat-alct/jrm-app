import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import React from 'react';

import { ClientProjectDTO } from '@/types/projects';

interface ClientTrackingTimelineProps {
  project: ClientProjectDTO;
}

const STEPS = [
  'Projeto em preparação',
  'Projeto em desenvolvimento',
  'Orçamento em preparação',
  'Aguardando sua aprovação',
  'Projeto aprovado',
  'Em produção',
  'Montagem concluída',
  'Finalizado',
];

function activeStepIndex(project: ClientProjectDTO): number {
  const labels = project.items.map(item => item.clientStatusLabel);
  const indexes = labels
    .map(label => STEPS.indexOf(label))
    .filter(index => index >= 0);
  return indexes.length ? Math.min(...indexes) : 0;
}

export function ClientTrackingTimeline({ project }: ClientTrackingTimelineProps) {
  const activeIndex = activeStepIndex(project);
  const nextDate = project.items
    .map(item => item.estimatedDeliveryDate)
    .filter(Boolean)
    .sort()[0];

  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.100"
      borderRadius="8px"
      boxShadow="sm"
      p={{ base: 4, md: 6 }}
    >
      <VStack align="stretch" gap={5}>
        <Box>
          <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }}>
            Acompanhamento
          </Heading>
          <Text color="gray.600">{project.customerName}</Text>
          {nextDate ? (
            <Text color="gray.700" fontWeight="700" mt={2}>
              Próxima previsão: {new Date(nextDate).toLocaleDateString('pt-BR')}
            </Text>
          ) : null}
        </Box>

        <VStack align="stretch" gap={0}>
          {STEPS.map((step, index) => {
            const isDone = index < activeIndex;
            const isActive = index === activeIndex;
            return (
              <Flex key={step} gap={3} align="flex-start">
                <VStack gap={0} minW="28px">
                  <Box
                    aria-label={isActive ? 'Etapa atual' : undefined}
                    bg={isDone || isActive ? 'orange.500' : 'gray.200'}
                    borderRadius="999px"
                    h="14px"
                    mt="5px"
                    w="14px"
                  />
                  {index < STEPS.length - 1 ? (
                    <Box bg="gray.200" h="34px" w="2px" />
                  ) : null}
                </VStack>
                <Box pb={4}>
                  <Text
                    fontWeight={isActive ? '900' : '700'}
                    color={isDone || isActive ? 'gray.900' : 'gray.500'}
                  >
                    {step}
                  </Text>
                </Box>
              </Flex>
            );
          })}
        </VStack>
      </VStack>
    </Box>
  );
}
