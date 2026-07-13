import { SearchBar } from '@/components/SearchBar';

import { fireEvent, render, screen, waitFor } from '../testUtils';

describe('SearchBar', () => {
  it('usa o placeholder padrao quando nenhum e informado', () => {
    render(<SearchBar handleUpdateSearch={jest.fn()} />);

    expect(
      screen.getByPlaceholderText('Digite o nome do cliente'),
    ).toBeInTheDocument();
  });

  it('respeita o placeholder customizado', () => {
    render(
      <SearchBar handleUpdateSearch={jest.fn()} placeholder="Buscar pedido" />,
    );

    expect(screen.getByPlaceholderText('Buscar pedido')).toBeInTheDocument();
  });

  it('entrega o termo digitado ao submeter', async () => {
    const handleUpdateSearch = jest.fn();
    render(<SearchBar handleUpdateSearch={handleUpdateSearch} />);

    fireEvent.change(screen.getByPlaceholderText('Digite o nome do cliente'), {
      target: { value: 'Pedro Silva' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() =>
      expect(handleUpdateSearch).toHaveBeenCalledWith('Pedro Silva'),
    );
  });

  it('entrega string vazia quando o campo fica em branco (limpar busca)', async () => {
    const handleUpdateSearch = jest.fn();
    render(<SearchBar handleUpdateSearch={handleUpdateSearch} />);

    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(handleUpdateSearch).toHaveBeenCalledWith(''));
  });
});
