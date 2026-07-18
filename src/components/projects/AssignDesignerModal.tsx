import { Button, CloseButton, Dialog, HStack, Input, Portal, Text } from '@chakra-ui/react';
import React from 'react';

import { useUsersByRole } from '@/services/projects/adminUsers';
import { useAssignDesignerByName } from '@/services/projects/designer.service';

import { toaster } from '../ui/toaster';

export const DESIGNER_QUICK_OPTIONS = ['Renato', 'Marcio'];

interface AssignDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  itemId: string;
  actor: { uid: string };
}

export const AssignDesignerModal: React.FC<AssignDesignerModalProps> = ({
  isOpen,
  onClose,
  projectId,
  itemId,
  actor,
}) => {
  const { data: designers } = useUsersByRole('designer');
  const assignDesigner = useAssignDesignerByName();

  const [name, setName] = React.useState('');

  React.useEffect(() => {
    if (isOpen) setName('');
  }, [isOpen]);

  const handleSubmit = async () => {
    try {
      await assignDesigner.mutateAsync({
        projectId,
        itemId,
        name,
        activeDesigners: designers ?? [],
        actor,
      });
      toaster.create({ type: 'success', description: 'Desenhista atribuído.' });
      onClose();
    } catch (error) {
      toaster.create({
        type: 'error',
        description:
          error instanceof Error
            ? error.message
            : 'Erro ao atribuir desenhista.',
      });
    }
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={e => {
        if (!e.open) onClose();
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Atribuir desenhista</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" gap={4} pb={6}>
              <Text fontSize="sm" fontWeight="medium">
                Desenhista
              </Text>
              <HStack gap={2}>
                {DESIGNER_QUICK_OPTIONS.map(option => (
                  <Button
                    key={option}
                    size="sm"
                    variant={name === option ? 'solid' : 'outline'}
                    colorPalette="orange"
                    onClick={() => setName(option)}
                  >
                    {option}
                  </Button>
                ))}
              </HStack>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Outros"
              />
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                colorPalette="orange"
                mr={3}
                loading={assignDesigner.isPending}
                onClick={() => void handleSubmit()}
              >
                Atribuir
              </Button>
              <Button onClick={onClose}>Cancelar</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
