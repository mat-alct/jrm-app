import { formatPhoneBR, toE164BR } from '@/utils/phone';

describe('toE164BR', () => {
  it('converts a masked local number to E.164', () => {
    expect(toE164BR('(11) 99999-9999')).toBe('+5511999999999');
  });

  it('converts a raw 11-digit number to E.164', () => {
    expect(toE164BR('11999999999')).toBe('+5511999999999');
  });

  it('converts a 10-digit landline number to E.164', () => {
    expect(toE164BR('1133334444')).toBe('+551133334444');
  });

  it('keeps an already E.164 number as is', () => {
    expect(toE164BR('+5511999999999')).toBe('+5511999999999');
  });

  it('returns null for empty input', () => {
    expect(toE164BR('')).toBeNull();
  });

  it('returns null for an invalid number of digits', () => {
    expect(toE164BR('999')).toBeNull();
  });
});

describe('formatPhoneBR', () => {
  it('formats an 11-digit number', () => {
    expect(formatPhoneBR('11999999999')).toBe('(11) 99999-9999');
  });

  it('formats a 10-digit landline number', () => {
    expect(formatPhoneBR('1133334444')).toBe('(11) 3333-4444');
  });

  it('strips the country code before formatting', () => {
    expect(formatPhoneBR('+5511999999999')).toBe('(11) 99999-9999');
  });

  it('returns an empty string for empty input', () => {
    expect(formatPhoneBR(undefined)).toBe('');
  });
});
