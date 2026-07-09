import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { FaCheck, FaRegCalendar } from 'react-icons/fa';

import { AppCard } from '@/components/ui/card';
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
    <AppCard>
      <VStack align="stretch" gap={5}>
        <Box>
          <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="600">
            Acompanhamento
          </Heading>
          <Text color="app.textSecondary">{project.customerName}</Text>
          {nextDate ? (
            <Flex
              mt={3}
              display="inline-flex"
              align="center"
              gap={2}
              px={3}
              py={1.5}
              rounded="full"
              bg="app.accentSubtle"
              color="app.accentEmphasis"
              w="fit-content"
              fontWeight="600"
            >
              <FaRegCalendar size={12} />
              <Text fontSize="sm">
                Próxima previsão: {new Date(nextDate).toLocaleDateString('pt-BR')}
              </Text>
            </Flex>
          ) : null}
        </Box>

        <VStack align="stretch" gap={0}>
          {STEPS.map((step, index) => {
            const isDone = index < activeIndex;
            const isActive = index === activeIndex;
            return (
              <Flex key={step} gap={3} align="flex-start">
                <VStack gap={0} minW="28px">
                  {isDone ? (
                    <Flex
                      aria-label={isActive ? 'Etapa atual' : undefined}
                      align="center"
                      justify="center"
                      bg="app.accent"
                      color="white"
                      borderRadius="999px"
                      h="22px"
                      mt="1px"
                      w="22px"
                    >
                      <FaCheck size={10} />
                    </Flex>
                  ) : isActive ? (
                    <Flex
                      aria-label="Etapa atual"
                      align="center"
                      justify="center"
                      bg="app.surface"
                      borderRadius="999px"
                      borderWidth="2px"
                      borderColor="app.accent"
                      h="22px"
                      mt="1px"
                      w="22px"
                    >
                      <Box w="8px" h="8px" rounded="full" bg="app.accent" />
                    </Flex>
                  ) : (
                    <Box
                      bg="app.sunken"
                      border="1px solid"
                      borderColor="app.border"
                      borderRadius="999px"
                      h="22px"
                      mt="1px"
                      w="22px"
                    />
                  )}
                  {index < STEPS.length - 1 ? (
                    <Box
                      bg={isDone ? 'app.accent' : 'app.border'}
                      h="34px"
                      w="2px"
                    />
                  ) : null}
                </VStack>
                <Box pb={4}>
                  <Text
                    fontWeight={isActive ? '600' : '500'}
                    color={isDone || isActive ? 'app.text' : 'app.textMuted'}
                  >
                    {step}
                  </Text>
                </Box>
              </Flex>
            );
          })}
        </VStack>
      </VStack>
    </AppCard>
  );
}
