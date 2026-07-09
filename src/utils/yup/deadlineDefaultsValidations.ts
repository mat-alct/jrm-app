import * as Yup from 'yup';

const positiveInt = (label: string) =>
  Yup.number()
    .typeError(`${label} deve ser um número`)
    .integer(`${label} deve ser um número inteiro`)
    .min(1, `${label} deve ser maior que zero`)
    .required(`${label} é obrigatório`);

export const deadlineDefaultsSchema = Yup.object().shape({
  desenhoDias: positiveInt('Dias de desenho'),
  orcamentoDias: positiveInt('Dias de orçamento'),
  aprovacaoClienteDias: positiveInt('Dias de aprovação do cliente'),
  atribuicaoMontadorDias: positiveInt('Dias de atribuição de montador'),
  producaoDias: positiveInt('Dias de produção'),
  montagemDias: positiveInt('Dias de montagem'),
});
