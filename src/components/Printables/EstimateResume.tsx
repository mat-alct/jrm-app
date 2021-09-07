/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-wrap-multilines */
import {
  Box,
  Divider,
  Flex,
  Heading,
  IconButton,
  List,
  ListItem,
  Text,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import firebase from 'firebase/app';
import React, { useRef } from 'react';
import { FaRegFileAlt, FaWhatsapp } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';

interface EstimateResumeProps {
  estimate: firebase.firestore.DocumentData & {
    id: string;
  };
}

export const EstimateResume: React.FC<EstimateResumeProps> = ({ estimate }) => {
  const componentRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  return (
    <>
      <div style={{ display: 'none' }}>
        <Flex
          ref={componentRef}
          // style={{ height: listData.length > 17 ? '200vh' : '100vh' }}
        >
          <Flex direction="column" px={16} py={8} fontSize="12px" w="100%">
            {/* Header */}
            <Flex align="center" justify="space-between">
              <Heading color="gray.900">JRM Compensados</Heading>

              <Heading color="gray.400">PEDIDO DE ORÇAMENTO</Heading>
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
                  <Text fontSize="14px">{estimate.estimateCode}</Text>
                </Box>
                <Box mt={2}>
                  <Heading mb={0} size="md">
                    Data do Orçamento
                  </Heading>
                  <Divider mb="4px" />
                  <Text fontSize="14px">
                    {format(
                      new Date(estimate.createdAt.seconds * 1000),
                      'dd/MM/yyyy',
                    )}
                  </Text>
                </Box>
              </Flex>
            </Flex>

            {/* Lower container */}
            <Flex mt={8} w="100%">
              <div>
                <Heading size="lg">Cliente</Heading>
                <Divider style={{ margin: '0px 0px 8px 0px' }} />
                <Text>{`Nome: ${estimate.name}`}</Text>

                {estimate.telephone && (
                  <Text>
                    {`Telefone: (${estimate.telephone.substring(
                      0,
                      2,
                    )}) ${estimate.telephone.substring(
                      2,
                      7,
                    )} - ${estimate.telephone.substring(7, 11)}`}
                  </Text>
                )}
              </div>
            </Flex>
            {/* Cutlist */}
            <List mt={8}>
              {estimate.cutlist.map((cut: any) => (
                <ListItem key={cut.id}>
                  {`${cut.amount} - ${cut.material.name} - ${cut.sideA} [ ${cut.borderA} ] x ${cut.sideB} [ ${cut.borderB} ] | R$ ${cut.price},00`}
                </ListItem>
              ))}
            </List>
            <Divider my={2} />
            <Heading
              ml="auto"
              size="md"
              color="green.700"
            >{`R$ ${estimate.estimatePrice},00`}</Heading>
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
