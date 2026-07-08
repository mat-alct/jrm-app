# Especificação Completa — Módulo de Gestão de Projetos para Marcenaria

Documento preparado para orientar o planejamento e a implementação de uma nova feature em um sistema já existente feito em **Next.js + TypeScript + Firebase**.

---

## 1. Objetivo da feature

Criar um módulo completo de **controle de projetos de móveis planejados**, centralizando:

- criação de novos projetos pelos vendedores;
- envio de dados técnicos para desenhistas;
- aprovação do orçamento pelo cliente via link com senha;
- acompanhamento de cada item do projeto;
- atribuição de montadores;
- controle de prazos;
- controle financeiro dos montadores;
- painel administrativo com visão completa da operação.

A feature será usada por uma única empresa, inicialmente com poucos montadores, mas deve ser estruturada de forma escalável.

---

## 2. Conceito principal do sistema

A entidade central será chamada de **Projeto**.

Porém, o controle operacional não deve acontecer diretamente no projeto inteiro, e sim nos **Itens do Projeto**.

### Por quê?

Um mesmo projeto pode ter vários móveis, ambientes ou peças, e cada item pode estar em uma etapa diferente.

Exemplo:

```txt
Projeto: Cliente João
├── Cozinha planejada — em produção
├── Guarda-roupa — aguardando alteração
└── Painel de TV — montagem concluída
```

Assim, o **Projeto** funciona como agrupador, enquanto cada **Item do Projeto** tem:

- status próprio;
- valor próprio;
- prazo próprio;
- desenhista próprio;
- montador(es) próprio(s);
- anexos próprios;
- histórico próprio;
- aprovação própria pelo cliente.

---

## 3. Perfis de usuário

O sistema terá os seguintes perfis:

1. **Administrador**
2. **Vendedor**
3. **Desenhista**
4. **Montador**
5. **Cliente** — acesso externo por link e senha, sem conta no sistema

Um usuário interno pode ter mais de um papel. Exemplo: um administrador também pode atuar como desenhista.

---

## 4. Regras gerais de permissão

| Perfil | Acesso | Permissões principais |
|---|---|---|
| Administrador | Tudo | Criar, editar, atribuir desenhistas, atribuir montadores, alterar valores, alterar prazos, pagar montadores, anexar documentos, editar qualquer status |
| Vendedor | Todos os projetos, sem financeiro dos montadores | Criar projeto, editar dados do cliente, anexar arquivos, acompanhar aprovação e status simplificado |
| Desenhista | Apenas itens atribuídos | Ver dados técnicos necessários, anexar projeto pronto, visualizar prazo, devolver item para alteração quando necessário |
| Montador | Apenas itens atribuídos | Ver dados do cliente, endereço, telefone, arquivos técnicos, prazo, valor próprio, atualizar etapa, anexar fotos/arquivos, ver financeiro próprio |
| Cliente | Apenas projeto via link + senha | Ver orçamento, aprovar, recusar, pedir alteração e acompanhar status simplificado |

### Observações importantes

- Administradores podem editar tudo a qualquer momento.
- Vendedores não veem valores pagos aos montadores.
- Montadores veem apenas o valor que eles receberão.
- Desenhistas comuns não veem valores financeiros, a menos que também sejam administradores.
- O cliente não cria conta; ele acessa por link e senha gerada automaticamente.
- Após aprovação, o cliente não pode mais recusar ou pedir alteração daquele item pelo link. Apenas o administrador poderá editar internamente.

---

## 5. Fluxo operacional principal

### 5.1 Fluxo com desenhista

1. Vendedor cria um novo projeto.
2. Vendedor cadastra os dados do cliente.
3. Vendedor cria um ou mais itens dentro do projeto.
4. Vendedor anexa arquivos do ambiente, medidas, fotos, PDFs ou outros documentos.
5. Administrador escolhe o desenhista responsável por cada item.
6. Sistema define prazo automático para o desenhista, com possibilidade de edição manual.
7. Desenhista acessa sua fila de itens pendentes.
8. Desenhista anexa o projeto pronto.
9. Item muda para “projeto desenhado” e depois para “aguardando aprovação do cliente”.
10. Cliente recebe link com senha.
11. Cliente visualiza os itens, valores e arquivos liberados.
12. Cliente pode:
    - aprovar item por item;
    - aprovar tudo;
    - recusar um item;
    - pedir alteração de um item.
13. Se pedir alteração, apenas aquele item volta para “alteração solicitada”.
14. Itens já aprovados seguem para produção.
15. Administrador atribui um ou mais montadores ao item aprovado.
16. Administrador define manualmente quanto cada montador receberá.
17. Montador acessa apenas os itens atribuídos a ele.
18. Montador atualiza as etapas do item.
19. Cliente acompanha status simplificado, como rastreamento.
20. Montador confirma montagem concluída.
21. Valor do montador entra como pagamento pendente.
22. Administrador realiza pagamento e anexa comprovante.
23. Montador confirma recebimento.
24. Item é finalizado.
25. Quando todos os itens forem finalizados, o projeto é considerado concluído.
26. O link do cliente expira 1 mês após a conclusão do projeto.

---

### 5.2 Fluxo direto sem desenhista

Usado quando não há necessidade de projetista.

1. Vendedor ou administrador cria o projeto.
2. Administrador define os valores.
3. Arquivos e documentação são anexados.
4. Cliente aprova pelo link.
5. Administrador atribui montador.
6. Item segue direto para execução.

---

## 6. Status internos dos itens

O status principal deve ser por item, não por projeto.

```ts
type ProjectItemStatus =
  | "orcamento_criado"
  | "aguardando_desenho"
  | "projeto_desenhado"
  | "aguardando_aprovacao_cliente"
  | "alteracao_solicitada"
  | "recusado_pelo_cliente"
  | "aprovado"
  | "aguardando_separacao_materiais"
  | "em_producao"
  | "pronto_para_transporte"
  | "em_transporte"
  | "em_montagem"
  | "montagem_concluida"
  | "finalizado"
  | "cancelado";
```

### Observação sobre financeiro

O pagamento do montador **não deve ser tratado como status principal do item**.

Melhor separar:

- status operacional do item;
- status financeiro do montador.

Isso evita misturar produção com pagamento.

---

## 7. Status financeiro dos montadores

```ts
type AssemblerPaymentStatus =
  | "nao_liberado"
  | "pendente"
  | "pago"
  | "confirmado_pelo_montador";
```

### Regra

O pagamento só entra como **pendente** quando o item chega em:

```txt
montagem_concluida
```

O administrador pode alterar o valor manualmente a qualquer momento.

---

## 8. Status simplificado para o cliente

O cliente não deve ver todos os detalhes internos.

Mapeamento sugerido:

| Status interno | Status para cliente |
|---|---|
| orcamento_criado | Orçamento em preparação |
| aguardando_desenho | Projeto em desenvolvimento |
| projeto_desenhado | Projeto pronto para análise |
| aguardando_aprovacao_cliente | Aguardando sua aprovação |
| alteracao_solicitada | Alteração solicitada |
| recusado_pelo_cliente | Item recusado |
| aprovado | Projeto aprovado |
| aguardando_separacao_materiais | Separação de materiais |
| em_producao | Em produção |
| pronto_para_transporte | Pronto para transporte |
| em_transporte | Em transporte |
| em_montagem | Em montagem |
| montagem_concluida | Montagem concluída |
| finalizado | Finalizado |
| cancelado | Cancelado |

O cliente deve ver também a **previsão atualizada**, mas não precisa ver alerta de atraso.

---

## 9. Prazos

Todos os perfis internos relevantes terão prazos:

- desenhista;
- montador;
- etapas operacionais;
- entrega prevista.

Os prazos devem ser gerados automaticamente com base em configurações padrão, mas podem ser alterados manualmente pelo administrador.

### Configuração sugerida

Criar uma coleção de configurações:

```txt
settings/deadlineDefaults
```

Exemplo:

```ts
type DeadlineDefaults = {
  desenhoDias: number;
  aprovacaoClienteDias: number;
  separacaoMateriaisDias: number;
  producaoDias: number;
  transporteDias: number;
  montagemDias: number;
};
```

### Alerta de atraso

O sistema deve mostrar alerta quando:

```txt
prazo < data atual
E status ainda não foi concluído
```

Quem vê alerta:

- administrador;
- vendedor;
- montador, quando for item dele.

O cliente vê apenas uma previsão atualizada.

---

## 10. Aprovação do cliente

### Regras

- Cliente acessa por link e senha.
- A senha é gerada automaticamente.
- O link expira 1 mês após conclusão do projeto.
- Cliente pode aprovar item por item.
- Cliente pode aprovar todos os itens de uma vez.
- Cliente pode recusar item.
- Cliente pode pedir alteração de item.
- Cliente não escreve mensagem pelo sistema; deve aparecer telefone de contato da empresa.
- Cliente vê apenas a última versão dos arquivos/projeto.
- Histórico de versões fica disponível apenas internamente.

### Estados possíveis da aprovação do item

```ts
type ClientApprovalStatus =
  | "aguardando"
  | "aprovado"
  | "recusado"
  | "alteracao_solicitada";
```

---

## 11. Histórico e versões

O sistema deve manter histórico interno das versões anteriores.

### Regras

- Cliente vê somente a última versão.
- Internamente, administradores podem ver histórico.
- Quando o cliente pedir alteração, o item mantém histórico anterior.
- Cada novo envio do desenhista cria uma nova versão.

---

## 12. Anexos

O sistema deve aceitar qualquer tipo de arquivo.

Exemplos:

- imagens;
- PDFs;
- medidas;
- renders;
- projetos técnicos;
- contratos;
- comprovantes;
- fotos da montagem.

As categorias dos arquivos são livres e podem ser criadas por quem estiver manuseando o projeto.

### Visibilidade dos anexos

Cada anexo deve ter um campo de visibilidade.

```ts
type AttachmentVisibility =
  | "internal"
  | "client"
  | "designer"
  | "assembler";
```

### Regras de visualização

- Cliente vê arquivos anexados pelo vendedor, orçamento e arquivos marcados como visíveis para cliente.
- Desenhista vê anexos necessários para desenho.
- Montador vê arquivos técnicos necessários para execução.
- Admin vê tudo.

---

## 13. Estrutura sugerida do Firestore

```txt
users
projects
projects/{projectId}/items
projects/{projectId}/attachments
projects/{projectId}/items/{itemId}/attachments
projects/{projectId}/items/{itemId}/statusHistory
projects/{projectId}/items/{itemId}/versions
projects/{projectId}/items/{itemId}/assemblerAssignments
payments
settings
```

---

## 14. Modelagem completa do banco

## 14.1 users

```ts
type UserRole = "admin" | "seller" | "designer" | "assembler";

interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: UserRole[];
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Exemplo de documento

```txt
users/{uid}
```

```json
{
  "name": "Mateus",
  "email": "usuario@email.com",
  "phone": "24999999999",
  "roles": ["admin"],
  "active": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## 14.2 projects

```ts
interface Project {
  id: string;

  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;

  sellerId: string;
  sellerName?: string;

  clientAccessCodeHash: string;
  clientAccessPublicId: string;
  clientLinkExpiresAt?: Timestamp;

  completedAt?: Timestamp;

  itemSummary: {
    total: number;
    aguardandoAprovacao: number;
    aprovados: number;
    emProducao: number;
    emMontagem: number;
    finalizados: number;
    atrasados: number;
  };

  totalCustomerValue: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

### Observações

- `clientAccessPublicId` deve ir na URL pública do cliente.
- A senha deve ser armazenada preferencialmente como hash.
- `itemSummary` pode ser atualizado por Cloud Function ou pela camada de serviço da aplicação.
- `totalCustomerValue` é a soma dos itens visíveis/orçados.

---

## 14.3 project items

```txt
projects/{projectId}/items/{itemId}
```

```ts
interface ProjectItem {
  id: string;
  projectId: string;

  name: string;
  environment: string;
  description?: string;
  material?: string;
  finish?: string;
  measurements?: string;
  notes?: string;

  customerPrice: number;

  status: ProjectItemStatus;
  clientApprovalStatus: ClientApprovalStatus;

  requiresDesigner: boolean;
  designerId?: string;
  designerName?: string;

  deadlineCurrent?: Timestamp;
  estimatedDeliveryDate?: Timestamp;

  currentVersionId?: string;

  approvedAt?: Timestamp;
  rejectedAt?: Timestamp;
  changeRequestedAt?: Timestamp;
  completedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

---

## 14.4 attachments

Pode existir anexo no nível do projeto ou do item.

### Projeto

```txt
projects/{projectId}/attachments/{attachmentId}
```

### Item

```txt
projects/{projectId}/items/{itemId}/attachments/{attachmentId}
```

```ts
interface Attachment {
  id: string;
  projectId: string;
  itemId?: string;

  fileName: string;
  originalFileName: string;
  storagePath: string;
  downloadUrl?: string;
  mimeType: string;
  sizeBytes: number;

  category: string;
  visibility: AttachmentVisibility;

  uploadedBy: string;
  uploadedByRole: UserRole;

  clientVisible: boolean;

  createdAt: Timestamp;
}
```

### Observação técnica

Não confiar apenas em `downloadUrl` permanente. O mais seguro é salvar `storagePath` e gerar URL temporária quando necessário, principalmente para o portal do cliente.

---

## 14.5 versions

```txt
projects/{projectId}/items/{itemId}/versions/{versionId}
```

```ts
interface ProjectItemVersion {
  id: string;
  projectId: string;
  itemId: string;

  versionNumber: number;
  description?: string;

  attachmentIds: string[];

  createdBy: string;
  createdAt: Timestamp;

  visibleToClient: boolean;
}
```

### Regra

- Cliente só vê a versão marcada como atual em `currentVersionId`.
- Admin pode ver todas.

---

## 14.6 statusHistory

```txt
projects/{projectId}/items/{itemId}/statusHistory/{historyId}
```

```ts
interface StatusHistory {
  id: string;
  projectId: string;
  itemId: string;

  fromStatus?: ProjectItemStatus;
  toStatus: ProjectItemStatus;

  changedBy: string;
  changedByRole: UserRole;

  note?: string;
  createdAt: Timestamp;
}
```

---

## 14.7 assemblerAssignments

```txt
projects/{projectId}/items/{itemId}/assemblerAssignments/{assignmentId}
```

```ts
interface AssemblerAssignment {
  id: string;
  projectId: string;
  itemId: string;

  assemblerId: string;
  assemblerName?: string;

  amountToReceive: number;
  paymentStatus: AssemblerPaymentStatus;

  assignedAt: Timestamp;
  assignedBy: string;

  dueAt?: Timestamp;
  completedAt?: Timestamp;

  paidAt?: Timestamp;
  paidBy?: string;

  paymentId?: string;
  paymentConfirmedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Regra

O montador não pode editar `amountToReceive`.

---

## 14.8 payments

```txt
payments/{paymentId}
```

```ts
interface AssemblerPayment {
  id: string;

  projectId: string;
  itemId: string;
  assignmentId: string;

  assemblerId: string;
  assemblerName?: string;

  amount: number;
  status: "pago" | "confirmado_pelo_montador";

  proofAttachmentId?: string;
  proofStoragePath?: string;

  paidAt: Timestamp;
  paidBy: string;

  confirmedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 14.9 settings

```txt
settings/deadlineDefaults
```

```ts
interface DeadlineDefaults {
  desenhoDias: number;
  aprovacaoClienteDias: number;
  separacaoMateriaisDias: number;
  producaoDias: number;
  transporteDias: number;
  montagemDias: number;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## 15. Estrutura sugerida no Firebase Storage

```txt
projects/{projectId}/general/{attachmentId}_{fileName}
projects/{projectId}/items/{itemId}/{category}/{attachmentId}_{fileName}
projects/{projectId}/items/{itemId}/versions/{versionId}/{attachmentId}_{fileName}
payments/{paymentId}/{attachmentId}_{fileName}
```

---

## 16. Regras de negócio detalhadas

## 16.1 Criação de projeto

Obrigatório:

- nome do cliente;
- telefone;
- endereço;
- e-mail;
- vendedor responsável;
- pelo menos um item;
- anexos do ambiente/medidas quando houver.

---

## 16.2 Criação de item

Campos livres:

- ambiente;
- material;
- acabamento;
- medidas;
- descrição;
- observações.

Não usar lista fechada para ambiente ou material neste momento.

---

## 16.3 Aprovação parcial

O cliente pode aprovar alguns itens e pedir alteração em outros.

Exemplo:

```txt
Cozinha — aprovada → vai para produção
Guarda-roupa — alteração solicitada → volta para desenho
Painel — aguardando aprovação
```

O projeto geral deve exibir um resumo automático.

---

## 16.4 Alteração solicitada

Quando o cliente pedir alteração:

- o item muda para `alteracao_solicitada`;
- apenas aquele item volta no fluxo;
- itens aprovados não retornam;
- o histórico anterior é mantido;
- o cliente vê apenas a última versão quando ela for reenviada.

---

## 16.5 Aprovação após alteração

Depois que o desenhista enviar nova versão:

- criar novo registro em `versions`;
- atualizar `currentVersionId`;
- mudar status para `aguardando_aprovacao_cliente`;
- manter histórico da versão anterior.

---

## 16.6 Atribuição de montador

Regras:

- apenas administrador atribui montador;
- um item pode ter vários montadores;
- administrador define manualmente o valor de cada montador;
- montadores não podem recusar pelo sistema;
- qualquer montador atribuído pode atualizar a etapa do item;
- montador só vê itens atribuídos a ele.

---

## 16.7 Conclusão e pagamento

Quando o item chega em `montagem_concluida`:

- as atribuições dos montadores passam para `pendente`;
- o item aparece no financeiro do administrador;
- o valor aparece no painel financeiro do montador.

Quando o administrador paga:

- cria registro em `payments`;
- anexa comprovante;
- atualiza assignment para `pago`;
- comprovante fica visível ao montador.

Quando o montador confirma:

- assignment vira `confirmado_pelo_montador`;
- payment vira `confirmado_pelo_montador`.

---

## 17. Rotas sugeridas no Next.js

A estrutura abaixo assume App Router, mas pode ser adaptada para Pages Router se o projeto atual usar outra organização.

```txt
/app
  /(auth)
    /login

  /(dashboard)
    /dashboard
      /projects
        /page.tsx
        /new
          /page.tsx
        /[projectId]
          /page.tsx
          /items
            /[itemId]
              /page.tsx
      /designer
        /page.tsx
      /assembler
        /page.tsx
      /assembler/finance
        /page.tsx
      /admin
        /page.tsx
      /admin/finance
        /assemblers
          /page.tsx
      /settings
        /deadlines
          /page.tsx

  /cliente
    /[publicId]
      /page.tsx
      /acompanhar
        /page.tsx
```

---

## 18. Componentes principais

```txt
/components/projects
  ProjectForm.tsx
  ProjectList.tsx
  ProjectSummaryCards.tsx
  ProjectItemCard.tsx
  ProjectItemForm.tsx
  ProjectItemStatusBadge.tsx
  ProjectItemTimeline.tsx
  AttachmentUploader.tsx
  AttachmentList.tsx
  ClientApprovalPanel.tsx
  AssignDesignerModal.tsx
  AssignAssemblerModal.tsx
  DeadlineEditor.tsx

/components/admin
  AdminDashboardCards.tsx
  DelayedItemsTable.tsx
  AssemblerPaymentsTable.tsx

/components/designer
  DesignerQueue.tsx
  DesignerUploadPanel.tsx

/components/assembler
  AssemblerProjectList.tsx
  AssemblerStatusUpdater.tsx
  AssemblerFinanceSummary.tsx
  AssemblerPaymentHistory.tsx

/components/client
  ClientLoginWithCode.tsx
  ClientProjectView.tsx
  ClientItemApprovalCard.tsx
  ClientTrackingTimeline.tsx
```

---

## 19. Services / camada de acesso a dados

Criar uma camada de serviços para não espalhar regras de negócio dentro dos componentes.

```txt
/lib/projects
  project.types.ts
  project.service.ts
  projectItem.service.ts
  attachment.service.ts
  approval.service.ts
  deadline.service.ts
  status.service.ts
  assembler.service.ts
  payment.service.ts
  permissions.ts
```

### Funções principais

```ts
createProject(input)
updateProject(projectId, input)
createProjectItem(projectId, input)
updateProjectItem(projectId, itemId, input)
assignDesigner(projectId, itemId, designerId, deadline?)
uploadProjectAttachment(projectId, file, metadata)
uploadItemAttachment(projectId, itemId, file, metadata)
submitDesignerVersion(projectId, itemId, files)
markItemReadyForClientApproval(projectId, itemId)
clientApproveItem(publicId, code, itemId)
clientApproveAll(publicId, code)
clientRejectItem(publicId, code, itemId)
clientRequestChange(publicId, code, itemId)
assignAssemblers(projectId, itemId, assignments)
updateItemStatus(projectId, itemId, nextStatus)
markItemAsMounted(projectId, itemId)
createAssemblerPayment(assignmentId, proofFile)
confirmAssemblerPayment(paymentId)
recalculateProjectSummary(projectId)
```

---

## 20. Segurança do link do cliente

Como o cliente não terá conta, o ideal é **não liberar leitura direta no Firestore para usuários anônimos**.

### Abordagem recomendada

Usar rota server-side do Next.js com Firebase Admin SDK:

```txt
/api/client-access/verify
/api/client-access/project
/api/client-access/approve-item
/api/client-access/reject-item
/api/client-access/request-change
```

### Como funciona

1. Cliente abre:

```txt
/cliente/{publicId}
```

2. Digita a senha.
3. API server-side valida:

```txt
publicId + senha
```

4. Se válido, retorna apenas dados permitidos ao cliente.
5. A senha deve ser comparada com `clientAccessCodeHash`.
6. A API deve verificar se o link não expirou.
7. A API nunca retorna dados financeiros internos.

### Dados que a API do cliente pode retornar

```ts
interface ClientProjectDTO {
  projectId: string;
  customerName: string;
  sellerContactPhone?: string;
  expiresAt?: string;
  items: ClientProjectItemDTO[];
}

interface ClientProjectItemDTO {
  itemId: string;
  name: string;
  environment: string;
  customerPrice: number;
  approvalStatus: ClientApprovalStatus;
  clientStatusLabel: string;
  estimatedDeliveryDate?: string;
  attachments: ClientAttachmentDTO[];
}

interface ClientAttachmentDTO {
  fileName: string;
  url: string;
  mimeType: string;
}
```

---

## 21. Regras de segurança Firestore — esqueleto

Ajustar conforme a estrutura real de autenticação já existente.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function userDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function hasRole(role) {
      return signedIn()
        && userDoc().data.active == true
        && role in userDoc().data.roles;
    }

    function isAdmin() {
      return hasRole('admin');
    }

    function isSeller() {
      return hasRole('seller');
    }

    function isDesigner() {
      return hasRole('designer');
    }

    function isAssembler() {
      return hasRole('assembler');
    }

    match /users/{userId} {
      allow read: if signedIn();
      allow create, update, delete: if isAdmin();
    }

    match /projects/{projectId} {
      allow read: if isAdmin() || isSeller();
      allow create: if isAdmin() || isSeller();
      allow update: if isAdmin() || isSeller();
      allow delete: if isAdmin();

      match /attachments/{attachmentId} {
        allow read: if isAdmin() || isSeller();
        allow create: if isAdmin() || isSeller();
        allow update, delete: if isAdmin();
      }

      match /items/{itemId} {
        allow read: if isAdmin() || isSeller();
        allow create: if isAdmin() || isSeller();
        allow update: if isAdmin() || isSeller();
        allow delete: if isAdmin();

        match /attachments/{attachmentId} {
          allow read: if isAdmin() || isSeller();
          allow create: if isAdmin() || isSeller();
          allow update, delete: if isAdmin();
        }

        match /versions/{versionId} {
          allow read: if isAdmin() || isSeller();
          allow create: if isAdmin() || isDesigner();
          allow update, delete: if isAdmin();
        }

        match /statusHistory/{historyId} {
          allow read: if isAdmin() || isSeller();
          allow create: if signedIn();
          allow update, delete: if false;
        }

        match /assemblerAssignments/{assignmentId} {
          allow read: if isAdmin();
          allow create, update, delete: if isAdmin();
        }
      }
    }

    match /payments/{paymentId} {
      allow read: if isAdmin();
      allow create, update: if isAdmin();
      allow delete: if false;
    }

    match /settings/{settingId} {
      allow read: if signedIn();
      allow write: if isAdmin();
    }
  }
}
```

### Observação importante

As regras acima são apenas um esqueleto inicial.

Como desenhistas e montadores devem ver apenas itens atribuídos, será necessário escolher uma das abordagens abaixo:

1. duplicar permissões em campos consultáveis; ou
2. criar coleções auxiliares para filas individuais; ou
3. controlar leitura sensível por API server-side.

Para simplificar e aumentar segurança, recomenda-se:

- dados administrativos sensíveis pelo Firestore direto apenas para usuários internos autorizados;
- portal do cliente via API server-side;
- financeiro dos montadores via consultas filtradas por `assemblerId` e protegidas por regra específica.

---

## 22. Estratégia para consultas de desenhistas e montadores

Como os itens ficam em subcoleções, usar `collectionGroup`.

### Desenhista

Buscar todos os itens atribuídos ao usuário atual:

```ts
collectionGroup(db, "items")
where("designerId", "==", currentUser.uid)
```

### Montador

Para montador, é melhor consultar `assemblerAssignments` por `collectionGroup`:

```ts
collectionGroup(db, "assemblerAssignments")
where("assemblerId", "==", currentUser.uid)
```

Depois carregar os itens correspondentes por `projectId` e `itemId`.

---

## 23. Dashboard do administrador

Cards essenciais:

- projetos em aberto;
- projetos atrasados;
- aguardando desenho;
- aguardando aprovação;
- em produção;
- em montagem;
- montadores a pagar;
- total vendido no mês.

Filtros:

- vendedor;
- desenhista;
- montador;
- cliente;
- status;
- data;
- atraso.

---

## 24. Painel do vendedor

O vendedor deve ver:

- todos os projetos;
- projetos criados;
- dados do cliente;
- itens;
- anexos;
- aprovação do cliente;
- status simplificado da produção;
- previsão atualizada.

O vendedor não deve ver:

- valores dos montadores;
- comprovantes de pagamento;
- financeiro interno;
- histórico financeiro dos montadores.

---

## 25. Painel do desenhista

O desenhista deve ver:

- fila de itens atribuídos;
- prazo de entrega;
- dados técnicos enviados pelo vendedor;
- anexos necessários;
- botão para anexar projeto pronto;
- itens com alteração solicitada.

O desenhista comum não deve ver:

- financeiro;
- valores dos montadores;
- painel administrativo completo.

---

## 26. Painel do montador

O montador deve ver:

- itens atribuídos;
- nome do cliente;
- telefone;
- endereço;
- arquivos técnicos;
- prazo;
- status atual;
- botão para atualizar status;
- valor que ele vai receber;
- pagamentos pendentes;
- pagamentos já pagos;
- comprovantes;
- histórico de serviços.

O painel deve funcionar muito bem no celular.

---

## 27. Tela do cliente

O cliente acessa com link + senha.

Deve ver:

- nome do projeto;
- itens do projeto;
- valor por item;
- valor total;
- arquivos liberados;
- botão aprovar item;
- botão aprovar tudo;
- botão recusar item;
- botão pedir alteração;
- status simplificado;
- previsão atualizada;
- telefone de contato da empresa.

Não deve ver:

- desenhista responsável;
- montador responsável, se a empresa não quiser mostrar;
- valores pagos aos montadores;
- histórico interno;
- arquivos internos;
- comprovantes.

---

## 28. Layout mobile-first

Como montadores usarão principalmente pelo celular, priorizar:

- cards grandes;
- botões grandes;
- poucos campos por tela;
- status visual claro;
- upload fácil de fotos;
- telefone clicável;
- endereço com link para mapa;
- timeline simples;
- financeiro claro.

### Exemplo de card do montador

```txt
[Cliente João]
Cozinha planejada
Status: Em montagem
Prazo: 20/07/2026
Valor a receber: R$ 800,00

[Ver arquivos]
[Ligar para cliente]
[Abrir endereço]
[Atualizar status]
```

---

## 29. Telas mínimas do MVP

Como prioridade definida: **controle de etapas, financeiro dos montadores, link do cliente e painel admin**.

### MVP deve conter

1. Cadastro de projeto.
2. Cadastro de itens.
3. Upload de anexos.
4. Painel administrativo.
5. Painel do vendedor.
6. Painel do desenhista.
7. Painel do montador.
8. Status por item.
9. Prazos automáticos e editáveis.
10. Alertas de atraso internos.
11. Link do cliente com senha.
12. Aprovação item por item.
13. Aprovar tudo.
14. Recusar item.
15. Pedir alteração.
16. Atribuir montadores.
17. Definir valor por montador.
18. Financeiro do montador.
19. Admin anexar comprovante.
20. Montador confirmar recebimento.

### Fica para depois

- notificações;
- WhatsApp automático;
- e-mail automático;
- assinatura digital;
- mensagens internas;
- cálculo automático complexo de preço;
- comissão de vendedores.

---

## 30. Ordem recomendada de implementação

## Fase 0 — Auditoria do sistema atual

Antes de codar:

- verificar como o sistema atual autentica usuários;
- verificar como os papéis/permissões atuais funcionam;
- verificar estrutura atual do Firebase;
- verificar padrão de componentes usado no projeto;
- verificar se o projeto usa App Router ou Pages Router;
- verificar se já há upload para Firebase Storage;
- verificar padrão visual atual.

---

## Fase 1 — Tipos e estrutura base

Criar:

- types de `Project`;
- types de `ProjectItem`;
- types de `Attachment`;
- types de `StatusHistory`;
- types de `AssemblerAssignment`;
- types de `Payment`;
- constantes de status;
- mapeamento de status interno para status do cliente;
- helpers de permissão.

---

## Fase 2 — CRUD de projetos e itens

Implementar:

- criar projeto;
- editar projeto;
- listar projetos;
- criar item;
- editar item;
- listar itens do projeto;
- resumo automático do projeto.

---

## Fase 3 — Upload de anexos

Implementar:

- upload para Firebase Storage;
- registro do anexo no Firestore;
- categoria livre;
- visibilidade do arquivo;
- listagem de anexos;
- remoção ou desativação de anexo por admin.

---

## Fase 4 — Fluxo do desenhista

Implementar:

- admin atribui desenhista;
- prazo automático do desenho;
- fila do desenhista;
- upload do projeto pronto;
- criação de versão;
- mudança para aprovação do cliente.

---

## Fase 5 — Portal do cliente

Implementar:

- geração automática de senha;
- geração de publicId;
- tela de acesso do cliente;
- validação por API server-side;
- listagem dos itens;
- arquivos visíveis ao cliente;
- aprovação item por item;
- aprovar tudo;
- recusar;
- pedir alteração;
- status simplificado;
- previsão atualizada;
- expiração 1 mês após conclusão.

---

## Fase 6 — Fluxo do montador

Implementar:

- admin atribui montador;
- admin define valor por montador;
- montador vê itens atribuídos;
- montador vê dados do cliente;
- montador vê arquivos técnicos;
- montador atualiza status;
- montador anexa fotos/arquivos;
- painel mobile-first.

---

## Fase 7 — Financeiro dos montadores

Implementar:

- pagamento pendente após montagem concluída;
- painel admin de montadores a pagar;
- admin cria pagamento;
- admin anexa comprovante;
- montador vê comprovante;
- montador confirma recebimento;
- histórico financeiro do montador.

---

## Fase 8 — Dashboards e filtros

Implementar:

- dashboard admin;
- cards de resumo;
- filtros por vendedor;
- filtros por desenhista;
- filtros por montador;
- filtros por cliente;
- filtros por status;
- filtros por data;
- filtros de atraso.

---

## Fase 9 — Ajustes finais

Implementar:

- validações;
- estados vazios;
- loading states;
- tratamento de erro;
- responsividade;
- testes manuais por perfil;
- revisão das regras de segurança.

---

## 31. Critérios de aceite do MVP

O MVP só deve ser considerado pronto quando:

1. Vendedor consegue criar projeto com cliente e itens.
2. Vendedor consegue anexar documentos.
3. Admin consegue atribuir desenhista.
4. Desenhista consegue ver fila e anexar projeto pronto.
5. Cliente consegue acessar por link e senha.
6. Cliente consegue aprovar item por item.
7. Cliente consegue pedir alteração em um item sem afetar os outros.
8. Item aprovado segue para produção.
9. Admin consegue atribuir um ou mais montadores.
10. Admin consegue definir valor de cada montador.
11. Montador vê apenas os próprios itens.
12. Montador consegue atualizar status.
13. Cliente vê status simplificado.
14. Quando item é concluído, pagamento aparece como pendente.
15. Admin consegue registrar pagamento com comprovante.
16. Montador consegue confirmar recebimento.
17. Admin consegue filtrar projetos por status, atraso e responsáveis.
18. Vendedor não consegue ver valores dos montadores.
19. Cliente não consegue ver dados internos.
20. Sistema funciona bem no celular.

---

## 32. Cuidados importantes para o Codex

Ao implementar, evitar:

- colocar toda a lógica dentro dos componentes;
- misturar status operacional com status financeiro;
- criar um único status para o projeto inteiro;
- liberar Firestore direto para cliente externo;
- deixar montador ver dados financeiros de outros montadores;
- deixar vendedor ver financeiro de montador;
- sobrescrever versões antigas do projeto;
- permitir aprovação sem validar link e senha;
- criar layout desktop-first para tela do montador.

---

## 33. Prompt sugerido para o Codex

Use este prompt no Codex:

```txt
Tenho um sistema existente em Next.js + TypeScript + Firebase. Quero implementar uma nova feature chamada Gestão de Projetos para uma marcenaria.

Leia o documento de especificação completo anexado e, antes de escrever código, faça um plano técnico de execução dividido em fases pequenas.

Primeiro, analise a estrutura atual do projeto e identifique:
1. se usa App Router ou Pages Router;
2. como está implementada a autenticação;
3. como os usuários e papéis estão modelados;
4. se já existe integração com Firebase Storage;
5. quais componentes e padrões visuais já existem;
6. onde encaixar o novo módulo sem quebrar o sistema atual.

Depois, proponha:
1. estrutura de arquivos;
2. tipos TypeScript;
3. services;
4. hooks;
5. componentes;
6. páginas/rotas;
7. regras de Firestore;
8. ordem de implementação;
9. testes manuais necessários.

Não implemente tudo de uma vez. Comece pela base de tipos, services e CRUD de projeto/item.
```

---

## 34. Resumo executivo

A nova feature deve ser construída como um módulo de **Gestão de Projetos**, onde:

- `Project` agrupa os dados do cliente e os itens;
- `ProjectItem` controla o fluxo real;
- cada item pode ser aprovado individualmente;
- cada item pode ter seu próprio desenhista;
- cada item pode ter um ou mais montadores;
- cada montador recebe valor manual definido pelo administrador;
- cliente acessa por link e senha;
- cliente vê apenas orçamento, arquivos liberados e rastreamento simplificado;
- financeiro do montador é separado do status operacional;
- administradores veem tudo;
- vendedores não veem financeiro dos montadores;
- montadores veem apenas seus próprios projetos e valores;
- notificações ficam para uma etapa futura.

A prioridade do MVP é:

1. controle de etapas;
2. painel administrativo;
3. link de aprovação do cliente;
4. financeiro dos montadores;
5. uso excelente no celular.
