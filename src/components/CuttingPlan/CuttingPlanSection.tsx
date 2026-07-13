import {
  Alert,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaCheck,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaSave,
  FaSyncAlt,
  FaTimes,
} from 'react-icons/fa';
import { v4 } from 'uuid';

import type { CuttingPlan } from '@/domain/cutting-plan';
import type { CuttingPlanSearchProgress } from '@/domain/cutting-plan';
import {
  approveCuttingPlan,
  buildCuttingPlan,
  cutlistToCuttingPlanInput,
  cutlistToCuttingPlanPieces,
  CUTTING_PLAN_OPTIMIZATION_MODE,
  cuttingPlanMatchesPieces,
  markCuttingPlanOutdated,
} from '@/domain/cutting-plan';
import {
  CUTTING_MACHINE_QUERY_KEY,
  getCuttingMachineConfiguration,
} from '@/services/cuttingMachine.service';
import {
  CuttingPlanOptimizationCancelledError,
  type CuttingPlanOptimizationJob,
  startCuttingPlanOptimization,
} from '@/services/cuttingPlanOptimizer.service';
import type { Cutlist } from '@/types';
import { openCuttingPlanViewer } from '@/utils/cuttingPlanViewer';

import { CuttingPlanPreview } from './CuttingPlanPreview';

interface CuttingPlanSectionProps {
  cutlist: Cutlist[];
  onPlanChange: (plan: CuttingPlan) => void;
  orderId?: string;
  plan?: CuttingPlan;
  required?: boolean;
}

const statusLabel = {
  draft: 'Rascunho',
  approved: 'Aprovado',
  outdated: 'Desatualizado',
} as const;

const statusColor = {
  draft: 'yellow',
  approved: 'green',
  outdated: 'red',
} as const;

export const CuttingPlanSection = ({
  cutlist,
  onPlanChange,
  orderId = 'pending',
  plan,
  required = false,
}: CuttingPlanSectionProps) => {
  const [generating, setGenerating] = useState(false);
  const [searchProgress, setSearchProgress] =
    useState<CuttingPlanSearchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const optimizationJobRef = useRef<CuttingPlanOptimizationJob | null>(null);
  const {
    data: machineConfiguration,
    isLoading: isLoadingConfiguration,
    isError: isConfigurationError,
  } = useQuery({
    queryKey: CUTTING_MACHINE_QUERY_KEY,
    queryFn: getCuttingMachineConfiguration,
  });
  const pieces = useMemo(() => cutlistToCuttingPlanPieces(cutlist), [cutlist]);
  const piecesFingerprint = useMemo(() => JSON.stringify(pieces), [pieces]);
  const settingsFingerprint = machineConfiguration
    ? JSON.stringify(machineConfiguration.cutting)
    : '';

  useEffect(
    () => () => {
      optimizationJobRef.current?.cancel();
    },
    [],
  );

  useEffect(() => {
    optimizationJobRef.current?.cancel();
  }, [piecesFingerprint, settingsFingerprint]);

  useEffect(() => {
    const settingsChanged =
      machineConfiguration &&
      plan &&
      JSON.stringify(plan.settings) !== settingsFingerprint;
    if (
      plan &&
      plan.status !== 'outdated' &&
      (!cuttingPlanMatchesPieces(plan, pieces) || settingsChanged)
    ) {
      onPlanChange(
        markCuttingPlanOutdated(plan, Timestamp.fromDate(new Date())),
      );
    }
    // Fingerprints representam as mudanças relevantes. O callback do parent
    // pode mudar de referência sem tornar o plano obsoleto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piecesFingerprint, settingsFingerprint, plan?.id, plan?.status]);

  const generate = async () => {
    if (!machineConfiguration) return;
    setGenerating(true);
    setSearchProgress(null);
    setError(null);
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      const job = startCuttingPlanOptimization(
        cutlistToCuttingPlanInput({
          cutlist,
          optimizationMode: CUTTING_PLAN_OPTIMIZATION_MODE,
          settings: machineConfiguration.cutting,
        }),
        {
          maxDurationMs: 60_000,
          stagnationMs: 10_000,
          onProgress: setSearchProgress,
        },
      );
      optimizationJobRef.current = job;
      const result = await job.promise;
      onPlanChange(
        buildCuttingPlan({
          id: v4(),
          orderId,
          previousPlan: plan,
          result,
          timestamp: Timestamp.fromDate(new Date()),
        }),
      );
    } catch (generationError) {
      if (generationError instanceof CuttingPlanOptimizationCancelledError) {
        return;
      }
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Não foi possível gerar o plano de corte.',
      );
    } finally {
      optimizationJobRef.current = null;
      setGenerating(false);
    }
  };

  const cancelGeneration = () => {
    optimizationJobRef.current?.cancel();
  };

  const saveDraft = () => {
    if (!plan || plan.status === 'outdated') return;
    onPlanChange({
      ...plan,
      status: 'draft',
      approvedAt: undefined,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  };

  const approve = () => {
    if (!plan || plan.status === 'outdated') return;
    onPlanChange(approveCuttingPlan(plan, Timestamp.fromDate(new Date())));
  };

  return (
    <Box
      bg="white"
      borderRadius="xl"
      shadow="sm"
      borderWidth="1px"
      borderColor="gray.200"
      mt={6}
      overflow="hidden"
      data-testid="cutting-plan-section"
    >
      <Flex
        p={6}
        bg="gray.50"
        borderBottomWidth="1px"
        borderColor="gray.200"
        justify="space-between"
        align="center"
        gap={4}
        wrap="wrap"
      >
        <Box>
          <Heading size="md">Plano de corte 2D</Heading>
          <Text fontSize="sm" color="gray.600" mt={1}>
            Otimize todas as peças do pedido antes de confirmar.
          </Text>
        </Box>
        {plan && (
          <Badge colorScheme={statusColor[plan.status]} px={3} py={1}>
            {statusLabel[plan.status]} · versão {plan.version}
          </Badge>
        )}
      </Flex>

      <Stack gap={5} p={6}>
        {required && (!plan || plan.status === 'outdated') && (
          <Alert.Root status="warning" borderRadius="md">
            <Alert.Indicator>
              <FaExclamationTriangle />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>
                Gere um plano atualizado antes de finalizar.
              </Alert.Title>
              <Alert.Description>
                Alterações nas peças ou na máquina exigem uma nova geração.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {isConfigurationError && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Parâmetros da máquina indisponíveis.</Alert.Title>
              <Alert.Description>
                Verifique a configuração antes de gerar o plano.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <Box>
          <Text fontSize="sm" fontWeight="700" mb={1}>
            Otimização automática
          </Text>
          <Text fontSize="sm" color="gray.600">
            O otimizador testa diferentes combinações em background e conserva
            sempre a melhor. Ele para após 10 segundos sem melhora ou, no
            máximo, em 1 minuto.
          </Text>
          <Text fontSize="xs" color="gray.500" mt={2}>
            Margens, serra e custos vêm dos{' '}
            <Link href="/cortes/configuracoes-maquina">
              parâmetros globais da máquina
            </Link>
            .
          </Text>
        </Box>

        {error && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Erro ao gerar o plano</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {generating && (
          <Flex
            role="status"
            align="center"
            justify="center"
            gap={3}
            py={8}
            color="orange.700"
            direction="column"
          >
            <Flex align="center" gap={3}>
              <Spinner color="orange.500" />
              <Text fontWeight="700">Calculando o melhor plano...</Text>
            </Flex>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              {searchProgress
                ? `${searchProgress.candidatesTested} combinações testadas · melhor: ${searchProgress.bestMetrics.sheetCount} chapa(s), ${searchProgress.bestMetrics.movementCount} movimentos · ${Math.ceil(searchProgress.elapsedMs / 1000)}s`
                : 'Preparando a busca em background…'}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Você pode continuar preenchendo os demais dados enquanto isso.
            </Text>
            <Button size="sm" variant="outline" onClick={cancelGeneration}>
              <FaTimes /> Cancelar otimização
            </Button>
          </Flex>
        )}

        {!generating && plan && plan.status !== 'outdated' && (
          <CuttingPlanPreview plan={plan} />
        )}

        <Flex gap={3} justify="flex-end" wrap="wrap">
          <Button
            variant="outline"
            onClick={() => {
              if (plan && plan.status !== 'outdated') {
                openCuttingPlanViewer(plan);
              }
            }}
            disabled={!plan || plan.status === 'outdated' || generating}
          >
            <FaExternalLinkAlt /> Visualizar em nova aba
          </Button>
          <Button
            variant="outline"
            onClick={saveDraft}
            disabled={!plan || plan.status === 'outdated' || generating}
          >
            <FaSave /> Salvar rascunho
          </Button>
          <Button
            colorScheme="green"
            onClick={approve}
            disabled={!plan || plan.status === 'outdated' || generating}
          >
            <FaCheck /> Aprovar plano
          </Button>
          <Button
            colorScheme="orange"
            onClick={() => void generate()}
            disabled={
              cutlist.length === 0 ||
              generating ||
              isLoadingConfiguration ||
              !machineConfiguration
            }
          >
            {generating ? <Spinner size="sm" /> : <FaSyncAlt />}
            {plan ? 'Gerar novamente' : 'Gerar plano de corte'}
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
};
