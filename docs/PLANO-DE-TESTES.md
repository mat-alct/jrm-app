# Plano de Testes Completo — JRM App

> **Data:** 2026-07-09 · **Branch de referência:** `feat/gestao-projetos`
> **Status: CONCLUÍDO.** Fases 0 a 8 executadas; `npm run test:all` verde do zero.
> Números finais: 1116 testes unitários/componente, 24 de rules, 67 de integração,
> 63 e2e reais. O dual-path `E2E_MOCKS_ENABLED` foi removido do código de produção.
> **Objetivo:** tornar a aplicação inteiramente testável (Jest + Playwright), eliminando a
> necessidade de testes manuais e o problema de "testes em volta" — testes que passam
> enquanto a funcionalidade real está quebrada (caso do upload para o Firebase Storage).

---

## 0. Como usar este documento (instruções para o executor)

Este plano foi escrito para ser executado fase a fase por um agente (Sonnet) em sessões
separadas. Regras de execução:

1. **Uma fase por vez, na ordem.** Cada fase termina com a suíte inteira verde
   (`npm run test:all`) e com os critérios de aceite da fase cumpridos.
2. **Marque os checkboxes deste documento** conforme concluir cada item, e commite o
   documento junto com o código da fase.
3. **Toda fase tem uma "prova de fogo"**: um sabotagem deliberada no código de produção
   que DEVE fazer os novos testes falharem. Execute a prova, confirme o vermelho,
   desfaça a sabotagem, confirme o verde. Se a sabotagem não derrubar nenhum teste,
   o teste é "em volta" e precisa ser reescrito. Nunca pule a prova de fogo.
4. **Nunca enfraqueça uma asserção para fazer um teste passar.** Se um teste novo revela
   um bug real, corrija o bug (em commit separado) — esse é o propósito do plano.
5. **Não invente `data-testid`** quando houver role/label acessível. Se precisar criar um,
   registre o motivo no PR.
6. Em caso de decisão ambígua, siga a seção 2 (Princípios). Ela tem precedência sobre
   qualquer atalho.

---

## 1. Diagnóstico — por que o bug do Storage passou despercebido

### 1.1 Arquitetura atual de testes

| Camada | Estado hoje | Problema |
|---|---|---|
| Jest unitário (56 specs) | Cobre funções puras (status machine, permissões, formatadores, schemas yup) e componentes com services mockados | Os services que falam com Firestore/Storage **nunca executam o caminho real** — só os helpers puros são testados (ex.: `attachment.service.spec.ts` testa `sanitizeFileName`, mas não `uploadAttachment`) |
| Jest de API routes | Testa handlers com `firebase-admin` mockado | Valida a lógica do handler, mas não o contrato com o Firebase real (sessão, tokens, writes) |
| Playwright (2 specs) | Roda com `NEXT_PUBLIC_E2E_USE_MOCKS=1` | **Todo** acesso a Auth/Firestore/Storage é desviado para `e2eMockStore.ts` (in-memory). A UI é real, mas o backend é falso |
| Regras (`firestore.rules`, `storage.rules`) | **Zero testes** (pendência já registrada em `docs/gestao-projetos/SEGURANCA.md`) | Uma regra errada bloqueia upload/leitura em produção sem nenhum teste ficar vermelho |
| Área legada (cortes/pedidos) | **Zero testes** de qualquer tipo | `calculatePrice`, `order.tsx` (406 linhas), `listadecortes` (574 linhas) etc. sem nenhuma rede de proteção |

### 1.2 Causa raiz do "teste em volta"

O código de produção tem **dois caminhos** (`if (E2E_MOCKS_ENABLED) { ... }` em 13
arquivos: 12 services + `hooks/authContext.tsx`). Os testes exercitam o caminho mock; produção usa o caminho real.
Qualquer bug que viva exclusivamente no caminho real é invisível para a suíte inteira:

- `uploadBytes`/`getDownloadURL` contra o bucket real (o bug do Storage);
- regras de segurança negando uma operação legítima;
- índice composto faltando no Firestore (query quebra só em produção);
- criação/verificação de cookie de sessão (`createSessionCookie`);
- config de ambiente errada (bucket, projectId).

### 1.3 Estratégia da solução

Substituir o "backend falso" pelo **Firebase Emulator Suite** (Auth + Firestore + Storage)
em duas frentes:

1. **Testes de integração Jest** rodando os services reais contra o emulador;
2. **Playwright** rodando o app real (login real, Firestore real, Storage real, API routes
   com `firebase-admin` apontado para o emulador).

Ao final, o dual-path `E2E_MOCKS_ENABLED` é **removido** do código de produção (Fase 7).
O emulador executa o mesmo SDK e as mesmas regras de produção — um bug como o do Storage
teria sido pego em três camadas diferentes (integração, rules, e2e).

---

## 2. Princípios anti-"teste em volta" (obrigatórios)

1. **Mocke apenas fronteiras que você não controla.** Firebase NÃO é uma dessas fronteiras:
   existe emulador oficial — use-o. Mock de módulo interno (`jest.mock('@/services/...')`)
   é permitido **apenas** em testes de componente/página (camada de UI), nunca em testes
   de service ou API route.
2. **Todo teste deve poder ficar vermelho.** Prova de fogo obrigatória por fase (seção 0,
   regra 3). Testes que só asseguram o que o próprio mock devolve são proibidos.
3. **Asserte efeitos observáveis, não implementação.** Em e2e, após toda ação de escrita,
   faça **verificação dupla**: (a) a UI reflete o resultado; (b) leitura direta no emulador
   (via `firebase-admin` no lado Node do Playwright) confirma que o dado foi persistido no
   lugar certo (documento no path certo, arquivo no Storage com bytes > 0).
4. **Proibido interceptar (`page.route`) APIs do próprio app em cenários felizes.**
   Interceptação só para simular falha de infraestrutura (offline, 500) em testes de
   caminho de erro.
5. **Todo bug encontrado manualmente vira teste de regressão ANTES do fix.** Escreva o
   teste que falha, depois corrija.
6. **Sem esperas arbitrárias.** Em Playwright, só asserções web-first (`expect(...).toBeVisible()`
   etc.); `waitForTimeout` é proibido.
7. **Erro de console é falha.** Fixture global do Playwright falha o teste em `pageerror`
   ou `console.error` não permitido (allowlist explícita e curta).
8. **Cobertura é piso, não meta.** Thresholds sobem por fase (seção 12) e nunca descem.

---

## 3. Arquitetura-alvo de testes

```
        ┌────────────────────────────────────────────────────────┐
  E2E   │ Playwright + app real + Emulator Suite (Auth/FS/Storage)│  jornadas por papel
        ├────────────────────────────────────────────────────────┤
 Rules  │ @firebase/rules-unit-testing (firestore.rules +         │  matriz permitir/NEGAR
        │ storage.rules, cross-service)                            │
        ├────────────────────────────────────────────────────────┤
 Integr.│ Jest (node) + SDK real + Emulator: services, API routes, │  round-trips reais
        │ hooks de dados (via services extraídos)                  │
        ├────────────────────────────────────────────────────────┤
 Comp.  │ Jest (jsdom) + RTL: componentes com services mockados    │  UI e interação
        ├────────────────────────────────────────────────────────┤
 Unit   │ Jest: lógica pura (status machine, preços, permissões,   │  rápido, exaustivo
        │ schemas, formatadores)                                   │
        └────────────────────────────────────────────────────────┘
```

Convenções de localização:

| Camada | Onde | Config Jest | Ambiente |
|---|---|---|---|
| Unit + Component | `src/tests/**` (estrutura atual) | `jest.config.js` (jsdom) | sem emulador |
| Integração (services, API routes) | `src/tests/integration/**` | `jest.integration.config.js` (node) | exige emulador |
| Rules | `src/tests/rules/**` | `jest.rules.config.js` (node) | exige emulador |
| E2E | `e2e/**` | `playwright.config.ts` | exige emulador |

Scripts npm alvo (criados na Fase 0):

```jsonc
{
  "typecheck": "tsc --noEmit",
  "test": "jest",                                   // unit + component (rápido, sem emulador)
  "test:integration": "firebase emulators:exec --only auth,firestore,storage --project demo-jrm \"jest -c jest.integration.config.js --runInBand\"",
  "test:rules": "firebase emulators:exec --only auth,firestore,storage --project demo-jrm \"jest -c jest.rules.config.js --runInBand\"",
  "test:e2e": "playwright test",                    // sobe emulador + app via config
  "test:all": "npm run typecheck && npm test -- --runInBand && npm run test:rules && npm run test:integration && npm run test:e2e",
  "emulators": "firebase emulators:start --project demo-jrm"   // uso interativo/dev
}
```

> **projectId de teste:** use sempre `demo-jrm`. O prefixo `demo-` é reconhecido pelo
> emulador como projeto fictício e **impossibilita** qualquer chamada acidental a
> serviços reais de produção.

---

## 4. FASE 0 — Infraestrutura de testes (pré-requisito de tudo)

**Objetivo:** emulador funcionando nas 3 frentes (Jest integração, rules, Playwright),
factories de dados, scripts e CI. Nenhum teste novo de feature ainda.

### 4.1 Emulator Suite

- [x] Adicionar devDependencies: `firebase-tools`, `@firebase/rules-unit-testing`.
  (Emulador exige Java 11+ no ambiente; documentar no README.)
- [x] Adicionar bloco `emulators` ao `firebase.json`:

```jsonc
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```

### 4.2 Conectar o SDK cliente ao emulador (mudança em código de produção)

- [x] Em `src/services/firebase.ts`, quando `NEXT_PUBLIC_USE_FIREBASE_EMULATORS === '1'`,
  chamar `connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })`,
  `connectFirestoreEmulator(db, '127.0.0.1', 8080)` e
  `connectStorageEmulator(storage, '127.0.0.1', 9199)`.
  - Proteger contra reconexão em HMR/dev com flag em `globalThis` (o connect só pode
    acontecer uma vez, antes de qualquer operação).
  - Em modo emulador, **desativar** `persistentLocalCache` (usar `getFirestore` padrão)
    para eliminar estado residual de IndexedDB entre execuções.
- [x] Em `src/services/firebaseAdmin.ts`, quando `USE_FIREBASE_EMULATORS === '1'`,
  inicializar **sem** `cert()` (apenas `projectId` + `storageBucket`) — o admin SDK
  detecta os emuladores pelas env vars `FIRESTORE_EMULATOR_HOST`,
  `FIREBASE_AUTH_EMULATOR_HOST` e `FIREBASE_STORAGE_EMULATOR_HOST`.
- [x] Ajustar `src/instrumentation.ts` para pular `assertServerEnv()` também quando
  `USE_FIREBASE_EMULATORS === '1'` (as credenciais de produção não existem nesse modo).

Env padrão de teste (usar em Jest integração, rules e Playwright):

```
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=1
USE_FIREBASE_EMULATORS=1
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-jrm
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-jrm.appspot.com
NEXT_PUBLIC_FIREBASE_API_KEY=fake-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-jrm.firebaseapp.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=0
NEXT_PUBLIC_FIREBASE_APP_ID=demo
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
```

### 4.3 Helpers de teste compartilhados

Criar `src/tests/helpers/` com:

- [x] `emulator.ts` — funções de reset:
  - Firestore: `DELETE http://127.0.0.1:8080/emulator/v1/projects/demo-jrm/databases/(default)/documents`
  - Auth: `DELETE http://127.0.0.1:9099/emulator/v1/projects/demo-jrm/accounts`
    (header `Authorization: Bearer owner`)
  - Storage: `adminStorage.bucket().deleteFiles({ force: true })`
- [x] `factories.ts` — builders tipados para `Project`, `ProjectItem`, `AppUser`,
  `Attachment`, `AssemblerAssignment`, `AssemblerPayment`, `Order`, `Estimate`,
  `Material` (defaults válidos + overrides). Reutilizados por unit, integração e e2e.
- [x] `seedEmulator.ts` — semeia o cenário canônico (adaptado de
  `scripts/seed-projetos.mjs` + `CONTAS-SEED-TESTE.md`): 5 usuários (admin, vendedor,
  desenhista, montador, marceneiro — senha `Seed@12345`), 2 projetos com itens em
  estágios variados do fluxo, `settings/deadlineDefaults`, materiais e 1 pedido de
  corte legado. Deve funcionar tanto no Jest quanto importado pelo Playwright (Node).

### 4.4 Configs Jest adicionais

- [x] `jest.integration.config.js`: `testEnvironment: 'node'`, `testMatch`
  `src/tests/integration/**/*.spec.ts`, mesmo `moduleNameMapper`. `--runInBand`
  (estado compartilhado do emulador).
- [x] `jest.rules.config.js`: idem para `src/tests/rules/**/*.spec.ts`.
- [x] No `jest.config.js` atual, excluir `src/tests/integration` e `src/tests/rules`
  do `testMatch`, e corrigir `collectCoverageFrom` para incluir `src/**/*.{ts,tsx}`
  (hoje só `.tsx` — services e utils `.ts` ficam fora do relatório).

### 4.5 Playwright reconfigurado

- [x] Reescrever `playwright.config.ts` com **dois projetos** durante a transição:
  - `mock` (temporário): config atual, porta 3100, `NEXT_PUBLIC_E2E_USE_MOCKS=1` —
    roda os specs atuais até a Fase 6 substituí-los.
  - `emulator` (novo padrão): porta 3101, env da seção 4.2, `workers: 1`
    (estado compartilhado), specs em `e2e/real/**`.
  - `webServer` como array (um servidor por porta). O projeto `emulator` depende do
    emulador em pé: envolver via `firebase emulators:exec` no script `test:e2e`, ou
    subir/derrubar no `globalSetup`. Preferir `emulators:exec` (mais simples e mata
    processos órfãos).
- [x] `e2e/real/fixtures.ts`:
  - fixture `resetAndSeed`: antes de cada teste, reset (4.3) + `seedEmulator()`;
  - fixture de guarda de console: falha em `pageerror`/`console.error` (allowlist);
  - helper `adminDb`/`adminStorage` (firebase-admin no processo do teste) para as
    verificações duplas.
- [x] **Autenticação real por papel**: projeto `setup` que loga via UI (`/login`) com
  cada conta seed e salva `storageState` **com IndexedDB**
  (`context.storageState({ path, indexedDB: true })` — necessário porque o Firebase
  Auth persiste sessão em IndexedDB, não em cookies). Gera
  `e2e/.auth/{admin,seller,designer,assembler,woodworker}.json`; os demais testes
  declaram `test.use({ storageState: ... })`.
  - Atenção: o seed de usuários deve rodar antes do projeto `setup` (no `globalSetup`).

### 4.6 CI (GitHub Actions)

- [x] Criar `.github/workflows/ci.yml`:
  - jobs: `lint` (`npm run lint`), `typecheck`, `unit` (`npm test`),
    `rules+integration` (setup-java + `npm run test:rules` + `npm run test:integration`),
    `e2e` (`npx playwright install --with-deps chromium` + `npm run test:e2e`,
    upload de `playwright-report` como artifact em falha).
  - cache: `~/.cache/firebase/emulators` e npm.
  - Gatilhos: `pull_request` e `push` na `main`.

### 4.7 Critérios de aceite da Fase 0

- [x] `npm run test:rules` e `npm run test:integration` executam (com 1 spec dummy cada)
  subindo e derrubando o emulador sozinhos.
- [x] `npm run test:e2e` roda o projeto `mock` (specs atuais verdes) e o projeto
  `emulator` com 1 teste fumaça: login real como admin → `/` renderiza sem erro de
  console → logout.
- [x] **Prova de fogo:** com `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` apontando para um
  bucket errado, o smoke de upload (escrever 1 arquivo via `uploadBytes` no teste de
  integração dummy) fica vermelho. Este é exatamente o formato do bug original.

---

## 5. FASE 1 — Testes das regras de segurança (`src/tests/rules/`)

**Objetivo:** matriz completa permitir/negar para `firestore.rules` e `storage.rules`
com `@firebase/rules-unit-testing`. Pendência já reconhecida em `SEGURANCA.md`.

Setup comum: `initializeTestEnvironment({ projectId: 'demo-jrm', firestore: { rules },
storage: { rules } })`. Como ambas as rules leem `/users/{uid}` via `get()`/cross-service,
semear os docs de usuário com `testEnv.withSecurityRulesDisabled()` antes de cada bloco.
Contextos: `testEnv.authenticatedContext(uid)` para cada papel + `unauthenticatedContext()`.

> As regras de Storage usam `firestore.get(...)` (cross-service) — o emulador suporta;
> Firestore e Storage precisam estar de pé juntos.

### 5.1 `firestore.rules` — um describe por bloco `match`

Para **cada linha da matriz**, testar o caso PERMITIDO e pelo menos dois NEGADOS
(papel errado e não autenticado). Usuário com `active == false` deve ser negado em tudo.

- [x] `users/{userId}`: read por qualquer autenticado; create/update/delete só admin.
- [x] `settings/{settingId}`: read autenticado; write só admin.
- [x] `projects/{projectId}`: read/create/update admin+seller; delete só admin;
  designer/assembler/woodworker negados até em read.
- [x] `projects/*/attachments`: read/create admin+seller; update/delete só admin.
- [x] `projects/*/items`: read/update admin+seller e designer **somente quando
  `designerId == uid`** (testar designer de outro item negado); create admin+seller;
  delete só admin.
- [x] `items/*/attachments`: montador atribuído lê **apenas** `visibility == 'assembler'`
  (testar visibility `internal`/`client` negada); montador cria apenas com
  `visibility == 'assembler'` + `uploadedBy == uid` + `uploadedByRole == 'assembler'`
  (testar cada campo violado individualmente); update/delete só admin.
- [x] `items/*/statusHistory`: create por qualquer autenticado; update/delete negados
  **para todos, inclusive admin** (imutabilidade do histórico).
- [x] `items/*/versions`: read/create designer só do próprio item; update/delete só admin.
- [x] `items/*/assemblerAssignments`: montador lê apenas doc cujo id == uid e
  `assemblerId == uid`; create/update/delete só admin.
- [x] `payments/{paymentId}`: montador lê só os próprios; update do montador **apenas**
  a transição `pago → confirmado_pelo_montador` com todos os demais campos imutáveis —
  testar cada invariante de `assemblerConfirmsOwnPaymentOnly` (mudar `amount`, `paidAt`,
  `assemblerId` etc. deve negar).
- [x] Não autenticado: negado em TODAS as coleções (loop sobre os paths).

### 5.2 `storage.rules`

- [x] `projects/{id}/general/*`: read admin/seller/designer; write admin/seller;
  delete só admin; montador e anônimo negados.
- [x] `projects/{id}/items/{itemId}/{category}/*`: read/write também para montador
  **atribuído** (semear `assemblerAssignments/{uid}` no Firestore); montador NÃO
  atribuído negado.
- [x] `projects/.../versions/{versionId}/*`: write admin+designer; seller negado em write.
- [x] `payments/{paymentId}/*`: read admin e montador dono (`payments/{id}.assemblerId`);
  write/delete só admin; montador de outro pagamento negado.
- [x] Anônimo negado em todos os paths.

### 5.3 Critérios de aceite

- [x] Toda combinação papel×operação dos arquivos de rules tem teste (permitir e negar).
- [x] **Prova de fogo:** inverta uma regra (ex.: `allow read: if false` no bloco de item
  attachments) → suíte vermelha; restaure → verde.

---

## 6. FASE 2 — Integração dos services com o emulador (`src/tests/integration/services/`)

**Objetivo:** todo service que toca Firestore/Storage executa o caminho REAL contra o
emulador. Os specs unitários existentes de partes puras permanecem onde estão.

Padrão dos testes: reset do emulador em `beforeEach`, semear com as factories,
executar o service real, **ler de volta com o SDK** e assertar o documento/arquivo.

### 6.1 Prioridade máxima — a classe do bug original

- [x] `attachment.service.uploadAttachment` (projeto e item): round-trip completo —
  arquivo existe no Storage no path exato de `paths.ts`, `downloadUrl` retornado é
  acessível (GET 200), doc criado na subcoleção certa com metadados corretos
  (`fileKind`, `clientVisible`, sanitização do nome).
- [x] `attachment.service.listAttachments` (projeto e item).
- [x] `attachmentAdmin`: exclusão real de metadados e objeto no emulador. O service
  atual não expõe signed URL/leitura via admin.

### 6.2 Services de projetos

- [x] `project.service`: create (campos normalizados, summary zerado), get, update,
  list com filtro `sellerId` e busca por nome de cliente.
- [x] `projectItem.service`: create/update/list; **recálculo do `itemSummary`** do
  projeto após cada mutação (total, aguardandoAprovacao, aprovados, emProducao,
  emMontagem, finalizados, atrasados).
- [x] `status.service`: transição válida grava item + `statusHistory` (from/to/ator/papel);
  transição inválida rejeita e NÃO grava nada (verificar ausência de histórico).
- [x] `budget.service`: salvar orçamento calcula `totalCost`, preserva `createdAt` em
  edição, atualiza item.
- [x] `deadline.service` + `deadlineAdmin`: leitura/escrita de `settings/deadlineDefaults`;
  cálculo de prazo em atribuição.
- [x] `designer.service`: fila do desenhista (query collection-group + filtro
  `designerId`) — ver caveat de índices na seção 14.
- [x] `assembler.service`: atribuição cria docs em `assemblerAssignments` (id == uid do
  montador), dispara transição de status quando aplicável; listagens por montador.
- [x] `payment.service`: liberação, pagamento e confirmação — estados e campos
  imutáveis; listagem por montador.
- [x] `dashboard.service`: agregações de atrasados/filtros com dados semeados
  determinísticos (datas fixas via factories).
- [x] `users.service` + `adminUsers`: `getAppUser`, listagem por papel, criação com
  telefone fora do E.164 (regressão do commit `d74abe3`).
- [x] `clientAccess.service`, `clientSession`, `clientPortal.server`,
  `internalAuth.server`: provisionamento gera hash + publicId persistidos; verificação
  de código correto/errado; sessão do cliente (cookie) criada e validada;
  `internalAuth` valida cookie de sessão de usuário interno via Auth emulator.
- [x] `statusAdmin.service`, `summary` (partes com I/O).
- [x] `sellers.getSellerByPassword`: senha correta/errada contra docs semeados.

### 6.3 Área legada — refatoração habilitadora (cortes/pedidos)

`hooks/order.tsx` e `hooks/material.tsx` misturam React Query com acesso direto ao
Firestore, o que impede testar o I/O sem montar a UI. Refatorar **sem mudar
comportamento**:

- [x] Extrair o acesso a dados para `src/services/orders.service.ts` e
  `src/services/materials.service.ts` (funções puras de I/O: `createEstimate`,
  `createOrder`, `getOrders` paginado, `getOrdersBySearch`, `updateOrderCutlist`,
  CRUD de materiais). Os hooks viram cascas finas (React Query + toasts) sobre os
  services.
- [x] Integração dos services novos contra o emulador:
  - geração sequencial de `orderCode`/`estimateCode`;
  - `stripUndefined` de fato impede `undefined` no Firestore (regressão);
  - paginação com `startAfter` + `getCountFromServer` (2 páginas, ordem estável);
  - busca com capitalização (`"pedro silva"` encontra `"Pedro Silva"`);
  - `updateOrderCutlist`: senha de vendedor inválida → `invalid-password` e NADA é
    gravado; senha válida → cutlist nova, `priceDifference` correto, histórico de
    edição com autor.
- [x] Testes de componente dos hooks (jsdom, services mockados): estados de
  loading/erro/toast e invalidação de queries (`queryKey` certo) — aqui mock é
  legítimo, pois o I/O real já está coberto acima.

### 6.4 Critérios de aceite

- [x] Nenhum arquivo em `src/services/**` com I/O sem teste de integração
  correspondente (mapa da seção 13 completo para services).
- [x] **Prova de fogo:** (a) troque o path de `itemAttachmentStoragePath` (ex.: remova o
  segmento `items/`) → testes de attachment vermelhos; (b) inverta uma condição em
  `canTransition` → testes de status vermelhos; (c) aponte o bucket para nome errado →
  round-trip de upload vermelho.

---

## 7. FASE 3 — API routes reais contra o emulador (`src/tests/integration/api/`)

**Objetivo:** cada handler em `src/pages/api/**` testado chamando o handler real com
`firebase-admin` apontado ao emulador (sem mock do admin). Usar `node-mocks-http` (ou
objetos req/res manuais) para invocar `handler(req, res)`.

Os specs unitários atuais (com admin mockado) podem ser mantidos para lógica de
validação de input, mas a fonte de verdade passa a ser a integração.

- [x] `POST /api/login`: criar usuário no Auth emulator, obter `idToken` real (REST
  `signInWithPassword` do emulador), chamar handler → cookie `session` httpOnly criado
  e **verificável** com `adminAuth.verifySessionCookie`; token inválido → 401; método
  GET → 405.
- [x] `POST /api/logout`: limpa o cookie.
- [x] `POST /api/admin/users`: cria usuário no Auth + doc em `users` com papéis;
  telefone fora do padrão (regressão `d74abe3`); chamada sem sessão de admin → 401/403.
- [x] `client-access/provision`: gera `publicId` + hash persistidos no projeto; código
  retornado funciona no `verify`.
- [x] `client-access/verify`: código correto → sessão de cliente; errado → 401;
  projeto inexistente → 404.
- [x] `client-access/project`: com sessão de cliente válida retorna somente dados
  visíveis ao cliente (itens, anexos `clientVisible` — validar que anexo `internal`
  NÃO aparece na resposta); sem sessão → 401.
- [x] `client-access/approve-item`, `reject-item`, `approve-all`, `request-change`
  (**hoje sem nenhum teste**): transições de status corretas gravadas no Firestore +
  histórico com `changedByRole: 'client'`; item em status não aprovável → erro e nada
  gravado; sessão inválida → 401.
- [x] `assembler/update-status`: montador atribuído avança status (montagem concluída);
  montador NÃO atribuído → 403; efeitos colaterais (pagamento aguardando liberação)
  verificados no Firestore.
- [x] `assembler/confirm-payment`: só o dono confirma; estado `pago` →
  `confirmado_pelo_montador`; qualquer outro estado → erro.

### Critérios de aceite

- [x] Todas as 12 rotas de `src/pages/api/**` com teste de integração (matriz método
  válido / auth ausente / input inválido / caminho feliz com verificação no emulador).
- [x] **Prova de fogo:** remova a checagem de sessão de uma rota de cliente → teste 401
  vermelho; troque o status de destino em `approve-item` → teste de transição vermelho.
  *Executada: sabotagem de `requireClientProject` derrubou o teste de 401 e a troca do
  status de destino derrubou 3 testes de transição; restaurado, verde.*

---

## 8. FASE 4 — Lacunas de testes unitários (lógica pura)

**Objetivo:** cobertura exaustiva da lógica de negócio pura, principalmente da área
legada que hoje tem zero testes.

- [x] `utils/cutlist/calculatePrice.ts` — **crítico, é o preço cobrado do cliente**:
  - fórmula base (área da peça × preço × 1+porc / área da chapa), porcentagem default
    75 vs. `pricePercent` custom (incluindo `0` — atenção: o código atual trata `0`
    como falsy e cai no default; decidir se é bug e testar o comportamento decidido);
  - custo de fita de borda (bordas A/B independentes);
  - furos de dobradiça (R$5/furo), cantos boleados (R$5/canto/peça);
  - rasgo de gaveta: R$5 por PAR (qtd 1→0, 2→5, 3→5, 4→10);
  - `Math.ceil` por peça antes de multiplicar por quantidade;
  - casos de borda: quantidade 0, medidas 0, material com preço 0.
- [x] `utils/cutlist/sortAndReturnTag.ts`: ordenação e formato das etiquetas.
- [x] `utils/capitalizeAndStripString.ts`, `utils/normalizeTelephone.ts`,
  `utils/removeUndefinedAndEmpty.ts` (objetos aninhados, arrays, Timestamp intacto),
  `utils/listOfAreas.ts` (sanidade).
- [x] `utils/projects/status.ts` — completar a **matriz integral** de transições:
  para cada par (from, to) válido e inválido, com e sem `isAdmin` (tabela exaustiva
  derivada do type `ProjectItemStatus`, não amostragem).
- [x] `utils/projects/permissions.ts` — completar matriz `canAccessPage` ×
  todas as rotas reais do app × 5 papéis + sem papel; `getDefaultRouteForRoles`
  (multi-papel: precedência); `isPublicRoute` (`/cliente/*`, `/login`);
  `canViewAttachment` × visibilidades × papéis.
- [x] `utils/projects/attachments.ts`: `inferAttachmentFileKind` para todas as
  extensões/MIMEs suportados; `isModel3DAttachment`.
- [x] `utils/projects/delay.ts`: casos-limite de fuso/madrugada (complementar).
- [x] `utils/yup/**`: todos os schemas, incluindo `utils/yup/pages/*` (novo serviço,
  materiais, edição) — valores válidos, inválidos e mensagens.
- [x] `hooks/useBoolean`, `hooks/sidebar`, `hooks/useAreas`: comportamento puro.
- [x] `services/queryClient.ts`: asserções de configuração global (ex.: `retry`,
  `staleTime` — e que `refetchOnMount` global NÃO está desabilitado; regressão de
  decisão documentada).

### Critérios de aceite

- [x] `src/utils/**` e lógica pura com cobertura ≥ 95% de branches.
- [x] **Prova de fogo:** mude `porc = 75` para `porc = 70` em `calculatePrice` →
  vermelho; remova uma transição válida da status machine → vermelho.
  *Executada: `porc = 70` derrubou 10 testes de preço; remover `em_producao ->
  pronto_para_montagem` derrubou a matriz de status. Restaurado, verde.*

---

## 9. FASE 5 — Lacunas de testes de componentes (jsdom + RTL)

**Objetivo:** todo componente com lógica/interação tem spec. Mock permitido SOMENTE da
camada de services (`@/services/...`) — nunca de subcomponentes internos.

Padrão: `src/tests/testUtils.tsx` (providers reais de Chakra + React Query). Para
componentes que usam `useAuth`/`useAppUser`, criar wrapper de teste com
`AuthContext.Provider` de valor controlado (não mockar o hook via `jest.mock`).

Componentes SEM teste hoje (criar):

- [x] `auth/AccessGate` — **componente de segurança, prioridade da fase**: usuário
  `null` → redirect `/login`; papel sem acesso → redirect para rota default do papel;
  rota pública renderiza sem auth; estado de loading não vaza conteúdo protegido.
- [x] `projects/AttachmentUploader`: seleção de arquivo, categoria, visibilidade,
  submit chama `uploadAttachment` com os args certos, estado de envio, erro do service
  exibido (toast), limpeza do form após sucesso.
- [x] `projects/ClientAccessPanel`: gera acesso (service mockado), exibe link/código,
  copiar link, estados de erro.
- [x] `projects/ProjectForm` + `projects/ProjectItemForm`: validação yup em blur/submit,
  adicionar/remover itens dinâmicos, payload final do submit.
- [x] `projects/ProjectItemCard`, `projects/ProjectSummaryCards`,
  `projects/AssignDesignerModal` (prazo automático preenchido),
  `projects/ModelViewerPreview` (render condicional p/ `.glb`; mock do custom element).
- [x] `admin/DelayedItemsTable`; `assembler/AssemblerAssignmentsPanel`,
  `assembler/AssemblerPaymentHistory`; `designer/DesignerUploadPanel`.
- [x] `client/ClientLayout`, `client/ClientLoginWithCode` (código inválido mostra erro),
  `client/ClientProjectView` (aprovar/rejeitar/solicitar mudança disparam callbacks).
- [x] `Form/DatePicker`, `Form/Modal`, `Form/Radio`, `Form/Select` (integração com
  react-hook-form, exibição de erro).
- [x] `SearchBar`, `Pagination` (limites: primeira/última página).
- [x] `cortes/OrderListDesktop` e `OrderListMobile` (render das linhas, ações),
  `cortes/ConfirmStatusDialog`, `cortes/ConfirmDeactivateDialog`, `cortes/HistoryDialog`.
- [x] `NewOrder/Cutlist` — **prioridade**: adicionar peça recalcula preço via
  `calculatePrice` real (não mockar o cálculo!), editar/remover peça, totais;
  `NewOrder/OrderData`; `NewOrder/TagSchemaSvg` (render com fixture).
- [x] `Printables/EstimateResume`, `Printables/OrderResume`, `Printables/Tags`:
  render com fixtures completas — valores, cliente e itens visíveis no documento
  (asserções de conteúdo, não snapshot cego).
- [x] Páginas com lógica de composição relevante (render com services mockados):
  `pages/login` (submit chama signIn; erro de credencial exibido),
  `pages/index` (home/dashboard), `pages/cliente/[publicId]/acompanhar`.

### Critérios de aceite

- [x] Todos os componentes de `src/components/**` com interação/condicionais têm spec
  (mapa da seção 13); componentes puramente decorativos podem ser dispensados com
  anotação no mapa.
- [x] **Prova de fogo:** inverta a condição de permissão no `AccessGate` → vermelho;
  quebre o handler de submit do `AttachmentUploader` → vermelho.
  *Executada: negar `canAccessPage` derrubou 4 testes do AccessGate; fixar `visibility`
  no submit do AttachmentUploader derrubou 1. Restaurado, verde.*

---

## 10. FASE 6 — E2E real com Playwright + emulador (`e2e/real/`)

**Objetivo:** jornadas completas por papel contra o app REAL (login real, Firestore
real, Storage real, API routes reais). Toda escrita tem verificação dupla
(princípio 3). Os specs mockados atuais são substituídos por equivalentes reais.

### 10.1 Fundação e autenticação

- [x] `auth.spec.ts`: login com credencial válida (cookie `session` presente,
  redirect por papel), credencial inválida (erro visível, sem cookie), logout
  (volta a `/login`, rotas protegidas inacessíveis), sessão persiste após reload.
- [x] `permissions.spec.ts` (portar do modo mock): sidebar e acesso direto por URL para
  os 5 papéis — agora com usuários reais do seed (sem `localStorage` hack).

### 10.2 Jornada Via A — operação interna

- [x] `project-lifecycle.spec.ts` (a jornada-mestre, como admin/vendedor):
  1. cria projeto com 2 itens → **verificar docs no emulador** (paths, summary);
  2. faz upload de anexo geral (PDF fixture) → **verificar arquivo no Storage
     (bytes > 0) + doc de attachment + download via `downloadUrl` responde 200**
     — este passo é o teste que faltou para o bug original;
  3. atribui desenhista → prazo automático calculado, status `aguardando_desenho`;
  4. (como desenhista) vê a fila, faz upload de desenho no item, marca concluído;
  5. lança orçamento (linhas + valor cliente) → status `aguardando_aprovacao_cliente`
     após envio;
  6. gera acesso do cliente → link/código exibidos e persistidos (hash no doc).
- [x] `designer-queue.spec.ts`: desenhista só vê itens próprios; item de outro
  desenhista inacessível por URL direta.

### 10.3 Jornada Via B — cliente, montador, financeiro

- [x] `client-portal.spec.ts` (contexto anônimo, sem storageState):
  login com código no portal `/cliente/[publicId]`; código errado → erro;
  vê apenas itens/anexos `clientVisible` (semear um anexo `internal` e assertar que
  NÃO aparece); aprova um item (status muda no Firestore + histórico com role
  `client`); rejeita outro com motivo; "aprovar todos"; solicitação de mudança;
  timeline de acompanhamento reflete os status.
- [x] `assembler-flow.spec.ts`: admin atribui montador (valor a receber) → status
  `em_producao`; montador loga, vê atribuição com dados do cliente; marca montagem
  concluída → status + pagamento pendente criados; admin libera/paga em
  `/administracao/financeiro-montadores`; montador confirma recebimento em
  `/montador/financeiro` → doc `payments` com status `confirmado_pelo_montador`
  (verificação dupla).
- [x] `dashboard.spec.ts`: com seed determinístico (itens atrasados com datas fixas),
  cards e tabela de atrasados batem com os números esperados; filtros por status,
  cliente e responsável.
- [x] `deadline-settings.spec.ts`: admin altera `configuracoes-prazos` → nova
  atribuição de desenhista usa o novo default.
- [x] `admin-users.spec.ts`: admin cria usuário novo (papel desenhista) → usuário
  aparece na lista → **novo usuário consegue logar** (Auth emulator de verdade).

### 10.4 Área legada — cortes/pedidos (hoje 100% manual)

- [x] `cortes-novoservico.spec.ts`: cria orçamento e pedido com cutlist real
  (material do seed) → preço na tela bate com `calculatePrice` (importar a função no
  teste e comparar) → doc gravado com `orderCode` sequencial (verificação dupla);
  impressão: conteúdo do `OrderResume` renderiza os dados.
- [x] `cortes-listadecortes.spec.ts`: lista paginada; busca por nome/código; avanço de
  status com diálogo de confirmação → histórico registrado; desativação de pedido.
- [x] `cortes-editar.spec.ts`: edição de cutlist exige senha de vendedor; senha errada
  bloqueia (nada gravado); senha certa grava, mostra diferença de preço e registra
  quem editou.
- [x] `cortes-materiais.spec.ts`: CRUD de materiais; material usado em pedido reflete
  no cálculo do novo serviço.

### 10.5 Caminhos de erro (interceptação permitida aqui)

- [x] `error-paths.spec.ts`: upload com falha de rede (abort na rota do Storage
  emulator) → erro visível + estado recuperável; API 500 em provision → toast de erro;
  submissão dupla (double click) não cria doc duplicado.

### 10.6 Migração e limpeza

- [x] Reescrever os cenários de `e2e/projects.spec.ts` (mock) como parte das jornadas
  reais acima; quando todos estiverem cobertos, **excluir os specs mockados e o
  projeto `mock`** do Playwright config.

### Critérios de aceite

- [x] Toda página de `src/pages/**` (não-API) é visitada por pelo menos um teste real;
  toda jornada de negócio das docs (`VIA-A`, `VIA-B`) tem spec dedicado.
- [x] Nenhum `page.route` fora de `error-paths.spec.ts`.
- [x] **Prova de fogo:** (a) bucket errado no env do webServer → jornada de upload
  vermelha; (b) remova `firestore.indexes.json`... não aplicável ao emulador (ver
  seção 14) — em vez disso, quebre a query da fila do desenhista (filtro errado) →
  `designer-queue` vermelho; (c) desabilite a checagem de senha em `updateOrderCutlist`
  → `cortes-editar` vermelho.
  *Executada:* (a) `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` apontado para um bucket
  inexistente derrubou as 2 jornadas de `project-lifecycle` — **exatamente a classe do
  bug original**; (b) filtro `designerId` trocado por um id inexistente derrubou 2 testes
  de `designer-queue`; (c) `if (!sellerRecord)` neutralizado em `updateOrderCutlist`
  derrubou o teste de senha inválida de `cortes-editar`. Tudo restaurado, verde.

> **Nota sobre `client-portal`:** o portal renderiza anexos `client` via URL assinada,
> e `getSignedUrl` não funciona contra o emulador (caveat 14.2). O e2e semeia um anexo
> `internal` e prova que ele **não** vaza; a renderização de anexo `client` e a garantia
> de que só ele é assinado ficam no teste de integração de `client-access/project`.

> **Nota sobre autenticação:** `storageState` foi descartado. O fixture `resetAndSeed`
> apaga as contas do Auth antes de cada teste, o que invalida qualquer sessão salva —
> é o fallback previsto na seção 14.3. Cada spec loga pela UI via `loginAs()`.

---

## 11. FASE 7 — Remoção do dual-path `E2E_MOCKS_ENABLED`

**Objetivo:** o código de produção deixa de ter caminho alternativo de testes — a causa
raiz do "teste em volta".

- [x] Confirmar que TODOS os cenários dos specs mockados têm equivalente real verde
  (checklist da Fase 6 completa).
- [x] Remover os branches `E2E_MOCKS_ENABLED` dos 12 arquivos de services e de
  `hooks/authContext.tsx` (usar `grep -rn "E2E_MOCKS_ENABLED" src/` como guia).
- [x] Excluir `src/services/projects/e2eMockStore.ts`, o projeto `mock` do Playwright,
  `NEXT_PUBLIC_E2E_USE_MOCKS` do `instrumentation.ts` e do `playwright.config.ts`,
  e o mock manual `__mocks__/next-firebase-auth` se não for mais referenciado.
- [x] `grep -rn "E2E_USE_MOCKS\|e2eMockStore" src/ e2e/` retorna vazio.

### Critérios de aceite

- [x] Bundle de produção sem nenhum código de mock (conferir com `npm run build`).
- [x] `npm run test:all` verde do zero (emulador frio).

---

## 12. FASE 8 — Cobertura, guard-rails permanentes e ratchet

- [x] Ativar cobertura no CI: `jest --coverage` (unit) + cobertura da integração.
  Thresholds iniciais (subir, nunca descer):
  - `src/utils/**`: **95% branches** (real: 98,5%) — em `jest.config.js`;
  - `src/components/**`: **80% lines** (real: 85,6%);
  - `src/services/**` + `src/pages/api/**`: **75% lines / 60% branches**
    (real: 79,8% / 66,6%) — em `jest.integration.config.js`, pois é a suíte que
    exercita o caminho real;
  - global da suíte unitária: **35% lines** — número baixo de propósito. Quando há
    thresholds por path, o `global` do Jest cobre só o que sobra dos grupos, ou seja
    `src/pages/**` (coberto por e2e) e `src/services/**` (coberto pela integração).
    O alvo original de "75% global" não é mensurável sem *merge* dos relatórios das
    três suítes — fica registrado como próximo passo, e não como meta fingida.
- [x] Adicionar step de CI que falha se aparecer novo arquivo em `src/services/**` ou
  `src/pages/api/**` sem spec correspondente (`scripts/check-test-coverage-map.mjs`,
  job `guardrails`).
- [x] Lint de testes: proibir `waitForTimeout`, `test.only`, `page.route` fora de
  error-paths — implementado no mesmo script `test:guardrails`.
- [x] Documentar no `README.md`: como rodar cada suíte, pré-requisitos (Java), fluxo de
  regressão (bug manual → teste primeiro), e o processo da prova de fogo para novas
  features (`docs/gestao-projetos/GUIA-NOVA-FEATURE.md` ganhou a seção "testes
  obrigatórios por camada").
- [ ] (Opcional, avaliar custo — **não feito**) Stryker (mutation testing) apenas em
  `src/utils/cutlist/` e `src/utils/projects/` — os módulos de maior risco de negócio.

---

## 13. Mapa completo de cobertura (inventário arquivo a arquivo)

Legenda: ✅ já coberto · 🔶 parcialmente (só a parte pura) · ❌ sem teste · camadas:
U=unit, C=component, I=integração(emulador), R=rules, E=e2e.

### 13.1 Utils e lógica pura

| Arquivo | Hoje | Camada alvo | Fase |
|---|---|---|---|
| `utils/cutlist/calculatePrice.ts` | ❌ | U | 4 |
| `utils/cutlist/sortAndReturnTag.ts` | ❌ | U | 4 |
| `utils/capitalizeAndStripString.ts` | ❌ | U | 4 |
| `utils/normalizeTelephone.ts` | ❌ | U | 4 |
| `utils/phone.ts` | ✅ | U | — |
| `utils/removeUndefinedAndEmpty.ts` | ❌ | U | 4 |
| `utils/listOfAreas.ts` | ❌ | U | 4 |
| `utils/projects/attachments.ts` | 🔶 | U | 4 |
| `utils/projects/delay.ts` | ✅ | U | 4 (complementar) |
| `utils/projects/permissions.ts` | 🔶 | U (matriz completa) | 4 |
| `utils/projects/status.ts` | 🔶 | U (matriz completa) | 4 |
| `utils/yup/projetosValidations.ts` | ✅ | U | — |
| `utils/yup/deadlineDefaultsValidations.ts` | ✅ | U | — |
| `utils/yup/pages/*` | ❌ | U | 4 |

### 13.2 Hooks

| Arquivo | Hoje | Camada alvo | Fase |
|---|---|---|---|
| `hooks/authContext.tsx` | ❌ | C (provider) + I (login route) + E | 3/6 |
| `hooks/order.tsx` | ❌ | refatorar → service (I) + hook (C) | 2 |
| `hooks/material.tsx` | ❌ | idem | 2 |
| `hooks/useAppUser.ts` | ❌ | C | 5 |
| `hooks/useAreas.ts` / `useBoolean.tsx` / `sidebar.tsx` | ❌ | U/C | 4 |
| `hooks/index.tsx` (composição de providers) | ❌ | C smoke | 5 |

### 13.3 Services

| Arquivo | Hoje | Camada alvo | Fase |
|---|---|---|---|
| `services/firebase.ts` | ❌ | I (conexão emulador; contrato de config) | 0 |
| `services/firebaseAdmin.ts` | ❌ | I (modo emulador) | 0 |
| `services/env.server.ts` | ✅ | U | — |
| `services/queryClient.ts` | ❌ | U (config) | 4 |
| `services/sellers.ts` | ❌ | I | 2 |
| `services/orders.service.ts` (novo) | — | I | 2 |
| `services/materials.service.ts` (novo) | — | I | 2 |
| `projects/attachment.service.ts` | 🔶 | I (round-trip Storage) | 2 |
| `projects/attachmentAdmin.ts` | 🔶 | I | 2 |
| `projects/attachmentHooks.ts` | ❌ | C | 5 |
| `projects/project.service.ts` | 🔶 | I | 2 |
| `projects/projectItem.service.ts` | 🔶 | I (summary!) | 2 |
| `projects/projectHooks.ts` | ❌ | C | 5 |
| `projects/status.service.ts` / `statusAdmin.service.ts` | 🔶 | I | 2 |
| `projects/budget.service.ts` | 🔶 | I | 2 |
| `projects/deadline.service.ts` / `deadlineAdmin.ts` | 🔶 | I | 2 |
| `projects/designer.service.ts` | 🔶 | I | 2 |
| `projects/assembler.service.ts` | 🔶 | I | 2 |
| `projects/payment.service.ts` | 🔶 | I | 2 |
| `projects/dashboard.service.ts` | 🔶 | I | 2 |
| `projects/users.service.ts` / `adminUsers.ts` | 🔶 | I | 2 |
| `projects/clientAccess.service.ts` / `clientSession.ts` / `clientPortal.server.ts` / `clientActionRoute.server.ts` / `internalAuth.server.ts` | 🔶 | I | 2 |
| `projects/summary.ts` / `paths.ts` | ✅ | U | — |
| `projects/e2eMockStore.ts` | — | ~~excluir~~ **excluído** | 7 ✅ |

### 13.4 API routes (todas → I na Fase 3, E nas jornadas da Fase 6)

Todas as 12 rotas têm integração contra o emulador (Fase 3): `login` ✅ · `logout` ✅ ·
`admin/users` ✅ · `assembler/confirm-payment` ✅ · `assembler/update-status` ✅ ·
`client-access/provision` ✅ · `verify` ✅ · `project` ✅ · `approve-item` ✅ ·
`approve-all` ✅ · `reject-item` ✅ · `request-change` ✅

### 13.5 Componentes (❌ → Fase 5; lista completa na seção 9)

Já cobertos ✅: AdminDashboardCards, AssemblerPaymentsTable, AssemblerFinanceSummary,
AssignAssemblerModal, ClientItemApprovalCard, ClientTrackingTimeline, Dashboard
(3 specs), DesignerQueue, Form/Input, Loader, AttachmentList, ItemBudgetForm,
ProjectItemStatusBadge, ProjectItemTimeline, UserForm, página `cliente/index`.

~~Sem cobertura ❌~~ **Todos cobertos na Fase 5**: AccessGate, AttachmentUploader,
ClientAccessPanel, ProjectForm, ProjectItemForm, ProjectItemCard, ProjectSummaryCards,
AssignDesignerModal, ModelViewerPreview, DelayedItemsTable, AssemblerAssignmentsPanel,
AssemblerPaymentHistory, DesignerUploadPanel, ClientLayout, ClientLoginWithCode,
ClientProjectView, Form/{DatePicker,Modal,Radio,Select}, SearchBar, Pagination,
cortes/* (5), NewOrder/* (3), Printables/* (3).

### 13.6 Páginas (todas → E na Fase 6)

| Página | Jornada e2e |
|---|---|
| `/login`, `/` | auth.spec, permissions.spec |
| `/projetos`, `/projetos/novo`, `/projetos/[id]`, `/projetos/[id]/itens/[itemId]` | project-lifecycle |
| `/projetos/dashboard` | dashboard.spec |
| `/desenhista` | designer-queue |
| `/montador`, `/montador/financeiro`, `/montador/item/[...]` | assembler-flow |
| `/cliente/[publicId]`, `/cliente/[publicId]/acompanhar` | client-portal |
| `/administracao/usuarios` | admin-users |
| `/administracao/configuracoes-prazos` | deadline-settings |
| `/administracao/financeiro-montadores` | assembler-flow |
| `/administracao/fretes`, `/administracao/vendedores` | spec próprio (CRUD, mesma receita dos demais) |
| `/cortes/novoservico`, `/cortes/listadecortes`, `/cortes/materiais`, `/cortes/editar/[id]` | cortes-*.spec |

### 13.7 Regras e config

| Item | Camada | Fase |
|---|---|---|
| `firestore.rules` (10 blocos match) | R | 1 |
| `storage.rules` (4 blocos match) | R | 1 |
| `firestore.indexes.json` | processo (seção 14) | — |
| `scripts/seed*.mjs` | smoke opcional contra emulador | 8 |
| `scripts/atualiza-fretes.mjs`, `faturamento-mensal.mjs`, `migrate-old-db.mjs` | fora de escopo (uso pontual manual) — registrar | — |

---

## 14. Limitações conhecidas e mitigação (não esconder!)

1. **O emulador do Firestore NÃO exige índices compostos.** Query que precisa de índice
   passa no emulador e quebra em produção (`failed-precondition`). Mitigação:
   (a) manter `firestore.indexes.json` versionado (já é) e o deploy de índices no
   checklist de release (`npm run firebase:indexes`);
   (b) teste de contrato estático: spec que extrai as queries compostas conhecidas
   (fila do desenhista, dashboards, collection-group de attachments/assignments) e
   verifica que existe entrada correspondente em `firestore.indexes.json` — não é
   perfeito, mas transforma "esqueci o índice" em teste vermelho.
   > **Implementado** em `src/tests/services/firestoreIndexes.spec.ts`. Ele nasceu
   > **vermelho** e revelou dois índices compostos faltando em produção:
   > `projects (sellerId ASC, createdAt DESC)` — usado por `listProjects` com filtro de
   > vendedor — e `orders (orderStatus ASC, orderCode DESC)` — usado pela lista de
   > cortes. Ambos foram adicionados ao `firestore.indexes.json`. **Ainda precisam ser
   > publicados com `npm run firebase:indexes`.**
2. **`getSignedUrl` do admin SDK pode exigir credencial de assinatura real** mesmo
   contra o emulador. Se ocorrer, isolar a assinatura em um adapter de 5 linhas,
   testar o adapter com mock e todo o resto real. Registrar aqui o que foi feito.
   > **Confirmado na Fase 3** (`Could not load the default credentials`). Mitigação
   > aplicada: a assinatura foi extraída para `services/projects/storageSignedUrl.server.ts`
   > (`getSignedReadUrl`), único ponto mockado em `tests/integration/api/clientAccess.spec.ts`.
   > O adapter tem spec próprio (`tests/services/projects/storageSignedUrl.server.spec.ts`)
   > e o resto da rota `client-access/project` roda contra o emulador de verdade. O teste
   > assere **com quais `storagePath` a fronteira foi chamada**, garantindo que anexo
   > `internal` nunca é assinado.
3. **Sessões do Firebase Auth vivem em IndexedDB** — o `storageState` do Playwright só
   as captura com a opção `indexedDB: true` (disponível na versão instalada). Se um
   papel apresentar flakiness de sessão, fallback: login via UI no `beforeEach` daquele
   spec (mais lento, sempre correto).
4. **`@google/model-viewer` (web component)** não roda em jsdom — mockar o custom
   element no spec do `ModelViewerPreview`; a renderização real é coberta no e2e.
5. **Impressão (`react-to-print`)**: o diálogo de impressão não é testável; testar o
   conteúdo dos `Printables` renderizado (RTL + e2e assert no DOM antes do print).
6. **Paralelismo**: suítes que compartilham o emulador rodam serializadas
   (`--runInBand` / `workers: 1`). Se o tempo total passar de ~10 min, particionar por
   projectId dinâmico por worker (o emulador suporta múltiplos projetos) — otimização,
   não requisito.

---

## 15. Referência rápida

```bash
# suíte rápida (unit + component)
npm test

# regras de segurança
npm run test:rules

# integração (services + API routes reais)
npm run test:integration

# e2e real (sobe emulador + Next + Playwright)
npm run test:e2e

# tudo (ordem: typecheck → unit → rules → integração → e2e)
npm run test:all

# emulador interativo para depurar (UI em http://127.0.0.1:4000)
npm run emulators
```

**Definição de pronto global:** `npm run test:all` verde do zero em máquina limpa e no
CI; nenhuma feature nova entra sem teste nas camadas aplicáveis (unit/I/R/E conforme o
mapa da seção 13); toda correção de bug nasce de um teste de regressão vermelho; provas
de fogo executadas e registradas em cada fase.
