import { User } from 'firebase/auth';
import React from 'react';

import { AccessGate } from '@/components/auth/AccessGate';
import { useAppUser } from '@/services/projects/users.service';
import { fakeAuthUser, TestAuthProvider } from '@/tests/helpers/authTestUtils';
import { AppUser, UserRole } from '@/types/projects';

import { render, screen } from '../../testUtils';

// Camada de service: mock permitido em teste de componente.
jest.mock('@/services/projects/users.service', () => ({
  useAppUser: jest.fn(),
}));

const replace = jest.fn();
const mockRouter = { pathname: '/', replace };

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

const mockedUseAppUser = jest.mocked(useAppUser);

function setAppUser(
  roles: UserRole[] | undefined,
  { isLoading = false }: { isLoading?: boolean } = {},
) {
  const data: AppUser | null = roles
    ? ({ id: 'user-uid', name: 'Usuario', roles, active: true } as AppUser)
    : null;

  mockedUseAppUser.mockReturnValue({ data, isLoading } as ReturnType<
    typeof useAppUser
  >);
}

function renderGate(user: User | null | undefined) {
  return render(
    <TestAuthProvider user={user}>
      <AccessGate>
        <p>conteudo protegido</p>
      </AccessGate>
    </TestAuthProvider>,
  );
}

describe('AccessGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.pathname = '/';
  });

  it('redireciona para /login quando o usuario esta deslogado', () => {
    setAppUser(undefined);

    renderGate(null);

    expect(replace).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('conteudo protegido')).not.toBeInTheDocument();
  });

  it('nao vaza conteudo protegido enquanto a autenticacao carrega', () => {
    setAppUser(undefined, { isLoading: true });

    renderGate(undefined);

    expect(screen.queryByText('conteudo protegido')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('nao vaza conteudo protegido enquanto o perfil (appUser) carrega', () => {
    setAppUser(undefined, { isLoading: true });

    renderGate(fakeAuthUser());

    expect(screen.queryByText('conteudo protegido')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renderiza o conteudo para usuario com papel permitido na rota', () => {
    mockRouter.pathname = '/projetos';
    setAppUser(['seller']);

    renderGate(fakeAuthUser());

    expect(screen.getByText('conteudo protegido')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redireciona para a rota default do papel quando o acesso e negado', () => {
    mockRouter.pathname = '/administracao/usuarios';
    setAppUser(['designer']);

    renderGate(fakeAuthUser());

    expect(replace).toHaveBeenCalledWith('/projetos');
    expect(screen.queryByText('conteudo protegido')).not.toBeInTheDocument();
  });

  it('redireciona o montador para a area dele ao tentar rota de admin', () => {
    mockRouter.pathname = '/projetos/dashboard';
    setAppUser(['assembler']);

    renderGate(fakeAuthUser());

    expect(replace).toHaveBeenCalledWith('/montador');
  });

  it('nao redireciona o admin em nenhuma rota interna', () => {
    mockRouter.pathname = '/administracao/financeiro-montadores';
    setAppUser(['admin']);

    renderGate(fakeAuthUser());

    expect(screen.getByText('conteudo protegido')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it.each(['/login', '/cliente/[publicId]', '/cliente/[publicId]/acompanhar'])(
    'renderiza a rota publica %s sem autenticacao e sem redirect',
    pathname => {
      mockRouter.pathname = pathname;
      setAppUser(undefined);

      renderGate(null);

      expect(screen.getByText('conteudo protegido')).toBeInTheDocument();
      expect(replace).not.toHaveBeenCalled();
    },
  );

  it('esconde o conteudo quando o usuario esta logado mas sem perfil no Firestore', () => {
    mockRouter.pathname = '/projetos';
    setAppUser(undefined);

    renderGate(fakeAuthUser());

    expect(screen.queryByText('conteudo protegido')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
