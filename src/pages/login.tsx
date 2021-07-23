import 'firebase/auth';

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
    <>
      <input
        type="text"
        placeholder="E-mail"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button type="button" onClick={() => handleLogin()}>
        Entrar
      </button>
    </>
  );
};

export default withAuthUser({
  whenAuthed: AuthAction.REDIRECT_TO_APP,
  whenUnauthedBeforeInit: AuthAction.SHOW_LOADER,
  whenUnauthedAfterInit: AuthAction.RENDER,
  LoaderComponent: MyLoader,
})(LoginPage);
