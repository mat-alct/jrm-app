import {
  Alert,
  Box,
  Button,
  chakra,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Head from 'next/head';
import React from 'react';
import { useForm } from 'react-hook-form';

import { Dashboard } from '@/components/Dashboard';
import { Header } from '@/components/Dashboard/Content/Header';
import { FormInput } from '@/components/Form/Input';
import { Loader } from '@/components/Loader';
import { AppCard } from '@/components/ui/card';
import { toaster } from '@/components/ui/toaster';
import type { CuttingMachineConfiguration } from '@/domain/cutting-plan';
import {
  normalizeCuttingMachineConfiguration,
  validateCuttingMachineConfiguration,
} from '@/domain/cutting-plan';
import { useAuth } from '@/hooks/authContext';
import {
  CUTTING_MACHINE_QUERY_KEY,
  getCuttingMachineConfiguration,
  saveCuttingMachineConfiguration,
} from '@/services/cuttingMachine.service';

interface NumberField {
  label: string;
  name:
    | 'cutting.sheetWidthMm'
    | 'cutting.sheetLengthMm'
    | 'cutting.edgeTrimMm'
    | 'cutting.internalEdgeTrimMm'
    | 'cutting.kerfMm'
    | 'cutting.movementPrice'
    | 'cutting.edgeBandPricePerMeter'
    | 'cutting.balancedWeights.waste'
    | 'cutting.balancedWeights.movementCount'
    | 'cutting.balancedWeights.sheetCount'
    | 'exportProfile.defaultEdgeBandThicknessMm'
    | 'exportProfile.defaultEdgeBandHeightMm'
    | 'exportProfile.defaultAcHeaderFlag';
  step?: number;
}

const CUTTING_FIELDS: NumberField[] = [
  { name: 'cutting.sheetWidthMm', label: 'Largura padrão da chapa (mm)' },
  { name: 'cutting.sheetLengthMm', label: 'Comprimento padrão da chapa (mm)' },
  {
    name: 'cutting.edgeTrimMm',
    label: 'Margem externa por borda (mm)',
    step: 0.1,
  },
  {
    name: 'cutting.internalEdgeTrimMm',
    label: 'Acerto interno por borda (mm)',
    step: 0.1,
  },
  {
    name: 'cutting.kerfMm',
    label: 'Espessura da serra / kerf (mm)',
    step: 0.1,
  },
];

const COST_FIELDS: NumberField[] = [
  {
    name: 'cutting.movementPrice',
    label: 'Preço por movimento (R$)',
    step: 0.01,
  },
  {
    name: 'cutting.edgeBandPricePerMeter',
    label: 'Preço da fita por metro (R$)',
    step: 0.01,
  },
];

const WEIGHT_FIELDS: NumberField[] = [
  {
    name: 'cutting.balancedWeights.waste',
    label: 'Peso das sobras',
    step: 0.05,
  },
  {
    name: 'cutting.balancedWeights.movementCount',
    label: 'Peso dos movimentos',
    step: 0.05,
  },
  {
    name: 'cutting.balancedWeights.sheetCount',
    label: 'Peso das chapas',
    step: 0.05,
  },
];

const MachineSettingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: CUTTING_MACHINE_QUERY_KEY,
    queryFn: getCuttingMachineConfiguration,
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CuttingMachineConfiguration>();

  React.useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const save = async (values: CuttingMachineConfiguration) => {
    if (!user) return;
    try {
      const normalized = normalizeCuttingMachineConfiguration(values);
      validateCuttingMachineConfiguration(normalized);
      await saveCuttingMachineConfiguration(normalized, user.uid);
      await queryClient.invalidateQueries({
        queryKey: CUTTING_MACHINE_QUERY_KEY,
      });
      toaster.create({
        type: 'success',
        description: 'Parâmetros da máquina atualizados.',
      });
    } catch (error) {
      toaster.create({
        type: 'error',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar os parâmetros.',
      });
    }
  };

  if (!user || isLoading) return <Loader />;

  const renderNumberFields = (fields: NumberField[]) => (
    <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
      {fields.map(field => (
        <FormInput
          key={field.name}
          {...register(field.name, { valueAsNumber: true })}
          name={field.name}
          label={field.label}
          type="number"
          min={0}
          step={field.step ?? 1}
          bg="app.surface"
        />
      ))}
    </SimpleGrid>
  );

  return (
    <>
      <Head>
        <title>Parâmetros da Máquina | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Parâmetros da Máquina" />
        <chakra.form
          onSubmit={event => void handleSubmit(save)(event)}
          display="grid"
          gap={5}
        >
          {isError && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>
                  Não foi possível carregar a configuração.
                </Alert.Title>
              </Alert.Content>
            </Alert.Root>
          )}

          <Alert.Root status="warning" borderRadius="lg">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Configuração operacional</Alert.Title>
              <Alert.Description>
                Confirme qualquer alteração com o operador. Margens, kerf e o
                perfil Giben afetam geometria, preço e arquivos da máquina.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>

          <AppCard title="Geometria da seccionadora">
            <VStack align="stretch" gap={4}>
              <Text color="app.textSecondary">
                A margem externa começa em 10 mm. Em painéis internos, o acerto
                padrão é 7,5 mm em cada borda e aparece no desenho.
              </Text>
              {renderNumberFields(CUTTING_FIELDS)}
            </VStack>
          </AppCard>

          <AppCard title="Custos e otimização">
            <VStack align="stretch" gap={5}>
              {renderNumberFields(COST_FIELDS)}
              <Box>
                <Heading size="sm" mb={3}>
                  Pesos do modo equilibrado
                </Heading>
                {renderNumberFields(WEIGHT_FIELDS)}
              </Box>
            </VStack>
          </AppCard>

          <AppCard title="Exportação Giben / Cortecloud">
            <VStack align="stretch" gap={4}>
              <Text fontWeight="700">Perfil: giben-cortecloud-v1</Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <FormInput
                  {...register('exportProfile.labelImageDirectory')}
                  name="exportProfile.labelImageDirectory"
                  label="Diretório das imagens de etiqueta"
                />
                <FormInput
                  {...register('exportProfile.defaultEdgeBandDescription')}
                  name="exportProfile.defaultEdgeBandDescription"
                  label="Descrição padrão da fita"
                />
              </SimpleGrid>
              {renderNumberFields([
                {
                  name: 'exportProfile.defaultEdgeBandThicknessMm',
                  label: 'Espessura padrão da fita (mm)',
                  step: 0.1,
                },
                {
                  name: 'exportProfile.defaultEdgeBandHeightMm',
                  label: 'Altura padrão da fita (mm)',
                  step: 0.1,
                },
                {
                  name: 'exportProfile.defaultAcHeaderFlag',
                  label: 'Flag do cabeçalho AC (0 ou 1)',
                },
              ])}
            </VStack>
          </AppCard>

          <Button
            type="submit"
            loading={isSubmitting}
            alignSelf="flex-start"
            bg="app.ink"
            color="white"
            _hover={{ bg: 'app.inkHover' }}
          >
            Salvar parâmetros
          </Button>
        </chakra.form>
      </Dashboard>
    </>
  );
};

export default MachineSettingsPage;
