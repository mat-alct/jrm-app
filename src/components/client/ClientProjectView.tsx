import {
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import React from 'react';

import { StatCard } from '@/components/ui/stat-card';
import { ClientProjectDTO } from '@/types/projects';

import {
  ClientItemApprovalCard,
  formatClientCurrency,
} from './ClientItemApprovalCard';

interface ClientProjectViewProps {
  project: ClientProjectDTO;
  isBusy?: boolean;
  onApproveAll: () => Promise<void> | void;
  onApproveItem: (itemId: string) => Promise<void> | void;
  onRejectItem: (itemId: string) => Promise<void> | void;
  onRequestChange: (itemId: string) => Promise<void> | void;
}

export function ClientProjectView({
  project,
  isBusy = false,
  onApproveAll,
  onApproveItem,
  onRejectItem,
  onRequestChange,
}: ClientProjectViewProps) {
  const total = project.items.reduce(
    (sum, item) => sum + (item.customerAmount ?? 0),
    0,
  );
  const approvedItems = project.items.filter(
    item => item.approvalStatus === 'aprovado',
  ).length;
  const hasPendingItems = project.items.some(
    item => item.approvalStatus === 'aguardando',
  );

  return (
    <VStack align="stretch" gap={5}>
      <VStack align="stretch" gap={1}>
        <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="600">
          {project.customerName}
        </Heading>
        <Text color="app.textSecondary">Revise os itens do seu projeto.</Text>
      </VStack>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        <StatCard
          label="Valor total"
          value={formatClientCurrency(total)}
          hint={`${project.items.length} ${project.items.length === 1 ? 'item' : 'itens'}`}
        />
        <StatCard
          label="Itens aprovados"
          value={`${approvedItems} de ${project.items.length}`}
          hint={
            hasPendingItems
              ? 'Existem itens aguardando sua decisão.'
              : 'Todos os itens já foram avaliados.'
          }
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
        {project.items.map(item => (
          <ClientItemApprovalCard
            key={item.itemId}
            item={item}
            isBusy={isBusy}
            onApprove={onApproveItem}
            onReject={onRejectItem}
            onRequestChange={onRequestChange}
          />
        ))}
      </SimpleGrid>

      {hasPendingItems ? (
        <Flex
          position={{ base: 'sticky', md: 'static' }}
          bottom="0"
          bg="app.surface"
          borderTopWidth={{ base: '1px', md: '0' }}
          borderColor="app.border"
          boxShadow={{ base: '0 -6px 24px rgba(35,33,29,0.08)', md: 'none' }}
          p={{ base: 4, md: 0 }}
          mt={{ base: 2, md: 0 }}
        >
          <Button
            w="full"
            bg="green.600"
            color="white"
            rounded="lg"
            fontWeight="600"
            _hover={{ bg: 'green.700' }}
            _focusVisible={{ shadow: 'focus', outline: 'none' }}
            disabled={!hasPendingItems || isBusy}
            loading={isBusy}
            onClick={() => {
              if (
                window.confirm(
                  'Confirmar aprovação de todos os itens pendentes?',
                )
              ) {
                void onApproveAll();
              }
            }}
          >
            Aprovar tudo
          </Button>
        </Flex>
      ) : null}
    </VStack>
  );
}
