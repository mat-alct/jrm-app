import { Button, Flex, Heading, HStack, useToast } from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import firebase from 'firebase/app';
import Head from 'next/head';
import { AuthAction, withAuthUser } from 'next-firebase-auth';
import React from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { Loader } from '../../components/Loader';
import { capitalizeAndStrip } from '../../utils/capitalizeAndStripString';

interface SellersProps {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

const Vendedores: React.FC = () => {
  const toast = useToast();

  const createSellerSchema = Yup.object().shape({
    firstName: Yup.string().required('Nome obrigatório'),
    lastName: Yup.string().required('Sobrenome obrigatório'),
    password: Yup.string().required('Senha obrigatória'),
    confirmPassword: Yup.string().required('Confirmação de senha obrigatório'),
  });

  const {
    register: createSellerRegister,
    handleSubmit: createSellerHandleSubmit,
    setError: createSellerSetError,
    setValue: createSellerSetValue,
    formState: { errors: createCutlistErrors },
  } = useForm<SellersProps>({
    resolver: yupResolver(createSellerSchema),
    reValidateMode: 'onSubmit',
  });

  const handleSubmitSeller = async (sellerData: SellersProps) => {
    // Check if password is the same as confirmPassword
    if (sellerData.password !== sellerData.confirmPassword) {
      createSellerSetError('confirmPassword', {
        type: 'value',
        message: 'Digite o mesmo password na confirmação',
      });

      return;
    }

    // Check if password already exist in database.
    // If it exists, cancel submit and throw an error
    const doesPasswordExist = await firebase
      .firestore()
      .collection('sellers')
      .doc(sellerData.password)
      .get();

    if (doesPasswordExist) {
      createSellerSetError('password', {
        type: 'value',
        message: 'Não é possível utilizar essa senha',
      });

      createSellerSetValue('password', '');
      createSellerSetValue('confirmPassword', '');

      return;
    }

    const name = `${capitalizeAndStrip(
      sellerData.firstName,
    )} ${capitalizeAndStrip(sellerData.lastName)}`;

    try {
      await firebase
        .firestore()
        .collection('sellers')
        .doc(sellerData.password)
        .set({
          name,
        });

      toast({
        status: 'success',
        description: 'Vendedor criado com sucesso',
      });
    } catch {
      toast({
        status: 'error',
        description: 'Erro ao criar um novo vendedor',
      });
    }
  };

  return (
    <>
      <Head>
        <title>Vendedores | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Vendedores" />
        <Flex
          as="form"
          direction="column"
          onSubmit={createSellerHandleSubmit(handleSubmitSeller)}
          maxW="1366px"
        >
          <Heading mt={8}>Criar vendedor</Heading>
          <HStack spacing={8} mt={4} alignItems="flex-end">
            <FormInput
              {...createSellerRegister('firstName')}
              label="Nome"
              name="firstName"
              error={createCutlistErrors.firstName}
              size="lg"
            />
            <FormInput
              {...createSellerRegister('lastName')}
              label="Sobrenome"
              name="lastName"
              size="lg"
              error={createCutlistErrors.lastName}
            />
            <FormInput
              {...createSellerRegister('password')}
              label="Senha"
              name="password"
              error={createCutlistErrors.password}
              type="password"
              size="lg"
            />
            <FormInput
              {...createSellerRegister('confirmPassword')}
              label="Confirmação de senha"
              name="confirmPassword"
              error={createCutlistErrors.confirmPassword}
              type="password"
              size="lg"
            />
            <Button size="lg" type="submit" colorScheme="orange" minW="150px">
              Criar
            </Button>
          </HStack>
        </Flex>
      </Dashboard>
    </>
  );
};

export default withAuthUser({
  whenAuthed: AuthAction.RENDER,
  whenUnauthedAfterInit: AuthAction.REDIRECT_TO_LOGIN,
  whenUnauthedBeforeInit: AuthAction.SHOW_LOADER,
  authPageURL: '/login',
  LoaderComponent: Loader,
})(Vendedores);
