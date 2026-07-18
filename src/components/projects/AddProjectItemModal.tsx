import { Button, CloseButton, Dialog, Portal } from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';

import { useCreateProjectItem } from '@/services/projects/projectHooks';
import { projectItemSchema } from '@/utils/yup/projetosValidations';

import { toaster } from '../ui/toaster';
import { ProjectItemForm, ProjectItemFormValues } from './ProjectItemForm';

const addItemSchema = Yup.object().shape({
  items: Yup.array().of(projectItemSchema).length(1).required(),
});

interface AddProjectItemFormValues {
  items: ProjectItemFormValues[];
}

interface AddProjectItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  createdBy: string;
}

const EMPTY_ITEM: ProjectItemFormValues = {
  name: '',
  environment: '',
  material: '',
  description: '',
  notes: '',
};

export const AddProjectItemModal: React.FC<AddProjectItemModalProps> = ({
  isOpen,
  onClose,
  projectId,
  createdBy,
}) => {
  const createProjectItem = useCreateProjectItem(projectId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(addItemSchema),
    defaultValues: { items: [EMPTY_ITEM] },
  });

  React.useEffect(() => {
    if (isOpen) reset({ items: [EMPTY_ITEM] });
  }, [isOpen, reset]);

  const onSubmit = async (values: AddProjectItemFormValues) => {
    const item = values.items[0];
    try {
      await createProjectItem.mutateAsync({
        input: {
          name: item.name,
          environment: item.environment,
          material: item.material,
          description: item.description,
          notes: item.notes,
        },
        createdBy,
      });
      toaster.create({ type: 'success', description: 'Item adicionado.' });
      onClose();
    } catch (error) {
      toaster.create({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Erro ao adicionar item.',
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
              <Dialog.Title>Adicionar item</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb={6}>
              <ProjectItemForm
                index={0}
                register={register}
                errors={errors as never}
                onRemove={() => {}}
                canRemove={false}
              />
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                colorScheme="orange"
                mr={3}
                loading={isSubmitting}
                onClick={() =>
                  void handleSubmit(values =>
                    onSubmit(values as AddProjectItemFormValues),
                  )()
                }
              >
                Adicionar
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
