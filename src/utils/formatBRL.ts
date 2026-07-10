const currencyNumberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatBRL = (value: number): string =>
  `R$ ${currencyNumberFormatter.format(value)}`;
