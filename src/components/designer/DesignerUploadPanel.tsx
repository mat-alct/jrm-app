import { Box, Button, Textarea } from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { submitDesignerVersion } from '@/services/projects/designer.service';
import { StatusActor } from '@/services/projects/status.service';

import { toaster } from '../ui/toaster';

interface DesignerUploadPanelProps {
  projectId: string;
  itemId: string;
  actor: StatusActor;
}

export const DesignerUploadPanel: React.FC<DesignerUploadPanelProps> = ({
  projectId,
  itemId,
  actor,
}) => {
  const queryClient = useQueryClient();
  const [files, setFiles] = React.useState<File[]>([]);
  const [description, setDescription] = React.useState('');

  const submit = useMutation({
    mutationFn: () =>
      submitDesignerVersion(projectId, itemId, files, description || undefined, actor),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'items', itemId],
      });
      setFiles([]);
      setDescription('');
      toaster.create({ type: 'success', description: 'Versão enviada.' });
    },
    onError: (error: Error) => {
      toaster.create({
        type: 'error',
        description: error.message || 'Erro ao enviar versão.',
      });
    },
  });

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <input
        type="file"
        multiple
        onChange={e => setFiles(Array.from(e.target.files ?? []))}
      />
      <Textarea
        placeholder="Descrição da versão (opcional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <Button
        colorScheme="orange"
        alignSelf="flex-start"
        loading={submit.isPending}
        onClick={() => submit.mutate()}
      >
        Enviar versão
      </Button>
    </Box>
  );
};
