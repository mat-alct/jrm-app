// src/components/Printables/Tags.tsx
import { Box, Flex, Heading, Image, Text, SimpleGrid } from '@chakra-ui/react';
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

        // Recalcular qtd furos na hora da impressão caso venha nulo (segurança)
        let qty = cut.hingeHolesQuantity || 2;
        const length = cut.hingeHolesSide === 'Maior' ? gside : pside;
        if (!cut.hingeHolesQuantity) {
          qty = Math.max(2, Math.ceil(length / 600));
        }

        tags.push({
          id: v4(),
          gside,
          pside,
          avatar,
          material: cut.material.name,
          index: i + 1,
          total: cut.amount,
          hasHinge: cut.hasHingeHoles,
          hingeSide: cut.hingeHolesSide,
          hingeQuantity: qty,
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
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          `}
        </style>

        <Flex direction="column" px={8} py={4} fontFamily="Arial, sans-serif">
          <Flex direction="column" mb={4}>
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
                <Heading size="xl">PEDIDO URGENTE</Heading>
              </Box>
            )}

            <Heading
              textAlign="center"
              size="lg"
              mb={1}
            >{`${orderData.orderCode} - ${orderData.customer.name}`}</Heading>
            <SimpleGrid columns={2} mt={2} gap={4} fontSize="12px">
              <Text>
                <b>Entrega:</b>{' '}
                {orderData.deliveryDate
                  ? format(
                      new Date(orderData.deliveryDate.seconds * 1000),
                      'dd/MM/yyyy',
                    )
                  : 'N/A'}
              </Text>
              <Text>
                <b>Total:</b> R$ {orderData.orderPrice},00
              </Text>
            </SimpleGrid>
            <Box
              mt={2}
              mb={4}
              borderBottomWidth="1px"
              borderColor="black"
              width="100%"
            />
          </Flex>

          <Box display="block">
            {tagCutlist
              .sort((a, b) => b.gside - a.gside)
              .map(cut => {
                const renderHoles = () => {
                  const holes = [];
                  const qty = cut.hingeQuantity;

                  if (cut.hingeSide === 'Maior') {
                    // Furos na Horizontal (eixo X), alinhados no Topo (eixo Y)
                    // Top=2px para ficar "dentro" do SVG
                    for (let k = 0; k < qty; k++) {
                      let leftPos = '50%';

                      if (qty === 2) {
                        leftPos = k === 0 ? '15%' : '85%';
                      } else {
                        const step = 70 / (qty - 1);
                        const perc = 15 + step * k;
                        leftPos = `${perc}%`;
                      }

                      holes.push(
                        <Box
                          key={k}
                          position="absolute"
                          top="2px"
                          left={leftPos}
                          transform="translateX(-50%)"
                          w="6px"
                          h="6px"
                          bg="black"
                          borderRadius="full"
                          border="1px solid white"
                          zIndex={2}
                          shadow="sm"
                        />,
                      );
                    }
                  } else {
                    // Furos na Vertical (eixo Y), alinhados na Esquerda (eixo X)
                    // Left=2px para ficar "dentro"
                    for (let k = 0; k < qty; k++) {
                      let topPos = '50%';
                      if (qty === 2) {
                        topPos = k === 0 ? '15%' : '85%';
                      } else {
                        const step = 70 / (qty - 1);
                        const perc = 15 + step * k;
                        topPos = `${perc}%`;
                      }

                      holes.push(
                        <Box
                          key={k}
                          position="absolute"
                          left="2px"
                          top={topPos}
                          transform="translateY(-50%)"
                          w="6px"
                          h="6px"
                          bg="black"
                          borderRadius="full"
                          border="1px solid white"
                          zIndex={2}
                          shadow="sm"
                        />,
                      );
                    }
                  }
                  return holes;
                };

                return (
                  <Box
                    key={cut.id}
                    float="left"
                    width="33.33%"
                    height="130px"
                    border={
                      orderData.isUrgent ? '2px solid black' : '1px solid #ccc'
                    }
                    p={0}
                    m={0}
                    boxSizing="border-box"
                    pageBreakInside="avoid"
                    position="relative"
                  >
                    {orderData.isUrgent && (
                      <Box
                        bg="black"
                        color="white"
                        w="100%"
                        textAlign="center"
                        py={0.5}
                        position="absolute"
                        top={0}
                        left={0}
                        zIndex={2}
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
                      h="100%"
                      pt={orderData.isUrgent ? 4 : 0}
                    >
                      <Box
                        position="relative"
                        width="auto"
                        height="auto"
                        mb={1}
                      >
                        <Image
                          src={cut.avatar.src}
                          height="40px"
                          width="auto"
                          alt="Esquema"
                        />
                        {cut.hasHinge && renderHoles()}
                      </Box>

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
