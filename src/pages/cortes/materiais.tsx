import {
  Button,
  HStack,
  IconButton,
  Table,
  TableCaption,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import React from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { FormModal } from '../../components/Modal/FormModal';

const Materiais = () => {
  const { onOpen, isOpen, onClose } = useDisclosure();

  return (
    <>
      <Dashboard>
        <Header pageTitle="Materiais">
          <Button colorScheme="gray">Atualizar</Button>
          <Button colorScheme="orange" onClick={onOpen}>
            Novo Material
          </Button>
        </Header>
        <FormModal isOpen={isOpen} onClose={onClose} title="Novo Material">
          <VStack as="form" spacing={4} mx="auto">
            <FormInput maxWidth="none" name="Material" placeholder="Material" />
            <FormInput maxWidth="none" name="Largura" placeholder="Largura" />
            <FormInput maxWidth="none" name="Altura" placeholder="Altura" />
            <FormInput maxWidth="none" name="Preço" placeholder="Preço" />
          </VStack>
        </FormModal>
        <Table variant="striped" colorScheme="orange">
          <TableCaption>Lista de Materiais</TableCaption>
          <Thead>
            <Tr>
              <Th>Material</Th>
              <Th isNumeric>Largura (mm)</Th>
              <Th isNumeric>Altura (mm)</Th>
              <Th isNumeric>Preço</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td>MDF BRANCO TX 2 FACES COMUM 15MM </Td>
              <Td isNumeric>2750</Td>
              <Td isNumeric>1850</Td>
              <Td isNumeric>R$ 239</Td>
              <Td>
                <HStack spacing={4}>
                  <IconButton
                    colorScheme="orange"
                    size="sm"
                    aria-label="Editar"
                    icon={<FaEdit />}
                  />
                  <IconButton
                    colorScheme="orange"
                    size="sm"
                    aria-label="Remover"
                    icon={<FaTrash />}
                  />
                </HStack>
              </Td>
            </Tr>
            <Tr>
              <Td>MDF BRANCO TX 2 FACES COMUM 15MM </Td>
              <Td isNumeric>2750</Td>
              <Td isNumeric>1850</Td>
              <Td isNumeric>R$ 239</Td>
              <Td>
                <HStack spacing={4}>
                  <IconButton
                    colorScheme="orange"
                    size="sm"
                    aria-label="Editar"
                    icon={<FaEdit />}
                  />
                  <IconButton
                    colorScheme="orange"
                    size="sm"
                    aria-label="Remover"
                    icon={<FaTrash />}
                  />
                </HStack>
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Dashboard>
    </>
  );
};

export default Materiais;
