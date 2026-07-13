import {
  Button,
  chakra,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
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
import { AppCard } from '../../components/ui/card';
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
    if (user === null) {
      void router.push('/login');
    }
  }, [user, router]);

  React.useEffect(() => {
    if (!isLoadingAppUser && appUser && !isAdmin(appUser.roles)) {
      void router.push('/');
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

        <chakra.form
          onSubmit={event => {
            void handleSubmit(onSubmit)(event);
          }}
        >
          <AppCard title="Prazos padrão">
            <VStack align="stretch" gap={4} maxW="760px">
              <Heading size="md" fontWeight="600" color="app.text">
                Prazos padrão por etapa
              </Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                {FIELDS.map(field => (
                  <VStack key={field.name} align="stretch" gap={2}>
                    <FormInput
                      {...register(field.name, { valueAsNumber: true })}
                      name={field.name}
                      label={field.label}
                      type="number"
                      error={errors[field.name]}
                      bg="app.surface"
                      borderColor="app.borderStrong"
                      rounded="lg"
                      _focusVisible={{
                        borderColor: 'app.accent',
                        shadow: 'focus',
                        outline: 'none',
                      }}
                    />
                    <Text fontSize="xs" color="app.textMuted">
                      dias
                    </Text>
                  </VStack>
                ))}
              </SimpleGrid>
              <Button
                type="submit"
                alignSelf="flex-start"
                loading={isSubmitting}
                bg="app.ink"
                color="white"
                rounded="lg"
                fontWeight="600"
                _hover={{ bg: 'app.inkHover' }}
                _focusVisible={{ shadow: 'focus', outline: 'none' }}
              >
                Salvar
              </Button>
            </VStack>
          </AppCard>
        </chakra.form>
      </Dashboard>
    </>
  );
};

export default ConfiguracoesPrazos;
