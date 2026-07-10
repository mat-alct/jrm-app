import { act, renderHook } from '@testing-library/react';

import { useBoolean } from '@/hooks/useBoolean';

describe('useBoolean', () => {
  it('comeca em false por padrao', () => {
    const { result } = renderHook(() => useBoolean());
    expect(result.current[0]).toBe(false);
  });

  it('respeita o valor inicial informado', () => {
    const { result } = renderHook(() => useBoolean(true));
    expect(result.current[0]).toBe(true);
  });

  it('on/off sao idempotentes e toggle alterna', () => {
    const { result } = renderHook(() => useBoolean());

    act(() => result.current[1].on());
    act(() => result.current[1].on());
    expect(result.current[0]).toBe(true);

    act(() => result.current[1].toggle());
    expect(result.current[0]).toBe(false);

    act(() => result.current[1].toggle());
    expect(result.current[0]).toBe(true);

    act(() => result.current[1].off());
    act(() => result.current[1].off());
    expect(result.current[0]).toBe(false);
  });

  it('mantem a identidade das acoes entre renderizacoes', () => {
    const { result, rerender } = renderHook(() => useBoolean());
    const firstActions = result.current[1];

    act(() => result.current[1].toggle());
    rerender();

    expect(result.current[1]).toBe(firstActions);
  });
});
