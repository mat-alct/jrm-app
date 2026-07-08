import { AdminDashboardCards } from '@/components/admin/AdminDashboardCards';
import { DashboardCounts } from '@/services/projects/dashboard.service';

import { render, screen } from '../../testUtils';

const counts: DashboardCounts = {
  projetosEmAberto: 3,
  atrasados: 1,
  aguardandoDesenho: 2,
  aguardandoAprovacao: 0,
  emProducao: 4,
  emMontagem: 1,
  totalVendidoNoMes: 1500,
};

describe('Component: AdminDashboardCards', () => {
  it('renders every count card', () => {
    render(<AdminDashboardCards counts={counts} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Projetos em aberto')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*1\.500,00/)).toBeInTheDocument();
  });

  it('shows the assembler payments card only when provided', () => {
    const { rerender } = render(<AdminDashboardCards counts={counts} />);
    expect(screen.queryByText('Montadores a pagar')).not.toBeInTheDocument();

    rerender(
      <AdminDashboardCards counts={counts} pendingAssemblerPayments={5} />,
    );
    expect(screen.getByText('Montadores a pagar')).toBeInTheDocument();
  });
});
