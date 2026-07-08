# Via B — Portal do Cliente, Montadores e Financeiro

> Branch: `feat/gestao-projetos-via-b` · Base: `feat/gestao-projetos` (fundação concluída)
> Regras de convivência e Definition of Done: [PLANO.md](./PLANO.md) (seções 3 e 8)

Toda etapa termina com: testes novos passando (`npm test`), `npx tsc --noEmit` limpo e commit. Marcar o checkbox só depois do commit.

Tudo do portal do cliente é **server-side** (spec seção 20): cliente anônimo nunca lê Firestore direto.

---

## [x] B1 — Núcleo de acesso do cliente

**Objetivo:** credenciais do cliente com senha hasheada, publicId e expiração (spec seções 10 e 20).

**Entregas**
- `src/services/projects/clientAccess.service.ts` (**server-only**, importado apenas por API routes):
  - `generateClientCredentials()`: `publicId` (nanoid/uuid curto, URL-safe) + senha curta legível (ex.: 6 caracteres sem ambíguos);
  - `hashAccessCode(code)` / `verifyAccessCode(code, hash)` com `node:crypto` scrypt (salt por registro, comparação timing-safe);
  - `isLinkExpired(project, now)`: expira 1 mês após `completedAt` (campo `clientLinkExpiresAt` já é setado pelo `status.service` da fundação);
  - controle de tentativas: campo `clientAccessAttempts`/`clientAccessLockUntil` no projeto — 5 erros seguidos bloqueiam por 15 min.
- `src/services/projects/clientSession.ts` (server-only): token HMAC (`publicId` + expiração 24h) assinado com `CLIENT_ACCESS_SECRET`; `issueClientSession` / `verifyClientSession`; cookie httpOnly `client_session`.

**Testes**
- Hash/verify (senha correta, incorreta, hash adulterado), formato do publicId e da senha gerada, expiração do link (antes/depois/sem `completedAt`), lockout (4 erros não bloqueia, 5 bloqueia, expira), token de sessão (válido, expirado, assinatura inválida, publicId trocado).

**Commits sugeridos**
- `feat(cliente): adiciona nucleo de acesso com senha hasheada e sessao`

---

## [x] B2 — API routes do portal do cliente

**Objetivo:** todas as operações do cliente via server-side com `adminDb` (spec seções 10, 20 e DTOs).

**Entregas**
- `src/pages/api/client-access/provision.ts`: **chamada por usuário interno autenticado** (admin/vendedor, valida cookie de sessão + role) — gera credenciais (B1), grava `clientAccessPublicId`/`clientAccessCodeHash` no projeto e retorna a senha em texto **uma única vez** para exibição/envio ao cliente. Permite regenerar senha.
- `src/pages/api/client-access/verify.ts`: `publicId` + senha → valida hash, lockout e expiração → emite cookie `client_session`.
- `src/pages/api/client-access/project.ts`: retorna `ClientProjectDTO` (tipos da fundação) — itens com preço, `clientStatusLabel` (mapeamento da fundação), previsão, anexos permitidos (visibilidade `client` + última versão apenas, spec seção 11) com **signed URLs de curta duração** via `adminStorage`, telefone de contato da empresa. **Nunca** retorna dados financeiros de montadores, histórico interno ou versões antigas.
- `src/pages/api/client-access/approve-item.ts`, `approve-all.ts`, `reject-item.ts`, `request-change.ts`: validam sessão; aplicam transição via executor admin (abaixo); item já `aprovado` não pode ser recusado/alterado pelo link (spec seção 4); `approve-all` só afeta itens em `aguardando_aprovacao_cliente`.
- `src/services/projects/statusAdmin.service.ts` (server-only): executor das transições sobre `adminDb` reutilizando a máquina pura e os efeitos definidos na fundação (histórico com `changedByRole: 'client'`… registrado como ator "cliente", recálculo de resumo, timestamps `approvedAt`/`rejectedAt`/`changeRequestedAt`).

**Testes**
- Cada handler com `req`/`res` mockados e `firebase-admin` mockado: método errado, sem sessão, sessão de outro publicId, link expirado, senha errada (incrementa tentativa), fluxo feliz.
- **Teste de vazamento**: serialização do `ClientProjectDTO` não contém `amountToReceive`, `assemblerAssignments`, `payments`, `designerId`, versões antigas.
- Regras de aprovação: aprovar item ok; recusar item já aprovado → 409; `approve-all` ignora itens fora de `aguardando_aprovacao_cliente`; pedir alteração muda só o item alvo.

**Commits sugeridos**
- `feat(cliente): adiciona provisionamento e verificacao de acesso`
- `feat(cliente): adiciona api de consulta e aprovacao de itens`

---

## [x] B3 — Portal do cliente (páginas)

**Objetivo:** telas públicas mobile-first (spec seções 8, 10, 27).

**Entregas**
- Layout standalone `src/components/client/ClientLayout.tsx` (sem Dashboard/sidebar; logo + telefone da empresa clicável).
- `src/pages/cliente/[publicId]/index.tsx`: tela de senha (`ClientLoginWithCode`) → visão do projeto (`ClientProjectView`): itens com valor, valor total, arquivos liberados, botões **Aprovar item / Aprovar tudo / Recusar / Pedir alteração** (`ClientItemApprovalCard`), com confirmação antes de cada ação e recarga do DTO após.
- `src/pages/cliente/[publicId]/acompanhar.tsx`: `ClientTrackingTimeline` — status simplificado tipo rastreamento + previsão atualizada (sem alerta de atraso, spec seção 8).
- `src/components/projects/ClientAccessPanel.tsx`*: card interno (gerar/regenerar senha via `provision`, copiar link, ver validade) — *arquivo criado pela Via B; a integração na página de detalhe do projeto (Via A) acontece no **CP1**.
- Estados: senha errada, link expirado ("entre em contato com a loja"), projeto concluído.

**Testes**
- `ClientItemApprovalCard`: botões desabilitados quando `aprovado`/`recusado`; label de status correto por `clientStatusLabel`.
- `ClientTrackingTimeline`: ordem das etapas, etapa atual destacada.
- Fluxo de login do cliente com fetch mockado: senha errada mostra erro, certa carrega projeto.

**Commits sugeridos**
- `feat(cliente): adiciona portal de aprovacao do cliente`
- `feat(cliente): adiciona acompanhamento simplificado`

> **→ CP1** (com a Via A, na base): merge mútuo, integrar `ClientAccessPanel` no detalhe do projeto, smoke test fim-a-fim. Ver PLANO.md seção 7.

---

## [x] B4 — Montadores: atribuição e painel mobile-first

**Objetivo:** admin atribui montadores com valores; montador trabalha pelo celular (spec seções 16.6, 22, 26, 28).

**Entregas**
- `src/services/projects/assembler.service.ts`: `assignAssemblers(projectId, itemId, assignments)` (admin only; vários montadores por item; `amountToReceive` manual; `paymentStatus: 'nao_liberado'`), `getAssemblerAssignments(assemblerId)` (collectionGroup, spec seção 22), `updateAssignment` (valor editável pelo admin a qualquer momento).
- `src/components/assembler/AssignAssemblerModal.tsx` + `AssemblerAssignmentsPanel.tsx` (lista atribuições do item com valores — visível só para admin): **integrados na página de item da Via A no CP2**.
- `src/pages/montador/index.tsx`: cards grandes (cliente, ambiente, status, prazo, valor a receber), ordenados por prazo, badge de atraso.
- `src/pages/montador/item/[projectId]/[itemId].tsx`: telefone clicável (`tel:`), endereço com link para mapa, arquivos técnicos (visibilidade `assembler`), botão grande **Atualizar etapa** (só transições permitidas ao montador: `aguardando_separacao_materiais` → … → `montagem_concluida`, via `status.service` da fundação), upload de fotos (attachment.service da fundação, captura de câmera).
- Gate por role `assembler`; montador só acessa itens atribuídos a ele (checagem no client + rules na B6).
- `firestore.rules` seção VIA B (primeira passada): montador lê `assemblerAssignments` onde `assemblerId == request.auth.uid` e os itens/projetos correspondentes.

**Testes**
- Puras: transições permitidas ao montador (não pode `finalizado` nem voltar status), agrupamento/ordenação da lista por prazo, montagem dos links `tel:`/mapa.
- `AssignAssemblerModal`: valida valor > 0, permite múltiplos montadores.
- Service com mocks: atribuição cria docs com `nao_liberado`; montador não consegue alterar `amountToReceive` (função rejeita).

**Commits sugeridos**
- `feat(montador): adiciona atribuicao de montadores com valores`
- `feat(montador): adiciona painel mobile do montador`

---

## [x] B5 — Financeiro dos montadores

**Objetivo:** ciclo completo pendente → pago → confirmado (spec seções 7, 14.7, 14.8, 16.7).

> A liberação (`montagem_concluida` → assignments `pendente`) já é efeito do `status.service` da fundação — não reimplementar.

**Entregas**
- `src/services/projects/payment.service.ts`: `createAssemblerPayment(assignmentId, proofFile)` (cria doc em `payments`, sobe comprovante no Storage, assignment → `pago`), `confirmAssemblerPayment(paymentId)` (montador; assignment e payment → `confirmado_pelo_montador`), consultas por montador e agregações (total pendente por montador — função pura).
- `src/pages/administracao/financeiro-montadores.tsx`: pendências agrupadas por montador com totais, ação **Pagar** (valor + comprovante obrigatório), histórico de pagamentos. Admin only.
- `src/pages/montador/financeiro.tsx`: a receber, pagos aguardando confirmação (ver comprovante + botão **Confirmar recebimento**), histórico. Montador vê **apenas os próprios** valores.
- `src/components/assembler/{AssemblerFinanceSummary,AssemblerPaymentHistory}.tsx`, `src/components/admin/AssemblerPaymentsTable.tsx`.
- `storage.rules` seção VIA B: comprovantes legíveis só por admin e pelo montador dono.

**Testes**
- Puras: agregação de pendências por montador, máquina de estados do pagamento (`nao_liberado→pendente` só via montagem concluída; `pendente→pago` exige comprovante; `pago→confirmado` só pelo montador dono; nada retrocede).
- Service com mocks: criar pagamento atualiza assignment e cria doc; confirmar atualiza os dois docs.
- Componentes: tabela do admin agrupa e soma; painel do montador não renderiza dados de outro montador.

**Commits sugeridos**
- `feat(montador): adiciona pagamento com comprovante e confirmacao`

> **→ CP2** (com a Via A, na base): integrar modal/painel de montadores no detalhe do item; links Montador/Financeiro na sidebar; testar ciclo completo. Ver PLANO.md seção 7.

---

## [x] B6 — Endurecimento de segurança

**Objetivo:** fechar a matriz de permissões (spec seções 4, 20, 21, 32).

**Entregas**
- `firestore.rules` finais da seção VIA B: montador lê só assignments/payments próprios e **não lê** os de outros; vendedor não lê `assemblerAssignments`/`payments`; cliente (não autenticado) não lê **nada**.
- `storage.rules`: revisão completa por visibilidade (cliente só via signed URL — sem leitura pública de bucket).
- Revisão anti-vazamento nas API routes (checklist: financeiro, versões antigas, dados de outros projetos via publicId trocado).
- Rate-limit do `verify` revisado; logs de tentativas.
- Documentar em `docs/gestao-projetos/SEGURANCA.md` o roteiro de teste manual por papel (login como cada perfil + cliente) e, como melhoria futura, testes de rules com o emulador.

**Testes**
- Regressão dos testes de vazamento de B2 ampliada (payments e assignments no DTO).
- Testes dos guards das API routes (roles erradas → 403).

**Commits sugeridos**
- `feat(cliente): endurece regras de seguranca e revisao anti-vazamento`

> **→ CP3** (com a Via A, na base): critérios de aceite da spec seção 31 + `npm run build` + PR para `main`.
