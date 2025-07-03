import { Toaster, toaster } from "@/components/ui/toaster"
import { Box, Button, Flex, Image, Stack, chakra, VStack } from '@chakra-ui/react';import { yupResolver } from '@hookform/resolvers/yup';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { FormInput } from '../components/Form/Input';
import { Loader } from '../components/Loader';
import { loginSchema } from '../utils/yup/pages/login';
import { useAuth } from '../hooks/authContext'; // Importando o novo hook

interface LoginProps {
  email: string;
  password: string;
}

const Login = () => {
  const toast = toaster;
  const router = useRouter();
  const { signIn, user } = useAuth(); // Usando o novo hook

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginProps>({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async ({ email, password }: LoginProps) => {
    console.log('1. onSubmit foi chamado com:', { email, password }); // <-- ADICIONE AQUI
    try {
      // Chama a função signIn do nosso AuthContext
      await signIn(email, password);
      router.push('/');
    } catch (err) {
      toaster.create({
        type: 'error',
        title: 'Erro de autenticação',
        description: 'Email ou senha incorretos.',
      });
    }
  };

  // Redireciona se o usuário já estiver logado
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Exibe um loader enquanto a sessão é verificada
  if (user === undefined || user) {
    return <Loader />;
  }

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
          <chakra.form
            as="form"
            direction="column"
            w={['300px', '350px']}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <Image src="images/logo.svg" alt="Logotipo" mb={[8, 16]} />

            <VStack>
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
                loading={isSubmitting}
                type="submit"
                bgColor="orange.500"
                _hover={{ bgColor: 'orange.400' }}
                width={"100%"}
              >
                Entrar
              </Button>
            </VStack>
          </chakra.form>
        </Flex>
      </Flex>
    </>
  );
};

export default Login;
