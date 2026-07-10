# Plano de corte 2D

## Arquitetura

O domínio fica em `src/domain/cutting-plan` e não depende de React nem do
Firebase. A entrada principal é:

```ts
generateCuttingPlan({ pieces, materials, settings, optimizationMode });
```

O retorno contém o snapshot da entrada, chapas, posicionamentos, sobras,
sequência de cortes, métricas, custos e a versão do algoritmo. Componentes de
tela e impressão consomem esse mesmo retorno; nenhuma geometria é recalculada
na camada visual.

## Heurística guilhotinada

Cada chapa começa como um retângulo livre. Uma peça ocupa o canto superior
esquerdo de um painel livre e o painel é dividido por, no máximo, dois cortes
completos: primeiro uma faixa e depois a peça dentro da faixa. As duas regiões
restantes nunca se sobrepõem e só podem ser subdivididas por novos cortes
completos. Isso forma uma árvore de cortes guilhotinados executável.

O otimizador gera candidatos determinísticos combinando cinco ordenações de
peças, duas direções de formação de faixas e critérios de escolha do retângulo
livre. A escolha final depende do modo:

- `fewer_cuts`: movimentos, depois chapas, depois descarte;
- `best_yield`: chapas, depois descarte, depois movimentos;
- `balanced`: pontuação normalizada com os pesos abaixo.

Pesos padrão do modo equilibrado:

| Fator                          | Peso |
| ------------------------------ | ---: |
| Desperdício não reaproveitável | 0,50 |
| Movimentos                     | 0,30 |
| Chapas                         | 0,20 |

Os pesos são editáveis na interface e persistidos no plano.

## Refino direcional das bordas

A geometria útil sempre desconta 10 mm dos quatro lados por padrão, mas a
sequência da máquina não remove as quatro bordas no início. O agendamento é
feito sob demanda:

1. refina as duas bordas da direção que será cortada;
2. executa todos os cortes de faixas disponíveis nessa direção;
3. ao virar uma faixa, refina nela as duas bordas da nova direção;
4. executa os cortes transversais dessa faixa.

Os estados de refino são herdados pelas regiões filhas. Assim uma borda já
preparada não é cobrada novamente, enquanto cada faixa virada recebe os dois
refinos que ainda faltam. Cada refino é um movimento contabilizado.

## Perdas

- `edgeTrimMm`: 10 mm por borda por padrão;
- `kerfMm`: 3,2 mm por corte por padrão;
- `internalCutLossMm`: 15 mm adicionais quando um novo corte é iniciado em uma
  faixa ou sobra já criada.

Kerf e perda interna ficam separados em cada etapa. A região perdida ocupa
`kerfMm + internalCutLossMm`, portanto nunca pode receber outra peça.

## Sobras e métricas

Uma sobra é reaproveitável quando aceita, em alguma orientação, o retângulo
mínimo configurado (300 × 300 mm por padrão). Aproveitamento e desperdício são
calculados sobre a área total das chapas cobradas. Refino, kerf, perda interna e
sobras menores entram no descarte não reaproveitável.

## Custos

O cliente paga cada chapa inteira utilizada. O total é:

```text
chapas inteiras
+ movimentos × preço por movimento
+ metros de fita × preço por metro
```

Valores padrão: R$ 3,00 por movimento e R$ 2,00 por metro de fita. O preço
unitário da chapa vem do material cadastrado.

## Persistência e invalidação

O plano é salvo em `order.cuttingPlan`, com `orderId`, versão, status, snapshot
das peças e materiais, configurações, resultado, métricas, custos e timestamps.
Ao editar as peças, o snapshot é comparado com o cadastro atual. Qualquer
mudança relevante marca o plano como `outdated`; pedidos do tipo plano de corte
só podem ser confirmados depois de uma nova geração.

## Limitações da primeira versão

- usa heurística determinística, sem garantia de ótimo matemático global;
- trabalha com peças retangulares e cortes guilhotinados;
- não modela estoque físico de sobras entre pedidos diferentes;
- não envia comandos diretamente para a seccionadora;
- a impressão usa o mecanismo de impressão/PDF do navegador já adotado pelo
  sistema.
