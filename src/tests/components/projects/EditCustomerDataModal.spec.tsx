import { EditCustomerDataModal } from '@/components/projects/EditCustomerDataModal';
import { toaster } from '@/components/ui/toaster';
import { updateProject } from '@/services/projects/project.service';
import { buildProject } from '@/tests/helpers/factories';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

jest.mock('@/services/projects/project.service', () => ({
  ...jest.requireActual('@/services/projects/project.service'),
  updateProject: jest.fn(),
}));
jest.mock('@/components/ui/toaster', () => ({
  toaster: { create: jest.fn() },
}));

const mockedUpdateProject = jest.mocked(updateProject);
const mockedToast = jest.mocked(toaster.create);

const project = buildProject({
  id: 'project-1',
  customerName: 'Cliente Teste',
  customerPhone: '24999990000',
  customerEmail: 'cliente@example.com',
  customerAddress: 'Rua Teste, 123',
});

describe('EditCustomerDataModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpdateProject.mockResolvedValue(undefined);
  });

  it('preenche o formulario com os dados atuais do projeto', () => {
    render(
      <EditCustomerDataModal
        isOpen
        onClose={jest.fn()}
        project={project}
        updatedBy="admin-1"
      />,
    );

    expect(screen.getByLabelText('Nome do cliente')).toHaveValue(
      'Cliente Teste',
    );
    expect(screen.getByLabelText('Telefone')).toHaveValue('24999990000');
    expect(screen.getByLabelText('E-mail')).toHaveValue(
      'cliente@example.com',
    );
    expect(screen.getByLabelText('Endereço')).toHaveValue('Rua Teste, 123');
  });

  it('permite salvar sem e-mail/endereço preenchidos', () => {
    const empty = buildProject({
      customerName: 'Cliente Sem Dados',
      customerPhone: '24999990000',
      customerEmail: undefined,
      customerAddress: undefined,
    });

    render(
      <EditCustomerDataModal
        isOpen
        onClose={jest.fn()}
        project={empty}
        updatedBy="admin-1"
      />,
    );

    expect(screen.getByLabelText('E-mail')).toHaveValue('');
    expect(screen.getByLabelText('Endereço')).toHaveValue('');
  });

  it('salva as alteracoes e fecha o modal', async () => {
    const onClose = jest.fn();
    render(
      <EditCustomerDataModal
        isOpen
        onClose={onClose}
        project={project}
        updatedBy="admin-1"
      />,
    );

    fireEvent.change(screen.getByLabelText('Endereço'), {
      target: { value: 'Rua Nova, 456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mockedUpdateProject).toHaveBeenCalled());
    expect(mockedUpdateProject).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ customerAddress: 'Rua Nova, 456' }),
      'admin-1',
    );
    expect(mockedToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('mostra erro de validacao ao limpar o nome', async () => {
    render(
      <EditCustomerDataModal
        isOpen
        onClose={jest.fn()}
        project={project}
        updatedBy="admin-1"
      />,
    );

    fireEvent.change(screen.getByLabelText('Nome do cliente'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Nome do cliente é obrigatório'),
    ).toBeInTheDocument();
    expect(mockedUpdateProject).not.toHaveBeenCalled();
  });
});
