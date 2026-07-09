import { createProjectSchema } from '@/utils/yup/projetosValidations';

const validItem = {
  name: 'Cozinha',
  environment: 'Cozinha',
};

const validProject = {
  customerName: 'Fulano',
  customerPhone: '82999999999',
  customerEmail: 'fulano@example.com',
  customerAddress: 'Rua Um, 123',
  items: [validItem],
};

describe('utils/yup/projetosValidations', () => {
  it('accepts a fully valid project', async () => {
    await expect(
      createProjectSchema.validate(validProject),
    ).resolves.toBeTruthy();
  });

  it('rejects a project without items', async () => {
    await expect(
      createProjectSchema.validate({ ...validProject, items: [] }),
    ).rejects.toThrow(/item/i);
  });

  it('rejects a project missing customer fields', async () => {
    await expect(
      createProjectSchema.validate({ ...validProject, customerName: '' }),
    ).rejects.toThrow();
  });

  it('rejects an invalid customer e-mail', async () => {
    await expect(
      createProjectSchema.validate({
        ...validProject,
        customerEmail: 'not-an-email',
      }),
    ).rejects.toThrow();
  });

  it('rejects an item missing name or environment', async () => {
    await expect(
      createProjectSchema.validate({
        ...validProject,
        items: [{ ...validItem, name: '' }],
      }),
    ).rejects.toThrow();
  });
});
