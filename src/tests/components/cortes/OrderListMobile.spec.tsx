import { OrderListMobile } from '@/components/cortes/OrderListMobile';
import { OrderListCallbacks } from '@/components/cortes/OrderListTypes';

import { fireEvent, render, screen } from '../../testUtils';

const callbacks: OrderListCallbacks = {
  onPrintResume: jest.fn(),
  onPrintLabels: jest.fn(),
  onPrintCuttingPlan: jest.fn(),
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

function renderList(
  props: Partial<Parameters<typeof OrderListMobile>[0]> = {},
) {
  return render(
    <OrderListMobile
      items={[orderItem()]}
      isEstimateList={false}
      isLoading={false}
      {...callbacks}
      {...props}
    />,
  );
}

describe('OrderListMobile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra o cartao do pedido com cliente e status', () => {
    renderList();

    expect(screen.getByText('Pedro Silva')).toBeInTheDocument();
    expect(screen.getByText('Em Produção')).toBeInTheDocument();
  });

  it('avisa quando nao ha registros', () => {
    renderList({ items: [] });

    expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
  });

  it('anuncia a proxima transicao conforme o status', () => {
    const { rerender } = renderList();
    expect(
      screen.getByRole('button', { name: /Liberar para Transporte/ }),
    ).toBeInTheDocument();

    rerender(
      <OrderListMobile
        items={[orderItem({ orderStatus: 'Liberado para Transporte' })]}
        isEstimateList={false}
        isLoading={false}
        {...callbacks}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Concluir pedido/ }),
    ).toBeInTheDocument();
  });

  it('nao oferece proxima transicao para pedido concluido', () => {
    renderList({ items: [orderItem({ orderStatus: 'Concluído' })] });

    expect(
      screen.queryByRole('button', { name: /Concluir pedido/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Editar' }),
    ).not.toBeInTheDocument();
  });

  it('dispara as acoes do cartao', () => {
    renderList();

    fireEvent.click(screen.getByRole('button', { name: /Resumo/ }));
    expect(callbacks.onPrintResume).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
      'order',
    );

    fireEvent.click(screen.getByRole('button', { name: /Etiquetas/ }));
    expect(callbacks.onPrintLabels).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(callbacks.onEdit).toHaveBeenCalledWith('order-1');

    fireEvent.click(screen.getByRole('button', { name: 'Desativar' }));
    expect(callbacks.onDeactivate).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: /Liberar para Transporte/ }),
    );
    expect(callbacks.onConfirmStatus).toHaveBeenCalled();
  });

  it('oferece impressão isolada para pedido com plano válido', () => {
    renderList({
      items: [
        orderItem({
          serviceType: 'cutting_plan',
          cuttingPlan: { id: 'plan-1', status: 'approved' },
        }),
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: /Plano/ }));
    expect(callbacks.onPrintCuttingPlan).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
    );
  });

  it('so oferece o historico quando o pedido ja foi editado', () => {
    renderList({ items: [orderItem({ edits: [{ priceDifference: 100 }] })] });

    fireEvent.click(
      screen.getByRole('button', { name: 'Histórico de edições' }),
    );
    expect(callbacks.onShowHistory).toHaveBeenCalled();
  });

  it('marca pedido desativado e some com as acoes', () => {
    renderList({ items: [orderItem({ isDeactivated: true })] });

    expect(screen.getByText('Desativado')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Editar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Desativar' }),
    ).not.toBeInTheDocument();
  });

  it('na lista de orcamentos mostra o nome e permite aprovar', () => {
    renderList({
      items: [
        { id: 'estimate-1', estimateCode: 7, name: 'Ana Souza', cutlist: [] },
      ],
      isEstimateList: true,
    });

    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aprovar/ }));
    expect(callbacks.onApproveEstimate).toHaveBeenCalledWith('estimate-1');
  });

  it('cai em "Cliente Removido" sem cliente', () => {
    renderList({ items: [orderItem({ customer: null })] });

    expect(screen.getByText('Cliente Removido')).toBeInTheDocument();
  });
});
