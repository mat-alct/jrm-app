import * as Yup from 'yup';

// Este é o esquema de validação para o formulário de criação de vendedor.
export const createSellerSchema = Yup.object().shape({
  // Define que o campo 'name' é uma string e é obrigatório.
  name: Yup.string().required('Nome do vendedor é obrigatório'),

  // Define que o campo 'password' é uma string e é obrigatório.
  password: Yup.string().required('A senha (ID) do vendedor é obrigatória'),
});
