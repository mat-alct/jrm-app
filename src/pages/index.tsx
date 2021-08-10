import { Button } from '@chakra-ui/react';
import firebase from 'firebase/app';
import { AuthAction, withAuthUser } from 'next-firebase-auth';

import { Loader } from '../components/Loader';

const Dashboard = () => {
  return (
    <>
      <h1>Dashboard</h1>
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
})(Dashboard);
