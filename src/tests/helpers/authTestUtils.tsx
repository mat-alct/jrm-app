import { User } from 'firebase/auth';
import React from 'react';

import { AuthContext, AuthContextData } from '@/hooks/authContext';

/** Usuario minimo do Firebase Auth, suficiente para os componentes do app. */
export function fakeAuthUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'user-uid',
    email: 'user@jrm.com',
    displayName: 'Usuario de Teste',
    ...overrides,
  } as User;
}

export interface AuthProviderStub {
  user?: User | null;
  signIn?: AuthContextData['signIn'];
  signOut?: AuthContextData['signOut'];
}

/**
 * Provider de auth com valor controlado. O plano exige nao mockar `useAuth` via
 * jest.mock — o hook real roda, apenas o valor do contexto e nosso.
 * `user: undefined` = carregando; `null` = deslogado.
 */
export function TestAuthProvider({
  children,
  user,
  signIn = jest.fn(),
  signOut = jest.fn(),
}: AuthProviderStub & { children: React.ReactNode }) {
  const value = React.useMemo<AuthContextData>(
    () => ({ user, signIn, signOut }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
