import * as Yup from 'yup';

export const createOrderSchema = Yup.object().shape({
  firstName: Yup.string().required('Nome obrigatório'),
  lastName: Yup.string().required('Sobrenome obrigatório'),
  telephone: Yup.string().default(''),
  address: Yup.string().default(''),
  area: Yup.string().default(''),
  city: Yup.string().default(''),
  orderStore: Yup.string().default(''),
  deliveryType: Yup.string().default(''),
  paymentType: Yup.string().default(''),
  ps: Yup.string().default(''),
  deliveryDate: Yup.date().required('Data de Entrega obrigatória'),
  sellerPassword: Yup.string().required('Senha do vendedor obrigatória'),
});

export const createCutlistSchema = Yup.object().shape({
  materialId: Yup.string().required('Material obrigatório'),
  amount: Yup.number()
    .required('Quantidade obrigatória')
    .typeError('Número obrigatório'),
  sideA: Yup.number()
    .required('Lado A obrigatório')
    .min(60, 'Tamanho mínimo: 60mm')
    .max(2750, 'Tamanho máximo: 2750mm')
    .typeError('Número obrigatório'),
  sideB: Yup.number()
    .required('Lado B obrigatório')
    .typeError('Número obrigatório')
    .min(60, 'Tamanho mínimo: 60mm')
    .max(2750, 'Tamanho máximo: 2750mm'),
  borderA: Yup.number().required('Fita Obrigatória'),
  borderB: Yup.number().required('Fita Obrigatória'),
});
