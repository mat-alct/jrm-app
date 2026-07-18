import { Badge, Box, Button, Checkbox, HStack, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import {
  FaCube,
  FaFileAlt,
  FaFileImage,
  FaFilePdf,
  FaTrash,
} from 'react-icons/fa';

import { EmptyState } from '@/components/ui/empty-state';
import {
  filterAttachmentsByRole,
  formatFileSize,
} from '@/services/projects/attachment.service';
import {
  useDeleteAttachment,
  useUpdateAttachmentAudience,
} from '@/services/projects/attachmentHooks';
import { Attachment, AttachmentAudience, UserRole } from '@/types/projects';
import { isModel3DAttachment } from '@/utils/projects/attachments';
import { isAdmin } from '@/utils/projects/permissions';

import { ModelViewerPreview } from './ModelViewerPreview';

interface AttachmentListProps {
  projectId: string;
  itemId: string;
  attachments: Attachment[];
  viewerRoles: UserRole[] | undefined;
}

const AUDIENCE_OPTIONS: { key: keyof AttachmentAudience; label: string }[] = [
  { key: 'seller', label: 'Vendedor' },
  { key: 'designer', label: 'Desenhista' },
  { key: 'assembler', label: 'Montador' },
  { key: 'client', label: 'Cliente' },
];

function iconFor(mimeType: string) {
  if (mimeType.startsWith('image/')) return FaFileImage;
  if (mimeType === 'application/pdf') return FaFilePdf;
  return FaFileAlt;
}

function groupByCategory(
  attachments: Attachment[],
): Record<string, Attachment[]> {
  return attachments.reduce<Record<string, Attachment[]>>(
    (groups, attachment) => {
      const key = attachment.category || 'Sem categoria';
      groups[key] = groups[key] ? [...groups[key], attachment] : [attachment];
      return groups;
    },
    {},
  );
}

function excludedLabels(audience: AttachmentAudience): string[] {
  return AUDIENCE_OPTIONS.filter(option => !audience[option.key]).map(
    option => option.label,
  );
}

export const AttachmentList: React.FC<AttachmentListProps> = ({
  projectId,
  itemId,
  attachments,
  viewerRoles,
}) => {
  const deleteAttachment = useDeleteAttachment(projectId, itemId);
  const updateAudience = useUpdateAttachmentAudience(projectId, itemId);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [pendingAudience, setPendingAudience] =
    React.useState<AttachmentAudience | null>(null);
  const visible = filterAttachmentsByRole(attachments, viewerRoles);
  const grouped = groupByCategory(visible);
  const canDelete = isAdmin(viewerRoles);
  const canEditAudience = isAdmin(viewerRoles);

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={FaFileAlt}
        title="Nenhum anexo disponível."
        description="Os arquivos liberados para este item aparecem aqui."
      />
    );
  }

  function startEditing(attachment: Attachment) {
    setEditingId(attachment.id);
    setPendingAudience(attachment.audience);
  }

  function cancelEditing() {
    setEditingId(null);
    setPendingAudience(null);
  }

  async function saveAudience(attachmentId: string) {
    if (!pendingAudience) return;
    await updateAudience.mutateAsync({ attachmentId, audience: pendingAudience });
    setEditingId(null);
    setPendingAudience(null);
  }

  return (
    <VStack align="stretch" gap={4}>
      {Object.entries(grouped).map(([category, categoryAttachments]) => (
        <Box key={category}>
          <Text fontWeight="600" fontSize="sm" mb={2} color="app.textSecondary">
            {category}
          </Text>
          <VStack align="stretch" gap={2}>
            {categoryAttachments.map(attachment => {
              const isModel3D = isModel3DAttachment(attachment);
              const Icon = isModel3D ? FaCube : iconFor(attachment.mimeType);
              const excluded = excludedLabels(attachment.audience);
              const isEditing = editingId === attachment.id;
              return (
                <Box
                  key={attachment.id}
                  borderWidth="1px"
                  borderColor="app.border"
                  borderRadius="lg"
                  bg="app.surface"
                  p={3}
                >
                  <HStack justify="space-between">
                    <HStack gap={2} minW="0">
                      <Icon />
                      <Box minW="0">
                        <Text
                          fontSize="sm"
                          truncate
                          color="app.text"
                          fontWeight="500"
                        >
                          {attachment.originalFileName}
                        </Text>
                        <Text fontSize="xs" color="app.textMuted">
                          {formatFileSize(attachment.sizeBytes)}
                        </Text>
                      </Box>
                      {isModel3D && (
                        <Badge colorPalette="blue" borderRadius="full">
                          modelo 3D
                        </Badge>
                      )}
                      {excluded.length > 0 && (
                        <Badge colorPalette="gray" borderRadius="full">
                          Oculto para: {excluded.join(', ')}
                        </Badge>
                      )}
                    </HStack>
                    <HStack gap={2}>
                      {attachment.downloadUrl && (
                        <Button
                          asChild
                          size="xs"
                          variant="outline"
                          borderColor="app.borderStrong"
                          color="app.text"
                          rounded="lg"
                          _hover={{ bg: 'app.sunken' }}
                        >
                          <a
                            href={attachment.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Baixar
                          </a>
                        </Button>
                      )}
                      {canEditAudience && !isEditing && (
                        <Button
                          size="xs"
                          variant="outline"
                          borderColor="app.borderStrong"
                          color="app.text"
                          rounded="lg"
                          _hover={{ bg: 'app.sunken' }}
                          onClick={() => startEditing(attachment)}
                        >
                          Editar visibilidade
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="xs"
                          variant="outline"
                          borderColor="red.200"
                          color="red.700"
                          rounded="lg"
                          _hover={{ bg: 'red.50' }}
                          loading={
                            deleteAttachment.isPending &&
                            deleteAttachment.variables?.id === attachment.id
                          }
                          onClick={() => deleteAttachment.mutate(attachment)}
                        >
                          <FaTrash />
                        </Button>
                      )}
                    </HStack>
                  </HStack>
                  {isEditing && pendingAudience && (
                    <Box mt={3}>
                      <HStack gap={4} wrap="wrap">
                        {AUDIENCE_OPTIONS.map(option => (
                          <Checkbox.Root
                            key={option.key}
                            checked={pendingAudience[option.key]}
                            onCheckedChange={details =>
                              setPendingAudience(current =>
                                current
                                  ? {
                                      ...current,
                                      [option.key]: !!details.checked,
                                    }
                                  : current,
                              )
                            }
                          >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control />
                            <Checkbox.Label>{option.label}</Checkbox.Label>
                          </Checkbox.Root>
                        ))}
                      </HStack>
                      <HStack gap={2} mt={2}>
                        <Button
                          size="xs"
                          colorPalette="orange"
                          loading={updateAudience.isPending}
                          onClick={() => void saveAudience(attachment.id)}
                        >
                          Salvar
                        </Button>
                        <Button size="xs" variant="outline" onClick={cancelEditing}>
                          Cancelar
                        </Button>
                      </HStack>
                    </Box>
                  )}
                  {isModel3D && attachment.downloadUrl && (
                    <Box mt={3}>
                      <ModelViewerPreview
                        compact
                        src={attachment.downloadUrl}
                        fileName={attachment.originalFileName}
                      />
                    </Box>
                  )}
                </Box>
              );
            })}
          </VStack>
        </Box>
      ))}
    </VStack>
  );
};
