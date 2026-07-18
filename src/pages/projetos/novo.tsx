import { Box, Button, Heading } from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { useForm } from 'react-hook-form';

import {
  ProjectForm,
  ProjectFormValues,
} from '@/components/projects/ProjectForm';
import { useCreateProject } from '@/services/projects/projectHooks';
import { useAppUser } from '@/services/projects/users.service';
import { createProjectSchema } from '@/utils/yup/projetosValidations';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { toaster } from '../../components/ui/toaster';
import { useAuth } from '../../hooks/authContext';

const NovoProjeto = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { data: appUser, isLoading: isLoadingAppUser } = useAppUser();
  const createProject = useCreateProject();

  React.useEffect(() => {
    if (user === null) void router.push('/login');
  }, [user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(createProjectSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
    },
  });

  const onSubmit = async (values: ProjectFormValues) => {
    if (!user || !appUser) return;

    try {
      const projectId = await createProject.mutateAsync({
        input: {
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          customerEmail: values.customerEmail,
          customerAddress: values.customerAddress,
        },
        actor: { uid: user.uid, name: appUser.name },
      });

      toaster.create({ type: 'success', description: 'Projeto criado.' });
      void router.push(`/projetos/${projectId}`);
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
          onSubmit={event =>
            void handleSubmit(values =>
              onSubmit(values as ProjectFormValues),
            )(event)
          }
          display="flex"
          flexDirection="column"
          gap={6}
        >
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={4}
          >
            <Heading size="md" mb={4}>
              Dados do cliente
            </Heading>
            <ProjectForm register={register} errors={errors} />
          </Box>

          <Button
            type="submit"
            colorPalette="orange"
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
