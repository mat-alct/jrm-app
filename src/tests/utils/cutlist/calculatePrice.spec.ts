import { calculateCutlistPrice } from '@/utils/cutlist/calculatePrice';

/**
 * Chapa de 1000x1000 (area 1.000.000) custando R$100 — escolhida para que os
 * numeros esperados sejam inteiros calculados a mao, e nao uma repeticao da
 * formula do codigo de producao.
 */
const material = { width: 1000, height: 1000, price: 100 };

/** Peca de 1000x2000 => area 2.000.000 => 2x a area da chapa. */
function piece(
  overrides: Partial<Parameters<typeof calculateCutlistPrice>[1]> = {},
) {
  return {
    amount: 1,
    sideA: 1000,
    sideB: 2000,
    borderA: 0,
    borderB: 0,
    ...overrides,
  };
}

describe('calculateCutlistPrice', () => {
  describe('formula base (area da peca x preco x (1 + porc) / area da chapa)', () => {
    it('aplica 75% de acrescimo por padrao', () => {
      // 2.000.000 * 100 * 1,75 / 1.000.000 = 350
      expect(calculateCutlistPrice(material, piece())).toBe(350);
    });

    it('usa o pricePercent informado no lugar do padrao', () => {
      // 2.000.000 * 100 * 1,50 / 1.000.000 = 300
      expect(calculateCutlistPrice(material, piece(), 50)).toBe(300);
      // 2.000.000 * 100 * 1,01 / 1.000.000 = 202
      expect(calculateCutlistPrice(material, piece(), 1)).toBe(202);
    });

    it('trata pricePercent 0 como ausente e volta ao padrao de 75%', () => {
      // Comportamento atual: `if (pricePercent)` descarta o 0 por ser falsy.
      // Hoje e inalcancavel pela UI (opcoes 75/50/1), mas fica registrado: um 0
      // vindo de outra origem cobraria 75% de acrescimo silenciosamente.
      expect(calculateCutlistPrice(material, piece(), 0)).toBe(350);
    });
  });

  describe('fita de borda (R$3 por metro de borda)', () => {
    it('cobra a borda A proporcional ao lado A', () => {
      // 350 + 3 * (1000 * 1) / 1000 = 353
      expect(calculateCutlistPrice(material, piece({ borderA: 1 }))).toBe(353);
    });

    it('cobra a borda B proporcional ao lado B, independente da borda A', () => {
      // 350 + 3 * (2000 * 1) / 1000 = 356
      expect(calculateCutlistPrice(material, piece({ borderB: 1 }))).toBe(356);
    });

    it('soma as duas bordas quando ambas existem', () => {
      // 350 + 3 + 6 = 359
      expect(
        calculateCutlistPrice(material, piece({ borderA: 1, borderB: 1 })),
      ).toBe(359);
    });
  });

  describe('adicionais por peca', () => {
    it('cobra R$5 por furo de dobradica', () => {
      expect(
        calculateCutlistPrice(material, piece({ hingeHolesQuantity: 3 })),
      ).toBe(365);
    });

    it('cobra R$5 por canto boleado, multiplicado pela quantidade de pecas', () => {
      expect(
        calculateCutlistPrice(material, piece({ roundedCornersCount: 2 })),
      ).toBe(360);
      // 2 pecas x (350 + 10) = 720
      expect(
        calculateCutlistPrice(
          material,
          piece({ amount: 2, roundedCornersCount: 2 }),
        ),
      ).toBe(720);
    });

    it.each([
      [1, 0],
      [2, 5],
      [3, 5],
      [4, 10],
      [5, 10],
    ])(
      'cobra rasgo de gaveta por PAR de pecas: %i peca(s) => R$%i',
      (amount, expectedSlotCost) => {
        const withSlot = calculateCutlistPrice(
          material,
          piece({ amount, hasDrawerSlot: true }),
        );
        const withoutSlot = calculateCutlistPrice(material, piece({ amount }));

        expect(withSlot - withoutSlot).toBe(expectedSlotCost);
      },
    );

    it('nao cobra rasgo de gaveta quando hasDrawerSlot e falso', () => {
      expect(calculateCutlistPrice(material, piece({ amount: 4 }))).toBe(1400);
    });
  });

  describe('arredondamento', () => {
    it('arredonda para cima o preco de UMA peca antes de multiplicar pela quantidade', () => {
      // Peca de 1000x100 => area 100.000 => 100.000*100*1,75/1.000.000 = 17,5
      const fractional = piece({ sideB: 100, amount: 2 });

      // 2 * ceil(17,5) = 36 — e nao ceil(17,5 * 2) = 35.
      expect(calculateCutlistPrice(material, fractional)).toBe(36);
    });

    it('soma o rasgo de gaveta por fora do arredondamento', () => {
      // 2 * ceil(17,5) + 5 = 41
      expect(
        calculateCutlistPrice(
          material,
          piece({ sideB: 100, amount: 2, hasDrawerSlot: true }),
        ),
      ).toBe(41);
    });
  });

  describe('casos de borda', () => {
    it('devolve 0 quando a quantidade e 0', () => {
      expect(calculateCutlistPrice(material, piece({ amount: 0 }))).toBe(0);
      expect(
        calculateCutlistPrice(
          material,
          piece({ amount: 0, hasDrawerSlot: true }),
        ),
      ).toBe(0);
    });

    it('devolve 0 quando as medidas da peca sao 0', () => {
      expect(
        calculateCutlistPrice(material, piece({ sideA: 0, sideB: 0 })),
      ).toBe(0);
    });

    it('devolve 0 quando o material custa 0 e nao ha adicionais', () => {
      expect(calculateCutlistPrice({ ...material, price: 0 }, piece())).toBe(0);
    });

    it('cobra apenas os adicionais quando o material custa 0', () => {
      expect(
        calculateCutlistPrice(
          { ...material, price: 0 },
          piece({ hingeHolesQuantity: 2, roundedCornersCount: 1 }),
        ),
      ).toBe(15);
    });
  });
});
