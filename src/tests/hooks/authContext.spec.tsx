import React from 'react';

import { AuthProvider, useAuth } from '@/hooks/authContext';

import { act, fireEvent, render, screen, waitFor } from '../testUtils';

const mockOnAuthStateChanged = jest.fn();
const mockSignInWithEmailAndPassword = jest.fn();
const mockFirebaseSignOut = jest.fn();

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockFirebaseSignOut(...args),
}));

jest.mock('@/services/firebase', () => ({ auth: { name: 'test-auth' } }));

let emitAuthState: (user: unknown) => void;

function AuthProbe() {
  const { user, signIn } = useAuth();
  const [error, setError] = React.useState('');

  return (
    <>
      <span>{user === undefined ? 'loading' : (user?.uid ?? 'signed-out')}</span>
      <button
        onClick={() => {
          void signIn('admin@jrm.com', 'Seed@12345').catch(() =>
            setError('session-error'),
          );
        }}
      >
        Entrar
      </button>
      <span>{error}</span>
    </>
  );
}

function fakeUser() {
  return {
    uid: 'admin-uid',
    getIdToken: jest.fn().mockResolvedValue('firebase-id-token'),
  };
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    mockFirebaseSignOut.mockResolvedValue(undefined);
    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, callback: (user: unknown) => void) => {
        emitAuthState = callback;
        return jest.fn();
      },
    );
  });

  it('desfaz o login Firebase quando a sessao do servidor nao e criada', async () => {
    const user = fakeUser();
    mockSignInWithEmailAndPassword.mockResolvedValue({ user });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );
    act(() => emitAuthState(null));
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('session-error')).toBeInTheDocument();
    expect(mockFirebaseSignOut).toHaveBeenCalled();
  });

  it('renova a sessao do servidor para usuario persistido no navegador', async () => {
    const user = fakeUser();
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );
    act(() => emitAuthState(user));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'firebase-id-token' }),
      }),
    );
    expect(await screen.findByText('admin-uid')).toBeInTheDocument();
  });
});
