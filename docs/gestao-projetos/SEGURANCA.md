# Segurança — Gestão de Projetos

Roteiro manual para validar a matriz de permissões da Via B antes de mergear.

## Premissas

- O cliente anonimo nunca acessa Firestore ou Storage diretamente.
- O portal do cliente usa apenas `/api/client-access/*` e cookie `client_session`.
- Usuarios internos usam cookie `session` do Firebase Auth e documento `users/{uid}` ativo.
- Montadores trabalham com dados minimos denormalizados em `assemblerAssignments`.

## Admin

1. Entrar com usuario `admin`.
2. Gerar/regenerar senha do cliente pelo painel interno.
3. Atribuir um ou mais montadores ao item com `amountToReceive > 0`.
4. Abrir `/administracao/financeiro-montadores`.
5. Ver pendencias agrupadas por montador.
6. Registrar pagamento somente com comprovante.
7. Confirmar que consegue ler historico de pagamentos.

## Vendedor

1. Entrar com usuario `seller`.
2. Confirmar que consegue consultar projetos e itens internos.
3. Confirmar que nao consegue abrir documentos `assemblerAssignments`.
4. Confirmar que nao consegue abrir documentos `payments`.
5. Confirmar que nao consegue chamar APIs de montador.

## Desenhista

1. Entrar com usuario `designer`.
2. Confirmar que acessa apenas itens/versoes atribuidos a ele.
3. Confirmar que nao ve valores de montadores, pagamentos ou comprovantes.
4. Confirmar que nao consegue alterar atribuições de montadores.
5. **Limitação conhecida:** `firestore.rules` permite ao desenhista ler o documento inteiro do item (`items/{itemId}`), incluindo `item.budget`, porque o Firestore não faz segurança em nível de campo. A UI esconde o painel de orçamento para esse papel (`canSeePrice` em `[itemId].tsx`), mas um desenhista consultando o Firestore diretamente (SDK/console) consegue ler o custo interno. Mitigação futura: mover `budget` para uma subcoleção com regras próprias.

## Montador

1. Entrar com usuario `assembler`.
2. Abrir `/montador`.
3. Confirmar que aparecem apenas itens atribuidos ao proprio UID.
4. Abrir `/montador/item/{projectId}/{itemId}` de item proprio.
5. Confirmar telefone clicavel, mapa e arquivos tecnicos liberados.
6. Atualizar etapa apenas no fluxo:
   `aguardando_separacao_materiais -> em_producao -> pronto_para_transporte -> em_transporte -> em_montagem -> montagem_concluida`.
7. Tentar acessar item de outro montador e confirmar bloqueio.
8. Abrir `/montador/financeiro`.
9. Confirmar que ve apenas pagamentos/valores proprios.
10. Confirmar recebimento de pagamento proprio em status `pago`.
11. Confirmar que nao consegue confirmar pagamento de outro montador.

## Cliente

1. Abrir `/cliente/{publicId}` sem login interno.
2. Inserir senha incorreta 5 vezes e confirmar bloqueio temporario.
3. Inserir senha correta e confirmar que o portal carrega apenas o DTO publico.
4. Confirmar que o DTO nao contem:
   - `amountToReceive`
   - `assemblerAssignments`
   - `payments`
   - `designerId`
   - `budget.lines`, `budget.totalCost`, `budget.suggestedAssemblerAmount`
   - versoes antigas
   - anexos internos
5. Aprovar item pendente.
6. Confirmar que item aprovado nao pode ser recusado nem alterado pelo link.
7. Usar `/cliente/{publicId}/acompanhar` e confirmar timeline simplificada.
8. Simular link expirado e confirmar mensagem para contatar a loja.

## Storage

1. Confirmar que cliente anonimo nao consegue ler arquivos do bucket.
2. Confirmar que arquivos do cliente sao servidos apenas por signed URL da API.
3. Confirmar que montador le/escreve apenas arquivos de item atribuido.
4. Confirmar que comprovante de pagamento e legivel apenas por admin e montador dono.

## Melhorias futuras

- Criar testes automatizados das `firestore.rules` e `storage.rules` com Firebase Emulator.
- Registrar auditoria estruturada de tentativas de acesso do cliente em colecao propria.
- Mover pagamento/confirmacao para API routes exclusivamente server-side em toda a UI interna.
