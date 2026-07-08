import { Badge, Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { FaFileAlt, FaFileImage, FaFilePdf, FaTrash } from 'react-icons/fa';

import {
  formatFileSize,
  filterAttachmentsByRole,
} from '@/services/projects/attachment.service';
import { useDeleteAttachment } from '@/services/projects/attachmentHooks';
import { Attachment, UserRole } from '@/types/projects';
import { isAdmin } from '@/utils/projects/permissions';

interface AttachmentListProps {
  projectId: string;
  itemId?: string;
  attachments: Attachment[];
  viewerRoles: UserRole[] | undefined;
}

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

export const AttachmentList: React.FC<AttachmentListProps> = ({
  projectId,
  itemId,
  attachments,
  viewerRoles,
}) => {
  const deleteAttachment = useDeleteAttachment(projectId, itemId);
  const visible = filterAttachmentsByRole(attachments, viewerRoles);
  const grouped = groupByCategory(visible);
  const canDelete = isAdmin(viewerRoles);

  if (visible.length === 0) {
    return (
      <Text color="gray.500" fontSize="sm">
        Nenhum anexo disponível.
      </Text>
    );
  }

  return (
    <VStack align="stretch" gap={4}>
      {Object.entries(grouped).map(([category, categoryAttachments]) => (
        <Box key={category}>
          <Text fontWeight="semibold" fontSize="sm" mb={2}>
            {category}
          </Text>
          <VStack align="stretch" gap={2}>
            {categoryAttachments.map(attachment => {
              const Icon = iconFor(attachment.mimeType);
              return (
                <HStack
                  key={attachment.id}
                  justify="space-between"
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  p={2}
                >
                  <HStack gap={2} minW="0">
                    <Icon />
                    <Box minW="0">
                      <Text fontSize="sm" truncate>
                        {attachment.originalFileName}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatFileSize(attachment.sizeBytes)}
                      </Text>
                    </Box>
                    <Badge>{attachment.visibility}</Badge>
                  </HStack>
                  <HStack gap={2}>
                    {attachment.downloadUrl && (
                      <Button asChild size="xs" variant="outline">
                        <a
                          href={attachment.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Baixar
                        </a>
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="xs"
                        variant="outline"
                        colorScheme="red"
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
              );
            })}
          </VStack>
        </Box>
      ))}
    </VStack>
  );
};
