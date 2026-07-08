import { AssemblerFinanceSummary } from '@/components/assembler/AssemblerFinanceSummary';
import { AssemblerAssignment } from '@/types/projects';

import { render, screen } from '../../testUtils';

describe('AssemblerFinanceSummary', () => {
  it('sums pending and waiting-confirmation values separately', () => {
    render(
      <AssemblerFinanceSummary
        assignments={
          [
            { amountToReceive: 100, paymentStatus: 'pendente' },
            { amountToReceive: 200, paymentStatus: 'pago' },
            { amountToReceive: 300, paymentStatus: 'confirmado_pelo_montador' },
          ] as AssemblerAssignment[]
        }
      />,
    );

    expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument();
    expect(screen.queryByText('R$ 300,00')).not.toBeInTheDocument();
  });
});
