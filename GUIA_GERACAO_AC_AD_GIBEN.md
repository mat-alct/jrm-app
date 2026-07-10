# Guia técnico — geração de arquivos `.AC` e `.AD` para planos de corte

## 1. Objetivo

Implementar, em uma aplicação de plano de corte, a exportação de um par de arquivos:

```text
nome-do-arquivo.AC
nome-do-arquivo.AD
```

O `.AC` descreve os padrões e a sequência guilhotinada de cortes.

O `.AD` descreve:

- cabeçalho do serviço;
- peças/colocações usadas nos padrões;
- sobras resultantes;
- chapas usadas;
- dados destinados às etiquetas.

Este guia foi obtido por engenharia reversa de **7 pares reais de arquivos `.AC`/`.AD`**. Ele deve ser tratado como um perfil de compatibilidade específico:

```text
giben-cortecloud-v1
```

Não trate o `.AD` como um formato universal. A parte de etiquetas pode variar conforme a instalação, o software de origem e a configuração da máquina.

---

# 2. Conclusões confirmadas

## 2.1 Características gerais

- Arquivos de texto ASCII.
- Quebra de linha Windows: `CRLF`, bytes `\r\n`.
- Deve existir quebra de linha ao final do arquivo.
- Campos de largura fixa.
- Não existem delimitadores como vírgula, ponto e vírgula, JSON ou XML.
- Espaços fazem parte do formato.
- Números de medida são gravados em décimos de milímetro.
- Exemplo:

```text
1420,0 mm → 14200
905,5 mm  → 09055
```

## 2.2 Relação entre os arquivos

Para cada material/espessura, gerar um par com o mesmo nome-base:

```text
pedido-material.AC
pedido-material.AD
```

O `.AC` contém os padrões de corte daquele material.

O `.AD` contém as peças, sobras e chapas referentes aos mesmos padrões, na mesma ordem.

## 2.3 Numeração dos padrões

O número do padrão no `.AC` é **global dentro do serviço**, mesmo quando existem vários materiais.

Exemplo observado:

```text
Material A → padrões 01
Material B → padrões 02 e 03
Material C → padrão 04
Material D → padrões 05, 06 e 07
```

Dentro de cada arquivo `.AD`, a numeração de chapa/padrão usada nos registros tipo `4` reinicia em `1`.

Portanto, mantenha dois identificadores:

```ts
globalPatternNumber: number; // usado no .AC
localPatternIndex: number;   // usado no .AD, começa em 1 por arquivo
```

## 2.4 Numeração das peças no `.AC`

A numeração das peças reinicia em cada padrão:

```text
01, 02, 03...
```

O campo possui apenas dois caracteres:

```text
00–99
```

O valor `00` significa que o resultado daquele corte ainda não é uma peça final. Ele será subdividido por cortes de uma fase posterior.

## 2.5 Repetição de padrão

O cabeçalho de padrão do `.AC` possui um campo de repetição.

Exemplo:

```text
repeatCount = 2
```

Significa que a mesma chapa/padrão deve ser executada duas vezes.

Não duplique todas as linhas do padrão no `.AC`. Grave o padrão uma vez e informe a repetição no cabeçalho.

No `.AD`, as colocações daquele padrão também aparecem uma vez. A repetição é controlada pelo cabeçalho do `.AC`.

---

# 3. Modelo de dados recomendado

Não gere `.AC`/`.AD` diretamente a partir de retângulos soltos com `x`, `y`, `width` e `height`.

Primeiro converta o resultado do otimizador para uma **árvore de cortes guilhotinados**.

## 3.1 Serviço

```ts
interface CuttingJob {
  jobId: string;
  orderId: string;
  customerName: string;
  operatorName: string;
  generatedAt: Date;

  machineProfile: MachineExportProfile;
  materials: MaterialCutPlan[];
}
```

## 3.2 Perfil da máquina

```ts
interface MachineExportProfile {
  id: "giben-cortecloud-v1";

  encoding: "ascii";
  lineEnding: "\r\n";

  edgeTrimMm: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };

  sawKerfMm: number;

  minimumReusableOffcutMm: {
    width: number;
    height: number;
  };

  labelImageDirectory: string;

  defaultAcHeaderFlag: 0 | 1;
}
```

Valores identificados nos exemplos:

```ts
const profile: MachineExportProfile = {
  id: "giben-cortecloud-v1",
  encoding: "ascii",
  lineEnding: "\r\n",

  edgeTrimMm: {
    left: 10,
    right: 10,
    top: 10,
    bottom: 10,
  },

  sawKerfMm: 4.5,

  minimumReusableOffcutMm: {
    width: 0,
    height: 0,
  },

  labelImageDirectory: "C:\\cortecloud\\etiquetas",
  defaultAcHeaderFlag: 0,
};
```

Esses valores devem ser configuráveis. Não deixe `10 mm` e `4,5 mm` fixos no código.

## 3.3 Material

O identificador usado no `.AC` pode ser diferente do identificador usado no `.AD`.

Isso foi observado nos arquivos reais.

```ts
interface MaterialCutPlan {
  materialId: string;

  // Exatamente 15 caracteres após formatação.
  acMaterialKey: string;

  // Código utilizado no início dos registros .AD.
  adMaterialCode: string;

  thicknessMm: number;

  materialLabel: string;
  stockWidthMm: number;
  stockHeightMm: number;

  patterns: CuttingPattern[];
}
```

Exemplo:

```ts
{
  acMaterialKey: "2209 - MDF 15.0",
  adMaterialCode: "2209",
  thicknessMm: 15,
}
```

Não derive obrigatoriamente `acMaterialKey` de `adMaterialCode`.

## 3.4 Padrão de corte

```ts
interface CuttingPattern {
  globalPatternNumber: number;
  localPatternIndex: number;

  repeatCount: number;

  stockWidthMm: number;
  stockHeightMm: number;

  // Dimensões na orientação em que a máquina executará o padrão.
  orientedWidthMm: number;
  orientedHeightMm: number;

  rotatedFromStock: boolean;

  rootCutGroup: CutGroup;

  placements: PiecePlacement[];
  offcuts: Offcut[];
}
```

## 3.5 Árvore guilhotinada

```ts
type CutPhase = 2 | 3 | 4 | 5;

interface CutGroup {
  phase: CutPhase;

  // Eixo no retângulo atual.
  axis: "X" | "Y";

  parentWidthMm: number;
  parentHeightMm: number;

  segments: CutSegment[];
}

interface CutSegment {
  // Medida consumida no eixo do grupo.
  sizeMm: number;

  // Normalmente 1.
  cutQuantity: number;

  // Uma das duas opções:
  finalPiece?: PiecePlacement;
  childGroup?: CutGroup;
}
```

Regras:

- `phase 2`: primeira fase;
- `phase 3`: segunda fase;
- `phase 4`: terceira fase;
- `phase 5`: quarta fase;
- um segmento final recebe número de peça;
- um segmento subdividido recebe número `00`;
- o grupo filho deve usar a fase seguinte.

## 3.6 Peça colocada

```ts
interface PiecePlacement {
  placementId: string;

  // Identificador local usado no .AC.
  localPartNumber: number;

  // Ordem global dentro do .AD.
  adSequenceNumber: number;

  placedWidthMm: number;
  placedHeightMm: number;

  // Dimensões originais da peça antes de eventual rotação.
  designWidthMm: number;
  designHeightMm: number;

  rotated: boolean;

  sourcePartId: string;
  labelId: string;

  pieceName: string;
  moduleName: string;
  roomName: string;
  customerName: string;
  operatorName: string;
  orderId: string;

  requestedQuantity: number;

  edgeBands: [EdgeBand | null, EdgeBand | null, EdgeBand | null, EdgeBand | null];

  machiningOperation?: string;
  machiningSide?: string;

  labelImageFileName?: string;

  // Campos específicos do perfil de etiqueta.
  labelProfile?: {
    majorSideSlot?: "A" | "B" | "none";
    arrow1?: string;
    arrow2?: string;
    finalMarker?: string;
  };
}
```

## 3.7 Fita de borda

```ts
interface EdgeBand {
  thicknessMm: number;
  heightMm: number;
  description: string;
}
```

Exemplo curto:

```text
0.4x22 ROSA INF
```

Exemplo longo:

```text
0.4x22 ROSA INFINITO
```

## 3.8 Sobra

```ts
interface Offcut {
  sequenceNumber: number;
  widthMm: number;
  heightMm: number;
  letter: string;
}
```

---

# 4. Pipeline completo de exportação

## Etapa 1 — validar o plano

Antes de gerar os arquivos:

1. separar peças por material e espessura;
2. validar se todas cabem na chapa;
3. aplicar orientação e restrição de veio;
4. remover as bordas configuradas da chapa;
5. considerar a espessura da serra;
6. garantir que o layout é guilhotinável;
7. converter o layout para árvore de cortes;
8. calcular sobras;
9. atribuir padrões;
10. atribuir números locais às peças de cada padrão.

## Etapa 2 — criar padrões equivalentes

Padrões completamente iguais podem ser agrupados usando `repeatCount`.

A assinatura de um padrão deve considerar:

```text
- dimensão e orientação da chapa;
- árvore de cortes;
- ordem dos cortes;
- dimensões das peças;
- identificadores/etiquetas envolvidos;
- restrição de veio;
```

Para uma primeira versão segura, é aceitável gerar:

```ts
repeatCount = 1;
```

para todos os padrões.

Posteriormente, implemente agrupamento de padrões idênticos.

## Etapa 3 — numerar globalmente os padrões

Percorra todos os materiais do serviço:

```ts
let nextPatternNumber = 1;

for (const material of materials) {
  for (const pattern of material.patterns) {
    pattern.globalPatternNumber = nextPatternNumber++;
  }
}
```

Limite:

```text
01–99
```

Se houver mais de 99 padrões, divida o serviço em mais de um lote de exportação.

## Etapa 4 — numerar peças dentro de cada padrão

Para cada padrão:

```ts
let nextPartNumber = 1;
```

Percorra a árvore na mesma ordem em que os registros serão exportados.

Quando encontrar uma peça final:

```ts
placement.localPartNumber = nextPartNumber++;
```

Limite:

```text
01–99 por padrão
```

## Etapa 5 — montar a lista do `.AD`

A ordem observada é:

```text
1. um registro tipo 1;
2. todos os registros tipo 2;
3. todos os registros tipo 3;
4. todos os registros tipo 4.
```

Para os tipos `2`:

- percorrer os padrões na ordem global;
- dentro de cada padrão, usar a mesma ordem das peças finais emitidas no `.AC`;
- não multiplicar pelas repetições do padrão.

Para os tipos `3`:

- percorrer os padrões na ordem global;
- reiniciar a sequência de sobras em `1` a cada padrão;
- reiniciar as letras em `A` a cada padrão;
- sobras iguais podem reutilizar a mesma letra;
- ainda assim, cada ocorrência de sobra recebe sua própria linha.

Para os tipos `4`:

- emitir uma linha por padrão;
- usar `localPatternIndex`, começando em `1` dentro do arquivo `.AD`.

---

# 5. Formato do arquivo `.AC`

## 5.1 Cabeçalho de padrão

Cada padrão começa por uma linha de **37 caracteres**.

| Posição | Tamanho | Campo |
|---|---:|---|
| 1–15 | 15 | `acMaterialKey` |
| 16–18 | 3 | espessura × 10 |
| 19–20 | 2 | número global do padrão |
| 21 | 1 | tipo fixo `1` |
| 22–26 | 5 | repetição do padrão |
| 27–31 | 5 | dimensão orientada A × 10 |
| 32–36 | 5 | dimensão orientada B × 10 |
| 37 | 1 | flag do perfil, observado como `0` |

Exemplo:

```text
00000000000730 1500110000218400275000
```

Separação:

```text
00000000000730  | 150 | 01 | 1 | 00002 | 18400 | 27500 | 0
material          esp.  pad. tipo repet.   A       B     flag
```

## 5.2 Registro de corte

Cada corte possui **30 caracteres**.

| Posição | Tamanho | Campo |
|---|---:|---|
| 1–15 | 15 | `acMaterialKey` |
| 16–18 | 3 | espessura × 10 |
| 19–20 | 2 | número global do padrão |
| 21 | 1 | fase `2`, `3`, `4` ou `5` |
| 22–23 | 2 | número local da peça ou `00` |
| 24–28 | 5 | medida do segmento × 10 |
| 29–30 | 2 | quantidade do corte |

Exemplo:

```text
00000000000730 150013011400001
```

Separação:

```text
00000000000730  | 150 | 01 | 3 | 01 | 14000 | 01
material          esp.  pad. fase peça medida   qtd
```

## 5.3 Regras para o número da peça

Use número maior que zero quando o segmento resultar diretamente em uma peça final:

```text
01, 02, 03...
```

Use `00` quando o segmento será subdividido:

```text
fase 2 / peça 00 / medida 2200
fase 3 / peça 00 / medida 400
fase 4 / peça 05 / medida 1290
```

## 5.4 Travessia da árvore

Use travessia em profundidade, preservando a ordem física dos segmentos.

```ts
function emitCutGroup(group: CutGroup): AcCutRecord[] {
  const records: AcCutRecord[] = [];

  for (const segment of group.segments) {
    records.push({
      phase: group.phase,
      partNumber: segment.finalPiece?.localPartNumber ?? 0,
      dimensionMm: segment.sizeMm,
      quantity: segment.cutQuantity,
    });

    if (segment.childGroup) {
      records.push(...emitCutGroup(segment.childGroup));
    }
  }

  return records;
}
```

A ordem deve ser:

```text
corte do segmento pai
→ todos os cortes internos daquele segmento
→ próximo segmento do pai
```

## 5.5 Exemplo simples

Chapa orientada:

```text
1840 × 2750
```

Primeira fase:

```text
faixa de 800
faixa de 800
```

Dentro de cada faixa:

```text
1400
1100
```

Árvore:

```text
fase 2: 800
  fase 3: peça 01, 1400
  fase 3: peça 02, 1100
fase 2: 800
  fase 3: peça 03, 1400
  fase 3: peça 04, 1100
```

Registros:

```text
...2 00 08000 01
...3 01 14000 01
...3 02 11000 01
...2 00 08000 01
...3 03 14000 01
...3 04 11000 01
```

---

# 6. Cálculo de bordas, serra e sobras

## 6.1 Área útil inicial

```ts
usableWidth =
  stockWidth
  - edgeTrim.left
  - edgeTrim.right;

usableHeight =
  stockHeight
  - edgeTrim.top
  - edgeTrim.bottom;
```

Exemplo:

```text
chapa: 1840 × 2750
bordas: 10 mm de cada lado

área útil: 1820 × 2730
```

## 6.2 Consumo de uma sequência de cortes

Quando `n` segmentos são retirados sequencialmente e sobra material após eles:

```ts
remaining =
  parentLength
  - sum(segmentSizes)
  - n * sawKerf;
```

Exemplo:

```text
comprimento útil: 2730
peças: 1400 + 1100
serra: 4,5 por corte

sobra:
2730 - 1400 - 1100 - 2 × 4,5
= 221 mm
```

Outro exemplo:

```text
largura útil: 1820
faixas: 800 + 800
serra: 4,5 por corte

sobra:
1820 - 800 - 800 - 2 × 4,5
= 211 mm
```

Esses resultados aparecem exatamente nos arquivos analisados.

## 6.3 Não inferir sobras apenas no exportador

O otimizador deve produzir explicitamente os retângulos restantes.

A camada de exportação deve receber:

```ts
pattern.offcuts
```

já calculado e validado.

Ainda assim, crie um validador independente que recalcule as sobras para detectar inconsistências.

## 6.4 Letras das sobras

Dentro de cada padrão:

```text
A, B, C, D...
```

Quando duas sobras possuem exatamente as mesmas dimensões, os exemplos reutilizam a mesma letra.

Algoritmo:

```ts
function assignOffcutLetters(offcuts: Offcut[]): void {
  const dimensionToLetter = new Map<string, string>();
  let nextLetterCode = "A".charCodeAt(0);

  for (const offcut of offcuts) {
    const key = `${toTenths(offcut.widthMm)}x${toTenths(offcut.heightMm)}`;

    let letter = dimensionToLetter.get(key);

    if (!letter) {
      letter = String.fromCharCode(nextLetterCode++);
      dimensionToLetter.set(key, letter);
    }

    offcut.letter = letter;
  }
}
```

Se ultrapassar `Z`, o perfil precisa ser testado. A amostra não demonstrou suporte além de uma letra.

---

# 7. Formato do arquivo `.AD`

## 7.1 Tipos de registro identificados

| Tipo na posição 29 | Tamanho | Uso |
|---:|---:|---|
| `1` | 498 | cabeçalho |
| `2` | 922 | peça/colocação e etiqueta |
| `3` | 490 | sobra |
| `4` | 490 | chapa/padrão |

## 7.2 Estratégia correta de implementação

Crie um buffer preenchido com espaços:

```ts
class FixedWidthLine {
  private readonly chars: string[];

  constructor(public readonly length: number) {
    this.chars = Array.from({ length }, () => " ");
  }

  put(
    startOneBased: number,
    width: number,
    value: string,
    align: "left" | "right" = "left",
    pad = " ",
  ): this {
    const normalized = value.slice(0, width);
    const formatted =
      align === "right"
        ? normalized.padStart(width, pad)
        : normalized.padEnd(width, pad);

    for (let i = 0; i < width; i++) {
      this.chars[startOneBased - 1 + i] = formatted[i];
    }

    return this;
  }

  toString(): string {
    return this.chars.join("");
  }
}
```

Nunca monte o `.AD` concatenando espaços manualmente.

---

# 8. Registro `.AD` tipo 1 — cabeçalho

Tamanho:

```text
498 caracteres
```

Mapa confirmado:

| Posição | Tamanho | Campo |
|---|---:|---|
| 1–15 | 15 | código do material, alinhado à esquerda |
| 16–19 | 4 | espessura × 10 |
| 20–28 | 9 | primeira parte do operador/cliente |
| 29 | 1 | tipo fixo `1` |
| 30–37 | 8 | espaços |
| 38–62 | 25 | continuação do nome |
| 63–71 | 9 | data `YYYYMonDD` |
| 72–498 | 427 | espaços |

A amostra divide nomes longos:

```text
ENOQUE PEREIRA
```

como:

```text
20–28: ENOQUE PE
38–42: REIRA
```

Formatação sugerida:

```ts
function splitHeaderName(name: string): {
  first: string;
  continuation: string;
} {
  const ascii = toAscii(name);

  return {
    first: ascii.slice(0, 9),
    continuation: ascii.slice(9),
  };
}
```

Data:

```text
2026Jul03
```

Use abreviações em inglês:

```text
Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec
```

---

# 9. Registro `.AD` tipo 2 — peça e etiqueta

Tamanho:

```text
922 caracteres
```

## 9.1 Área principal confirmada

| Posição | Tamanho | Campo |
|---|---:|---|
| 1–15 | 15 | `adMaterialCode` |
| 16–19 | 4 | espessura × 10 |
| 20–28 | 9 | espaços |
| 29 | 1 | tipo fixo `2` |
| 30–33 | 4 | sequência da colocação, alinhada à direita com espaços |
| 34–39 | 6 | dimensão colocada A × 10 |
| 40–45 | 6 | dimensão colocada B × 10 |
| 46–50 | 5 | quantidade da colocação; observado `00001` |
| 51 | 1 | flag de peça final; observado `1` |
| 52 | 1 | espaço |
| 53 | 1 | `0` |
| 54 | 1 | espaço |
| 55 | 1 | `0` |
| 56–60 | 5 | espaços |
| 61–80 | 20 | nome curto da peça |
| 81–88 | 8 | ambiente curto |
| 89–99 | 11 | cliente curto |
| 100–130 | 31 | zeros |
| 131–156 | 26 | espaços |
| 157 | 1 | `0` |
| 158–250 | 93 | espaços |

Exemplo de bloco numérico:

```text
   1 005000 014200 00001 1
```

No arquivo não existem os espaços acima entre todos os subcampos. Eles foram adicionados apenas para visualização.

## 9.2 Fitas de borda curtas

Quatro campos de 15 caracteres:

| Posição | Lado |
|---|---|
| 251–265 | fita 1 |
| 266–280 | fita 2 |
| 281–295 | fita 3 |
| 296–310 | fita 4 |

Formatação:

```text
0.4x22 ROSA INF
```

Função:

```ts
function formatEdgeBandShort(edge: EdgeBand | null): string {
  if (!edge) return "";

  return `${formatDecimal(edge.thicknessMm)}x${formatCompact(edge.heightMm)} ${edge.description}`
    .slice(0, 15);
}
```

A relação exata entre os quatro campos e frente/trás/esquerda/direita deve ser definida pelo mesmo sistema de orientação usado pelo plano.

Não altere a ordem dos lados após rotacionar uma peça sem também rotacionar as fitas.

## 9.3 Operação e módulo

| Posição | Tamanho | Campo |
|---|---:|---|
| 311–319 | 9 | espaços |
| 320–329 | 10 | operação, exemplo `FURAR A` |
| 330 | 1 | espaço |
| 331–350 | 20 | descrição curta do módulo |
| 351–409 | 59 | espaços |

## 9.4 Identificador e assinatura dimensional

| Posição | Tamanho | Campo |
|---|---:|---|
| 410–418 | 9 | identificador da etiqueta |
| 419–449 | 31 | espaços |
| 450–461 | 12 | assinatura dimensional |
| 462–490 | 29 | espaços |

Assinatura observada:

```text
1420.00500.0
0800.00831.2
```

Ela é formada por duas medidas de seis caracteres:

```text
1420.0 + 0500.0
```

Não assuma que a ordem é sempre a mesma das dimensões colocadas. Mantenha separadas:

```ts
placedWidthMm;
placedHeightMm;
designWidthMm;
designHeightMm;
```

A assinatura deve ser gerada com a ordem exigida pela etiqueta/origem.

## 9.5 Imagem e indicação de lado maior

| Posição | Tamanho | Campo |
|---|---:|---|
| 491–530 | 40 | caminho do `.bmp` |
| 531–533 | 3 | espaços |
| 534–555 | 22 | slot A de `----- LADO MAIOR -----` |
| 556–558 | 3 | espaços |
| 559–580 | 22 | slot B de `----- LADO MAIOR -----` |
| 581–583 | 3 | espaços |
| 584 | 1 | quantidade de lados com fita |
| 585–586 | 2 | espaços |

Exemplo:

```text
C:\cortecloud\etiquetas\689951818.bmp
```

O arquivo `.BMP` não está embutido no `.AD`. O `.AD` guarda apenas o caminho.

O slot A ou B parece depender da orientação da peça/etiqueta. Como isso não pôde ser provado integralmente, modele como configuração explícita:

```ts
majorSideSlot: "A" | "B" | "none";
```

## 9.6 Dados da etiqueta

| Posição | Tamanho | Campo |
|---|---:|---|
| 587–594 | 8 | pedido |
| 595–602 | 8 | espaços |
| 603–611 | 9 | identificador da etiqueta |
| 612–618 | 7 | espaços |
| 619–626 | 8 | código/nome curto do cliente/projeto |
| 627–634 | 8 | espaços |
| 635–648 | 14 | operador/cliente |
| 649–656 | 8 | espaços |
| 657–696 | 40 | material para etiqueta |
| 697–698 | 2 | espaços |
| 699–720 | 22 | nome da peça |
| 721–722 | 2 | espaços |
| 723–742 | 20 | módulo |
| 743–744 | 2 | espaços |
| 745–751 | 7 | ambiente |
| 752–761 | 10 | espaços |
| 762–768 | 7 | cliente |
| 769–775 | 7 | espaços |
| 776 | 1 | marcador de orientação opcional |
| 777 | 1 | espaço |
| 778 | 1 | marcador de orientação opcional |
| 779 | 1 | espaço |
| 780 | 1 | quantidade original do item, observado `1–6` |
| 781–785 | 5 | espaços |
| 786–792 | 7 | dimensão de etiqueta 1 |
| 793–799 | 7 | dimensão de etiqueta 2 |
| 800–820 | 21 | fita longa 1 |
| 821–841 | 21 | fita longa 2 |
| 842–862 | 21 | fita longa 3 |
| 863–883 | 21 | fita longa 4 |
| 884–911 | 28 | espaços |
| 912 | 1 | marcador opcional, observado `~` em um material |
| 913–922 | 10 | espaços |

## 9.7 Campos parcialmente inferidos

Os seguintes campos pertencem principalmente ao layout de etiqueta e devem permanecer configuráveis:

```text
- slots A/B de “LADO MAIOR”;
- marcadores nas posições 776 e 778;
- marcador “~” na posição 912;
- ordem visual das dimensões;
- texto curto e longo das fitas;
- relação exata entre os quatro lados e a rotação da peça;
- operação de furação;
```

Crie suporte a sobrescrita por posição:

```ts
interface AdPieceRawOverrides {
  fields?: Array<{
    start: number;
    width: number;
    value: string;
    align?: "left" | "right";
    pad?: string;
  }>;
}
```

Isso permite ajustar o perfil sem reescrever o gerador.

---

# 10. Registro `.AD` tipo 3 — sobra

Tamanho:

```text
490 caracteres
```

Mapa confirmado:

| Posição | Tamanho | Campo |
|---|---:|---|
| 1–15 | 15 | `adMaterialCode` |
| 16–19 | 4 | espessura × 10 |
| 20–28 | 9 | espaços |
| 29 | 1 | tipo fixo `3` |
| 30–33 | 4 | sequência da sobra dentro do padrão |
| 34–39 | 6 | dimensão A × 10 |
| 40–45 | 6 | dimensão B × 10 |
| 46–50 | 5 | quantidade, observado `00001` |
| 51 | 1 | flag `0` |
| 52 | 1 | espaço |
| 53 | 1 | `0` |
| 54 | 1 | espaço |
| 55 | 1 | `0` |
| 56–99 | 44 | espaços |
| 100–125 | 26 | zeros |
| 126–130 | 5 | espaços |
| 131 | 1 | letra da sobra |
| 132–156 | 25 | espaços |
| 157 | 1 | `0` |
| 158–490 | 333 | espaços |

A sequência reinicia em `1` a cada padrão.

---

# 11. Registro `.AD` tipo 4 — chapa/padrão

Tamanho:

```text
490 caracteres
```

Mapa confirmado:

| Posição | Tamanho | Campo |
|---|---:|---|
| 1–15 | 15 | `adMaterialCode` |
| 16–19 | 4 | espessura × 10 |
| 20–28 | 9 | espaços |
| 29 | 1 | tipo fixo `4` |
| 30–33 | 4 | índice local do padrão no `.AD` |
| 34–39 | 6 | comprimento real da chapa × 10 |
| 40–45 | 6 | largura real da chapa × 10 |
| 46–50 | 5 | quantidade, observado `00001` |
| 51 | 1 | rotação em relação à chapa real |
| 52–60 | 9 | espaços |
| 61–99 | 39 | descrição curta do material |
| 100–125 | 26 | espaços |
| 126 | 1 | `0` |
| 127–490 | 364 | espaços |

Flag de rotação:

```text
0 = orientação do cabeçalho .AC igual à chapa do tipo 4
1 = dimensões do cabeçalho .AC trocadas
```

Exemplo:

```text
chapa real no .AD: 2750 × 1840
cabeçalho no .AC:  1840 × 2750

rotatedFromStock = true
flag = 1
```

A repetição do padrão continua no cabeçalho `.AC`. O registro tipo `4` permanece com quantidade `00001` nos exemplos.

---

# 12. Funções numéricas obrigatórias

## 12.1 Conversão para décimos

Evite ponto flutuante sem controle.

```ts
function toTenths(mm: number): number {
  if (!Number.isFinite(mm) || mm < 0) {
    throw new Error(`Medida inválida: ${mm}`);
  }

  return Math.round((mm + Number.EPSILON) * 10);
}
```

## 12.2 Inteiro com zeros

```ts
function zeroPadInteger(value: number, width: number): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Inteiro inválido: ${value}`);
  }

  const result = String(value);

  if (result.length > width) {
    throw new Error(`${value} não cabe em ${width} caracteres`);
  }

  return result.padStart(width, "0");
}
```

## 12.3 Medida fixa

```ts
function fixedTenths(mm: number, width: number): string {
  return zeroPadInteger(toTenths(mm), width);
}
```

## 12.4 Texto ASCII

```ts
function toAscii(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}
```

Decida uma política para caracteres removidos:

```text
João → Joao
Cozinha – superior → Cozinha - superior
```

## 12.5 Texto de largura fixa

```ts
function fixedText(
  value: string,
  width: number,
  align: "left" | "right" = "left",
): string {
  const ascii = toAscii(value).slice(0, width);

  return align === "right"
    ? ascii.padStart(width, " ")
    : ascii.padEnd(width, " ");
}
```

---

# 13. Builders de referência

## 13.1 `.AC`

```ts
interface AcHeaderInput {
  materialKey: string;
  thicknessMm: number;
  globalPatternNumber: number;
  repeatCount: number;
  dimensionAMm: number;
  dimensionBMm: number;
  flag: 0 | 1;
}

function buildAcHeader(input: AcHeaderInput): string {
  const line = [
    fixedText(input.materialKey, 15),
    fixedTenths(input.thicknessMm, 3),
    zeroPadInteger(input.globalPatternNumber, 2),
    "1",
    zeroPadInteger(input.repeatCount, 5),
    fixedTenths(input.dimensionAMm, 5),
    fixedTenths(input.dimensionBMm, 5),
    String(input.flag),
  ].join("");

  assertLength(line, 37, "Cabeçalho AC");
  return line;
}

interface AcCutInput {
  materialKey: string;
  thicknessMm: number;
  globalPatternNumber: number;
  phase: 2 | 3 | 4 | 5;
  localPartNumber: number;
  dimensionMm: number;
  quantity: number;
}

function buildAcCut(input: AcCutInput): string {
  const line = [
    fixedText(input.materialKey, 15),
    fixedTenths(input.thicknessMm, 3),
    zeroPadInteger(input.globalPatternNumber, 2),
    String(input.phase),
    zeroPadInteger(input.localPartNumber, 2),
    fixedTenths(input.dimensionMm, 5),
    zeroPadInteger(input.quantity, 2),
  ].join("");

  assertLength(line, 30, "Corte AC");
  return line;
}
```

## 13.2 `.AD` tipo 1

```ts
function buildAdHeader(input: {
  materialCode: string;
  thicknessMm: number;
  operatorName: string;
  generatedAt: Date;
}): string {
  const line = new FixedWidthLine(498);

  const name = splitHeaderName(input.operatorName);

  line
    .put(1, 15, input.materialCode)
    .put(16, 4, fixedTenths(input.thicknessMm, 4))
    .put(20, 9, name.first)
    .put(29, 1, "1")
    .put(38, 25, name.continuation)
    .put(63, 9, formatAdDate(input.generatedAt));

  return line.toString();
}
```

## 13.3 `.AD` tipo 2

```ts
function buildAdPiece(
  material: MaterialCutPlan,
  piece: PiecePlacement,
): string {
  const line = new FixedWidthLine(922);

  line
    .put(1, 15, material.adMaterialCode)
    .put(16, 4, fixedTenths(material.thicknessMm, 4))
    .put(29, 1, "2")
    .put(30, 4, String(piece.adSequenceNumber), "right")
    .put(34, 6, fixedTenths(piece.placedWidthMm, 6))
    .put(40, 6, fixedTenths(piece.placedHeightMm, 6))
    .put(46, 5, "00001")
    .put(51, 1, "1")
    .put(53, 1, "0")
    .put(55, 1, "0")
    .put(61, 20, piece.pieceName)
    .put(81, 8, piece.roomName)
    .put(89, 11, piece.customerName)
    .put(100, 31, "0".repeat(31))
    .put(157, 1, "0")
    .put(251, 15, formatEdgeBandShort(piece.edgeBands[0]))
    .put(266, 15, formatEdgeBandShort(piece.edgeBands[1]))
    .put(281, 15, formatEdgeBandShort(piece.edgeBands[2]))
    .put(296, 15, formatEdgeBandShort(piece.edgeBands[3]))
    .put(
      320,
      10,
      [piece.machiningOperation, piece.machiningSide]
        .filter(Boolean)
        .join(" "),
    )
    .put(331, 20, piece.moduleName)
    .put(410, 9, piece.labelId)
    .put(
      450,
      12,
      formatLabelDimensionSignature(
        piece.designWidthMm,
        piece.designHeightMm,
      ),
    )
    .put(491, 40, buildLabelImagePath(piece))
    .put(
      534,
      22,
      piece.labelProfile?.majorSideSlot === "A"
        ? "----- LADO MAIOR -----"
        : "",
    )
    .put(
      559,
      22,
      piece.labelProfile?.majorSideSlot === "B"
        ? "----- LADO MAIOR -----"
        : "",
    )
    .put(
      584,
      1,
      String(piece.edgeBands.filter(Boolean).length),
    )
    .put(587, 8, piece.orderId)
    .put(603, 9, piece.labelId)
    .put(619, 8, piece.customerName)
    .put(635, 14, piece.operatorName)
    .put(657, 40, material.materialLabel)
    .put(699, 22, piece.pieceName)
    .put(723, 20, piece.moduleName)
    .put(745, 7, piece.roomName)
    .put(762, 7, piece.customerName)
    .put(776, 1, piece.labelProfile?.arrow1 ?? "")
    .put(778, 1, piece.labelProfile?.arrow2 ?? "")
    .put(780, 1, String(Math.min(piece.requestedQuantity, 9)))
    .put(786, 7, formatLabelMm(piece.designWidthMm))
    .put(793, 7, formatLabelMm(piece.designHeightMm))
    .put(800, 21, formatEdgeBandLong(piece.edgeBands[0]))
    .put(821, 21, formatEdgeBandLong(piece.edgeBands[1]))
    .put(842, 21, formatEdgeBandLong(piece.edgeBands[2]))
    .put(863, 21, formatEdgeBandLong(piece.edgeBands[3]))
    .put(912, 1, piece.labelProfile?.finalMarker ?? "");

  return line.toString();
}
```

A posição `780` possui apenas um caractere no perfil observado. Se sua aplicação tiver quantidade maior que `9`, teste a configuração real da etiqueta antes de truncar. Uma alternativa mais segura é deixar esse campo configurável por perfil.

## 13.4 `.AD` tipo 3

```ts
function buildAdOffcut(
  material: MaterialCutPlan,
  offcut: Offcut,
): string {
  const line = new FixedWidthLine(490);

  line
    .put(1, 15, material.adMaterialCode)
    .put(16, 4, fixedTenths(material.thicknessMm, 4))
    .put(29, 1, "3")
    .put(30, 4, String(offcut.sequenceNumber), "right")
    .put(34, 6, fixedTenths(offcut.widthMm, 6))
    .put(40, 6, fixedTenths(offcut.heightMm, 6))
    .put(46, 5, "00001")
    .put(51, 1, "0")
    .put(53, 1, "0")
    .put(55, 1, "0")
    .put(100, 26, "0".repeat(26))
    .put(131, 1, offcut.letter)
    .put(157, 1, "0");

  return line.toString();
}
```

## 13.5 `.AD` tipo 4

```ts
function buildAdSheet(
  material: MaterialCutPlan,
  pattern: CuttingPattern,
): string {
  const line = new FixedWidthLine(490);

  line
    .put(1, 15, material.adMaterialCode)
    .put(16, 4, fixedTenths(material.thicknessMm, 4))
    .put(29, 1, "4")
    .put(30, 4, String(pattern.localPatternIndex), "right")
    .put(34, 6, fixedTenths(pattern.stockWidthMm, 6))
    .put(40, 6, fixedTenths(pattern.stockHeightMm, 6))
    .put(46, 5, "00001")
    .put(51, 1, pattern.rotatedFromStock ? "1" : "0")
    .put(61, 39, material.materialLabel)
    .put(126, 1, "0");

  return line.toString();
}
```

---

# 14. Montagem dos arquivos

## 14.1 `.AC`

```ts
function generateAc(material: MaterialCutPlan): string {
  const lines: string[] = [];

  for (const pattern of material.patterns) {
    lines.push(
      buildAcHeader({
        materialKey: material.acMaterialKey,
        thicknessMm: material.thicknessMm,
        globalPatternNumber: pattern.globalPatternNumber,
        repeatCount: pattern.repeatCount,
        dimensionAMm: pattern.orientedWidthMm,
        dimensionBMm: pattern.orientedHeightMm,
        flag: 0,
      }),
    );

    for (const record of emitCutGroup(pattern.rootCutGroup)) {
      lines.push(
        buildAcCut({
          materialKey: material.acMaterialKey,
          thicknessMm: material.thicknessMm,
          globalPatternNumber: pattern.globalPatternNumber,
          phase: record.phase,
          localPartNumber: record.partNumber,
          dimensionMm: record.dimensionMm,
          quantity: record.quantity,
        }),
      );
    }
  }

  return lines.join("\r\n") + "\r\n";
}
```

## 14.2 `.AD`

```ts
function generateAd(
  job: CuttingJob,
  material: MaterialCutPlan,
): string {
  const lines: string[] = [];

  lines.push(
    buildAdHeader({
      materialCode: material.adMaterialCode,
      thicknessMm: material.thicknessMm,
      operatorName: job.operatorName,
      generatedAt: job.generatedAt,
    }),
  );

  let adSequence = 1;

  for (const pattern of material.patterns) {
    for (const placement of pattern.placements) {
      placement.adSequenceNumber = adSequence++;
      lines.push(buildAdPiece(material, placement));
    }
  }

  for (const pattern of material.patterns) {
    assignOffcutLetters(pattern.offcuts);

    pattern.offcuts.forEach((offcut, index) => {
      offcut.sequenceNumber = index + 1;
      lines.push(buildAdOffcut(material, offcut));
    });
  }

  for (const pattern of material.patterns) {
    lines.push(buildAdSheet(material, pattern));
  }

  return lines.join("\r\n") + "\r\n";
}
```

---

# 15. Validações obrigatórias

## 15.1 Validação de comprimento

```ts
function assertLength(
  value: string,
  expected: number,
  context: string,
): void {
  if (value.length !== expected) {
    throw new Error(
      `${context}: esperado ${expected}, recebido ${value.length}`,
    );
  }
}
```

Validar todas as linhas:

```text
AC header → 37
AC cut    → 30
AD type 1 → 498
AD type 2 → 922
AD type 3 → 490
AD type 4 → 490
```

## 15.2 Validação de caracteres

```ts
function assertAscii(value: string): void {
  for (const character of value) {
    const code = character.charCodeAt(0);

    if (code < 32 || code > 126) {
      throw new Error(`Caractere não ASCII: ${JSON.stringify(character)}`);
    }
  }
}
```

A quebra de linha é a única exceção fora do conteúdo das linhas.

## 15.3 Limites

```text
material AC:           15 caracteres
espessura AC:          0,0–99,9 mm
padrão AC:             1–99
repetição do padrão:   1–99999
medida AC:             0,0–9999,9 mm
peça local AC:         1–99
quantidade do corte:   1–99

sequência AD:          1–9999
medida AD:             0,0–99999,9 mm
```

## 15.4 Validação da árvore

Para cada segmento:

```text
- deve ter peça final OU grupo filho;
- nunca os dois;
- sizeMm > 0;
- cutQuantity >= 1;
- fase do filho = fase do pai + 1;
- fase máxima = 5;
```

## 15.5 Validação geométrica

Para cada grupo:

```ts
consumed =
  sum(segment.sizeMm)
  + segmentCount * sawKerfMm;

remaining =
  parentAxisLength - consumed;
```

O valor não pode ser negativo além de uma tolerância numérica:

```ts
const EPSILON_MM = 0.05;
```

## 15.6 Validação cruzada `.AC` × `.AD`

Para cada padrão:

```text
quantidade de cortes .AC com peça > 00
=
quantidade de registros tipo 2 daquele padrão
```

Além disso:

```text
- mesma ordem;
- mesmas dimensões colocadas;
- mesmo material;
- mesma espessura;
- um registro tipo 4 por padrão;
- grupo de sobras correspondente ao padrão.
```

---

# 16. Testes recomendados

## 16.1 Golden files

Use os arquivos reais como testes de regressão.

Estrutura:

```text
fixtures/
  caso-01/
    expected.AC
    expected.AD
    input.json
```

Teste:

```ts
expect(generateAc(input)).toEqual(readFixture("expected.AC"));
expect(generateAd(input)).toEqual(readFixture("expected.AD"));
```

A comparação deve ser byte a byte.

## 16.2 Testar CRLF

```ts
expect(output.includes("\r\n")).toBe(true);
expect(output.replace(/\r\n/g, "").includes("\n")).toBe(false);
expect(output.endsWith("\r\n")).toBe(true);
```

## 16.3 Testar medidas decimais

```text
4,5
66,3
905,5
1361,1
```

## 16.4 Testar rotação

- chapa normal;
- chapa girada;
- peça girada;
- fitas de borda giradas junto com a peça;
- veio restrito.

## 16.5 Testar níveis de corte

- apenas fases 2 e 3;
- fases 2, 3 e 4;
- fases 2, 3, 4 e 5;
- segmento intermediário com peça `00`.

## 16.6 Testar repetição

- padrão com repetição `1`;
- padrão com repetição `2`;
- peças do `.AD` não duplicadas;
- quantidade solicitada preservada na etiqueta.

---

# 17. Arquitetura de código sugerida

```text
src/
  cutting-plan/
    domain/
      cutting-job.ts
      cutting-pattern.ts
      cut-tree.ts
      piece-placement.ts
      offcut.ts

    optimizer/
      guillotine-validator.ts
      cut-tree-builder.ts
      offcut-calculator.ts
      pattern-grouper.ts

    exporters/
      giben-cortecloud-v1/
        profile.ts
        fixed-width-line.ts
        ascii.ts
        numeric-format.ts
        ac-builder.ts
        ad-header-builder.ts
        ad-piece-builder.ts
        ad-offcut-builder.ts
        ad-sheet-builder.ts
        exporter.ts
        validator.ts

    tests/
      fixtures/
      ac-builder.test.ts
      ad-builder.test.ts
      exporter.golden.test.ts
```

Não misture:

```text
otimização
geometria
cálculo de preço
renderização PDF
exportação AC/AD
```

Cada responsabilidade deve ficar isolada.

---

# 18. Estratégia de implementação por etapas

## Fase 1 — exportação mínima

Implementar:

```text
- árvore guilhotinada;
- .AC completo;
- .AD tipos 1, 2, 3 e 4;
- campos principais;
- etiquetas sem campos opcionais;
- repeatCount = 1;
- testes de comprimento;
- CRLF e ASCII.
```

## Fase 2 — compatibilidade com etiquetas

Implementar:

```text
- imagem BMP;
- quatro fitas;
- lado maior;
- dimensões de etiqueta;
- módulos e ambientes;
- operação FURAR;
- marcadores opcionais.
```

## Fase 3 — agrupamento

Implementar:

```text
- assinatura de padrão;
- repeatCount > 1;
- redução de padrões duplicados;
- validação cruzada das quantidades.
```

## Fase 4 — perfil configurável

Implementar:

```text
- editor de posições;
- diretório de etiquetas;
- texto de material;
- slots de orientação;
- constantes;
- múltiplos perfis de máquina.
```

---

# 19. Critérios de aceite para o Codex

A tarefa estará concluída quando:

1. o sistema receber um plano guilhotinado estruturado;
2. gerar um `.AC` e um `.AD` para cada material/espessura;
3. todos os registros tiverem os comprimentos exatos;
4. todos os arquivos forem ASCII;
5. todas as linhas usarem `CRLF`;
6. houver quebra de linha final;
7. os números forem gravados em décimos de milímetro;
8. os padrões forem globais no `.AC`;
9. as peças reiniciarem em `01` por padrão;
10. os registros tipo `2` seguirem a ordem das peças no `.AC`;
11. as sobras forem calculadas considerando bordas e serra;
12. os registros tipo `3` reiniciarem em `1` por padrão;
13. os registros tipo `4` representarem a orientação da chapa;
14. existirem testes golden byte a byte;
15. o perfil `.AD` puder ser alterado sem modificar o otimizador.

---

# 20. Prompt direto para execução no Codex

```text
Implemente um exportador de plano de corte para os formatos .AC e .AD seguindo integralmente o arquivo GUIA_GERACAO_AC_AD_GIBEN.md.

Requisitos principais:

1. Use TypeScript estrito.
2. Separe domínio, geometria, exportadores e validações.
3. Não gere os arquivos diretamente de coordenadas x/y. Use uma árvore de cortes guilhotinados.
4. Implemente FixedWidthLine para escrever campos por posição.
5. Gere texto ASCII com CRLF e quebra de linha final.
6. Implemente todos os registros .AC:
   - cabeçalho de 37 caracteres;
   - corte de 30 caracteres.
7. Implemente todos os registros .AD do perfil giben-cortecloud-v1:
   - tipo 1 de 498 caracteres;
   - tipo 2 de 922 caracteres;
   - tipo 3 de 490 caracteres;
   - tipo 4 de 490 caracteres.
8. Use décimos de milímetro em todos os campos numéricos.
9. Mantenha acMaterialKey e adMaterialCode como propriedades diferentes.
10. Numere padrões globalmente no serviço.
11. Reinicie os números de peça em cada padrão.
12. Gere os registros tipo 2 na mesma ordem das peças finais emitidas no .AC.
13. Calcule sobras considerando edgeTrim e sawKerf configuráveis.
14. Reinicie a sequência e as letras das sobras por padrão.
15. Use uma linha tipo 4 para cada padrão.
16. Crie validação cruzada entre .AC e .AD.
17. Crie testes unitários e golden files.
18. Não altere o otimizador para acomodar campos de etiqueta; use um perfil configurável.
19. Marque claramente no código os campos de etiqueta parcialmente inferidos.
20. Entregue exemplos de entrada JSON e os arquivos gerados.

Considere inicialmente:
- 10 mm de refilo em cada borda;
- serra de 4,5 mm;
- repeatCount = 1 quando padrões não forem agrupados;
- perfil giben-cortecloud-v1.
```

---

# 21. Observação de segurança operacional

Antes de usar em produção:

1. gere um plano pequeno;
2. abra no software da máquina;
3. confira orientação da chapa;
4. confira ordem dos cortes;
5. confira dimensão de todas as peças;
6. confira serra e refilo;
7. confira etiquetas;
8. execute primeiro sem material ou em modo de simulação, se a máquina permitir;
9. valide com o operador responsável.

Um arquivo pode estar estruturalmente correto e ainda ter orientação ou semântica de etiqueta incompatível com a configuração específica da máquina.
