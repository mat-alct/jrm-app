# Plano — Novo fluxo do vendedor, fila de desenho e anexos por audiência

> Criado em 2026-07-17, branch `feat/gestao-projetos`. Execução faseada, dirigida por testes
> (TDD), **um commit por etapa**. Antes de implementar qualquer fase, ler
> `docs/gestao-projetos/GUIA-NOVA-FEATURE.md` (tabela "Testes obrigatórios por camada") e
> `docs/PLANO-DE-TESTES.md` §2 (princípios anti-"teste em volta"). Prova de fogo
> obrigatória ao final de cada fase.

---

## 1. Objetivo

Reformular o fluxo do módulo de projetos:

1. **Cadastro básico do cliente** — o vendedor cria o cadastro só com identificação e
   telefone; o cadastro abre imediatamente e só então itens podem ser adicionados.
2. **Itens adicionados no detalhe do projeto** (hoje só existem na criação) e **fim dos
   anexos gerais** — todo anexo pertence a um item.
3. **Novo modelo de anexos**: anexo é para todos por padrão (cliente incluído); ao anexar
   há checkboxes para **desselecionar** quem não deve ver; admin pode editar depois.
4. **Aprovação por item para desenho** — ação explícita do vendedor/admin, desacoplada da
   atribuição de desenhista.
5. **Fila compartilhada de desenhos** com "Assumir" (claim) pelo desenhista e atribuição
   pelo admin (Renato / Marcio / campo "Outros"), exibida como aba em "Listar projetos".
6. **Pedir mais informações** — desenhista devolve o item ao vendedor com justificativa;
   aba de **notificações** no cadastro do projeto.
7. **Visibilidade do vendedor** — vê todos os cadastros na lista; a partir da atribuição
   do montador, vê apenas o status do pedido.
8. Admin pode fazer tudo que o vendedor faz (já é o padrão do módulo).

## 2. Decisões já tomadas (respostas do Mateus — não reabrir)

| Tema | Decisão |
|---|---|
| Fila de desenho | Compartilhada; desenhista pode **assumir** um desenho — o item continua na lista com "Atribuído a …". Admin atribui via duas opções fixas **"Renato"** e **"Marcio"** + campo vazio com placeholder **"Outros"**; o nome digitado aparece no "Atribuído a". |
| Cliente nos anexos | **Marcado por padrão** na lista de seleção de audiência. |
| Corte de visão do vendedor | A partir do momento em que o **montador é atribuído** ao item. |
| Lista de cadastros | Vendedor vê **todos** os cadastros (remove o filtro `sellerId` atual). |

## 3. Decisões de design desta rodada (vetáveis antes de implementar)

- Novo status: **`aguardando_informacoes`** (interno: "Aguardando informações"; rótulo
  para o cliente: neutro, ex. "Em desenvolvimento" — não vazar detalhe interno).
- Audiência do anexo: campo **`audience: { seller, designer, assembler, client }`**
  (booleans, todos `true` por padrão). Admin sempre vê tudo. Substitui
  `visibility: AttachmentVisibility` e o derivado `clientVisible`.
- Para **enviar versão de desenho** o desenhista precisa ter **assumido** o item (evita
  dois desenhistas trabalhando no mesmo desenho). Qualquer desenhista pode abrir o item
  da fila para avaliar os anexos antes de assumir.
- "Renato"/"Marcio" viram constante `DESIGNER_QUICK_OPTIONS`; se o nome informado casar
  com usuário ativo de papel `designer`, grava também `designerId`; senão grava apenas
  `designerName` (o claim pelo login do desenhista sempre grava `designerId`).
- `customerEmail` e `customerAddress` viram **opcionais** — editáveis depois no detalhe
  do projeto (endereço é necessário antes de atribuir montador; validar nesse momento).
- Projeto pode existir **sem itens** (criado vazio, itens entram depois).
- **Sem migração de dados**: a branch não está em produção; basta atualizar seeds e
  factories junto com cada mudança de modelo.

## 4. Estado atual relevante (verificado no código em 0ada860)

- `src/types/projects.ts`: `Project` com `customerName/Phone/Email/Address` todos
  obrigatórios; `Attachment.visibility: 'internal'|'client'|'designer'|'assembler'` +
  `clientVisible`; `ProjectItem.designerId?`; 13 status em `ProjectItemStatus`.
- Criação (`src/pages/projetos/novo.tsx` + `ProjectForm`): formulário único com dados
  completos do cliente **e** mínimo de 1 item; não existe UI de adicionar item depois.
- "Aprovar para desenho" **não existe** como ação — está fundida em
  `AssignDesignerModal` (atribui desenhista + transiciona para `aguardando_desenho`).
- Fila do desenhista (`/desenhista` + `getDesignerQueue`): collectionGroup `items` com
  `designerId == uid` — só itens já atribuídos.
- Anexos: nível projeto ("Anexos do projeto", sem `itemId`) e nível item; audiência por
  enum único escolhido num `<select>` no `AttachmentUploader`.
- Enforcement de anexos em **3 lugares que precisam andar juntos**:
  `canViewAttachment` (`src/utils/projects/permissions.ts`), `firestore.rules`
  (bloco de item attachments) e `storage.rules`.
- Vendedor hoje: lista filtrada por `sellerId`, mantém acesso total ao item em todas as
  fases, não tem botões de status.
- Sem notificações; único histórico é `statusHistory` + `ProjectItemTimeline`.
- Testes: 5 camadas com Firebase Emulator (`demo-jrm`); tabelas independentes em
  `src/tests/utils/projects/statusMatrix.spec.ts` e `permissionsMatrix.spec.ts` (com
  meta-teste que varre `src/pages` exigindo entrada em `PAGE_ACCESS`); guardrail
  `scripts/check-test-coverage-map.mjs`; seed canônico em
  `src/tests/helpers/seedEmulator.ts` + `factories.ts`; e2e em `e2e/real/*`.

---

## 5. Fases de execução

Cada fase segue o mesmo ritual:

1. **Vermelho** — escrever/adaptar os testes da fase primeiro e vê-los falhar.
2. **Verde** — implementar até a suíte da fase passar.
3. Rodar as camadas afetadas (`npm run test`, `test:rules`, `test:integration`,
   `test:e2e` conforme a tabela do GUIA-NOVA-FEATURE).
4. **Prova de fogo** — sabotar o código de produção indicado na fase, confirmar teste
   vermelho, reverter, confirmar verde.
5. **Commit** com a mensagem sugerida.

### Fase 0 — Baseline ✅ (2026-07-17)

- [x] `npm run test:all` verde na branch antes de qualquer mudança (registrar números).
      Números: typecheck OK; guardrails OK; unit **1222/1222** (111→112 suites, 1 spec
      corrigido); rules 24/24; integration **69/69**; e2e **64/64** (7.1min).
      Achado e corrigido no caminho (bug pré-existente, não relacionado ao plano):
      `src/tests/pages/cliente/index.spec.tsx` mockava `next/router` sem `isReady`,
      e o componente usa `disabled={!router.isReady}` no login do portal — deixava os
      2 testes do arquivo permanentemente vermelhos. Adicionado `isReady: true` ao mock.
- [x] Commit deste plano.
- Commit: `docs(projetos): planeja novo fluxo de vendedor, fila de desenho e anexos`

### Fase 1 — Cadastro básico do cliente ✅ (2026-07-17)

**Objetivo:** criar projeto só com nome + telefone; demais dados opcionais, editáveis no
detalhe; sem itens na criação; redirecionar para o detalhe (já acontece hoje).

- [x] Types: `customerEmail`/`customerAddress` opcionais em `Project` e
      `CreateProjectInput` (`src/types/projects.ts`, `src/services/projects/project.service.ts`).
- [x] `assertCreateProjectInput` exige só nome+telefone; `createProjectSchema`
      (`src/utils/yup/projetosValidations.ts`) idem, **remove** `items` do schema de criação.
- [x] `novo.tsx` + `ProjectForm`: formulário reduzido (nome, telefone); remover
      `useFieldArray` de itens e o loop de `createProjectItem` do submit.
- [x] Detalhe do projeto: card "Dados do cliente" ganha "Editar" (admin/vendedor) para
      completar e-mail/endereço via `updateProject` (já existe). Implementado em
      `EditCustomerDataModal.tsx`.
- [x] Atribuição de montador passa a validar endereço preenchido (mensagem clara).
- [x] Denormalizações que assumem endereço/email (`AssemblerAssignment.customerAddress`
      já era opcional; nenhuma outra mudança necessária).
- Testes: `project.service` (unit+integração), yup, `ProjectForm.spec`,
  `EditCustomerDataModal.spec`, `assembler.service` (validação de endereço).
  Fases 1+2 combinadas num único ciclo de execução para manter o e2e sempre verde
  (ver nota da Fase 2).
- Prova de fogo: removida a exigência de telefone no schema → spec do yup foi a
  vermelho (`Resolved to value` em vez de rejeitar); revertido, verde de novo.
- Commit: `feat(projetos): cadastro basico do cliente com dados opcionais`

### Fase 2 — Itens adicionados no detalhe do projeto ✅ (2026-07-17)

**Objetivo:** "Adicionar item" no `/projetos/[projectId]` (admin/vendedor); projeto pode
estar vazio.

- [x] Reaproveitar `ProjectItemForm` num modal "Adicionar item" no detalhe
      (`AddProjectItemModal.tsx`), usando `useCreateProjectItem`.
- [x] Estado vazio da lista de itens (já existia: "Nenhum item cadastrado.").
- [x] Rules: create de item já era admin|seller — confirmado, sem mudança.
- Testes: `AddProjectItemModal.spec` (component); `projectItem.service` integração já
  cobria create + recálculo de summary; e2e `project-lifecycle.spec.ts` reescrito:
  cria cadastro básico → completa e-mail/endereço pelo "Editar" → abre detalhe →
  adiciona 2 itens pelo modal → verifica docs + `itemSummary` no emulador (dupla
  verificação). `e2e/real/permissions.spec.ts` conferido (só checa rotas, sem
  dependência de campos — não precisou de ajuste).
- Resultados: unit 1235/1235, rules 24/24, integration 70/70, e2e 64/64.
- Prova de fogo: `summary.total += 0` em `computeItemSummary` → `summary.spec.ts`
  foi a vermelho (2 casos); revertido, verde de novo.
- Commit: `feat(projetos): adiciona itens pelo detalhe do projeto`

### Fase 3 — Fim dos anexos gerais ✅ (2026-07-17)

**Objetivo:** todo anexo pertence a um item; remover o nível de projeto.

- [x] `attachment.service.ts`: `itemId` obrigatório; removido o branch de projeto em
      `uploadAttachment`/`listAttachments`; `paths.ts`: removidos os paths de
      `projects/{id}/attachments` e `general/` no Storage. `attachmentAdmin.ts` e
      `attachmentHooks.ts` também simplificados (sem branch opcional).
- [x] UI: removida a seção "Anexos do projeto" do `[projectId]/index.tsx`;
      `AttachmentUploader`/`AttachmentList` com `itemId` agora obrigatório.
- [x] `firestore.rules`: removido o match de `projects/{projectId}/attachments`
      (vira default-deny); `storage.rules`: removida a regra de `general/`.
- [x] `Attachment.itemId` deixou de ser opcional nos types.
- Testes: `attachment.service` integração (removido o caso project-level; caso de
  delete migrado para item); rules specs (`projects/*/attachments` e
  `projects/{id}/general/*` viram asserções de negação para todos os papéis, inclusive
  admin); `AttachmentUploader`/`AttachmentList`/`attachmentAdmin` specs com `itemId`
  obrigatório; `dataHooks.spec.tsx` (`useAttachments`/`useUploadAttachment`/
  `useDeleteAttachment` sem o caso "sem item"); `factories.ts` (`buildAttachment` com
  `itemId`); `emulator.smoke.spec.ts` migrado para path de item (usava `general/`
  incidentalmente); `paths.spec.ts` sem os testes de path de projeto; e2e
  `project-lifecycle.spec.ts` (upload movido para a página do item) e
  `error-paths.spec.ts` (os dois testes de upload navegam para o item em vez do
  projeto).
- Resultados: unit 1232/1232, rules 24/24, integration 69/69, e2e 64/64.
- Prova de fogo: reintroduzido o `allow` removido em `firestore.rules` → rules spec
  foi a vermelho ("Expected request to fail, but it succeeded"); revertido, verde de
  novo.
- Commit: `refactor(projetos): remove anexos gerais do projeto`

### Fase 4 — Anexos por audiência com desseleção ✅ (2026-07-17)

**Objetivo:** anexo é para todos por padrão (cliente incluído); desselecionar no upload;
admin edita depois. Sem campo "para quem é".

- [x] Types: `Attachment.audience: { seller: boolean; designer: boolean;
      assembler: boolean; client: boolean }`; removidos `visibility`, `clientVisible` e o
      tipo `AttachmentVisibility`.
- [x] `uploadAttachment`: default tudo `true` (`DEFAULT_ATTACHMENT_AUDIENCE`); grava
      `audience` recebido do form.
- [x] Novo `updateAttachmentAudience(projectId, itemId, attachmentId, audience)` —
      admin-only (client SDK; rules update já eram admin-only).
- [x] `canViewAttachment(audience, roles)` em `permissions.ts`: admin → sempre; senão
      `true` se algum papel do usuário tem `audience[papel] === true`.
- [x] Portal do cliente: filtra por `audience.client` (`src/pages/api/client-access/project.ts`).
- [x] `AttachmentUploader`: removido o `<select>` de visibilidade; checkboxes "Quem pode
      ver" (Vendedor, Desenhista, Montador, Cliente) todas marcadas por padrão.
- [x] `AttachmentList`: badge de exclusões ("Oculto para: Montador"); "Editar
      visibilidade" só para admin, com painel inline de checkboxes + Salvar/Cancelar.
- [x] `submitDesignerVersion` e fotos de montagem do montador: audiência default
      (tudo `true`, sem `visibility` fixo).
- [x] `firestore.rules`: leitura por `audience.<papel> == true` (com acesso seguro via
      `.get(chave, default)` — ver achado abaixo); create valida shape do `audience`
      (`isValidAudienceShape`, 4 chaves booleanas). `storage.rules` não mudou — já era
      agnóstico a visibilidade/audiência antes da Fase 4 (limitação pré-existente, fora
      de escopo).
- Testes: `permissionsMatrix.spec.ts` reescrita (audiência × papel);
  `attachment.service.spec` (unit + integração, round-trip com audience);
  `AttachmentUploader`/`AttachmentList` component specs (checkboxes default marcadas,
  desselecionar Montador, editar audiência como admin); `updateAttachmentAudience`
  (unit + integração); rules firestore (permitido + negados por papel desselecionado,
  shape inválido); portal do cliente (`clientAccess.spec.ts` + `client-access/project.spec.ts`
  migrados para `audience`); `dataHooks.spec.tsx`, `factories.ts`, `designer.service.spec.ts`
  (unit + integração) migrados.
- Resultados finais: unit 1231/1231, rules 26/26, integration 71/71, e2e 64/64.
- Prova de fogo: `DEFAULT_ATTACHMENT_AUDIENCE` invertido para tudo `false` → 3 specs de
  `AttachmentUploader` foram a vermelho; revertido. Removida a checagem de
  `audience.assembler` na rule de leitura → rules spec foi a vermelho; revertido.
- **Achado importante (fora do escopo desta fase, registrado para trabalho futuro):**
  `listAttachments` (usado por `useAttachments` e pela página do montador) faz uma
  query Firestore **sem `where`** na subcoleção de anexos do item. O Firestore não
  consegue provar a segurança de um `list()` sem filtro quando a regra depende de
  conteúdo do documento (`resource.data.audience.<papel>`) para papéis não-admin/
  vendedor — a consulta inteira é negada para desenhista/montador sempre que a
  subcoleção não estiver vazia, mesmo com a regra correta. Confirmado que essa mesma
  limitação já existia no modelo antigo (`visibility`) antes da Fase 3/4 — nunca foi
  pega porque o seed nunca populava anexos de item. Corrigido nesta fase apenas o
  acesso inseguro ao campo (`.get(chave, {})` em vez de acesso direto, evitando um
  crash de avaliação), mas a negação de `list()` em si permanece. **Fix correto exigiria
  reestruturar `listAttachments` para usar `where('audience.<papel>', '==', true)`
  quando o papel não for admin/vendedor** — escopo de uma fase própria, não Fase 4.
- Commit: `feat(projetos): anexos com audiencia padrao total e desselecao`

### Fase 5 — Aprovação para desenho + fila compartilhada com claim ✅ (2026-07-17)

**Objetivo:** desacoplar aprovação de atribuição; fila única de desenhos pendentes.

- [x] Nova ação `approveItemForDesign(projectId, itemId, actor)` (`designer.service.ts`,
      admin/vendedor via `canAssignDesigner`): computa `deadlineCurrent` e chama
      `updateItemStatus(...,'aguardando_desenho',...)` (validação `projeto_criado →
      aguardando_desenho` já embutida em `canTransition`), **não** mexe em designer.
      Botão "Aprovar para desenho" no item, visível só quando `status===projeto_criado`.
- [x] Fila compartilhada: `getDesignQueue()` = collectionGroup `items` com
      `status in ['aguardando_desenho','alteracao_solicitada']` (itens assumidos
      continuam na lista, com badge "Atribuído a {designerName}" ou "Atribuído a você").
      `firestore.indexes.json`: substituído o fieldOverride `items.designerId` (não usado
      por nenhuma query mais) por `items.status`; `firestoreIndexes.spec.ts` atualizado.
- [x] Claim: `claimDesignItem` grava `designerId/designerName` do próprio uid **somente
      se vazio**, via `runTransaction` (evita corrida real, não só checagem otimista).
      Rule `isValidDesignClaim()`: designer só atualiza quando `designerId` está ausente,
      `null` ou `''`, só grava o próprio uid, e só nesses 4 campos.
- [x] Atribuição pelo admin: `AssignDesignerModal` reescrito — `DESIGNER_QUICK_OPTIONS =
      ['Renato','Marcio']` preenchem um campo de texto único (também aceita "Outros"
      livre); `assignDesignerByName` casa por nome (case-insensitive) com um desenhista
      ativo → grava `designerId+designerName`; sem match → só `designerName`, limpando
      `designerId` anterior com `deleteField()`. Sem transição de status.
- [x] `DesignerUploadPanel`: condição inalterada (`item.designerId === uid`); "Atribuir
      desenhista" só aparece quando `status !== 'projeto_criado'` (depois de aprovado).
- [x] Rules: `get`/`list` de item por designer ampliado — item na fila (mesmo sem
      atribuição) fica legível para qualquer desenhista ativo, além dos já atribuídos;
      leitura de anexos do item na fila também ampliada (`audience.designer`); rule de
      `list` do collection-group `items` ganhou o branch de status de fila.
- Testes: unit `approveItemForDesign`/`claimDesignItem` (corrida via transação
  simulada)/`assignDesignerByName`; integração `designer.service` (fila,
  aprovação, claim, atribuição por nome — todas contra o emulador real); rules
  (leitura ampliada, claim válido/inválido, shape do update, collection-group);
  `AssignDesignerModal.spec.tsx` reescrito para o novo formato; `designer-queue.spec.ts`
  e2e invertido (fila toda visível, "Atribuído a", claim funcional);
  `project-lifecycle.spec.ts` e2e: aprovar para desenho → atribuir por nome (cobre a
  atribuição do admin); `designer-queue.spec.ts` cobre separadamente o self-claim pelo
  desenhista — a jornada "aprova → desenhista assume → envia versão" ficou dividida
  entre os dois arquivos em vez de um único teste, mas com a mesma cobertura.
  `deadline-settings.spec.ts` também migrado (deadline agora é setado na aprovação, não
  na atribuição).
- Resultados finais: unit 1239/1239, rules 29/29, integration 76/76, e2e 65/65.
- Armadilhas encontradas e corrigidas no caminho (não eram regressões, mas bloqueavam
  os testes novos): (1) `designerId: null` (usado em vários setups de teste) não batia
  com a checagem `== ''` da regra de claim — regra ajustada para tratar ausente/null/
  vazio como equivalentes; (2) dois specs e2e usavam `getByText('Aguardando desenho')`
  para sincronizar após a aprovação, mas esse texto também aparece nos botões de
  "Alterar status" (sempre visíveis para admin) — trocado por polling direto no
  Firestore ou por `toHaveCount(0)` no botão "Aprovar para desenho".
- Prova de fogo: guard de corrida do claim desativado (`if (false && ...)`) → spec
  unit foi a vermelho; revertido.
- Commit: `feat(projetos): aprovacao para desenho e fila compartilhada com claim`

### Fase 6 — Aba "Desenhos pendentes" em Listar projetos ✅ (2026-07-17)

**Objetivo:** `/projetos` com abas; desenhista passa a usar essa tela.

- [x] `/projetos` (index) reescrito com `Tabs.Root/List/Trigger/Content` do Chakra v3:
      aba **"Projetos"** (admin/vendedor) e **"Desenhos pendentes"** (admin/desenhista,
      reaproveitando `DesignerQueue`+`useDesignQueue`+`useClaimDesignItem` da Fase 5).
      Desenhista vê só a segunda aba (nenhuma aba "Projetos" renderizada, não só
      escondida); admin vê as duas, com "Projetos" selecionada por padrão.
- [x] Clique num item da fila abre `/projetos/[projectId]/itens/[itemId]` (já herdava
      acesso por audiência da Fase 4/5, sem mudança adicional aqui).
- [x] `PAGE_ACCESS['/projetos']` → `['admin','seller','designer']`;
      `getDefaultRouteForRoles`: designer → `/projetos`. **Removida** a página
      `/desenhista` (em vez de redirect) — sem sobra de rota morta; `EXPECTED_ACCESS`
      e o `PAGE_ACCESS` real ajustados juntos (o meta-teste de páginas exige isso).
- [x] Sidebar: link único "Listar projetos" agora serve todos os papéis com acesso;
      removida a entrada separada "Minha fila" (e o ícone `FaPencilRuler`, sem mais uso).
- Testes: `permissionsMatrix.spec.ts` (`EXPECTED_ACCESS`, tabela de precedência de
  `getDefaultRouteForRoles`); novo `AccessGate.spec.tsx` ajustado (redirect do designer
  agora é `/projetos`); novo `src/tests/pages/projetos/index.spec.tsx` (3 casos: admin
  vê as duas abas, vendedor só "Projetos", desenhista só "Desenhos pendentes" com a
  fila e sem o botão "Novo Projeto"); e2e `permissions.spec.ts` (desenhista cai em
  `/projetos`, só a aba de desenhos, sidebar sem `/projetos/novo`), `designer-queue.spec.ts`,
  `project-lifecycle.spec.ts` e `admin-users.spec.ts` migrados de `/desenhista`/"Minha Fila"
  para `/projetos`/aba "Desenhos pendentes".
- Resultados finais: unit 1237/1237, rules 29/29, integration 76/76, e2e 65/65.
- Prova de fogo: gate da aba "Projetos" fixado em `true` (visível para todo mundo,
  inclusive desenhista) → `index.spec.tsx` foi a vermelho (o teste do desenhista
  falhou ao não achar a aba ausente); revertido.
- Commit: `feat(projetos): aba de desenhos pendentes em listar projetos`

### Fase 7 — Pedir mais informações + aba de notificações ✅ (2026-07-17)

**Objetivo:** desenhista devolve o item com justificativa; vendedor vê notificação,
anexa e reaprova.

- [x] Novo status `aguardando_informacoes` em `ProjectItemStatus` + rótulos/cores
      (interno e cliente — rótulo do cliente neutro).
- [x] `TRANSITIONS`: `aguardando_desenho → aguardando_informacoes` (desenhista, com
      `note` obrigatória) e `aguardando_informacoes → aguardando_desenho`
      (vendedor/admin, via "Aprovar para desenho" recomputando prazo).
- [x] Atualizar a tabela independente de `statusMatrix.spec.ts` (13→14 status) — todo o
      resto da matriz continua valendo.
- [x] Botão "Pedir mais informações" no item (desenhista que assumiu, status
      `aguardando_desenho`) com textarea de justificativa obrigatória.
- [x] Novo `notification.service.ts`: subcoleção `projects/{projectId}/notifications`
      `{ itemId, itemName, type: 'info_solicitada', message, createdBy, createdByName,
      createdByRole, resolvedAt?, createdAt }`. Criada ao pedir informações; marcada
      resolvida ao reaprovar o item.
- [x] Detalhe do projeto ganha abas ("Visão geral" / "Itens" / "Notificações") com
      badge de não-resolvidas na aba.
- [x] Rules: notifications — read admin|seller; create designer|admin (payload
      validado); update (resolver) admin|seller; delete admin. O claim continua valendo
      quando o item volta para a fila (`designerId` mantido → "Atribuído a").
- [x] Guardrail: novo service referenciado por spec (o
      `check-test-coverage-map.mjs` falha sozinho se esquecer).
- Testes: unit das transições novas (+ note obrigatória); integração do
  `notification.service` (criar/listar/resolver, round-trip emulador); rules
  allow/deny; component (botão do desenhista com justificativa; aba com badge); e2e
  ciclo completo: desenhista pede info → vendedor vê notificação no cadastro → anexa
  documento → "Aprovar para desenho" → item volta à fila com o mesmo "Atribuído a" e a
  notificação some do badge (dupla verificação no emulador).
- Prova de fogo: permitir a transição sem `note` → unit vermelho; sabotar o resolve da
  notificação → integração vermelha.
- Resultados: typecheck e guardrails OK; unit **1308/1308**; rules **33/33**;
  integração **82/82**; e2e do ciclo completo **1/1**. Provas de fogo executadas: ao remover a
  validação da justificativa, `status.service.spec.ts` ficou vermelho; ao neutralizar
  `resolveNotificationsForItem`, o teste de integração ficou vermelho; ambas as
  sabotagens foram revertidas e os testes direcionados voltaram a verde.
- Commit: `feat(projetos): pedido de informacoes pelo desenhista com notificacoes`

### Fase 8 — Visibilidade do vendedor

**Objetivo:** (a) vendedor vê todos os cadastros; (b) após montador atribuído, só o
status.

- [ ] (a) `/projetos` index: remover `sellerOnly`/filtro `sellerId` (rules já permitem
      leitura de todos os projetos por seller). `listProjects` mantém o filtro como
      opcional para o dashboard.
- [ ] (b) `ProjectItem.assemblerAssignedAt?: Timestamp` — gravado em
      `assignAssemblers`. Novo helper puro `isSellerLocked(item)` em `permissions.ts`
      (true quando `assemblerAssignedAt` presente e o papel efetivo é só vendedor —
      admin nunca é travado).
- [ ] UI do item para vendedor travado: renderizar apenas identificação (nome,
      ambiente) + badge de status. Sem anexos, orçamento, versões, montadores,
      histórico.
- [ ] Detalhe do projeto: cards de item continuam com badge de status (ok).
- [ ] Rules: leitura de `attachments` e `versions` do item negada para seller quando o
      doc do item tem `assemblerAssignedAt` (o doc do item em si continua legível — o
      status vem dele; campos como `budget` ficam ocultos **apenas via UI**, limitação
      documentada: Firestore rules não filtram campos).
- Testes: unit de `isSellerLocked`; adaptação da matriz de permissões; component/page
  spec do item travado (vendedor vê só status; admin vê tudo); integração
  `assembler.service` grava o timestamp; rules (seller negado em attachments/versions
  pós-atribuição, admin permitido); e2e: admin atribui montador → vendedor abre o item
  e vê apenas o status → lista de projetos do vendedor mostra cadastros de outros
  vendedores.
- Prova de fogo: fazer `isSellerLocked` retornar sempre `false` → component e rules
  specs vermelhos.
- Commit: `feat(projetos): vendedor ve todos os cadastros e so status apos montador`

### Fase 9 — Consolidação

- [ ] `npm run test:all` completo verde (typecheck, guardrails, unit, rules,
      integração, e2e) — comparar contagens com a baseline da Fase 0.
- [ ] Atualizar docs: `docs/gestao-projetos/especificacao.md` (§12 visibilidade de
      anexos, fluxo de status), `PLANO.md`, `ROTEIRO-DE-TESTES-PROJETOS.md` (roteiros
      manuais refletem o fluxo novo), `CONTAS-SEED-TESTE.md` + `scripts/seed-projetos.mjs`
      (seed manual espelha o novo modelo).
- [ ] Deploy de índices se mudaram (`npm run firebase:indexes`).
- [ ] Prova de fogo final: sabotar `canViewAttachment` e `canTransition` → confirmar
      que rules + unit + e2e acusam; reverter.
- Commit: `docs(projetos): atualiza especificacao e roteiros para o fluxo novo`

---

## 6. Regras transversais

- **Ordem das fases importa**: 1→2 (criação sem itens depende do add no detalhe),
  3→4 (modelo de audiência já nasce só em item), 5→6→7 (fila antes da aba, aba antes
  das notificações). Se preferir e2e sempre verde em cada commit, tratar 1+2 como uma
  fase única de PR.
- **Seed e factories acompanham o modelo**: qualquer mudança em types quebra
  `seedEmulator.ts`/`factories.ts` — atualizar no mesmo commit.
- **Matrizes independentes**: `statusMatrix.spec.ts` e `permissionsMatrix.spec.ts` têm
  tabelas próprias de propósito; atualizar a tabela **e** conferir que a suíte fica
  vermelha se só um dos lados mudar.
- **Três pontos de enforcement de anexos** (`permissions.ts`, `firestore.rules`,
  `storage.rules`) mudam juntos nas fases 4, 5 e 8 — cada um com seu teste.
- Proibições vigentes: `waitForTimeout`, `.only`, `page.route` fora de
  `error-paths.spec.ts`, mock de Firebase em teste de service/API.
- Commits em pt-BR seguindo o padrão da branch (`feat(projetos): ...`), um por fase;
  fases grandes (4, 5, 7) podem ter commits intermediários desde que cada um deixe a
  suíte da camada tocada verde.
