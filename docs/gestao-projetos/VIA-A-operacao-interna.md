# Via A — Operação Interna (admin, vendedor, desenhista)

> Branch: `feat/gestao-projetos-via-a` · Base: `feat/gestao-projetos` (fundação concluída)
> Regras de convivência e Definition of Done: [PLANO.md](./PLANO.md) (seções 3 e 8)

Toda etapa termina com: testes novos passando (`npm test`), `npx tsc --noEmit` limpo e commit. Marcar o checkbox só depois do commit.

---

## [ ] A1 — Usuários e papéis

**Objetivo:** existir a coleção `users` com papéis, e o admin conseguir criar/gerenciar usuários internos (spec seções 3, 4 e 14.1).

**Entregas**
- `src/pages/api/admin/users.ts`: handler (POST cria usuário no Firebase Auth via `adminAuth` + doc em `users/{uid}` com roles; PATCH edita roles/ativo/nome). Autorização: valida cookie de sessão e exige role `admin` no doc do chamador.
- `src/services/projects/adminUsers.ts`: client wrapper das chamadas à API + `useUsers`/`useUsersByRole` (React Query) para listar usuários (leitura direta do Firestore, permitida a internos).
- `src/pages/administracao/usuarios.tsx`: listagem, criação (nome, e-mail, telefone, senha inicial, roles múltiplos), ativar/desativar. Gate: só admin (via `useAppUser` da fundação).
- `src/utils/yup/usuariosValidations.ts`.
- Sidebar: link "Usuários" na seção Administração.
- Migração manual documentada: criar doc `users/{uid}` com role `admin` para os usuários existentes (instrução no cabeçalho da página ou no seed).

**Testes**
- Handler da API com `req`/`res` mockados e `firebase-admin` mockado: método inválido, sem sessão, sem role admin, criação feliz, e-mail duplicado.
- Validações Yup (roles obrigatórios, e-mail válido).
- Componente do formulário: render + erro de validação (Testing Library).

**Commits sugeridos**
- `feat(projetos): adiciona api de gestao de usuarios com papeis`
- `feat(projetos): adiciona pagina de administracao de usuarios`

---

## [ ] A2 — Services de projeto e itens

**Objetivo:** CRUD completo de `projects` e `projects/{id}/items` com resumo automático (spec seções 14.2, 14.3, 16.1, 16.2).

**Entregas**
- `src/services/projects/project.service.ts`: `createProject` (valida obrigatórios), `updateProject`, `listProjects` (filtros básicos: vendedor, busca por nome), `getProject`. **Não gera credenciais do cliente** — hash scrypt só roda em Node; a geração é a rota `provision` da Via B, integrada no CP1.
- `src/services/projects/projectItem.service.ts`: `createProjectItem` (status inicial `projeto_criado` (Fase 2), `clientApprovalStatus: 'aguardando'`), `updateProjectItem`, `listProjectItems`; toda escrita dispara `recalculateProjectSummary` (fundação).
- Hooks React Query: `useProjects`, `useProject`, `useProjectItems` (+ mutations com invalidação por queryKey `['projects']`, `['projects', id, 'items']`).

**Testes**
- Funções puras: validação de criação (campos obrigatórios da spec 16.1), montagem do doc (defaults, timestamps), soma de `totalCustomerValue`.
- Services com `firebase/firestore` mockado: criação feliz, update parcial, recálculo do resumo chamado após escrita.

**Commits sugeridos**
- `feat(projetos): adiciona services de projeto e itens com resumo automatico`

---

## [ ] A3 — Páginas de projetos

**Objetivo:** vendedor cria e acompanha projetos; admin vê tudo (spec seções 16.1, 16.2, 24).

**Entregas**
- `src/pages/projetos/index.tsx`: lista com busca por cliente, filtro por status agregado e badge de atraso (`isDelayed`), respeitando o padrão visual de `listadecortes` (tabela desktop + cards mobile, mas componentes separados carregados por breakpoint — não `display: none`).
- `src/pages/projetos/novo.tsx`: form do cliente (nome, telefone, e-mail, endereço, vendedor) + itens dinâmicos (ambiente, material, acabamento, medidas, descrição, observações, preço, `requiresDesigner`) com react-hook-form `useFieldArray` + Yup. Exige ≥ 1 item.
- `src/pages/projetos/[projectId]/index.tsx`: dados do cliente, cards de resumo (`itemSummary`), lista de itens com `ProjectItemStatusBadge`. Reservar seção "Acesso do cliente" — o `ClientAccessPanel` (Via B) entra aqui no CP1.
- `src/pages/projetos/[projectId]/itens/[itemId].tsx`: detalhe do item — status atual + ações de transição permitidas ao papel (usa `canTransition` + `updateItemStatus` da fundação), timeline de `statusHistory`, dados técnicos. **Este arquivo é o ponto de integração do CP2 — deixar seções claras.**
- Componentes: `src/components/projects/{ProjectForm,ProjectItemForm,ProjectItemCard,ProjectItemStatusBadge,ProjectItemTimeline,ProjectSummaryCards}.tsx`.
- Sidebar: seção "Projetos" (Novo projeto, Listar projetos).
- Gate de páginas por papel (`useAppUser`): admin/vendedor.

**Testes**
- `ProjectItemStatusBadge` (mapa de cores/labels), `ProjectItemTimeline` (ordena histórico), form de novo projeto (validação: sem item → erro; campos obrigatórios).
- Lógica de filtros da listagem extraída pura + testada.

**Commits sugeridos**
- `feat(projetos): adiciona listagem e criacao de projetos`
- `feat(projetos): adiciona detalhe de projeto e de item com timeline`

> **→ CP1** (com a Via B, na base): merge mútuo, integrar `ClientAccessPanel` (Via B) no detalhe do projeto, smoke test criar projeto → gerar link → abrir como cliente. Ver PLANO.md seção 7.

---

## [ ] A4 — Anexos (UI)

**Objetivo:** upload e listagem de anexos em projeto e item, com categoria livre e visibilidade (spec seções 12, 14.4; service core já existe na fundação).

**Entregas**
- `src/components/projects/AttachmentUploader.tsx`: seleção múltipla, categoria livre (input com sugestões das já usadas), visibilidade (`internal`/`client`/`designer`/`assembler`), progresso, mobile-friendly (captura de câmera).
- `src/components/projects/AttachmentList.tsx`: agrupado por categoria, ícone por mimetype, download, remoção (admin only), filtro por visibilidade conforme papel (helper da fundação).
- Integração nas páginas de projeto e item (A3).
- `storage.rules`: seção VIA A — escrita por internos autenticados nos paths de projeto.

**Testes**
- Helpers puros: filtro por visibilidade/papel (todas as combinações da spec seção 12), formatação de tamanho, validação de metadados.
- `AttachmentList` com Testing Library (admin vê tudo; vendedor não vê `internal` financeiro etc.).

**Commits sugeridos**
- `feat(projetos): adiciona upload e listagem de anexos`

---

## [ ] A5 — Fluxo do desenhista

**Objetivo:** atribuição com prazo automático, fila do desenhista, versões e devolução para alteração (spec seções 5.1, 11, 14.5, 16.4, 16.5, 25).

**Entregas**
- `src/components/projects/AssignDesignerModal.tsx`: admin escolhe desenhista (`useUsersByRole('designer')`), prazo automático via `deadline.service` (editável); grava `designerId`/`designerName`/`deadlineCurrent`, status → `aguardando_desenho`.
- `src/services/projects/designer.service.ts`: `getDesignerQueue(designerId)` (collectionGroup `items` where `designerId ==`, spec seção 22), `submitDesignerVersion(projectId, itemId, files, description)` — cria doc em `versions` (número incremental), sobe arquivos, atualiza `currentVersionId`, status → `aguardando_orcamento` (Fase 2; o envio ao cliente passa pelo orçamento, não é automático).
- `src/pages/desenhista/index.tsx`: fila com prazo, badge de atraso e destaque para `alteracao_solicitada`; sem nenhum dado financeiro.
- `src/components/designer/{DesignerQueue,DesignerUploadPanel}.tsx`.
- Detalhe do item (A3): seção de versões (histórico interno, visível para admin; desenhista vê as próprias).
- `firestore.rules` seção VIA A: designer lê itens onde `designerId == request.auth.uid`; cria `versions` nos itens dele.
- Sidebar: link "Minha fila" visível para role designer.
- Índice composto do collectionGroup documentado (link gerado no console na primeira query).

**Testes**
- Numeração incremental de versões (pura), transição `alteracao_solicitada → aguardando_desenho` ao reatribuir, prazo automático calculado a partir dos defaults.
- `DesignerQueue`: ordena por prazo, marca atrasados.
- `submitDesignerVersion` com mocks: cria versão, atualiza `currentVersionId`, muda status.

**Commits sugeridos**
- `feat(projetos): adiciona atribuicao de desenhista com prazo automatico`
- `feat(projetos): adiciona fila do desenhista e versionamento de projetos`

> **→ CP2** (com a Via B, na base): integrar `AssignAssemblerModal` + painel de assignments no detalhe do item; links Montador/Financeiro na sidebar. Ver PLANO.md seção 7.

---

## [ ] A6 — Dashboard admin, filtros e configurações de prazo

**Objetivo:** visão completa da operação (spec seções 9, 23) e edição dos prazos padrão (spec seção 14.9).

**Entregas**
- `src/pages/projetos/dashboard.tsx`: cards (projetos em aberto, atrasados, aguardando desenho, aguardando aprovação, em produção, em montagem, montadores a pagar*, total vendido no mês) + tabela de itens atrasados + filtros combináveis (vendedor, desenhista, montador*, cliente, status, período, atraso). *Cards/filtros de montador leem `assemblerAssignments` via collectionGroup — só contagem/soma, sem editar código da Via B.
- `src/components/admin/{AdminDashboardCards,DelayedItemsTable}.tsx`.
- `src/pages/administracao/configuracoes-prazos.tsx`: form dos `deadlineDefaults` (dias por etapa), admin only.
- Sidebar: links Dashboard e Configurações de prazos.

**Testes**
- Agregações puras dos cards (dado um array de projetos/itens → contagens corretas), combinação de filtros, "total vendido no mês" (fronteiras de mês).
- Form de prazos: validação (inteiros positivos).

**Commits sugeridos**
- `feat(projetos): adiciona dashboard administrativo com filtros`
- `feat(projetos): adiciona configuracao de prazos padrao`

---

## [ ] A7 — Polimento interno

**Objetivo:** spec fase 9 — parte interna.

**Entregas**
- Estados vazios e loading (padrão `Loader`) em todas as páginas novas; tratamento de erro com `toaster`; responsividade revisada (dashboard utilizável em tablet; fila do desenhista em celular).
- Revisão final da seção VIA A das rules contra a matriz de permissões (spec seção 4): vendedor não lê `assemblerAssignments` nem `payments`.
- Varredura de `console.log` e dead code nas superfícies da via.

**Testes**
- Regressão completa (`npm test`), incluindo casos de estado vazio nos componentes de lista.

**Commits sugeridos**
- `fix(projetos): ajusta estados vazios, erros e responsividade`

> **→ CP3** (com a Via B, na base): critérios de aceite da spec seção 31 + `npm run build` + PR para `main`.
