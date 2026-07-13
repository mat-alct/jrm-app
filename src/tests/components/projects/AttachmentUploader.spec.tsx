import React from 'react';

import { AttachmentUploader } from '@/components/projects/AttachmentUploader';
import { toaster } from '@/components/ui/toaster';
import { uploadAttachment } from '@/services/projects/attachment.service';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

// Camada de service: o hook real (useUploadAttachment) roda de verdade por cima.
jest.mock('@/services/projects/attachment.service', () => ({
  uploadAttachment: jest.fn(),
  listAttachments: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/components/ui/toaster', () => ({
  toaster: { create: jest.fn() },
}));

const mockedUpload = jest.mocked(uploadAttachment);
const mockedToast = jest.mocked(toaster.create);

function renderUploader(
  props: Partial<React.ComponentProps<typeof AttachmentUploader>> = {},
) {
  return render(
    <AttachmentUploader
      projectId="project-1"
      uploadedBy="user-1"
      uploadedByName="Vendedor"
      uploadedByRole="seller"
      {...props}
    />,
  );
}

function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

function selectFiles(container: HTMLElement, files: File[]) {
  fireEvent.change(fileInput(container), { target: { files } });
}

const pdf = () =>
  new File(['conteudo'], 'planta.pdf', { type: 'application/pdf' });
const model3d = () =>
  new File(['glb'], 'armario.glb', { type: 'model/gltf-binary' });

describe('AttachmentUploader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpload.mockResolvedValue({ id: 'attachment-1' } as never);
  });

  it('envia o arquivo com categoria, visibilidade e autor corretos', async () => {
    const { container } = renderUploader();

    fireEvent.change(screen.getByPlaceholderText('Ex: fotos do ambiente'), {
      target: { value: 'medicao' },
    });
    selectFiles(container, [pdf()]);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(mockedUpload).toHaveBeenCalledTimes(1));
    expect(mockedUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        itemId: undefined,
        category: 'medicao',
        visibility: 'internal',
        uploadedBy: 'user-1',
        uploadedByName: 'Vendedor',
        uploadedByRole: 'seller',
        file: expect.any(File),
      }),
    );
  });

  it('repassa o itemId quando o upload e de um item', async () => {
    const { container } = renderUploader({ itemId: 'item-9' });

    fireEvent.change(screen.getByPlaceholderText('Ex: fotos do ambiente'), {
      target: { value: 'desenho' },
    });
    selectFiles(container, [pdf()]);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(mockedUpload).toHaveBeenCalled());
    expect(mockedUpload).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'item-9' }),
    );
  });

  it('usa a visibilidade escolhida', async () => {
    const { container } = renderUploader();

    fireEvent.change(screen.getByPlaceholderText('Ex: fotos do ambiente'), {
      target: { value: 'montagem' },
    });
    // O input de categoria tem `list`, entao tambem expoe role combobox —
    // por isso o select de visibilidade e buscado pela tag.
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, {
      target: { value: 'assembler' },
    });
    selectFiles(container, [pdf()]);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(mockedUpload).toHaveBeenCalled());
    expect(mockedUpload).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: 'assembler' }),
    );
  });

  it('envia um arquivo por vez quando ha varios selecionados', async () => {
    const { container } = renderUploader();

    fireEvent.change(screen.getByPlaceholderText('Ex: fotos do ambiente'), {
      target: { value: 'fotos' },
    });
    selectFiles(container, [pdf(), model3d()]);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(mockedUpload).toHaveBeenCalledTimes(2));
    expect(mockedToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
  });

  it('preenche a categoria automaticamente ao selecionar um modelo 3D', () => {
    const { container } = renderUploader();

    selectFiles(container, [model3d()]);

    expect(screen.getByPlaceholderText('Ex: fotos do ambiente')).toHaveValue(
      'modelo-3d',
    );
  });

  it('nao sobrescreve a categoria ja digitada ao escolher um modelo 3D', () => {
    const { container } = renderUploader();

    fireEvent.change(screen.getByPlaceholderText('Ex: fotos do ambiente'), {
      target: { value: 'minha-categoria' },
    });
    selectFiles(container, [model3d()]);

    expect(screen.getByPlaceholderText('Ex: fotos do ambiente')).toHaveValue(
      'minha-categoria',
    );
  });

  it('recusa o envio sem arquivo ou sem categoria, sem chamar o service', async () => {
    const { container } = renderUploader();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() =>
      expect(mockedToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description: 'Selecione ao menos um arquivo e informe a categoria.',
        }),
      ),
    );

    // Arquivo sem categoria (categoria so com espacos) tambem e recusado.
    selectFiles(container, [pdf()]);
    fireEvent.change(screen.getByPlaceholderText('Ex: fotos do ambiente'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(mockedToast).toHaveBeenCalledTimes(2));
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('mostra erro quando o service falha e mantem os arquivos selecionados', async () => {
    mockedUpload.mockRejectedValue(new Error('storage/unauthorized'));
    const { container } = renderUploader();

    fireEvent.change(screen.getByPlaceholderText('Ex: fotos do ambiente'), {
      target: { value: 'medicao' },
    });
    selectFiles(container, [pdf()]);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() =>
      expect(mockedToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description: 'Erro ao enviar arquivo.',
        }),
      ),
    );
    expect(mockedToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
    expect(fileInput(container).files).toHaveLength(1);
  });

  it('limpa a selecao de arquivos apos o sucesso', async () => {
    const { container } = renderUploader();

    fireEvent.change(screen.getByPlaceholderText('Ex: fotos do ambiente'), {
      target: { value: 'medicao' },
    });
    selectFiles(container, [pdf()]);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() =>
      expect(mockedToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          description: 'Arquivos enviados.',
        }),
      ),
    );

    // Um segundo clique nao reenvia: o estado interno de arquivos foi limpo.
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() =>
      expect(mockedToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Selecione ao menos um arquivo e informe a categoria.',
        }),
      ),
    );
    expect(mockedUpload).toHaveBeenCalledTimes(1);
  });

  it('exibe as sugestoes de categoria recebidas', () => {
    const { container } = renderUploader({
      categorySuggestions: ['medicao', 'desenho'],
    });

    const options = container.querySelectorAll('datalist option');
    expect(Array.from(options).map(o => o.getAttribute('value'))).toEqual([
      'medicao',
      'desenho',
    ]);
  });
});
