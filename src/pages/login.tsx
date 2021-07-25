/* eslint-disable react/no-children-prop */
import 'firebase/auth';

import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import firebase from 'firebase/app';
import { AuthAction, withAuthUser } from 'next-firebase-auth';
import React, { useState } from 'react';
import { FiLock, FiUser } from 'react-icons/fi';

const MyLoader = () => <div>Loading...</div>;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    await firebase.auth().signInWithEmailAndPassword(email, password);
  };

  return (
    <Flex as="main" align="stretch" h="100vh">
      <Flex
        flex="1"
        background="url(/images/logInBackground.png)"
        backgroundSize="cover"
      />
      <Flex as="section" w="100%" maxW="44em" align="center" justify="center">
        <Flex direction="column">
          <img
            src="/images/logo.svg"
            alt="Logotipo JRM"
            style={{ width: '350px', height: 'auto', marginBottom: '4em' }}
          />
          <form
            style={{
              maxWidth: '22em',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1em',
            }}
          >
            <Heading size="lg" mb="1em">
              Entre já na sua conta
            </Heading>
            <FormControl id="email">
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <FiUser color="gray.300" />
                </InputLeftElement>
                <Input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </InputGroup>
            </FormControl>
            <FormControl id="password">
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <FiLock color="gray.300" />
                </InputLeftElement>
                <Input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </InputGroup>
            </FormControl>

            <Button type="submit" w="100%" onClick={() => handleLogin()}>
              Entrar
            </Button>
          </form>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default withAuthUser({
  whenAuthed: AuthAction.RENDER,
  whenUnauthedBeforeInit: AuthAction.SHOW_LOADER,
  whenUnauthedAfterInit: AuthAction.RENDER,
  LoaderComponent: MyLoader,
})(LoginPage);
