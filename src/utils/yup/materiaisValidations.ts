import * as Yup from 'yup';

import type { Material } from '@/types';

export type CreateMaterialFormData = Pick<
  Material,
  'height' | 'materialType' | 'name' | 'price' | 'width'
>;

export const createMaterialSchema: Yup.ObjectSchema<CreateMaterialFormData> =
  Yup.object({
    name: Yup.string()
      .required('Material obrigatório')
      .matches(
        /(?:^|\s)\d+(?:[.,]\d+)?\s*mm(?:\s|$)/i,
        'Inclua a espessura no nome (ex.: 15mm)',
      ),
    width: Yup.number()
      .max(2750)
      .min(0)
      .required('Largura obrigatória')
      .typeError('Largura precisa ser um número'),
    height: Yup.number()
      .max(1850)
      .min(0)
      .required('Altura obrigatória')
      .typeError('Altura precisa ser um número'),
    price: Yup.number()
      .required('Preço obrigatório')
      .typeError('Preço precisa ser um número'),
    materialType: Yup.mixed<Material['materialType']>()
      .required('Tipo de material obrigatório')
      .oneOf(['MDF', 'Compensado']),
  });

export const updatePriceSchema = Yup.object().shape({
  newPrice: Yup.number()
    .required('Preço obrigatório')
    .typeError('Preço precisa ser um número'),
});
