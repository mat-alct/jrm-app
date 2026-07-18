import { Timestamp } from 'firebase/firestore';

import ProjectDetail from '@/pages/projetos/[projectId]/index';
import { useNotifications } from '@/services/projects/notification.service';
import { useProject, useProjectItems } from '@/services/projects/projectHooks';
import { Project, ProjectNotification } from '@/types/projects';

import { act, fireEvent, render, screen } from '../../testUtils';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: { projectId: 'project-1' } }),
}));
jest.mock('@/hooks/authContext', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}));
jest.mock('@/services/projects/projectHooks', () => ({
  useProject: jest.fn(),
  useProjectItems: jest.fn(),
}));
jest.mock('@/services/projects/notification.service', () => ({
  useNotifications: jest.fn(),
}));
jest.mock('@/components/Dashboard', () => ({
  Dashboard: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('@/components/Dashboard/Content/Header', () => ({
  Header: ({ pageTitle }: { pageTitle: string }) => <h1>{pageTitle}</h1>,
}));
jest.mock('@/components/projects/EditCustomerDataModal', () => ({
  EditCustomerDataModal: () => null,
}));
jest.mock('@/components/projects/ClientAccessPanel', () => ({
  ClientAccessPanel: () => null,
}));
jest.mock('@/components/projects/AddProjectItemModal', () => ({
  AddProjectItemModal: () => null,
}));

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    customerName: 'Cliente Alpha',
    customerPhone: '11999999999',
    sellerId: 'seller-1',
    clientAccessCodeHash: 'hash',
    clientAccessPublicId: 'pub-1',
    itemSummary: {
      total: 0,
      aguardandoAprovacao: 0,
      aprovados: 0,
      emProducao: 0,
      emMontagem: 0,
      finalizados: 0,
      atrasados: 0,
    },
    totalCustomerValue: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: 'seller-1',
    updatedBy: 'seller-1',
    ...overrides,
  };
}

function notification(
  overrides: Partial<ProjectNotification> = {},
): ProjectNotification {
  return {
    id: 'notification-1',
    projectId: 'project-1',
    itemId: 'item-1',
    itemName: 'Cozinha',
    type: 'info_solicitada',
    message: 'Falta a medida do vão',
    createdBy: 'designer-1',
    createdByRole: 'designer',
    resolvedAt: null,
    createdAt: Timestamp.now(),
    ...overrides,
  };
}

function mockHooks(notifications: ProjectNotification[]) {
  jest.mocked(useProject).mockReturnValue({
    data: project(),
    isLoading: false,
  } as ReturnType<typeof useProject>);
  jest.mocked(useProjectItems).mockReturnValue({
    data: [],
    isLoading: false,
  } as unknown as ReturnType<typeof useProjectItems>);
  jest.mocked(useNotifications).mockReturnValue({
    data: notifications,
    isLoading: false,
  } as ReturnType<typeof useNotifications>);
}

describe('Página: /projetos/[projectId] (abas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mostra as tres abas sem badge quando nao ha notificacao pendente', () => {
    mockHooks([]);
    render(<ProjectDetail />);

    expect(
      screen.getByRole('tab', { name: 'Visão geral' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Itens' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Notificações' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('mostra o badge com a contagem de notificacoes nao resolvidas', () => {
    mockHooks([
      notification({ id: 'n1' }),
      notification({ id: 'n2', resolvedAt: Timestamp.now() }),
    ]);
    render(<ProjectDetail />);

    expect(
      screen.getByRole('tab', { name: 'Notificações 1' }),
    ).toBeInTheDocument();
  });

  it('a aba Notificações lista a notificacao pendente ao ser selecionada', async () => {
    mockHooks([notification()]);
    render(<ProjectDetail />);

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Notificações 1' }));
    });

    expect(screen.getByText('Falta a medida do vão')).toBeInTheDocument();
  });
});
