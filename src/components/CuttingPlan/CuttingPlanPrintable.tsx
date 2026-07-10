import { Box, Flex, Grid, Text } from '@chakra-ui/react';
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

            <Flex justify="space-between" align="center" gap={2} mb={1}>
              <Text fontSize="13px" fontWeight="900">
                Chapa {sheet.number}/{plan.sheets.length} ·{' '}
                {sheet.material.name}
              </Text>
              <Text fontSize="9px">
                Total {sheet.totalWidthMm} × {sheet.totalLengthMm} mm · útil{' '}
                {sheet.usableArea.widthMm} × {sheet.usableArea.heightMm} mm
              </Text>
            </Flex>
            <CuttingPlanLegend
              compact
              edgeTrimMm={plan.settings.edgeTrimMm}
              internalTrimMm={plan.settings.internalEdgeTrimMm}
            />
            <Box
              mt={1}
              border="1px solid black"
              height="176mm"
              display="flex"
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
            >
              <CuttingSheetSvg sheet={sheet} compact maxHeight="172mm" />
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

            <Grid templateColumns="1.45fr 1fr" gap="3mm" mt="2mm">
              <Box>
                <Text
                  fontSize="8px"
                  fontWeight="900"
                  textTransform="uppercase"
                  borderBottom="1px solid black"
                  pb="1px"
                  mb="1px"
                >
                  Peças nesta chapa
                </Text>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                    fontSize: '7px',
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: '10%', textAlign: 'left' }}>#</th>
                      <th style={{ width: '46%', textAlign: 'left' }}>
                        Identificação
                      </th>
                      <th style={{ width: '31%', textAlign: 'left' }}>
                        Medidas
                      </th>
                      <th style={{ width: '13%', textAlign: 'center' }}>
                        Fitas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.placements.slice(0, 8).map((placement, index) => (
                      <tr key={placement.id}>
                        <td style={{ borderTop: '1px solid #d1d5db' }}>
                          {index + 1}
                        </td>
                        <td
                          style={{
                            borderTop: '1px solid #d1d5db',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {placement.description}
                        </td>
                        <td style={{ borderTop: '1px solid #d1d5db' }}>
                          {Math.round(placement.widthMm)} ×{' '}
                          {Math.round(placement.heightMm)}
                        </td>
                        <td
                          style={{
                            borderTop: '1px solid #d1d5db',
                            textAlign: 'center',
                          }}
                        >
                          {placement.edgeBandEdges.length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sheet.placements.length > 8 && (
                  <Text fontSize="7px" mt="1px">
                    + {sheet.placements.length - 8} peça(s) identificada(s) no
                    desenho
                  </Text>
                )}
              </Box>

              <Box>
                <Text
                  fontSize="8px"
                  fontWeight="900"
                  textTransform="uppercase"
                  borderBottom="1px solid black"
                  pb="1px"
                  mb="1px"
                >
                  Sobras da chapa
                </Text>
                {sheet.wasteRegions.filter(
                  region => region.reason === 'remainder',
                ).length ? (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '7px',
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>#</th>
                        <th style={{ textAlign: 'left' }}>Medidas</th>
                        <th style={{ textAlign: 'right' }}>Área</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.wasteRegions
                        .filter(region => region.reason === 'remainder')
                        .slice(0, 8)
                        .map((region, index) => (
                          <tr key={region.id}>
                            <td style={{ borderTop: '1px solid #d1d5db' }}>
                              {String.fromCharCode(65 + index)}
                            </td>
                            <td style={{ borderTop: '1px solid #d1d5db' }}>
                              {Math.round(region.widthMm)} ×{' '}
                              {Math.round(region.heightMm)}
                            </td>
                            <td
                              style={{
                                borderTop: '1px solid #d1d5db',
                                textAlign: 'right',
                              }}
                            >
                              {(
                                (region.widthMm * region.heightMm) /
                                1_000_000
                              ).toFixed(2)}{' '}
                              m²
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <Text fontSize="7px">Sem sobra registrada.</Text>
                )}
              </Box>
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
};
