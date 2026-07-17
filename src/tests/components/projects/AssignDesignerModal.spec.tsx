import { AssignDesignerModal } from '@/components/projects/AssignDesignerModal';
import { toaster } from '@/components/ui/toaster';
import { useUsersByRole } from '@/services/projects/adminUsers';
import { useAssignDesignerByName } from '@/services/projects/designer.service';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

jest.mock('@/services/projects/adminUsers', () => ({
  useUsersByRole: jest.fn(),
}));
jest.mock('@/services/projects/designer.service', () => ({
  useAssignDesignerByName: jest.fn(),
}));
jest.mock('@/components/ui/toaster', () => ({
  toaster: { create: jest.fn() },
}));

const actor = { uid: 'seller-1' };
const mutateAsync = jest.fn();

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

describe('AssignDesignerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useUsersByRole).mockReturnValue({
      data: [
        { id: 'designer-1', name: 'Renato' },
        { id: 'designer-2', name: 'Marcio' },
      ],
    } as ReturnType<typeof useUsersByRole>);
    mutateAsync.mockResolvedValue(undefined);
    jest.mocked(useAssignDesignerByName).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useAssignDesignerByName>);
  });

  it('mostra os atalhos Renato e Marcio', () => {
    renderModal();

    expect(screen.getByRole('button', { name: 'Renato' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcio' })).toBeInTheDocument();
  });

  it('preenche o campo ao clicar num atalho e atribui', async () => {
    const onClose = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Renato' }));
    expect(screen.getByPlaceholderText('Outros')).toHaveValue('Renato');

    fireEvent.click(screen.getByRole('button', { name: 'Atribuir' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith({
      projectId: 'project-1',
      itemId: 'item-1',
      name: 'Renato',
      activeDesigners: [
        { id: 'designer-1', name: 'Renato' },
        { id: 'designer-2', name: 'Marcio' },
      ],
      actor,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toaster.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
  });

  it('atribui um nome digitado em "Outros"', async () => {
    renderModal();

    fireEvent.change(screen.getByPlaceholderText('Outros'), {
      target: { value: 'Fulano Externo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Fulano Externo' }),
    );
  });

  it('mostra o erro do service e nao fecha o modal', async () => {
    mutateAsync.mockRejectedValue(new Error('Informe o nome do desenhista.'));
    const onClose = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Atribuir' }));

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description: 'Informe o nome do desenhista.',
        }),
      ),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('fecha ao cancelar sem gravar nada', () => {
    const onClose = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('comeca com o campo vazio', () => {
    renderModal();

    expect(screen.getByPlaceholderText('Outros')).toHaveValue('');
  });
});
