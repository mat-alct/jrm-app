/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Box,
  Divider,
  Flex,
  Heading,
  IconButton,
  Image,
  Text,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import firebase from 'firebase/app';
import React, { useEffect, useRef, useState } from 'react';
import { FaTag } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';
import { v4 } from 'uuid';

import { sortCutlistData } from '../../utils/cutlist/sortAndReturnTag';

type CutlistProps = {
  id: string;
  gside: number;
  pside: number;
  avatar: {
    src: string;
    width: number;
    height: number;
  };
  material: string;
};

interface TagsProps {
  order: firebase.firestore.DocumentData & {
    id: string;
  };
}

export const Tags: React.FC<TagsProps> = ({ order }) => {
  const componentRef = useRef(null);

  const [tagCutlist, setTagCutlist] = useState<CutlistProps[]>();

  useEffect(() => {
    const allTags = order.cutlist.flatMap((cut: any) => {
      const tags = [];

      for (let i = 0; i < cut.amount; i += 1) {
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
        });
      }

      return tags;
    });

    setTagCutlist(allTags);
  }, [order.cutlist]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  useEffect(() => {}, []);

  return (
    <Flex>
      <div style={{ display: 'none' }} className="print-container">
        <Flex ref={componentRef} direction="column" px={16} py={8}>
          <Flex
            direction="column"
            h={
              (tagCutlist && tagCutlist.length > 15) ||
              order.cutlist.length > 12
                ? '100vh'
                : ''
            }
          >
            <Heading
              textAlign="center"
              size="lg"
            >{`${order.orderCode} - ${order.customer.name}`}</Heading>
            <Heading textAlign="center" size="md">
              {order?.orderStore}
            </Heading>

            <Flex mt={4} direction="column" align="flex-start">
              <Text fontSize="13px">{`Data de Entrega: ${format(
                new Date(order.deliveryDate.seconds * 1000),
                'dd/MM/yyyy',
              )}`}</Text>
              <Text fontSize="13px">{`Tipo de entrega: ${order.deliveryType}`}</Text>
              {order.deliveryType === 'Entrega' && (
                <Text fontSize="13px">
                  {order.customer.address &&
                    `Endereço do cliente: ${order.customer.address} - ${
                      order.customer?.area || 'Bairro não informado'
                    }, ${order.customer?.city || 'Cidade não informada'}`}
                </Text>
              )}
              <Text fontSize="13px">
                {order.customer.telephone &&
                  `Telefone: ${order.customer.telephone}`}
              </Text>
              <Text fontSize="13px">{`Vendedor: ${order.seller}`}</Text>
              <Text fontSize="13px">{`Preço: R$ ${order.orderPrice},00`}</Text>

              {order?.ps && (
                <Text
                  fontSize="13px"
                  maxW="650px"
                  fontWeight="700"
                >{`Observações: ${order.ps}`}</Text>
              )}
            </Flex>
            <Flex direction="column" mt={4}>
              {order?.cutlist.map((cut: any) => {
                return (
                  <Flex direction="row" key={cut.id}>
                    {cut.sideA >= cut.sideB && (
                      <Text fontSize="13px">
                        {`${cut.amount} - ${cut.sideA} [ ${cut.borderA} ] x ${cut.sideB} [ ${cut.borderB} ] - ${cut.material.name}`}
                      </Text>
                    )}
                    {cut.sideB > cut.sideA && (
                      <Text fontSize="13px">
                        {`${cut.amount} - ${cut.sideB} [ ${cut.borderB} ] x ${cut.sideA} [ ${cut.borderA} ] - ${cut.material.name}`}
                      </Text>
                    )}
                  </Flex>
                );
              })}
              <Text
                fontSize="13px"
                mt={4}
              >{`Numero de peças: ${order.cutlist.reduce(
                (prev: any, curr: any) => {
                  return prev + curr.amount;
                },
                0,
              )} peça(s)`}</Text>
            </Flex>
            <Divider mt={4} mb={4} />
          </Flex>

          <Box display="block">
            {tagCutlist
              ?.sort((a, b) => b.gside - a.gside)
              .map((cut, index) => {
                return (
                  <div key={cut.id}>
                    <div className="page-break" />
                    <Box
                      float="left"
                      width="33%"
                      h="120px"
                      border="1px solid gray.300"
                    >
                      <Image
                        src={cut.avatar.src}
                        width="50px"
                        height="auto"
                        alt="Etiqueta"
                        mx="auto"
                      />
                      <Text fontWeight="700" fontSize="13px" textAlign="center">
                        {`${cut.gside} x ${cut.pside}`}
                      </Text>
                      <Text fontSize="8px" textAlign="center">
                        COMPENSADO COMPEWIT COMUM 04MM
                      </Text>
                      <Text
                        fontSize="8px"
                        textAlign="center"
                      >{`${order.orderCode} - ${order.customer.name}`}</Text>
                      <Text fontSize="8px" textAlign="center">{`Peça ${
                        index + 1
                      }/${tagCutlist.length}`}</Text>
                    </Box>
                  </div>
                );
              })}
          </Box>
        </Flex>
      </div>

      <IconButton
        colorScheme="orange"
        size="sm"
        aria-label="Remover"
        icon={<FaTag />}
        onClick={handlePrint}
      />
    </Flex>
  );
};
