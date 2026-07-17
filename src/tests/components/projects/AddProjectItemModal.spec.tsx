import { AddProjectItemModal } from '@/components/projects/AddProjectItemModal';
import { toaster } from '@/components/ui/toaster';
import { createProjectItem } from '@/services/projects/projectItem.service';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

jest.mock('@/services/projects/projectItem.service', () => ({
  ...jest.requireActual('@/services/projects/projectItem.service'),
  createProjectItem: jest.fn(),
}));
jest.mock('@/components/ui/toaster', () => ({
  toaster: { create: jest.fn() },
}));

const mockedCreateProjectItem = jest.mocked(createProjectItem);
const mockedToast = jest.mocked(toaster.create);

describe('AddProjectItemModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateProjectItem.mockResolvedValue('item-1');
  });

  it('renderiza os campos do item', () => {
    render(
      <AddProjectItemModal
        isOpen
        onClose={jest.fn()}
        projectId="project-1"
        createdBy="admin-1"
      />,
    );

    expect(screen.getByLabelText('Nome do item')).toBeInTheDocument();
    expect(screen.getByLabelText('Ambiente')).toBeInTheDocument();
  });

  it('mostra erros de validacao ao salvar vazio', async () => {
    render(
      <AddProjectItemModal
        isOpen
        onClose={jest.fn()}
        projectId="project-1"
        createdBy="admin-1"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(
      await screen.findByText('Nome do item é obrigatório'),
    ).toBeInTheDocument();
    expect(mockedCreateProjectItem).not.toHaveBeenCalled();
  });

  it('cria o item e fecha o modal', async () => {
    const onClose = jest.fn();
    render(
      <AddProjectItemModal
        isOpen
        onClose={onClose}
        projectId="project-1"
        createdBy="admin-1"
      />,
    );

    fireEvent.change(screen.getByLabelText('Nome do item'), {
      target: { value: 'Cozinha planejada' },
    });
    fireEvent.change(screen.getByLabelText('Ambiente'), {
      target: { value: 'Cozinha' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(mockedCreateProjectItem).toHaveBeenCalled());
    expect(mockedCreateProjectItem).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({
        name: 'Cozinha planejada',
        environment: 'Cozinha',
      }),
      'admin-1',
    );
    expect(mockedToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
