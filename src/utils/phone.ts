const onlyDigits = (raw: string): string => raw.replace(/\D/g, '');

export const toE164BR = (raw: string): string | null => {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    const digits = onlyDigits(trimmed);
    return digits.length >= 12 && digits.length <= 13 ? `+${digits}` : null;
  }

  const digits = onlyDigits(trimmed);
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  if (digits.length === 12 || digits.length === 13) {
    return `+${digits}`;
  }

  return null;
};

export const formatPhoneBR = (raw?: string): string => {
  if (!raw) return '';

  let digits = onlyDigits(raw);
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return raw;
};
