// src/components/Printables/OrderResume.tsx
import {
  Box,
  Flex,
  IconButton,
  Table,
  Text,
  Grid,
  VStack,
  Image,
  HStack,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { DocumentData } from 'firebase/firestore';
import React, { useRef, useEffect } from 'react';
import {
  FaRegFileAlt,
  FaWhatsapp,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaGlobe,
} from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';

interface OrderResumeProps {
  order: DocumentData & {
    id: string;
  };
  variant?: 'outline' | 'solid' | 'subtle' | 'surface' | 'ghost' | 'plain';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '2xs' | 'xs';
  colorScheme?: string;
  autoPrint?: boolean;
  onAfterPrint?: () => void;
}

export const OrderResume: React.FC<OrderResumeProps> = ({
  order,
  variant = 'ghost',
  size = 'sm',
  colorScheme = 'gray',
  autoPrint = false,
  onAfterPrint,
}) => {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Pedido_${order.orderCode || 'SemCodigo'}`,
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
    <Box w="100%" borderBottomWidth="2px" borderColor="black" my={1} />
  );

  return (
    <>
      <div style={{ display: 'none' }}>
        <Box
          ref={componentRef}
          p={5}
          bg="white"
          color="black"
          fontFamily="sans-serif"
          className="print-container"
          fontSize="xs"
          // --- MUDANÇAS PARA FIXAR RODAPÉ NO FINAL ---
          display="flex"
          flexDirection="column"
          minH="280mm" // Força a altura de uma página A4 (297mm - margens)
          boxSizing="border-box"
        >
          {/* --- CABEÇALHO --- */}
          <Flex justify="space-between" align="center" mb={3}>
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
                fontSize="2xl"
                fontWeight="black"
                lineHeight="1"
                color="black"
              >
                #{order.orderCode}
              </Text>
              <Text fontSize="sm" fontWeight="bold" color="gray.600">
                PEDIDO DE CORTE
              </Text>
              <Text fontSize="xs" color="gray.600">
                Emitido em:{' '}
                {order.createdAt?.seconds
                  ? format(
                      new Date(order.createdAt.seconds * 1000),
                      'dd/MM/yyyy',
                    )
                  : format(new Date(), 'dd/MM/yyyy')}
              </Text>
            </VStack>
          </Flex>

          <Box w="100%" borderBottomWidth="3px" borderColor="black" mb={4} />

          {/* --- AVISO DE EDIÇÃO (mostra apenas a última) --- */}
          {order.edits?.length > 0 &&
            (() => {
              const last = order.edits[order.edits.length - 1];
              const when = last.editedAt?.seconds
                ? format(
                    new Date(last.editedAt.seconds * 1000),
                    "dd/MM/yyyy 'às' HH:mm",
                  )
                : '';
              const diff = last.priceDifference ?? 0;
              const shouldCharge = !!last.shouldCharge && diff !== 0;
              const formattedDiff = `R$ ${Math.abs(diff)},00`;
              return (
                <Box
                  bg={shouldCharge ? 'black' : 'gray.100'}
                  color={shouldCharge ? 'white' : 'black'}
                  borderLeftWidth="6px"
                  borderColor="black"
                  px={3}
                  py={2}
                  mb={4}
                >
                  <Text
                    fontSize="sm"
                    fontWeight="black"
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    ⚠ Pedido editado
                  </Text>
                  <Text fontSize="xs" fontWeight="bold">
                    Editado por {last.editedBy}
                    {when ? ` em ${when}` : ''}
                  </Text>
                  {diff !== 0 && (
                    <Text fontSize="xs" mt={0.5}>
                      Diferença de preço:{' '}
                      <strong>
                        {diff > 0 ? '+' : '−'}
                        {formattedDiff}
                      </strong>
                    </Text>
                  )}
                  {shouldCharge && (
                    <Text fontSize="sm" fontWeight="black" mt={1}>
                      A DIFERENÇA DE {formattedDiff} DEVE SER ACERTADA
                      {diff > 0 ? ' (RECEBER DO CLIENTE)' : ' (DEVOLVER AO CLIENTE)'}
                      .
                    </Text>
                  )}
                </Box>
              );
            })()}

          {/* --- DADOS DO CLIENTE --- */}
          <Box mb={4}>
            <Text
              fontSize="2xs"
              fontWeight="bold"
              textTransform="uppercase"
              color="gray.500"
              mb={0}
            >
              Cliente
            </Text>
            <Text
              fontSize="xl"
              fontWeight="extrabold"
              lineHeight="1.2"
              color="black"
            >
              {order.customer.name}
            </Text>
            <HStack gap={4} mt={1} color="gray.800" fontSize="xs">
              {order.customer.telephone && (
                <Flex align="center" gap={1}>
                  <FaPhoneAlt size={10} />
                  <Text fontWeight="medium">{order.customer.telephone}</Text>
                </Flex>
              )}
              {order.customer.address && (
                <Flex align="center" gap={1}>
                  <FaMapMarkerAlt size={10} />
                  <Text>
                    {order.customer.address}
                    {order.customer.area ? ` - ${order.customer.area}` : ''}
                  </Text>
                </Flex>
              )}
            </HStack>
          </Box>

          {/* --- CARTÃO ÚNICO DE INFO (Venda + Entrega) --- */}
          <Box
            border="1px solid"
            borderColor="gray.300"
            p={2}
            borderRadius="md"
            bg="gray.50"
            mb={4}
          >
            <Text
              fontWeight="bold"
              textTransform="uppercase"
              fontSize="2xs"
              color="gray.500"
              mb={1}
              borderBottom="1px solid"
              borderColor="gray.300"
              pb={0.5}
            >
              Resumo do Pedido
            </Text>
            <Grid templateColumns="1fr 1fr 1fr" gap={2}>
              <Box>
                <Text fontSize="2xs" color="gray.600">
                  Vendedor
                </Text>
                <Text fontWeight="bold" fontSize="xs">
                  {order.seller || '-'}
                </Text>
              </Box>
              <Box>
                <Text fontSize="2xs" color="gray.600">
                  Modalidade
                </Text>
                <Text fontWeight="bold" fontSize="xs">
                  {order.deliveryType}
                </Text>
              </Box>
              <Box>
                <Text fontSize="2xs" color="gray.600">
                  Prazo de Entrega
                </Text>
                <Text fontWeight="black" fontSize="xs">
                  {order.deliveryDate?.seconds
                    ? format(
                        new Date(order.deliveryDate.seconds * 1000),
                        'dd/MM/yyyy',
                      )
                    : 'A combinar'}
                </Text>
              </Box>
            </Grid>
          </Box>

          {/* OBSERVAÇÕES */}
          {order.ps && (
            <Box
              mb={4}
              p={2}
              borderLeft="3px solid"
              borderColor="black"
              bg="gray.100"
            >
              <Text fontWeight="bold" fontSize="2xs" mb={0.5}>
                OBSERVAÇÕES:
              </Text>
              <Text fontStyle="italic" fontSize="xs" lineHeight="short">
                {order.ps}
              </Text>
            </Box>
          )}

          {/* --- TABELA DE PEÇAS --- */}
          <Box mb={2}>
            <Text
              fontSize="sm"
              fontWeight="bold"
              mb={1}
              borderBottom="2px solid black"
              display="inline-block"
            >
              Itens do Pedido
            </Text>
            <Table.Root size="sm" variant="line">
              <Table.Header>
                <Table.Row borderBottom="1px solid black">
                  <Table.ColumnHeader
                    color="black"
                    fontWeight="black"
                    fontSize="2xs"
                    py={1}
                  >
                    QTD
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="black"
                    fontWeight="black"
                    fontSize="2xs"
                    py={1}
                  >
                    MATERIAL
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="black"
                    fontWeight="black"
                    fontSize="2xs"
                    py={1}
                  >
                    MEDIDAS (mm)
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="black"
                    fontWeight="black"
                    fontSize="2xs"
                    textAlign="center"
                    py={1}
                  >
                    FITAS
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="black"
                    fontWeight="black"
                    fontSize="2xs"
                    textAlign="right"
                    py={1}
                  >
                    VALOR
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {order.cutlist.map((cut: any, idx: number) => (
                  <Table.Row
                    key={cut.id || idx}
                    borderBottom="1px solid #e2e8f0"
                  >
                    <Table.Cell py={1} fontWeight="bold" fontSize="xs">
                      {cut.amount}
                    </Table.Cell>
                    <Table.Cell py={1} fontSize="xs">
                      {cut.material.name}
                    </Table.Cell>
                    <Table.Cell py={1} fontSize="xs">
                      {cut.sideA} x {cut.sideB}
                      {cut.hasHingeHoles && (
                        <Text
                          as="span"
                          fontSize="2xs"
                          fontWeight="bold"
                          ml={1}
                          bg="black"
                          color="white"
                          px={1}
                          borderRadius="full"
                        >
                          +{cut.hingeHolesQuantity}f
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell py={1} textAlign="center" fontSize="xs">
                      {cut.borderA} | {cut.borderB}
                    </Table.Cell>
                    <Table.Cell
                      py={1}
                      textAlign="right"
                      fontWeight="medium"
                      fontSize="xs"
                    >
                      {cut.price}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>

          {/* --- TOTAIS --- */}
          <Flex justify="flex-end" mb={4}>
            <Box w="220px">
              <Flex justify="space-between" align="center" mb={1}>
                <Text fontSize="sm" fontWeight="bold">
                  TOTAL
                </Text>
                <Text fontSize="xl" fontWeight="black">
                  R$ {order.orderPrice},00
                </Text>
              </Flex>
              <Separator />
              <Flex justify="space-between" align="center" mt={1} fontSize="xs">
                <Text color="gray.600">Status:</Text>
                <Text
                  fontWeight="bold"
                  bg="black"
                  color="white"
                  px={1.5}
                  fontSize="2xs"
                >
                  {order.paymentType.toUpperCase()}
                </Text>
              </Flex>
              {order.amountDue && order.paymentType !== 'Pago' && (
                <Flex
                  justify="space-between"
                  align="center"
                  mt={1}
                  fontSize="xs"
                >
                  <Text color="gray.600">A Pagar:</Text>
                  <Text fontWeight="bold" fontSize="sm">
                    R$ {order.amountDue}
                  </Text>
                </Flex>
              )}
            </Box>
          </Flex>

          {/* --- ESPAÇADOR DE GAP --- */}
          {/* Este Box empurra tudo o que vem depois para o final do container minH="280mm" */}
          <Box mt="auto" />

          {/* --- TERMOS E CONDIÇÕES --- */}
          <Box
            mb={4}
            p={2}
            border="1px solid"
            borderColor="gray.300"
            borderRadius="md"
          >
            <Text
              fontSize="2xs"
              fontWeight="bold"
              color="gray.500"
              mb={1}
              textTransform="uppercase"
            >
              Termos e Condições
            </Text>
            <Text
              fontSize="2xs"
              color="gray.600"
              textAlign="justify"
              lineHeight="1.1"
            >
              Declaro ter conferido todas as medidas e materiais. A empresa não
              se responsabiliza por erros de projeto ou medidas fornecidas pelo
              cliente. Prazo de retirada inicia-se após confirmação do
              pagamento. Pedidos não retirados em 30 dias sujeitos a descarte.
            </Text>
            <Flex mt={4} gap={4}>
              <Box
                borderTop="1px solid black"
                w="50%"
                pt={1}
                textAlign="center"
              >
                <Text fontSize="2xs">Assinatura do Cliente</Text>
              </Box>
              <Box
                borderTop="1px solid black"
                w="50%"
                pt={1}
                textAlign="center"
              >
                <Text fontSize="2xs">Visto da Empresa</Text>
              </Box>
            </Flex>
          </Box>

          {/* --- RODAPÉ INSTITUCIONAL FIXO --- */}
          <Box
            borderTop="2px solid black"
            pt={2}
            textAlign="center"
            fontSize="2xs"
            color="gray.600"
          >
            <Text fontWeight="bold" fontSize="xs" color="black" mb={0.5}>
              JRM COMPENSADOS & MARCENARIA LTDA
            </Text>
            <Text lineHeight="1.1">
              CNPJ: 45.123.001/0001-99 • R. Japoranga, 1000 - Japuíba - Angra
              dos Reis/RJ
            </Text>
            <HStack justify="center" gap={3} mt={1}>
              <Flex align="center" gap={1}>
                <FaGlobe size={10} /> jrmcompensados.com.br
              </Flex>
              <Flex align="center" gap={1}>
                <FaWhatsapp size={10} /> (24) 99969-4543
              </Flex>
            </HStack>
            <Text mt={1} fontStyle="italic" fontWeight="bold">
              Obrigado pela preferência!
            </Text>
          </Box>
        </Box>
      </div>

      {!autoPrint && (
        <IconButton
          colorScheme={colorScheme}
          variant={variant}
          size={size}
          aria-label="Imprimir Resumo"
          onClick={() => handlePrint()}
        >
          <FaRegFileAlt />
        </IconButton>
      )}
    </>
  );
};
