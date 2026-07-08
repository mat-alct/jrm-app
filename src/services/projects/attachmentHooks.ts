import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';

import { Attachment } from '@/types/projects';

import { deleteAttachment } from './attachmentAdmin';
import { listAttachments, uploadAttachment } from './attachment.service';

function attachmentsQueryKey(projectId: string, itemId?: string) {
  return itemId
    ? ['projects', projectId, 'items', itemId, 'attachments']
    : ['projects', projectId, 'attachments'];
}

export function useAttachments(
  projectId: string,
  itemId?: string,
): UseQueryResult<Attachment[]> {
  return useQuery({
    queryKey: attachmentsQueryKey(projectId, itemId),
    queryFn: () => listAttachments(projectId, itemId),
    enabled: !!projectId,
  });
}

export function useUploadAttachment(
  projectId: string,
  itemId?: string,
): UseMutationResult<Attachment, Error, Omit<Parameters<typeof uploadAttachment>[0], 'projectId' | 'itemId'>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: params =>
      uploadAttachment({ ...params, projectId, itemId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: attachmentsQueryKey(projectId, itemId),
      });
    },
  });
}

export function useDeleteAttachment(
  projectId: string,
  itemId?: string,
): UseMutationResult<void, Error, Attachment> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: attachment => deleteAttachment(attachment),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: attachmentsQueryKey(projectId, itemId),
      });
    },
  });
}
