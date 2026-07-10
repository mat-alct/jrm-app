import {
  Badge,
  Box,
  Flex,
  Grid,
  Heading,
  SimpleGrid,
  Table,
  Text,
} from '@chakra-ui/react';
import React from 'react';

import type { CuttingPlanResult } from '@/domain/cutting-plan';

import { CuttingPlanLegend } from './CuttingPlanLegend';
import { CuttingSheetSvg } from './CuttingSheetSvg';

interface CuttingPlanPreviewProps {
  compact?: boolean;
  plan: CuttingPlanResult;
  showCutSequence?: boolean;
}

const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const squareMeters = (areaMm2: number) =>
  `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(
    areaMm2 / 1_000_000,
  )} m²`;

const modeLabel = {
  fewer_cuts: 'Menos movimentos',
  best_yield: 'Maior aproveitamento',
  balanced: 'Equilibrado',
} as const;

const Metric = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
    <Text fontSize="xs" color="gray.500" textTransform="uppercase">
      {label}
    </Text>
    <Text fontSize="lg" fontWeight="800" color="gray.800">
      {value}
    </Text>
  </Box>
);

export const CuttingPlanPreview = ({
  compact = false,
  plan,
  showCutSequence = false,
}: CuttingPlanPreviewProps) => {
  const offcutCount = plan.sheets.reduce(
    (total, sheet) =>
      total +
      sheet.wasteRegions.filter(region => region.reason === 'remainder').length,
    0,
  );

  return (
    <Box data-testid="cutting-plan-preview">
      {!compact && (
        <>
          <Flex
            align="center"
            justify="space-between"
            gap={3}
            mb={4}
            wrap="wrap"
          >
            <Heading size="md">Resultado do plano</Heading>
            <Badge colorScheme="orange" variant="subtle" px={3} py={1}>
              {modeLabel[plan.optimizationMode]}
            </Badge>
          </Flex>
          <SimpleGrid columns={[2, 2, 4]} gap={3} mb={5}>
            <Metric label="Chapas" value={plan.metrics.sheetCount} />
            <Metric
              label="Aproveitamento"
              value={`${plan.metrics.utilizationPercentage.toFixed(2)}%`}
            />
            <Metric
              label="Sobras"
              value={`${plan.metrics.offcutPercentage.toFixed(2)}%`}
            />
            <Metric label="Movimentos" value={plan.metrics.movementCount} />
            <Metric
              label="Custo das chapas"
              value={brl(plan.pricing.sheetsCost)}
            />
            <Metric
              label="Custo dos cortes"
              value={brl(plan.pricing.movementsCost)}
            />
            <Metric
              label="Custo da fita"
              value={brl(plan.pricing.edgeBandCost)}
            />
            <Metric label="Valor total" value={brl(plan.pricing.totalCost)} />
          </SimpleGrid>
          <Flex
            bg="green.50"
            borderWidth="1px"
            borderColor="green.200"
            borderRadius="md"
            px={4}
            py={3}
            justify="space-between"
            gap={3}
            mb={5}
            wrap="wrap"
          >
            <Text fontWeight="700" color="green.800">
              Sobras: {offcutCount}
            </Text>
            <Text color="green.800">
              {squareMeters(plan.metrics.offcutAreaMm2)}
            </Text>
          </Flex>
        </>
      )}

      <CuttingPlanLegend compact={compact} />

      <Grid gap={compact ? 2 : 5} mt={compact ? 2 : 4}>
        {plan.sheets.map(sheet => (
          <Box
            key={sheet.id}
            borderWidth="1px"
            borderColor="gray.300"
            borderRadius={compact ? 0 : 'lg'}
            p={compact ? 1 : 4}
            bg="white"
            breakInside="avoid"
          >
            <Flex justify="space-between" gap={3} mb={2} wrap="wrap">
              <Text fontWeight="800">
                Chapa {sheet.number} · {sheet.material.name}
              </Text>
              <Text fontSize="xs" color="gray.600">
                Total {sheet.totalWidthMm} × {sheet.totalLengthMm} mm · útil{' '}
                {sheet.usableArea.widthMm} × {sheet.usableArea.heightMm} mm
              </Text>
            </Flex>
            <CuttingSheetSvg sheet={sheet} compact={compact} />
          </Box>
        ))}
      </Grid>

      {!compact && (
        <Box mt={6} borderWidth="1px" borderColor="gray.200" borderRadius="lg">
          <Box px={4} py={3} bg="gray.50" borderBottomWidth="1px">
            <Heading size="sm">Composição de custos</Heading>
          </Box>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Item</Table.ColumnHeader>
                <Table.ColumnHeader>Quantidade</Table.ColumnHeader>
                <Table.ColumnHeader>Unitário</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">
                  Subtotal
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {plan.pricing.sheetItems.map(item => (
                <Table.Row key={item.materialId}>
                  <Table.Cell>Chapa · {item.materialName}</Table.Cell>
                  <Table.Cell>{item.count}</Table.Cell>
                  <Table.Cell>{brl(item.unitPrice)}</Table.Cell>
                  <Table.Cell textAlign="right">
                    {brl(item.subtotal)}
                  </Table.Cell>
                </Table.Row>
              ))}
              <Table.Row>
                <Table.Cell>Movimentos da serra</Table.Cell>
                <Table.Cell>{plan.metrics.movementCount}</Table.Cell>
                <Table.Cell>{brl(plan.pricing.movementPrice)}</Table.Cell>
                <Table.Cell textAlign="right">
                  {brl(plan.pricing.movementsCost)}
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Fita de borda</Table.Cell>
                <Table.Cell>
                  {plan.metrics.edgeBandLengthMeters.toFixed(2)} m
                </Table.Cell>
                <Table.Cell>
                  {brl(plan.pricing.edgeBandPricePerMeter)}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  {brl(plan.pricing.edgeBandCost)}
                </Table.Cell>
              </Table.Row>
              <Table.Row fontWeight="800">
                <Table.Cell colSpan={3}>Total do plano</Table.Cell>
                <Table.Cell textAlign="right">
                  {brl(plan.pricing.totalCost)}
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </Box>
      )}

      {!compact && showCutSequence && (
        <Box mt={6} borderWidth="1px" borderColor="gray.200" borderRadius="lg">
          <Box px={4} py={3} bg="gray.50" borderBottomWidth="1px">
            <Heading size="sm">Ordem sugerida dos cortes</Heading>
          </Box>
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Etapa</Table.ColumnHeader>
                  <Table.ColumnHeader>Chapa / painel</Table.ColumnHeader>
                  <Table.ColumnHeader>Orientação</Table.ColumnHeader>
                  <Table.ColumnHeader>Posição</Table.ColumnHeader>
                  <Table.ColumnHeader>Curso</Table.ColumnHeader>
                  <Table.ColumnHeader>Kerf</Table.ColumnHeader>
                  <Table.ColumnHeader>Perda interna</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {plan.cutSequence.map(cut => (
                  <Table.Row key={cut.id}>
                    <Table.Cell fontWeight="700">{cut.step}</Table.Cell>
                    <Table.Cell>
                      {cut.sheetId} · {cut.targetRegionId}
                    </Table.Cell>
                    <Table.Cell>
                      {cut.orientation === 'horizontal'
                        ? 'Horizontal'
                        : 'Vertical'}
                    </Table.Cell>
                    <Table.Cell>{cut.positionMm.toFixed(1)} mm</Table.Cell>
                    <Table.Cell>{cut.lengthMm.toFixed(1)} mm</Table.Cell>
                    <Table.Cell>{cut.kerfLossMm.toFixed(1)} mm</Table.Cell>
                    <Table.Cell>
                      {cut.internalCutLossMm.toFixed(1)} mm
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </Box>
      )}
    </Box>
  );
};
