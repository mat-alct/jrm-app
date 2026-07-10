import {
  Alert,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Input,
  RadioGroup,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { Timestamp } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FaCheck,
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
  FaSave,
  FaSyncAlt,
} from 'react-icons/fa';
import { v4 } from 'uuid';

import type {
  CuttingPlan,
  CuttingPlanOptimizationMode,
  CuttingPlanSettings,
} from '@/domain/cutting-plan';
import {
  approveCuttingPlan,
  buildCuttingPlan,
  cutlistToCuttingPlanInput,
  cutlistToCuttingPlanPieces,
  cuttingPlanMatchesPieces,
  DEFAULT_CUTTING_PLAN_SETTINGS,
  generateCuttingPlan,
  markCuttingPlanOutdated,
} from '@/domain/cutting-plan';
import type { Cutlist } from '@/types';

import { CuttingPlanPreview } from './CuttingPlanPreview';

interface CuttingPlanSectionProps {
  cutlist: Cutlist[];
  onPlanChange: (plan: CuttingPlan) => void;
  orderId?: string;
  plan?: CuttingPlan;
  required?: boolean;
}

const cloneDefaultSettings = (): CuttingPlanSettings => ({
  ...DEFAULT_CUTTING_PLAN_SETTINGS,
  balancedWeights: { ...DEFAULT_CUTTING_PLAN_SETTINGS.balancedWeights },
});

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

interface SettingInputProps {
  label: string;
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}

const SettingInput = ({
  label,
  min = 0,
  onChange,
  step = 1,
  value,
}: SettingInputProps) => (
  <Box>
    <Text as="label" display="block" fontSize="xs" fontWeight="700" mb={1}>
      {label}
    </Text>
    <Input
      aria-label={label}
      type="number"
      min={min}
      step={step}
      value={value}
      onChange={event => onChange(Number(event.target.value))}
      bg="white"
    />
  </Box>
);

export const CuttingPlanSection = ({
  cutlist,
  onPlanChange,
  orderId = 'pending',
  plan,
  required = false,
}: CuttingPlanSectionProps) => {
  const [optimizationMode, setOptimizationMode] =
    useState<CuttingPlanOptimizationMode>(plan?.optimizationMode ?? 'balanced');
  const [settings, setSettings] = useState<CuttingPlanSettings>(() =>
    plan
      ? {
          ...plan.settings,
          balancedWeights: { ...plan.settings.balancedWeights },
        }
      : cloneDefaultSettings(),
  );
  const [showSettings, setShowSettings] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pieces = useMemo(() => cutlistToCuttingPlanPieces(cutlist), [cutlist]);
  const piecesFingerprint = useMemo(() => JSON.stringify(pieces), [pieces]);

  useEffect(() => {
    if (
      plan &&
      plan.status !== 'outdated' &&
      !cuttingPlanMatchesPieces(plan, pieces)
    ) {
      onPlanChange(
        markCuttingPlanOutdated(plan, Timestamp.fromDate(new Date())),
      );
    }
    // `piecesFingerprint` representa qualquer alteração relevante no cadastro.
    // O callback do parent pode mudar de referência sem tornar o plano obsoleto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piecesFingerprint, plan?.id, plan?.status]);

  const updateSettings = (
    update: (current: CuttingPlanSettings) => CuttingPlanSettings,
  ) => {
    setSettings(current => update(current));
    if (plan && plan.status !== 'outdated') {
      onPlanChange(
        markCuttingPlanOutdated(plan, Timestamp.fromDate(new Date())),
      );
    }
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      // Entrega um frame ao React para que o estado de carregamento seja visível
      // antes do cálculo síncrono e puro começar.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      const result = generateCuttingPlan(
        cutlistToCuttingPlanInput({ cutlist, optimizationMode, settings }),
      );
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
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Não foi possível gerar o plano de corte.',
      );
    } finally {
      setGenerating(false);
    }
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
                Qualquer alteração nas peças exige uma nova geração.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <Box>
          <Text fontSize="sm" fontWeight="700" mb={2}>
            Estratégia de otimização
          </Text>
          <RadioGroup.Root
            value={optimizationMode}
            onValueChange={event => {
              if (event.value) {
                setOptimizationMode(event.value as CuttingPlanOptimizationMode);
              }
            }}
            colorScheme="orange"
          >
            <Flex gap={3} wrap="wrap">
              {[
                ['fewer_cuts', 'Menos movimentos'],
                ['best_yield', 'Maior aproveitamento'],
                ['balanced', 'Equilibrado'],
              ].map(([value, label]) => (
                <RadioGroup.Item
                  key={value}
                  value={value}
                  borderWidth="1px"
                  borderColor="gray.300"
                  borderRadius="md"
                  px={3}
                  py={2}
                >
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemIndicator />
                  <RadioGroup.ItemText>{label}</RadioGroup.ItemText>
                </RadioGroup.Item>
              ))}
            </Flex>
          </RadioGroup.Root>
        </Box>

        <Box>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(current => !current)}
          >
            {showSettings ? <FaChevronUp /> : <FaChevronDown />}
            Parâmetros da máquina e custos
          </Button>
          {showSettings && (
            <Box mt={3} p={4} bg="gray.50" borderRadius="lg">
              <SimpleGrid columns={[1, 2, 4]} gap={3}>
                <SettingInput
                  label="Largura da chapa (mm)"
                  min={1}
                  value={settings.sheetWidthMm}
                  onChange={value =>
                    updateSettings(current => ({
                      ...current,
                      sheetWidthMm: value,
                    }))
                  }
                />
                <SettingInput
                  label="Comprimento da chapa (mm)"
                  min={1}
                  value={settings.sheetLengthMm}
                  onChange={value =>
                    updateSettings(current => ({
                      ...current,
                      sheetLengthMm: value,
                    }))
                  }
                />
                <SettingInput
                  label="Refino das bordas (mm)"
                  value={settings.edgeTrimMm}
                  onChange={value =>
                    updateSettings(current => ({
                      ...current,
                      edgeTrimMm: value,
                    }))
                  }
                />
                <SettingInput
                  label="Espessura da serra — kerf (mm)"
                  step={0.1}
                  value={settings.kerfMm}
                  onChange={value =>
                    updateSettings(current => ({ ...current, kerfMm: value }))
                  }
                />
                <SettingInput
                  label="Perda interna da seccionadora (mm)"
                  step={0.5}
                  value={settings.internalCutLossMm}
                  onChange={value =>
                    updateSettings(current => ({
                      ...current,
                      internalCutLossMm: value,
                    }))
                  }
                />
                <SettingInput
                  label="Preço por movimento (R$)"
                  step={0.01}
                  value={settings.movementPrice}
                  onChange={value =>
                    updateSettings(current => ({
                      ...current,
                      movementPrice: value,
                    }))
                  }
                />
                <SettingInput
                  label="Preço da fita por metro (R$)"
                  step={0.01}
                  value={settings.edgeBandPricePerMeter}
                  onChange={value =>
                    updateSettings(current => ({
                      ...current,
                      edgeBandPricePerMeter: value,
                    }))
                  }
                />
                <SettingInput
                  label="Sobra mínima — largura (mm)"
                  value={settings.reusableWasteMinWidthMm}
                  onChange={value =>
                    updateSettings(current => ({
                      ...current,
                      reusableWasteMinWidthMm: value,
                    }))
                  }
                />
                <SettingInput
                  label="Sobra mínima — comprimento (mm)"
                  value={settings.reusableWasteMinLengthMm}
                  onChange={value =>
                    updateSettings(current => ({
                      ...current,
                      reusableWasteMinLengthMm: value,
                    }))
                  }
                />
                <SettingInput
                  label="Peso do desperdício"
                  step={0.05}
                  value={settings.balancedWeights.waste}
                  onChange={value =>
                    updateSettings(current => ({
                      ...current,
                      balancedWeights: {
                        ...current.balancedWeights,
                        waste: value,
                      },
                    }))
                  }
                />
                <SettingInput
                  label="Peso dos movimentos"
                  step={0.05}
                  value={settings.balancedWeights.movementCount}
                  onChange={value =>
                    updateSettings(current => ({
                      ...current,
                      balancedWeights: {
                        ...current.balancedWeights,
                        movementCount: value,
                      },
                    }))
                  }
                />
                <SettingInput
                  label="Peso das chapas"
                  step={0.05}
                  value={settings.balancedWeights.sheetCount}
                  onChange={value =>
                    updateSettings(current => ({
                      ...current,
                      balancedWeights: {
                        ...current.balancedWeights,
                        sheetCount: value,
                      },
                    }))
                  }
                />
              </SimpleGrid>
            </Box>
          )}
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
          >
            <Spinner color="orange.500" />
            <Text fontWeight="700">Calculando o melhor plano...</Text>
          </Flex>
        )}

        {!generating && plan && plan.status !== 'outdated' && (
          <CuttingPlanPreview plan={plan} />
        )}

        <Flex gap={3} justify="flex-end" wrap="wrap">
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
            disabled={cutlist.length === 0 || generating}
          >
            {generating ? <Spinner size="sm" /> : <FaSyncAlt />}
            {plan ? 'Gerar novamente' : 'Gerar plano de corte'}
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
};
