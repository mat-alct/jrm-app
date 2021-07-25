import { Button, Spinner } from '@chakra-ui/react';
import firebase from 'firebase/app';
import { AuthAction, withAuthUser } from 'next-firebase-auth';

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
  LoaderComponent: MyLoader,
})(Dashboard);
