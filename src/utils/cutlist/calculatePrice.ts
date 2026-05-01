interface MaterialProps {
  width: number;
  height: number;
  price: number;
}

interface CutlistProps {
  amount: number;
  sideA: number;
  sideB: number;
  borderA: number;
  borderB: number;
  hingeHolesQuantity?: number;
  hasDrawerSlot?: boolean;
  roundedCornersCount?: number;
}

export const calculateCutlistPrice = (
  material: MaterialProps,
  cutlistData: CutlistProps,
  pricePercent?: number,
): number => {
  const qtd = cutlistData.amount;
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

  const holesCost = (cutlistData.hingeHolesQuantity || 0) * 5;

  // R$5 por canto boleado, por peça (multiplicado por qtd no return).
  const roundedCost = (cutlistData.roundedCornersCount || 0) * 5;

  const calculatedPrice =
    calculatedMaterial + calculatedBorder + holesCost + roundedCost;

  // Rasgo de gaveta: R$5 por par. Somado por fora pra não inflar com Math.ceil.
  const slotCost = cutlistData.hasDrawerSlot ? Math.floor(qtd / 2) * 5 : 0;

  return qtd * Math.ceil(calculatedPrice) + slotCost;
};
