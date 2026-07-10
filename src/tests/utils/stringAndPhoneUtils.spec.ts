import { capitalizeAndStrip } from '@/utils/capitalizeAndStripString';
import { areas } from '@/utils/listOfAreas';
import { normalizeTelephoneInput } from '@/utils/normalizeTelephone';
import { removeUndefinedAndEmptyFields } from '@/utils/removeUndefinedAndEmpty';

describe('capitalizeAndStrip', () => {
  it('capitaliza a primeira letra de cada palavra e baixa o resto', () => {
    expect(capitalizeAndStrip('pedro SILVA')).toBe('Pedro Silva');
    expect(capitalizeAndStrip('mARIA da sILVA')).toBe('Maria Da Silva');
  });

  it('remove espacos nas pontas mas preserva os internos', () => {
    expect(capitalizeAndStrip('  joao  paulo  ')).toBe('Joao  Paulo');
  });

  it('devolve a entrada quando ela e vazia', () => {
    expect(capitalizeAndStrip('')).toBe('');
  });

  it('nao quebra com acentos e numeros', () => {
    expect(capitalizeAndStrip('ÁLVARO 2ª rua')).toBe('Álvaro 2ª Rua');
  });
});

describe('normalizeTelephoneInput', () => {
  it('devolve os digitos crus ate 2 caracteres', () => {
    expect(normalizeTelephoneInput('2', '')).toBe('2');
    expect(normalizeTelephoneInput('24', '2')).toBe('24');
  });

  it('formata o DDD entre parenteses a partir do 3o digito', () => {
    expect(normalizeTelephoneInput('249', '24')).toBe('(24) 9');
    expect(normalizeTelephoneInput('249999', '24999')).toBe('(24) 9999');
  });

  it('insere o hifen a partir do 7o digito', () => {
    expect(normalizeTelephoneInput('2499999', '249999')).toBe('(24) 99999-');
    expect(normalizeTelephoneInput('24999990000', '2499999000')).toBe(
      '(24) 99999-0000',
    );
  });

  it('descarta digitos alem do 11o', () => {
    expect(normalizeTelephoneInput('2499999000012345', '249999900001234')).toBe(
      '(24) 99999-0000',
    );
  });

  it('ignora caracteres que nao sao digitos', () => {
    expect(normalizeTelephoneInput('(24) 99999-0000', '(24) 99999-000')).toBe(
      '(24) 99999-0000',
    );
  });

  it('devolve a entrada vazia sem formatar', () => {
    expect(normalizeTelephoneInput('', '')).toBe('');
  });

  it('devolve string vazia quando o usuario apaga (valor nao cresceu)', () => {
    // Comportamento atual: qualquer entrada que nao seja maior que a anterior
    // zera o campo, e nao apenas remove o ultimo caractere.
    expect(normalizeTelephoneInput('(24) 99999-000', '(24) 99999-0000')).toBe('');
    expect(normalizeTelephoneInput('24', '24')).toBe('');
  });
});

describe('removeUndefinedAndEmptyFields', () => {
  it('remove chaves undefined e string vazia, mutando o objeto', () => {
    const target: Record<string, unknown> = {
      name: 'Pedro',
      phone: undefined,
      note: '',
      amount: 0,
    };

    removeUndefinedAndEmptyFields(target);

    expect(target).toEqual({ name: 'Pedro', amount: 0 });
    expect('phone' in target).toBe(false);
    expect('note' in target).toBe(false);
  });

  it('preserva null, 0 e false (apenas undefined e "" saem)', () => {
    const target: Record<string, unknown> = {
      zero: 0,
      falso: false,
      nulo: null,
      vazio: '',
    };

    removeUndefinedAndEmptyFields(target);

    expect(target).toEqual({ zero: 0, falso: false, nulo: null });
  });

  it('nao percorre objetos aninhados nem arrays', () => {
    // Comportamento atual: a limpeza e rasa. Campos undefined dentro de objetos
    // aninhados sobrevivem — por isso os services usam `stripUndefined` proprio
    // antes de gravar no Firestore.
    const nested: Record<string, unknown> = {
      customer: { name: 'Ana', phone: undefined },
      items: [{ id: 1, note: '' }],
    };

    removeUndefinedAndEmptyFields(nested);

    expect(nested.customer).toEqual({ name: 'Ana', phone: undefined });
    expect(nested.items).toEqual([{ id: 1, note: '' }]);
  });

  it('mantem instancias de classe intactas (ex.: Date/Timestamp)', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const target: Record<string, unknown> = { createdAt, empty: '' };

    removeUndefinedAndEmptyFields(target);

    expect(target.createdAt).toBe(createdAt);
  });

  it('devolve undefined (efeito e a mutacao, nao o retorno)', () => {
    expect(removeUndefinedAndEmptyFields({ a: 1 })).toBeUndefined();
  });
});

describe('listOfAreas', () => {
  it('expoe uma lista nao vazia de bairros sem duplicatas nem strings vazias', () => {
    expect(areas.length).toBeGreaterThan(0);
    expect(new Set(areas).size).toBe(areas.length);
    expect(areas.every(area => area.trim().length > 0)).toBe(true);
  });
});
