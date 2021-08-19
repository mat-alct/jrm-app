const calculateCutlistPrice = (
  material: IMaterial,
  cutlistData: Omit<ICutlist, 'id' | 'price' | 'material_id'>,
  pricePercent?: number,
): number => {
  const qtd = cutlistData.quantidade;
  const At = material.width * material.height;
  const Ap = cutlistData.side_a_size * cutlistData.side_b_size;
  const preço = material.price;
  const LFp = cutlistData.side_a_size * cutlistData.side_a_border;
  const AFp = cutlistData.side_b_size * cutlistData.side_b_border;
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

export default calculateCutlistPrice;
