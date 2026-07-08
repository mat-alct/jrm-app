import { ClientItemApprovalCard } from '@/components/client/ClientItemApprovalCard';
import { ClientProjectItemDTO } from '@/types/projects';

import { render, screen } from '../../testUtils';

function item(
  approvalStatus: ClientProjectItemDTO['approvalStatus'],
): ClientProjectItemDTO {
  return {
    itemId: 'item-1',
    name: 'Armario',
    environment: 'Quarto',
    customerPrice: 1200,
    approvalStatus,
    clientStatusLabel: 'Aguardando sua aprovação',
    attachments: [],
  };
}

describe('ClientItemApprovalCard', () => {
  it('renders the client status label', () => {
    render(
      <ClientItemApprovalCard
        item={item('aguardando')}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        onRequestChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Aguardando sua aprovação')).toBeInTheDocument();
  });

  it('disables actions when the item is approved', () => {
    render(
      <ClientItemApprovalCard
        item={item('aprovado')}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        onRequestChange={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Aprovar item' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pedir alteração' })).toBeDisabled();
  });

  it('disables actions when the item is refused', () => {
    render(
      <ClientItemApprovalCard
        item={item('recusado')}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        onRequestChange={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Aprovar item' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pedir alteração' })).toBeDisabled();
  });
});
