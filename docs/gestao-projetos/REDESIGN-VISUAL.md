# Redesign visual — Gestão de Projetos

Plano de implementação do novo sistema visual para todas as telas criadas na branch
`feat/gestao-projetos`. Este documento é a **fonte única de verdade do design**: os dois
agentes de implementação (Via A e Via B) devem seguir exatamente os tokens, componentes e
regras daqui, sem inventar cores ou estilos próprios.

**Direção definida:** claro e premium. Fundo off-white quente, superfícies brancas com
sombras suaves, carvão como cor de ação primária, dourado como cor de acento/identidade,
tipografia Inter, animações sutis com framer-motion (já instalado).

**Stack:** manter Chakra UI v3 (`createSystem` + tokens + semantic tokens). Sem Tailwind,
sem novas dependências de UI. Fonte via Google Fonts no `_document.tsx` (mesmo padrão atual).

---

## 0. Bug crítico que explica o visual atual

O projeto usa **Chakra UI v3**, mas dezenas de componentes passam `colorScheme="..."`
(API do v2). **No v3 essa prop não existe e é ignorada** — por isso todos os badges,
botões e tabelas estão renderizando no cinza padrão. A prop correta no v3 é
`colorPalette`.

Regra para as duas vias: **toda ocorrência de `colorScheme` nos arquivos do seu escopo
deve virar `colorPalette`** (ou ser substituída pelos tokens deste documento).

---

## 1. Design System

### 1.1 Tipografia

Trocar Roboto por **Inter** no `_document.tsx`:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

- `fonts.heading` e `fonts.body`: `'Inter', -apple-system, 'Segoe UI', sans-serif`
- Títulos de página: 15px / weight 600 (no topbar) — páginas não repetem H1 gigante.
- Títulos de seção (cards): 14px / weight 600 / cor `app.text`.
- Rótulos pequenos (labels de stat, headers de tabela): 11px / weight 600 /
  `textTransform: uppercase` / `letterSpacing: 0.05em` / cor `app.textMuted`.
- Números (stats, preços, datas em tabela): sempre `fontVariantNumeric: tabular-nums`.
- Corpo: 14px (`sm`) como padrão nas telas internas; 15–16px no portal do cliente.

### 1.2 Paleta

Adicionar **novas escalas** ao `theme.ts` — **não alterar** as escalas `gray`, `orange` e
`yellow` existentes (telas antigas de /cortes dependem delas).

```
sand  (neutros quentes — fundos, bordas, textos)
  50 #FAFAF9   100 #F5F4F2   200 #E9E7E3   300 #D9D6D0   400 #B8B4AC
  500 #918D84  600 #6B675F   700 #504C45   800 #37342F   900 #23211D

brand (dourado — acento, identidade)
  50 #FBF7EC   100 #F5EACB   200 #EBD79E   300 #DFBE68   400 #D2A43B
  500 #B8860B  600 #9A6F08   700 #7C5906   800 #5E4305   900 #402E03
```

### 1.3 Semantic tokens (namespace `app.*`)

| Token               | Valor       | Uso |
|---------------------|-------------|-----|
| `app.canvas`        | sand.50     | fundo de página (body, área de conteúdo) |
| `app.surface`       | white       | fundo de cards, tabelas, modais, topbar |
| `app.sunken`        | sand.100    | fundos rebaixados: header de tabela, hover de linha, wells |
| `app.border`        | sand.200    | borda padrão de cards e divisores |
| `app.borderStrong`  | sand.300    | borda de inputs e botões outline |
| `app.text`          | sand.900    | texto principal |
| `app.textSecondary` | sand.600    | texto de apoio |
| `app.textMuted`     | sand.500    | rótulos, placeholders, metadados |
| `app.accent`        | brand.500   | dourado — indicadores, ícones de destaque, foco |
| `app.accentEmphasis`| brand.600   | dourado escuro — texto/hover sobre acento |
| `app.accentSubtle`  | brand.50    | fundos dourados suaves (nav ativa, highlights) |
| `app.ink`           | #2E2D2C     | botão primário (carvão) |
| `app.inkHover`      | #1B1A19     | hover do botão primário |

### 1.4 Sombras, raios e espaçamento

```
shadows.card      0 1px 2px rgba(35,33,29,0.04), 0 2px 8px -2px rgba(35,33,29,0.06)
shadows.cardHover 0 2px 4px rgba(35,33,29,0.05), 0 10px 24px -8px rgba(35,33,29,0.12)
shadows.focus     0 0 0 3px rgba(210,164,59,0.35)   (anel dourado)
```

- Cards e modais: `borderRadius: xl` (12px).
- Inputs e botões: `borderRadius: lg` (8px).
- Badges/pills e avatares: `borderRadius: full`.
- Padding interno de card: `p={5}` (20px); gap entre cards/seções: `gap={5}`.
- Nunca usar borda `gray.200` + fundo `white` cru: card é sempre
  `bg="app.surface" borderWidth="1px" borderColor="app.border" rounded="xl" shadow="card"`.

### 1.5 `theme.ts` — código de referência (Fase 0)

```ts
import { createSystem, defaultConfig } from '@chakra-ui/react';

export const theme = createSystem(defaultConfig, {
  globalCss: {
    body: { bg: 'app.canvas', color: 'app.text' },
  },
  theme: {
    tokens: {
      colors: {
        gray: { /* ...manter valores atuais... */ },
        orange: { /* ...manter valores atuais... */ },
        yellow: { /* ...manter valores atuais... */ },
        sand: {
          50: { value: '#FAFAF9' }, 100: { value: '#F5F4F2' },
          200: { value: '#E9E7E3' }, 300: { value: '#D9D6D0' },
          400: { value: '#B8B4AC' }, 500: { value: '#918D84' },
          600: { value: '#6B675F' }, 700: { value: '#504C45' },
          800: { value: '#37342F' }, 900: { value: '#23211D' },
        },
        brand: {
          50: { value: '#FBF7EC' }, 100: { value: '#F5EACB' },
          200: { value: '#EBD79E' }, 300: { value: '#DFBE68' },
          400: { value: '#D2A43B' }, 500: { value: '#B8860B' },
          600: { value: '#9A6F08' }, 700: { value: '#7C5906' },
          800: { value: '#5E4305' }, 900: { value: '#402E03' },
        },
      },
      fonts: {
        heading: { value: "'Inter', -apple-system, 'Segoe UI', sans-serif" },
        body: { value: "'Inter', -apple-system, 'Segoe UI', sans-serif" },
      },
      shadows: {
        card: { value: '0 1px 2px rgba(35,33,29,0.04), 0 2px 8px -2px rgba(35,33,29,0.06)' },
        cardHover: { value: '0 2px 4px rgba(35,33,29,0.05), 0 10px 24px -8px rgba(35,33,29,0.12)' },
        focus: { value: '0 0 0 3px rgba(210,164,59,0.35)' },
      },
    },
    semanticTokens: {
      colors: {
        'app.canvas': { value: '{colors.sand.50}' },
        'app.surface': { value: '#FFFFFF' },
        'app.sunken': { value: '{colors.sand.100}' },
        'app.border': { value: '{colors.sand.200}' },
        'app.borderStrong': { value: '{colors.sand.300}' },
        'app.text': { value: '{colors.sand.900}' },
        'app.textSecondary': { value: '{colors.sand.600}' },
        'app.textMuted': { value: '{colors.sand.500}' },
        'app.accent': { value: '{colors.brand.500}' },
        'app.accentEmphasis': { value: '{colors.brand.600}' },
        'app.accentSubtle': { value: '{colors.brand.50}' },
        'app.ink': { value: '#2E2D2C' },
        'app.inkHover': { value: '#1B1A19' },
      },
    },
  },
});
```

### 1.6 Hierarquia de botões

| Papel | Estilo | Exemplo |
|---|---|---|
| **Primário** (1 por tela) | `bg="app.ink"` texto branco, hover `app.inkHover`, `rounded="lg"`, weight 600 | "Novo Projeto", "Salvar" |
| **Secundário** | `variant="outline"`, `borderColor="app.borderStrong"`, `color="app.text"`, hover `bg="app.sunken"` | "Cancelar", "Exportar" |
| **Acento** (aprovação/dinheiro) | `colorPalette="green"` sólido | "Aprovar", "Confirmar pagamento" |
| **Destrutivo** | `colorPalette="red"` outline (sólido só em confirmação de modal) | "Recusar", "Cancelar item" |
| **Ghost** | `variant="ghost"`, `color="app.textSecondary"` | ações em linha de tabela |

Foco visível em tudo: `_focusVisible={{ shadow: 'focus', outline: 'none' }}`.

### 1.7 Status — cores e pill

Manter os mapeamentos de `INTERNAL_STATUS_COLORS` (gray/purple/yellow/orange/red/green/
blue/teal já estão bons), mas renderizar como **pill sutil com dot**, nunca badge sólido:

- Container: `colorPalette={cor}`, `bg="colorPalette.100"`, `color="colorPalette.700"`,
  `rounded="full"`, `px={2.5} py={0.5}`, `fontSize="xs"`, weight 500, sem uppercase.
- Dot: círculo 6px `bg="colorPalette.500"` à esquerda do texto.
- Status de pagamento do montador: `nao_liberado`→gray, `pendente`→yellow, `pago`→blue,
  `confirmado_pelo_montador`→green (adicionar `PAYMENT_STATUS_COLORS` em
  `src/utils/projects/status.ts` na Fase 0 se ainda não existir).
- Badge "Atrasado": pill vermelha com dot, mesmo componente.

### 1.8 Tabelas

Toda tabela segue o mesmo padrão (não usar `variant="outline"` cru):

- Envolvida em um **Card** (`rounded="xl"`, `overflow="hidden"`, `shadow="card"`,
  border `app.border`) com `overflowX="auto"` interno.
- `Table.ColumnHeader`: `bg="app.sunken"`, fonte 11px/600/uppercase/tracking 0.05em,
  cor `app.textMuted`, `py={2.5}`.
- `Table.Row` do body: `borderColor="app.border"`; linhas clicáveis:
  `cursor="pointer"` + `_hover={{ bg: 'app.sunken' }}` + `transition="background 0.15s"`.
- Células numéricas: `textAlign="right"` (ou ao menos `tabular-nums`).
- Célula principal (ex.: cliente): weight 500, cor `app.text`; secundárias
  `app.textSecondary`.

### 1.9 Formulários

- Inputs/selects/textareas: `bg="app.surface"`, `borderColor="app.borderStrong"`,
  `rounded="lg"`, foco: `borderColor="app.accent"` + `shadow="focus"`.
- Labels: 13px / weight 500 / `app.textSecondary`, `mb={1.5}`.
- Erros: 12px `red.600`. Helper text: 12px `app.textMuted`.
- Formulários longos dentro de Card, campos em `SimpleGrid columns={[1, 2]} gap={4}`.
- `react-select` e `react-datepicker` devem receber estilos coerentes (borda
  `#D9D6D0`, foco dourado, radius 8px) — via prop `styles`/classe global.

### 1.10 Animações (sutis — framer-motion)

Criar primitives na Fase 0 e usar em todo lugar; **nada além disto**:

- **Entrada de página/listas**: fade + subir 8px, `duration: 0.25`, ease-out; listas com
  stagger de 0.04s por item (máx ~10 itens animados, resto instantâneo).
- **Cards interativos**: hover `translateY(-2px)` + `shadow="cardHover"` +
  border `brand.200`, `transition 0.15s`.
- **Loading**: skeletons (`Skeleton` do Chakra com `borderRadius` correspondente) no lugar
  de spinner sempre que o layout for conhecido; `Loader` de página inteira só no gate de auth.
- Respeitar `useReducedMotion()` do framer-motion (desligar transforms, manter opacity).
- Proibido: contadores animados, parallax, animação em modais além do padrão do Chakra.

### 1.11 Componentes compartilhados (criados na Fase 0 em `src/components/ui/`)

| Arquivo | API | Estilo |
|---|---|---|
| `card.tsx` | `<AppCard interactive? title? action?>` | Espec. 1.4; `title` renderiza header 14px/600 com `action` à direita e divisor `app.border`; `interactive` aplica hover da 1.10 |
| `stat-card.tsx` | `<StatCard label value icon? palette? hint?>` | Valor 26–28px/600 tabular-nums; label espec. 1.1; `icon` em quadrado 36px `rounded="lg"` com `bg="colorPalette.100" color="colorPalette.600"` (default `palette="brand"`); variante de alerta: `palette="red"` quando valor > 0 em métricas de atraso |
| `status-pill.tsx` | `<StatusPill palette label>` | Espec. 1.7 — genérico; `ProjectItemStatusBadge` passa a usá-lo |
| `empty-state.tsx` | `<EmptyState icon title description? action?>` | Centrado, `py={12}`; ícone em círculo 48px `bg="app.sunken" color="app.textMuted"`; título 14px/600; descrição 13px `app.textMuted` |
| `motion.tsx` | `<Reveal>` e `<RevealList>` | Espec. 1.10 (fade-up + stagger, reduced-motion) |
| `table-skeleton.tsx` | `<TableSkeleton rows cols>` | linhas de `Skeleton` h="20px" dentro do padrão de tabela 1.8 |

---

## 2. Execução em duas vias paralelas

Mesmo fluxo usado na feature: worktrees `jrm-app-via-a` e `jrm-app-via-b`, merge no final.

### Fase 0 — fundação (fazer ANTES de criar as vias, commit único na branch base)

Pequena e mecânica (~1h de agente). Arquivos:

1. `src/styles/theme.ts` — código da seção 1.5.
2. `src/pages/_document.tsx` — fonte Inter (1.1).
3. `src/components/ui/` — criar `card.tsx`, `stat-card.tsx`, `status-pill.tsx`,
   `empty-state.tsx`, `motion.tsx`, `table-skeleton.tsx` (1.11).
4. `src/components/projects/ProjectItemStatusBadge.tsx` — reescrever usando `StatusPill`
   (corrige o bug do `colorScheme` morto).
5. `src/utils/projects/status.ts` — adicionar `PAYMENT_STATUS_COLORS` e
   `PAYMENT_STATUS_LABELS` (se não existirem). **Não alterar labels existentes.**
6. `src/components/Loader/index.tsx` — spinner `color="app.accent"` sobre `app.canvas`.

Depois do commit da Fase 0: criar `feat/redesign-visual-via-a` e
`feat/redesign-visual-via-b` a partir dele.

### Regras de paralelismo (as duas vias)

- **Nenhuma via edita** os arquivos da Fase 0 (`theme.ts`, `src/components/ui/*`,
  `status.ts`, `Loader`, `ProjectItemStatusBadge`, `_document.tsx`). Precisou de um token
  ou variante nova? Resolva localmente na sua tela e anote no PR para promover depois.
- Cada via só edita os arquivos listados na sua seção. Import cruzado é livre.
- **Não alterar textos, labels, aria-labels, hrefs nem lógica de dados** — os testes
  (`src/tests/**` + `e2e/**`) dependem deles. Redesign é só apresentação.
- Substituir `colorScheme` → `colorPalette`/tokens em todos os arquivos do escopo.
- Antes de finalizar: `npm run lint`, `npm test`, `npm run build` verdes.

---

## 3. VIA A — Casca interna + Projetos

**Escopo:** layout do dashboard (sidebar/topbar) e todas as telas de `/projetos`.

### 3.1 Arquivos (exclusivos da Via A)

```
src/components/Dashboard/index.tsx
src/components/Dashboard/Content/index.tsx
src/components/Dashboard/Content/Header/index.tsx
src/components/Dashboard/Sidebar/index.tsx
src/components/Dashboard/Sidebar/MobileSidebar.tsx
src/components/Dashboard/Sidebar/NavLink.tsx
src/components/Dashboard/Sidebar/NavSection.tsx
src/components/Dashboard/Sidebar/SidebarNav.tsx
src/components/SearchBar/** e src/components/Pagination/**
src/pages/projetos/index.tsx
src/pages/projetos/novo.tsx
src/pages/projetos/dashboard.tsx
src/pages/projetos/[projectId]/index.tsx
src/pages/projetos/[projectId]/itens/[itemId].tsx
src/components/projects/* (exceto ProjectItemStatusBadge — Fase 0)
```

### 3.2 Casca (Dashboard/Sidebar/Header)

- **Dashboard container**: `bg="app.canvas"` (remover `bg="#FFF"`).
- **Sidebar**: fundo `#211F1B` (carvão quente, ligeiramente mais profundo que o atual).
  - Header da sidebar: manter logo; nome 14px/600 branco; papel do usuário 11px
    `whiteAlpha.600`.
  - Títulos de seção (`NavSection`): 10.5px/600/uppercase/tracking 0.08em,
    `whiteAlpha.400`, `mt={5} mb={1}`.
  - `NavLink`: altura 36px, `rounded="lg"`, ícone 16px, texto 13.5px/500
    `whiteAlpha.700`; hover `bg="whiteAlpha.50"` texto branco; **ativo** (rota atual):
    `bg="rgba(210,164,59,0.12)"`, texto `brand.300`, ícone `brand.300` e barra de 3px
    `bg="app.accent"` `rounded="full"` à esquerda. Transição 0.15s.
  - Item "Sair" separado no rodapé com divisor `whiteAlpha.100`.
- **Header (topbar)**: `bg="rgba(255,255,255,0.85)"` + `backdropFilter="blur(8px)"`,
  borda inferior `app.border`; título 15px/600; relógio/data mantidos (12px
  `app.textMuted`, tabular-nums); botões de ação da página vivem aqui (hierarquia 1.6).

### 3.3 `/projetos` (listagem)

- SearchBar à esquerda + contagem de resultados (`app.textMuted`) na mesma linha.
- Tabela no padrão 1.8, dentro de `AppCard`. Colunas: Cliente (principal, weight 500),
  Vendedor, Itens (número à direita), Atrasados (pill vermelha com dot ou "—").
- Skeleton (`TableSkeleton`) durante o load; `EmptyState` (ícone `FaClipboardList`,
  ação "Novo Projeto") quando vazio.
- Linhas com `RevealList`.

### 3.4 `/projetos/novo` e formulários

- `ProjectForm`/`ProjectItemForm` em `AppCard` com `title`; campos em grid 2 colunas
  (1 no mobile); espec. 1.9. Botão primário "ink" alinhado à direita no rodapé do card.

### 3.5 `/projetos/dashboard` (admin)

- Linha de filtros em um `AppCard` compacto (`p={4}`): selects e busca lado a lado,
  toggle "Só atrasados" como `Switch` com `colorPalette="red"`.
- `ProjectSummaryCards`/cards de contagem → `StatCard` em `SimpleGrid`
  `columns={[2, 3, 4, 7]}`; card de atrasados com `palette="red"` quando > 0.
- Tabelas (`DelayedItemsTable` é da Via B — aqui só a página que a envolve; passar
  espaçamentos/títulos via layout da página).

### 3.6 `/projetos/[projectId]` (detalhe do projeto)

- Bloco "Dados do cliente" → `AppCard title="Dados do cliente"` com
  `SimpleGrid columns={[1, 2]}`: rótulo 11px uppercase muted em cima, valor 14px embaixo
  (substituir os `<b>Telefone:</b>`).
- `ProjectSummaryCards` → usar `StatCard`.
- Lista de itens: `ProjectItemCard` vira card interativo (1.10/1.11): nome 14px/600,
  ambiente 13px muted, pills à direita, chevron `FaChevronRight` sutil indicando clique.
- `ClientAccessPanel`, `AttachmentUploader`/`AttachmentList`: em `AppCard` com `title`;
  lista de anexos com ícone por tipo (documento/imagem/3D) em quadrado 36px
  `bg="app.sunken"`, nome + metadados (autor, data) em 12px muted, ações ghost.

### 3.7 `/projetos/[projectId]/itens/[itemId]` (detalhe do item)

- Cabeçalho do item: nome + `StatusPill` + pill "Atrasado" quando aplicável; prazos e
  datas com rótulo uppercase muted.
- `ProjectItemTimeline`: linha vertical `app.border`; eventos com dot 10px na cor do
  status de destino, título 13px/600, autor + data 12px muted; evento mais recente com
  dot em anel dourado.
- `ItemBudgetForm`, `AssignDesignerModal`: espec. de formulário 1.9; modais com
  `rounded="xl"`, título 15px/600, rodapé com secundário + primário.
- Ações de transição de status: botão primário para a transição "natural" seguinte,
  demais como secundário/destrutivo conforme 1.6.

---

## 4. VIA B — Portal do cliente + perfis de execução + administração

**Escopo:** área pública do cliente, telas do desenhista, do montador e de administração.

### 4.1 Arquivos (exclusivos da Via B)

```
src/pages/cliente/[publicId]/index.tsx
src/pages/cliente/[publicId]/acompanhar.tsx
src/components/client/*  (5 arquivos)
src/pages/desenhista/index.tsx
src/components/designer/*  (2 arquivos)
src/pages/montador/index.tsx
src/pages/montador/financeiro.tsx
src/pages/montador/item/[projectId]/[itemId].tsx
src/components/assembler/*  (4 arquivos)
src/pages/administracao/usuarios.tsx
src/pages/administracao/configuracoes-prazos.tsx
src/pages/administracao/financeiro-montadores.tsx
src/components/admin/*  (3 arquivos)
```

(As páginas usam a casca `Dashboard`/`Header` que a Via A restyliza — só importar,
nunca editar esses arquivos.)

### 4.2 Portal do cliente — princípios

É a vitrine da JRM para o cliente final: **mobile-first**, tipografia maior (15–16px),
generoso em espaço, dourado mais presente que na área interna.

- **`ClientLayout`**: fundo `app.canvas`; header branco com borda `app.border`, logo à
  esquerda, telefone como botão outline com ícone `FaPhone` (não link solto); adicionar
  rodapé discreto ("JRM Compensados" 12px muted). Container `maxW="720px"` para leitura.
- **`ClientLoginWithCode`**: card único centrado (`maxW="400px"`, `shadow="card"`,
  `rounded="xl"`), logo em cima, título 18px/600 "Acompanhe seu projeto", input do código
  grande (18px, `letterSpacing="0.15em"`, `textAlign="center"`), botão primário ink full
  width. Erro em banner `red.50`/`red.700` `rounded="lg"`.
- **`ClientTrackingTimeline`**: redesenhar os steps:
  - Concluído: círculo 22px sólido `app.accent` com `FaCheck` branco 10px; conector
    dourado.
  - Ativo: círculo 22px branco com anel 2px dourado + dot interno dourado; label
    14px/600 `app.text`.
  - Futuro: círculo 22px `bg="app.sunken"` borda `app.border`; label `app.textMuted`;
    conector `app.border`.
  - "Próxima previsão" como pill destacada `app.accentSubtle`/`app.accentEmphasis` com
    ícone `FaRegCalendar`.
- **`ClientItemApprovalCard`**: card por item com foto/preview no topo (se houver anexo
  de imagem — manter lógica atual), nome 16px/600, ambiente 13px muted, preço em
  destaque (20px/700, tabular-nums), `StatusPill`. Ações mobile-first (full width,
  empilhadas): "Aprovar" verde sólido, "Solicitar alteração" secundário, "Recusar"
  vermelho outline. Estado pós-decisão: banner colorido sutil no rodapé do card.
- **`ClientProjectView`**: barra de resumo no topo (X de Y itens aprovados) e, quando
  houver itens pendentes, botão "Aprovar todos" verde em barra fixa inferior no mobile
  (`position="sticky" bottom={0}` com fundo `app.surface` e sombra para cima).

### 4.3 Desenhista (`/desenhista`)

- `DesignerQueue`: cada item da fila como card interativo — nome + cliente, prazo com
  cor semântica (verde >48h, âmbar <48h, vermelho vencido — usar lógica existente de
  atraso, sem criar regra nova de negócio), `StatusPill`. Ordenação/estrutura intocada.
- `DesignerUploadPanel`: dropzone estilizada: borda 2px dashed `app.borderStrong`,
  `rounded="xl"`, ícone upload `app.textMuted`, hover borda `app.accent` +
  `bg="app.accentSubtle"`.
- `EmptyState` quando a fila estiver vazia ("Nenhum item aguardando desenho").

### 4.4 Montador (`/montador`, `/montador/financeiro`, item)

Telas usadas em campo → alvos de toque generosos (botões `size="lg"` no mobile).

- `AssemblerAssignmentsPanel`: cards de item com endereço visível, `StatusPill`, botão
  primário com a próxima ação de status.
- Página do item: ação principal de avanço de status como botão largo primário; anexos
  visíveis ao montador no padrão de lista da 3.6.
- `AssemblerFinanceSummary`: `StatCard`s (a receber / recebido); `AssemblerPaymentHistory`
  como tabela 1.8 com valores à direita e pill de status de pagamento
  (`PAYMENT_STATUS_COLORS` da Fase 0).
- `AssignAssemblerModal`: espec. de modal/formulário (1.9, 3.7).

### 4.5 Administração

- `usuarios.tsx`: tabela 1.8 (nome principal, e-mail/telefone secundários, papéis como
  pills `colorPalette="gray"`, ativo/inativo como pill verde/cinza); `UserForm` é da
  Via A? **Não** — `UserForm` está em `components/projects/`, logo Via A; aqui só a
  página e a tabela.
- `configuracoes-prazos.tsx`: campos numéricos em `AppCard title="Prazos padrão"`,
  grid 2 colunas, sufixo "dias" nos inputs, botão primário "Salvar".
- `financeiro-montadores.tsx` + `AssemblerPaymentsTable`: tabela 1.8, valores
  monetários à direita 500/tabular-nums, pill de status de pagamento, ação "Marcar como
  pago" como botão acento (verde) pequeno.
- `AdminDashboardCards` → reescrever sobre `StatCard` (mesma API de dados);
  `DelayedItemsTable` → tabela 1.8 com coluna de dias de atraso em `red.600`/600.

---

## 5. Checklist de aceitação (cada via, antes do merge)

- [ ] Nenhum `colorScheme` restante nos arquivos do escopo (`grep -rn "colorScheme" <arquivos>`).
- [ ] Nenhum card "cru" (`bg="white"` + `borderColor="gray.200"`) restante no escopo.
- [ ] Nenhum texto/label/aria/href alterado (diff só de apresentação).
- [ ] Estados de loading (skeleton), vazio (`EmptyState`) e erro cobertos em toda tela do escopo.
- [ ] Telas verificadas em 375px e 1440px (sem scroll horizontal de página; tabelas
      rolam dentro do card).
- [ ] `npm run lint` && `npm test` && `npm run build` verdes.
- [ ] Arquivos da Fase 0 e da outra via intocados (`git diff --name-only` conferido).

## 6. Fora de escopo

Telas de `/cortes`, `/login`, `Printables`, `NewOrder`, `administracao/vendedores` e
`administracao/fretes` **não** devem ser tocadas (herdam melhorias da casca e do tema
automaticamente, e é o suficiente por ora).
