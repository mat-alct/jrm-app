// src/components/Printables/Tags.tsx
import { Box, Flex, Text, SimpleGrid, Icon } from '@chakra-ui/react';
import React, { useRef, useEffect } from 'react';
import { FaArrowUp } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';
import { v4 } from 'uuid';
import QRCode from 'react-qr-code';

import { sortCutlistData } from '../../utils/cutlist/sortAndReturnTag';
import { Order } from '../../types';

// CORREÇÃO 1: Estendendo a interface Order para incluir campos que existem no banco mas faltam no type global
interface OrderWithExtras extends Order {
  orderCode: number;
  orderPrice?: number;
}

interface TagsProps {
  order: Order | null;
  onAfterPrint: () => void;
}

export const Tags: React.FC<TagsProps> = ({ order, onAfterPrint }) => {
  const componentRef = useRef<HTMLDivElement>(null);

  // Cast seguro para usar orderCode
  const orderData = order as OrderWithExtras | null;

  // CORREÇÃO 2: Atualizado para usar 'contentRef' (v3+) ou corrigir a tipagem do hook
  const handlePrint = useReactToPrint({
    contentRef: componentRef, // Usa a ref diretamente
    documentTitle: orderData ? `Etiquetas-${orderData.orderCode}` : 'Etiquetas',
    onAfterPrint: onAfterPrint,
  });

  useEffect(() => {
    if (orderData && componentRef.current) {
      handlePrint();
    }
  }, [orderData, handlePrint]);

  if (!orderData) return null;

  const tagList = orderData.cutlist.flatMap(cut => {
    const tags = [];
    for (let i = 0; i < cut.amount; i++) {
      const { gside, pside } = sortCutlistData({
        sideA: cut.sideA,
        sideB: cut.sideB,
        borderA: cut.borderA,
        borderB: cut.borderB,
      });

      tags.push({
        uniqueId: v4(),
        originalId: cut.id,
        gside,
        pside,
        material: cut.material.name,
        sideA: cut.sideA,
        sideB: cut.sideB,
        borderA: cut.borderA,
        borderB: cut.borderB,
        amountIndex: i + 1,
        totalAmount: cut.amount,
      });
    }
    return tags;
  });

  return (
    <div style={{ display: 'none' }}>
      <div ref={componentRef}>
        <style type="text/css" media="print">
          {`
            @page { size: auto; margin: 0mm; }
            .page-break { page-break-after: always; }
          `}
        </style>

        {tagList.map((tag, index) => (
          <Box
            key={tag.uniqueId}
            className="page-break"
            w="100mm"
            h="50mm"
            p="2mm"
            border="1px solid #ccc"
            fontFamily="Arial, sans-serif"
            bg="white"
          >
            <Flex h="100%" justify="space-between">
              <Flex direction="column" justify="space-between" w="72%">
                <Box borderBottom="2px solid black" pb={1}>
                  <Text fontSize="10pt" fontWeight="bold" lineClamp={1}>
                    {' '}
                    {/* CORREÇÃO 3: noOfLines -> lineClamp */}#
                    {orderData.orderCode} -{' '}
                    {orderData.customer.name.split(' ')[0]}
                  </Text>
                  <Text fontSize="8pt" lineClamp={1}>
                    {tag.material}
                  </Text>{' '}
                  {/* CORREÇÃO 3: noOfLines -> lineClamp */}
                </Box>

                <Flex align="center" justify="center" my={1}>
                  <Text fontSize="22pt" fontWeight="900" lineHeight="1">
                    {tag.gside}{' '}
                    <Text as="span" fontSize="12pt">
                      x
                    </Text>{' '}
                    {tag.pside}
                  </Text>
                </Flex>

                <SimpleGrid columns={2} gap={1} fontSize="7pt">
                  <Flex align="center" gap={1}>
                    <Icon as={FaArrowUp} transform="rotate(90deg)" />
                    <Text fontWeight="bold">A:</Text> {tag.sideA}mm
                    {tag.borderA > 0 && (
                      <Box
                        as="span"
                        bg="black"
                        color="white"
                        px={1}
                        ml={1}
                        borderRadius="sm"
                      >
                        {tag.borderA}
                      </Box>
                    )}
                  </Flex>
                  <Flex align="center" gap={1}>
                    <Icon as={FaArrowUp} />
                    <Text fontWeight="bold">B:</Text> {tag.sideB}mm
                    {tag.borderB > 0 && (
                      <Box
                        as="span"
                        bg="black"
                        color="white"
                        px={1}
                        ml={1}
                        borderRadius="sm"
                      >
                        {tag.borderB}
                      </Box>
                    )}
                  </Flex>
                </SimpleGrid>

                <Text fontSize="6pt" mt="auto" color="gray.500">
                  Peça {index + 1}/{tagList.length} • {tag.uniqueId.slice(0, 6)}
                </Text>
              </Flex>

              <Flex
                direction="column"
                justify="space-between"
                align="center"
                w="25%"
                borderLeft="1px dashed gray"
                pl={1}
              >
                <Box mt={1}>
                  <QRCode
                    value={JSON.stringify({
                      id: tag.originalId,
                      o: orderData.orderCode,
                    })}
                    size={55}
                    level="M"
                  />
                </Box>
                <Box textAlign="center" borderTop="2px solid black" w="100%">
                  <Text fontSize="6pt">Qtd Peça</Text>
                  <Text fontSize="14pt" fontWeight="bold">
                    {tag.amountIndex}/{tag.totalAmount}
                  </Text>
                </Box>
              </Flex>
            </Flex>
          </Box>
        ))}
      </div>
    </div>
  );
};
