import { theme } from '../../styles/theme';

describe('tema da aplicação', () => {
  it('mantém a paleta laranja original usada nas telas legadas', () => {
    expect(theme.token('colors.orange.50')).toBe('#FFFAF0');
    expect(theme.token('colors.orange.500')).toBe('#DD6B20');
    expect(theme.token('colors.orange.900')).toBe('#652B19');
  });
});
