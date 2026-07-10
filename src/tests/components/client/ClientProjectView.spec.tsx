import { ClientProjectView } from '@/components/client/ClientProjectView';
import { ClientProjectDTO } from '@/types/projects';

import { fireEvent, render, screen, waitFor, within } from '../../testUtils';

function project(overrides: Partial<ClientProjectDTO> = {}): ClientProjectDTO {
  return {
    projectId: 'project-1',
    customerName: 'Cliente Alpha',
    items: [
      {
        itemId: 'item-1',
        name: 'Cozinha planejada',
        environment: 'Cozinha',
        customerAmount: 1200,
        approvalStatus: 'aguardando',
        clientStatusLabel: 'Aguardando sua aprovação',
        attachments: [],
      },
      {
        itemId: 'item-2',
        name: 'Armario de quarto',
        environment: 'Quarto',
        customerAmount: 800,
        approvalStatus: 'aprovado',
        clientStatusLabel: 'Projeto aprovado',
        attachments: [],
      },
    ],
    ...overrides,
  } as ClientProjectDTO;
}

function renderView(overrides: Partial<ClientProjectDTO> = {}, isBusy = false) {
  const handlers = {
    onApproveAll: jest.fn(),
    onApproveItem: jest.fn(),
    onRejectItem: jest.fn(),
    onRequestChange: jest.fn(),
  };

  render(<ClientProjectView project={project(overrides)} isBusy={isBusy} {...handlers} />);
  return handlers;
}

/** O card do item, localizado pelo nome. */
function itemCard(name: string): HTMLElement {
  return screen.getByText(name).closest('div[class]')?.parentElement
    ?.parentElement as HTMLElement;
}

describe('ClientProjectView', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => confirmSpy.mockRestore());

  it('mostra o cliente, o valor total e a contagem de aprovados', () => {
    renderView();

    expect(screen.getByText('Cliente Alpha')).toBeInTheDocument();
    expect(screen.getByText(/2\.000,00/)).toBeInTheDocument();
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
  });

  it('avisa que ha itens aguardando decisao', () => {
    renderView();

    expect(screen.getByText('Existem itens aguardando sua decisão.')).toBeInTheDocument();
  });

  it('esconde "Aprovar tudo" quando nao ha item pendente', () => {
    renderView({
      items: [
        {
          itemId: 'item-2',
          name: 'Armario',
          environment: 'Quarto',
          approvalStatus: 'aprovado',
          clientStatusLabel: 'Projeto aprovado',
          customerAmount: 800,
          attachments: [],
        },
      ],
    });

    expect(screen.queryByRole('button', { name: 'Aprovar tudo' })).not.toBeInTheDocument();
    expect(screen.getByText('Todos os itens já foram avaliados.')).toBeInTheDocument();
  });

  it('aprova o item apos confirmacao', async () => {
    const { onApproveItem } = renderView();

    fireEvent.click(
      within(itemCard('Cozinha planejada')).getByRole('button', { name: 'Aprovar item' }),
    );

    expect(confirmSpy).toHaveBeenCalledWith('Confirmar aprovação deste item?');
    await waitFor(() => expect(onApproveItem).toHaveBeenCalledWith('item-1'));
  });

  it('recusa o item apos confirmacao', async () => {
    const { onRejectItem } = renderView();

    fireEvent.click(
      within(itemCard('Cozinha planejada')).getByRole('button', { name: 'Recusar' }),
    );

    await waitFor(() => expect(onRejectItem).toHaveBeenCalledWith('item-1'));
  });

  it('solicita alteracao apos confirmacao', async () => {
    const { onRequestChange } = renderView();

    fireEvent.click(
      within(itemCard('Cozinha planejada')).getByRole('button', { name: 'Pedir alteração' }),
    );

    await waitFor(() => expect(onRequestChange).toHaveBeenCalledWith('item-1'));
  });

  it('nao dispara acao quando o cliente cancela a confirmacao', () => {
    confirmSpy.mockReturnValue(false);
    const { onApproveItem, onApproveAll } = renderView();

    fireEvent.click(
      within(itemCard('Cozinha planejada')).getByRole('button', { name: 'Aprovar item' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar tudo' }));

    expect(onApproveItem).not.toHaveBeenCalled();
    expect(onApproveAll).not.toHaveBeenCalled();
  });

  it('aprova todos apos confirmacao', async () => {
    const { onApproveAll } = renderView();

    fireEvent.click(screen.getByRole('button', { name: 'Aprovar tudo' }));

    expect(confirmSpy).toHaveBeenCalledWith(
      'Confirmar aprovação de todos os itens pendentes?',
    );
    await waitFor(() => expect(onApproveAll).toHaveBeenCalled());
  });

  it('nao oferece acoes em item que ja foi avaliado', () => {
    renderView();

    expect(
      within(itemCard('Armario de quarto')).getByRole('button', { name: 'Aprovar item' }),
    ).toBeDisabled();
  });

  it('desabilita as acoes enquanto uma requisicao esta em curso', () => {
    renderView({}, true);

    // Em `loading` o Chakra troca o rotulo do botao por um spinner, entao o
    // "Aprovar tudo" perde o nome acessivel: asseramos que nenhum botao aceita clique.
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every(button => button.hasAttribute('disabled'))).toBe(true);
  });
});
