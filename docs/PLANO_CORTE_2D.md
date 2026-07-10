# Plano de corte 2D

## Convenção dos materiais

O nome completo da chapa é a identidade do estoque. Nomes completos iguais
podem compartilhar chapas; nomes diferentes nunca entram no mesmo padrão. A
espessura é extraída exclusivamente do trecho `xxmm` do nome, não da peça.

Para planos enviados à seccionadora, use:

```text
código AD - chave AC - descrição do material xxmm
```

Exemplo:

```text
340 - 00000000000730 - MDF Branco Texturizado 15mm
```

O código AD e a chave AC têm até 15 caracteres ASCII. A interface bloqueia a
inclusão em um plano quando faltam espessura ou códigos.

## Domínio e otimização

O domínio independente de React/Firebase fica em
`src/domain/cutting-plan`. A entrada principal é:

```ts
generateCuttingPlan({ pieces, materials, settings, optimizationMode });
```

Cada peça ocupa um canto de uma região livre e gera divisões completas, de modo
que o resultado permaneça guilhotinável. O algoritmo compara candidatos
determinísticos para menos movimentos, melhor aproveitamento ou equilíbrio por
pesos configuráveis.

O veio da chapa percorre sempre seu comprimento de 2750 mm:

- sem sentido obrigatório: a peça pode girar;
- horizontal: o lado maior acompanha o veio;
- vertical: o lado menor acompanha o veio.

Não existe opção de rotação separada: ela é consequência do veio.

## Refino direcional e perdas

Os parâmetros padrão são margem externa de 10 mm, acerto interno de 7,5 mm em
cada lado e kerf de 3,2 mm. Eles são editáveis em
`/cortes/configuracoes-maquina` por administrador, vendedor e marceneiro.

As quatro bordas não são removidas no começo. O agendador prepara somente a
direção que será usada. A borda inicial é acertada ao começar essa direção; a
borda oposta só recebe movimento separado quando uma peça realmente encosta
nela. É possível cortar primeiro todas as tiras e, após virá-las, acertar nelas
as duas bordas da direção transversal.

Se uma margem externa não foi cortada, ela é incorporada à dimensão física da
sobra correspondente. Os dois acertos internos de 7,5 mm e o kerf ficam
registrados como regiões distintas e visíveis no desenho.

## Sobras e custos

Toda região restante é chamada apenas de **sobra**. Não há classificação entre
reutilizável e descarte. As métricas separam área usada, área de sobras e perdas
do processo.

O valor do plano é:

```text
chapas inteiras
+ movimentos × preço por movimento
+ metros de fita × preço por metro
```

No modo plano, esse total substitui completamente os preços calculados por
peça. Balcão/Marceneiro/Custo e valores unitários não aparecem na tela, no
resumo nem nas etiquetas.

## Desenho, visualização e impressão

O SVG usa coordenadas em milímetros, mantém a chapa vertical e preserva a
proporção geométrica. O plano é monocromático:

- aresta com fita: linha preta contínua forte;
- aresta sem fita: linha cinza tracejada;
- sobra: hachura diagonal;
- margem externa e acerto interno: hachuras próprias.

A visualização em nova aba oferece zoom de 50% a 400%, troca de chapas e
detalhes da peça por clique. O zoom muda apenas o tamanho de exibição, nunca as
coordenadas.

Na impressão:

- **Resumo**: página do pedido primeiro, depois uma página por chapa;
- **Plano**: somente as páginas de plano;
- **Etiquetas**: somente resumo operacional e etiquetas.

As folhas de plano mostram diagrama, lista compacta de peças e lista de sobras.
A ordem sugerida dos cortes não é exibida em tela ou PDF.

## Persistência

O resultado é salvo em `order.cuttingPlan` com versão, status, snapshot de
entrada, configurações, chapas, geometria, métricas, custos e timestamps. Uma
mudança nas peças ou nos parâmetros globais marca o plano como `outdated` e
exige regeneração antes da confirmação ou exportação.

## Exportação Giben `.AC/.AD`

`exportCuttingPlanToGiben` converte cada chapa para uma árvore guilhotinada e
gera um par por material/espessura. Não exporta retângulos soltos por
coordenadas.

Garantias implementadas:

- `.AC`: cabeçalho de 37 caracteres e cortes de 30;
- `.AD`: tipos 1/2/3/4 com 498/922/490/490 caracteres;
- padrões globais `01–99`; índices AD locais por material;
- peças locais `01–99` e `00` nos segmentos intermediários;
- registros AD na ordem: cabeçalho, peças, sobras, chapas;
- ASCII, CRLF e quebra final;
- pares com o mesmo nome-base dentro do ZIP;
- fitas acompanham a rotação física da peça;
- validação cruzada de peças entre AC e AD;
- fixture `input.json` e golden files comparados byte a byte.

O botão “Máquina” na lista baixa o ZIP. Os arquivos devem ser validados no
software da Giben e pelo operador responsável antes de qualquer corte real.

## Limitações

- a heurística não garante o ótimo matemático global;
- são aceitas no máximo quatro fases (`2–5`) e 99 padrões por lote;
- um padrão não pode exceder 99 peças;
- padrões equivalentes ainda usam `repeatCount = 1`;
- campos de etiqueta não confirmados no guia permanecem vazios ou usam o perfil
  configurável;
- a aplicação não envia comandos diretamente à seccionadora.
