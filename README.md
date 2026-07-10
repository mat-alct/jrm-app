Breakpoints

[0, sm, md, lg, xl, 2xl]
[0+, 480+, 768+, 992+, 1280+, 1536+]

---

# Testes

O plano completo, com o histórico de cada fase, está em
[`docs/PLANO-DE-TESTES.md`](docs/PLANO-DE-TESTES.md).

**Princípio central:** o código de produção não tem caminho alternativo de teste.
Não existe mais `E2E_MOCKS_ENABLED`. Toda suíte que fala com Firebase fala com o
**Firebase Emulator Suite** — o mesmo SDK e as mesmas regras de produção.

## Pré-requisitos

- Node 20+
- **Java 11+ no `PATH`** (o emulador do Firestore/Storage roda na JVM)
- `npx playwright install --with-deps chromium` para o e2e

## As cinco camadas

| Comando | O que roda | Emulador? |
|---|---|---|
| `npm test` | unit + componentes (jsdom) | não |
| `npm run test:rules` | `firestore.rules` e `storage.rules` | sim |
| `npm run test:integration` | services e API routes contra o Firebase real | sim |
| `npm run test:e2e` | jornadas por papel no app real | sim |
| `npm run test:guardrails` | proíbe service/API sem spec e padrões banidos nos testes | não |
| `npm run test:all` | tudo, na ordem acima | sim |

Auxiliares: `npm run emulators` sobe o emulador para depurar (UI em
<http://127.0.0.1:4000>), `npm run test:coverage` roda a suíte unitária com os
thresholds de cobertura.

## Cobertura

Os thresholds são **pisos**: sobem, nunca descem.

- `src/utils/**`: 95% de branches (`jest.config.js`)
- `src/components/**`: 80% de linhas (`jest.config.js`)
- `src/services/**` + `src/pages/api/**`: 75% de linhas (`jest.integration.config.js`)

O número `global` da suíte unitária é baixo de propósito: ele cobre apenas o que
sobra dos grupos acima — principalmente `src/pages/**`, que é exercitado pelo e2e.

## Regras para código novo

1. **Todo bug encontrado vira teste de regressão ANTES do fix.** Escreva o teste
   que falha, depois corrija.
2. **Prova de fogo.** Antes de considerar um teste pronto, sabote de propósito o
   código que ele cobre e confirme que ele fica **vermelho**. Se não ficar, o
   teste está "em volta" e precisa ser reescrito. Desfaça a sabotagem e confirme
   o verde.
3. **Mocke apenas fronteiras que você não controla.** O Firebase não é uma delas.
   A única fronteira mockada hoje é `services/projects/storageSignedUrl.server.ts`
   (assinatura de URL exige chave privada da service account).
4. **Sem esperas arbitrárias.** `waitForTimeout` é proibido — o CI rejeita. Use
   asserções web-first (`expect(...).toBeVisible()`) ou `expect.poll` para leituras
   no emulador.
5. **`page.route` só em `e2e/real/error-paths.spec.ts`**, para simular falha de
   infraestrutura. Nunca no caminho feliz.
6. **Toda escrita testada em e2e tem verificação dupla:** a UI reflete o resultado
   *e* uma leitura direta no emulador (via `firebase-admin`) confirma que o dado
   foi persistido no lugar certo.

O que cada camada deve cobrir para uma feature nova está em
`docs/gestao-projetos/GUIA-NOVA-FEATURE.md`.

## Contas do seed

Todos os usuários usam a senha `Seed@12345`:

| Papel | E-mail |
|---|---|
| admin | `admin@seed.jrm` |
| vendedor | `vendedor@seed.jrm` |
| desenhista | `desenhista@seed.jrm` |
| montador | `montador@seed.jrm` |
| marceneiro | `marceneiro@seed.jrm` |

Na área de cortes, a "senha do vendedor" do seed é `vendedor123`.
