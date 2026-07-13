import { AssignDesignerModal } from '@/components/projects/AssignDesignerModal';
import { toaster } from '@/components/ui/toaster';
import { useUsersByRole } from '@/services/projects/adminUsers';
import { getDeadlineDefaults } from '@/services/projects/deadline.service';
import { updateProjectItem } from '@/services/projects/projectItem.service';
import { updateItemStatus } from '@/services/projects/status.service';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

jest.mock('@/services/projects/adminUsers', () => ({
  useUsersByRole: jest.fn(),
}));
jest.mock('@/services/projects/deadline.service', () => ({
  ...jest.requireActual('@/services/projects/deadline.service'),
  getDeadlineDefaults: jest.fn(),
}));
jest.mock('@/services/projects/projectItem.service', () => ({
  updateProjectItem: jest.fn(),
}));
jest.mock('@/services/projects/status.service', () => ({
  updateItemStatus: jest.fn(),
}));
jest.mock('@/components/ui/toaster', () => ({
  toaster: { create: jest.fn() },
}));

const actor = { uid: 'seller-1', name: 'Vendedor', role: 'seller' as const };

const defaults = {
  desenhoDias: 5,
  orcamentoDias: 2,
  aprovacaoClienteDias: 3,
  atribuicaoMontadorDias: 2,
  producaoDias: 10,
  montagemDias: 2,
};

function renderModal(onClose = jest.fn()) {
  render(
    <AssignDesignerModal
      isOpen
      onClose={onClose}
      projectId="project-1"
      itemId="item-1"
      actor={actor}
    />,
  );
  return onClose;
}

function selectDesigner(id: string) {
  fireEvent.change(document.querySelector('select') as HTMLSelectElement, {
    target: { value: id },
  });
}

describe('AssignDesignerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00.000Z'));

    jest.mocked(useUsersByRole).mockReturnValue({
      data: [
        { id: 'designer-1', name: 'Desenhista Um' },
        { id: 'designer-2', name: 'Desenhista Dois' },
      ],
    } as ReturnType<typeof useUsersByRole>);
    jest.mocked(getDeadlineDefaults).mockResolvedValue(defaults);
    jest.mocked(updateProjectItem).mockResolvedValue(undefined as never);
    jest.mocked(updateItemStatus).mockResolvedValue(undefined as never);
  });

  afterEach(() => jest.useRealTimers());

  it('lista os desenhistas disponiveis', () => {
    renderModal();

    expect(screen.getByText('Desenhista Um')).toBeInTheDocument();
    expect(screen.getByText('Desenhista Dois')).toBeInTheDocument();
  });

  it('preenche o prazo automaticamente ao escolher o desenhista', async () => {
    renderModal();

    selectDesigner('designer-1');

    // 15/01 + desenhoDias (5) = 20/01.
    await waitFor(() =>
      expect(document.querySelector('input[type="date"]')).toHaveValue(
        '2026-01-20',
      ),
    );
  });

  it('atribui o desenhista, grava o prazo e move o status', async () => {
    const onClose = renderModal();

    selectDesigner('designer-1');
    await waitFor(() =>
      expect(document.querySelector('input[type="date"]')).toHaveValue(
        '2026-01-20',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Atribuir' }));

    await waitFor(() => expect(updateProjectItem).toHaveBeenCalled());
    expect(updateProjectItem).toHaveBeenCalledWith(
      'project-1',
      'item-1',
      expect.objectContaining({
        designerId: 'designer-1',
        designerName: 'Desenhista Um',
        deadlineCurrent: expect.anything(),
      }),
      'seller-1',
    );
    expect(updateItemStatus).toHaveBeenCalledWith(
      'project-1',
      'item-1',
      'aguardando_desenho',
      actor,
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toaster.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
  });

  it('recusa o envio sem desenhista escolhido', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Atribuir' }));

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description: 'Selecione um desenhista.',
        }),
      ),
    );
    expect(updateProjectItem).not.toHaveBeenCalled();
    expect(updateItemStatus).not.toHaveBeenCalled();
  });

  it('mostra o erro do service e nao fecha o modal', async () => {
    jest
      .mocked(updateItemStatus)
      .mockRejectedValue(new Error('Transicao nao permitida'));
    const onClose = renderModal();

    selectDesigner('designer-2');
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir' }));

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description: 'Transicao nao permitida',
        }),
      ),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('fecha ao cancelar sem gravar nada', () => {
    const onClose = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
    expect(updateProjectItem).not.toHaveBeenCalled();
  });
});
