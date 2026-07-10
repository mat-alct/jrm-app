import { ValidationError } from 'yup';

import {
  createCustomerSchema,
  searchCustomerSchema,
} from '@/utils/yup/clientesValidations';
import {
  createMaterialSchema,
  updatePriceSchema,
} from '@/utils/yup/materiaisValidations';
import {
  createCutlistSchema,
  createEstimateSchema,
  createOrderSchema,
} from '@/utils/yup/novoservicoValidations';
import { loginSchema } from '@/utils/yup/pages/login';
import { createUserSchema } from '@/utils/yup/usuariosValidations';
import { createSellerSchema } from '@/utils/yup/vendedoresValidations';

/** Devolve as mensagens de erro do schema para o valor dado (vazio = valido). */
async function errorsOf(
  schema: { validate: (value: unknown, options: object) => Promise<unknown> },
  value: unknown,
): Promise<string[]> {
  try {
    await schema.validate(value, { abortEarly: false });
    return [];
  } catch (error) {
    return (error as ValidationError).errors;
  }
}

describe('loginSchema', () => {
  it('aceita email valido com senha de 8+ caracteres', async () => {
    expect(
      await errorsOf(loginSchema, { email: 'a@b.com', password: '12345678' }),
    ).toEqual([]);
  });

  it('exige email e senha', async () => {
    const errors = await errorsOf(loginSchema, {});
    expect(errors).toContain('Email obrigatório');
    expect(errors).toContain('Senha obrigatória');
  });

  it('recusa email malformado e senha curta', async () => {
    const errors = await errorsOf(loginSchema, {
      email: 'nao-e-email',
      password: '1234567',
    });
    expect(errors).toContain('Necessário que esteja em formato de email');
    expect(errors).toContain('Senha precisa de no mínimo 8 dígitos');
  });
});

describe('createOrderSchema (pedido)', () => {
  const valid = {
    firstName: 'Pedro',
    lastName: 'Silva',
    deliveryType: 'Entrega',
    paymentType: 'Dinheiro',
    deliveryDate: new Date('2026-02-01T00:00:00.000Z'),
    sellerPassword: 'senha',
  };

  it('aceita o payload minimo', async () => {
    expect(await errorsOf(createOrderSchema, valid)).toEqual([]);
  });

  it('exige nome, sobrenome, tipos, data e senha do vendedor', async () => {
    const errors = await errorsOf(createOrderSchema, {});
    expect(errors).toEqual(
      expect.arrayContaining([
        'Nome obrigatório',
        'Sobrenome obrigatório',
        'Selecione o tipo de entrega',
        'Selecione a forma de pagamento',
        'Data de Entrega obrigatória',
        'Senha do vendedor obrigatória',
      ]),
    );
  });

  it('recusa data de entrega invalida', async () => {
    const errors = await errorsOf(createOrderSchema, {
      ...valid,
      deliveryDate: 'nao-e-data',
    });
    expect(errors).toContain('Data inválida');
  });

  it('preenche defaults de campos opcionais', async () => {
    const parsed = await createOrderSchema.validate(valid);
    expect(parsed).toMatchObject({
      telephone: '',
      address: '',
      area: '',
      ps: '',
      isUrgent: false,
    });
  });
});

describe('createEstimateSchema (orcamento)', () => {
  it('nao exige tipo de entrega, pagamento nem data', async () => {
    expect(
      await errorsOf(createEstimateSchema, {
        firstName: 'Ana',
        lastName: 'Souza',
        sellerPassword: 'senha',
      }),
    ).toEqual([]);
  });

  it('continua exigindo nome, sobrenome e senha do vendedor', async () => {
    const errors = await errorsOf(createEstimateSchema, {});
    expect(errors).toEqual(
      expect.arrayContaining([
        'Nome obrigatório',
        'Sobrenome obrigatório',
        'Senha do vendedor obrigatória',
      ]),
    );
  });
});

describe('createCutlistSchema (peca)', () => {
  const valid = {
    materialId: 'mat-1',
    amount: 1,
    sideA: 60,
    sideB: 2750,
    borderA: 0,
    borderB: 0,
  };

  it('aceita os limites de medida (60mm a 2750mm) e quantidade minima 1', async () => {
    expect(await errorsOf(createCutlistSchema, valid)).toEqual([]);
  });

  it('recusa quantidade menor que 1', async () => {
    expect(
      await errorsOf(createCutlistSchema, { ...valid, amount: 0 }),
    ).toContain('Mínimo 1 peça');
  });

  it('recusa medidas fora do intervalo permitido', async () => {
    expect(
      await errorsOf(createCutlistSchema, { ...valid, sideA: 59 }),
    ).toContain('Mín: 60mm');
    expect(
      await errorsOf(createCutlistSchema, { ...valid, sideB: 2751 }),
    ).toContain('Máx: 2750mm');
  });

  it('recusa valores nao numericos e material ausente', async () => {
    const errors = await errorsOf(createCutlistSchema, {
      ...valid,
      materialId: undefined,
      amount: 'muitos',
    });
    expect(errors).toContain('Material obrigatório');
    expect(errors).toContain('Número obrigatório');
  });
});

describe('createMaterialSchema', () => {
  const valid = {
    name: 'MDF Branco 15mm',
    width: 2750,
    height: 1850,
    price: 220,
    materialType: 'MDF',
  };

  it('aceita material valido nos limites da chapa', async () => {
    expect(await errorsOf(createMaterialSchema, valid)).toEqual([]);
  });

  it('exige a espessura no nome completo do material', async () => {
    expect(
      await errorsOf(createMaterialSchema, { ...valid, name: 'MDF Branco' }),
    ).toContain('Inclua a espessura no nome (ex.: 15mm)');
  });

  it('exige nome, medidas, preco e tipo', async () => {
    const errors = await errorsOf(createMaterialSchema, {});
    expect(errors).toEqual(
      expect.arrayContaining([
        'Material obrigatório',
        'Largura obrigatória',
        'Altura obrigatória',
        'Preço obrigatório',
        'Tipo de material obrigatório',
      ]),
    );
  });

  it('recusa medidas acima da chapa e tipo fora da lista', async () => {
    expect(
      (await errorsOf(createMaterialSchema, { ...valid, width: 2751 })).length,
    ).toBeGreaterThan(0);
    expect(
      (await errorsOf(createMaterialSchema, { ...valid, height: 1851 })).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await errorsOf(createMaterialSchema, {
          ...valid,
          materialType: 'Marmore',
        })
      ).length,
    ).toBeGreaterThan(0);
  });

  it('recusa medidas negativas e preco nao numerico', async () => {
    expect(
      (await errorsOf(createMaterialSchema, { ...valid, width: -1 })).length,
    ).toBeGreaterThan(0);
    expect(
      await errorsOf(createMaterialSchema, { ...valid, price: 'caro' }),
    ).toContain('Preço precisa ser um número');
  });

  it('updatePriceSchema exige preco numerico', async () => {
    expect(await errorsOf(updatePriceSchema, { newPrice: 10 })).toEqual([]);
    expect(await errorsOf(updatePriceSchema, {})).toContain(
      'Preço obrigatório',
    );
    expect(await errorsOf(updatePriceSchema, { newPrice: 'x' })).toContain(
      'Preço precisa ser um número',
    );
  });
});

describe('createCustomerSchema e searchCustomerSchema', () => {
  it('exige todos os campos do cliente', async () => {
    const errors = await errorsOf(createCustomerSchema, {});
    expect(errors).toHaveLength(5);
    expect(errors).toContain('Nome obrigatório para cadastro de clientes');
    expect(errors).toContain('Bairro obrigatório para cadastro de clientes');
  });

  it('aceita cliente completo', async () => {
    expect(
      await errorsOf(createCustomerSchema, {
        firstName: 'Pedro',
        lastName: 'Silva',
        telephone: '24999990000',
        address: 'Rua A, 1',
        area: 'Centro',
      }),
    ).toEqual([]);
  });

  it('busca por nome e opcional', async () => {
    expect(await errorsOf(searchCustomerSchema, {})).toEqual([]);
    expect(
      await errorsOf(searchCustomerSchema, { customerName: 'Pedro' }),
    ).toEqual([]);
  });
});

describe('createUserSchema', () => {
  const valid = {
    name: 'Novo Usuario',
    email: 'novo@jrm.com',
    password: '123456',
    roles: ['designer'],
  };

  it('aceita usuario valido sem telefone', async () => {
    expect(await errorsOf(createUserSchema, valid)).toEqual([]);
  });

  it('aceita telefone com 10 ou 11 digitos, formatado ou nao', async () => {
    expect(
      await errorsOf(createUserSchema, { ...valid, phone: '2499999000' }),
    ).toEqual([]);
    expect(
      await errorsOf(createUserSchema, { ...valid, phone: '(24) 99999-0000' }),
    ).toEqual([]);
  });

  it('recusa telefone com quantidade de digitos invalida', async () => {
    expect(
      await errorsOf(createUserSchema, { ...valid, phone: '99999' }),
    ).toContain('Telefone inválido');
    expect(
      await errorsOf(createUserSchema, { ...valid, phone: '249999900001' }),
    ).toContain('Telefone inválido');
  });

  it('exige senha de 6+ caracteres e ao menos um papel valido', async () => {
    expect(
      await errorsOf(createUserSchema, { ...valid, password: '12345' }),
    ).toContain('A senha deve ter ao menos 6 caracteres');
    expect(await errorsOf(createUserSchema, { ...valid, roles: [] })).toContain(
      'Selecione ao menos um papel',
    );
    expect(
      (await errorsOf(createUserSchema, { ...valid, roles: ['superuser'] }))
        .length,
    ).toBeGreaterThan(0);
  });

  it('exige nome e email valido', async () => {
    const errors = await errorsOf(createUserSchema, {
      ...valid,
      name: '',
      email: 'x',
    });
    expect(errors).toContain('Nome é obrigatório');
    expect(errors).toContain('Digite um e-mail válido');
  });
});

describe('createSellerSchema', () => {
  it('exige nome e senha do vendedor', async () => {
    const errors = await errorsOf(createSellerSchema, {});
    expect(errors).toContain('Nome do vendedor é obrigatório');
    expect(errors).toContain('A senha (ID) do vendedor é obrigatória');
  });

  it('aceita vendedor completo', async () => {
    expect(
      await errorsOf(createSellerSchema, {
        name: 'Vendedor',
        password: 'senha',
      }),
    ).toEqual([]);
  });
});
