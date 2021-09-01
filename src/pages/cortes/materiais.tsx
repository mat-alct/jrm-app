import {
  Button,
  HStack,
  Icon,
  IconButton,
  Radio,
  RadioGroup,
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
import firebase from 'firebase/app';
import Head from 'next/head';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { RiAddLine, RiRefreshLine } from 'react-icons/ri';
import { useQuery } from 'react-query';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { RadioButton } from '../../components/Form/RadioButton';
import { FormModal } from '../../components/Modal/FormModal';
import { useMaterial } from '../../hooks/material';
import { Material } from '../../types';
import {
  createMaterialSchema,
  updatePriceSchema,
} from '../../utils/yup/materiaisValidations';

interface updatePriceProps {
  newPrice: number;
}

const Materiais = () => {
  const [updatingMaterialId, setUpdatingMaterialId] = useState('');
  const [materialFilter, setMaterialFilter] = useState('MDF');

  const { createMaterial, getMaterials, removeMaterial, updateMaterialPrice } =
    useMaterial();

  const {
    onOpen: onOpenPrice,
    isOpen: isOpenPrice,
    onClose: onClosePrice,
  } = useDisclosure();
  const { onOpen, isOpen, onClose } = useDisclosure();

  const { data, refetch, isFetching, isLoading } = useQuery(
    ['materials', materialFilter],
    () => getMaterials(materialFilter),
  );

  // createMaterial useForm
  const {
    register: createMaterialRegister,
    handleSubmit: createMaterialHandleSubmit,
    control: createMaterialControl,
    formState: {
      errors: createMaterialErrors,
      isSubmitting: createMaterialIsSubmitting,
    },
  } = useForm<Material>({
    resolver: yupResolver(createMaterialSchema),
  });

  // updatePrice useForm
  const {
    register: updatePriceRegister,
    handleSubmit: updatePriceHandleSubmit,
    formState: {
      errors: updatePriceErrors,
      isSubmitting: updatePriceIsSubmitting,
    },
  } = useForm<updatePriceProps>({
    resolver: yupResolver(updatePriceSchema),
  });

  // Submit Functions
  const handleCreateMaterial = async (newMaterialData: Material) => {
    onClose();

    await createMaterial({
      ...newMaterialData,
      createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
      updatedAt: firebase.firestore.Timestamp.fromDate(new Date()),
    });
  };

  const handleUpdatePrice = async ({ newPrice }: updatePriceProps) => {
    onClosePrice();

    await updateMaterialPrice({ id: updatingMaterialId, newPrice });
  };

  // Click Functions
  const handleClickOnUpdatePrice = (id: string) => {
    setUpdatingMaterialId(id);

    onOpenPrice();
  };

  const handleRemoveMaterial = async (id: string) => {
    await removeMaterial(id);
  };

  return (
    <>
      <Head>
        <title>Materiais | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header
          pageTitle="Materiais"
          isLoading={isFetching || isLoading || updatePriceIsSubmitting}
        >
          <Button
            colorScheme="gray"
            onClick={() => refetch()}
            disabled={createMaterialIsSubmitting || isFetching}
            leftIcon={<Icon as={RiRefreshLine} fontSize="20" />}
          >
            Atualizar{' '}
          </Button>
          <Button
            colorScheme="orange"
            onClick={onOpen}
            disabled={createMaterialIsSubmitting || isFetching}
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
          onSubmit={createMaterialHandleSubmit(handleCreateMaterial)}
        >
          <VStack as="form" spacing={4} mx="auto" noValidate>
            <FormInput
              {...createMaterialRegister('name')}
              error={createMaterialErrors.name}
              maxWidth="none"
              name="name"
              label="Material"
              size="md"
            />
            <HStack spacing={8}>
              <FormInput
                {...createMaterialRegister('width')}
                error={createMaterialErrors.width}
                maxWidth="none"
                name="width"
                label="Largura"
                size="md"
              />
              <FormInput
                {...createMaterialRegister('height')}
                error={createMaterialErrors.height}
                maxWidth="none"
                name="height"
                label="Altura"
                size="md"
              />
            </HStack>

            <HStack spacing={8}>
              <FormInput
                {...createMaterialRegister('price')}
                error={createMaterialErrors.price}
                maxWidth="none"
                name="price"
                label="Preço"
                size="md"
              />
              <RadioButton
                name="type"
                options={['MDF', 'Compensado']}
                control={createMaterialControl}
                label="Tipo de material"
              />
            </HStack>
          </VStack>
        </FormModal>

        <FormModal
          isOpen={isOpenPrice}
          title="Atualizar Preço"
          onClose={onClosePrice}
          onSubmit={updatePriceHandleSubmit(handleUpdatePrice)}
        >
          <VStack as="form" spacing={4} mx="auto" noValidate>
            <FormInput
              {...updatePriceRegister('newPrice')}
              error={updatePriceErrors.newPrice}
              maxWidth="none"
              name="newPrice"
              label="Novo preço"
            />
          </VStack>
        </FormModal>

        {/* Filtro de tipo de MDF */}
        <RadioGroup
          onChange={setMaterialFilter}
          value={materialFilter}
          colorScheme="orange"
          mb={4}
        >
          <HStack>
            <Radio value="MDF" isChecked>
              MDF
            </Radio>
            <Radio value="Compensado">Compensado</Radio>
          </HStack>
        </RadioGroup>

        {/* Tabela de dados */}
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
                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Editar"
                          icon={<FaEdit />}
                          onClick={() => handleClickOnUpdatePrice(material.id)}
                          disabled={updatePriceIsSubmitting}
                        />
                        <IconButton
                          colorScheme="orange"
                          size="sm"
                          aria-label="Remover"
                          icon={<FaTrash />}
                          onClick={() => handleRemoveMaterial(material.id)}
                          disabled={updatePriceIsSubmitting}
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
