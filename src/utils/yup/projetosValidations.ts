import * as Yup from 'yup';

export const projectItemSchema = Yup.object().shape({
  name: Yup.string().required('Nome do item é obrigatório'),
  environment: Yup.string().required('Ambiente é obrigatório'),
  material: Yup.string().optional(),
  description: Yup.string().optional(),
  notes: Yup.string().optional(),
});

export const createProjectSchema = Yup.object().shape({
  customerName: Yup.string().required('Nome do cliente é obrigatório'),
  customerPhone: Yup.string().required('Telefone é obrigatório'),
  customerEmail: Yup.string().email('Digite um e-mail válido').optional(),
  customerAddress: Yup.string().optional(),
});
