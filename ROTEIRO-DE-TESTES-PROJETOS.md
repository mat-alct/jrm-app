# Roteiro de Testes — Nova Área de Projetos

Este documento é um passo a passo para vocês testarem, do começo ao fim, tudo o que
foi criado na nova área de **Projetos de Marcenaria**. Não é preciso saber nada de
programação: basta seguir os passos na ordem e conferir se o que aparece na tela é
o que está escrito em "O que deve acontecer".

Ao final, vocês terão passado por **todas** as telas e por **todas** as ações que a
nova funcionalidade oferece.

> **Endereço do ambiente de teste:** `_______________________________________`
>
> (preencha aqui o link que foi enviado; ele é usado em todos os passos abaixo)

> ⚠️ **Este é um ambiente de teste, com um banco de dados separado.** Nada do que
> vocês fizerem aqui afeta o sistema real da JRM. Podem criar, aprovar, recusar e
> apagar à vontade.

---

## Sumário

1. [Como usar este documento](#1-como-usar-este-documento)
2. [Contas para login](#2-contas-para-login)
3. [O que já existe no ambiente de teste](#3-o-que-já-existe-no-ambiente-de-teste)
4. [Entendendo o fluxo de um projeto](#4-entendendo-o-fluxo-de-um-projeto)
5. [ROTEIRO 1 — O caminho completo de um projeto (o principal)](#roteiro-1--o-caminho-completo-de-um-projeto)
6. [ROTEIRO 2 — O que acontece quando o cliente não aprova](#roteiro-2--o-que-acontece-quando-o-cliente-não-aprova)
7. [ROTEIRO 3 — Anexos, arquivos e visualizador 3D](#roteiro-3--anexos-arquivos-e-visualizador-3d)
8. [ROTEIRO 4 — Segurança: cada pessoa vê só o que deve](#roteiro-4--segurança-cada-pessoa-vê-só-o-que-deve)
9. [ROTEIRO 5 — Dashboard, prazos e atrasos](#roteiro-5--dashboard-prazos-e-atrasos)
10. [ROTEIRO 6 — Cadastro de usuários da equipe](#roteiro-6--cadastro-de-usuários-da-equipe)
11. [ROTEIRO 7 — Proteção do portal do cliente](#roteiro-7--proteção-do-portal-do-cliente)
12. [Checklist final](#12-checklist-final)
13. [Como relatar um problema](#13-como-relatar-um-problema)

---

## 1. Como usar este documento

**Antes de começar, três recomendações práticas:**

**a) Use janelas anônimas para trocar de pessoa.**
O sistema tem cinco tipos de usuário (administrador, vendedor, desenhista, montador e
marceneiro), e você vai precisar alternar entre eles. Em vez de ficar saindo e entrando,
abra cada perfil em uma **janela anônima** diferente (no Chrome: `Ctrl+Shift+N`; no Safari:
`Cmd+Shift+N`). Assim você deixa o administrador aberto numa janela, o montador em outra,
e o cliente numa terceira — e vê as mudanças acontecendo em tempo real de um lado para o outro.

**b) Teste o montador e o cliente no celular.**
A tela do montador e o portal do cliente foram desenhados **para o celular**. Vale abrir
esses dois no telefone para sentir como ficaria na prática — o montador vai usar isso
dentro da casa do cliente, com uma mão só.

**c) Marque as caixinhas.**
Cada passo tem um `[ ]`. Vá marcando conforme testa, e anote ao lado qualquer coisa que
não bateu com a descrição.

---

## 2. Contas para login

Todas as contas abaixo já estão criadas no ambiente de teste. A tela de login fica em
`{endereço-do-teste}/login`.

### Equipe interna (login com e-mail e senha)

| Papel             | Para que serve                                                                           | E-mail                | Senha        |
| ----------------- | ---------------------------------------------------------------------------------------- | --------------------- | ------------ |
| **Administrador** | Vê e faz tudo: cria projetos, atribui montadores, aprova montagens, paga                 | `admin@seed.jrm`      | `Seed@12345` |
| **Vendedor**      | Cria projetos, monta orçamentos, acompanha — mas não mexe em dinheiro de montador        | `vendedor@seed.jrm`   | `Seed@12345` |
| **Desenhista**    | Recebe os itens para desenhar e envia o projeto pronto                                   | `desenhista@seed.jrm` | `Seed@12345` |
| **Montador**      | Vê só os itens dele, atualiza as etapas e confirma pagamentos                            | `montador@seed.jrm`   | `Seed@12345` |
| **Marceneiro**    | Papel usado na área antiga de cortes (serve para testar que ele _não_ entra em Projetos) | `marceneiro@seed.jrm` | `Seed@12345` |

### Cliente (portal externo, sem login)

O cliente **não tem conta no sistema**. Ele recebe um **link** e uma **senha curta** de
6 caracteres, e é só isso que ele precisa.

- **Senha de acesso dos projetos de exemplo:** `ABC123`
- **Link:** o link de cada projeto é gerado dentro do sistema. Você vai aprender a gerar
  um no [Roteiro 1, Etapa 6](#etapa-6--gerar-o-acesso-do-cliente-administrador).

> **Por que o link não está escrito aqui?** Porque ele é criado junto com o projeto e é
> único para cada cliente. Se você quiser o link de um dos projetos de exemplo, entre como
> administrador, abra o projeto e clique em **"Gerar senha"** — o link e uma senha nova
> aparecem na hora. (Atenção: gerar uma senha nova **invalida** a senha `ABC123` daquele projeto.)

---

## 3. O que já existe no ambiente de teste

Para você não precisar criar tudo do zero, já deixamos **dois projetos prontos**, com itens
parados em etapas diferentes. Isso permite testar o meio do fluxo sem ter que percorrer tudo.

**Projeto do "Cliente Seed 1"**

| Item              | Ambiente | Em que etapa está                                |
| ----------------- | -------- | ------------------------------------------------ |
| Cozinha planejada | Cozinha  | Aguardando aprovação do cliente                  |
| Armário de quarto | Quarto   | Em produção                                      |
| Painel de TV      | Sala     | Projeto criado (ainda não foi para o desenhista) |

**Projeto do "Cliente Seed 2"**

| Item                   | Ambiente   | Em que etapa está                                          |
| ---------------------- | ---------- | ---------------------------------------------------------- |
| Rack de sala           | Sala       | Pronto para montagem                                       |
| Bancada de lavanderia  | Lavanderia | Aguardando pagamento do montador (e com prazo **vencido**) |
| Guarda-roupa planejado | Quarto     | Finalizado                                                 |

Esses dois projetos são o seu "laboratório". O Roteiro 1, porém, pede que você **crie um
projeto novo do zero** — porque só assim dá para ver o fluxo inteiro nascer e terminar.

---

## 4. Entendendo o fluxo de um projeto

Antes de sair clicando, vale entender a lógica. Um **projeto** é de um cliente e tem vários
**itens** (a cozinha, o armário, o rack). Cada item anda sozinho pelas etapas abaixo, na
sua própria velocidade — um pode estar em produção enquanto o outro ainda espera aprovação.

```
1.  Projeto criado                  ← vendedor cadastrou o item
2.  Aguardando desenho              ← vendedor aprovou para a fila compartilhada
    Aguardando informações          ← desenhista pediu um dado com justificativa
3.  Aguardando orçamento            ← desenhista entregou o desenho
4.  Aguardando aprovação do cliente ← orçamento foi enviado ao cliente
5.  Aguardando atribuição de montador  ← cliente aprovou
6.  Em produção                     ← montador foi atribuído
7.  Pronto para montagem            ← montador atualizou
8.  Montagem concluída              ← montador atualizou
9.  Aguardando pagamento do montador   ← administrador aprovou a montagem
10. Finalizado                      ← montador confirmou que recebeu
```

Existem ainda quatro desvios: **Aguardando informações** (etapa 2), **Alteração
solicitada** e **Recusado pelo cliente** (etapa 4), e **Cancelado** (o administrador pode
cancelar a qualquer momento).

**Quem faz o quê, em uma frase:**

- **Vendedor** cadastra o cliente, cadastra os itens, monta o orçamento e envia ao cliente.
- **Desenhista** vê a fila compartilhada, assume um item, pede dados se necessário e sobe o desenho.
- **Cliente** aprova, recusa ou pede alteração — pelo celular, sem instalar nada.
- **Montador** vê só os itens dele, avança as etapas e confirma quando recebe o pagamento.
- **Administrador** faz tudo isso e mais: atribui montador, aprova a montagem e paga.

**A regra de ouro do dinheiro:** o pagamento do montador **só é liberado** depois que
o administrador clicar em "Aprovar montagem". O montador não consegue liberar o próprio
pagamento marcando o serviço como concluído.

---

## ROTEIRO 1 — O caminho completo de um projeto

> **Este é o roteiro mais importante.** Ele leva um projeto novo do cadastro até o
> pagamento do montador, passando por todas as cinco pessoas. Reserve uns 30 minutos e
> faça de uma vez só, sem pular etapa.

**Prepare quatro janelas anônimas**, uma para cada perfil (vendedor, desenhista, montador
e cliente), mais a janela normal para o administrador. Deixe todas abertas.

---

### Etapa 1 — Criar o projeto (vendedor)

- [ ] Entre como **`vendedor@seed.jrm`** / `Seed@12345`.
- [ ] No menu da esquerda, procure a seção **"Projetos"** e clique em **"Novo projeto"**.
- [ ] Preencha o cadastro básico:
  - **Nome do cliente:** `Teste Diretoria`
  - **Telefone:** um número de celular real seu (você vai clicar nele mais tarde, na tela
    do montador, para ver se o telefone disca)
- [ ] Salve.
- [ ] No detalhe aberto após salvar, clique em **Editar** nos dados do cliente e informe
      e-mail e um endereço real e completo.
- [ ] Abra a aba **Itens**, clique em **Adicionar item** e cadastre `Cozinha da diretoria`
      no ambiente `Cozinha`, com material, descrição e observações à vontade.
- [ ] Adicione um segundo item: `Rack da sala`, ambiente `Sala`.

**O que deve acontecer:**

- ✅ O projeto é criado vazio e abre imediatamente no detalhe.
- ✅ O projeto aparece na lista, e a coluna **"Vendedor"** mostra **"Vendedor Seed"** —
  ou seja, o sistema entendeu sozinho quem cadastrou. _Não existe mais campo para escolher
  o vendedor à mão._
- ✅ Os dois itens começam na etapa **"Projeto criado"**.

**Repare no que o formulário _não_ pede:** não há campo de preço, acabamento nem medidas.
Isso é proposital. Preço vira **orçamento** (feito depois do desenho) e acabamento/medidas
viram **anexos**. O vendedor não chuta preço na frente do cliente.

- [ ] **Teste a validação:** tente salvar outro cadastro sem nome ou sem telefone.
      ✅ O sistema deve barrar. Projeto sem itens, por outro lado, é permitido.

---

### Etapa 2 — Mandar o item para o desenhista (vendedor ou administrador)

- [ ] Ainda como vendedor, abra o projeto `Teste Diretoria` e clique no item **"Cozinha da diretoria"**.
- [ ] Clique em **"Aprovar para desenho"**. Não escolha desenhista ainda.

**O que deve acontecer:**

- ✅ O item muda para **"Aguardando desenho"**.
- ✅ O prazo é calculado automaticamente e o item entra na fila compartilhada ainda sem
  desenhista.
- ✅ No card **"Histórico"**, no fim da página, aparece um registro novo dizendo o que
  mudou e **o nome de quem mudou** (não só o cargo). Isso vale para todas as ações do
  sistema — dá para auditar quem fez o quê.
- ✅ O admin ainda pode atribuir por **Renato**, **Marcio** ou escrever outro nome; o
  desenhista também pode assumir sozinho.

> 💡 Diferente de como era antes, **qualquer item pode receber um desenhista**. Não existe
> mais a caixinha "requer desenhista" no cadastro.

---

### Etapa 3 — Enviar o desenho (desenhista)

- [ ] Na janela anônima, entre como **`desenhista@seed.jrm`** / `Seed@12345`.
- [ ] Repare no menu da esquerda: o desenhista **não vê** "Novo projeto", nem "Dashboard",
      nem nada de administração. Ele vê **"Listar projetos"**.
- [ ] Clique em **"Listar projetos"** e abra a aba **"Desenhos pendentes"**.

**O que deve acontecer:**

- ✅ Aparece o item "Cozinha da diretoria" mesmo sem atribuição. A fila é compartilhada;
  itens assumidos continuam visíveis com **"Atribuído a ..."**.

- [ ] Clique em **Assumir**. ✅ O item passa a mostrar **"Atribuído a você"**.
- [ ] Abra o item, escreva `Falta a medida final do vão` e clique em **Pedir mais informações**.
- [ ] Na janela do vendedor, abra o projeto e confirme o badge **Notificações 1**. Na aba
      Notificações, abra o item, anexe a medida e clique em **Aprovar para desenho**.
- [ ] ✅ A notificação fica resolvida, o badge some e o item volta à fila mantendo o mesmo
      desenhista e com prazo recalculado.

- [ ] Abra o item. Você verá um painel de envio de desenho.
- [ ] Escreva uma descrição da versão (opcional, ex.: `Primeira versão`) e anexe um ou mais
      arquivos. Pode ser qualquer PDF ou imagem do seu computador.
- [ ] Envie.

**O que deve acontecer:**

- ✅ O item passa para **"Aguardando orçamento"** — e **não** direto para o cliente.
  Isso é importante: o desenhista entrega o desenho, mas quem coloca preço e fala com o
  cliente é o vendedor.
- ✅ Aparece **"Versão 1"** na lista de versões do item.
- ✅ **O desenhista não vê nenhum valor em dinheiro.** Confira: na tela do item, para ele,
  não existe card de "Orçamento" nem valores de montador. Se você subir uma segunda versão,
  ela vira **"Versão 2"** — o histórico não é sobrescrito.

---

### Etapa 4 — Montar o orçamento (vendedor ou administrador)

- [ ] Volte para a janela do **vendedor** e abra o mesmo item.

**O que deve acontecer:**

- ✅ Agora apareceu um card **"Orçamento"** com um formulário. Ele só aparece nessa etapa.

- [ ] Preencha as **linhas de custo** — o que a JRM gasta para fazer o item. Adicione pelo
      menos duas linhas, por exemplo:
  - `MDF e ferragens` → `4500`
  - `Mão de obra de marcenaria` → `1500`
- [ ] Preencha o **"Valor cobrado do cliente"**: `9800`
- [ ] Preencha a **"Sugestão de valor para o montador"**: `700`
- [ ] Salve o orçamento.
- [ ] Agora clique em **"Enviar orçamento ao cliente"**.

**O que deve acontecer:**

- ✅ Ao salvar, o card passa a mostrar três valores: Valor ao cliente, Custo interno e
  Sugestão para o montador.
- ✅ O botão "Enviar orçamento ao cliente" só aparece **depois** que o orçamento foi salvo.
- ✅ Ao enviar, o item vai para **"Aguardando aprovação do cliente"**.

> 💰 **O ponto crítico:** o cliente vai ver **apenas** o "Valor cobrado do cliente"
> (R$ 9.800). Ele **nunca** vê as linhas de custo, o custo interno (R$ 6.000) nem o valor
> do montador. A margem da JRM não vaza. Você vai confirmar isso na Etapa 7.

---

### Etapa 5 — Repita para o segundo item (opcional, mas recomendado)

Para que o portal do cliente fique mais interessante de testar, leve também o item
**"Rack da sala"** até "Aguardando aprovação do cliente": atribua o desenhista, envie uma
versão, monte um orçamento (ex.: valor ao cliente `2400`, sugestão ao montador `250`) e envie.

- [ ] Feito. Agora o projeto tem **dois itens** aguardando a decisão do cliente.

---

### Etapa 6 — Gerar o acesso do cliente (administrador)

- [ ] Entre como **`admin@seed.jrm`** / `Seed@12345`.
- [ ] Abra **"Listar projetos"** → projeto `Teste Diretoria`.
- [ ] Na página do projeto, localize o card **"Acesso do cliente"**.
- [ ] Clique em **"Gerar senha"**.

**O que deve acontecer:**

- ✅ Aparece um **link** (algo como `.../cliente/aB3xY9`) e uma **senha de 6 caracteres**,
  em letras grandes.
- ✅ Há um botão **"Copiar link"**.

> 🔒 **Anote a senha agora.** Ela é mostrada **uma única vez**. O sistema guarda apenas uma
> versão embaralhada dela, exatamente como um banco faz com sua senha — nem o administrador
> consegue vê-la de novo depois. Se perder, é só clicar em **"Regenerar senha"** e mandar a
> nova para o cliente (a antiga para de funcionar na hora).

- [ ] Copie o link. Na prática, é isso que o vendedor manda no WhatsApp do cliente.

---

### Etapa 7 — O cliente decide (portal do cliente)

> **Faça esta etapa no celular**, ou pelo menos numa janela anônima. O cliente não tem
> login no sistema, e você precisa provar isso: nenhuma sessão da JRM pode estar ativa.

- [ ] Abra o link copiado.
- [ ] Digite a senha de 6 caracteres que você anotou.

**O que deve acontecer na tela de aprovação:**

- ✅ No topo: o nome do cliente e dois números grandes — **"Valor total"**
  (R$ 12.200,00 = 9.800 + 2.400) e **"Itens aprovados"** (0 de 2).
- ✅ Um cartão para cada item, com nome, ambiente, **valor** e previsão de entrega.
- ✅ Os arquivos que foram liberados para o cliente aparecem para download.
- ✅ **Nenhum menu interno da JRM.** Sem barra lateral, sem "Dashboard", sem "Cortes".
  É uma página limpa, só do cliente.
- ✅ **Nenhuma informação interna.** Sem custo, sem margem, sem o nome do desenhista,
  sem o valor do montador.

- [ ] Em cada cartão de item há três botões: **"Aprovar item"**, **"Recusar"** e
      **"Pedir alteração"**. Clique em **"Aprovar item"** no item "Cozinha da diretoria".
- [ ] ✅ Aparece uma **confirmação** ("Confirmar aprovação deste item?"). Confirme.

**O que deve acontecer:**

- ✅ O item passa a mostrar **"Projeto aprovado"** e os três botões ficam **desabilitados**.
  O cliente aprovou; não dá para voltar atrás sozinho.
- ✅ O contador sobe para "1 de 2".

- [ ] Agora teste o botão **"Aprovar tudo"**, fixo no rodapé da tela (no celular ele fica
      grudado embaixo, para o cliente não precisar rolar).
- [ ] ✅ Ele pede confirmação e aprova **todos os itens que ainda estavam pendentes** de uma vez.
- [ ] ✅ Depois que não há mais nada pendente, o botão "Aprovar tudo" **some**.

- [ ] Clique em **"Acompanhar andamento"**, no topo.
- [ ] ✅ Aparece uma linha do tempo **em linguagem de cliente**. Repare: ele lê
      "Em produção", "Montagem concluída", "Aguardando sua aprovação". Ele **nunca** lê
      "Aguardando atribuição de montador" nem "Aguardando pagamento do montador" — essas
      etapas internas aparecem para ele como "Projeto aprovado" e "Montagem concluída".

- [ ] Volte para a **janela do administrador**, recarregue a página do item.
- [ ] ✅ O item está em **"Aguardando atribuição de montador"** e o **Histórico** registra
      a aprovação **feita pelo cliente**, com data e hora.

---

### Etapa 8 — Atribuir o montador (administrador)

> Só o **administrador** faz isso. O vendedor não vê esse botão.

- [ ] Como administrador, no item "Cozinha da diretoria", vá ao card **"Montadores"**.
- [ ] Clique em **"Atribuir montador"**.
- [ ] ✅ Repare: o campo de valor **já vem preenchido com R$ 700** — a sugestão que o
      vendedor colocou no orçamento. O administrador pode aceitar ou mudar.
- [ ] **Teste o bloqueio:** apague o valor (ou coloque `0`) e tente salvar.
      ✅ O sistema recusa: _"Informe montador e valor maior que zero."_
- [ ] Coloque o valor de volta, escolha **"Montador Seed"** e salve.

**O que deve acontecer:**

- ✅ Mensagem "Montadores atribuídos".
- ✅ O item **pula automaticamente** para **"Em produção"**. Não é preciso mudar o status
  à mão — atribuir o montador já significa que a produção começou.
- ✅ O montador aparece listado no card, com o valor.

> 💡 Dá para atribuir **mais de um montador** ao mesmo item, cada um com o seu valor. Nesse
> caso, o item só é finalizado quando **todos** confirmarem que receberam.

---

### Etapa 9 — O montador executa (montador, no celular)

> **Abra esta etapa no seu celular.** É onde a diferença aparece.

- [ ] Entre como **`montador@seed.jrm`** / `Seed@12345`.
- [ ] ✅ O menu dele é curtíssimo: **"Meus itens"** e **"Financeiro"**. Ele não vê projetos,
      não vê clientes, não vê dashboard.
- [ ] Abra **"Meus itens"**.
- [ ] ✅ Aparecem cartões com o cliente, o prazo, o status e **quanto ele tem a receber**.
      Ele vê o valor **dele**, e não o valor que o cliente pagou.
- [ ] Abra o item "Cozinha da diretoria".

**Teste os três atalhos de campo:**

- [ ] Toque em **"Ligar para cliente"** → ✅ o celular abre o discador com o número do cliente.
- [ ] Toque em **"Abrir mapa"** → ✅ abre o aplicativo de mapas no endereço da obra.
- [ ] Em **"Arquivos técnicos"**, ✅ aparecem os arquivos liberados para o montador.

**Avance as etapas:**

- [ ] O item está em "Em produção". Toque no botão grande de atualizar etapa.
- [ ] ✅ Ele avança para **"Pronto para montagem"**.
- [ ] Toque de novo → ✅ avança para **"Montagem concluída"**.
- [ ] Toque de novo → ✅ o botão fica **desabilitado**, escrito "Sem próxima etapa".
      **O montador não consegue passar daqui.** Ele não libera o próprio pagamento.

- [ ] Em **"Fotos da montagem"**, envie uma foto. No celular, o campo abre a **câmera**
      direto. ✅ A foto é enviada.

> 📝 **Observação honesta:** nesta tela, a "Etapa atual" e o botão ainda mostram o nome
> técnico da etapa (ex.: `pronto_para_montagem`, com underline) em vez do nome bonito
> ("Pronto para montagem"). É um acabamento que ainda falta. Anotem se incomodar.

- [ ] **Teste o isolamento:** ainda como montador, tente abrir um item que não é dele —
      troque o endereço na barra do navegador pelo item "Painel de TV" do Cliente Seed 1.
      ✅ Deve aparecer _"Item nao atribuido a este montador."_ e nada mais.

---

### Etapa 10 — Aprovar a montagem (administrador)

> **Esta é a trava de segurança financeira do sistema.** Nada é pago sem passar por aqui.

- [ ] Como administrador, abra o item "Cozinha da diretoria".
- [ ] ✅ Como o item está em "Montagem concluída", apareceu um botão laranja:
      **"Aprovar montagem"**. Ele **só** aparece para o administrador e **só** nessa etapa.
- [ ] Antes de clicar, abra **"Financeiro dos montadores"** (menu Administração) numa
      outra aba. ✅ A pendência da "Cozinha da diretoria" **ainda não está lá**.
- [ ] Volte e clique em **"Aprovar montagem"**.

**O que deve acontecer:**

- ✅ O item vai para **"Aguardando pagamento do montador"**.
- ✅ Recarregue o "Financeiro dos montadores": **agora** a pendência de R$ 700 do
  "Montador Seed" apareceu.

---

### Etapa 11 — Pagar o montador (administrador)

- [ ] Vá em **Administração → "Financeiro dos montadores"**.
- [ ] ✅ As pendências vêm **agrupadas por montador**, com o total que ele tem a receber
      no topo do cartão.
- [ ] Repare que o botão **"Pagar"** está **desabilitado**.
- [ ] Anexe um arquivo no campo ao lado (um print do comprovante de PIX, por exemplo —
      para o teste, qualquer imagem serve).
- [ ] ✅ Agora o botão "Pagar" liberou. Clique.

**O que deve acontecer:**

- ✅ A pendência sai da lista e vai para o **"Histórico"**, no fim da página.

> 💰 **Não existe "pagar sem comprovante".** O sistema exige o arquivo. Toda saída de
> dinheiro fica com prova anexada, acessível ao administrador e ao montador daquele
> pagamento — e a mais ninguém.

---

### Etapa 12 — O montador confirma o recebimento (montador)

- [ ] Volte para a janela do **montador** e abra **"Financeiro"**.
- [ ] ✅ No topo, dois números: **"A receber"** e **"Aguardando confirmação"**.
- [ ] ✅ Na lista de pagamentos, o de R$ 700 aparece com a marca "Comprovante anexado" e um
      botão **"Confirmar recebimento"**.
- [ ] Clique em **"Confirmar recebimento"**.

**O que deve acontecer:**

- ✅ O pagamento muda para "confirmado pelo montador".
- ✅ **O item vira "Finalizado" sozinho.** Volte na janela do administrador, recarregue o
  item: ele está em **Finalizado**, sem ninguém ter clicado em nada. Foi a confirmação do
  montador que fechou o ciclo.

> 💡 Se o item tivesse **dois montadores**, ele só finalizaria quando **os dois** confirmassem.

---

### Etapa 13 — Fechando o ciclo

- [ ] Leve também o item **"Rack da sala"** até o fim (atribuir montador → montador avança
      as três etapas → administrador aprova a montagem → paga → montador confirma).
- [ ] Quando o **último item** do projeto for finalizado:
  - ✅ Abra o link do cliente novamente. Aparece o aviso verde **"Projeto concluído —
    Todos os itens deste projeto foram finalizados."**
  - ✅ O link do cliente passa a ter **data de validade**. Depois que ela vencer, o cliente
    não acessa mais e vê uma mensagem pedindo para entrar em contato com a loja.

- [ ] Por fim, abra o item finalizado e leia o **Histórico** de cima a baixo.
      ✅ Deve estar tudo lá, em ordem: quem atribuiu o desenhista, quem enviou o desenho, quem
      enviou o orçamento, **o cliente** aprovando, quem atribuiu o montador, o montador
      avançando cada etapa, o administrador aprovando a montagem, o pagamento e a confirmação.
      Cada linha com **nome, data e hora**.

**🎉 Se você chegou até aqui, o coração da funcionalidade está validado.**

---

## ROTEIRO 2 — O que acontece quando o cliente não aprova

Nem todo cliente aprova de primeira. Teste os dois desvios.

**Prepare:** crie um item novo (ou use o "Painel de TV" do Cliente Seed 1) e leve-o até
"Aguardando aprovação do cliente", como na Etapa 4 do Roteiro 1. Gere o acesso do cliente.

### 2A — O cliente pede alteração

- [ ] No portal do cliente, clique em **"Pedir alteração"** num item pendente.
- [ ] ✅ Pede confirmação. Confirme.
- [ ] ✅ O item passa a mostrar **"Alteração solicitada"** e os botões ficam desabilitados —
      a bola está com a JRM agora.
- [ ] Como administrador, abra o item.
- [ ] ✅ O status é **"Alteração solicitada pelo cliente"** e o histórico registra o pedido.
- [ ] ✅ A única etapa para onde o item pode ir é **de volta para "Aguardando desenho"**.
      Ou seja: o sistema obriga o retrabalho a passar pelo desenhista de novo, e depois por um
      orçamento novo. Não dá para "empurrar" o item de volta pro cliente sem redesenhar.
- [ ] Mande o item de volta para o desenhista e repita o ciclo: nova versão → ✅ ela vira
      **"Versão 2"** (a versão 1 continua guardada) → novo orçamento → novo envio.

### 2B — O cliente recusa

- [ ] Num outro item pendente, no portal do cliente, clique em **"Recusar"** e confirme.
- [ ] ✅ O item mostra **"Item recusado"** e todos os botões ficam travados.
- [ ] Como administrador, abra o item.
- [ ] ✅ O status é **"Recusado pelo cliente"**. É um **beco sem saída**: o item não avança
      mais por conta própria. Só o administrador, usando os poderes de exceção dele, pode movê-lo.

### 2C — Poderes de exceção do administrador

- [ ] Como **administrador**, abra qualquer item e olhe a área **"Alterar status"**.
- [ ] ✅ O administrador vê **todos** os status disponíveis, inclusive "Cancelado". Ele pode
      pular etapas e corrigir um erro operacional.
- [ ] Agora entre como **desenhista** e abra um item da fila dele.
- [ ] ✅ O desenhista vê **apenas** a transição permitida pelo fluxo. Ele não consegue
      cancelar um item nem pulá-lo para produção.

> 🔑 **É esse o desenho:** o fluxo é rígido para a equipe e flexível para o dono. Se algo
> der errado na prática, o administrador destrava — e o histórico registra que foi ele.

---

## ROTEIRO 3 — Anexos, arquivos e visualizador 3D

O sistema tem controle fino sobre **quem enxerga cada arquivo**. Isso importa: a planta
técnica não deve ir para o cliente, e o custo não deve ir para o montador.

- [ ] Como **administrador**, abra um item qualquer e vá até o card **"Anexos do item"**.
- [ ] Envie quatro arquivos. Em cada envio, escolha uma **categoria** (texto livre, ex.:
      `fotos do ambiente`, `planta`, `contrato`) e use os checkboxes **Quem pode ver**.
      Vendedor, Desenhista, Montador e Cliente começam todos marcados; desmarque públicos
      diferentes em cada arquivo.
- [ ] Como admin, use **Editar visibilidade** num anexo já enviado e salve outra combinação.

- [ ] ✅ Os anexos aparecem **agrupados por categoria** na lista.
- [ ] Agora confira o vazamento, um perfil de cada vez:
  - [ ] Abra o **portal do cliente** → ✅ ele vê apenas os arquivos que mantiveram
        **Cliente** marcado.
  - [ ] Abra o item como **montador** → ✅ em "Arquivos técnicos" ele vê o arquivo marcado
        como "Montador". Ele não vê o do desenhista.
  - [ ] Abra o item como **desenhista** → ✅ ele vê o dele, e continua sem ver nenhum valor.

### O visualizador 3D

Esta é uma das novidades mais visíveis para o cliente.

- [ ] Consiga um arquivo de modelo 3D com extensão **`.glb`** (o desenhista de vocês exporta
      isso do Promob/SketchUp; para testar, dá para baixar qualquer `.glb` de exemplo na internet).
- [ ] Anexe esse arquivo a um item mantendo **Cliente** marcado.
- [ ] Abra o **portal do cliente**.

**O que deve acontecer:**

- ✅ Em vez de um link de download, aparece um **visualizador 3D dentro do cartão do item**.
- ✅ O móvel **gira sozinho**.
- ✅ O cliente pode **arrastar com o dedo** para girar e dar zoom.
- ✅ No celular, existe a opção de **realidade aumentada** — o cliente aponta a câmera para
  a cozinha dele e vê o móvel no lugar.

- [ ] Anexe o mesmo `.glb` mantendo **Montador** marcado e desmarcando Cliente; abra como montador.
      ✅ O visualizador 3D aparece também para ele, dentro de "Arquivos técnicos".

> 💡 O sistema reconhece sozinho os formatos `.glb`, `.gltf` e `.usdz` e troca o link
> simples pelo visualizador. Qualquer outro arquivo (PDF, foto, planilha) continua sendo
> um link de download normal.

---

## ROTEIRO 4 — Segurança: cada pessoa vê só o que deve

Aqui você testa que o sistema **não confia no navegador**. Não basta esconder um botão:
o sistema tem que barrar o acesso mesmo se a pessoa digitar o endereço na mão.

Para cada linha da tabela abaixo, **entre com a conta indicada** e **digite o endereço na
barra do navegador**, depois do endereço do ambiente de teste.

| Entre como | Digite este endereço                   | O que deve acontecer                                                      |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------- |
| Vendedor   | `/administracao/financeiro-montadores` | ❌ Bloqueado — é redirecionado para o início                              |
| Vendedor   | `/projetos/dashboard`                  | ❌ Bloqueado — o dashboard é só do administrador                          |
| Vendedor   | `/administracao/usuarios`              | ❌ Bloqueado                                                              |
| Vendedor   | `/montador`                            | ❌ Bloqueado                                                              |
| Desenhista | `/projetos`                            | ✅ Permitido, mas somente a aba "Desenhos pendentes" e sem "Novo projeto" |
| Desenhista | `/administracao/financeiro-montadores` | ❌ Bloqueado                                                              |
| Montador   | `/projetos`                            | ❌ Bloqueado                                                              |
| Montador   | `/administracao/financeiro-montadores` | ❌ Bloqueado (ele só vê `/montador/financeiro`, o _dele_)                 |
| Marceneiro | `/projetos`                            | ❌ Bloqueado — o marceneiro só usa a área antiga de Cortes                |
| Marceneiro | `/projetos/novo`                       | ❌ Bloqueado                                                              |

- [ ] Testei todas as linhas acima.

**E dentro das telas que a pessoa _pode_ abrir:**

- [ ] Como **vendedor**, abra um item antes da atribuição. ✅ Ele vê orçamento/custo interno,
      mas não o botão "Atribuir montador" nem valores dos montadores.
- [ ] Depois que o admin atribuir o montador, reabra o mesmo item como vendedor. ✅ Restam
      apenas nome, ambiente e status; orçamento, desenho, montadores, histórico e anexos somem.
- [ ] Na lista `/projetos`, confirme que o vendedor vê também um cadastro criado por outro
      vendedor.
- [ ] Como **desenhista**, abra um item da fila. ✅ **Nenhum** valor em dinheiro aparece.
      Nem orçamento, nem montador.
- [ ] Como **montador**, você já testou: só os itens dele, só o valor dele.

- [ ] Como **montador**, abra `/montador/financeiro`. ✅ Só aparecem os pagamentos **dele**.
      Nenhum outro montador.

- [ ] **O teste do link do cliente:** copie o link de um projeto e cole numa janela anônima,
      mas **não digite a senha**. Tente ir direto para `/cliente/{codigo}/acompanhar`.
      ✅ Sem a senha, não há acesso a nada.

---

## ROTEIRO 5 — Dashboard, prazos e atrasos

### 5A — O dashboard (só administrador)

- [ ] Entre como **administrador** → menu Projetos → **"Dashboard"**.
- [ ] ✅ Você deve ver **dez indicadores**:

|                      |                      |
| -------------------- | -------------------- |
| Projetos em aberto   | Itens atrasados      |
| Aguardando desenho   | Aguardando orçamento |
| Aguardando aprovação | Aguardando montador  |
| Em produção          | Em montagem          |
| Montadores a pagar   | Vendido no mês       |

- [ ] Confira se os números batem com o que você fez até agora.
- [ ] Use os filtros: **busca por cliente**, **por vendedor**, **por desenhista** e
      **por status**. ✅ Os números dos cards **mudam** conforme o filtro. O dashboard não é
      uma foto fixa: ele responde ao recorte.
- [ ] Combine dois filtros ao mesmo tempo. ✅ Funciona.

### 5B — Itens atrasados

- [ ] No dashboard, procure a **tabela de itens atrasados**.
- [ ] ✅ O item "Bancada de lavanderia" (Cliente Seed 2) deve estar lá — ele foi criado de
      propósito com o prazo vencido.
- [ ] ✅ O card **"Itens atrasados"** deve contar esse item.
- [ ] Repare que o "Guarda-roupa planejado" também tem prazo vencido, mas **não** aparece
      como atrasado. ✅ Correto: ele já está **finalizado**, e item entregue não atrasa mais.

> 📝 **Observação honesta:** na tela **"Listar projetos"**, a coluna "Atrasados" dos dois
> projetos de exemplo mostra `0`, mesmo com a bancada atrasada. Isso é uma limitação dos
> dados de exemplo, que foram carregados direto no banco sem passar pelo cálculo. Nos
> projetos que **vocês criarem**, a contagem funciona normalmente. O dashboard, esse sim,
> recalcula sempre na hora e está correto.

### 5C — Configurar os prazos padrão

Aqui vocês definem quantos dias cada etapa "deveria" durar. É o que alimenta o cálculo
de atraso e o preenchimento automático de prazo.

- [ ] Menu Administração → **"Configurações de prazos"**.
- [ ] ✅ Existem seis campos: dias para **desenho**, **orçamento**, **aprovação do cliente**,
      **atribuição de montador**, **produção** e **montagem**.
- [ ] Mude "Dias para desenho" de `5` para `2` e salve. ✅ Mensagem "Prazos atualizados."
- [ ] Agora atribua um desenhista a um item novo.
      ✅ O prazo sugerido agora é de **2 dias**, não mais 5. A configuração pegou.
- [ ] Volte o valor para `5`.
- [ ] Entre como **vendedor** e tente abrir `/administracao/configuracoes-prazos`.
      ✅ Bloqueado. Só o administrador define prazos.

---

## ROTEIRO 6 — Cadastro de usuários da equipe

- [ ] Como administrador: Administração → **"Usuários"**.
- [ ] ✅ A tabela lista todo mundo, com **Nome, E-mail, Papéis** e um interruptor **Ativo**.
- [ ] Clique em **"Novo Usuário"** e cadastre alguém, por exemplo:
  - Nome: `Teste Temporário`
  - E-mail: `teste@seed.jrm`
  - Telefone
  - Senha inicial: `Teste@12345`
  - Papéis: marque **Vendedor**
- [ ] Salve. ✅ "Usuário criado." e ele aparece na tabela.
- [ ] Numa janela anônima, entre com essa conta nova. ✅ Funciona, e o menu é o de vendedor.

**Sobre os papéis:** uma pessoa pode ter **mais de um papel**. Se o seu vendedor também é
quem cuida do financeiro, marque Vendedor + Administrador. O sistema soma as permissões.

- [ ] Volte ao administrador e **desligue o interruptor "Ativo"** do `Teste Temporário`.
- [ ] ✅ A alteração salva sozinha, sem precisar de botão.
- [ ] Tente entrar com a conta desativada. ✅ Ela não deve mais ter acesso ao sistema.

> É assim que se desliga alguém que saiu da empresa: desativa. Não se apaga o usuário,
> porque o nome dele precisa continuar aparecendo no histórico dos projetos antigos.

---

## ROTEIRO 7 — Proteção do portal do cliente

O link do cliente é público — qualquer um que tenha o endereço pode tentar abrir. A senha
é a única barreira, então ela precisa ser bem protegida.

- [ ] Abra o link de um projeto numa janela anônima.
- [ ] Digite uma senha **errada**. ✅ Mensagem de erro, mas ele deixa tentar de novo.
- [ ] Erre a senha **quatro vezes** no total. ✅ Ainda dá para tentar.
- [ ] Erre a **quinta vez**.
- [ ] ✅ **A conta trava temporariamente.** Nem a senha certa funciona mais, por um tempo.

> 🔒 Isso impede que alguém descubra a senha por tentativa e erro, testando milhares de
> combinações. Depois de alguns minutos, o acesso destrava sozinho.

- [ ] Espere destravar (ou use o link de outro projeto) e entre com a senha **certa**.
      ✅ Entra normalmente.

- [ ] **Teste a regeneração:** como administrador, no projeto, clique em **"Regenerar senha"**.
- [ ] ✅ Uma senha nova aparece.
- [ ] Volte ao portal do cliente e tente a senha **antiga**. ✅ Ela não funciona mais.
- [ ] Use a nova. ✅ Funciona.

---

## 12. Checklist final

Depois de percorrer todos os roteiros, confira se você conseguiu comprovar cada uma
das afirmações abaixo. **Estas são as promessas do sistema.**

**Fluxo**

- [ ] Um projeto foi criado, passou por desenho, orçamento, aprovação do cliente,
      produção, montagem e pagamento, e chegou em "Finalizado".
- [ ] O vendedor do projeto foi preenchido sozinho, a partir de quem estava logado.
- [ ] Atribuir um montador jogou o item para "Em produção" automaticamente.
- [ ] A confirmação de recebimento do montador finalizou o item automaticamente.
- [ ] Um item recusado pelo cliente ficou travado; um item com alteração solicitada
      voltou obrigatoriamente para o desenhista.
- [ ] O desenhista pediu informações com justificativa; o vendedor recebeu a notificação,
      anexou o dado e reaprovar resolveu o badge sem perder a atribuição.

**Dinheiro**

- [ ] O cliente viu **só** o preço final. Nunca o custo interno nem o valor do montador.
- [ ] O desenhista não viu **nenhum** valor.
- [ ] O vendedor não viu o quanto o montador recebe.
- [ ] Nenhum pagamento foi liberado sem o administrador clicar em "Aprovar montagem".
- [ ] Nenhum pagamento foi registrado sem comprovante anexado.
- [ ] O montador viu apenas os pagamentos dele.

**Acesso**

- [ ] Cada papel viu só o seu menu.
- [ ] Digitar o endereço de uma página proibida na barra do navegador não funcionou.
- [ ] Um montador não conseguiu abrir o item de outro montador.
- [ ] O cliente entrou sem ter conta, só com link e senha.
- [ ] Cinco senhas erradas travaram o portal do cliente.
- [ ] Regenerar a senha invalidou a antiga.
- [ ] O vendedor viu todos os cadastros e somente o status depois da atribuição do montador.
- [ ] Cada anexo respeitou os quatro checkboxes de audiência.

**Registro**

- [ ] Todo o histórico do item mostra **o nome** de quem fez cada ação, com data e hora —
      não apenas o cargo.
- [ ] As versões de desenho foram numeradas e nenhuma foi sobrescrita.

**Experiência**

- [ ] O portal do cliente funcionou bem no celular.
- [ ] A tela do montador funcionou bem no celular, incluindo ligar e abrir o mapa.
- [ ] O visualizador 3D girou o móvel e permitiu zoom.

---

## 13. Como relatar um problema

Se algo não bateu com o que este documento descreve, anote assim — quanto mais específico,
mais rápido a correção:

```
Tela:              (ex.: portal do cliente, no celular)
Entrei como:       (ex.: montador@seed.jrm)
O que eu fiz:      (ex.: cliquei em "Confirmar recebimento")
O que aconteceu:   (ex.: a página ficou branca)
O que eu esperava: (ex.: o pagamento sair da lista)
Navegador/aparelho:(ex.: Chrome no iPhone)
```

Se der, tire um **print da tela**. Vale mais que qualquer descrição.

**Bugs e sugestões são coisas diferentes** — e as duas são bem-vindas. Se algo funcionou,
mas você achou confuso, feio ou trabalhoso demais para o dia a dia da equipe, isso também
é um relato válido. Este é o momento de mudar, antes de o sistema entrar em produção.
