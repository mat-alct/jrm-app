import { Box, Button, Flex, Image, Stack, useToast } from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import firebase from 'firebase/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AuthAction, withAuthUser } from 'next-firebase-auth';
import React from 'react';
import { useForm } from 'react-hook-form';

import { FormInput } from '../components/Form/Input';
import { Loader } from '../components/Loader';
import { loginSchema } from '../utils/yup/pages/login';

interface LoginProps {
  email: string;
  password: string;
}

const Login = () => {
  const toast = useToast();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginProps>({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async ({ email, password }: LoginProps) => {
    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);

      router.push('/');
    } catch (err) {
      toast({
        status: 'error',
        title: 'Erro de autenticação',
        description: 'Email ou senha incorretos',
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
          flex={['0', '0', '0', '0', '1', '1']}
          bgSize="cover"
        />
        <Flex
          align="center"
          justify="center"
          maxW={['700px', '700px', '700px', '700px', '500px', '700px']}
          w="100%"
          mx={['auto', 'auto', 'auto', 'auto', '']}
        >
          <Flex
            as="form"
            direction="column"
            w={['300px', '350px']}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <Image src="images/logo.svg" alt="Logotipo" mb={[8, 16]} />

            <Stack spacing={2}>
              <FormInput
                {...register('email')}
                name="email"
                placeholder="Email"
                type="email"
                error={errors.email}
              />
              <FormInput
                {...register('password')}
                name="password"
                placeholder="Senha"
                type="password"
                error={errors.password}
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
