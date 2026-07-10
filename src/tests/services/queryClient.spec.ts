import { queryClient } from '@/services/queryClient';

describe('services/queryClient', () => {
  const queries = queryClient.getDefaultOptions().queries!;

  it('mantem os dados frescos por 2 minutos e em cache por 10', () => {
    expect(queries.staleTime).toBe(1000 * 60 * 2);
    expect(queries.gcTime).toBe(1000 * 60 * 10);
  });

  it('nao refaz busca ao focar a janela e tenta novamente uma unica vez', () => {
    expect(queries.refetchOnWindowFocus).toBe(false);
    expect(queries.retry).toBe(1);
  });

  // Regressao de decisao: desabilitar refetchOnMount globalmente quebra a
  // invalidacao disparada por mutacoes (listas nao atualizam apos criar/editar).
  it('NAO desabilita refetchOnMount globalmente', () => {
    expect(queries.refetchOnMount).not.toBe(false);
  });
});
