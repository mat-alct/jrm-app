import { deadlineDefaultsSchema } from '@/utils/yup/deadlineDefaultsValidations';

const valid = {
  desenhoDias: 5,
  orcamentoDias: 2,
  aprovacaoClienteDias: 3,
  atribuicaoMontadorDias: 2,
  producaoDias: 10,
  montagemDias: 2,
};

describe('utils/yup/deadlineDefaultsValidations', () => {
  it('accepts valid positive integers', async () => {
    await expect(deadlineDefaultsSchema.validate(valid)).resolves.toBeTruthy();
  });

  it('rejects zero or negative values', async () => {
    await expect(
      deadlineDefaultsSchema.validate({ ...valid, desenhoDias: 0 }),
    ).rejects.toThrow();
  });

  it('rejects non-integer values', async () => {
    await expect(
      deadlineDefaultsSchema.validate({ ...valid, desenhoDias: 2.5 }),
    ).rejects.toThrow();
  });

  it('rejects missing fields', async () => {
    const { desenhoDias, ...rest } = valid;
    await expect(deadlineDefaultsSchema.validate(rest)).rejects.toThrow();
  });
});
