import { OrderData } from '@/components/NewOrder/OrderData';
import { useOrder } from '@/hooks/order';
import { getSellerByPassword } from '@/services/sellers';
import { Cutlist } from '@/types';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    query: {},
    asPath: '/',
  }),
}));
jest.mock('@/services/sellers', () => ({ getSellerByPassword: jest.fn() }));
jest.mock('@/hooks/order', () => ({ useOrder: jest.fn() }));
jest.mock('@/hooks/useAreas', () => ({
  useAreas: () => ({ data: [{ name: 'Centro', freight: 30 }] }),
  findAreaFreight: (_areas: unknown, area?: string) => (area ? 30 : 0),
}));
jest.mock('@/components/ui/toaster', () => ({
  toaster: { create: jest.fn() },
}));
jest.mock('@/components/Form/DatePicker', () => ({
  FormDatePicker: () => null,
}));

const createOrder = jest.fn();
const createEstimate = jest.fn();
const mockedSeller = jest.mocked(getSellerByPassword);

const cutlist: Cutlist[] = [
  {
    id: 'cut-1',
    material: {
      materialId: 'mat-1',
      name: 'MDF Branco 15mm',
      width: 1000,
      height: 1000,
      price: 100,
    },
    amount: 1,
    sideA: 1000,
    sideB: 2000,
    borderA: 0,
    borderB: 0,
    price: 350,
  } as Cutlist,
];

function renderOrderData(orderType = 'Serviço', requiresCuttingPlan = false) {
  return render(
    <OrderData
      orderType={orderType}
      cutlist={cutlist}
      estimateId={undefined}
      requiresCuttingPlan={requiresCuttingPlan}
    />,
  );
}

function fillRequired() {
  fireEvent.change(screen.getByLabelText('Nome'), {
    target: { value: 'Pedro' },
  });
  fireEvent.change(screen.getByLabelText('Sobrenome'), {
    target: { value: 'Silva' },
  });
}

/** O rotulo do submit muda conforme o tipo: CONFIRMAR PEDIDO ou SALVAR ORCAMENTO. */
function submitButton(): HTMLElement {
  return screen.getByRole('button', {
    name: /CONFIRMAR PEDIDO|SALVAR ORÇAMENTO/,
  });
}

function typeSellerPassword(value: string) {
  const input = document.querySelector(
    'input[name="sellerPassword"]',
  ) as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
}

describe('NewOrder/OrderData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useOrder).mockReturnValue({
      createOrder,
      createEstimate,
    } as unknown as ReturnType<typeof useOrder>);
    mockedSeller.mockResolvedValue({
      id: 'seller-1',
      name: 'Vendedor Seed',
    } as never);
  });

  it('renderiza os campos do cliente', () => {
    renderOrderData();

    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByLabelText('Sobrenome')).toBeInTheDocument();
    expect(screen.getByLabelText('Telefone')).toBeInTheDocument();
  });

  it('impede finalizar um serviço de plano de corte sem plano gerado', () => {
    renderOrderData('Plano de corte', true);

    expect(
      screen.getByRole('heading', { name: '2. Detalhes do Serviço' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Logística')).toBeInTheDocument();
    expect(screen.getByText('Status Pagamento')).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  // A checagem da senha do vendedor roda depois do schema. Em modo Orcamento o schema
  // e permissivo, entao e ali que da para exercitar o guarda da senha isoladamente.
  it('bloqueia o envio com senha de vendedor invalida, sem criar nada', async () => {
    mockedSeller.mockResolvedValue(null as never);
    renderOrderData('Orçamento');

    fillRequired();
    typeSellerPassword('errada');
    fireEvent.click(submitButton());

    expect(await screen.findByText('Senha inválida')).toBeInTheDocument();
    expect(createOrder).not.toHaveBeenCalled();
    expect(createEstimate).not.toHaveBeenCalled();
  });

  it('bloqueia o envio quando o vendedor nao tem nome cadastrado', async () => {
    mockedSeller.mockResolvedValue({ id: 'seller-1' } as never);
    renderOrderData('Orçamento');

    fillRequired();
    typeSellerPassword('senha-sem-nome');
    fireEvent.click(submitButton());

    expect(
      await screen.findByText(
        'Vendedor sem nome cadastrado. Avise o administrador.',
      ),
    ).toBeInTheDocument();
    expect(createOrder).not.toHaveBeenCalled();
    expect(createEstimate).not.toHaveBeenCalled();
  });

  it('em modo Servico o schema exige logistica, pagamento e data antes da senha', async () => {
    renderOrderData();

    fillRequired();
    typeSellerPassword('valida');
    fireEvent.click(submitButton());

    // O layout renderiza os campos de logistica em duas variantes (mobile/desktop),
    // entao a mesma mensagem aparece mais de uma vez.
    expect(
      (await screen.findAllByText('Selecione o tipo de entrega')).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Selecione a forma de pagamento').length,
    ).toBeGreaterThan(0);
    expect(mockedSeller).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('exige nome e sobrenome pelo schema', async () => {
    renderOrderData();

    typeSellerPassword('valida');
    fireEvent.click(submitButton());

    expect(await screen.findByText('Nome obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Sobrenome obrigatório')).toBeInTheDocument();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('no modo orcamento nao exige tipo de entrega nem data', async () => {
    renderOrderData('Orçamento');

    fillRequired();
    typeSellerPassword('valida');
    fireEvent.click(submitButton());

    await waitFor(() => expect(createEstimate).toHaveBeenCalled());
    expect(createOrder).not.toHaveBeenCalled();
  });
});
