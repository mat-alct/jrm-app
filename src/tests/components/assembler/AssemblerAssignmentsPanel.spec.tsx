import { AssemblerAssignmentsPanel } from '@/components/assembler/AssemblerAssignmentsPanel';
import { AssemblerAssignment } from '@/types/projects';

import { render, screen } from '../../testUtils';

function assignment(
  overrides: Partial<AssemblerAssignment> = {},
): AssemblerAssignment {
  return {
    id: 'assembler-1',
    projectId: 'project-1',
    itemId: 'item-1',
    assemblerId: 'assembler-1',
    assemblerName: 'Montador Um',
    amountToReceive: 250,
    paymentStatus: 'pendente',
    ...overrides,
  } as AssemblerAssignment;
}

describe('AssemblerAssignmentsPanel', () => {
  it('mostra o estado vazio sem atribuicoes', () => {
    render(<AssemblerAssignmentsPanel assignments={[]} canViewValues />);

    expect(screen.getByText('Nenhum montador atribuído')).toBeInTheDocument();
  });

  it('lista montadores com status de pagamento', () => {
    render(
      <AssemblerAssignmentsPanel
        assignments={[
          assignment(),
          assignment({
            id: 'assembler-2',
            assemblerName: 'Montador Dois',
            paymentStatus: 'pago',
          }),
        ]}
        canViewValues
      />,
    );

    expect(screen.getByText('Montador Um')).toBeInTheDocument();
    expect(screen.getByText('Montador Dois')).toBeInTheDocument();
    expect(screen.getByText('pendente')).toBeInTheDocument();
    expect(screen.getByText('pago')).toBeInTheDocument();
  });

  it('mostra o valor a receber quando permitido', () => {
    render(
      <AssemblerAssignmentsPanel assignments={[assignment()]} canViewValues />,
    );

    expect(screen.getByText(/250,00/)).toBeInTheDocument();
  });

  it('esconde o valor a receber de quem nao pode ver', () => {
    render(
      <AssemblerAssignmentsPanel
        assignments={[assignment()]}
        canViewValues={false}
      />,
    );

    expect(screen.getByText('Montador Um')).toBeInTheDocument();
    expect(screen.queryByText(/250,00/)).not.toBeInTheDocument();
  });

  it('cai no id quando o montador nao tem nome gravado', () => {
    render(
      <AssemblerAssignmentsPanel
        assignments={[assignment({ assemblerName: undefined })]}
        canViewValues
      />,
    );

    expect(screen.getByText('assembler-1')).toBeInTheDocument();
  });
});
