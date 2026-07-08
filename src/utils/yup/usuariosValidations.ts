import * as Yup from 'yup';

const ROLE_VALUES = ['admin', 'seller', 'designer', 'assembler'] as const;

export const createUserSchema = Yup.object().shape({
  name: Yup.string().required('Nome é obrigatório'),
  email: Yup.string()
    .email('Digite um e-mail válido')
    .required('E-mail é obrigatório'),
  phone: Yup.string().optional(),
  password: Yup.string()
    .min(6, 'A senha deve ter ao menos 6 caracteres')
    .required('Senha inicial é obrigatória'),
  roles: Yup.array()
    .of(Yup.string().oneOf(ROLE_VALUES).required())
    .min(1, 'Selecione ao menos um papel')
    .required('Selecione ao menos um papel'),
});
