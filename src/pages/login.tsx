import 'firebase/auth';

import { Button, Flex, Heading, Input } from '@chakra-ui/react';
import firebase from 'firebase/app';
import { AuthAction, withAuthUser } from 'next-firebase-auth';
import { useState } from 'react';

const MyLoader = () => <div>Loading...</div>;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    await firebase.auth().signInWithEmailAndPassword(email, password);
  };

  return (
    <Flex as="main" align="stretch" h="100vh">
      <Flex flex="1" background="black" />
      <Flex as="section" w="100%" maxW="44em" align="center" justify="center">
        <Flex>
          <form
            style={{
              maxWidth: '22em',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5em',
            }}
          >
            <Heading size="lg" mb="1em">
              Entre já na sua conta
            </Heading>
            <Input
              type="text"
              placeholder="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              w="100%"
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              w="100%"
            />
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
