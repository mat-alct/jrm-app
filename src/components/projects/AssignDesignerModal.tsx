import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Text,
} from '@chakra-ui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import React from 'react';

import { useUsersByRole } from '@/services/projects/adminUsers';
import {
  computeDeadline,
  getDeadlineDefaults,
} from '@/services/projects/deadline.service';
import { updateProjectItem } from '@/services/projects/projectItem.service';
import {
  StatusActor,
  updateItemStatus,
} from '@/services/projects/status.service';

import { toaster } from '../ui/toaster';

interface AssignDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  itemId: string;
  actor: StatusActor;
}

export const AssignDesignerModal: React.FC<AssignDesignerModalProps> = ({
  isOpen,
  onClose,
  projectId,
  itemId,
  actor,
}) => {
  const queryClient = useQueryClient();
  const { data: designers } = useUsersByRole('designer');
  const { data: defaults } = useQuery({
    queryKey: ['projects', 'deadlineDefaults'],
    queryFn: getDeadlineDefaults,
  });

  const [designerId, setDesignerId] = React.useState('');
  const [deadline, setDeadline] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!designerId || !defaults) return;

    const computed = computeDeadline('aguardando_desenho', defaults);
    if (computed) {
      setDeadline(format(computed.toDate(), 'yyyy-MM-dd'));
    }
  }, [designerId, defaults]);

  const handleSubmit = async () => {
    const designer = designers?.find(d => d.id === designerId);
    if (!designer) {
      toaster.create({ type: 'error', description: 'Selecione um desenhista.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProjectItem(
        projectId,
        itemId,
        {
          designerId: designer.id,
          designerName: designer.name,
          ...(deadline
            ? { deadlineCurrent: Timestamp.fromDate(new Date(`${deadline}T00:00:00`)) }
            : {}),
        },
        actor.uid,
      );
      await updateItemStatus(projectId, itemId, 'aguardando_desenho', actor);
      await queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'items', itemId],
      });
      toaster.create({ type: 'success', description: 'Desenhista atribuído.' });
      onClose();
    } catch (error) {
      toaster.create({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Erro ao atribuir desenhista.',
      });
    } finally {
      setIsSubmitting(false);
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
              <select
                value={designerId}
                onChange={e => setDesignerId(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', width: '100%' }}
              >
                <option value="">Selecione</option>
                {designers?.map(designer => (
                  <option key={designer.id} value={designer.id}>
                    {designer.name}
                  </option>
                ))}
              </select>

              <Text fontSize="sm" fontWeight="medium">
                Prazo
              </Text>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', width: '100%' }}
              />
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                colorScheme="orange"
                mr={3}
                loading={isSubmitting}
                onClick={handleSubmit}
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
