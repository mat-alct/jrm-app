import { ConfirmDeactivateDialog } from '@/components/cortes/ConfirmDeactivateDialog';
import { ConfirmStatusDialog } from '@/components/cortes/ConfirmStatusDialog';
import { HistoryDialog } from '@/components/cortes/HistoryDialog';

import { fireEvent, render, screen } from '../../testUtils';

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderCode: 42,
    orderStatus: 'Em Produção',
    customer: { name: 'Pedro Silva' },
    cutlist: [],
    orderPrice: 1000,
    ...overrides,
  };
}

describe('ConfirmStatusDialog', () => {
  const baseProps = { onCancel: jest.fn(), onConfirm: jest.fn(), loading: false };

  beforeEach(() => jest.clearAllMocks());

  it('fica fechado quando nao ha pedido selecionado', () => {
    render(<ConfirmStatusDialog {...baseProps} order={null} />);

    expect(screen.queryByText('Confirmar alteração de status')).not.toBeInTheDocument();
  });

  it('mostra o pedido, o cliente e o status atual', () => {
    render(<ConfirmStatusDialog {...baseProps} order={order()} />);

    expect(screen.getByText('Confirmar alteração de status')).toBeInTheDocument();
    expect(screen.getByText('Pedido #42')).toBeInTheDocument();
    expect(screen.getByText('Pedro Silva')).toBeInTheDocument();
    expect(screen.getByText('Em Produção')).toBeInTheDocument();
  });

  it('anuncia a proxima transicao a partir do status atual', () => {
    const { rerender } = render(<ConfirmStatusDialog {...baseProps} order={order()} />);
    expect(screen.getByText('liberar para transporte')).toBeInTheDocument();

    rerender(
      <ConfirmStatusDialog
        {...baseProps}
        order={order({ orderStatus: 'Liberado para Transporte' })}
      />,
    );
    expect(screen.getByText('concluir pedido')).toBeInTheDocument();
  });

  it('confirma passando o id do pedido', () => {
    render(<ConfirmStatusDialog {...baseProps} order={order()} />);

    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));

    expect(baseProps.onConfirm).toHaveBeenCalledWith('order-1');
  });

  it('cancela sem confirmar', () => {
    render(<ConfirmStatusDialog {...baseProps} order={order()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(baseProps.onCancel).toHaveBeenCalled();
    expect(baseProps.onConfirm).not.toHaveBeenCalled();
  });

  it('bloqueia o cancelamento enquanto grava', () => {
    render(<ConfirmStatusDialog {...baseProps} order={order()} loading />);

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('cai em "Cliente Removido" quando o pedido nao tem cliente', () => {
    render(<ConfirmStatusDialog {...baseProps} order={order({ customer: null })} />);

    expect(screen.getByText('Cliente Removido')).toBeInTheDocument();
  });
});

describe('ConfirmDeactivateDialog', () => {
  const baseProps = { onCancel: jest.fn(), onConfirm: jest.fn(), loading: false };

  beforeEach(() => jest.clearAllMocks());

  it('fica fechado sem pedido', () => {
    render(<ConfirmDeactivateDialog {...baseProps} order={null} />);

    expect(screen.queryByText('Desativar pedido')).not.toBeInTheDocument();
  });

  it('explica que o pedido continua acessivel pela busca', () => {
    render(<ConfirmDeactivateDialog {...baseProps} order={order()} />);

    expect(screen.getByText('Desativar pedido')).toBeInTheDocument();
    expect(screen.getByText(/continuará\s+acessível pela busca/)).toBeInTheDocument();
    expect(screen.getByText('Pedido #42')).toBeInTheDocument();
  });

  it('desativa passando o id do pedido', () => {
    render(<ConfirmDeactivateDialog {...baseProps} order={order()} />);

    fireEvent.click(screen.getByRole('button', { name: /Desativar/ }));

    expect(baseProps.onConfirm).toHaveBeenCalledWith('order-1');
  });

  it('cancela sem desativar', () => {
    render(<ConfirmDeactivateDialog {...baseProps} order={order()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(baseProps.onCancel).toHaveBeenCalled();
    expect(baseProps.onConfirm).not.toHaveBeenCalled();
  });
});

describe('HistoryDialog', () => {
  const edit = (seconds: number, priceDifference: number) => ({
    editedAt: { seconds },
    priceDifference,
    shouldCharge: priceDifference !== 0,
    previousCutlist: [{ id: 'antigo' }],
    previousOrderPrice: 900,
  });

  it('fica fechado sem pedido', () => {
    render(<HistoryDialog order={null} onClose={jest.fn()} onSelectVersion={jest.fn()} />);

    expect(screen.queryByText(/Histórico do Pedido/)).not.toBeInTheDocument();
  });

  it('mostra apenas a versao original quando nunca houve edicao', () => {
    render(
      <HistoryDialog order={order()} onClose={jest.fn()} onSelectVersion={jest.fn()} />,
    );

    expect(screen.getByText('Histórico do Pedido #42')).toBeInTheDocument();
    expect(screen.getByText('Versão Original')).toBeInTheDocument();
    expect(screen.queryByText('Edição 1')).not.toBeInTheDocument();
  });

  it('lista uma versao por edicao, alem da original', () => {
    render(
      <HistoryDialog
        order={order({ edits: [edit(1750000000, 100), edit(1760000000, -50)] })}
        onClose={jest.fn()}
        onSelectVersion={jest.fn()}
      />,
    );

    expect(screen.getByText('Versão Original')).toBeInTheDocument();
    expect(screen.getByText('Edição 1')).toBeInTheDocument();
    expect(screen.getByText('Edição 2')).toBeInTheDocument();
  });

  it('entrega o snapshot da versao original (cutlist e preco anteriores)', () => {
    const onSelectVersion = jest.fn();
    render(
      <HistoryDialog
        order={order({ edits: [edit(1750000000, 100)] })}
        onClose={jest.fn()}
        onSelectVersion={onSelectVersion}
      />,
    );

    fireEvent.click(screen.getByText('Versão Original').closest('button')!);

    expect(onSelectVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        cutlist: [{ id: 'antigo' }],
        orderPrice: 900,
        edits: [],
      }),
    );
  });
});
