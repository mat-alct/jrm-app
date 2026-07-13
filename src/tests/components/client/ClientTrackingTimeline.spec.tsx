import { ClientTrackingTimeline } from '@/components/client/ClientTrackingTimeline';
import { ClientProjectDTO } from '@/types/projects';

import { render, screen } from '../../testUtils';

describe('ClientTrackingTimeline', () => {
  const project: ClientProjectDTO = {
    projectId: 'project-1',
    customerName: 'Cliente Teste',
    items: [
      {
        itemId: 'item-1',
        name: 'Armario',
        environment: 'Quarto',
        customerAmount: 1200,
        approvalStatus: 'aprovado',
        clientStatusLabel: 'Em produção',
        estimatedDeliveryDate: '2026-08-10T12:00:00.000Z',
        attachments: [],
      },
    ],
  };

  it('renders the tracking steps in order and highlights the current step', () => {
    render(<ClientTrackingTimeline project={project} />);

    const budget = screen.getByText('Orçamento em preparação');
    const production = screen.getByText('Em produção');
    const finished = screen.getByText('Finalizado');

    expect(
      budget.compareDocumentPosition(production) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      production.compareDocumentPosition(finished) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByLabelText('Etapa atual')).toBeInTheDocument();
    expect(
      screen.getByText('Próxima previsão: 10/08/2026'),
    ).toBeInTheDocument();
  });
});
