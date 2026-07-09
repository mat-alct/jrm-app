import { ItemBudgetForm } from '@/components/projects/ItemBudgetForm';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

describe('Component: ItemBudgetForm', () => {
  it('renders one empty line by default', () => {
    render(<ItemBudgetForm onSubmit={jest.fn()} />);

    expect(screen.getAllByLabelText('Descrição')).toHaveLength(1);
    expect(screen.getByText('Custo total: 0.00')).toBeInTheDocument();
  });

  it('adds a new line when clicking "Adicionar linha"', () => {
    render(<ItemBudgetForm onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar linha' }));

    expect(screen.getAllByLabelText('Descrição')).toHaveLength(2);
  });

  it('submits the filled values', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<ItemBudgetForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Descrição'), {
      target: { value: 'MDF' },
    });
    fireEvent.change(screen.getByLabelText('Valor'), {
      target: { value: '300' },
    });
    fireEvent.change(screen.getByLabelText('Valor cobrado do cliente'), {
      target: { value: '500' },
    });
    fireEvent.change(screen.getByLabelText('Sugestão de valor para o montador'), {
      target: { value: '150' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar orçamento' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: [{ description: 'MDF', amount: 300 }],
          customerAmount: 500,
          suggestedAssemblerAmount: 150,
        }),
      );
    });
  });

  it('pre-fills from an existing budget', () => {
    render(
      <ItemBudgetForm
        onSubmit={jest.fn()}
        initialBudget={{
          lines: [{ id: '0', description: 'Ferragens', amount: 80 }],
          totalCost: 80,
          customerAmount: 200,
          suggestedAssemblerAmount: 60,
          createdBy: 'u1',
          createdByName: 'Fulano',
          createdAt: { toDate: () => new Date() } as never,
          updatedAt: { toDate: () => new Date() } as never,
        }}
      />,
    );

    expect(screen.getByDisplayValue('Ferragens')).toBeInTheDocument();
    expect(screen.getByText('Custo total: 80.00')).toBeInTheDocument();
  });
});
