import { Timestamp } from 'firebase/firestore';

import ProjectItemDetail from '@/pages/projetos/[projectId]/itens/[itemId]';
import { listItemAssemblerAssignments } from '@/services/projects/assembler.service';
import { useAttachments } from '@/services/projects/attachmentHooks';
import { useItemVersions } from '@/services/projects/designer.service';
import {
  useItemStatusHistory,
  useProjectItem,
  useUpdateItemStatus,
} from '@/services/projects/projectHooks';
import { useAppUser } from '@/services/projects/users.service';
import { buildAppUser, buildProjectItem } from '@/tests/helpers/factories';

import { render, screen } from '../../testUtils';

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    query: { projectId: 'project-1', itemId: 'item-1' },
  }),
}));
jest.mock('@/hooks/authContext', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}));
jest.mock('@/services/projects/users.service', () => ({
  useAppUser: jest.fn(),
}));
jest.mock('@/services/projects/projectHooks', () => ({
  useProjectItem: jest.fn(),
  useItemStatusHistory: jest.fn(),
  useUpdateItemStatus: jest.fn(),
}));
jest.mock('@/services/projects/attachmentHooks', () => ({
  useAttachments: jest.fn(),
}));
jest.mock('@/services/projects/designer.service', () => ({
  approveItemForDesign: jest.fn(),
  useItemVersions: jest.fn(),
}));
jest.mock('@/services/projects/adminUsers', () => ({
  useUsersByRole: jest.fn(() => ({ data: [] })),
}));
jest.mock('@/services/projects/assembler.service', () => ({
  assignAssemblers: jest.fn(),
  listItemAssemblerAssignments: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/services/projects/budget.service', () => ({
  saveItemBudget: jest.fn(),
  sendBudgetToClient: jest.fn(),
}));
jest.mock('@/components/Dashboard', () => ({
  Dashboard: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('@/components/Dashboard/Content/Header', () => ({
  Header: ({ pageTitle }: { pageTitle: string }) => <h1>{pageTitle}</h1>,
}));
jest.mock('@/components/projects/AttachmentUploader', () => ({
  AttachmentUploader: () => <div>Uploader de anexos</div>,
}));
jest.mock('@/components/projects/AttachmentList', () => ({
  AttachmentList: () => <div>Lista de anexos</div>,
}));
jest.mock('@/components/projects/ProjectItemTimeline', () => ({
  ProjectItemTimeline: () => <div>Linha do tempo</div>,
}));
jest.mock('@/components/assembler/AssemblerAssignmentsPanel', () => ({
  AssemblerAssignmentsPanel: () => <div>Lista de montadores</div>,
}));
jest.mock('@/components/projects/AssignDesignerModal', () => ({
  AssignDesignerModal: () => null,
}));

function mockPage(role: 'admin' | 'seller', locked: boolean) {
  jest.mocked(useAppUser).mockReturnValue({
    data: buildAppUser({ id: 'user-1', roles: [role] }),
    isLoading: false,
  } as ReturnType<typeof useAppUser>);
  jest.mocked(useProjectItem).mockReturnValue({
    data: buildProjectItem({
      material: 'MDF branco',
      description: 'Descrição confidencial',
      notes: 'Observação confidencial',
      status: locked ? 'em_producao' : 'aguardando_desenho',
      ...(locked ? { assemblerAssignedAt: Timestamp.now() } : {}),
    }),
    isLoading: false,
  } as ReturnType<typeof useProjectItem>);
  jest
    .mocked(useItemStatusHistory)
    .mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useItemStatusHistory
    >);
  jest
    .mocked(useAttachments)
    .mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useAttachments
    >);
  jest
    .mocked(useItemVersions)
    .mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useItemVersions
    >);
  jest.mocked(useUpdateItemStatus).mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateItemStatus>);
}

describe('Página: detalhe do item — bloqueio do vendedor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(listItemAssemblerAssignments).mockResolvedValue([]);
  });

  it('mostra apenas nome, ambiente e status ao vendedor depois da atribuicao', () => {
    mockPage('seller', true);

    render(<ProjectItemDetail />);

    expect(
      screen.getByRole('heading', { name: 'Cozinha planejada' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Ambiente: Cozinha'),
    ).toBeInTheDocument();
    expect(screen.getByText('Em produção')).toBeInTheDocument();
    expect(screen.queryByText('MDF branco')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Descrição confidencial'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Orçamento' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Desenho' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Montadores' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Histórico' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Anexos do item' }),
    ).not.toBeInTheDocument();
    expect(useAttachments).toHaveBeenCalledWith(
      'project-1',
      'item-1',
      false,
    );
    expect(useItemVersions).toHaveBeenCalledWith(
      'project-1',
      'item-1',
      false,
    );
    expect(useItemStatusHistory).toHaveBeenCalledWith(
      'project-1',
      'item-1',
      false,
    );
    expect(listItemAssemblerAssignments).not.toHaveBeenCalled();
  });

  it('mantem todos os detalhes visiveis para o admin', () => {
    mockPage('admin', true);

    render(<ProjectItemDetail />);

    expect(screen.getByText('MDF branco')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Orçamento' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Desenho' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Montadores' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Histórico' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Anexos do item' }),
    ).toBeInTheDocument();
  });
});
