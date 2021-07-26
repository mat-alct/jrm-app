import 'firebase/auth';

import { EmailIcon, LockIcon } from '@chakra-ui/icons';
import {
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import firebase from 'firebase/app';
import { AuthAction, withAuthUser } from 'next-firebase-auth';
import { SubmitHandler, useForm } from 'react-hook-form';
import * as Yup from 'yup';

interface HandleLoginProps {
  email: string;
  password: string;
}

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
  const validationSchema = Yup.object().shape({
    email: Yup.string().required('Email obrigatório'),
    password: Yup.string()
      .required('Senha obrigatória')
      .min(8, 'Senha precisa de no mínimo 8 dígitos'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HandleLoginProps>({
    resolver: yupResolver(validationSchema),
  });

  const handleLogin: SubmitHandler<HandleLoginProps> = async submitData => {
    await firebase
      .auth()
      .signInWithEmailAndPassword(submitData.email, submitData.password);
  };

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
            <form
              noValidate
              onSubmit={handleSubmit(handleLogin)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5em',
                width: '100%',
                maxWidth: '21em',
              }}
            >
              <FormControl isInvalid={!!errors.email}>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <EmailIcon color="gray.300" size={20} />
                  </InputLeftElement>
                  <Input
                    id="email"
                    {...register('email')}
                    type="email"
                    placeholder="E-mail"
                    defaultValue="mateus@jrmcompensados.com"
                  />
                </InputGroup>
                <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={!!errors.password}>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <LockIcon color="gray.300" size={20} />
                  </InputLeftElement>
                  <Input
                    id="password"
                    {...register('password')}
                    type="password"
                    placeholder="Senha"
                    defaultValue="12345678"
                  />
                </InputGroup>
                <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
              </FormControl>

              <Button
                isLoading={isSubmitting}
                variant="solid"
                type="submit"
                isFullWidth
              >
                Entrar
              </Button>
            </form>
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
