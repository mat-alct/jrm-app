# Plano de Performance — JRM App

> Branch: `updatePerformance` · Início: 2026-04-25
>
> Foco: melhorar performance. Lógica está correta — não alterar comportamento.
> Cada passo é auto-contido. Pode executar em sessões separadas.

---

## Diagnóstico — gargalos identificados

1. **React Query sem `staleTime`** → toda navegação refaz queries no Firestore.
2. **Bundle inicial enorme**: `Tags.tsx` (25 KB), `OrderResume.tsx` (16 KB), `EstimateResume.tsx` (8 KB) e libs pesadas (`react-to-print`, `react-datepicker`, `react-select`, `framer-motion`, `react-qr-code`) importadas estaticamente.
3. **`listadecortes.tsx` (1181 linhas)** renderiza tabela desktop **e** cards mobile no mesmo render (com `display="none"`).
4. **`Cutlist.tsx`**: `getAllMaterials()` baixa toda a coleção sem `staleTime` longo.
5. **Dead code**: `src/utils/dataFromOldApi/customers.ts` (1973 linhas), `seedDatabase.ts`, `hooks/oldSidebar.tsx`, `customer.tsx` (provider comentado, API antiga do RQ v4).
6. **`next.config.js` quase vazio** — sem `optimizePackageImports`, sem `compiler.removeConsole`.
7. **`console.log`** em produção (`order.tsx`, `material.tsx`).
8. **`tsconfig.tsbuildinfo`** untracked — falta no `.gitignore`.
9. **Sem SSR/SSG** — toda página renderiza vazia, hidrata, e só então busca dados.

---

## Ordem recomendada de execução

| # | Fase | Por que essa ordem |
|---|------|--------------------|
| 0 | Baseline | Sem isso, não há como medir |
| 1 | React Query `staleTime` | Ganho imediato, mudança trivial |
| 8 | Cache offline Firestore | Mata "crashes" em rede ruim |
| 2 | Limpeza de código morto | Rápido, prepara o terreno |
| 3 | Lazy-load componentes pesados | Reduz muito o bundle inicial |
| 4 | `next.config.js` otimizado | Ganho mensurável no analyzer |
| 5 | Refatorar `listadecortes` | Demorado, ganho médio |
| 6 | `Cutlist` |  |
| 7 | Sidebar lazy mobile |  |
| 9 | Auditoria final |  |

---

## Fase 0 — Preparação e medição

### [x] Passo 0.1 — Estabelecer baseline mensurável

**Objetivo:** ter números antes/depois.

1. Instalar dependências:
   ```
   npm install --save-dev @next/bundle-analyzer cross-env
   ```
2. Substituir `next.config.js`:
   ```js
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   });

   module.exports = withBundleAnalyzer({
     reactStrictMode: true,
   });
   ```
3. Adicionar script no `package.json`:
   ```json
   "analyze": "cross-env ANALYZE=true next build"
   ```
4. Adicionar `tsconfig.tsbuildinfo` ao `.gitignore`.
5. Rodar `npm run analyze` e anotar:
   - Tamanho total do First Load JS
   - Top 5 maiores chunks
   - Tamanho da rota `/cortes/listadecortes`

**Critério:** baseline registrada. Sem mudança visível.

---

## Fase 1 — React Query

### [x] Passo 1.1 — Configurar `staleTime` e `gcTime`

**Onde:** `src/services/queryClient.ts`

```ts
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export { queryClient };
```

> **Atenção:** NÃO adicionar `refetchOnMount: false`. Isso impede que queries
> invalidadas refaçam fetch ao remontar (ex: criar pedido em outra tela e
> voltar pra lista — dados ficam velhos até F5). O `staleTime: 2 min` sozinho
> já garante que navegar e voltar dentro desse intervalo não refaz query.

**Validar:** abrir `/cortes/listadecortes`, navegar, voltar — não deve mostrar spinner. Criar/editar pedido em outra tela e voltar — lista deve atualizar.

---

## Fase 2 — Limpar código morto

### [x] Passo 2.1 — Remover arquivos não usados

1. Confirmar não-uso:
   ```
   grep -rln "dataFromOldApi\|seedDatabase\|oldSidebar" src
   ```
2. Deletar:
   - `src/utils/dataFromOldApi/`
   - `src/utils/seedDatabase.ts`
   - `src/hooks/oldSidebar.tsx`
   - `src/hooks/customer.tsx`
3. Atualizar `src/hooks/index.tsx` removendo `CustomerProvider` e os comentários:
   ```tsx
   import { MaterialProvider } from './material';
   import { OrderProvider } from './order';
   import { SidebarDrawerProvider } from './sidebar';

   type AuthProviderProps = { children: React.ReactNode };

   export const Providers = ({ children }: AuthProviderProps) => (
     <SidebarDrawerProvider>
       <OrderProvider>
         <MaterialProvider>{children}</MaterialProvider>
       </OrderProvider>
     </SidebarDrawerProvider>
   );
   ```
4. `npm run build` para validar.

### [x] Passo 2.2 — Remover `console.log`

- `src/hooks/order.tsx` — remover `console.log('🔎 Buscando código exato...')` e `console.log('🔎 Buscando nome...')`.
- `src/hooks/material.tsx` — remover `console.log(materialData)` no `createMaterial`.
- Manter `console.error`.

(Opcional: pode pular se for fazer Passo 4.1 com `compiler.removeConsole`.)

### [x] Passo 2.3 — `.gitignore` _(já feito na Fase 0)_

Adicionar:
```
*.tsbuildinfo
```

---

## Fase 3 — Otimização de bundle

### [x] Passo 3.1 — Lazy-load dos componentes de impressão

**Onde:** `src/pages/cortes/listadecortes.tsx` (linhas 52-55).

Trocar imports estáticos por:
```tsx
import dynamic from 'next/dynamic';

const Tags = dynamic(
  () => import('../../components/Printables/Tags').then(m => m.Tags),
  { ssr: false }
);
const OrderResume = dynamic(
  () => import('../../components/Printables/OrderResume').then(m => m.OrderResume),
  { ssr: false }
);
const EstimateResume = dynamic(
  () => import('../../components/Printables/EstimateResume').then(m => m.EstimateResume),
  { ssr: false }
);
```

**Validar:** `npm run analyze` — deve aparecer chunks separados.

### [x] Passo 3.2 — Lazy-load do `react-datepicker`

**Onde:** `src/components/Form/DatePicker.tsx`.

```tsx
import dynamic from 'next/dynamic';
const DatePicker = dynamic(() => import('react-datepicker'), { ssr: false });
```

Remover o `import DatePicker, { registerLocale } from 'react-datepicker'` original.
Tipos com `import type { ... } from 'react-datepicker'` se necessário.

---

## Fase 4 — `next.config.js` otimizado

### [x] Passo 4.1 — Configuração de produção

```js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const config = {
  reactStrictMode: true,
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] },
  },
  experimental: {
    optimizePackageImports: [
      '@chakra-ui/react',
      '@chakra-ui/icons',
      'react-icons',
      'date-fns',
      'firebase',
    ],
  },
};

module.exports = withBundleAnalyzer(config);
```

**Validar:** `npm run analyze` e comparar com baseline.

---

## Fase 5 — Refatorar `listadecortes.tsx`

### [x] Passo 5.1 — Extrair Dialogs

Criar:
- `src/components/cortes/HistoryDialog.tsx` — props: `order`, `onClose`, `onSelectVersion`.
- `src/components/cortes/ConfirmStatusDialog.tsx` — props: `order`, `onCancel`, `onConfirm`, `loading`.

> **Nota:** o plano original sugeria `src/pages/cortes/_components/`, mas o
> Pages Router do Next 15 não respeita a convenção de underscore para
> pastas (diferente do App Router) — gerava rotas `/cortes/_components/...`.
> Movido para `src/components/cortes/`.

Importar via `dynamic({ ssr: false })` e renderizar condicionalmente
(`{state && <Dialog ... />}`) para que o chunk só baixe na primeira abertura.

### [x] Passo 5.2 — Renderizar só uma lista (mobile OU desktop)

Criar:
- `OrderListMobile.tsx` (cards)
- `OrderListDesktop.tsx` (tabela)

Substituir `display="none"` por:
```tsx
const isMobile = useBreakpointValue({ base: true, md: false }, { fallback: true });
{isMobile ? <OrderListMobile ... /> : <OrderListDesktop ... />}
```

### [ ] Passo 5.3 — Memoizar `<OrderRow>` / `<OrderCard>`

`React.memo` + `useCallback` nos handlers do pai.

---

## Fase 6 — `Cutlist.tsx`

### [ ] Passo 6.1 — `staleTime` longo na query de materiais

**Onde:** linhas 109-115.

```tsx
const { data: materialData, isLoading } = useQuery({
  queryKey: ['materials', 'all'],
  queryFn: async () => (await getAllMaterials()) || [],
  staleTime: 1000 * 60 * 30,
  gcTime: 1000 * 60 * 60,
});
```

### [ ] Passo 6.2 — Memoizar `<CutlistRow>`

Extrair `<Table.Row>` (linhas 588-676) para componente próprio com `React.memo`.

---

## Fase 7 — Sidebar

### [ ] Passo 7.1 — Lazy-load Drawer só em mobile

**Onde:** `src/components/Dashboard/Sidebar/index.tsx`.

1. Mover bloco do `Drawer.Root` para `MobileSidebar.tsx`.
2. Importar via `dynamic({ ssr: false })`.
3. Renderizar `<MobileSidebar />` só quando `isDrawerSidebar`.

---

## Fase 8 — Cache offline Firestore

### [x] Passo 8.1 — `persistentLocalCache`

**Onde:** `src/services/firebase.ts`.

```ts
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
```

**Validar:** offline (DevTools > Network > Offline) → **navegar pelo menu** entre rotas já carregadas continua mostrando dados (do cache). NÃO testar com F5 — sem PWA/Service Worker, F5 offline sempre falha (`ERR_INTERNET_DISCONNECTED` é do navegador, não do Firestore).

---

## Fase 9 — Auditoria final

### [ ] Passo 9.1 — React Profiler + analyzer final

1. Profilar `/`, `/cortes/listadecortes`, `/cortes/novoservico`.
2. `React.memo`/`useMemo`/`useCallback` cirurgicamente.
3. `npm run analyze` final → comparar com baseline.

---

## Baseline (Passo 0.1)

- **First Load JS compartilhado:** 383 kB (gzip)
- **Top 5 chunks** (raw, antes de gzip):
  1. `pages/_app` — 999 kB
  2. `framework` — 183 kB
  3. `main` — 119 kB
  4. `polyfills` — 113 kB
  5. `2bd5674f` (vendor) — 98 kB
- **First Load JS por rota** (gzip):
  - `/` — 413 kB (page 7.81 kB)
  - `/login` — 411 kB
  - `/administracao/vendedores` — 429 kB
  - `/cortes/materiais` — 431 kB
  - `/cortes/listadecortes` — **450 kB** (page 18.3 kB)
  - `/cortes/editar/[id]` — 456 kB
  - `/cortes/novoservico` — **504 kB** (page 43.7 kB) ← rota mais pesada
- **Build:** Next.js 15.3.4, compilado em 22.0s
- **Relatório do analyzer:** `.next/analyze/client.html`
- **Data da medição:** 2026-04-25

## Resultado final (preencher no Passo 9.1)

- First Load JS: _________
- Redução: _________ %
- Data da medição: _________
