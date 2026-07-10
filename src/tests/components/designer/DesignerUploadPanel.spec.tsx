import { DesignerUploadPanel } from '@/components/designer/DesignerUploadPanel';
import { toaster } from '@/components/ui/toaster';
import { submitDesignerVersion } from '@/services/projects/designer.service';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

jest.mock('@/services/projects/designer.service', () => ({
  submitDesignerVersion: jest.fn(),
}));
jest.mock('@/components/ui/toaster', () => ({ toaster: { create: jest.fn() } }));

const actor = { uid: 'designer-1', name: 'Desenhista', role: 'designer' as const };
const mockedSubmit = jest.mocked(submitDesignerVersion);

function renderPanel() {
  return render(
    <DesignerUploadPanel projectId="project-1" itemId="item-1" actor={actor} />,
  );
}

function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

const glb = () => new File(['glb'], 'armario.glb', { type: 'model/gltf-binary' });

describe('DesignerUploadPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSubmit.mockResolvedValue(undefined as never);
  });

  it('envia arquivos e descricao ao service', async () => {
    const { container } = renderPanel();

    fireEvent.change(fileInput(container), { target: { files: [glb()] } });
    fireEvent.change(screen.getByPlaceholderText('Descrição da versão (opcional)'), {
      target: { value: 'Primeira versão' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar versão' }));

    await waitFor(() => expect(mockedSubmit).toHaveBeenCalled());
    expect(mockedSubmit).toHaveBeenCalledWith(
      'project-1',
      'item-1',
      [expect.any(File)],
      'Primeira versão',
      actor,
    );
  });

  it('envia descricao undefined quando o campo fica vazio', async () => {
    const { container } = renderPanel();

    fireEvent.change(fileInput(container), { target: { files: [glb()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar versão' }));

    await waitFor(() => expect(mockedSubmit).toHaveBeenCalled());
    expect(mockedSubmit).toHaveBeenCalledWith(
      'project-1',
      'item-1',
      [expect.any(File)],
      undefined,
      actor,
    );
  });

  it('limpa o formulario e avisa sucesso', async () => {
    const { container } = renderPanel();

    fireEvent.change(fileInput(container), { target: { files: [glb()] } });
    fireEvent.change(screen.getByPlaceholderText('Descrição da versão (opcional)'), {
      target: { value: 'Versão A' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar versão' }));

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', description: 'Versão enviada.' }),
      ),
    );
    expect(
      screen.getByPlaceholderText('Descrição da versão (opcional)'),
    ).toHaveValue('');
  });

  it('mostra a mensagem de erro do service', async () => {
    mockedSubmit.mockRejectedValue(new Error('Item nao atribuido ao desenhista'));
    const { container } = renderPanel();

    fireEvent.change(fileInput(container), { target: { files: [glb()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar versão' }));

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description: 'Item nao atribuido ao desenhista',
        }),
      ),
    );
  });

  it('aceita multiplos arquivos numa unica versao', async () => {
    const { container } = renderPanel();

    fireEvent.change(fileInput(container), {
      target: { files: [glb(), new File(['pdf'], 'planta.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar versão' }));

    await waitFor(() => expect(mockedSubmit).toHaveBeenCalled());
    expect(mockedSubmit.mock.calls[0][2]).toHaveLength(2);
  });
});
