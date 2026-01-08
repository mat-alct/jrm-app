// src/components/Printables/EstimateResume.tsx
import {
  Box,
  Flex,
  IconButton,
  Table,
  Text,
  Grid,
  VStack,
  Image,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { DocumentData } from 'firebase/firestore';
import React, { useRef, useEffect } from 'react';
import { FaRegFileAlt, FaWhatsapp, FaMapMarkerAlt } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';

interface EstimateResumeProps {
  estimate: DocumentData & {
    id: string;
  };
  variant?: 'outline' | 'solid' | 'subtle' | 'surface' | 'ghost' | 'plain';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '2xs' | 'xs';
  colorScheme?: string;
  autoPrint?: boolean;
  onAfterPrint?: () => void;
}

export const EstimateResume: React.FC<EstimateResumeProps> = ({
  estimate,
  variant = 'ghost',
  size = 'sm',
  colorScheme = 'gray',
  autoPrint = false,
  onAfterPrint,
}) => {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Orcamento_${estimate.estimateCode || 'SemCodigo'}`,
    onAfterPrint: () => {
      if (onAfterPrint) onAfterPrint();
    },
  });

  useEffect(() => {
    if (autoPrint) {
      handlePrint();
    }
  }, [autoPrint]);

  const Separator = () => (
    <Box w="100%" borderBottomWidth="1px" borderColor="black" my={1} />
  );

  return (
    <>
      <div style={{ display: 'none' }}>
        <Box
          ref={componentRef}
          p={4}
          bg="white"
          color="black"
          fontFamily="sans-serif"
          className="print-container"
          fontSize="xs"
        >
          {/* CABEÇALHO COM LOGO (FILTRO P&B) */}
          <Flex justify="space-between" align="center" mb={2}>
            <Box>
              <Image
                src="/images/logo.svg"
                alt="JRM Compensados"
                h="50px"
                objectFit="contain"
                filter="grayscale(100%)"
              />
            </Box>
            <VStack align="flex-end" gap={0}>
              <Text
                fontSize="xl"
                fontWeight="bold"
                lineHeight="1"
                color="black"
              >
                #{estimate.estimateCode}
              </Text>
              <Text fontSize="xs" color="gray.600">
                ORÇAMENTO
              </Text>
              <Text fontSize="xs" color="gray.600">
                {estimate.createdAt?.seconds
                  ? format(
                      new Date(estimate.createdAt.seconds * 1000),
                      'dd/MM/yyyy',
                    )
                  : format(new Date(), 'dd/MM/yyyy')}
              </Text>
            </VStack>
          </Flex>

          <Box w="100%" borderBottomWidth="2px" borderColor="black" mb={3} />

          {/* DADOS (PRETO E BRANCO) */}
          <Grid templateColumns="1fr 1fr" gap={4} mb={3}>
            {/* Coluna Esquerda: JRM */}
            <VStack align="flex-start" gap={1} fontSize="xs">
              <Text fontWeight="bold" color="black" mb={0}>
                JRM Compensados
              </Text>
              <Flex align="center" gap={1}>
                <FaMapMarkerAlt size={10} color="black" />
                <Text>Rua Japoranga 1000, Japuíba</Text>
              </Flex>
              <Flex align="center" gap={1}>
                <FaWhatsapp size={10} color="black" />
                <Text>(24) 99969-4543</Text>
              </Flex>
            </VStack>

            {/* Coluna Direita: Cliente (NOME EM DESTAQUE) */}
            <VStack align="flex-start" gap={0} fontSize="xs">
              <Text fontWeight="extrabold" fontSize="lg" mb={1} color="black">
                {estimate.name}
              </Text>
              {estimate.telephone && <Text>Tel: {estimate.telephone}</Text>}
            </VStack>
          </Grid>

          {/* DETALHES DO ORÇAMENTO (Box Simplificado para Orçamento) */}
          <Box
            mb={3}
            bg="gray.100"
            p={2}
            borderRadius="sm"
            border="1px solid"
            borderColor="gray.400"
          >
            <Text fontSize="xs" fontStyle="italic" color="black">
              Este documento é um orçamento e não garante reserva de material ou
              execução do serviço até a confirmação.
            </Text>
          </Box>

          {/* TABELA DE PEÇAS */}
          <Box mb={2}>
            <Table.Root size="sm" variant="outline">
              <Table.Header bg="gray.200">
                <Table.Row>
                  <Table.ColumnHeader
                    color="black"
                    fontSize="2xs"
                    py={1}
                    px={1}
                    width="30px"
                  >
                    Qtd
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="black"
                    fontSize="2xs"
                    py={1}
                    px={1}
                  >
                    Material
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="black"
                    fontSize="2xs"
                    py={1}
                    px={1}
                  >
                    Medidas
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="black"
                    fontSize="2xs"
                    py={1}
                    px={1}
                    textAlign="center"
                  >
                    Fitas
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="black"
                    fontSize="2xs"
                    py={1}
                    px={1}
                    textAlign="right"
                  >
                    R$
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {estimate.cutlist.map((cut: any, idx: number) => (
                  <Table.Row key={cut.id || idx}>
                    <Table.Cell fontSize="xs" py={1} px={1} fontWeight="bold">
                      {cut.amount}
                    </Table.Cell>
                    <Table.Cell fontSize="xs" py={1} px={1}>
                      {cut.material.name}
                    </Table.Cell>
                    <Table.Cell fontSize="xs" py={1} px={1}>
                      {cut.sideA} x {cut.sideB}
                      {cut.hasHingeHoles && (
                        <Text
                          as="span"
                          fontSize="2xs"
                          color="black"
                          ml={1}
                          fontWeight="bold"
                        >
                          (+{cut.hingeHolesQuantity}f)
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell fontSize="xs" py={1} px={1} textAlign="center">
                      {cut.borderA} | {cut.borderB}
                    </Table.Cell>
                    <Table.Cell fontSize="xs" py={1} px={1} textAlign="right">
                      {cut.price}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>

          {/* TOTAIS (MONOCROMÁTICO) */}
          <Flex justify="flex-end">
            <Box minW="180px">
              <Flex justify="space-between" align="center" mb={1}>
                <Text fontSize="sm" fontWeight="bold" color="black">
                  TOTAL ORÇADO
                </Text>
                <Text fontSize="lg" fontWeight="black" color="black">
                  R$ {estimate.estimatePrice},00
                </Text>
              </Flex>
              <Separator />
            </Box>
          </Flex>
        </Box>
      </div>

      {!autoPrint && (
        <IconButton
          colorScheme={colorScheme}
          variant={variant}
          size={size}
          aria-label="Imprimir Orçamento"
          onClick={() => handlePrint()}
        >
          <FaRegFileAlt />
        </IconButton>
      )}
    </>
  );
};
