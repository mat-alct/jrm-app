import { toaster } from '@/components/ui/toaster';
import Login from '@/pages/login';
import { fakeAuthUser, TestAuthProvider } from '@/tests/helpers/authTestUtils';

import { fireEvent, render, screen, waitFor } from '../testUtils';

const push = jest.fn();
jest.mock('next/router', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/components/ui/toaster', () => ({
  toaster: { create: jest.fn() },
}));

function renderLogin(
  signIn = jest.fn(),
  user: ReturnType<typeof fakeAuthUser> | null = null,
) {
  render(
    <TestAuthProvider user={user} signIn={signIn}>
      <Login />
    </TestAuthProvider>,
  );
  return signIn;
}

function fillCredentials(email = 'admin@jrm.com', password = 'Seed@12345') {
  fireEvent.change(screen.getByPlaceholderText('Email'), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText('Senha'), {
    target: { value: password },
  });
}

describe('pages/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('chama signIn com as credenciais e redireciona para a home', async () => {
    const signIn = renderLogin(jest.fn().mockResolvedValue(undefined));

    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith('admin@jrm.com', 'Seed@12345'),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });

  it('mostra erro de credencial invalida e nao redireciona', async () => {
    renderLogin(
      jest.fn().mockRejectedValue(new Error('auth/invalid-credential')),
    );

    fillCredentials('admin@jrm.com', 'senha-errada');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Erro de autenticação',
          description: 'Email ou senha incorretos.',
        }),
      ),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('valida email e senha pelo schema antes de chamar signIn', async () => {
    const signIn = renderLogin();

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Email obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Senha obrigatória')).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('recusa senha com menos de 8 caracteres', async () => {
    const signIn = renderLogin();

    fillCredentials('admin@jrm.com', '1234567');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Senha precisa de no mínimo 8 dígitos'),
    ).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('redireciona quem ja esta logado para a home', async () => {
    renderLogin(jest.fn(), fakeAuthUser());

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });
});
