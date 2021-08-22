import {
  Button,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
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
import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useForm } from 'react-hook-form';
import { FaEdit, FaTrash } from 'react-icons/fa';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { Material } from '../../types';

const Materiais = () => {
  const { onOpen, isOpen, onClose } = useDisclosure();

  const validationSchema = Yup.object().shape({
    material: Yup.string().required('Material obrigatório'),
    width: Yup.number().max(2750).min(0).required('Largura obrigatória'),
    height: Yup.number().max(1850).min(0).required('Altura obrigatória'),
    price: Yup.number().required('Preço obrigatório'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Material>({
    resolver: yupResolver(validationSchema),
  });

  const handleCreateMaterial = (newMaterialData: Material) => {
    onClose();
    // eslint-disable-next-line no-console
    console.log(newMaterialData);
  };

  return (
    <>
      <Dashboard>
        <Header pageTitle="Materiais">
          <Button colorScheme="gray">Atualizar</Button>
          <Button colorScheme="orange" onClick={onOpen} disabled={isSubmitting}>
            Novo Material
          </Button>
        </Header>
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Novo Material</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack as="form" spacing={4} mx="auto" noValidate>
                <FormInput
                  {...register('material')}
                  error={errors.material}
                  maxWidth="none"
                  name="material"
                  placeholder="Material"
                />
                <FormInput
                  {...register('width')}
                  error={errors.width}
                  maxWidth="none"
                  name="width"
                  placeholder="Largura"
                />
                <FormInput
                  {...register('height')}
                  error={errors.height}
                  maxWidth="none"
                  name="height"
                  placeholder="Altura"
                />
                <FormInput
                  {...register('price')}
                  error={errors.price}
                  maxWidth="none"
                  name="price"
                  placeholder="Preço"
                />
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button
                colorScheme="orange"
                mr={3}
                type="submit"
                onClick={handleSubmit(handleCreateMaterial)}
              >
                Criar
              </Button>
              <Button onClick={onClose}>Cancelar</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
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
