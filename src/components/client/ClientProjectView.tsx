import {
  Box,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import React from 'react';

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
  const total = project.items.reduce((sum, item) => sum + item.customerPrice, 0);
  const hasPendingItems = project.items.some(
    item => item.approvalStatus === 'aguardando',
  );

  return (
    <VStack align="stretch" gap={5}>
      <Box>
        <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }}>
          {project.customerName}
        </Heading>
        <Text color="gray.600">Revise os itens do seu projeto.</Text>
      </Box>

      <Flex
        align={{ base: 'stretch', md: 'center' }}
        bg="white"
        border="1px solid"
        borderColor="gray.100"
        borderRadius="8px"
        boxShadow="sm"
        direction={{ base: 'column', md: 'row' }}
        gap={4}
        justify="space-between"
        p={{ base: 4, md: 5 }}
      >
        <Box>
          <Text color="gray.600">Valor total</Text>
          <Text fontSize="2xl" fontWeight="900">
            {formatClientCurrency(total)}
          </Text>
        </Box>
        <Button
          bgColor="orange.500"
          color="white"
          _hover={{ bgColor: 'orange.400' }}
          disabled={!hasPendingItems || isBusy}
          loading={isBusy}
          onClick={() => {
            if (window.confirm('Confirmar aprovação de todos os itens pendentes?')) {
              onApproveAll();
            }
          }}
        >
          Aprovar tudo
        </Button>
      </Flex>

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
    </VStack>
  );
}
