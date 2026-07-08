import * as Yup from 'yup';

const positiveInt = (label: string) =>
  Yup.number()
    .typeError(`${label} deve ser um número`)
    .integer(`${label} deve ser um número inteiro`)
    .min(1, `${label} deve ser maior que zero`)
    .required(`${label} é obrigatório`);

export const deadlineDefaultsSchema = Yup.object().shape({
  desenhoDias: positiveInt('Dias de desenho'),
  aprovacaoClienteDias: positiveInt('Dias de aprovação do cliente'),
  separacaoMateriaisDias: positiveInt('Dias de separação de materiais'),
  producaoDias: positiveInt('Dias de produção'),
  transporteDias: positiveInt('Dias de transporte'),
  montagemDias: positiveInt('Dias de montagem'),
});
