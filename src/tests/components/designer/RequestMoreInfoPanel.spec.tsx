import { RequestMoreInfoPanel } from '@/components/designer/RequestMoreInfoPanel';
import { toaster } from '@/components/ui/toaster';
import { useRequestMoreInformation } from '@/services/projects/notification.service';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

jest.mock('@/services/projects/notification.service', () => ({
  useRequestMoreInformation: jest.fn(),
}));
jest.mock('@/components/ui/toaster', () => ({
  toaster: { create: jest.fn() },
}));

const actor = {
  uid: 'designer-1',
  name: 'Desenhista',
  role: 'designer' as const,
};
const mutateAsync = jest.fn();

function renderPanel() {
  return render(
    <RequestMoreInfoPanel
      projectId="project-1"
      itemId="item-1"
      itemName="Cozinha"
      actor={actor}
    />,
  );
}

describe('RequestMoreInfoPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutateAsync.mockResolvedValue(undefined);
    jest.mocked(useRequestMoreInformation).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRequestMoreInformation>);
  });

  it('envia a mensagem digitada ao service', async () => {
    renderPanel();

    fireEvent.change(
      screen.getByPlaceholderText(
        'O que falta para você conseguir desenhar este item?',
      ),
      { target: { value: 'Falta a medida do vão' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Pedir mais informações' }),
    );

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith({
      projectId: 'project-1',
      itemId: 'item-1',
      itemName: 'Cozinha',
      message: 'Falta a medida do vão',
      actor,
    });
  });

  it('limpa o formulario e avisa sucesso', async () => {
    renderPanel();

    fireEvent.change(
      screen.getByPlaceholderText(
        'O que falta para você conseguir desenhar este item?',
      ),
      { target: { value: 'Falta a medida do vão' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Pedir mais informações' }),
    );

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          description: 'Pedido de informações enviado ao vendedor.',
        }),
      ),
    );
    expect(
      screen.getByPlaceholderText(
        'O que falta para você conseguir desenhar este item?',
      ),
    ).toHaveValue('');
  });

  it('mostra a mensagem de erro do service', async () => {
    mutateAsync.mockRejectedValue(
      new Error('Descreva o que falta para o item avançar.'),
    );
    renderPanel();

    fireEvent.click(
      screen.getByRole('button', { name: 'Pedir mais informações' }),
    );

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description: 'Descreva o que falta para o item avançar.',
        }),
      ),
    );
  });
});
