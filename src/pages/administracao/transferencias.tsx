import {
  Box,
  Checkbox,
  Divider,
  Flex,
  Heading,
  HStack,
  IconButton,
  List,
  ListItem,
  Stack,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import firebase from 'firebase/app';
import React from 'react';
import { useForm } from 'react-hook-form';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { useMutation, useQuery } from 'react-query';
import { v4 } from 'uuid';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { FormSelect } from '../../components/Form/Select';
import { queryClient } from '../../services/queryClient';
import { MaterialRequest } from '../../types';

interface materialRequestProps {
  materialRequest: string;
  materialRequestStore: string;
}

const Transferencias: React.FC = () => {
  const toast = useToast();

  const materialRequestSchema = Yup.object().shape({
    materialRequest: Yup.string().required('Material obrigatório'),
    materialRequestStore: Yup.string().required('Loja obrigatória'),
  });

  const removeMaterialRequestMutation = useMutation(
    async (id: string) => {
      await firebase
        .firestore()
        .collection('materialRequests')
        .doc(id)
        .delete();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('materialRequests');
      },
      onError: () => {
        toast({
          status: 'error',
          title: 'Erro ao criar material',
          isClosable: true,
          description:
            'Um erro ocorreu durante a criação do material pelo React Query',
          position: 'top-right',
        });
      },
    },
  );

  const createMaterialRequestMutation = useMutation(
    async (materialData: MaterialRequest) => {
      await firebase
        .firestore()
        .collection('materialRequests')
        .doc(v4())
        .set(materialData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('materialRequests');
      },
      onError: () => {
        toast({
          status: 'error',
          title: 'Erro ao criar material',
          isClosable: true,
          description:
            'Um erro ocorreu durante a criação do material pelo React Query',
          position: 'top-right',
        });
      },
    },
  );

  const { data: materialRequestsData } = useQuery('materialRequests', () =>
    firebase
      .firestore()
      .collection('materialRequests')
      .get()
      .then(response =>
        response.docs.map(doc => Object.assign(doc.data(), { id: doc.id })),
      ),
  );

  const {
    register: materialRequestRegister,
    handleSubmit: materialRequestHandleSubmit,
    control: materialRequestControl,
    formState: { errors: materialRequestErrors },
  } = useForm<materialRequestProps>({
    resolver: yupResolver(materialRequestSchema),
  });

  const submitMaterialRequest = async (
    submitMaterialData: materialRequestProps,
  ) => {
    const materialDataToStoreInFirebase: MaterialRequest = {
      material: submitMaterialData.materialRequest,
      requestStore: submitMaterialData.materialRequestStore,
      isSeparated: false,
      createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
    };

    await createMaterialRequestMutation.mutateAsync(
      materialDataToStoreInFirebase,
    );

    toast({
      status: 'success',
      description: 'Adicionado com sucesso',
    });
  };

  const removeMaterialById = async (id: string) => {
    await removeMaterialRequestMutation.mutateAsync(id);

    toast({
      status: 'success',
      description: 'Removido com sucesso',
    });
  };

  const alternateRequestStatus = async (id: string, isSeparated: boolean) => {
    await firebase.firestore().collection('materialRequests').doc(id).update({
      isSeparated: !isSeparated,
    });

    queryClient.invalidateQueries('materialRequests');

    toast({
      status: 'success',
      description: 'Atualizado com sucesso',
    });
  };

  return (
    <Dashboard>
      <Header pageTitle="Transferência de Materiais" />
      <Flex direction="column">
        <Stack
          direction="row"
          spacing={8}
          as="form"
          noValidate
          maxW="700px"
          align="flex-end"
          onSubmit={materialRequestHandleSubmit(submitMaterialRequest)}
        >
          <Box minW="66%" w="100%">
            <FormInput
              {...materialRequestRegister('materialRequest')}
              name="materialRequest"
              error={materialRequestErrors.materialRequest}
              label="Precisamos de:"
              size="md"
            />
          </Box>

          <FormSelect
            control={materialRequestControl}
            options={[
              { value: 'Japuíba', label: 'Japuíba' },
              { value: 'Frade', label: 'Frade' },
            ]}
            name="materialRequestStore"
            label="Na loja do(a):"
            placeholder=""
          />

          <IconButton
            icon={<FaPlus />}
            type="submit"
            colorScheme="orange"
            aria-label="Adicionar"
          >
            Adicionar
          </IconButton>
        </Stack>
      </Flex>
      <Flex direction="row" mt={16} align="flex-start" h="100%">
        <VStack spacing={4} align="flex-start">
          <Heading mb={8} size="lg">
            Enviar da Japuíba para o Frade
          </Heading>

          <List spacing={4}>
            {materialRequestsData
              ?.filter(request => request.requestStore === 'Frade')
              .map(request => {
                return (
                  <ListItem key={request.id}>
                    <HStack spacing={16}>
                      <Text
                        fontSize="20px"
                        color={request.isSeparated ? 'gray.300' : 'gray.900'}
                        fontWeight="700"
                      >
                        {request.material}
                      </Text>
                      <HStack spacing={4}>
                        <Checkbox
                          size="lg"
                          colorScheme="orange"
                          isChecked={request.isSeparated}
                          onChange={() =>
                            alternateRequestStatus(
                              request.id,
                              request.isSeparated,
                            )
                          }
                        >
                          Separado
                        </Checkbox>
                        <IconButton
                          colorScheme="red"
                          size="sm"
                          aria-label="Remover"
                          icon={<FaTrash />}
                          onClick={() => removeMaterialById(request.id)}
                        />
                      </HStack>
                    </HStack>
                  </ListItem>
                );
              })}
          </List>
        </VStack>
        <Divider h="500px" orientation="vertical" mx={16} color="red" />
        <VStack spacing={4} align="flex-start">
          <Heading mb={8} size="lg">
            Enviar do Frade para a Japuíba
          </Heading>

          <List spacing={4}>
            {materialRequestsData
              ?.filter(request => request.requestStore === 'Japuíba')
              .map(request => {
                return (
                  <ListItem key={request.id}>
                    <HStack spacing={16}>
                      <Text
                        fontSize="20px"
                        color={request.isSeparated ? 'gray.300' : 'gray.900'}
                        fontWeight="700"
                      >
                        {request.material}
                      </Text>
                      <HStack spacing={4}>
                        <Checkbox
                          size="lg"
                          colorScheme="orange"
                          isChecked={request.isSeparated}
                          onChange={() =>
                            alternateRequestStatus(
                              request.id,
                              request.isSeparated,
                            )
                          }
                        >
                          Separado
                        </Checkbox>
                        <IconButton
                          colorScheme="red"
                          size="sm"
                          aria-label="Remover"
                          icon={<FaTrash />}
                          onClick={() => removeMaterialById(request.id)}
                        />
                      </HStack>
                    </HStack>
                  </ListItem>
                );
              })}
          </List>
        </VStack>
      </Flex>
    </Dashboard>
  );
};

export default Transferencias;
