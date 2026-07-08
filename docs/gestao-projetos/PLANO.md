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
