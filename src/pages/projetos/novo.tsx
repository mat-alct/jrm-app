import { Box, Button, Heading, Stack } from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { ProjectForm, ProjectFormValues } from '@/components/projects/ProjectForm';
import {
  ProjectItemForm,
  ProjectItemFormValues,
} from '@/components/projects/ProjectItemForm';
import { useUsersByRole } from '@/services/projects/adminUsers';
import { createProjectItem } from '@/services/projects/projectItem.service';
import { useCreateProject } from '@/services/projects/projectHooks';
import { useAppUser } from '@/services/projects/users.service';
import { isAdmin } from '@/utils/projects/permissions';
import { createProjectSchema } from '@/utils/yup/projetosValidations';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { toaster } from '../../components/ui/toaster';
import { useAuth } from '../../hooks/authContext';

interface NovoProjetoFormValues extends ProjectFormValues {
  items: ProjectItemFormValues[];
}

const EMPTY_ITEM: ProjectItemFormValues = {
  name: '',
  environment: '',
  material: '',
  finish: '',
  measurements: '',
  description: '',
  notes: '',
  customerPrice: 0,
  requiresDesigner: false,
};

const NovoProjeto = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { data: appUser, isLoading: isLoadingAppUser } = useAppUser();
  const { data: sellers } = useUsersByRole('seller');
  const createProject = useCreateProject();

  React.useEffect(() => {
    if (user === null) router.push('/login');
  }, [user, router]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NovoProjetoFormValues>({
    resolver: yupResolver(createProjectSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      sellerId: appUser && !isAdmin(appUser.roles) ? appUser.id : '',
      items: [EMPTY_ITEM],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const onSubmit = async (values: NovoProjetoFormValues) => {
    if (!user) return;

    try {
      const projectId = await createProject.mutateAsync({
        input: {
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          customerEmail: values.customerEmail,
          customerAddress: values.customerAddress,
          sellerId: values.sellerId,
          sellerName: sellers?.find(s => s.id === values.sellerId)?.name,
        },
        createdBy: user.uid,
      });

      for (const item of values.items) {
        // eslint-disable-next-line no-await-in-loop
        await createProjectItem(
          projectId,
          {
            name: item.name,
            environment: item.environment,
            material: item.material,
            finish: item.finish,
            measurements: item.measurements,
            description: item.description,
            notes: item.notes,
            customerPrice: Number(item.customerPrice),
            requiresDesigner: item.requiresDesigner,
          },
          user.uid,
        );
      }

      toaster.create({ type: 'success', description: 'Projeto criado.' });
      router.push(`/projetos/${projectId}`);
    } catch (error) {
      toaster.create({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Erro ao criar projeto.',
      });
    }
  };

  if (!user || isLoadingAppUser) {
    return <Loader />;
  }

  return (
    <>
      <Head>
        <title>Novo Projeto | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Novo Projeto" />

        <Box
          as="form"
          onSubmit={handleSubmit(onSubmit)}
          display="flex"
          flexDirection="column"
          gap={6}
        >
          <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
            <Heading size="md" mb={4}>
              Dados do cliente
            </Heading>
            <ProjectForm
              register={register}
              control={control}
              errors={errors}
              sellers={sellers ?? []}
            />
          </Box>

          <Box>
            <Heading size="md" mb={4}>
              Itens
            </Heading>
            <Stack gap={4}>
              {fields.map((field, index) => (
                <ProjectItemForm
                  key={field.id}
                  index={index}
                  register={register}
                  errors={errors as never}
                  onRemove={() => remove(index)}
                  canRemove={fields.length > 1}
                />
              ))}
            </Stack>
            <Button
              mt={4}
              variant="outline"
              colorScheme="orange"
              onClick={() => append(EMPTY_ITEM)}
            >
              Adicionar item
            </Button>
          </Box>

          <Button
            type="submit"
            colorScheme="orange"
            alignSelf="flex-start"
            loading={isSubmitting}
          >
            Criar projeto
          </Button>
        </Box>
      </Dashboard>
    </>
  );
};

export default NovoProjeto;
