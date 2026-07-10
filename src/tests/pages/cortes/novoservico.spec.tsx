import NovoServico from '@/pages/cortes/novoservico';

import { fireEvent, render, screen } from '../../testUtils';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}));
jest.mock('@/hooks/authContext', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}));
jest.mock('@/components/Dashboard', () => ({
  Dashboard: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('@/components/Dashboard/Content/Header', () => ({
  Header: ({
    children,
    pageTitle,
  }: {
    children?: React.ReactNode;
    pageTitle: string;
  }) => (
    <header>
      <h1>{pageTitle}</h1>
      {children}
    </header>
  ),
}));
jest.mock('@/components/NewOrder/Cutlist', () => ({
  Cutlist: () => <div>Cadastro de peças</div>,
}));
jest.mock('@/components/NewOrder/OrderData', () => ({
  OrderData: ({ requiresCuttingPlan }: { requiresCuttingPlan?: boolean }) => (
    <div>Finalização {requiresCuttingPlan ? 'com plano' : 'normal'}</div>
  ),
}));
jest.mock('@/components/CuttingPlan', () => ({
  CuttingPlanSection: () => <div>Gerador 2D</div>,
}));

describe('novo serviço com plano de corte', () => {
  it('oferece a nova opção e monta o gerador antes da finalização', async () => {
    render(<NovoServico />);

    expect(screen.getByText('Plano de corte')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Plano de corte' }));

    expect(
      await screen.findByRole('heading', { name: 'Novo Plano de corte' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Gerador 2D')).toBeInTheDocument();
    expect(screen.getByText('Finalização com plano')).toBeInTheDocument();
  });
});
