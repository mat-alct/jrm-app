import * as Yup from 'yup';

// Esquema para PEDIDOS (Serviços)
export const createOrderSchema = Yup.object().shape({
  firstName: Yup.string().required('Nome obrigatório'),
  lastName: Yup.string().required('Sobrenome obrigatório'),
  telephone: Yup.string().default(''),
  address: Yup.string().default(''),
  area: Yup.string().default(''),
  // City removido da validação obrigatória
  deliveryType: Yup.string().required('Selecione o tipo de entrega'),
  paymentType: Yup.string().required('Selecione a forma de pagamento'),
  ps: Yup.string().default(''),
  deliveryDate: Yup.date()
    .required('Data de Entrega obrigatória')
    .typeError('Data inválida'),
  sellerPassword: Yup.string().required('Senha do vendedor obrigatória'),
  isUrgent: Yup.boolean().default(false), // Novo
  amountDue: Yup.string().notRequired(), // Novo (string para aceitar vazio)
});

// Esquema para ORÇAMENTOS
export const createEstimateSchema = Yup.object().shape({
  firstName: Yup.string().required('Nome obrigatório'),
  lastName: Yup.string().required('Sobrenome obrigatório'),
  telephone: Yup.string().default(''),
  address: Yup.string().notRequired(),
  area: Yup.string().notRequired(),
  deliveryType: Yup.string().notRequired(),
  paymentType: Yup.string().notRequired(),
  ps: Yup.string().default(''),
  deliveryDate: Yup.mixed().notRequired(),
  sellerPassword: Yup.string().required('Senha do vendedor obrigatória'),
  isUrgent: Yup.boolean().default(false),
  amountDue: Yup.string().notRequired(),
});

export const createCutlistSchema = Yup.object().shape({
  materialId: Yup.string().required('Material obrigatório'),
  amount: Yup.number()
    .required('Qtd obrigatória')
    .min(1, 'Mínimo 1 peça') // CORREÇÃO: Mínimo 1
    .typeError('Número obrigatório'),
  sideA: Yup.number()
    .required('Lado A obrigatório')
    .min(60, 'Mín: 60mm')
    .max(2750, 'Máx: 2750mm')
    .typeError('Número obrigatório'),
  sideB: Yup.number()
    .required('Lado B obrigatório')
    .typeError('Número obrigatório')
    .min(60, 'Mín: 60mm')
    .max(2750, 'Máx: 2750mm'),
  borderA: Yup.number().required('Fita Obrigatória'),
  borderB: Yup.number().required('Fita Obrigatória'),
});
