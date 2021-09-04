import * as Yup from 'yup';

export const test = Yup.object().shape({
  material: Yup.object().shape({
    materialId: Yup.string().required(
      'Material precisa existir no banco de dados',
    ),
    name: Yup.string().required('Nome do material obrigatório'),
    width: Yup.number()
      .required('Largura do material obrigatória')
      .min(0)
      .max(2750)
      .typeError('Largura precisa ser um número'),
    height: Yup.number()
      .required('Altura do material obrigatória')
      .min(0)
      .max(1850)
      .typeError('Altura precisa ser um número'),
    price: Yup.number()
      .required('Preço do material obrigatório')
      .typeError('Preço precisa ser um número'),
  }),
  amount: Yup.number()
    .required('Quantidade obrigatória')
    .typeError('Quantidade precisa ser um número'),
  sideA: Yup.number()
    .required('Lado A obrigatório')
    .min(60, 'Tamanho mínimo de 60mm')
    .max(2750, 'Tamanho máximo de 2750'),
  sideB: Yup.number()
    .required('Lado B obrigatório')
    .min(60, 'Tamanho mínimo de 60mm')
    .max(2750, 'Tamanho máximo de 2750'),
  borderA: Yup.number().required('Obrigatório'),
  borderB: Yup.number().required('Obrigatório'),
  price: Yup.number().required('Obrigatório'),
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
