import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCompressArrowsAlt,
  FaSearchMinus,
  FaSearchPlus,
} from 'react-icons/fa';

import type {
  CuttingPlan,
  CuttingPlanPlacement,
  EdgeBandEdge,
} from '@/domain/cutting-plan';

import { CuttingPlanLegend } from './CuttingPlanLegend';
import { CuttingSheetSvg } from './CuttingSheetSvg';

interface CuttingPlanViewerProps {
  plan: CuttingPlan;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

const clampZoom = (value: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));

const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const edgeName: Record<EdgeBandEdge, string> = {
  top: 'superior',
  right: 'direita',
  bottom: 'inferior',
  left: 'esquerda',
};

const grainDescription = (placement: CuttingPlanPlacement) => {
  if (placement.grainDirection === 'none') return 'Sem sentido obrigatório';
  return placement.grainDirection === 'along_length'
    ? 'Horizontal (lado maior)'
    : 'Vertical (lado menor)';
};

export const CuttingPlanViewer = ({ plan }: CuttingPlanViewerProps) => {
  const [sheetIndex, setSheetIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectedPiece, setSelectedPiece] =
    useState<CuttingPlanPlacement | null>(null);

  const sheet = plan.sheets[sheetIndex];
  const offcuts = useMemo(
    () =>
      sheet.wasteRegions.filter(region => region.reason === 'remainder').length,
    [sheet],
  );

  useEffect(() => {
    setSelectedPiece(null);
    setZoom(1);
  }, [sheet.id]);

  const changeSheet = (nextIndex: number) => {
    setSheetIndex(Math.min(plan.sheets.length - 1, Math.max(0, nextIndex)));
  };

  const changeZoom = (nextZoom: number) => setZoom(clampZoom(nextZoom));

  return (
    <Box minH="100vh" bg="gray.100" color="gray.900">
      <Box bg="gray.950" color="white" px={{ base: 4, md: 8 }} py={5}>
        <Flex justify="space-between" align="center" gap={5} wrap="wrap">
          <Box>
            <Text
              fontSize="xs"
              letterSpacing="widest"
              textTransform="uppercase"
              color="gray.400"
            >
              JRM · Visualização técnica
            </Text>
            <Heading size="lg" mt={1}>
              Plano de corte 2D
            </Heading>
            <Text color="gray.300" mt={1} fontSize="sm">
              Versão {plan.version} · {plan.metrics.sheetCount} chapa(s)
            </Text>
          </Box>
          <Box textAlign={{ base: 'left', md: 'right' }}>
            <Text color="gray.400" fontSize="xs" textTransform="uppercase">
              Valor do plano
            </Text>
            <Text fontSize="2xl" fontWeight="900">
              {brl(plan.pricing.totalCost)}
            </Text>
          </Box>
        </Flex>
      </Box>

      <Box px={{ base: 3, md: 6 }} py={5} maxW="1600px" mx="auto">
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} mb={4}>
          {[
            ['Chapas', plan.metrics.sheetCount],
            [
              'Aproveitamento',
              `${plan.metrics.utilizationPercentage.toFixed(2)}%`,
            ],
            ['Movimentos', plan.metrics.movementCount],
            [
              'Fita de borda',
              `${plan.metrics.edgeBandLengthMeters.toFixed(2)} m`,
            ],
          ].map(([label, value]) => (
            <Box
              key={label}
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              px={4}
              py={3}
            >
              <Text fontSize="xs" color="gray.500" textTransform="uppercase">
                {label}
              </Text>
              <Text fontWeight="800" fontSize="lg">
                {value}
              </Text>
            </Box>
          ))}
        </SimpleGrid>

        <Box
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="xl"
          overflow="hidden"
          shadow="sm"
        >
          <Flex
            px={{ base: 3, md: 5 }}
            py={3}
            borderBottomWidth="1px"
            borderColor="gray.200"
            justify="space-between"
            align="center"
            gap={3}
            wrap="wrap"
          >
            <HStack gap={2}>
              <Button
                size="sm"
                variant="outline"
                aria-label="Chapa anterior"
                disabled={sheetIndex === 0}
                onClick={() => changeSheet(sheetIndex - 1)}
              >
                <FaChevronLeft />
              </Button>
              <Box minW={{ base: 'auto', md: '230px' }} textAlign="center">
                <Text fontWeight="800">
                  Chapa {sheet.number} de {plan.sheets.length}
                </Text>
                <Text fontSize="xs" color="gray.500" lineClamp={1}>
                  {sheet.material.name}
                </Text>
              </Box>
              <Button
                size="sm"
                variant="outline"
                aria-label="Próxima chapa"
                disabled={sheetIndex === plan.sheets.length - 1}
                onClick={() => changeSheet(sheetIndex + 1)}
              >
                <FaChevronRight />
              </Button>
            </HStack>

            <HStack gap={2}>
              <Button
                size="sm"
                variant="outline"
                aria-label="Diminuir zoom"
                disabled={zoom <= MIN_ZOOM}
                onClick={() => changeZoom(zoom - ZOOM_STEP)}
              >
                <FaSearchMinus />
              </Button>
              <Badge
                variant="outline"
                colorPalette="gray"
                minW="62px"
                textAlign="center"
                py={1.5}
              >
                {Math.round(zoom * 100)}%
              </Badge>
              <Button
                size="sm"
                variant="outline"
                aria-label="Aumentar zoom"
                disabled={zoom >= MAX_ZOOM}
                onClick={() => changeZoom(zoom + ZOOM_STEP)}
              >
                <FaSearchPlus />
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label="Ajustar plano à tela"
                onClick={() => changeZoom(1)}
              >
                <FaCompressArrowsAlt /> Ajustar
              </Button>
            </HStack>
          </Flex>

          <Box px={{ base: 3, md: 5 }} py={3} borderBottomWidth="1px">
            <CuttingPlanLegend
              edgeTrimMm={plan.settings.edgeTrimMm}
              internalTrimMm={plan.settings.internalEdgeTrimMm}
            />
          </Box>

          <Grid templateColumns={{ base: '1fr', xl: 'minmax(0, 1fr) 330px' }}>
            <Box
              bg="gray.100"
              overflow="auto"
              minH={{ base: '520px', md: '720px' }}
              maxH="calc(100vh - 210px)"
              p={{ base: 3, md: 6 }}
              onWheel={event => {
                if (!event.ctrlKey && !event.metaKey) return;
                event.preventDefault();
                changeZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
              }}
              data-testid="cutting-plan-canvas"
            >
              <Box
                width={`${zoom * 100}%`}
                minW={`${zoom * 430}px`}
                mx="auto"
                bg="white"
                shadow="md"
                transition="width 120ms ease"
              >
                <CuttingSheetSvg
                  sheet={sheet}
                  selectedPieceId={selectedPiece?.id}
                  onPieceSelect={setSelectedPiece}
                />
              </Box>
            </Box>

            <Box
              borderLeftWidth={{ base: 0, xl: '1px' }}
              borderTopWidth={{ base: '1px', xl: 0 }}
              borderColor="gray.200"
              p={5}
              bg="white"
            >
              <Stack gap={5}>
                <Box>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textTransform="uppercase"
                  >
                    Chapa atual
                  </Text>
                  <Heading size="sm" mt={1}>
                    {sheet.totalWidthMm} × {sheet.totalLengthMm} mm
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {sheet.placements.length} peça(s) · {offcuts} sobra(s)
                  </Text>
                </Box>

                <Box borderTopWidth="1px" borderColor="gray.200" pt={4}>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textTransform="uppercase"
                  >
                    Peça selecionada
                  </Text>
                  {selectedPiece ? (
                    <Stack gap={3} mt={3} data-testid="selected-piece-info">
                      <Heading size="md">{selectedPiece.description}</Heading>
                      <Box>
                        <Text fontSize="xs" color="gray.500">
                          Dimensões no plano
                        </Text>
                        <Text fontSize="xl" fontWeight="900">
                          {Math.round(selectedPiece.widthMm)} ×{' '}
                          {Math.round(selectedPiece.heightMm)} mm
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500">
                          Sentido do veio
                        </Text>
                        <Text fontWeight="700">
                          {grainDescription(selectedPiece)}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500">
                          Orientação no aproveitamento
                        </Text>
                        <Text fontWeight="700">
                          {selectedPiece.rotated ? 'Rotacionada' : 'Original'}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500">
                          Fita de borda
                        </Text>
                        <Text fontWeight="700">
                          {selectedPiece.edgeBandEdges.length
                            ? selectedPiece.edgeBandEdges
                                .map(edge => edgeName[edge])
                                .join(', ')
                            : 'Sem fita'}
                        </Text>
                      </Box>
                    </Stack>
                  ) : (
                    <Text fontSize="sm" color="gray.500" mt={3}>
                      Clique em uma peça no desenho para ver identificação,
                      medidas, veio e acabamento de borda.
                    </Text>
                  )}
                </Box>

                <Text fontSize="xs" color="gray.500">
                  As coordenadas do desenho estão em milímetros e preservam a
                  proporção exata. O zoom altera apenas o tamanho de exibição.
                </Text>
              </Stack>
            </Box>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};
