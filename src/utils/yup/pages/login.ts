import * as Yup from 'yup';

export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Necessário que esteja em formato de email')
    .required('Email obrigatório'),
  password: Yup.string()
    .required('Senha obrigatória')
    .min(8, 'Senha precisa de no mínimo 8 dígitos'),
});
