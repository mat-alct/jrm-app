import { Box, Button, Input, Text, Textarea } from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { AppCard } from '@/components/ui/card';
import { submitDesignerVersion } from '@/services/projects/designer.service';
import { StatusActor } from '@/services/projects/status.service';

import { toaster } from '../ui/toaster';

const DESIGNER_VERSION_ACCEPT =
  '.glb,.gltf,.usdz,model/gltf-binary,model/gltf+json,model/vnd.usdz+zip,image/*,application/pdf,.dwg,.dxf,.skp,.zip,.rar';

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
      submitDesignerVersion(
        projectId,
        itemId,
        files,
        description || undefined,
        actor,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
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
    <AppCard>
      <Box display="flex" flexDirection="column" gap={3}>
        <Box>
          <Text fontSize="sm" fontWeight="500" color="app.textSecondary" mb={1}>
            Arquivos da versão
          </Text>
          <Input
            type="file"
            multiple
            accept={DESIGNER_VERSION_ACCEPT}
            onChange={e => setFiles(Array.from(e.target.files ?? []))}
            bg="app.surface"
            borderColor="app.borderStrong"
            rounded="lg"
            pt="1.5"
            _focusVisible={{
              borderColor: 'app.accent',
              shadow: 'focus',
              outline: 'none',
            }}
          />
        </Box>
        <Box>
          <Text fontSize="sm" fontWeight="500" color="app.textSecondary" mb={1}>
            Descrição
          </Text>
          <Textarea
            placeholder="Descrição da versão (opcional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            bg="app.surface"
            borderColor="app.borderStrong"
            rounded="lg"
            _focusVisible={{
              borderColor: 'app.accent',
              shadow: 'focus',
              outline: 'none',
            }}
          />
        </Box>
        <Button
          alignSelf="flex-start"
          loading={submit.isPending}
          bg="app.ink"
          color="white"
          rounded="lg"
          fontWeight="600"
          _hover={{ bg: 'app.inkHover' }}
          _focusVisible={{ shadow: 'focus', outline: 'none' }}
          onClick={() => submit.mutate()}
        >
          Enviar versão
        </Button>
      </Box>
    </AppCard>
  );
};
