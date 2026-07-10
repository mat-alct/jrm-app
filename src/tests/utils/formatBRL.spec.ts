import { formatBRL } from '@/utils/formatBRL';

describe('formatBRL', () => {
  it('preserves cents and formats thousands in Brazilian notation', () => {
    expect(formatBRL(1234.5)).toBe('R$ 1.234,50');
  });
});
