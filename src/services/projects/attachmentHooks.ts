import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';

import { Attachment, AttachmentAudience } from '@/types/projects';

import { listAttachments, uploadAttachment } from './attachment.service';
import { deleteAttachment, updateAttachmentAudience } from './attachmentAdmin';

function attachmentsQueryKey(projectId: string, itemId: string) {
  return ['projects', projectId, 'items', itemId, 'attachments'];
}

export function useAttachments(
  projectId: string,
  itemId: string,
  enabled = true,
): UseQueryResult<Attachment[]> {
  return useQuery({
    queryKey: attachmentsQueryKey(projectId, itemId),
    queryFn: () => listAttachments(projectId, itemId),
    enabled: enabled && !!projectId && !!itemId,
  });
}

export function useUploadAttachment(
  projectId: string,
  itemId: string,
): UseMutationResult<
  Attachment,
  Error,
  Omit<Parameters<typeof uploadAttachment>[0], 'projectId' | 'itemId'>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: params => uploadAttachment({ ...params, projectId, itemId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: attachmentsQueryKey(projectId, itemId),
      });
    },
  });
}

export function useDeleteAttachment(
  projectId: string,
  itemId: string,
): UseMutationResult<void, Error, Attachment> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: attachment => deleteAttachment(attachment),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: attachmentsQueryKey(projectId, itemId),
      });
    },
  });
}

export function useUpdateAttachmentAudience(
  projectId: string,
  itemId: string,
): UseMutationResult<
  void,
  Error,
  { attachmentId: string; audience: AttachmentAudience }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ attachmentId, audience }) =>
      updateAttachmentAudience(projectId, itemId, attachmentId, audience),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: attachmentsQueryKey(projectId, itemId),
      });
    },
  });
}
