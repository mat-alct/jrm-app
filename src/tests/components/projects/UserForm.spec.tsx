import { UserForm } from '@/components/projects/UserForm';

import { act, fireEvent, render, screen, waitFor } from '../../testUtils';

describe('Component: UserForm', () => {
  it('renders all fields', () => {
    render(<UserForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Telefone')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha inicial')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty', async () => {
    render(<UserForm onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });
  });

  it('submits valid data with the selected roles', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<UserForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Nome'), {
      target: { value: 'Fulano' },
    });
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'fulano@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha inicial'), {
      target: { value: 'segredo123' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: 'Vendedor' }));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fulano',
          email: 'fulano@example.com',
          password: 'segredo123',
          roles: ['seller'],
        }),
      );
    });
  });
});
