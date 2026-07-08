import { AssemblerPaymentsTable } from '@/components/admin/AssemblerPaymentsTable';
import { PendingByAssembler } from '@/services/projects/payment.service';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

describe('AssemblerPaymentsTable', () => {
  const groups: PendingByAssembler[] = [
    {
      assemblerId: 'assembler-1',
      assemblerName: 'Montador 1',
      total: 350,
      assignments: [
        {
          id: 'assembler-1',
          projectId: 'project-1',
          itemId: 'item-1',
          assemblerId: 'assembler-1',
          assemblerName: 'Montador 1',
          customerName: 'Cliente Teste',
          itemName: 'Armario',
          amountToReceive: 350,
          paymentStatus: 'pendente',
        } as never,
      ],
    },
  ];

  it('shows grouped totals and requires proof before paying', async () => {
    const onPay = jest.fn();
    const { container } = render(
      <AssemblerPaymentsTable groups={groups} onPay={onPay} />,
    );

    expect(screen.getByText('Montador 1')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 350,00')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Pagar' })).toBeDisabled();

    const proof = new File(['proof'], 'comprovante.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [proof] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }));

    await waitFor(() => {
      expect(onPay).toHaveBeenCalledWith(
        'project-1',
        'item-1',
        'assembler-1',
        proof,
      );
    });
  });
});
