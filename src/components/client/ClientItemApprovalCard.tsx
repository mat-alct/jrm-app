import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Link,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import React from 'react';

import { ClientProjectItemDTO } from '@/types/projects';

interface ClientItemApprovalCardProps {
  item: ClientProjectItemDTO;
  isBusy?: boolean;
  onApprove: (itemId: string) => Promise<void> | void;
  onReject: (itemId: string) => Promise<void> | void;
  onRequestChange: (itemId: string) => Promise<void> | void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function ClientItemApprovalCard({
  item,
  isBusy = false,
  onApprove,
  onReject,
  onRequestChange,
}: ClientItemApprovalCardProps) {
  const actionDisabled =
    isBusy ||
    item.approvalStatus === 'aprovado' ||
    item.approvalStatus === 'recusado';

  async function confirmAction(message: string, action: () => Promise<void> | void) {
    if (window.confirm(message)) {
      await action();
    }
  }

  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.100"
      borderRadius="8px"
      p={{ base: 4, md: 5 }}
      boxShadow="sm"
    >
      <VStack align="stretch" gap={4}>
        <Flex justify="space-between" align="flex-start" gap={3}>
          <Box>
            <Text fontWeight="800" fontSize="lg">
              {item.name}
            </Text>
            <Text color="gray.600">{item.environment}</Text>
          </Box>
          <Badge colorPalette={item.approvalStatus === 'aprovado' ? 'green' : 'yellow'}>
            {item.clientStatusLabel}
          </Badge>
        </Flex>

        <Flex justify="space-between" gap={3} wrap="wrap">
          <Text color="gray.600">Valor</Text>
          <Text fontWeight="800">{formatCurrency((item.customerAmount ?? 0))}</Text>
        </Flex>

        {item.estimatedDeliveryDate ? (
          <Flex justify="space-between" gap={3} wrap="wrap">
            <Text color="gray.600">Previsão</Text>
            <Text fontWeight="700">
              {new Date(item.estimatedDeliveryDate).toLocaleDateString('pt-BR')}
            </Text>
          </Flex>
        ) : null}

        {item.attachments.length > 0 ? (
          <Stack gap={2}>
            <Text color="gray.600" fontSize="sm" fontWeight="700">
              Arquivos liberados
            </Text>
            <HStack gap={2} wrap="wrap">
              {item.attachments.map(attachment => (
                <Link
                  key={attachment.url}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  color="orange.500"
                  fontWeight="700"
                >
                  {attachment.fileName}
                </Link>
              ))}
            </HStack>
          </Stack>
        ) : null}

        <Stack direction={{ base: 'column', md: 'row' }} gap={2}>
          <Button
            bgColor="orange.500"
            color="white"
            _hover={{ bgColor: 'orange.400' }}
            disabled={actionDisabled}
            loading={isBusy}
            onClick={() =>
              confirmAction('Confirmar aprovação deste item?', () =>
                onApprove(item.itemId),
              )
            }
          >
            Aprovar item
          </Button>
          <Button
            variant="outline"
            disabled={actionDisabled}
            onClick={() =>
              confirmAction('Confirmar recusa deste item?', () =>
                onReject(item.itemId),
              )
            }
          >
            Recusar
          </Button>
          <Button
            variant="outline"
            disabled={actionDisabled}
            onClick={() =>
              confirmAction('Solicitar alteração deste item?', () =>
                onRequestChange(item.itemId),
              )
            }
          >
            Pedir alteração
          </Button>
        </Stack>
      </VStack>
    </Box>
  );
}

export { formatCurrency as formatClientCurrency };
