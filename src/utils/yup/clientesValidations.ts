import * as Yup from 'yup';

export const createCustomerSchema = Yup.object().shape({
  firstName: Yup.string().required('Nome obrigatório'),
  lastName: Yup.string().required('Sobrenome obrigatório'),
  telephone: Yup.string(),
  address: Yup.string(),
  area: Yup.string(),
});

export const searchCustomerSchema = Yup.object().shape({
  customerName: Yup.string(),
});
