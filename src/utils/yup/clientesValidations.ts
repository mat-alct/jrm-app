import * as Yup from 'yup';

export const createCustomerSchema = Yup.object().shape({
  firstName: Yup.string().required(
    'Nome obrigatório para cadastro de clientes',
  ),
  lastName: Yup.string().required(
    'Sobrenome obrigatório para cadastro de clientes',
  ),
  telephone: Yup.string().required(
    'Telefone obrigatório para cadastro de clientes',
  ),
  address: Yup.string().required(
    'Endereço obrigatório para cadastro de clientes',
  ),
  area: Yup.string().required('Bairro obrigatório para cadastro de clientes'),
});

export const searchCustomerSchema = Yup.object().shape({
  customerName: Yup.string(),
});
