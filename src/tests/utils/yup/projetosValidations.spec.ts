import {
  createProjectSchema,
  projectItemSchema,
} from '@/utils/yup/projetosValidations';

const validItem = {
  name: 'Cozinha',
  environment: 'Cozinha',
};

const validProject = {
  customerName: 'Fulano',
  customerPhone: '82999999999',
};

describe('utils/yup/projetosValidations', () => {
  describe('createProjectSchema', () => {
    it('accepts a project with only name and phone', async () => {
      await expect(
        createProjectSchema.validate(validProject),
      ).resolves.toBeTruthy();
    });

    it('accepts a project with optional email/address filled', async () => {
      await expect(
        createProjectSchema.validate({
          ...validProject,
          customerEmail: 'fulano@example.com',
          customerAddress: 'Rua Um, 123',
        }),
      ).resolves.toBeTruthy();
    });

    it('rejects a project missing name or phone', async () => {
      await expect(
        createProjectSchema.validate({ ...validProject, customerName: '' }),
      ).rejects.toThrow();
      await expect(
        createProjectSchema.validate({ ...validProject, customerPhone: '' }),
      ).rejects.toThrow();
    });

    it('rejects an invalid customer e-mail when provided', async () => {
      await expect(
        createProjectSchema.validate({
          ...validProject,
          customerEmail: 'not-an-email',
        }),
      ).rejects.toThrow();
    });
  });

  describe('projectItemSchema', () => {
    it('accepts a valid item', async () => {
      await expect(
        projectItemSchema.validate(validItem),
      ).resolves.toBeTruthy();
    });

    it('rejects an item missing name or environment', async () => {
      await expect(
        projectItemSchema.validate({ ...validItem, name: '' }),
      ).rejects.toThrow();
    });
  });
});
