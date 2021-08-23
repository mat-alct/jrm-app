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
  useToast,
  VStack,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import Head from 'next/head';
import React from 'react';
import { useForm } from 'react-hook-form';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useQuery } from 'react-query';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { FormModal } from '../../components/Modal/FormModal';
import { useMaterial } from '../../hooks/material';
import { Material } from '../../types';

const Materiais = () => {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const { createMaterial, getMaterials } = useMaterial();
  const toast = useToast();
  const { data, refetch, isFetching } = useQuery('materials', () =>
    getMaterials(),
  );

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Material>({
    resolver: yupResolver(validationSchema),
  });

  const handleCreateMaterial = async (newMaterialData: Material) => {
    try {
      onClose();

      await createMaterial(newMaterialData);

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

  return (
    <>
      <Head>
        <title>Materiais | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Materiais">
          <Button
            colorScheme="gray"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Atualizar
          </Button>
          <Button
            colorScheme="orange"
            onClick={onOpen}
            disabled={isSubmitting || isFetching}
          >
            Novo Material
          </Button>
        </Header>
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
              );
            })}
          </Tbody>
        </Table>
      </Dashboard>
    </>
  );
};

export default Materiais;
