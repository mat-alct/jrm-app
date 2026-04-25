import {
  Box,
  Flex,
  Heading,
  Image,
  Text,
  Table,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import React, { useRef, useEffect, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { v4 } from 'uuid';

import { sortCutlistData } from '../../utils/cutlist/sortAndReturnTag';
import { Order } from '../../types';

interface OrderWithExtras extends Order {
  orderCode: number;
  orderPrice?: number;
  isUrgent?: boolean;
  amountDue?: string;
}

interface TagsProps {
  order: Order | null;
  onAfterPrint: () => void;
}

export const Tags: React.FC<TagsProps> = ({ order, onAfterPrint }) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const orderData = order as OrderWithExtras | null;

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: orderData ? `Etiquetas-${orderData.orderCode}` : 'Etiquetas',
    onAfterPrint: onAfterPrint,
  });

  useEffect(() => {
    if (orderData && componentRef.current) {
      handlePrint();
    }
  }, [orderData, handlePrint]);

  // --- 1. ORDENAÇÃO DO RESUMO ---
  const sortedSummary = useMemo(() => {
    if (!orderData) return [];

    return [...orderData.cutlist]
      .map(cut => {
        const { gside, pside } = sortCutlistData({
          sideA: cut.sideA,
          sideB: cut.sideB,
          borderA: cut.borderA,
          borderB: cut.borderB,
        });
        let qty = cut.hingeHolesQuantity;

        if (cut.hasHingeHoles && !qty) {
          const length = cut.hingeHolesSide === 'Maior' ? gside : pside;
          if (length < 800) qty = 2;
          else qty = 1 + Math.floor((length - 200) / 600);
        }
        return { ...cut, gside, pside, calculatedHolesQty: qty };
      })
      .sort((a, b) => {
        if (a.material.name !== b.material.name)
          return a.material.name.localeCompare(b.material.name);
        if (b.gside !== a.gside) return b.gside - a.gside;
        return b.pside - a.pside;
      });
  }, [orderData]);

  // --- 2. GERAÇÃO DAS ETIQUETAS ---
  const tagCutlist = useMemo(() => {
    if (!orderData) return [];

    const allTags = orderData.cutlist.flatMap(cut => {
      const tags = [];
      const { gside, pside, avatar } = sortCutlistData({
        sideA: cut.sideA,
        sideB: cut.sideB,
        borderA: cut.borderA,
        borderB: cut.borderB,
      });

      let qty = cut.hingeHolesQuantity;
      const length = cut.hingeHolesSide === 'Maior' ? gside : pside;
      if (cut.hasHingeHoles && !qty) {
        if (length < 800) qty = 2;
        else qty = 1 + Math.floor((length - 200) / 600);
      }
      if (cut.hasHingeHoles) qty = Math.max(2, qty || 0);

      for (let i = 0; i < cut.amount; i++) {
        tags.push({
          id: v4(),
          gside,
          pside,
          avatar,
          material: cut.material.name,
          hasHinge: cut.hasHingeHoles,
          hingeSide: cut.hingeHolesSide,
          hingeQuantity: qty,
          lengthForHoles: length,
        });
      }
      return tags;
    });

    const totalPieces = allTags.length;
    return allTags.map((tag, index) => ({
      ...tag,
      globalIndex: index + 1,
      globalTotal: totalPieces,
    }));
  }, [orderData]);

  if (!orderData) return null;

  return (
    <div style={{ display: 'none' }}>
      <div ref={componentRef} className="print-container">
        <style type="text/css" media="print">
          {`
            @page { size: A4; margin: 5mm; }
            .page-break { page-break-after: always; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: Arial, sans-serif; color: black; }
          `}
        </style>

        <Flex direction="column" px={2} py={2}>
          {/* --- CABEÇALHO COMPACTO --- */}
          <Box mb={2}>
            {orderData.isUrgent && (
              <Box
                w="100%"
                bg="black"
                color="white"
                textAlign="center"
                py={1}
                mb={1}
              >
                <Heading size="md" textTransform="uppercase">
                  PEDIDO URGENTE
                </Heading>
              </Box>
            )}

            {/* HEADER DA LOJA */}
            <Flex
              justify="center"
              align="center"
              borderBottom="1px solid black"
              pb={1}
              mb={1}
            >
              <Text
                fontWeight="900"
                fontSize="14px"
                textTransform="uppercase"
                letterSpacing="wide"
              >
                JRM - Casa do Marceneiro • (24) 99969-4543
              </Text>
            </Flex>

            {/* GRID DE DADOS */}
            <Box
              border="1px solid"
              borderColor="black"
              borderRadius="md"
              overflow="hidden"
            >
              {/* Barra de Título */}
              <Flex
                bg="gray.300"
                px={2}
                py={1}
                borderBottom="1px solid"
                borderColor="black"
                justify="space-between"
                align="center"
              >
                <Text fontWeight="800" fontSize="13px" color="black">
                  #{orderData.orderCode} —{' '}
                  {orderData.customer.name.toUpperCase()}
                </Text>

                {/* DATA DE ENTREGA */}
                <Box bg="black" color="white" px={2} py={0.5} borderRadius="sm">
                  <Text fontSize="12px" fontWeight="bold">
                    ENTREGA:{' '}
                    {orderData.deliveryDate
                      ? format(
                          new Date(orderData.deliveryDate.seconds * 1000),
                          'dd/MM/yyyy',
                        )
                      : 'N/A'}
                  </Text>
                </Box>
              </Flex>

              {/* AVISO DE EDIÇÃO (última apenas) */}
              {orderData.edits && orderData.edits.length > 0 && (
                <Box
                  bg="gray.100"
                  borderBottom="1px solid black"
                  px={2}
                  py={0.5}
                >
                  <Text fontSize="10px" fontWeight="bold" color="black">
                    Pedido editado por{' '}
                    {orderData.edits[orderData.edits.length - 1].editedBy}
                    {orderData.edits[orderData.edits.length - 1].editedAt
                      ?.seconds
                      ? ' em ' +
                        format(
                          new Date(
                            orderData.edits[orderData.edits.length - 1].editedAt
                              .seconds * 1000,
                          ),
                          "dd/MM/yyyy 'às' HH:mm",
                        )
                      : ''}
                  </Text>
                </Box>
              )}

              <Grid templateColumns="1.3fr 1.4fr 0.9fr" gap={0} fontSize="10px">
                {/* Coluna 1: Contato */}
                <GridItem p={1} borderRight="1px solid" borderColor="black">
                  <Text>
                    <b>Tel:</b> {orderData.customer.telephone}
                  </Text>
                  <Text>
                    <b>Vendedor:</b> {orderData.seller}
                  </Text>
                  <Text>
                    <b>Loja:</b> {orderData.orderStore}
                  </Text>
                </GridItem>

                {/* Coluna 2: Logística */}
                <GridItem p={1} borderRight="1px solid" borderColor="black">
                  <Text>
                    <b>Tipo:</b> {orderData.deliveryType}
                  </Text>
                  {orderData.deliveryType === 'Entrega' && (
                    <Text lineHeight="1.1" mt={0.5}>
                      <b>End:</b> {orderData.customer.address},{' '}
                      {orderData.customer.area}
                    </Text>
                  )}
                  {orderData.ps && (
                    <Text
                      mt={1}
                      fontWeight="bold"
                      bg="gray.100"
                      p={0.5}
                      borderRadius="sm"
                      border="1px dashed black"
                    >
                      OBS: {orderData.ps}
                    </Text>
                  )}
                </GridItem>

                {/* Coluna 3: Financeiro / Pagamento */}
                <GridItem
                  p={1}
                  display="flex"
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text fontSize="9px" fontWeight="bold">
                    TOTAL: R$ {orderData.orderPrice},00
                  </Text>

                  {/* STATUS EXPLÍCITO */}
                  <Text
                    fontSize="9px"
                    mt={0.5}
                    textAlign="center"
                    lineHeight="1.1"
                  >
                    {orderData.paymentType === 'Pago'
                      ? 'PAGO'
                      : 'RECEBER NA ENTREGA'}
                  </Text>

                  {orderData.paymentType === 'Pago' ? (
                    <Box
                      bg="black"
                      color="white"
                      px={3}
                      py={0.5}
                      mt={1}
                      borderRadius="sm"
                    >
                      <Text fontWeight="bold" fontSize="10px">
                        PAGO
                      </Text>
                    </Box>
                  ) : (
                    <Box
                      bg="white"
                      border="1px solid black"
                      px={1}
                      py={0.5}
                      mt={1}
                      borderRadius="sm"
                      textAlign="center"
                      w="100%"
                    >
                      <Text fontSize="8px" fontWeight="bold">
                        A RECEBER NA ENTREGA:
                      </Text>
                      <Text fontWeight="900" fontSize="11px">
                        R${' '}
                        {orderData.amountDue && orderData.amountDue !== '0'
                          ? orderData.amountDue
                          : orderData.orderPrice + ',00'}
                      </Text>
                    </Box>
                  )}
                </GridItem>
              </Grid>
            </Box>

            {/* --- RESUMO DE PEÇAS (LEGÍVEL E BONITO) --- */}
            <Flex mt={1} gap={2} align="stretch" height="auto">
              <Box
                flex="1"
                border="1px solid"
                borderColor="black"
                borderRadius="md"
                overflow="hidden"
              >
                {/* CABEÇALHO DA TABELA - PRETO PARA ALTO CONTRASTE */}
                <Table.Root size="sm" variant="outline">
                  <Table.Header>
                    <Table.Row h="18px" bg="black">
                      <Table.ColumnHeader
                        fontSize="9px"
                        py={0.5}
                        px={1}
                        color="white"
                        fontWeight="bold"
                        textAlign="center"
                        borderRight="1px solid white"
                      >
                        QTD
                      </Table.ColumnHeader>
                      <Table.ColumnHeader
                        fontSize="9px"
                        py={0.5}
                        px={1}
                        color="white"
                        fontWeight="bold"
                        textAlign="center"
                        borderRight="1px solid white"
                      >
                        MEDIDAS
                      </Table.ColumnHeader>
                      <Table.ColumnHeader
                        fontSize="9px"
                        py={0.5}
                        px={1}
                        color="white"
                        fontWeight="bold"
                        textAlign="center"
                        borderRight="1px solid white"
                      >
                        FITAS
                      </Table.ColumnHeader>
                      <Table.ColumnHeader
                        fontSize="9px"
                        py={0.5}
                        px={1}
                        color="white"
                        fontWeight="bold"
                        textAlign="left"
                        borderRight="1px solid white"
                      >
                        MATERIAL
                      </Table.ColumnHeader>
                      <Table.ColumnHeader
                        fontSize="9px"
                        py={0.5}
                        px={1}
                        color="white"
                        fontWeight="bold"
                        textAlign="center"
                      >
                        OBS
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {sortedSummary.map((cut, idx) => {
                      const prevMat =
                        idx > 0 ? sortedSummary[idx - 1].material.name : null;
                      const isNewMaterial =
                        prevMat && prevMat !== cut.material.name;

                      return (
                        <Table.Row
                          key={cut.id}
                          h="16px"
                          bg="white"
                          // Borda superior grossa quando muda o material
                          borderTop={
                            isNewMaterial ? '2px solid black' : '1px solid #ccc'
                          }
                        >
                          <Table.Cell
                            fontSize="9px"
                            py={0.5}
                            px={1}
                            fontWeight="bold"
                            textAlign="center"
                            borderRight="1px solid #ccc"
                            color="black"
                          >
                            {cut.amount}
                          </Table.Cell>
                          <Table.Cell
                            fontSize="9px"
                            py={0.5}
                            px={1}
                            textAlign="center"
                            borderRight="1px solid #ccc"
                            color="black"
                          >
                            {cut.gside} x {cut.pside}
                          </Table.Cell>
                          <Table.Cell
                            fontSize="9px"
                            py={0.5}
                            px={1}
                            textAlign="center"
                            borderRight="1px solid #ccc"
                            color="black"
                          >
                            {cut.borderA} | {cut.borderB}
                          </Table.Cell>
                          {/* Material em negrito se for a primeira linha do grupo */}
                          <Table.Cell
                            fontSize="8px"
                            py={0.5}
                            px={1}
                            lineHeight="1"
                            textAlign="left"
                            borderRight="1px solid #ccc"
                            color="black"
                            fontWeight={
                              isNewMaterial || idx === 0 ? 'bold' : 'normal'
                            }
                          >
                            {cut.material.name}
                          </Table.Cell>
                          <Table.Cell
                            fontSize="8px"
                            py={0.5}
                            px={1}
                            textAlign="center"
                            color="black"
                          >
                            {cut.hasHingeHoles && (
                              <Text
                                as="span"
                                fontWeight="bold"
                                fontSize="8px"
                                bg="black"
                                color="white"
                                px={1}
                                borderRadius="sm"
                              >
                                {cut.calculatedHolesQty} FUROS
                              </Text>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>

              {/* CONTADOR TOTAL */}
              <Flex
                direction="column"
                justify="center"
                align="center"
                border="1px solid"
                borderColor="black"
                borderRadius="md"
                minW="60px"
                bg="white"
              >
                <Text
                  fontSize="8px"
                  color="black"
                  fontWeight="bold"
                  textTransform="uppercase"
                >
                  Total
                </Text>
                <Text
                  fontSize="28px"
                  fontWeight="900"
                  lineHeight="1"
                  color="black"
                >
                  {tagCutlist.length}
                </Text>
                <Text
                  fontSize="8px"
                  color="black"
                  fontWeight="bold"
                  textTransform="uppercase"
                >
                  Peças
                </Text>
              </Flex>
            </Flex>

            <Box borderBottom="2px dashed black" mt={2} mb={2} />
          </Box>

          {/* --- ETIQUETAS INDIVIDUAIS --- */}
          <Box display="block">
            {[...tagCutlist]
              .sort((a, b) => b.gside - a.gside)
              .map(cut => {
                const renderHoles = () => {
                  const pos1 = '30%';
                  const pos2 = '70%';

                  if (cut.hingeSide === 'Maior') {
                    return (
                      <>
                        <Box
                          position="absolute"
                          top="30%"
                          left={pos1}
                          transform="translate(-50%, -50%)"
                          w="6px"
                          h="6px"
                          bg="black"
                          borderRadius="full"
                          border="1px solid white"
                          zIndex={2}
                        />
                        <Box
                          position="absolute"
                          top="30%"
                          left={pos2}
                          transform="translate(-50%, -50%)"
                          w="6px"
                          h="6px"
                          bg="black"
                          borderRadius="full"
                          border="1px solid white"
                          zIndex={2}
                        />
                      </>
                    );
                  } else {
                    return (
                      <>
                        <Box
                          position="absolute"
                          left="20%"
                          top="35%"
                          transform="translate(-50%, -50%)"
                          w="6px"
                          h="6px"
                          bg="black"
                          borderRadius="full"
                          border="1px solid white"
                          zIndex={2}
                        />
                        <Box
                          position="absolute"
                          left="20%"
                          top="65%"
                          transform="translate(-50%, -50%)"
                          w="6px"
                          h="6px"
                          bg="black"
                          borderRadius="full"
                          border="1px solid white"
                          zIndex={2}
                        />
                      </>
                    );
                  }
                };

                return (
                  <Box
                    key={cut.id}
                    float="left"
                    width="33.33%"
                    height="130px"
                    border="1px dashed #666"
                    p={1}
                    m={0}
                    boxSizing="border-box"
                    pageBreakInside="avoid"
                    position="relative"
                  >
                    <Flex
                      direction="column"
                      align="center"
                      justify="center"
                      h="100%"
                    >
                      <Box
                        position="relative"
                        width="auto"
                        height="auto"
                        mb={1}
                      >
                        {/* BADGE DE QTD FUROS (Sem o 'F') */}
                        {cut.hasHinge && (
                          <Box
                            position="absolute"
                            top="-5px"
                            right="-5px"
                            bg="black"
                            color="white"
                            fontSize="9px"
                            fontWeight="900"
                            px={1.5}
                            py={0.5}
                            borderRadius="sm"
                            zIndex={3}
                          >
                            {cut.hingeQuantity}
                          </Box>
                        )}

                        <Image
                          src={cut.avatar.src}
                          height="45px"
                          width="auto"
                          alt="Esquema"
                          style={{
                            display: 'block',
                            filter: 'grayscale(100%)',
                          }}
                        />
                        {cut.hasHinge && renderHoles()}
                      </Box>

                      <Text
                        fontWeight="900"
                        fontSize="16px"
                        lineHeight="1"
                        color="black"
                      >
                        {cut.gside} x {cut.pside}
                      </Text>

                      <Text
                        fontSize="10px"
                        textAlign="center"
                        lineClamp={2}
                        lineHeight="1.1"
                        mt={1}
                        color="black"
                      >
                        {cut.material}
                      </Text>

                      <Text
                        fontSize="9px"
                        textAlign="center"
                        mt={1}
                        fontWeight="bold"
                        color="black"
                        bg="gray.200"
                        px={1}
                        borderRadius="sm"
                      >
                        {orderData.orderCode} —{' '}
                        {orderData.customer.name.split(' ')[0]}{' '}
                        {orderData.customer.name.split(' ')[1] || ''}
                      </Text>

                      <Text
                        fontSize="9px"
                        color="black"
                        mt={0.5}
                        fontWeight="bold"
                      >
                        {cut.globalIndex} / {cut.globalTotal}
                      </Text>
                    </Flex>
                  </Box>
                );
              })}
            <div style={{ clear: 'both' }} />
          </Box>
        </Flex>
      </div>
    </div>
  );
};
