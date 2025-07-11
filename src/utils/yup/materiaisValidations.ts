import * as Yup from 'yup';

export const createMaterialSchema = Yup.object().shape({
  id: Yup.string().required('Material obrigatório'),
  name: Yup.string().required('Material obrigatório'),
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
  materialType: Yup.string()
    .required('Tipo de material obrigatório')
    .oneOf(['MDF', 'Compensado']),
});

export const updatePriceSchema = Yup.object().shape({
  newPrice: Yup.number()
    .required('Preço obrigatório')
    .typeError('Preço precisa ser um número'),
});
