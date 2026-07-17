import { Box, Button, Checkbox, HStack, Input, Text } from '@chakra-ui/react';
import React from 'react';

import { AppCard } from '@/components/ui/card';
import { useUploadAttachment } from '@/services/projects/attachmentHooks';
import {
  AttachmentAudience,
  DEFAULT_ATTACHMENT_AUDIENCE,
  UserRole,
} from '@/types/projects';
import { inferAttachmentFileKind } from '@/utils/projects/attachments';

import { toaster } from '../ui/toaster';

const AUDIENCE_OPTIONS: { key: keyof AttachmentAudience; label: string }[] = [
  { key: 'seller', label: 'Vendedor' },
  { key: 'designer', label: 'Desenhista' },
  { key: 'assembler', label: 'Montador' },
  { key: 'client', label: 'Cliente' },
];

const ATTACHMENT_ACCEPT =
  '.glb,.gltf,.usdz,model/gltf-binary,model/gltf+json,model/vnd.usdz+zip,image/*,application/pdf,.dwg,.dxf,.skp,.zip,.rar,.doc,.docx,.xls,.xlsx';

interface AttachmentUploaderProps {
  projectId: string;
  itemId: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByRole: UserRole;
  categorySuggestions?: string[];
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  projectId,
  itemId,
  uploadedBy,
  uploadedByName,
  uploadedByRole,
  categorySuggestions = [],
}) => {
  const [category, setCategory] = React.useState('');
  const [audience, setAudience] = React.useState<AttachmentAudience>(
    DEFAULT_ATTACHMENT_AUDIENCE,
  );
  const [files, setFiles] = React.useState<File[]>([]);
  const upload = useUploadAttachment(projectId, itemId);

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    setFiles(selectedFiles);
    if (
      !category.trim() &&
      selectedFiles.some(file => inferAttachmentFileKind(file) === 'model_3d')
    ) {
      setCategory('modelo-3d');
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !category.trim()) {
      toaster.create({
        type: 'error',
        description: 'Selecione ao menos um arquivo e informe a categoria.',
      });
      return;
    }

    try {
      for (const file of files) {
        await upload.mutateAsync({
          file,
          category: category.trim(),
          audience,
          uploadedBy,
          uploadedByName,
          uploadedByRole,
        });
      }
      setFiles([]);
      toaster.create({ type: 'success', description: 'Arquivos enviados.' });
    } catch {
      toaster.create({ type: 'error', description: 'Erro ao enviar arquivo.' });
    }
  };

  return (
    <AppCard>
      <Box display="flex" flexDirection="column" gap={3}>
        <Box>
          <Text fontSize="sm" fontWeight="500" color="app.textSecondary" mb={1}>
            Categoria
          </Text>
          <Input
            list="attachment-category-suggestions"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="Ex: fotos do ambiente"
            bg="app.surface"
            borderColor="app.borderStrong"
            rounded="lg"
            _focusVisible={{
              borderColor: 'app.accent',
              shadow: 'focus',
              outline: 'none',
            }}
          />
          <datalist id="attachment-category-suggestions">
            {categorySuggestions.map(suggestion => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="500" color="app.textSecondary" mb={1}>
            Quem pode ver
          </Text>
          <HStack gap={4} wrap="wrap">
            {AUDIENCE_OPTIONS.map(option => (
              <Checkbox.Root
                key={option.key}
                checked={audience[option.key]}
                onCheckedChange={details =>
                  setAudience(current => ({
                    ...current,
                    [option.key]: !!details.checked,
                  }))
                }
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>{option.label}</Checkbox.Label>
              </Checkbox.Root>
            ))}
          </HStack>
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="500" color="app.textSecondary" mb={1}>
            Arquivos
          </Text>
          <Input
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            onChange={handleFilesChange}
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

        <Button
          alignSelf="flex-start"
          loading={upload.isPending}
          bg="app.ink"
          color="white"
          rounded="lg"
          fontWeight="600"
          _hover={{ bg: 'app.inkHover' }}
          _focusVisible={{ shadow: 'focus', outline: 'none' }}
          onClick={() => {
            void handleUpload();
          }}
        >
          Enviar
        </Button>
      </Box>
    </AppCard>
  );
};
