import {
  Button,
  Flex,
  HStack,
  Link,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import React from 'react';

import { ModelViewerPreview } from '@/components/projects/ModelViewerPreview';
import { AppCard } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { ClientProjectItemDTO } from '@/types/projects';
import { inferAttachmentFileKind } from '@/utils/projects/attachments';

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
  const modelAttachments = item.attachments.filter(
    attachment =>
      attachment.fileKind === 'model_3d' ||
      inferAttachmentFileKind({
        name: attachment.fileName,
        type: attachment.mimeType,
      }) === 'model_3d',
  );
  const documentAttachments = item.attachments.filter(
    attachment => !modelAttachments.includes(attachment),
  );

  async function confirmAction(message: string, action: () => Promise<void> | void) {
    if (window.confirm(message)) {
      await action();
    }
  }

  const statusPalette =
    item.approvalStatus === 'aprovado'
      ? 'green'
      : item.approvalStatus === 'recusado'
        ? 'red'
        : item.approvalStatus === 'alteracao_solicitada'
          ? 'orange'
          : 'yellow';

  return (
    <AppCard>
      <VStack align="stretch" gap={4}>
        <Flex justify="space-between" align="flex-start" gap={3}>
          <VStack align="stretch" gap={1}>
            <Text fontWeight="600" fontSize="lg" color="app.text">
              {item.name}
            </Text>
            <Text color="app.textSecondary">{item.environment}</Text>
          </VStack>
          <StatusPill palette={statusPalette} label={item.clientStatusLabel} />
        </Flex>

        <Flex justify="space-between" gap={3} wrap="wrap">
          <Text color="app.textSecondary">Valor</Text>
          <Text fontWeight="600" color="app.text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(item.customerAmount ?? 0)}
          </Text>
        </Flex>

        {item.estimatedDeliveryDate ? (
          <Flex justify="space-between" gap={3} wrap="wrap">
            <Text color="app.textSecondary">Previsão</Text>
            <Text fontWeight="600" color="app.text" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {new Date(item.estimatedDeliveryDate).toLocaleDateString('pt-BR')}
            </Text>
          </Flex>
        ) : null}

        {modelAttachments.length > 0 ? (
          <Stack gap={3}>
            {modelAttachments.map(attachment => (
              <ModelViewerPreview
                key={attachment.url}
                compact
                src={attachment.url}
                fileName={attachment.fileName}
              />
            ))}
          </Stack>
        ) : null}

        {documentAttachments.length > 0 ? (
          <Stack gap={2}>
            <Text color="app.textSecondary" fontSize="sm" fontWeight="600">
              Arquivos liberados
            </Text>
            <HStack gap={2} wrap="wrap">
              {documentAttachments.map(attachment => (
                <Link
                  key={attachment.url}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  color="app.accentEmphasis"
                  fontWeight="600"
                >
                  {attachment.fileName}
                </Link>
              ))}
            </HStack>
          </Stack>
        ) : null}

        <Stack direction={{ base: 'column', md: 'row' }} gap={2}>
          <Button
            flex="1"
            bg="app.ink"
            color="white"
            rounded="lg"
            fontWeight="600"
            _hover={{ bg: 'app.inkHover' }}
            _focusVisible={{ shadow: 'focus', outline: 'none' }}
            disabled={actionDisabled}
            loading={isBusy}
            onClick={() => {
              void confirmAction('Confirmar aprovação deste item?', () =>
                onApprove(item.itemId),
              );
            }}
          >
            Aprovar item
          </Button>
          <Button
            variant="outline"
            flex="1"
            borderColor="app.borderStrong"
            color="app.text"
            rounded="lg"
            _hover={{ bg: 'app.sunken' }}
            _focusVisible={{ shadow: 'focus', outline: 'none' }}
            disabled={actionDisabled}
            onClick={() => {
              void confirmAction('Confirmar recusa deste item?', () =>
                onReject(item.itemId),
              );
            }}
          >
            Recusar
          </Button>
          <Button
            variant="outline"
            flex="1"
            borderColor="app.borderStrong"
            color="app.text"
            rounded="lg"
            _hover={{ bg: 'app.sunken' }}
            _focusVisible={{ shadow: 'focus', outline: 'none' }}
            disabled={actionDisabled}
            onClick={() => {
              void confirmAction('Solicitar alteração deste item?', () =>
                onRequestChange(item.itemId),
              );
            }}
          >
            Pedir alteração
          </Button>
        </Stack>
      </VStack>
    </AppCard>
  );
}

export { formatCurrency as formatClientCurrency };
