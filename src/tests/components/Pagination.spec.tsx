import { Pagination } from '@/components/Pagination';

import { fireEvent, render, screen } from '../testUtils';

/** Numeros de pagina visiveis, na ordem em que aparecem. */
function visiblePages(): string[] {
  return screen
    .getAllByRole('button')
    .map(button => button.textContent ?? '')
    .filter(text => /^\d+$/.test(text));
}

describe('Pagination', () => {
  it('mostra o intervalo de registros da pagina atual', () => {
    render(
      <Pagination
        totalCountOfRegisters={53}
        currentPage={3}
        onPageChange={jest.fn()}
      />,
    );

    // (3-1)*10 = 20 ate 3*10 = 30, de 53.
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('53')).toBeInTheDocument();
  });

  it('limita o fim do intervalo ao total quando ha menos registros que uma pagina', () => {
    render(
      <Pagination
        totalCountOfRegisters={4}
        currentPage={1}
        onPageChange={jest.fn()}
      />,
    );

    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('na primeira pagina nao mostra paginas anteriores', () => {
    render(
      <Pagination
        totalCountOfRegisters={100}
        currentPage={1}
        onPageChange={jest.fn()}
      />,
    );

    expect(visiblePages()).toEqual(['1', '2', '10']);
  });

  it('na ultima pagina nao mostra paginas seguintes', () => {
    render(
      <Pagination
        totalCountOfRegisters={100}
        currentPage={10}
        onPageChange={jest.fn()}
      />,
    );

    expect(visiblePages()).toEqual(['1', '9', '10']);
  });

  it('no meio mostra vizinhos, primeira e ultima pagina com reticencias', () => {
    render(
      <Pagination
        totalCountOfRegisters={100}
        currentPage={5}
        onPageChange={jest.fn()}
      />,
    );

    expect(visiblePages()).toEqual(['1', '4', '5', '6', '10']);
    expect(screen.getAllByText('...')).toHaveLength(2);
  });

  it('nao mostra reticencias quando as paginas sao adjacentes', () => {
    render(
      <Pagination
        totalCountOfRegisters={40}
        currentPage={2}
        onPageChange={jest.fn()}
      />,
    );

    expect(screen.queryByText('...')).not.toBeInTheDocument();
  });

  it('avisa a pagina escolhida ao clicar', () => {
    const onPageChange = jest.fn();
    render(
      <Pagination
        totalCountOfRegisters={100}
        currentPage={5}
        onPageChange={onPageChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '10' }));
    expect(onPageChange).toHaveBeenCalledWith(10);

    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('respeita registersPerPage customizado no calculo da ultima pagina', () => {
    render(
      <Pagination
        totalCountOfRegisters={100}
        registersPerPage={25}
        currentPage={1}
        onPageChange={jest.fn()}
      />,
    );

    expect(visiblePages()).toEqual(['1', '2', '4']);
  });

  it('mostra apenas a pagina atual quando ha uma unica pagina', () => {
    render(
      <Pagination
        totalCountOfRegisters={5}
        currentPage={1}
        onPageChange={jest.fn()}
      />,
    );

    expect(visiblePages()).toEqual(['1']);
  });
});
