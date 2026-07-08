import { Box, SimpleGrid, Text } from '@chakra-ui/react';
import React from 'react';

import { ProjectItemSummary } from '@/types/projects';

interface ProjectSummaryCardsProps {
  summary: ProjectItemSummary;
}

const CARDS: { key: keyof ProjectItemSummary; label: string }[] = [
  { key: 'total', label: 'Itens' },
  { key: 'aguardandoAprovacao', label: 'Aguardando aprovação' },
  { key: 'aprovados', label: 'Aprovados' },
  { key: 'emProducao', label: 'Em produção' },
  { key: 'emMontagem', label: 'Em montagem' },
  { key: 'finalizados', label: 'Finalizados' },
  { key: 'atrasados', label: 'Atrasados' },
];

export const ProjectSummaryCards: React.FC<ProjectSummaryCardsProps> = ({
  summary,
}) => (
  <SimpleGrid columns={[2, 3, 4, 7]} gap={4}>
    {CARDS.map(card => (
      <Box
        key={card.key}
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={4}
        textAlign="center"
      >
        <Text fontSize="2xl" fontWeight="bold">
          {summary[card.key]}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {card.label}
        </Text>
      </Box>
    ))}
  </SimpleGrid>
);
