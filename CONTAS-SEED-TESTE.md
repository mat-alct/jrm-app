# Contas de teste — Gestão de Projetos (banco `new-jrm-app-tests`)

Geradas por `scripts/seed-projetos.mjs`. Válidas apenas no banco de testes.

## Usuários internos (login)

| Papel      | Email               | Senha      |
| ---------- | ------------------- | ---------- |
| Admin      | admin@seed.jrm      | Seed@12345 |
| Vendedor   | vendedor@seed.jrm   | Seed@12345 |
| Desenhista | desenhista@seed.jrm | Seed@12345 |
| Montador   | montador@seed.jrm   | Seed@12345 |
| Marceneiro | marceneiro@seed.jrm | Seed@12345 |

## Acesso do cliente (portal externo)

Senha de acesso (ambos os projetos): `ABC123`

O link muda a cada execução do seed (o `publicId` é gerado a partir do id do
documento) — pegue o link exato no log do script (`seed-1-...` / `seed-2-...`)
ou na tela `/administracao` do projeto criado.

| Projeto   | Itens                                                                                                                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cliente 1 | Cozinha planejada (aguardando aprovação), Armário de quarto (em produção e com montador atribuído), Painel de TV (projeto criado), Escritório aguardando medidas (aguardando informações + notificação pendente) |
| Cliente 2 | Rack de sala (pronto para montagem), Bancada de lavanderia (aguardando pagamento do montador), Guarda-roupa planejado (finalizado)                                                                               |

## Cenários do fluxo novo

- O vendedor entra em `/projetos` e vê os dois cadastros, independentemente de quem os criou.
- O desenhista usa `/projetos`, aba **Desenhos pendentes**; não existe mais `/desenhista`.
- Em **Cliente 1 → Notificações**, há um pedido de medidas pendente. Ao anexar a
  informação no item e clicar em **Aprovar para desenho**, a notificação é resolvida.
- Depois que `assemblerAssignedAt` existe (por exemplo, no Armário de quarto), um usuário
  somente vendedor vê no detalhe do item apenas nome, ambiente e status. Admin continua
  vendo todos os dados.
- Anexos de item usam `audience: { seller, designer, assembler, client }`; os quatro
  públicos nascem marcados e podem ser desmarcados no upload.

## Reexecutar o seed

Para popular novamente do zero, apague antes a coleção `projects` (os usuários e
`settings/deadlineDefaults` são reaproveitados automaticamente):

```
node --env-file=.env scripts/seed-projetos.mjs
```
