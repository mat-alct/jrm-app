import { AssemblerPaymentHistory } from '@/components/assembler/AssemblerPaymentHistory';
import { AssemblerPayment } from '@/types/projects';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

function payment(overrides: Partial<AssemblerPayment> = {}): AssemblerPayment {
  return {
    id: 'payment-1',
    projectId: 'project-1',
    itemId: 'item-1',
    assignmentId: 'assembler-1',
    assemblerId: 'assembler-1',
    amount: 250,
    status: 'pago',
    ...overrides,
  } as AssemblerPayment;
}

describe('AssemblerPaymentHistory', () => {
  it('mostra o estado vazio sem pagamentos', () => {
    render(<AssemblerPaymentHistory payments={[]} />);

    expect(screen.getByText('Nenhum pagamento registrado')).toBeInTheDocument();
  });

  it('mostra valor e status de cada pagamento', () => {
    render(
      <AssemblerPaymentHistory
        payments={[
          payment(),
          payment({
            id: 'payment-2',
            amount: 400,
            status: 'confirmado_pelo_montador',
          }),
        ]}
      />,
    );

    expect(screen.getByText(/250,00/)).toBeInTheDocument();
    expect(screen.getByText(/400,00/)).toBeInTheDocument();
    expect(screen.getByText('pago')).toBeInTheDocument();
    expect(screen.getByText('confirmado_pelo_montador')).toBeInTheDocument();
  });

  it('oferece confirmar recebimento apenas para pagamento em "pago"', () => {
    render(
      <AssemblerPaymentHistory
        payments={[
          payment(),
          payment({ id: 'payment-2', status: 'confirmado_pelo_montador' }),
          payment({ id: 'payment-3', status: 'aguardando_liberacao' as never }),
        ]}
        onConfirm={jest.fn()}
      />,
    );

    expect(
      screen.getAllByRole('button', { name: 'Confirmar recebimento' }),
    ).toHaveLength(1);
  });

  it('nao oferece confirmacao quando nao ha handler (visao do admin)', () => {
    render(<AssemblerPaymentHistory payments={[payment()]} />);

    expect(
      screen.queryByRole('button', { name: 'Confirmar recebimento' }),
    ).not.toBeInTheDocument();
  });

  it('confirma o pagamento pelo id', async () => {
    const onConfirm = jest.fn();
    render(
      <AssemblerPaymentHistory
        payments={[payment({ id: 'payment-42' })]}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar recebimento' }),
    );

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('payment-42'));
  });

  it('indica quando ha comprovante anexado', () => {
    render(
      <AssemblerPaymentHistory
        payments={[
          payment({ proofStoragePath: 'payments/payment-1/comprovante.pdf' }),
        ]}
      />,
    );

    expect(screen.getByText('Comprovante anexado')).toBeInTheDocument();
  });

  it('nao indica comprovante quando nao ha', () => {
    render(<AssemblerPaymentHistory payments={[payment()]} />);

    expect(screen.queryByText('Comprovante anexado')).not.toBeInTheDocument();
  });

  it('desabilita a confirmacao enquanto ha requisicao em curso', () => {
    const { container } = render(
      <AssemblerPaymentHistory
        payments={[payment()]}
        onConfirm={jest.fn()}
        isBusy
      />,
    );

    // Em `loading` o Chakra troca o rotulo por um spinner.
    expect(container.querySelector('button')).toBeDisabled();
  });
});
