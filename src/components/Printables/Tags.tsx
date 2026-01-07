// src/components/Printables/Tags.tsx
import { Box, Flex, Heading, Image, Text, SimpleGrid } from '@chakra-ui/react';
import { format } from 'date-fns';
import React, { useRef, useEffect, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { v4 } from 'uuid';

import { sortCutlistData } from '../../utils/cutlist/sortAndReturnTag';
import { Order } from '../../types';

// Garante que o Typescript reconheça os campos novos se a interface global falhar
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

  const tagCutlist = useMemo(() => {
    if (!orderData) return [];

    return orderData.cutlist.flatMap(cut => {
      const tags = [];
      for (let i = 0; i < cut.amount; i++) {
        const { gside, pside, avatar } = sortCutlistData({
          sideA: cut.sideA,
          sideB: cut.sideB,
          borderA: cut.borderA,
          borderB: cut.borderB,
        });

        tags.push({
          id: v4(),
          gside,
          pside,
          avatar,
          material: cut.material.name,
          index: i + 1,
          total: cut.amount,
        });
      }
      return tags;
    });
  }, [orderData]);

  if (!orderData) return null;

  return (
    <div style={{ display: 'none' }}>
      <div ref={componentRef} className="print-container">
        <style type="text/css" media="print">
          {`
            @page { size: A4; margin: 10mm; }
            .page-break { page-break-after: always; }
            /* Garante impressão de background (faixas pretas) */
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          `}
        </style>

        <Flex direction="column" px={8} py={4} fontFamily="Arial, sans-serif">
          {/* --- FAIXA DE URGÊNCIA (TOPO DA PÁGINA) --- */}
          {orderData.isUrgent && (
            <Box
              w="100%"
              bg="black"
              color="white"
              textAlign="center"
              py={2}
              mb={4}
              border="2px solid black"
            >
              <Heading
                size="xl"
                textTransform="uppercase"
                letterSpacing="widest"
              >
                PEDIDO URGENTE
              </Heading>
            </Box>
          )}

          {/* --- CABEÇALHO / RESUMO --- */}
          <Flex direction="column" mb={4}>
            <Heading textAlign="center" size="lg" mb={1}>
              {`${orderData.orderCode} - ${orderData.customer.name}`}
            </Heading>
            <Heading
              textAlign="center"
              size="md"
              fontWeight="normal"
              color="gray.600"
            >
              {orderData.orderStore}
            </Heading>

            <SimpleGrid columns={2} mt={4} gap={4} fontSize="12px">
              <Flex direction="column" gap={1}>
                <Text>
                  <b>Data Entrega:</b>{' '}
                  {orderData.deliveryDate
                    ? format(
                        new Date(orderData.deliveryDate.seconds * 1000),
                        'dd/MM/yyyy',
                      )
                    : 'N/A'}
                </Text>
                <Text>
                  <b>Tipo:</b> {orderData.deliveryType}
                </Text>
                {orderData.deliveryType === 'Entrega' && (
                  <Text>
                    <b>Endereço:</b> {orderData.customer.address},{' '}
                    {orderData.customer.area}
                  </Text>
                )}
                <Text>
                  <b>Telefone:</b> {orderData.customer.telephone}
                </Text>
              </Flex>

              <Flex direction="column" gap={1}>
                <Text>
                  <b>Vendedor:</b> {orderData.seller}
                </Text>
                <Text>
                  <b>Total do Pedido:</b> R$ {orderData.orderPrice},00
                </Text>

                {/* Exibe SALDO DEVEDOR se houver e não for 0 */}
                {orderData.amountDue && orderData.amountDue !== '0' && (
                  <Text
                    color="black"
                    fontWeight="bold"
                    border="1px solid black"
                    p={1}
                    display="inline-block"
                    textAlign="center"
                    mt={1}
                  >
                    RESTANTE A PAGAR: R$ {orderData.amountDue}
                  </Text>
                )}
              </Flex>
            </SimpleGrid>

            {orderData.ps && (
              <Box mt={2} border="1px dashed black" p={2} bg="gray.100">
                <Text fontSize="12px" fontWeight="bold">
                  OBSERVAÇÕES:
                </Text>
                <Text fontSize="12px">{orderData.ps}</Text>
              </Box>
            )}

            {/* Resumo de Peças */}
            <Flex direction="column" mt={4} borderTop="1px solid black" pt={2}>
              <Text fontSize="12px" fontWeight="bold" mb={1}>
                Resumo de Corte:
              </Text>
              {orderData.cutlist.map(cut => (
                <Text key={cut.id} fontSize="11px">
                  • {cut.amount}x - {cut.sideA} [{cut.borderA}] x {cut.sideB} [
                  {cut.borderB}] - {cut.material.name}
                </Text>
              ))}
              <Text fontSize="12px" mt={2} fontWeight="bold">
                Total de peças: {tagCutlist.length}
              </Text>
            </Flex>

            <Box
              mt={4}
              mb={4}
              borderBottomWidth="2px"
              borderColor="black"
              width="100%"
            />
          </Flex>

          {/* --- ETIQUETAS INDIVIDUAIS --- */}
          <Box display="block">
            {tagCutlist
              .sort((a, b) => b.gside - a.gside)
              .map((cut, i) => (
                <Box
                  key={cut.id}
                  float="left"
                  width="33.33%"
                  height="125px" // Aumentei um pouco para caber a tarja urgente se precisar
                  border={
                    orderData.isUrgent ? '2px solid black' : '1px solid #ccc'
                  } // Borda mais grossa se urgente
                  p={0} // Padding zero para controlar com flex
                  m={0}
                  boxSizing="border-box"
                  pageBreakInside="avoid"
                  position="relative"
                >
                  <Flex direction="column" h="100%">
                    {/* TARJA URGENTE NA ETIQUETA */}
                    {orderData.isUrgent && (
                      <Box
                        bg="black"
                        color="white"
                        w="100%"
                        textAlign="center"
                        py={0.5}
                      >
                        <Text fontSize="8px" fontWeight="bold">
                          URGENTE
                        </Text>
                      </Box>
                    )}

                    <Flex
                      direction="column"
                      align="center"
                      justify="center"
                      flex="1"
                      p={1}
                    >
                      <Image
                        src={cut.avatar.src}
                        height="35px"
                        width="auto"
                        alt="Esquema"
                        mb={1}
                      />

                      <Text fontWeight="900" fontSize="15px" lineHeight="1">
                        {cut.gside} x {cut.pside}
                      </Text>

                      <Text
                        fontSize="9px"
                        textAlign="center"
                        lineClamp={2}
                        lineHeight="1.1"
                        mt={1}
                      >
                        {cut.material}
                      </Text>

                      <Text
                        fontSize="8px"
                        textAlign="center"
                        mt={1}
                        color="gray.600"
                      >
                        {orderData.orderCode} -{' '}
                        {orderData.customer.name.split(' ')[0]}
                      </Text>

                      <Text fontSize="9px" fontWeight="bold" mt={0.5}>
                        {cut.index}/{cut.total}
                      </Text>
                    </Flex>
                  </Flex>
                </Box>
              ))}

            <div style={{ clear: 'both' }} />
          </Box>
        </Flex>
      </div>
    </div>
  );
};
