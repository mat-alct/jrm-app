import { Box, Button, Input, Text } from '@chakra-ui/react';
import React from 'react';

import { useUploadAttachment } from '@/services/projects/attachmentHooks';
import { AttachmentVisibility, UserRole } from '@/types/projects';

import { toaster } from '../ui/toaster';

const VISIBILITY_OPTIONS: { value: AttachmentVisibility; label: string }[] = [
  { value: 'internal', label: 'Interno' },
  { value: 'client', label: 'Cliente' },
  { value: 'designer', label: 'Desenhista' },
  { value: 'assembler', label: 'Montador' },
];

interface AttachmentUploaderProps {
  projectId: string;
  itemId?: string;
  uploadedBy: string;
  uploadedByRole: UserRole;
  categorySuggestions?: string[];
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  projectId,
  itemId,
  uploadedBy,
  uploadedByRole,
  categorySuggestions = [],
}) => {
  const [category, setCategory] = React.useState('');
  const [visibility, setVisibility] = React.useState<AttachmentVisibility>(
    'internal',
  );
  const [files, setFiles] = React.useState<File[]>([]);
  const upload = useUploadAttachment(projectId, itemId);

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
        // eslint-disable-next-line no-await-in-loop
        await upload.mutateAsync({
          file,
          category: category.trim(),
          visibility,
          uploadedBy,
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
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={4}
      display="flex"
      flexDirection="column"
      gap={3}
    >
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          Categoria
        </Text>
        <Input
          list="attachment-category-suggestions"
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="Ex: fotos do ambiente"
        />
        <datalist id="attachment-category-suggestions">
          {categorySuggestions.map(suggestion => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          Visibilidade
        </Text>
        <select
          value={visibility}
          onChange={e => setVisibility(e.target.value as AttachmentVisibility)}
          style={{ padding: '8px', borderRadius: '6px', width: '100%' }}
        >
          {VISIBILITY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          Arquivos
        </Text>
        <input
          type="file"
          multiple
          capture="environment"
          onChange={e => setFiles(Array.from(e.target.files ?? []))}
        />
      </Box>

      <Button
        colorScheme="orange"
        alignSelf="flex-start"
        loading={upload.isPending}
        onClick={handleUpload}
      >
        Enviar
      </Button>
    </Box>
  );
};
