import { ProjectItemStatusBadge } from '@/components/projects/ProjectItemStatusBadge';

import { render, screen } from '../../testUtils';

describe('Component: ProjectItemStatusBadge', () => {
  it('renders the internal label for the given status', () => {
    render(<ProjectItemStatusBadge status="em_producao" />);

    expect(screen.getByText('Em produção')).toBeInTheDocument();
  });

  it('renders a different label for a different status', () => {
    render(<ProjectItemStatusBadge status="aguardando_atribuicao_montador" />);

    expect(
      screen.getByText('Aguardando atribuição de montador'),
    ).toBeInTheDocument();
  });
});
