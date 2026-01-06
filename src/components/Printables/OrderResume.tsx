/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-wrap-multilines */
import {
  Box,
  Divider,
  Flex,
  Heading,
  IconButton,
  List, // Importamos apenas List (que contém Root e Item)
  Text,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { DocumentData } from 'firebase/firestore'; // Correção do import do Firebase
import React, { useRef } from 'react';
import { FaRegFileAlt, FaWhatsapp } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';

interface OrderResumeProps {
  order: DocumentData & {
    id: string;
  };
}

export const OrderResume: React.FC<OrderResumeProps> = ({ order }) => {
  const componentRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  return (
    <>
      <div style={{ display: 'none' }}>
        <Flex ref={componentRef}>
          <Flex direction="column" px={16} py={8} fontSize="12px" w="100%">
            {/* Header */}
            <Flex align="center" justify="space-between">
              <Heading color="gray.900">JRM Compensados</Heading>

              <Heading color="gray.400">PEDIDO DE CORTE</Heading>
            </Flex>
            <Divider my={4} />

            {/* Upper Container */}
            <Flex direction="row" justify="space-between">
              {/* JRM Info */}
              <Flex direction="column" mt={2}>
                <Box mt={0}>
                  <Text>Rua Julieta Conceição Reis 280</Text>
                  <Text>Frade, Angra dos Reis - RJ</Text>
                  <Text
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <FaWhatsapp />
                    (24) 99964-4953
                  </Text>
                </Box>
                <Box mt={2}>
                  <Text>Rua Japoranga, 1000</Text>
                  <Text>Japuíba, Angra dos Reis - RJ</Text>
                  <Text display="flex" flexDirection="row" alignItems="center">
                    <FaWhatsapp />
                    (24) 99969-4543
                  </Text>
                </Box>
                <Box mt={2}>
                  <Text>Email: jrmcompensados@hotmail.com</Text>
                </Box>
              </Flex>
              {/* Code and Data info */}
              <Flex direction="column" mt={2} textAlign="center">
                <Box>
                  <Heading mb={0} size="md">
                    Código
                  </Heading>
                  <Divider mb="4px" />
                  <Text fontSize="14px">{order.orderCode}</Text>
                </Box>
                <Box mt={2}>
                  <Heading mb={0} size="md">
                    Data do Pedido
                  </Heading>
                  <Divider mb="4px" />
                  <Text fontSize="14px">
                    {order.createdAt?.seconds
                      ? format(
                          new Date(order.createdAt.seconds * 1000),
                          'dd/MM/yyyy',
                        )
                      : format(new Date(), 'dd/MM/yyyy')}
                  </Text>
                </Box>
              </Flex>
            </Flex>

            {/* Lower container */}
            <Flex mt={8} w="100%" justify="space-between">
              <div>
                <Heading size="lg">Pedido</Heading>
                <Divider style={{ margin: '0px 0px 8px 0px' }} />
                <Text>{`Loja do Pedido: ${order.orderStore}`}</Text>
                <Text>{`Vendedor: ${order.seller}`}</Text>

                <Text>{`Tipo de Entrega: ${order.deliveryType}`}</Text>
                <Text>{`Status do Pagamento: ${order.paymentType}`}</Text>
                {order?.ps && (
                  <Text maxW="350px">{`Observações: ${order.ps}`}</Text>
                )}
                <Text style={{ fontWeight: 'bold' }}>
                  {order.deliveryDate?.seconds
                    ? `Prazo: Até ${format(
                        new Date(order.deliveryDate.seconds * 1000),
                        'dd/MM/yyyy',
                      )}`
                    : 'Prazo: A combinar'}
                </Text>
              </div>
              <div>
                <Heading size="lg">Cliente</Heading>
                <Divider style={{ margin: '0px 0px 8px 0px' }} />
                <Text>{`Nome: ${order.customer.name}`}</Text>
                {order.customer.address && (
                  <Text>
                    {`Endereço: ${order.customer.address}, ${
                      order.customer?.area || 'Bairro não informado'
                    }`}
                  </Text>
                )}

                {order.customer.telephone && (
                  <Text>{`Telefone: ${order.customer.telephone}`}</Text>
                )}
              </div>
            </Flex>

            {/* Cutlist - CORREÇÃO: List.Root e List.Item */}
            <List.Root mt={8} variant="plain">
              {order.cutlist.map((cut: any) => (
                <List.Item key={cut.id}>
                  {`${cut.amount} - ${cut.material.name} - ${cut.sideA} [ ${cut.borderA} ] x ${cut.sideB} [ ${cut.borderB} ] | R$ ${cut.price},00`}
                </List.Item>
              ))}
            </List.Root>

            <Divider my={2} />
            <Heading
              ml="auto"
              size="md"
              color="green.700"
            >{`R$ ${order.orderPrice},00`}</Heading>
          </Flex>
        </Flex>
      </div>
      <IconButton
        colorScheme="orange"
        size="sm"
        aria-label="Comprovante"
        icon={<FaRegFileAlt />}
        onClick={handlePrint}
      />
    </>
  );
};
