interface MaterialProps {
  width: number;
  height: number;
  price: number;
}

interface CutlistProps {
  quantidade: number;
  sideA: number;
  sideB: number;
  borderA: number;
  borderB: number;
}

export const calculateCutlistPrice = (
  material: MaterialProps,
  cutlistData: CutlistProps,
  pricePercent?: number,
): number => {
  const qtd = cutlistData.quantidade;
  const At = material.width * material.height;
  const Ap = cutlistData.sideA * cutlistData.sideB;
  const preço = material.price;
  const LFp = cutlistData.sideA * cutlistData.borderA;
  const AFp = cutlistData.sideB * cutlistData.borderB;
  let porc: number;

  if (pricePercent) {
    porc = pricePercent;
  } else {
    porc = 75;
  }

  const calculatedMaterial = (Ap * preço * (1 + porc / 100)) / At;

  const calculatedBorder = (3 * (LFp + AFp)) / 1000;

  const calculatedPrice = calculatedMaterial + calculatedBorder;

  return qtd * Math.ceil(calculatedPrice);
};
