# Plano de Implementação — Gestão de Projetos de Marcenaria

> Especificação completa: [especificacao.md](./especificacao.md)
> Via A (operação interna): [VIA-A-operacao-interna.md](./VIA-A-operacao-interna.md)
> Via B (cliente + montador + financeiro): [VIA-B-cliente-montador-financeiro.md](./VIA-B-cliente-montador-financeiro.md)

Este plano divide o trabalho em **uma etapa de fundação** (sequencial, curta) e **duas vias paralelas** com superfícies de arquivos disjuntas, para que duas sessões de trabalho avancem concomitantemente sem conflitos de merge.

---

## 1. Auditoria do sistema atual (Fase 0 da spec — concluída em 2026-07-08)

| Pergunta da spec | Resposta |
|---|---|
| App Router ou Pages Router? | **Pages Router** (`src/pages`). As rotas da spec (seção 17) foram adaptadas — ver seção 4. |
| Como funciona a autenticação? | Firebase Auth (e-mail/senha) no client + cookie de sessão httpOnly criado por `/api/login` com `firebase-admin` (`createSessionCookie`). Guard client-side via `useAuth` (`src/hooks/authContext.tsx`). Não há middleware. |
| Como papéis/permissões funcionam hoje? | **Não existem.** Não há coleção `users` nem roles — todo usuário autenticado vê tudo. A coleção `sellers` existe apenas para identificar o vendedor num pedido (senha = id do doc), não para login. O módulo precisa criar o sistema de papéis do zero. |
| Já existe upload para Firebase Storage? | **Não.** O bucket está configurado no `.env`, mas `firebase/storage` nunca foi usado. |
| Padrões de componentes/visual? | Chakra UI v3 + react-hook-form + Yup + React Query v5. Layout interno: `Dashboard` + `Header` + sidebar (`SidebarNav`). Toasts via `toaster` (`src/components/ui/toaster.tsx`). Componentes de formulário em `src/components/Form/`. |
| Camada de dados atual | Hooks de domínio como Context Providers (`hooks/order.tsx`, `hooks/material.tsx`) — padrão legado. O módulo novo seguirá a recomendação da spec (seção 19): **services em `src/services/projects/` + hooks finos de React Query**, sem Context. |
| Infra de testes | Jest 30 + Testing Library, mas **quebrada**: falta `jest-environment-jsdom` e o `babel.config.js` foi desativado (`.old`) para não desligar o SWC do Next. Conserto é a etapa 0.1. |
| firebase-admin | Só `adminAuth` exportado. As API routes do portal do cliente precisarão de `adminDb` (Firestore) e `adminStorage`. |
| Regras de segurança | Não versionadas no repo (gerenciadas no console). Passarão a ser versionadas em `firestore.rules` / `storage.rules`. |

---

## 2. Decisões de arquitetura (adaptações da spec ao repo)

1. **Pages Router mantido** — nada de App Router; rotas na seção 4.
2. **Services + hooks React Query**, não Context Providers. Regras de negócio ficam em `src/services/projects/*.ts` (funções puras separadas de wrappers Firestore, para serem testáveis sem emulador).
3. **Portal do cliente 100% server-side** (spec seção 20): API routes com `firebase-admin`. Cliente anônimo nunca lê Firestore direto. Senha comparada com hash **scrypt** (`node:crypto`, sem dependência nova). Após verificação, a API emite cookie httpOnly `client_session` (token HMAC com `publicId` + expiração, secret em `CLIENT_ACCESS_SECRET`).
4. **Arquivos para o cliente** via signed URLs de curta duração geradas pelo `adminStorage` — nunca `downloadUrl` permanente.
5. **Máquina de transições de status** é função pura na fundação, compartilhada pelos dois lados. Efeitos transversais (histórico, resumo do projeto, liberação financeira, expiração do link) ficam no `status.service` da fundação — nenhuma via edita código da outra para isso.
6. **Testes sem emulador** (pragmático para o volume do projeto): lógica pura com Jest puro; componentes com Testing Library; API handlers invocados diretamente com `req`/`res` mockados e `firebase-admin` mockado. Emulador do Firestore fica como melhoria futura opcional para testar as rules.
7. **Admin pode forçar qualquer transição de status** (spec: "administradores podem editar tudo"), sempre com registro em `statusHistory`.

---

## 3. Estratégia de paralelização

### Branches e worktrees

```txt
feat/gestao-projetos            ← branch base (fundação + este plano + merges)
├── feat/gestao-projetos-via-a  ← Via A: operação interna
└── feat/gestao-projetos-via-b  ← Via B: cliente + montador + financeiro
```

Após a fundação (Etapa 0, feita na base):

```bash
git branch feat/gestao-projetos-via-a feat/gestao-projetos
git branch feat/gestao-projetos-via-b feat/gestao-projetos
git worktree add ../jrm-app-via-a feat/gestao-projetos-via-a
git worktree add ../jrm-app-via-b feat/gestao-projetos-via-b
# em cada worktree: npm install (node_modules não é compartilhado)
```

Cadência de sincronização — **ao fim de cada etapa concluída**:

```bash
# na base:
git merge --no-ff feat/gestao-projetos-via-a   # (ou -via-b)
# na outra via:
git merge feat/gestao-projetos
```

### Regras de convivência (evitam conflitos)

1. **Arquivos congelados após a fundação** — só mudam por acordo, na branch base, seguidos de merge imediato nas duas vias:
   - `src/types/projects.ts`
   - `src/utils/projects/**` (status, permissões, prazos — funções puras)
   - `src/services/projects/{status,attachment,users,deadline,paths}.service.ts`
   - `src/services/firebase.ts`, `src/services/firebaseAdmin.ts`
   - `jest.config.js`, `package.json`
2. **`firestore.rules` / `storage.rules`**: cada via edita apenas sua seção demarcada por comentários (`// === VIA A ===` / `// === VIA B ===`), sempre após merge da base.
3. **Página de detalhe do item** (`src/pages/projetos/[projectId]/itens/[itemId].tsx`) é **da Via A**. A Via B entrega componentes plugáveis (`src/components/assembler/*`) e a integração (imports + render) acontece nos checkpoints, nunca unilateralmente.
4. **Sidebar** (`SidebarNav.tsx`) é da Via A. Links do montador/financeiro são adicionados no checkpoint 2.
5. Superfícies exclusivas por via — ver tabela na seção 5.

---

## 4. Mapa de rotas (Pages Router)

| Rota | Via | Descrição |
|---|---|---|
| `src/pages/projetos/index.tsx` | A | Lista de projetos + filtros |
| `src/pages/projetos/novo.tsx` | A | Criar projeto (cliente + itens) |
| `src/pages/projetos/[projectId]/index.tsx` | A | Detalhe do projeto |
| `src/pages/projetos/[projectId]/itens/[itemId].tsx` | A | Detalhe do item (ponto de integração) |
| `src/pages/projetos/dashboard.tsx` | A | Dashboard admin (cards + filtros + atrasos) |
| `src/pages/desenhista/index.tsx` | A | Fila do desenhista |
| `src/pages/administracao/usuarios.tsx` | A | Gestão de usuários e papéis |
| `src/pages/administracao/configuracoes-prazos.tsx` | A | `settings/deadlineDefaults` |
| `src/pages/api/admin/users.ts` | A | Criar/editar usuário (Auth + Firestore, admin only) |
| `src/pages/cliente/[publicId]/index.tsx` | B | Portal do cliente (senha → orçamento → aprovação) |
| `src/pages/cliente/[publicId]/acompanhar.tsx` | B | Tracking simplificado |
| `src/pages/api/client-access/*.ts` | B | verify, project, approve-item, approve-all, reject-item, request-change |
| `src/pages/montador/index.tsx` | B | Itens atribuídos (mobile-first) |
| `src/pages/montador/item/[projectId]/[itemId].tsx` | B | Detalhe do item para o montador |
| `src/pages/montador/financeiro.tsx` | B | Financeiro do montador |
| `src/pages/administracao/financeiro-montadores.tsx` | B | Pagamentos pendentes / pagar / comprovantes |

---

## 5. Divisão de superfícies

| Superfície | Dono |
|---|---|
| `src/types/projects.ts`, `src/utils/projects/**`, services transversais, rules base, seed | Fundação (congelado) |
| `src/pages/projetos/**`, `src/pages/desenhista/**`, `src/pages/administracao/{usuarios,configuracoes-prazos}.tsx`, `src/pages/api/admin/**`, `src/components/projects/**`, `src/components/designer/**`, `src/services/projects/{project,projectItem,designer}.service.ts`, sidebar | **Via A** |
| `src/pages/cliente/**`, `src/pages/api/client-access/**`, `src/pages/montador/**`, `src/pages/administracao/financeiro-montadores.tsx`, `src/components/client/**`, `src/components/assembler/**`, `src/services/projects/{clientAccess,clientSession,assembler,payment}.service.ts` | **Via B** |

---

## 6. Etapa 0 — Fundação (branch base, sequencial, bloqueia as vias)

> Regra geral de todas as etapas deste plano (fundação e vias): **uma etapa só está concluída quando os testes dela existem e passam, `npx tsc --noEmit` está limpo e o commit foi feito.** Ver Definition of Done (seção 8).

### 0.1 — Consertar a infra de testes
- Instalar `jest-environment-jsdom`; migrar `jest.config.js` para `next/jest` (usa SWC, dispensa babel — remover `babel.config.js.old` e a dependência implícita de `next/babel`).
- Garantir que os testes existentes (`src/tests/**`) passam ou marcar/remover os obsoletos com justificativa.
- Desligar `collectCoverage` por padrão (roda com `--coverage` quando quiser) para acelerar o ciclo.
- **Testes:** suíte atual verde.
- **Commit:** `chore(testes): restaura infra de testes com next/jest`

### 0.2 — Tipos, constantes e máquina de status
- `src/types/projects.ts`: `AppUser`, `UserRole`, `Project`, `ProjectItem`, `ProjectItemStatus`, `ClientApprovalStatus`, `Attachment`, `AttachmentVisibility`, `ProjectItemVersion`, `StatusHistory`, `AssemblerAssignment`, `AssemblerPaymentStatus`, `AssemblerPayment`, `DeadlineDefaults`, DTOs do cliente (seções 6–14 e 20 da spec).
- `src/utils/projects/status.ts`: transições válidas (tabela abaixo), `canTransition(from, to, { isAdmin })`, mapeamento status interno → label do cliente (spec seção 8), labels/cores internos para badges.
- `src/utils/projects/permissions.ts`: `hasRole`, `canSeeAssemblerFinance`, `canAssignDesigner`, `canAssignAssembler`, `canEditItemStatus`, visibilidade de anexos por papel (spec seções 4 e 12).
- `src/utils/projects/delay.ts`: `isDelayed(item, now)` (spec seção 9).

Transições do fluxo normal (admin pode forçar qualquer uma):

```txt
orcamento_criado → aguardando_desenho | aguardando_aprovacao_cliente (fluxo direto)
aguardando_desenho → projeto_desenhado
projeto_desenhado → aguardando_aprovacao_cliente
aguardando_aprovacao_cliente → aprovado | recusado_pelo_cliente | alteracao_solicitada
alteracao_solicitada → aguardando_desenho
aprovado → aguardando_separacao_materiais → em_producao → pronto_para_transporte
        → em_transporte → em_montagem → montagem_concluida → finalizado
qualquer_nao_final → cancelado (admin)
```

- **Testes:** unitários de `canTransition` (fluxo feliz, bloqueios, override admin), mapeamento cliente (todos os 15 status), `isDelayed`, permissões por papel.
- **Commit:** `feat(projetos): adiciona tipos, maquina de status e permissoes`

### 0.3 — Infra Firebase compartilhada
- `src/services/firebase.ts`: exportar `storage` (`getStorage`).
- `src/services/firebaseAdmin.ts`: exportar `adminDb` (`firebase-admin/firestore`) e `adminStorage`.
- `src/services/projects/paths.ts`: builders de caminhos Firestore e Storage (spec seções 13 e 15) — única fonte de verdade para nomes de coleções.
- `firestore.rules` + `storage.rules` versionados (esqueleto da spec seção 21, com seções demarcadas `VIA A` / `VIA B`) + `firebase.json` mínimo para deploy das rules. Documentar comando de deploy no próprio arquivo.
- `.env.example`: adicionar `CLIENT_ACCESS_SECRET`.
- **Testes:** unitários dos builders de `paths.ts`.
- **Commit:** `feat(projetos): adiciona infra firebase compartilhada e regras base`

### 0.4 — Services transversais
- `src/services/projects/users.service.ts` + hook `useAppUser` (lê `users/{uid}`, expõe roles; usado para gate de páginas nas duas vias).
- `src/services/projects/summary.ts`: `computeItemSummary(items)` — **função pura** → `recalculateProjectSummary(projectId)` wrapper.
- `src/services/projects/deadline.service.ts`: `computeDeadline(status, defaults, from)` puro + leitura de `settings/deadlineDefaults` com defaults hardcoded de fallback.
- `src/services/projects/status.service.ts`: `updateItemStatus(projectId, itemId, next, actor, note?)` — valida transição, grava item + `statusHistory`, recalcula resumo e executa efeitos transversais:
  - `montagem_concluida` → assignments do item para `pendente`;
  - todos os itens `finalizado`/`cancelado` → `project.completedAt` + `clientLinkExpiresAt = completedAt + 1 mês`.
- `src/services/projects/attachment.service.ts`: upload core (Storage + doc no Firestore, categoria livre, visibilidade) e listagem filtrada por papel — UI fica na Via A, mas o service é usado também pelo montador (Via B).
- **Testes:** `computeItemSummary` (casos: vazio, misto, atrasados), `computeDeadline`, efeitos de `updateItemStatus` com Firestore mockado (transição inválida rejeita; `montagem_concluida` libera pendências; conclusão total seta expiração), helpers do attachment (validação de metadados, montagem de path).
- **Commit:** `feat(projetos): adiciona services transversais (usuarios, status, prazos, anexos)`

### 0.5 — Seed de desenvolvimento
- `scripts/seed-projetos.mjs`: cria usuários de cada papel + 2 projetos com itens em status variados, assignments e anexos fake — insumo para teste manual das duas vias.
- **Testes:** execução do script contra o projeto de testes (manual, documentada no cabeçalho do script).
- **Commit:** `chore(projetos): adiciona seed de desenvolvimento`

**Fim da fundação → criar branches/worktrees das vias (seção 3).**

---

## 7. Resumo das vias e checkpoints

| Etapa | Via A — Operação interna | Via B — Cliente, montador e financeiro |
|---|---|---|
| 1 | Usuários e papéis (API + página admin) | Acesso do cliente: senha, hash scrypt, publicId, expiração |
| 2 | Services de projeto/item + hooks | API routes `client-access/*` + DTOs sanitizados |
| 3 | Páginas de projetos (lista, novo, detalhe) | Portal do cliente (aprovação + tracking) |
| — | **CP1** — merge mútuo + smoke test: criar projeto → acessar pelo link | |
| 4 | Anexos (UI de upload/listagem) | Montadores: atribuição + painel mobile-first |
| 5 | Fluxo do desenhista (fila, versões, prazos) | Financeiro dos montadores (pagar, comprovante, confirmar) |
| — | **CP2** — merge mútuo + integrar `AssignAssemblerModal`/links da sidebar + fluxo desenhista→cliente | |
| 6 | Dashboard admin + filtros + config de prazos | Endurecimento de segurança (rules, rate-limit, vazamentos) |
| — | **CP3** — merge final + critérios de aceite (spec seção 31) + `npm run build` | |
| 7 | Polimento interno (vazios, loading, responsivo) | — |

### Checkpoints (feitos em conjunto, na branch base)

- **CP1** (após A3 e B3): merge das duas vias na base; integrar `ClientAccessPanel` (Via B) na página de detalhe do projeto (Via A); rodar seed; teste manual: vendedor cria projeto com itens → admin gera link → cliente acessa com senha e vê orçamento. `npm test` + `npx tsc --noEmit` + `npm run build`.
- **CP2** (após A5 e B5): merge; integrar na página de detalhe do item (Via A) os componentes da Via B (`AssignAssemblerModal`, painel de assignments); adicionar links `Montador`/`Financeiro` na sidebar; teste manual do ciclo: desenho → aprovação do cliente → produção → montador atualiza etapas → montagem concluída → pagamento pendente.
- **CP3** (após A6/A7 e B6): merge final; passar os **20 critérios de aceite** da spec (seção 31) um a um, com perfil de cada papel; revisar rules; `npm run build`; abrir PR de `feat/gestao-projetos` → `main`.

---

## 8. Definition of Done — toda etapa, sem exceção

1. **Testes escritos e passando**: `npm test` verde (unitários da lógica nova + componentes relevantes). Nenhuma etapa é "só UI" — no mínimo a lógica extraída em função pura tem teste.
2. **Tipos limpos**: `npx tsc --noEmit` sem erros (o build **não** checa tipos — `ignoreBuildErrors: true` — então este comando é obrigatório).
3. **Commit feito** ao final da etapa (etapas maiores: um commit por entrega coesa; nunca acumular duas etapas num commit).
4. Teste manual rápido da tela/fluxo alterado (`npm run dev`) quando houver superfície visível.
5. Nos checkpoints, adicionalmente: `npm run build` e roteiro manual por papel.

### Convenção de commits

Padrão do repositório (português, imperativo), com escopo:

```txt
feat(projetos): cria CRUD de projetos e itens
feat(cliente): adiciona rota de aprovacao de item
feat(montador): adiciona painel financeiro
chore(testes): restaura infra de testes com next/jest
```

---

## 9. Fora do escopo do MVP (spec seção 29)

Notificações, WhatsApp/e-mail automático, assinatura digital, mensagens internas, cálculo automático de preço, comissão de vendedores.

---

## 10. Fase 2 — Correção de bugs e ajuste do fluxo real (2026-07-08)

Origem: feedback do teste manual, registrado nos blocos **"O que mudar"** de [GUIA-NOVA-FEATURE.md](./GUIA-NOVA-FEATURE.md). A Fase 1 (fundação + Via A + Via B + CP1/CP2/CP3) entregou o esqueleto correto, mas com uma máquina de status que não corresponde à operação real da marcenaria, e com dois bugs que travam qualquer teste.

### 10.1 Decisões tomadas antes de planejar

| Questão | Decisão |
|---|---|
| O fluxo novo é status do projeto ou do item? | **Do item** — mantém o modelo atual. O projeto continua com `itemSummary` agregado. |
| Como modelar o orçamento? | **Linhas de custo livres** (descrição + valor) + `customerAmount` (valor ao cliente) + `suggestedAssemblerAmount` (sugestão que pré-preenche a atribuição do montador). Fica **no item**, coerente com o status ser do item. |
| Como registrar a aprovação da montagem pelo admin? | **Status novo** `aguardando_pagamento_montador`, entre `montagem_concluida` e `finalizado`. Aparece na timeline e no card "montadores a pagar" do dashboard. |

Consequência do escopo: `orcamento_criado`, `projeto_desenhado`, `aprovado`, `aguardando_separacao_materiais`, `pronto_para_transporte`, `em_transporte` e `em_montagem` **deixam de existir**. `em_transporte`/`em_montagem` foram removidos por decisão explícita — se a operação precisar depois distinguir "em rota" de "montando", reintroduzir como etapas do montador, não como status do fluxo comercial.

### 10.2 Nova máquina de status (13 status, antes 15)

```txt
projeto_criado                  → aguardando_desenho
    (anexa medidas, fotos, acabamentos; vendedor/admin confirma)
aguardando_desenho              → aguardando_orcamento
    (desenhista anexa o desenho e confirma)
aguardando_orcamento            → aguardando_aprovacao_cliente
    (vendedor/admin preenche as linhas de custo e envia ao cliente)
aguardando_aprovacao_cliente    → aguardando_atribuicao_montador
                                | recusado_pelo_cliente
                                | alteracao_solicitada
alteracao_solicitada            → aguardando_desenho
aguardando_atribuicao_montador  → em_producao
    (efeito de atribuir montador + valor)
em_producao                     → pronto_para_montagem
    (montador combina a data com o cliente)
pronto_para_montagem            → montagem_concluida
montagem_concluida              → aguardando_pagamento_montador
    (admin aprova a montagem; libera o pagamento como `pendente`)
aguardando_pagamento_montador   → finalizado
    (efeito de registrar o pagamento com comprovante)

recusado_pelo_cliente, finalizado → (finais)
qualquer_nao_final → cancelado (admin)
```

Mapa de migração dos dados existentes:

| Status antigo | Status novo |
|---|---|
| `orcamento_criado` | `projeto_criado` |
| `projeto_desenhado` | `aguardando_orcamento` |
| `aprovado` | `aguardando_atribuicao_montador` |
| `aguardando_separacao_materiais` | `em_producao` |
| `pronto_para_transporte`, `em_transporte`, `em_montagem` | `pronto_para_montagem` |

O ambiente ainda não está em produção: a migração é **re-seed** (`scripts/seed-projetos.mjs`). Se houver projeto real no banco quando esta fase rodar, escrever `scripts/migrate-status.mjs` aplicando a tabela acima antes de tudo.

---

### Etapa 2.0 — Desbloqueio (bugs que impedem qualquer teste manual)

> Estas duas correções vêm **antes de tudo**. Enquanto elas não entrarem, não há como validar nenhuma das outras etapas manualmente.

#### 2.0.1 — `POST /api/admin/users` retorna 500

**Causa.** `handleCreate` repassa o telefone cru para o Firebase Auth:

```ts
// src/pages/api/admin/users.ts:46
const userRecord = await adminAuth.createUser({
  email, password, displayName: name,
  ...(phone ? { phoneNumber: phone } : {}),   // ← "(11) 99999-9999"
});
```

O Auth exige E.164 (`+5511999999999`) e rejeita com `The phone number must be a non-empty E.164 standard compliant identifier string`.

**Correção: parar de mandar o telefone para o Auth.** O login é e-mail/senha; o campo `phoneNumber` do Auth existe para *phone sign-in* e é **globalmente único por projeto** — dois funcionários cadastrados com o telefone da loja quebrariam com `auth/phone-number-already-exists`. O telefone é dado de exibição (link `tel:` do montador), então pertence a `users/{uid}` e a mais lugar nenhum.

- `src/utils/phone.ts` **(novo)**: `toE164BR(raw): string | null` (aceita `(11) 99999-9999`, `11999999999`, `+5511999999999`) e `formatPhoneBR(raw)` para exibição.
- `src/pages/api/admin/users.ts`:
  - remover `phoneNumber` do `createUser`;
  - gravar `phone: toE164BR(phone) ?? phone.trim()` no Firestore;
  - `handleUpdate`: aceitar `phone` e sincronizar `displayName` no Auth quando `name` muda (hoje só grava no Firestore, e o Auth fica com o nome velho);
  - mapear `auth/invalid-email` e `auth/invalid-password` para **400** com mensagem em pt-BR — hoje viram 500 genérico, que foi exatamente o que escondeu este bug.
- `src/utils/yup/usuariosValidations.ts`: validar telefone (10–11 dígitos após limpar a máscara), opcional.

**Testes:** `src/tests/utils/phone.spec.ts` (formatos válidos/inválidos) e `src/tests/pages/api/admin/users.spec.ts` **(novo — não existe hoje)** com `firebase-admin` mockado: cria sem telefone, cria com telefone mascarado, e-mail duplicado → 409, senha curta → 400, não-admin → 403.
**Commit:** `fix(usuarios): corrige criacao de usuario com telefone fora do padrao E.164`

#### 2.0.2 — `/administracao/financeiro-montadores` pede índice que já foi criado

**Causa.** Os índices de campo único que o Firestore cria sozinho têm **escopo de coleção**. Uma consulta `collectionGroup` precisa de um índice explícito — e um **índice composto não satisfaz** uma consulta de campo único em collection group, nem o contrário. Existem hoje **três** consultas `collectionGroup` distintas, cada uma exigindo um índice diferente:

| Consulta | Onde | Índice necessário |
|---|---|---|
| CG `assemblerAssignments` where `paymentStatus ==` | `payment.service.ts:104` (financeiro admin) e `dashboard.service.ts:21` | Campo único `paymentStatus` ASC, **escopo collection group** |
| CG `assemblerAssignments` where `assemblerId ==` + `orderBy('dueAt')` | `assembler.service.ts:167` (painel do montador) | **Composto** CG: `assemblerId` ASC + `dueAt` ASC |
| CG `items` where `designerId ==` | `designer.service.ts:29` (fila do desenhista) | Campo único `designerId` ASC, **escopo collection group** |

O financeiro depende do **primeiro**, que no console é `Firestore → Indexes → Single field → Add exemption` com escopo *Collection group* — e **não** a aba `Composite`. É a confusão mais provável: o índice criado atende a outra consulta, e o financeiro segue pedindo o dele. Como nada disso está versionado (`firebase.json` só declara `rules`, não há `.firebaserc` nem `firestore.indexes.json`), não há como conferir o que existe de fato.

**Correção.**

1. **Simplificar antes de indexar.** `getAssemblerAssignments` já reordena em memória com `sortAssignmentsByDueDate`, então o `orderBy('dueAt', 'asc')` da query é redundante — e nocivo: `dueAt` é opcional, e `orderBy` **exclui silenciosamente** todo assignment sem esse campo. Remover o `orderBy` corrige esse bug latente e elimina de vez o índice composto.
2. **Versionar os índices** em `firestore.indexes.json` **(novo)**. `fieldOverrides` precisa reincluir os índices de escopo de coleção, porque declarar um override **substitui** o indexamento automático daquele campo — e `status.service.ts:68` consulta `paymentStatus` dentro da subcoleção de um único item. Omitir isso quebraria a liberação de pagamento.

```json
{
  "indexes": [],
  "fieldOverrides": [
    {
      "collectionGroup": "assemblerAssignments",
      "fieldPath": "paymentStatus",
      "indexes": [
        { "order": "ASCENDING",  "queryScope": "COLLECTION" },
        { "order": "DESCENDING", "queryScope": "COLLECTION" },
        { "order": "ASCENDING",  "queryScope": "COLLECTION_GROUP" }
      ]
    },
    {
      "collectionGroup": "assemblerAssignments",
      "fieldPath": "assemblerId",
      "indexes": [
        { "order": "ASCENDING",  "queryScope": "COLLECTION" },
        { "order": "DESCENDING", "queryScope": "COLLECTION" },
        { "order": "ASCENDING",  "queryScope": "COLLECTION_GROUP" }
      ]
    },
    {
      "collectionGroup": "items",
      "fieldPath": "designerId",
      "indexes": [
        { "order": "ASCENDING",  "queryScope": "COLLECTION" },
        { "order": "DESCENDING", "queryScope": "COLLECTION" },
        { "order": "ASCENDING",  "queryScope": "COLLECTION_GROUP" }
      ]
    }
  ]
}
```

3. `.firebaserc` **(novo)** com o `projectId`; `firebase.json` ganha `"firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" }`.
4. `package.json`: `"firebase:indexes": "firebase deploy --only firestore:indexes"`.
5. Depois do deploy, conferir no console que os três aparecem como **Enabled** (a construção leva alguns minutos) e que o `projectId` do `.firebaserc` é o mesmo do `NEXT_PUBLIC_FIREBASE_PROJECT_ID` do `.env` — se o índice foi criado em outro projeto, o sintoma é exatamente "criei e continua pedindo".
6. Apagar o comentário obsoleto de `designer.service.ts:20-24`, que manda criar o índice na mão.

**Testes:** `assembler.service.spec.ts` — assignment sem `dueAt` passa a aparecer na lista (regressão do `orderBy` removido).
**Commit:** `fix(projetos): versiona indices do firestore e corrige consultas de collection group`

**Validação da 2.0 (obrigatória antes de seguir):** criar usuário de cada papel pela UI e abrir `/administracao/financeiro-montadores`, `/montador` e `/desenhista` sem erro de índice.

---

### Etapa 2.1 — Nova máquina de status

Arquivos congelados da fundação (seção 3.1): mudam aqui, na branch base.

- `src/types/projects.ts`: novo union `ProjectItemStatus` (13 valores da seção 10.2).
- `src/utils/projects/status.ts`: `TRANSITIONS`, `INTERNAL_STATUS_LABELS`, `INTERNAL_STATUS_COLORS`, `CLIENT_STATUS_LABELS` (o cliente vê `aguardando_orcamento` como "Orçamento em preparação"; `aguardando_atribuicao_montador`, `aguardando_pagamento_montador` e `em_producao` colapsam em rótulos que não expõem operação interna).
- `src/services/projects/deadline.service.ts` + `src/types/projects.ts` (`DeadlineDefaults`): chaves passam a ser `desenhoDias`, `orcamentoDias` **(nova)**, `aprovacaoClienteDias`, `atribuicaoMontadorDias` **(nova)**, `producaoDias`, `montagemDias`. Saem `separacaoMateriaisDias` e `transporteDias`.
- `src/pages/administracao/configuracoes-prazos.tsx` + `src/utils/yup/deadlineDefaultsValidations.ts`: mesmos campos.
- `src/services/projects/summary.ts`: `emProducao` conta `em_producao` + `pronto_para_montagem`; `emMontagem` conta `montagem_concluida` + `aguardando_pagamento_montador`.

**Testes:** reescrever `src/tests/utils/projects/status.spec.ts` (fluxo feliz completo, cada bloqueio, override do admin, os 13 rótulos de cliente); atualizar `summary.spec.ts` e `deadline.service.spec.ts`.
**Commit:** `feat(projetos): reescreve maquina de status para o fluxo real da marcenaria`

### Etapa 2.2 — Orçamento pós-desenho

- `src/types/projects.ts`:

```ts
export interface ItemBudgetLine { id: string; description: string; amount: number; }

export interface ItemBudget {
  lines: ItemBudgetLine[];
  totalCost: number;                  // soma das linhas — custo interno
  customerAmount: number;             // valor cobrado do cliente
  suggestedAssemblerAmount: number;   // pré-preenche a atribuição do montador
  createdBy: string; createdByName: string;
  createdAt: Timestamp; updatedAt: Timestamp;
}
// ProjectItem.budget?: ItemBudget
```

- `src/services/projects/budget.service.ts` **(novo)**: `computeBudgetTotals(lines)` **puro**; `saveItemBudget(projectId, itemId, input, actor)` — só `admin`/`seller`, só com o item em `aguardando_orcamento`; `sendBudgetToClient(...)` move para `aguardando_aprovacao_cliente`.
- `src/components/projects/ItemBudgetForm.tsx` **(novo)**: linhas dinâmicas (`useFieldArray`), total calculado ao vivo, valor ao cliente, sugestão do montador.
- `src/pages/projetos/[projectId]/itens/[itemId].tsx`: painel de orçamento, visível a admin/vendedor, **oculto para desenhista e montador**.
- `src/services/projects/summary.ts`: `project.totalCustomerValue` = soma de `item.budget.customerAmount`.
- `src/components/assembler/AssignAssemblerModal.tsx`: `amountToReceive` nasce com `budget.suggestedAssemblerAmount`, editável.

**Anti-vazamento (crítico).** `ClientProjectItemDTO` troca `customerPrice` por `customerAmount`. `lines`, `totalCost` e `suggestedAssemblerAmount` são **custo interno** e não podem sair no DTO público — mesma classe de dado que `amountToReceive`. Atualizar `src/pages/api/client-access/project.ts`, `docs/gestao-projetos/SEGURANCA.md` e a asserção de campos proibidos em `src/tests/pages/api/client-access/project.spec.ts`.

**Testes:** `src/tests/services/projects/budget.service.spec.ts` (totais, linha zerada, item em status errado, papel sem permissão); `ItemBudgetForm.spec.tsx`; asserção do DTO.
**Commit:** `feat(projetos): adiciona orcamento por item apos o desenho`

### Etapa 2.3 — Campos do item e do projeto

- `ProjectItem`: removidos `finish`, `measurements`, `customerPrice`, `requiresDesigner`. Acabamento e medidas passam a viver nos anexos; o preço vive no orçamento.
- `src/components/projects/ProjectItemForm.tsx`: sobram nome, ambiente, material, descrição, observações.
- `src/utils/yup/projetosValidations.ts` + `src/tests/utils/yup/projetosValidations.spec.ts`: idem.
- `src/components/projects/ProjectForm.tsx`: **remove o select "Vendedor responsável"** (não há comissão). `createProject` passa a derivar `sellerId = actor.uid` e `sellerName = actor.name` da conta logada; `src/pages/projetos/novo.tsx` deixa de buscar a lista de vendedores.
- `src/utils/projects/permissions.ts`: `canAssignDesigner` passa a ser `admin || seller`.
- `AssignDesignerModal` e o detalhe do item deixam de depender de `requiresDesigner` — qualquer item pode receber desenhista.
- Detalhe do item: a seção "Dados técnicos" perde acabamento/medidas/preço e passa a apontar para os anexos.

**Testes:** `project.service.spec.ts` (vendedor derivado do ator), `projectItem.service.spec.ts`, `permissions.spec.ts`.
**Commit:** `refactor(projetos): remove campos de item movidos para anexos e orcamento`

### Etapa 2.4 — Nome da pessoa nos registros, não o papel

Hoje a timeline imprime `entry.changedByRole` (`ProjectItemTimeline.tsx:45`) — o usuário lê "admin" em vez de "Mateus".

- Campos desnormalizados (nome no momento da ação, imune a renomeação posterior):

| Tipo | Campo novo |
|---|---|
| `StatusHistory` | `changedByName` |
| `Attachment` | `uploadedByName` |
| `ProjectItemVersion` | `createdByName` |
| `AssemblerAssignment` | `assignedByName` |
| `AssemblerPayment` | `paidByName` |
| `Project` | `createdByName` (quem vendeu) |

- `StatusActor` vira `{ uid, name, role }`. Atualizar os chamadores: `status.service.ts`, `statusAdmin.service.ts` (ações do cliente gravam `changedByName = project.customerName` e `changedByRole = 'client'`), `pages/api/assembler/update-status.ts`, `attachment.service.ts`, `designer.service.ts`, `assembler.service.ts`, `payment.service.ts`.
- `src/utils/projects/status.ts`: `INTERNAL_ROLE_LABELS` (`admin` → "Administrador", …, `client` → "Cliente").
- `ProjectItemTimeline.tsx`: renderiza `{changedByName} · {rótulo do papel}`, com **fallback para o rótulo do papel** quando `changedByName` estiver ausente (documentos gravados antes desta etapa).

**Testes:** `ProjectItemTimeline.spec.tsx` (com nome, e fallback sem nome), `status.service.spec.ts` (grava `changedByName`).
**Commit:** `feat(projetos): registra o nome do autor no historico e nos anexos`

### Etapa 2.5 — Efeitos e integrações do novo fluxo

- `status.service.ts`: `releasePendingAssignments` deixa de disparar em `montagem_concluida` e passa a disparar em **`aguardando_pagamento_montador`**.
- `assembler.service.ts`: atribuir montador move o item de `aguardando_atribuicao_montador` → `em_producao`.
- `payment.service.ts`: registrar pagamento move o item para `finalizado` **quando todos os assignments daquele item** estiverem `pago`/`confirmado_pelo_montador` (um item pode ter mais de um montador).
- `pages/api/client-access/approve-item.ts` e `approve-all.ts`: aprovação do cliente leva a `aguardando_atribuicao_montador` (era `aprovado`).
- `pages/api/assembler/update-status.ts`: fluxo do montador vira `em_producao → pronto_para_montagem → montagem_concluida`.
- `pages/projetos/[projectId]/itens/[itemId].tsx`: botão **"Aprovar montagem"** (só admin, só em `montagem_concluida`).
- `services/projects/dashboard.service.ts` + `pages/projetos/dashboard.tsx`: cards passam a ser aguardando desenho, **aguardando orçamento**, aguardando aprovação, **aguardando montador**, em produção, montagem, **a pagar**, total vendido no mês.
- `components/client/ClientTrackingTimeline.tsx`: etapas do novo fluxo.

**Testes:** `status.service.spec.ts` (liberação de pagamento no status certo), `assembler.service.spec.ts`, `payment.service.spec.ts` (item só finaliza com todos os assignments pagos), `statusAdmin.service.spec.ts`, `update-status.spec.ts`, `dashboard.service.spec.ts`, `ClientTrackingTimeline.spec.tsx`.
**Commit:** `feat(projetos): liga os efeitos do fluxo novo (montador, pagamento, cliente)`

### Etapa 2.6 — Seed, documentação e regressão

- `scripts/seed-projetos.mjs`: novos status, itens sem os campos removidos, orçamentos preenchidos, `*ByName` populado.
- `CONTAS-SEED-TESTE.md`: revalidar depois de 2.0.1.
- `GUIA-NOVA-FEATURE.md`: reescrever as seções 1, 3, A2, A5, 6, 7 e 9 com o fluxo novo e **remover os blocos "O que mudar"** (viraram este plano).
- `especificacao.md`, `VIA-A-operacao-interna.md`, `VIA-B-cliente-montador-financeiro.md`: atualizar as tabelas de status.
- `firestore.rules`: o painel de orçamento é `admin`/`seller` — conferir que desenhista e montador não leem `item.budget`.
- Regressão: `npm test` + `npx tsc --noEmit` + `npm run build`, e o roteiro manual por papel da seção 10 do guia.

**Commit:** `chore(projetos): atualiza seed e documentacao para o fluxo novo`

---

### 10.3 Ordem de execução

`2.0` é bloqueante. `2.1` é a fundação das demais e toca arquivos congelados. `2.2` e `2.3` são independentes entre si e podem ir em paralelo depois de `2.1`. `2.4` é ortogonal e pode entrar a qualquer momento após `2.1`. `2.5` depende de `2.1`, `2.2` e `2.3`. `2.6` fecha.

```txt
2.0.1 ─┬─> 2.1 ─┬─> 2.2 ─┐
2.0.2 ─┘        ├─> 2.3 ─┼─> 2.5 ─> 2.6
                └─> 2.4 ─┘
```

Vale a **Definition of Done da seção 8** sem exceção: testes escritos e verdes, `npx tsc --noEmit` limpo, commit por etapa.

### 10.4 Riscos

1. **Dados existentes com status antigos.** O plano assume re-seed. Confirmar que não há projeto real no banco antes de rodar a 2.1; se houver, `scripts/migrate-status.mjs` primeiro.
2. **Vazamento de custo pelo DTO do cliente.** `ItemBudget.lines`/`totalCost`/`suggestedAssemblerAmount` são a informação mais sensível do sistema depois do `amountToReceive`. A asserção de campos proibidos em `project.spec.ts` é a rede de proteção — não deixar para a 2.6.
3. **`fieldOverrides` que apagam índices automáticos.** Declarar um override substitui o indexamento automático do campo. Se os índices de escopo `COLLECTION` forem omitidos, a liberação de pagamento (`status.service.ts:68`) para de funcionar em silêncio.
4. **`em_transporte`/`em_montagem` removidos.** Se depois faltar granularidade no acompanhamento do montador, reintroduzir como sub-etapas do painel do montador, não como status do fluxo comercial.
