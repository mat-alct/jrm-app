import { Box, Flex, Text } from '@chakra-ui/react';
import React from 'react';

import type { CuttingPlan } from '@/domain/cutting-plan';

import { CuttingPlanLegend } from './CuttingPlanLegend';
import { CuttingSheetSvg } from './CuttingSheetSvg';

interface CuttingPlanPrintableProps {
  forcePageBreakAfter?: boolean;
  orderCode?: number | string;
  plan: CuttingPlan;
}

const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export const isPrintableCuttingPlan = (
  plan?: CuttingPlan,
): plan is CuttingPlan => Boolean(plan && plan.status !== 'outdated');

export const CuttingPlanPrintable = ({
  forcePageBreakAfter = false,
  orderCode,
  plan,
}: CuttingPlanPrintableProps) => {
  return (
    <Box data-testid="printable-cutting-plan" color="black" bg="white">
      <style type="text/css" media="print">
        {`
          .cutting-plan-print-page {
            width: 200mm;
            min-height: 277mm;
            box-sizing: border-box;
            break-inside: avoid;
          }
        `}
      </style>
      {plan.sheets.map((sheet, pageIndex) => {
        const shouldBreak =
          pageIndex < plan.sheets.length - 1 || forcePageBreakAfter;
        return (
          <Box
            key={sheet.id}
            className="cutting-plan-print-page"
            p="4mm"
            style={{ pageBreakAfter: shouldBreak ? 'always' : 'auto' }}
          >
            <Flex
              justify="space-between"
              align="flex-start"
              borderBottom="2px solid black"
              pb={2}
              mb={2}
            >
              <Box>
                <Text fontWeight="900" fontSize="18px">
                  PLANO DE CORTE 2D
                </Text>
                <Text fontSize="10px">
                  Pedido {orderCode ? `#${orderCode}` : 'sem código'} · versão{' '}
                  {plan.version} ·{' '}
                  {plan.status === 'approved' ? 'APROVADO' : 'RASCUNHO'}
                </Text>
              </Box>
              <Box textAlign="right" fontSize="10px">
                <Text fontWeight="800">
                  {plan.metrics.sheetCount} chapa(s) ·{' '}
                  {plan.metrics.movementCount} movimentos
                </Text>
                <Text>
                  Aproveitamento {plan.metrics.utilizationPercentage.toFixed(2)}
                  %
                </Text>
                <Text fontWeight="800">
                  Total {brl(plan.pricing.totalCost)}
                </Text>
              </Box>
            </Flex>

            <Flex justify="space-between" align="center" gap={2} mb={2}>
              <Text fontSize="13px" fontWeight="900">
                Chapa {sheet.number} · {sheet.material.name}
              </Text>
              <Text fontSize="9px">
                Total {sheet.totalWidthMm} × {sheet.totalLengthMm} mm · útil{' '}
                {sheet.usableArea.widthMm} × {sheet.usableArea.heightMm} mm
              </Text>
            </Flex>
            <CuttingPlanLegend compact />
            <Box
              mt={2}
              border="1px solid black"
              height="225mm"
              display="flex"
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
            >
              <CuttingSheetSvg sheet={sheet} compact />
            </Box>
            <Flex
              justify="space-between"
              gap={3}
              mt={2}
              fontSize="9px"
              borderTop="1px solid black"
              pt={1}
            >
              <Text>
                Chapa(s): <strong>{brl(plan.pricing.sheetsCost)}</strong>
              </Text>
              <Text>
                Cortes: <strong>{brl(plan.pricing.movementsCost)}</strong>
              </Text>
              <Text>
                Fita ({plan.metrics.edgeBandLengthMeters.toFixed(2)} m):{' '}
                <strong>{brl(plan.pricing.edgeBandCost)}</strong>
              </Text>
              <Text>
                Sobras:{' '}
                <strong>
                  {
                    sheet.wasteRegions.filter(
                      waste => waste.reason === 'remainder',
                    ).length
                  }
                </strong>
              </Text>
            </Flex>
          </Box>
        );
      })}
    </Box>
  );
};
