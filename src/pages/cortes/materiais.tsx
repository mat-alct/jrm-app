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

  const validationSchema = Yup.object().shape({
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
    resolver: yupResolver(validationSchema),
  });

  // Price useForm
  const {
    register: priceRegister,
    handleSubmit: priceHandleSubmit,
    formState: { errors: priceErrors, isSubmitting: priceIsSubmitting },
  } = useForm<handleUpdatePriceProps>({
    resolver: yupResolver(validationPriceSchema),
  });

  const handleCreateMaterial = async (newMaterialData: Material) => {
    try {
      onClose();

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
        description: 'Um erro ocorreu durante a criação do material',
      });
    }
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

  const handleClickOnUpdatePrice = (id: string) => {
    setUpdatingMaterialId(id);

    onOpenPrice();
  };

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
          <Button
            colorScheme="gray"
            onClick={() => refetch()}
            disabled={isSubmitting || isFetching}
            leftIcon={<Icon as={RiRefreshLine} fontSize="20" />}
          >
            Atualizar{' '}
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

        {/* Modals */}
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
          </VStack>
        </FormModal>

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
            {data?.map(material => {
              return (
                <Tr key={material.id}>
                  <Td>{material.name}</Td>
                  <Td isNumeric>{material.width}</Td>
                  <Td isNumeric>{material.height}</Td>
                  <Td isNumeric>{`R$ ${material.price}`}</Td>
                  <Td>
                    <HStack spacing={4}>
                      <IconButton
                        colorScheme="orange"
                        size="sm"
                        aria-label="Editar"
                        icon={<FaEdit />}
                        onClick={() => handleClickOnUpdatePrice(material.id)}
                        disabled={priceIsSubmitting}
                      />
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
