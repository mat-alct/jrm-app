import { OrderListDesktop } from '@/components/cortes/OrderListDesktop';
import { OrderListCallbacks } from '@/components/cortes/OrderListTypes';

import { fireEvent, render, screen } from '../../testUtils';

const callbacks: OrderListCallbacks = {
  onPrintResume: jest.fn(),
  onPrintLabels: jest.fn(),
  onApproveEstimate: jest.fn(),
  onShowHistory: jest.fn(),
  onConfirmStatus: jest.fn(),
  onEdit: jest.fn(),
  onDeactivate: jest.fn(),
};

function orderItem(overrides: Record<string, unknown> = {}) {
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

function estimateItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'estimate-1',
    estimateCode: 7,
    // A linha de orcamento mostra `name`, nao `customer.name`.
    name: 'Ana Souza',
    cutlist: [],
    ...overrides,
  };
}

function renderList(props: Partial<Parameters<typeof OrderListDesktop>[0]> = {}) {
  return render(
    <OrderListDesktop
      items={[orderItem()]}
      isEstimateList={false}
      isLoading={false}
      {...callbacks}
      {...props}
    />,
  );
}

describe('OrderListDesktop', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra o pedido com codigo, cliente e status', () => {
    renderList();

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Pedro Silva')).toBeInTheDocument();
    expect(screen.getByText('Em Produção')).toBeInTheDocument();
  });

  it('resume a contagem de registros da pagina', () => {
    renderList({ items: [orderItem(), orderItem({ id: 'order-2', orderCode: 43 })] });

    expect(screen.getByText('2 registro(s) nesta página')).toBeInTheDocument();
  });

  it('indica que os registros vieram de uma busca', () => {
    renderList({ searchQuery: 'pedro' });

    expect(screen.getByText('1 registro(s) encontrados')).toBeInTheDocument();
  });

  it('avisa quando nao ha registros', () => {
    renderList({ items: [] });

    expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
  });

  it('so oferece o historico quando o pedido ja foi editado', () => {
    const { rerender } = renderList();
    expect(
      screen.queryByRole('button', { name: 'Histórico de edições' }),
    ).not.toBeInTheDocument();

    rerender(
      <OrderListDesktop
        items={[orderItem({ edits: [{ priceDifference: 100 }] })]}
        isEstimateList={false}
        isLoading={false}
        {...callbacks}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Histórico de edições' }));
    expect(callbacks.onShowHistory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
    );
  });

  it('dispara edicao, desativacao e conclusao do pedido', () => {
    renderList();

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(callbacks.onEdit).toHaveBeenCalledWith('order-1');

    fireEvent.click(screen.getByRole('button', { name: 'Desativar' }));
    expect(callbacks.onDeactivate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(callbacks.onConfirmStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
    );
  });

  it('imprime resumo e etiquetas do pedido', () => {
    renderList();

    fireEvent.click(screen.getByRole('button', { name: 'Imprimir Resumo' }));
    expect(callbacks.onPrintResume).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
      'order',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Etiquetas' }));
    expect(callbacks.onPrintLabels).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
    );
  });

  it('esconde acoes de edicao e conclusao em pedido concluido', () => {
    renderList({ items: [orderItem({ orderStatus: 'Concluído' })] });

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Concluir' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument();
  });

  it('so oferece edicao para pedido em producao', () => {
    renderList({ items: [orderItem({ orderStatus: 'Liberado para Transporte' })] });

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Concluir' })).toBeInTheDocument();
  });

  it('marca pedido desativado e some com as acoes', () => {
    renderList({ items: [orderItem({ isDeactivated: true })] });

    expect(screen.getByText('Desativado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument();
  });

  it('na lista de orcamentos oferece imprimir e aprovar', () => {
    renderList({ items: [estimateItem()], isEstimateList: true });

    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Imprimir Orçamento' }));
    expect(callbacks.onPrintResume).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'estimate-1' }),
      'estimate',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(callbacks.onApproveEstimate).toHaveBeenCalledWith('estimate-1');
  });

  it('cai em "Cliente Removido" sem cliente', () => {
    renderList({ items: [orderItem({ customer: null })] });

    expect(screen.getByText('Cliente Removido')).toBeInTheDocument();
  });
});
