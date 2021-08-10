import { Box, Button, Flex, Image, Stack, useToast } from '@chakra-ui/react';
import firebase from 'firebase/app';
import { useRouter } from 'next/dist/client/router';
import Head from 'next/head';
import React from 'react';
import { useForm } from 'react-hook-form';

import { FormInput } from '../components/Form/Input';

interface LoginProps {
  email: string;
  password: string;
}

const Login = () => {
  const { register, handleSubmit } = useForm();
  const toast = useToast();

  const router = useRouter();

  const onSubmit = async ({ email, password }: LoginProps) => {
    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);

      router.push('/');
    } catch (err) {
      toast({
        title: 'Erro de autenticação',
        description: 'Email/Senha incorretos',
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
          >
            <Image src="images/logo.svg" alt="Logotipo" mb={16} />

            <Stack spacing={2}>
              <FormInput
                {...register('email')}
                name="email"
                placeholder="Email"
                type="email"
              />
              <FormInput
                {...register('password')}
                name="password"
                placeholder="Senha"
                type="password"
              />
            </Stack>
            <Button
              type="submit"
              mt={4}
              bgColor="orange.500"
              _hover={{ bgColor: 'orange.400' }}
            >
              Entar
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </>
  );
};

export default Login;
