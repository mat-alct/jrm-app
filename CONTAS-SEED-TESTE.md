# Contas de teste — Gestão de Projetos (banco `new-jrm-app-tests`)

Geradas por `scripts/seed-projetos.mjs`. Válidas apenas no banco de testes.

## Usuários internos (login)

| Papel      | Email                | Senha        |
|------------|-----------------------|--------------|
| Admin      | admin@seed.jrm        | Seed@12345   |
| Vendedor   | vendedor@seed.jrm      | Seed@12345   |
| Desenhista | desenhista@seed.jrm    | Seed@12345   |
| Montador   | montador@seed.jrm      | Seed@12345   |

## Acesso do cliente (portal externo)

Senha de acesso (ambos os projetos): `ABC123`

O link muda a cada execução do seed (o `publicId` é gerado a partir do id do
documento) — pegue o link exato no log do script (`seed-1-...` / `seed-2-...`)
ou na tela `/administracao` do projeto criado.

| Projeto | Itens |
|---------|-------|
| Cliente 1 | Cozinha planejada (aguardando aprovação), Armário de quarto (em produção), Painel de TV (projeto criado) |
| Cliente 2 | Rack de sala (pronto para montagem), Bancada de lavanderia (aguardando pagamento do montador), Guarda-roupa planejado (finalizado) |

## Reexecutar o seed

Para popular novamente do zero, apague antes a coleção `projects` (os usuários e
`settings/deadlineDefaults` são reaproveitados automaticamente):

```
node --env-file=.env scripts/seed-projetos.mjs
```
