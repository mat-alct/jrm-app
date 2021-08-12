import { Box, Button, Flex, Image, Stack, useToast } from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import firebase from 'firebase/app';
import { useRouter } from 'next/dist/client/router';
import Head from 'next/head';
import { AuthAction, withAuthUser } from 'next-firebase-auth';
import React from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';

import { FormInput } from '../components/Form/Input';
import { Loader } from '../components/Loader';

interface LoginProps {
  email: string;
  password: string;
}

const Login = () => {
  const toast = useToast();
  const router = useRouter();

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .email('Necessário que esteja em formato de email')
      .required('Email obrigatório'),
    password: Yup.string()
      .required('Senha obrigatória')
      .min(8, 'Senha precisa de no mínimo 8 dígitos'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginProps>({
    resolver: yupResolver(validationSchema),
  });

  const onSubmit = async ({ email, password }: LoginProps) => {
    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);

      router.push('/');
    } catch (err) {
      toast({
        status: 'error',
        isClosable: true,
        title: 'Erro de autenticação',
        description: 'Email ou senha incorretos',
        position: 'top-right',
      });
    }
  };

  return (
    <>
      <Head>
        <title>Login | JRM Compensados</title>
      </Head>

      <Flex as="main" h="100vh" align="stretch">
        <Box
          bg="url(/images/logInBackground.png)"
          h="100%"
          flex="1"
          bgSize="cover"
        />
        <Flex align="center" justify="center" maxW="700px" w="100%">
          <Flex
            as="form"
            direction="column"
            w={['300px', '350px']}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <Image src="images/logo.svg" alt="Logotipo" mb={16} />

            <Stack spacing={2}>
              <FormInput
                {...register('email')}
                name="email"
                placeholder="Email"
                type="email"
                error={errors.email}
                defaultValue="mateus@jrmcompensados.com"
              />
              <FormInput
                {...register('password')}
                name="password"
                placeholder="Senha"
                type="password"
                error={errors.password}
                defaultValue="12345678"
              />
              <Button
                isLoading={isSubmitting}
                isFullWidth
                type="submit"
                bgColor="orange.500"
                _hover={{ bgColor: 'orange.400' }}
              >
                Entrar
              </Button>
            </Stack>
          </Flex>
        </Flex>
      </Flex>
    </>
  );
};

export default withAuthUser({
  whenAuthed: AuthAction.REDIRECT_TO_APP,
  whenUnauthedBeforeInit: AuthAction.SHOW_LOADER,
  whenUnauthedAfterInit: AuthAction.RENDER,
  appPageURL: '/',
  LoaderComponent: Loader,
})(Login);
