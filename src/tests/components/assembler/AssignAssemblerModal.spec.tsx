import { AssignAssemblerModal } from '@/components/assembler/AssignAssemblerModal';
import { AppUser } from '@/types/projects';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

const assemblers = [
  { id: 'assembler-1', name: 'Montador 1', roles: ['assembler'], active: true },
  { id: 'assembler-2', name: 'Montador 2', roles: ['assembler'], active: true },
] as AppUser[];

describe('AssignAssemblerModal', () => {
  it('validates amount greater than zero', async () => {
    const onSubmit = jest.fn();
    render(
      <AssignAssemblerModal assemblers={assemblers} onSubmit={onSubmit} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salvar atribuições' }));

    expect(
      await screen.findByText('Informe montador e valor maior que zero.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits multiple assembler assignments', async () => {
    const onSubmit = jest.fn();
    render(
      <AssignAssemblerModal assemblers={assemblers} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByLabelText('Valor a receber'), {
      target: { value: '500' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar montador' }));

    const assemblerFields = screen.getAllByLabelText('Montador');
    const amountFields = screen.getAllByLabelText('Valor a receber');
    fireEvent.change(assemblerFields[1], { target: { value: 'assembler-2' } });
    fireEvent.change(amountFields[1], { target: { value: '300' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar atribuições' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith([
        {
          assemblerId: 'assembler-1',
          assemblerName: 'Montador 1',
          amountToReceive: 500,
        },
        {
          assemblerId: 'assembler-2',
          assemblerName: 'Montador 2',
          amountToReceive: 300,
        },
      ]);
    });
  });
});
