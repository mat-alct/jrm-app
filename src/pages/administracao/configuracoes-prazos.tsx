import { Box, Button, Heading } from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { useForm } from 'react-hook-form';

import { getDeadlineDefaults } from '@/services/projects/deadline.service';
import { saveDeadlineDefaults } from '@/services/projects/deadlineAdmin';
import { useAppUser } from '@/services/projects/users.service';
import { DeadlineDefaults } from '@/types/projects';
import { isAdmin } from '@/utils/projects/permissions';
import { deadlineDefaultsSchema } from '@/utils/yup/deadlineDefaultsValidations';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { Loader } from '../../components/Loader';
import { toaster } from '../../components/ui/toaster';
import { useAuth } from '../../hooks/authContext';

type FormValues = Omit<DeadlineDefaults, 'updatedAt' | 'updatedBy'>;

const FIELDS: { name: keyof FormValues; label: string }[] = [
  { name: 'desenhoDias', label: 'Dias para desenho' },
  { name: 'orcamentoDias', label: 'Dias para orçamento' },
  { name: 'aprovacaoClienteDias', label: 'Dias para aprovação do cliente' },
  { name: 'atribuicaoMontadorDias', label: 'Dias para atribuição de montador' },
  { name: 'producaoDias', label: 'Dias para produção' },
  { name: 'montagemDias', label: 'Dias para montagem' },
];

const ConfiguracoesPrazos = () => {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: appUser, isLoading: isLoadingAppUser } = useAppUser();
  const { data: defaults, isLoading: isLoadingDefaults } = useQuery({
    queryKey: ['projects', 'deadlineDefaults'],
    queryFn: getDeadlineDefaults,
  });

  React.useEffect(() => {
    if (user === null) router.push('/login');
  }, [user, router]);

  React.useEffect(() => {
    if (!isLoadingAppUser && appUser && !isAdmin(appUser.roles)) {
      router.push('/');
    }
  }, [appUser, isLoadingAppUser, router]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(deadlineDefaultsSchema),
  });

  React.useEffect(() => {
    if (defaults) reset(defaults);
  }, [defaults, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    try {
      await saveDeadlineDefaults(values, user.uid);
      await queryClient.invalidateQueries({
        queryKey: ['projects', 'deadlineDefaults'],
      });
      toaster.create({ type: 'success', description: 'Prazos atualizados.' });
    } catch {
      toaster.create({ type: 'error', description: 'Erro ao salvar prazos.' });
    }
  };

  if (!user || isLoadingAppUser || isLoadingDefaults) {
    return <Loader />;
  }

  return (
    <>
      <Head>
        <title>Configurações de Prazos | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Configurações de Prazos" />

        <Box
          as="form"
          onSubmit={handleSubmit(onSubmit)}
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          p={4}
          display="flex"
          flexDirection="column"
          gap={4}
          maxW="480px"
        >
          <Heading size="md">Prazos padrão por etapa</Heading>
          {FIELDS.map(field => (
            <FormInput
              key={field.name}
              {...register(field.name, { valueAsNumber: true })}
              name={field.name}
              label={field.label}
              type="number"
              error={errors[field.name]}
            />
          ))}
          <Button
            type="submit"
            colorScheme="orange"
            alignSelf="flex-start"
            loading={isSubmitting}
          >
            Salvar
          </Button>
        </Box>
      </Dashboard>
    </>
  );
};

export default ConfiguracoesPrazos;
