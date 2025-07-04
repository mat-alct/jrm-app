import { useMemo, useState } from 'react';

/**
 * Hook customizado para gerenciar um estado booleano.
 * @param {boolean} [initialValue=false] - O valor inicial do estado.
 * @returns {[boolean, { on: () => void; off: () => void; toggle: () => void; }]}
 * Uma tupla contendo o valor booleano atual e um objeto com ações para modificá-lo.
 */
export const useBoolean = (initialValue = false) => {
  // 1. Usa o useState para armazenar o valor booleano.
  const [value, setValue] = useState(initialValue);

  // 2. Cria as ações para modificar o estado.
  //    useMemo garante que as funções não sejam recriadas a cada renderização.
  const actions = useMemo(
    () => ({
      on: () => setValue(true),
      off: () => setValue(false),
      toggle: () => setValue((prev) => !prev),
    }),
    [],
  );

  // 3. Retorna o valor e as ações em um array, similar ao useState.
  return [value, actions] as const;
};