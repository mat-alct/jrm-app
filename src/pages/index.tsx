import { Button } from '@chakra-ui/react';
import firebase from 'firebase/app';
import Head from 'next/head';
import { AuthAction, withAuthUser } from 'next-firebase-auth';

import { Dashboard } from '../components/Dashboard';
import { Loader } from '../components/Loader';

const Home = () => {
  return (
    <>
      <Head>
        <title>Início | JRM Compensados</title>
      </Head>
      <Dashboard />
    </>
  );
};

export default withAuthUser({
  whenAuthed: AuthAction.RENDER,
  whenUnauthedAfterInit: AuthAction.REDIRECT_TO_LOGIN,
  whenUnauthedBeforeInit: AuthAction.SHOW_LOADER,
  authPageURL: '/login',
  LoaderComponent: Loader,
})(Home);
