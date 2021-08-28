import {
  Button,
  HStack,
  Icon,
  IconButton,
  Table,
  TableCaption,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import firebase from 'firebase/app';
import Head from 'next/head';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { RiAddLine, RiRefreshLine } from 'react-icons/ri';
import { useQuery } from 'react-query';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { FormModal } from '../../components/Modal/FormModal';
import { useMaterial } from '../../hooks/material';
import { Material } from '../../types';
import materialsFromOldApi from '../../utils/dataFromOldApi/materials';

interface handleUpdatePriceProps {
  newPrice: number;
}

const Materiais = () => {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const {
    onOpen: onOpenPrice,
    isOpen: isOpenPrice,
    onClose: onClosePrice,
  } = useDisclosure();
  const { createMaterial, getMaterials, removeMaterial, updateMaterialPrice } =
    useMaterial();
  const toast = useToast();
  const { data, refetch, isFetching, isLoading } = useQuery('materials', () =>
    getMaterials(),
  );

  const [updatingMaterialId, setUpdatingMaterialId] = useState('');

  const validationNewMaterialSchema = Yup.object().shape({
    name: Yup.string().required('Material obrigatório'),
    width: Yup.number()
      .max(2750)
      .min(0)
      .required('Largura obrigatória')
      .typeError('Largura precisa ser um número'),
    height: Yup.number()
      .max(1850)
      .min(0)
      .required('Altura obrigatória')
      .typeError('Altura precisa ser um número'),
    price: Yup.number()
      .required('Preço obrigatório')
      .typeError('Preço precisa ser um número'),
  });

  const validationPriceSchema = Yup.object().shape({
    newPrice: Yup.number()
      .required('Preço obrigatório')
      .typeError('Preço precisa ser um número'),
  });

  // New Material useForm
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Material>({
    resolver: yupResolver(validationNewMaterialSchema),
  });

  // Price useForm
  const {
    register: priceRegister,
    handleSubmit: priceHandleSubmit,
    formState: { errors: priceErrors, isSubmitting: priceIsSubmitting },
  } = useForm<handleUpdatePriceProps>({
    resolver: yupResolver(validationPriceSchema),
  });

  // Close Modal and create a new material
  const handleCreateMaterial = async (newMaterialData: Material) => {
    try {
      onClose();

      // Prevent two materials with same name
      const doesMaterialExists = data?.find(
        material => material.name === newMaterialData.name,
      );

      if (doesMaterialExists) {
        toast({
          status: 'info',
          title: 'Dois clientes com o mesmo nome',
        });
        throw new Error();
      }

      await createMaterial({
        ...newMaterialData,
        createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
        updatedAt: firebase.firestore.Timestamp.fromDate(new Date()),
      });

      toast({
        status: 'success',
        title: 'Material criado com sucesso',
        isClosable: true,
      });
    } catch {
      toast({
        status: 'error',
        title: 'Erro ao criar material',
        isClosable: true,
      });
    }
  };

  const handleAddOldMaterials = async () => {
    materialsFromOldApi.map(async material => {
      await createMaterial({
        name: material.name,
        height: material.height,
        width: material.width,
        price: material.price,
        createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
        updatedAt: firebase.firestore.Timestamp.fromDate(new Date()),
      });
    });
  };

  const handleRemoveMaterial = async (id: string) => {
    try {
      await removeMaterial(id);

      toast({
        status: 'success',
        title: 'Material removido com sucesso',
        isClosable: true,
      });
    } catch {
      toast({
        status: 'error',
        title: 'Erro ao remover material',
        isClosable: true,
        description: 'Um erro ocorreu durante a remoção do material',
      });
    }
  };

  // Store material id to update price and open modal
  const handleClickOnUpdatePrice = (id: string) => {
    setUpdatingMaterialId(id);

    onOpenPrice();
  };

  // Close Modal and update material's price
  const handleUpdatePrice = async ({ newPrice }: handleUpdatePriceProps) => {
    try {
      onClosePrice();

      await updateMaterialPrice({ id: updatingMaterialId, newPrice });

      toast({
        status: 'success',
        title: 'Preço atualizado com sucesso',
        isClosable: true,
      });
    } catch {
      toast({
        status: 'error',
        title: 'Erro ao atualizar preço do material',
        isClosable: true,
        description:
          'Um erro ocorreu durante a atualização do preço do material',
      });
    }
  };

  return (
    <>
      <Head>
        <title>Materiais | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header
          pageTitle="Materiais"
          isLoading={isFetching || isLoading || priceIsSubmitting}
        >
          <Button onClick={handleAddOldMaterials}>
            Adicionar materiais antigos
          </Button>
          <Button
            colorScheme="gray"
            onClick={() => refetch()}
            disabled={isSubmitting || isFetching}
            leftIcon={<Icon as={RiRefreshLine} fontSize="20" />}
          >
            Atualizar
          </Button>
          <Button
            colorScheme="orange"
            onClick={onOpen}
            disabled={isSubmitting || isFetching}
            leftIcon={<Icon as={RiAddLine} fontSize="20" />}
          >
            Novo Material
          </Button>
        </Header>

        {/* New Material Modal */}
        <FormModal
          isOpen={isOpen}
          title="Novo Material"
          onClose={onClose}
          onSubmit={handleSubmit(handleCreateMaterial)}
        >
          <VStack as="form" spacing={4} mx="auto" noValidate>
            <FormInput
              {...register('name')}
              error={errors.name}
              maxWidth="none"
              name="name"
              label="Material"
            />
            <HStack spacing={8}>
              <FormInput
                {...register('width')}
                error={errors.width}
                maxWidth="none"
                name="width"
                label="Largura"
              />
              <FormInput
                {...register('height')}
                error={errors.height}
                maxWidth="none"
                name="height"
                label="Altura"
              />

              <FormInput
                {...register('price')}
                error={errors.price}
                maxWidth="none"
                name="price"
                label="Preço"
              />
            </HStack>
          </VStack>
        </FormModal>

        {/* Update price Modal */}
        <FormModal
          isOpen={isOpenPrice}
          title="Atualizar Preço"
          onClose={onClosePrice}
          onSubmit={priceHandleSubmit(handleUpdatePrice)}
        >
          <VStack as="form" spacing={4} mx="auto" noValidate>
            <FormInput
              {...priceRegister('newPrice')}
              error={priceErrors.newPrice}
              maxWidth="none"
              name="newPrice"
              label="Novo preço"
            />
          </VStack>
        </FormModal>

        {/* Table who lists all materials */}
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
            {data
              ?.sort((a, b) => a.name.localeCompare(b.name))
              .map(material => {
                return (
                  <Tr key={material.id}>
                    <Td>{material.name}</Td>
                    <Td isNumeric>{material.width}</Td>
                    <Td isNumeric>{material.height}</Td>
                    <Td isNumeric>{`R$ ${material.price}`}</Td>
                    <Td>
                      <HStack spacing={4}>
                        {/* Update Price button */}
                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Editar"
                          icon={<FaEdit />}
                          onClick={() => handleClickOnUpdatePrice(material.id)}
                          disabled={priceIsSubmitting}
                        />
                        {/* Remove Material Button */}
                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Remover"
                          icon={<FaTrash />}
                          onClick={() => handleRemoveMaterial(material.id)}
                          disabled={priceIsSubmitting}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                );
              })}
          </Tbody>
        </Table>
      </Dashboard>
    </>
  );
};

export default Materiais;
