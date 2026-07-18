import { Timestamp } from 'firebase/firestore';

import ProjetosIndex from '@/pages/projetos/index';
import {
  useClaimDesignItem,
  useDesignQueue,
} from '@/services/projects/designer.service';
import { useProjects } from '@/services/projects/projectHooks';
import { useAppUser } from '@/services/projects/users.service';
import { AppUser, ProjectItem } from '@/types/projects';

import { render, screen } from '../../testUtils';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}));
jest.mock('@/hooks/authContext', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}));
jest.mock('@/services/projects/users.service', () => ({
  useAppUser: jest.fn(),
}));
jest.mock('@/services/projects/projectHooks', () => ({
  useProjects: jest.fn(),
}));
jest.mock('@/services/projects/designer.service', () => ({
  useDesignQueue: jest.fn(),
  useClaimDesignItem: jest.fn(),
}));
jest.mock('@/components/Dashboard', () => ({
  Dashboard: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('@/components/Dashboard/Content/Header', () => ({
  Header: ({
    children,
    pageTitle,
  }: {
    children?: React.ReactNode;
    pageTitle: string;
  }) => (
    <header>
      <h1>{pageTitle}</h1>
      {children}
    </header>
  ),
}));

function appUser(overrides: Partial<AppUser>): AppUser {
  return {
    id: 'user-1',
    name: 'Fulano',
    email: 'fulano@example.com',
    roles: ['admin'],
    active: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

function queueItem(overrides: Partial<ProjectItem>): ProjectItem {
  return {
    id: 'item-1',
    projectId: 'project-1',
    name: 'Cozinha planejada',
    environment: 'Cozinha',
    status: 'aguardando_desenho',
    clientApprovalStatus: 'aguardando',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: 'seller-1',
    updatedBy: 'seller-1',
    ...overrides,
  };
}

function mockHooks({
  roles,
  projects = [],
  queue = [],
}: {
  roles: AppUser['roles'];
  projects?: unknown[];
  queue?: ProjectItem[];
}) {
  jest.mocked(useAppUser).mockReturnValue({
    data: appUser({ roles }),
    isLoading: false,
  } as ReturnType<typeof useAppUser>);
  jest.mocked(useProjects).mockReturnValue({
    data: projects,
    isLoading: false,
    isFetching: false,
  } as ReturnType<typeof useProjects>);
  jest.mocked(useDesignQueue).mockReturnValue({
    data: queue,
    isLoading: false,
    isFetching: false,
  } as ReturnType<typeof useDesignQueue>);
  jest.mocked(useClaimDesignItem).mockReturnValue({
    mutateAsync: jest.fn(),
    variables: undefined,
  } as unknown as ReturnType<typeof useClaimDesignItem>);
}

describe('Página: /projetos (abas por papel)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin ve as duas abas, com Projetos selecionada por padrao', () => {
    mockHooks({
      roles: ['admin'],
      projects: [
        {
          id: 'p1',
          customerName: 'Cliente Um',
          itemSummary: { total: 1, atrasados: 0 },
        },
      ],
    });

    render(<ProjetosIndex />);

    expect(screen.getByRole('tab', { name: 'Projetos' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Desenhos pendentes' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cliente Um')).toBeInTheDocument();
  });

  it('vendedor ve apenas a aba Projetos', () => {
    mockHooks({
      roles: ['seller'],
      projects: [
        {
          id: 'p-outro',
          customerName: 'Cliente de Outro Vendedor',
          sellerName: 'Outro Vendedor',
          itemSummary: { total: 1, atrasados: 0 },
        },
      ],
    });

    render(<ProjetosIndex />);

    expect(screen.getByRole('tab', { name: 'Projetos' })).toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: 'Desenhos pendentes' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Cliente de Outro Vendedor')).toBeInTheDocument();
    expect(useProjects).toHaveBeenCalledWith({ search: undefined });
  });

  it('desenhista ve apenas a aba Desenhos pendentes, com a fila', () => {
    mockHooks({
      roles: ['designer'],
      queue: [queueItem({ name: 'Cozinha planejada' })],
    });

    render(<ProjetosIndex />);

    expect(
      screen.queryByRole('tab', { name: 'Projetos' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Desenhos pendentes' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cozinha planejada')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Novo Projeto' }),
    ).not.toBeInTheDocument();
  });
});
