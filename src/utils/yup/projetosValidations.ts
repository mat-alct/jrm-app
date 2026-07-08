import * as Yup from 'yup';

export const projectItemSchema = Yup.object().shape({
  name: Yup.string().required('Nome do item é obrigatório'),
  environment: Yup.string().required('Ambiente é obrigatório'),
  material: Yup.string().optional(),
  finish: Yup.string().optional(),
  measurements: Yup.string().optional(),
  description: Yup.string().optional(),
  notes: Yup.string().optional(),
  customerPrice: Yup.number()
    .typeError('Preço inválido')
    .min(0, 'Preço não pode ser negativo')
    .required('Preço é obrigatório'),
  requiresDesigner: Yup.boolean().default(false).required(),
});

export const createProjectSchema = Yup.object().shape({
  customerName: Yup.string().required('Nome do cliente é obrigatório'),
  customerPhone: Yup.string().required('Telefone é obrigatório'),
  customerEmail: Yup.string()
    .email('Digite um e-mail válido')
    .required('E-mail é obrigatório'),
  customerAddress: Yup.string().required('Endereço é obrigatório'),
  sellerId: Yup.string().required('Selecione o vendedor'),
  items: Yup.array()
    .of(projectItemSchema)
    .min(1, 'Adicione ao menos um item')
    .required(),
});
