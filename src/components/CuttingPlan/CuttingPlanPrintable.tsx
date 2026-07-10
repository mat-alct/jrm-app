import { Box, Flex, Text } from '@chakra-ui/react';
import React, { useMemo } from 'react';

import type { CuttingPlan, CuttingPlanCut } from '@/domain/cutting-plan';

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

const chunks = <T,>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const cutKind = (cut: CuttingPlanCut) =>
  cut.kind === 'edge_trim' ? 'Refino' : 'Corte';

export const isPrintableCuttingPlan = (
  plan?: CuttingPlan,
): plan is CuttingPlan => Boolean(plan && plan.status !== 'outdated');

export const CuttingPlanPrintable = ({
  forcePageBreakAfter = false,
  orderCode,
  plan,
}: CuttingPlanPrintableProps) => {
  const pages = useMemo(() => {
    const diagramPages = plan.sheets.map(sheet => ({
      type: 'diagram' as const,
      id: `diagram-${sheet.id}`,
      sheet,
    }));
    const cutPages = plan.sheets.flatMap(sheet =>
      chunks(sheet.cuts, 24).map((cutsOnPage, index) => ({
        type: 'cuts' as const,
        id: `cuts-${sheet.id}-${index}`,
        sheet,
        cuts: cutsOnPage,
        page: index + 1,
        pages: Math.ceil(sheet.cuts.length / 24),
      })),
    );
    return [...diagramPages, ...cutPages];
  }, [plan.sheets]);

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
      {pages.map((page, pageIndex) => {
        const shouldBreak = pageIndex < pages.length - 1 || forcePageBreakAfter;
        return (
          <Box
            key={page.id}
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

            {page.type === 'diagram' ? (
              <>
                <Flex justify="space-between" align="center" gap={2} mb={2}>
                  <Text fontSize="13px" fontWeight="900">
                    Chapa {page.sheet.number} · {page.sheet.material.name}
                  </Text>
                  <Text fontSize="9px">
                    Total {page.sheet.totalWidthMm} × {page.sheet.totalLengthMm}{' '}
                    mm · útil {page.sheet.usableArea.widthMm} ×{' '}
                    {page.sheet.usableArea.heightMm} mm
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
                  <CuttingSheetSvg sheet={page.sheet} compact />
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
                        page.sheet.wasteRegions.filter(
                          waste => waste.reason === 'remainder',
                        ).length
                      }
                    </strong>
                  </Text>
                </Flex>
              </>
            ) : (
              <>
                <Flex justify="space-between" mb={3}>
                  <Text fontSize="14px" fontWeight="900">
                    Sequência de corte · chapa {page.sheet.number}
                  </Text>
                  <Text fontSize="10px">
                    Página {page.page}/{page.pages}
                  </Text>
                </Flex>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '9px',
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        'Etapa',
                        'Operação',
                        'Orientação',
                        'Painel / faixa',
                        'Posição',
                        'Curso',
                        'Kerf',
                        'Perda int.',
                      ].map(label => (
                        <th
                          key={label}
                          style={{
                            border: '1px solid #111',
                            padding: '5px 3px',
                            textAlign: 'left',
                            background: '#e5e7eb',
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.cuts.map(cut => (
                      <tr key={cut.id}>
                        <td
                          style={{
                            border: '1px solid #555',
                            padding: '5px 3px',
                          }}
                        >
                          <strong>{cut.step}</strong>
                        </td>
                        <td
                          style={{
                            border: '1px solid #555',
                            padding: '5px 3px',
                          }}
                        >
                          {cutKind(cut)}
                        </td>
                        <td
                          style={{
                            border: '1px solid #555',
                            padding: '5px 3px',
                          }}
                        >
                          {cut.orientation === 'vertical'
                            ? 'Vertical'
                            : 'Horizontal'}
                        </td>
                        <td
                          style={{
                            border: '1px solid #555',
                            padding: '5px 3px',
                          }}
                        >
                          {cut.targetRegionId}
                        </td>
                        <td
                          style={{
                            border: '1px solid #555',
                            padding: '5px 3px',
                          }}
                        >
                          {cut.positionMm.toFixed(1)} mm
                        </td>
                        <td
                          style={{
                            border: '1px solid #555',
                            padding: '5px 3px',
                          }}
                        >
                          {cut.lengthMm.toFixed(1)} mm
                        </td>
                        <td
                          style={{
                            border: '1px solid #555',
                            padding: '5px 3px',
                          }}
                        >
                          {cut.kerfLossMm.toFixed(1)} mm
                        </td>
                        <td
                          style={{
                            border: '1px solid #555',
                            padding: '5px 3px',
                          }}
                        >
                          {cut.internalCutLossMm.toFixed(1)} mm
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
