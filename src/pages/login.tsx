import { Box, Button, Flex, Image, Input, Stack } from '@chakra-ui/react';
import Head from 'next/head';

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
          <Flex direction="column" w="350px">
            <Image src="images/logo.svg" alt="Logotipo" mb={16} />

            <Stack spacing={2}>
              <Input placeholder="Email" />
              <Input placeholder="Password" />
              <Button>Entar</Button>
            </Stack>
          </Flex>
        </Flex>
      </Flex>
    </>
  );
};

export default Login;
