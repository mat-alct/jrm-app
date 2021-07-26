import 'firebase/auth';

import { EmailIcon, LockIcon } from '@chakra-ui/icons';
import {
  Button,
  Flex,
  FormControl,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
} from '@chakra-ui/react';
import firebase from 'firebase/app';
import { AuthAction, withAuthUser } from 'next-firebase-auth';
import * as Yup from 'yup';

const MyLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
    }}
  >
    <Spinner size="lg" />
  </div>
);
const LoginPage = () => {
  const handleLogin = async (email: string, password: string) => {
    await firebase.auth().signInWithEmailAndPassword(email, password);
  };

  const validationSchema = Yup.object().shape({
    email: Yup.string().required('Email obrigatório'),
    password: Yup.string().required('Senha obrigatória'),
  });

  return (
    <Flex as="main" align="stretch" h="100vh">
      <Flex
        flex="1"
        background="url(/images/logInBackground.png)"
        backgroundSize="cover"
      />
      <Flex as="section" w="100%" maxW="44em" align="center" justify="center">
        <Flex direction="column" align="center" justify="center">
          <img
            src="/images/logo.svg"
            alt="Logotipo JRM"
            style={{ maxWidth: '250px', height: 'auto', marginBottom: '4em' }}
          />
          <Flex maxW="22em" direction="column" align="center" justify="center">
            <Heading size="lg" mb="1em">
              Entre já na sua conta
            </Heading>

            <FormControl gap="1em">
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <EmailIcon color="gray.300" size={20} />
                </InputLeftElement>
                <Input type="email" placeholder="E-mail" />
              </InputGroup>
            </FormControl>

            <FormControl>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <LockIcon color="gray.300" size={20} />
                </InputLeftElement>
                <Input type="password" placeholder="Senha" />
              </InputGroup>
            </FormControl>

            <Button variant="solid" type="submit" isFullWidth>
              Entrar
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default withAuthUser({
  whenAuthed: AuthAction.REDIRECT_TO_APP,
  whenUnauthedBeforeInit: AuthAction.SHOW_LOADER,
  whenUnauthedAfterInit: AuthAction.RENDER,
  appPageURL: '/',
  LoaderComponent: MyLoader,
})(LoginPage);
