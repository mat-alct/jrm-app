import { Timestamp } from 'firebase/firestore';

import { EstimateResume } from '@/components/Printables/EstimateResume';
import { CuttingPlanPrint } from '@/components/Printables/CuttingPlanPrint';
import { OrderResume } from '@/components/Printables/OrderResume';
import { Tags } from '@/components/Printables/Tags';
import {
  buildCuttingPlan,
  cutlistToCuttingPlanInput,
  generateCuttingPlan,
} from '@/domain/cutting-plan';
import type { Cutlist } from '@/types';

import { render, screen } from '../../testUtils';

// O dialogo nativo de impressao nao e testavel (PLANO-DE-TESTES.md 14.5):
// mockamos o gatilho e asserimos o CONTEUDO renderizado para impressao.
const print = jest.fn();
jest.mock('react-to-print', () => ({
  useReactToPrint: () => print,
}));

const ts = (iso: string) => Timestamp.fromDate(new Date(iso));

const customer = {
  name: 'Pedro Silva',
  telephone: '24999990000',
  address: 'Rua das Flores, 100',
  area: 'Centro',
  city: 'Volta Redonda',
  state: 'RJ',
};

const cutlist = [
  {
    id: 'cut-1',
    material: {
      materialId: 'mat-1',
      name: 'MDF Branco 15mm',
      width: 2750,
      height: 1850,
      price: 220,
    },
    amount: 2,
    sideA: 1000,
    sideB: 500,
    borderA: 1,
    borderB: 0,
    price: 350,
    hasHingeHoles: false,
    hingeHolesQuantity: 0,
    hasDrawerSlot: false,
    hasRoundedCorners: false,
  },
  {
    id: 'cut-2',
    material: {
      materialId: 'mat-1',
      name: 'MDF Branco 15mm',
      width: 2750,
      height: 1850,
      price: 220,
    },
    amount: 1,
    sideA: 800,
    sideB: 400,
    borderA: 0,
    borderB: 2,
    price: 120,
    hasHingeHoles: true,
    hingeHolesQuantity: 3,
    hasDrawerSlot: false,
    hasRoundedCorners: false,
  },
];

const order = {
  id: 'order-1',
  orderCode: 42,
  customer,
  cutlist,
  orderPrice: 470,
  freightPrice: 30,
  deliveryType: 'Entrega',
  paymentType: 'Dinheiro',
  seller: 'Vendedor Seed',
  ps: 'Entregar pela manha',
  createdAt: ts('2026-01-15T12:00:00.000Z'),
  deliveryDate: ts('2026-01-25T12:00:00.000Z'),
};

const cuttingPlan = buildCuttingPlan({
  id: 'plan-1',
  orderId: 'order-1',
  status: 'approved',
  timestamp: ts('2026-01-15T12:00:00.000Z'),
  result: generateCuttingPlan(
    cutlistToCuttingPlanInput({
      cutlist: cutlist as Cutlist[],
      optimizationMode: 'balanced',
    }),
  ),
});

const orderWithPlan = {
  ...order,
  serviceType: 'cutting_plan',
  orderPrice: cuttingPlan.pricing.totalCost,
  cuttingPlan,
};

// O orcamento guarda nome/telefone na raiz (nao em `customer`, como o pedido).
const estimate = {
  id: 'estimate-1',
  estimateCode: 7,
  name: 'Pedro Silva',
  telephone: '24999990000',
  cutlist,
  estimatePrice: 470,
  freightPrice: 0,
  createdAt: ts('2026-01-15T12:00:00.000Z'),
  seller: 'Vendedor Seed',
};

describe('OrderResume', () => {
  beforeEach(() => jest.clearAllMocks());

  it('imprime os dados do cliente e o codigo do pedido', () => {
    render(<OrderResume order={order} />);

    expect(screen.getAllByText(/42/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pedro Silva/)).toBeInTheDocument();
    expect(screen.getByText(/Rua das Flores, 100/)).toBeInTheDocument();
  });

  it('lista as pecas da cutlist com material e medidas', () => {
    render(<OrderResume order={order} />);

    expect(screen.getAllByText(/MDF Branco 15mm/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/800/).length).toBeGreaterThan(0);
  });

  it('mostra tipo de entrega, forma de pagamento e observacao', () => {
    render(<OrderResume order={order} />);

    expect(screen.getAllByText(/Entrega/).length).toBeGreaterThan(0);
    // A forma de pagamento e impressa em caixa alta.
    expect(screen.getByText('DINHEIRO')).toBeInTheDocument();
    expect(screen.getByText(/Entregar pela manha/)).toBeInTheDocument();
  });

  it('dispara a impressao automaticamente quando autoPrint', () => {
    render(<OrderResume order={order} autoPrint />);

    expect(print).toHaveBeenCalled();
  });

  it('nao imprime sozinho sem autoPrint', () => {
    render(<OrderResume order={order} />);

    expect(print).not.toHaveBeenCalled();
  });

  it('inclui o plano salvo depois do resumo do pedido', () => {
    render(<OrderResume order={orderWithPlan} />);

    const printablePlan = screen.getByTestId('printable-cutting-plan');
    const summary = screen.getByTestId('order-summary');
    expect(printablePlan).toBeInTheDocument();
    expect(
      summary.compareDocumentPosition(printablePlan) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('não mostra preço por peça nem sequência de corte em pedido de plano', () => {
    render(<OrderResume order={orderWithPlan} />);

    const summary = screen.getByTestId('order-summary');
    expect(summary).not.toHaveTextContent('VALOR');
    expect(summary).not.toHaveTextContent('350');
    expect(summary).not.toHaveTextContent('120');
    expect(screen.queryByText(/Sequência de corte/i)).not.toBeInTheDocument();
    expect(summary).toHaveTextContent('Plano de corte:');
  });

  it('mantem o resumo sem paginas de plano quando o pedido nao possui plano', () => {
    render(<OrderResume order={order} />);
    expect(
      screen.queryByTestId('printable-cutting-plan'),
    ).not.toBeInTheDocument();
  });
});

describe('EstimateResume', () => {
  beforeEach(() => jest.clearAllMocks());

  it('imprime cliente e codigo do orcamento', () => {
    render(<EstimateResume estimate={estimate} />);

    expect(screen.getAllByText(/7/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pedro Silva/)).toBeInTheDocument();
  });

  it('lista as pecas do orcamento', () => {
    render(<EstimateResume estimate={estimate} />);

    expect(screen.getAllByText(/MDF Branco/).length).toBeGreaterThan(0);
  });

  it('dispara a impressao automaticamente quando autoPrint', () => {
    render(<EstimateResume estimate={estimate} autoPrint />);

    expect(print).toHaveBeenCalled();
  });
});

describe('Tags', () => {
  beforeEach(() => jest.clearAllMocks());

  it('nao renderiza etiqueta sem pedido', () => {
    const { container } = render(
      <Tags order={null} onAfterPrint={jest.fn()} />,
    );

    expect(container).not.toHaveTextContent('MDF Branco 15mm');
  });

  it('renderiza uma etiqueta por peca (multiplicada pela quantidade)', () => {
    render(<Tags order={order as never} onAfterPrint={jest.fn()} />);

    // Alem do resumo em tabela, ha uma etiqueta por unidade:
    // 2 pecas da primeira linha + 1 da segunda = 3 etiquetas.
    const tagLabels = screen
      .getAllByText(/MDF Branco 15mm/)
      .filter(node => node.tagName === 'P');
    expect(tagLabels).toHaveLength(3);
  });

  it('mostra o codigo do pedido e o cliente nas etiquetas', () => {
    render(<Tags order={order as never} onAfterPrint={jest.fn()} />);

    expect(screen.getAllByText(/42/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pedro Silva/).length).toBeGreaterThan(0);
  });

  it('dispara a impressao ao receber um pedido', () => {
    render(<Tags order={order as never} onAfterPrint={jest.fn()} />);

    expect(print).toHaveBeenCalled();
  });

  it('imprime apenas etiquetas mesmo quando o pedido possui plano', () => {
    render(<Tags order={orderWithPlan as never} onAfterPrint={jest.fn()} />);

    expect(
      screen.queryByTestId('printable-cutting-plan'),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/MDF Branco 15mm/).some(node => node.tagName === 'P'),
    ).toBe(true);
  });

  it('nao cria paginas vazias de plano para pedido sem plano', () => {
    render(<Tags order={order as never} onAfterPrint={jest.fn()} />);
    expect(
      screen.queryByTestId('printable-cutting-plan'),
    ).not.toBeInTheDocument();
  });
});

describe('CuttingPlanPrint', () => {
  beforeEach(() => jest.clearAllMocks());

  it('imprime somente as folhas do plano', () => {
    render(
      <CuttingPlanPrint
        order={orderWithPlan as never}
        onAfterPrint={jest.fn()}
      />,
    );

    expect(screen.getByTestId('cutting-plan-only-print')).toBeInTheDocument();
    expect(screen.getByTestId('printable-cutting-plan')).toBeInTheDocument();
    expect(screen.queryByTestId('order-summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Pedro Silva')).not.toBeInTheDocument();
    expect(print).toHaveBeenCalled();
  });

  it('não monta impressão para plano desatualizado', () => {
    render(
      <CuttingPlanPrint
        order={
          {
            ...orderWithPlan,
            cuttingPlan: { ...cuttingPlan, status: 'outdated' },
          } as never
        }
        onAfterPrint={jest.fn()}
      />,
    );

    expect(
      screen.queryByTestId('cutting-plan-only-print'),
    ).not.toBeInTheDocument();
    expect(print).not.toHaveBeenCalled();
  });
});
