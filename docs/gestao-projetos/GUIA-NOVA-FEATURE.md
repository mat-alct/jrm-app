# Guia da Feature — Gestao de Projetos de Marcenaria

Este guia e o roteiro de acompanhamento da nova feature de gestao de projetos. Ele considera a Via A como finalizada e integrada, mesmo que ela ainda esteja sendo concluida em outra sessao.

Use este arquivo para entender o que entrou, em que ordem testar e qual resultado esperar em cada parte.

## 1. Visao geral

A feature adiciona um fluxo completo para projetos de marcenaria:

1. Usuarios internos trabalham com papeis: admin, vendedor, desenhista e montador.
2. Admin/vendedor criam o projeto e os itens (sem preco, sem acabamento/medidas — isso fica em anexos e orcamento).
3. Item entra em `aguardando_desenho`; desenhista anexa o desenho e confirma, o que move o item para `aguardando_orcamento`.
4. Admin/vendedor preenche as linhas de custo do orcamento e envia ao cliente (`aguardando_aprovacao_cliente`).
5. Cliente acessa um portal externo por link e senha, aprova, recusa ou pede alteracao.
6. Aprovado, o item vai para `aguardando_atribuicao_montador`; admin atribui montador(es) e valor (a sugestao vem do orcamento).
7. Montador acompanha os itens pelo celular, atualiza etapas (`em_producao -> pronto_para_montagem -> montagem_concluida`) e envia fotos.
8. Admin aprova a montagem concluida, o que libera o pagamento do montador como pendente (`aguardando_pagamento_montador`).
9. Financeiro paga montadores com comprovante; quando todos os montadores do item confirmam recebimento, o item vira `finalizado`.
10. Cada registro (historico, anexo, atribuicao, pagamento) guarda o nome de quem agiu, nao so o papel.
11. Regras de seguranca separam o que cada papel pode ver e alterar.

Rotas principais:

| Area                      | Rota                                   |
| ------------------------- | -------------------------------------- |
| Lista de projetos         | `/projetos`                            |
| Novo projeto              | `/projetos/novo`                       |
| Detalhe do projeto        | `/projetos/{projectId}`                |
| Detalhe do item           | `/projetos/{projectId}/itens/{itemId}` |
| Dashboard admin           | `/projetos/dashboard`                  |
| Usuarios                  | `/administracao/usuarios`              |
| Configuracoes de prazo    | `/administracao/configuracoes-prazos`  |
| Financeiro dos montadores | `/administracao/financeiro-montadores` |
| Fila do desenhista        | `/desenhista`                          |
| Portal do cliente         | `/cliente/{publicId}`                  |
| Acompanhamento do cliente | `/cliente/{publicId}/acompanhar`       |
| Painel do montador        | `/montador`                            |
| Item do montador          | `/montador/item/{projectId}/{itemId}`  |
| Financeiro do montador    | `/montador/financeiro`                 |

## 2. Preparacao para testar

Antes dos testes manuais, rode:

```bash
npm install
npm test
npx tsc --noEmit
npm run dev
```

Para popular o banco de testes:

```bash
node --env-file=.env scripts/seed-projetos.mjs
```

Contas de seed disponiveis em `CONTAS-SEED-TESTE.md`:

| Papel      | Email                 | Senha        |
| ---------- | --------------------- | ------------ |
| Admin      | `admin@seed.jrm`      | `Seed@12345` |
| Vendedor   | `vendedor@seed.jrm`   | `Seed@12345` |
| Desenhista | `desenhista@seed.jrm` | `Seed@12345` |
| Montador   | `montador@seed.jrm`   | `Seed@12345` |

Portal do cliente no seed (senha `ABC123` para ambos): o link exato aparece no
log do script a cada execucao — veja `CONTAS-SEED-TESTE.md`.

## 3. Fundacao compartilhada

### O que foi adicionado

Arquivos centrais:

- `src/types/projects.ts`: tipos de projeto, item, anexo, versao, usuario, status, montador, pagamento e DTO publico do cliente.
- `src/utils/projects/status.ts`: maquina de status dos itens, labels internos e labels simplificados para cliente.
- `src/utils/projects/permissions.ts`: regras puras de permissao por papel.
- `src/utils/projects/delay.ts`: calculo de atraso por prazo.
- `src/services/projects/paths.ts`: caminhos padronizados de Firestore e Storage.
- `src/services/projects/summary.ts`: resumo automatico de itens do projeto.
- `src/services/projects/deadline.service.ts`: prazos padrao por etapa.
- `src/services/projects/status.service.ts`: atualizacao de status com historico, resumo e efeitos.
- `src/services/projects/attachment.service.ts`: upload/listagem de anexos com visibilidade.
- `src/services/projects/users.service.ts`: leitura do usuario interno e papeis.
- `firestore.rules` e `storage.rules`: regras versionadas da nova estrutura.

### Como funciona

Todo item anda por uma maquina de 13 status (`projeto_criado` até `finalizado`/`cancelado`). O admin pode forcar transicoes, mas os outros papeis seguem o fluxo permitido — ver a tabela completa na seção 10.2 de `docs/gestao-projetos/PLANO.md`.

Efeitos importantes:

- Atribuir montador move o item de `aguardando_atribuicao_montador` para `em_producao`.
- Ao admin aprovar a montagem (`aguardando_pagamento_montador`), os pagamentos pendentes do item sao liberados como `pendente`.
- Quando todos os montadores do item confirmam recebimento, o item vira `finalizado` automaticamente.
- Quando todos os itens terminam, o projeto recebe `completedAt` e `clientLinkExpiresAt`.
- Toda mudanca relevante registra historico em `statusHistory`, com o nome de quem agiu (`changedByName`).
- O resumo do projeto e recalculado apos mudancas de itens.

### Como testar

Automatizado:

```bash
npm test -- src/tests/utils/projects/status.spec.ts
npm test -- src/tests/utils/projects/permissions.spec.ts
npm test -- src/tests/utils/projects/delay.spec.ts
npm test -- src/tests/services/projects/status.service.spec.ts
npm test -- src/tests/services/projects/summary.spec.ts
npm test -- src/tests/services/projects/deadline.service.spec.ts
npm test -- src/tests/services/projects/attachment.service.spec.ts
npm test -- src/tests/services/projects/users.service.spec.tsx
```

Manual:

1. Entre como admin.
2. Abra um item de projeto.
3. Mude o status seguindo o fluxo normal.
4. Confira se o historico mostra a nova etapa.
5. Atribua um montador a um item em `aguardando_atribuicao_montador` e confirme que ele passa para `em_producao`.
6. Leve o item ate `montagem_concluida` e use o botao "Aprovar montagem" (admin) para mover a `aguardando_pagamento_montador`.
7. Abra o financeiro dos montadores e confira se a pendencia foi liberada.

## 4. Via A — Operacao interna

Esta secao descreve a Via A como pronta e integrada.

### A1. Usuarios e papeis

O que foi adicionado:

- API interna para criar/editar usuarios.
- Pagina `/administracao/usuarios`.
- Papeis: `admin`, `seller`, `designer`, `assembler`.
- Usuario ativo/inativo.
- Gate de paginas por papel.

Como testar:

1. Entre como admin.
2. Abra `/administracao/usuarios`.
3. Crie um usuario com nome, email, telefone, senha inicial e pelo menos um papel.
4. Edite os papeis desse usuario.
5. Desative o usuario.
6. Tente entrar com um usuario sem permissao em uma area restrita.

Resultado esperado:

- Admin consegue criar, editar e desativar.
- Usuario sem papel necessario nao acessa a pagina.
- Vendedor, desenhista e montador nao conseguem administrar usuarios.

### A2. Projetos e itens

O que foi adicionado:

- Services de projeto e item.
- Criacao, edicao, listagem e consulta.
- Resumo automatico do projeto com base nos itens.
- Hooks React Query para cache e invalidacao.

Como testar:

1. Entre como vendedor ou admin.
2. Abra `/projetos/novo`.
3. Preencha dados do cliente (sem escolher vendedor — o vendedor e a propria conta logada).
4. Adicione pelo menos um item com ambiente, material, descricao e observacoes (sem acabamento, medidas, preco ou "requer desenhista" — isso fica em anexos, orcamento e atribuicao posterior).
5. Salve.
6. Abra `/projetos`.
7. Procure o cliente criado.
8. Abra o detalhe do projeto e confirme que `sellerName` e o nome de quem criou.

Resultado esperado:

- Projeto aparece na listagem, com o vendedor derivado da conta logada.
- Itens aparecem no detalhe, sem os campos removidos.
- Resumo mostra quantidade, valores (apos orcamento) e status agregados.
- Formulario bloqueia envio sem dados obrigatorios ou sem itens.

### A3. Paginas internas de projeto

O que foi adicionado:

- `/projetos`: lista com busca, filtros, badges e responsividade.
- `/projetos/novo`: formulario de projeto com itens dinamicos.
- `/projetos/{projectId}`: detalhe do projeto, resumo, itens e painel de acesso do cliente.
- `/projetos/{projectId}/itens/{itemId}`: detalhe do item, status, timeline, dados tecnicos, anexos, versoes e montadores.
- Componentes de projeto: cards, badges, timeline e formularios.

Como testar:

1. Abra `/projetos`.
2. Use busca por nome do cliente.
3. Use filtro por status.
4. Abra um projeto.
5. Abra um item.
6. Teste uma transicao de status permitida para seu papel.
7. Veja se a timeline registra a alteracao.

Resultado esperado:

- Lista filtra corretamente.
- Admin ve todas as acoes.
- Vendedor ve o necessario para acompanhar/criar.
- Timeline fica ordenada e legivel.

### A4. Anexos

O que foi adicionado:

- Upload multiplo em projeto e item.
- Categoria livre.
- Visibilidade por publico: `internal`, `client`, `designer`, `assembler`.
- Lista agrupada por categoria.
- Download e remocao conforme permissao.

Como testar:

1. Entre como admin.
2. Abra um item.
3. Envie um arquivo com visibilidade `client`.
4. Envie outro com visibilidade `assembler`.
5. Abra o portal do cliente.
6. Abra o item como montador.

Resultado esperado:

- Cliente ve somente anexos liberados para cliente.
- Montador ve somente anexos tecnicos liberados para montador.
- Anexos internos nao aparecem no portal publico.
- Admin consegue remover quando permitido.

### A5. Fluxo do desenhista

O que foi adicionado:

- Modal de atribuicao de desenhista.
- Prazo automatico editavel.
- Fila `/desenhista`.
- Upload de versoes.
- Historico de versoes no item.
- Transicao para `aguardando_orcamento` (o desenhista nao envia direto ao cliente).

Como testar:

1. Entre como admin.
2. Abra um item em `aguardando_desenho`.
3. Atribua um desenhista (qualquer item pode receber desenhista, nao ha mais o campo "requer desenhista").
4. Entre como desenhista.
5. Abra `/desenhista`.
6. Envie uma versao do projeto.
7. Confira se o item vai para `aguardando_orcamento` (nao direto para aprovacao do cliente).
8. Como admin/vendedor, preencha o orcamento e envie ao cliente.
9. Abra o item como admin e confira a versao no historico.

Resultado esperado:

- Desenhista ve apenas itens atribuidos a ele.
- Versao recebe numeracao incremental.
- Item muda para `aguardando_orcamento`, nao para aprovacao do cliente direto.
- Dados financeiros de montador e o painel de orcamento nao aparecem para desenhista.

### A6. Dashboard e prazos

O que foi adicionado:

- `/projetos/dashboard` com indicadores operacionais.
- Cards de projetos abertos, atrasados, aguardando desenho, aguardando orcamento, aguardando aprovacao, aguardando montador, producao, montagem, montadores a pagar e total vendido no mes.
- Tabela de itens atrasados.
- Filtros por vendedor, desenhista, montador, cliente, status, periodo e atraso.
- `/administracao/configuracoes-prazos` para editar prazos padrao.

Como testar:

1. Entre como admin.
2. Abra `/projetos/dashboard`.
3. Compare os cards com os projetos do seed.
4. Aplique filtros combinados.
5. Abra `/administracao/configuracoes-prazos`.
6. Edite um prazo.
7. Crie/atribua novo item e confira se o prazo novo e usado.

Resultado esperado:

- Cards mudam conforme filtros.
- Itens atrasados aparecem corretamente.
- Apenas admin altera configuracoes de prazo.

## 5. Via B — Portal do cliente

### B1. Credenciais e sessao do cliente

O que foi adicionado:

- `src/services/projects/clientAccess.service.ts`: gera `publicId`, senha curta, hash scrypt e controle de tentativas.
- `src/services/projects/clientSession.ts`: sessao HMAC de cliente com cookie httpOnly `client_session`.
- Expiracao do link apos conclusao do projeto.
- Bloqueio temporario apos 5 senhas erradas.

Como testar:

Automatizado:

```bash
npm test -- src/tests/services/projects/clientAccess.service.spec.ts
npm test -- src/tests/services/projects/clientSession.spec.ts
```

Manual:

1. Abra `/cliente/seed-1-9hTIy7`.
2. Digite senha errada 4 vezes.
3. Confirme que ainda pode tentar.
4. Digite senha errada pela quinta vez.
5. Confirme bloqueio temporario.
6. Depois use `ABC123`.

Resultado esperado:

- Senha correta abre o portal.
- Senha errada mostra erro.
- 5 erros bloqueiam por tempo limitado.
- O cliente nao precisa estar logado no sistema interno.

### B2. APIs do portal do cliente

O que foi adicionado:

- `POST /api/client-access/provision`: gera/regenera acesso do cliente para usuarios internos autorizados.
- `POST /api/client-access/verify`: valida senha e cria sessao do cliente.
- `GET /api/client-access/project`: retorna DTO publico do projeto.
- `POST /api/client-access/approve-item`: aprova um item.
- `POST /api/client-access/approve-all`: aprova todos os itens pendentes.
- `POST /api/client-access/reject-item`: recusa um item.
- `POST /api/client-access/request-change`: pede alteracao em um item.
- `src/services/projects/statusAdmin.service.ts`: aplica transicoes do cliente server-side.

Como testar:

Automatizado:

```bash
npm test -- src/tests/pages/api/client-access/provision.spec.ts
npm test -- src/tests/pages/api/client-access/verify.spec.ts
npm test -- src/tests/pages/api/client-access/project.spec.ts
npm test -- src/tests/services/projects/statusAdmin.service.spec.ts
```

Manual:

1. Entre como admin.
2. Abra o detalhe de um projeto.
3. Use o painel "Acesso do cliente" para gerar/regenerar senha.
4. Copie o link.
5. Abra o link em aba anonima.
6. Entre com a senha.
7. Aprove um item.
8. Recarregue a tela interna do item e confira status/historico.

Resultado esperado:

- A senha em texto aparece somente no momento da geracao.
- O DTO publico nao contem `amountToReceive`, `assemblerAssignments`, `payments`, `designerId`, versoes antigas ou anexos internos.
- Item aprovado nao pode ser recusado depois pelo portal.

### B3. Telas do cliente

O que foi adicionado:

- `src/components/client/ClientLayout.tsx`: layout publico sem dashboard interno.
- `src/components/client/ClientLoginWithCode.tsx`: tela de senha.
- `src/components/client/ClientProjectView.tsx`: orcamento e itens.
- `src/components/client/ClientItemApprovalCard.tsx`: acoes de aprovacao, recusa e alteracao.
- `src/components/client/ClientTrackingTimeline.tsx`: acompanhamento simplificado.
- `src/pages/cliente/[publicId]/index.tsx`.
- `src/pages/cliente/[publicId]/acompanhar.tsx`.

Como testar:

Automatizado:

```bash
npm test -- src/tests/components/client/ClientItemApprovalCard.spec.tsx
npm test -- src/tests/components/client/ClientTrackingTimeline.spec.tsx
npm test -- src/tests/pages/cliente/index.spec.tsx
```

Manual:

1. Abra `/cliente/seed-1-9hTIy7`.
2. Entre com `ABC123`.
3. Confira valores dos itens e valor total.
4. Abra anexos liberados ao cliente.
5. Aprove um item.
6. Use "Aprovar tudo" em outro projeto com itens pendentes.
7. Abra `/cliente/seed-1-9hTIy7/acompanhar`.

Resultado esperado:

- Portal funciona em celular.
- Botoes desabilitam quando item ja foi aprovado/recusado.
- Tracking mostra status simplificado e etapa atual.
- Cliente nao ve menus internos.

## 6. Via B — Montadores

### B4. Atribuicao de montadores

O que foi adicionado:

- `src/services/projects/assembler.service.ts`: atribuicao, consulta e atualizacao de assignments.
- `src/components/assembler/AssignAssemblerModal.tsx`: escolher montadores e valores.
- `src/components/assembler/AssemblerAssignmentsPanel.tsx`: lista de montadores atribuidos ao item.
- Integracao no detalhe do item da Via A.

Como testar:

Automatizado:

```bash
npm test -- src/tests/services/projects/assembler.service.spec.ts
npm test -- src/tests/components/assembler/AssignAssemblerModal.spec.tsx
```

Manual:

1. Entre como admin.
2. Abra um item aprovado ou em etapa de producao/montagem.
3. Abra o modal de atribuicao de montador.
4. Escolha um ou mais montadores.
5. Informe `amountToReceive` maior que zero.
6. Salve.
7. Confira o painel de atribuicoes no item.

Resultado esperado:

- Valor zero ou vazio nao passa.
- Varios montadores podem ser atribuidos.
- Assignment nasce com `paymentStatus: nao_liberado`.
- Apenas admin atribui ou edita valores.

### B5. Painel mobile do montador

O que foi adicionado:

- `/montador`: lista de itens atribuidos.
- `/montador/item/{projectId}/{itemId}`: detalhe operacional do item.
- API `POST /api/assembler/update-status`: atualiza etapa do item com permissao de montador.
- Telefone clicavel com `tel:`.
- Endereco com link para mapa.
- Arquivos tecnicos liberados ao montador.
- Upload de fotos do andamento.

Como testar:

Automatizado:

```bash
npm test -- src/tests/pages/api/assembler/update-status.spec.ts
```

Manual:

1. Entre como `montador@seed.jrm`.
2. Abra `/montador`.
3. Confira cards com cliente, ambiente, prazo, status e valor.
4. Abra um item.
5. Clique no telefone.
6. Clique no endereco/mapa.
7. Veja anexos tecnicos.
8. Atualize a etapa seguindo o fluxo: `em_producao -> pronto_para_montagem -> montagem_concluida`.
9. Tente abrir um item nao atribuido ao montador.

Resultado esperado:

- Montador ve apenas itens dele.
- Etapas fora do fluxo sao bloqueadas.
- Ao chegar em `montagem_concluida`, o item fica aguardando o admin aprovar a montagem — o financeiro so ganha pendencia depois dessa aprovacao (`aguardando_pagamento_montador`).
- Item de outro montador fica inacessivel.

## 7. Via B — Financeiro dos montadores

### B6. Pagamentos

O que foi adicionado:

- `src/services/projects/payment.service.ts`: pagamento, confirmacao e agregacoes.
- `/administracao/financeiro-montadores`: tela admin de pendencias e historico.
- `/montador/financeiro`: tela do montador.
- `src/components/admin/AssemblerPaymentsTable.tsx`.
- `src/components/assembler/AssemblerFinanceSummary.tsx`.
- `src/components/assembler/AssemblerPaymentHistory.tsx`.
- API `POST /api/assembler/confirm-payment`.
- Regras de Storage para comprovantes.

Como testar:

Automatizado:

```bash
npm test -- src/tests/services/projects/payment.service.spec.ts
npm test -- src/tests/components/admin/AssemblerPaymentsTable.spec.tsx
npm test -- src/tests/components/assembler/AssemblerFinanceSummary.spec.tsx
npm test -- src/tests/pages/api/assembler/confirm-payment.spec.ts
```

Manual:

1. Entre como admin.
2. Garanta que um item atribuido a montador esteja em `montagem_concluida` e clique em "Aprovar montagem" no detalhe do item (isso move para `aguardando_pagamento_montador` e libera a pendencia).
3. Abra `/administracao/financeiro-montadores`.
4. Confira pendencias agrupadas por montador.
5. Registre pagamento com valor e comprovante.
6. Entre como montador.
7. Abra `/montador/financeiro`.
8. Veja o pagamento aguardando confirmacao.
9. Abra o comprovante.
10. Clique em confirmar recebimento.

Resultado esperado:

- Admin so consegue pagar com comprovante, e so depois de aprovar a montagem.
- Assignment muda de `pendente` para `pago`.
- Montador ve apenas pagamentos proprios.
- Ao confirmar, payment e assignment mudam para `confirmado_pelo_montador`.
- Quando todos os montadores do item confirmam, o item muda sozinho para `finalizado`.
- Nao ha retrocesso de status financeiro.

## 8. Seguranca e anti-vazamento

O que foi adicionado:

- Cliente anonimo nao le Firestore nem Storage diretamente.
- Portal publico passa por `/api/client-access/*`.
- Montador le somente assignments, itens e pagamentos proprios.
- Vendedor nao le pagamentos nem assignments de montador.
- Desenhista nao ve financeiro.
- Comprovantes sao restritos a admin e montador dono.
- DTO publico do cliente e sanitizado.

Como testar:

1. Siga o roteiro completo em `docs/gestao-projetos/SEGURANCA.md`.
2. Teste cada papel com sua conta de seed.
3. No portal do cliente, inspecione a resposta de `/api/client-access/project`.
4. Confirme que nao aparecem campos internos ou financeiros.
5. Tente acessar URLs de montador com usuario vendedor/desenhista.
6. Tente abrir item de outro montador.

Resultado esperado:

- Cada papel ve apenas sua superficie.
- APIs retornam 401/403 quando falta sessao ou papel.
- Portal do cliente nao vaza dados internos.

## 9. Roteiro integrado recomendado

Use este fluxo para validar a feature de ponta a ponta:

1. Admin cria ou confirma usuarios internos.
2. Vendedor cria projeto com dois itens (sem preco, sem acabamento/medidas).
3. Admin atribui desenhista a um item (`aguardando_desenho`).
4. Desenhista envia versao — item vai para `aguardando_orcamento`.
5. Vendedor/admin preenche o orcamento (linhas de custo, valor ao cliente, sugestao ao montador) e envia — item vai para `aguardando_aprovacao_cliente`.
6. Admin gera acesso do cliente no detalhe do projeto.
7. Cliente abre o link e aprova o item — item vai para `aguardando_atribuicao_montador`.
8. Admin atribui montador com valor (pre-preenchido pela sugestao do orcamento) — item vai para `em_producao`.
9. Montador abre `/montador` e acompanha o item, avancando ate `pronto_para_montagem` e `montagem_concluida`.
10. Admin aprova a montagem no detalhe do item — item vai para `aguardando_pagamento_montador` e a pendencia aparece no financeiro.
11. Admin abre `/administracao/financeiro-montadores` e registra pagamento com comprovante.
12. Montador abre `/montador/financeiro` e confirma recebimento — item vira `finalizado`.
13. Admin confere dashboard, historico do item (com nomes, nao papeis) e financeiro.

Checklist de sucesso:

- Projeto foi criado e aparece na listagem, com o vendedor derivado da conta logada.
- Item teve timeline completa, com o nome de quem agiu em cada etapa.
- Orcamento nao vazou para o cliente (`lines`, `totalCost`, `suggestedAssemblerAmount` ausentes do DTO publico).
- Cliente aprovou pelo portal sem login interno.
- Montador viu somente itens proprios.
- Financeiro liberou pagamento somente depois da aprovacao da montagem pelo admin.
- Item finalizou sozinho quando todos os montadores confirmaram o pagamento.
- Comprovante ficou acessivel para admin e montador dono.
- Dashboard refletiu os dados atualizados (incluindo os novos cards de orcamento e montador).

## 10. Comandos finais antes de merge

Rode a regressao completa:

```bash
npm test
npx tsc --noEmit
npm run build
```

Depois faca os testes manuais por papel:

1. Admin: usuarios, projetos, atribuicoes, dashboard e financeiro.
2. Vendedor: criar/acompanhar projetos sem acessar financeiro de montador.
3. Desenhista: fila, versoes e ausencia de dados financeiros.
4. Cliente: login por senha, aprovacao, recusa, alteracao e tracking.
5. Montador: lista propria, detalhe, atualizacao de etapa e confirmacao de pagamento.

## 11. Referencias internas

- Plano geral: `docs/gestao-projetos/PLANO.md`
- Via A: `docs/gestao-projetos/VIA-A-operacao-interna.md`
- Via B: `docs/gestao-projetos/VIA-B-cliente-montador-financeiro.md`
- Seguranca: `docs/gestao-projetos/SEGURANCA.md`
- Contas de teste: `CONTAS-SEED-TESTE.md`
