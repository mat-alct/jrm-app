import { Timestamp } from 'firebase/firestore';

import { ProjectItemTimeline } from '@/components/projects/ProjectItemTimeline';
import { StatusHistory } from '@/types/projects';

import { render, screen } from '../../testUtils';

function history(overrides: Partial<StatusHistory>): StatusHistory {
  return {
    id: overrides.id ?? 'h1',
    projectId: 'p1',
    itemId: 'i1',
    toStatus: 'aguardando_desenho',
    changedBy: 'u1',
    changedByRole: 'admin',
    createdAt: Timestamp.now(),
    ...overrides,
  };
}

describe('Component: ProjectItemTimeline', () => {
  it('shows an empty state when there is no history', () => {
    render(<ProjectItemTimeline history={[]} />);

    expect(
      screen.getByText('Nenhuma alteração de status registrada ainda.'),
    ).toBeInTheDocument();
  });

  it('orders entries from most recent to oldest', () => {
    const older = history({
      id: 'h-older',
      toStatus: 'aguardando_desenho',
      createdAt: Timestamp.fromMillis(1000),
    });
    const newer = history({
      id: 'h-newer',
      toStatus: 'aguardando_orcamento',
      createdAt: Timestamp.fromMillis(2000),
    });

    render(<ProjectItemTimeline history={[older, newer]} />);

    const labels = screen.getAllByText(
      /Aguardando desenho|Aguardando orçamento/,
    );
    expect(labels[0]).toHaveTextContent('Aguardando orçamento');
    expect(labels[1]).toHaveTextContent('Aguardando desenho');
  });

  it('shows the author name alongside the role label when present', () => {
    render(
      <ProjectItemTimeline
        history={[history({ changedByName: 'Mateus', changedByRole: 'admin' })]}
      />,
    );

    expect(screen.getByText(/Mateus · Administrador/)).toBeInTheDocument();
  });

  it('falls back to the role label when the author name is missing', () => {
    render(
      <ProjectItemTimeline
        history={[history({ changedByRole: 'designer' })]}
      />,
    );

    expect(screen.getByText(/Desenhista/)).toBeInTheDocument();
  });
});
