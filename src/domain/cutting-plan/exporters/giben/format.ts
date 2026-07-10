import { GibenExportError } from './types';

export const CRLF = '\r\n';

export const toAscii = (value: string): string =>
  value
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '');

export const assertAscii = (value: string, context = 'Texto'): void => {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || code > 126) {
      throw new GibenExportError(
        `${context}: caractere não ASCII ${JSON.stringify(character)}.`,
      );
    }
  }
};

export const assertLength = (
  value: string,
  expected: number,
  context: string,
): void => {
  if (value.length !== expected) {
    throw new GibenExportError(
      `${context}: esperado ${expected}, recebido ${value.length}.`,
    );
  }
};

export const toTenths = (mm: number): number => {
  if (!Number.isFinite(mm) || mm < 0) {
    throw new GibenExportError(`Medida inválida: ${String(mm)}.`);
  }
  return Math.round((mm + Number.EPSILON) * 10);
};

export const zeroPadInteger = (value: number, width: number): string => {
  if (!Number.isInteger(value) || value < 0) {
    throw new GibenExportError(`Inteiro inválido: ${String(value)}.`);
  }
  const result = String(value);
  if (result.length > width) {
    throw new GibenExportError(`${value} não cabe em ${width} caracteres.`);
  }
  return result.padStart(width, '0');
};

export const fixedTenths = (mm: number, width: number): string =>
  zeroPadInteger(toTenths(mm), width);

export const fixedText = (
  value: string,
  width: number,
  align: 'left' | 'right' = 'left',
): string => {
  const ascii = toAscii(value).slice(0, width);
  return align === 'right'
    ? ascii.padStart(width, ' ')
    : ascii.padEnd(width, ' ');
};

export class FixedWidthLine {
  private readonly chars: string[];

  constructor(public readonly length: number) {
    this.chars = Array.from({ length }, () => ' ');
  }

  put(
    startOneBased: number,
    width: number,
    value: string,
    align: 'left' | 'right' = 'left',
    pad = ' ',
  ): this {
    if (
      !Number.isInteger(startOneBased) ||
      startOneBased < 1 ||
      !Number.isInteger(width) ||
      width < 1 ||
      startOneBased + width - 1 > this.length ||
      pad.length !== 1
    ) {
      throw new GibenExportError('Campo de largura fixa fora dos limites.');
    }
    const normalized = toAscii(value).slice(0, width);
    const formatted =
      align === 'right'
        ? normalized.padStart(width, pad)
        : normalized.padEnd(width, pad);
    for (let index = 0; index < width; index += 1) {
      this.chars[startOneBased - 1 + index] = formatted[index];
    }
    return this;
  }

  toString(): string {
    const result = this.chars.join('');
    assertAscii(result, 'Linha de largura fixa');
    return result;
  }
}

export const formatAdDate = (date: Date): string => {
  if (Number.isNaN(date.getTime())) {
    throw new GibenExportError('Data de geração inválida.');
  }
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${date.getFullYear()}${months[date.getMonth()]}${String(
    date.getDate(),
  ).padStart(2, '0')}`;
};

export const formatLabelMm = (mm: number): string => {
  const result = (toTenths(mm) / 10).toFixed(1);
  if (result.length > 6) {
    throw new GibenExportError(`Medida de etiqueta fora do limite: ${mm}.`);
  }
  return result.padStart(6, '0');
};

export const formatLabelDimensionSignature = (
  widthMm: number,
  heightMm: number,
): string => `${formatLabelMm(widthMm)}${formatLabelMm(heightMm)}`;

export const linesToAsciiFile = (lines: string[], context: string): string => {
  lines.forEach((line, index) =>
    assertAscii(line, `${context} linha ${index + 1}`),
  );
  return `${lines.join(CRLF)}${CRLF}`;
};

export const assertCrLfFile = (value: string, context: string): void => {
  if (!value.endsWith(CRLF) || value.replaceAll(CRLF, '').includes('\n')) {
    throw new GibenExportError(
      `${context}: quebra de linha diferente de CRLF.`,
    );
  }
  value
    .split(CRLF)
    .slice(0, -1)
    .forEach((line, index) => {
      assertAscii(line, `${context} linha ${index + 1}`);
    });
};
