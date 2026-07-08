import { Timestamp } from 'firebase/firestore';

import { DesignerQueue, sortQueueByDeadline } from '@/components/designer/DesignerQueue';
import { ProjectItem } from '@/types/projects';

import { render, screen } from '../../testUtils';

function item(overrides: Partial<ProjectItem>): ProjectItem {
  return {
    id: overrides.id ?? 'i1',
    projectId: 'p1',
    name: 'Cozinha',
    environment: 'Cozinha',
    customerPrice: 1000,
    status: 'aguardando_desenho',
    clientApprovalStatus: 'aguardando',
    requiresDesigner: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: 'u1',
    updatedBy: 'u1',
    ...overrides,
  };
}

describe('sortQueueByDeadline', () => {
  it('orders items with an earlier deadline first', () => {
    const later = item({ id: 'later', deadlineCurrent: Timestamp.fromMillis(2000) });
    const earlier = item({ id: 'earlier', deadlineCurrent: Timestamp.fromMillis(1000) });

    const result = sortQueueByDeadline([later, earlier]);

    expect(result.map(i => i.id)).toEqual(['earlier', 'later']);
  });

  it('pushes items without a deadline to the end', () => {
    const withDeadline = item({ id: 'with', deadlineCurrent: Timestamp.fromMillis(1000) });
    const withoutDeadline = item({ id: 'without' });

    const result = sortQueueByDeadline([withoutDeadline, withDeadline]);

    expect(result.map(i => i.id)).toEqual(['with', 'without']);
  });
});

describe('Component: DesignerQueue', () => {
  it('shows an empty state when there are no items', () => {
    render(<DesignerQueue items={[]} />);

    expect(
      screen.getByText('Nenhum item na sua fila no momento.'),
    ).toBeInTheDocument();
  });

  it('highlights items with a change request', () => {
    render(
      <DesignerQueue items={[item({ status: 'alteracao_solicitada' })]} />,
    );

    expect(screen.getByText('Alteração solicitada')).toBeInTheDocument();
  });
});
