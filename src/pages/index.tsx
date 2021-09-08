import Head from 'next/head';
import { AuthAction, withAuthUser } from 'next-firebase-auth';
import React from 'react';

import { Dashboard } from '../components/Dashboard';
import { Header } from '../components/Dashboard/Content/Header';
import { Loader } from '../components/Loader';

const Home = () => {
  return (
    <>
      <Head>
        <title>Início | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Início" />
      </Dashboard>
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
