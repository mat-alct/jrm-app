import { Button, CloseButton, Dialog, Portal } from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useForm } from 'react-hook-form';

import { useUpdateProject } from '@/services/projects/projectHooks';
import { Project } from '@/types/projects';
import { createProjectSchema } from '@/utils/yup/projetosValidations';

import { toaster } from '../ui/toaster';
import { ProjectForm, ProjectFormValues } from './ProjectForm';

interface EditCustomerDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  updatedBy: string;
}

export const EditCustomerDataModal: React.FC<EditCustomerDataModalProps> = ({
  isOpen,
  onClose,
  project,
  updatedBy,
}) => {
  const updateProject = useUpdateProject(project.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(createProjectSchema),
    defaultValues: {
      customerName: project.customerName,
      customerPhone: project.customerPhone,
      customerEmail: project.customerEmail ?? '',
      customerAddress: project.customerAddress ?? '',
    },
  });

  React.useEffect(() => {
    if (!isOpen) return;
    reset({
      customerName: project.customerName,
      customerPhone: project.customerPhone,
      customerEmail: project.customerEmail ?? '',
      customerAddress: project.customerAddress ?? '',
    });
  }, [isOpen, project, reset]);

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      await updateProject.mutateAsync({
        updates: {
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          customerEmail: values.customerEmail,
          customerAddress: values.customerAddress,
        },
        updatedBy,
      });
      toaster.create({ type: 'success', description: 'Dados atualizados.' });
      onClose();
    } catch (error) {
      toaster.create({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Erro ao salvar dados.',
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
              <Dialog.Title>Editar dados do cliente</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb={6}>
              <ProjectForm register={register} errors={errors} />
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                colorScheme="orange"
                mr={3}
                loading={isSubmitting}
                onClick={() =>
                  void handleSubmit(values =>
                    onSubmit(values as ProjectFormValues),
                  )()
                }
              >
                Salvar
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
