import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Image,
  Input,
  Stack,
} from '@chakra-ui/react';
import Head from 'next/head';
import React from 'react';

const Login = () => {
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
          <Flex direction="column" w={['300px', '350px']}>
            <Image src="images/logo.svg" alt="Logotipo" mb={16} />

            <Stack spacing={2}>
              <FormControl id="email">
                <FormLabel>Email</FormLabel>
                <Input type="email" focusBorderColor="orange.500" />
                <FormErrorMessage>Erro</FormErrorMessage>
              </FormControl>

              <Input placeholder="Password" />
              <Button bgColor="orange.500" _hover={{ bgColor: 'orange.400' }}>
                Entar
              </Button>
            </Stack>
          </Flex>
        </Flex>
      </Flex>
    </>
  );
};

export default Login;
