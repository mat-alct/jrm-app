import { Button } from '@chakra-ui/react';
import firebase from 'firebase/app';
import { AuthAction, withAuthUser } from 'next-firebase-auth';

import { Dashboard } from '../components/Dashboard';
import { Loader } from '../components/Loader';

const Home = () => {
  return (
    <>
      <Dashboard>Dashboard</Dashboard>
      <Button onClick={() => firebase.auth().signOut()}>Sair</Button>
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
