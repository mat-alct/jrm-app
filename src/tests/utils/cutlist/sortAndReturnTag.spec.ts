import { sortCutlistData } from '@/utils/cutlist/sortAndReturnTag';

// Observacao: os 9 SVGs de etiqueta viram o MESMO stub sob o transform do next/jest,
// entao "qual etiqueta foi escolhida" nao e observavel aqui — asserir isso seria um
// teste em volta. O que este spec cobre e a ordenacao dos lados/bordas (a logica real);
// a renderizacao da etiqueta certa e coberta no spec de `Printables/Tags` e no e2e.
describe('sortCutlistData', () => {
  it('elege o maior lado como gside e o menor como pside', () => {
    expect(
      sortCutlistData({ sideA: 300, sideB: 800, borderA: 1, borderB: 2 }),
    ).toMatchObject({ gside: 800, pside: 300 });

    expect(
      sortCutlistData({ sideA: 800, sideB: 300, borderA: 1, borderB: 2 }),
    ).toMatchObject({ gside: 800, pside: 300 });
  });

  it('mantem sideA como gside quando os lados empatam', () => {
    expect(
      sortCutlistData({ sideA: 500, sideB: 500, borderA: 2, borderB: 0 }),
    ).toMatchObject({ gside: 500, pside: 500 });
  });

  it('trata medidas zeradas sem inverter a ordem', () => {
    expect(
      sortCutlistData({ sideA: 0, sideB: 0, borderA: 0, borderB: 0 }),
    ).toMatchObject({ gside: 0, pside: 0 });

    expect(
      sortCutlistData({ sideA: 0, sideB: 120, borderA: 0, borderB: 1 }),
    ).toMatchObject({ gside: 120, pside: 0 });
  });

  it('sempre devolve uma etiqueta, inclusive para bordas fora do dominio 0..2', () => {
    expect(
      sortCutlistData({ sideA: 900, sideB: 100, borderA: 7, borderB: 9 })
        .avatar,
    ).toBeDefined();
  });

  it.each([
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ])('resolve a etiqueta para a combinacao G%iP%i', (borderA, borderB) => {
    const result = sortCutlistData({
      sideA: 900,
      sideB: 100,
      borderA,
      borderB,
    });

    expect(result.avatar).toBeDefined();
    expect(result).toMatchObject({ gside: 900, pside: 100 });
  });
});
