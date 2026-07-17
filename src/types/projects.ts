import { Timestamp } from 'firebase/firestore';

export type UserRole =
  | 'admin'
  | 'seller'
  | 'designer'
  | 'assembler'
  | 'woodworker';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: UserRole[];
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ProjectItemStatus =
  | 'projeto_criado'
  | 'aguardando_desenho'
  | 'aguardando_orcamento'
  | 'aguardando_aprovacao_cliente'
  | 'alteracao_solicitada'
  | 'recusado_pelo_cliente'
  | 'aguardando_atribuicao_montador'
  | 'em_producao'
  | 'pronto_para_montagem'
  | 'montagem_concluida'
  | 'aguardando_pagamento_montador'
  | 'finalizado'
  | 'cancelado';

export type ClientApprovalStatus =
  | 'aguardando'
  | 'aprovado'
  | 'recusado'
  | 'alteracao_solicitada';

export type AssemblerPaymentStatus =
  | 'nao_liberado'
  | 'pendente'
  | 'pago'
  | 'confirmado_pelo_montador';

export type AttachmentVisibility =
  | 'internal'
  | 'client'
  | 'designer'
  | 'assembler';

export type AttachmentFileKind = 'document' | 'image' | 'model_3d';

export interface ProjectItemSummary {
  total: number;
  aguardandoAprovacao: number;
  aprovados: number;
  emProducao: number;
  emMontagem: number;
  finalizados: number;
  atrasados: number;
}

export interface Project {
  id: string;

  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;

  sellerId: string;
  sellerName?: string;

  clientAccessCodeHash: string;
  clientAccessPublicId: string;
  clientLinkExpiresAt?: Timestamp;
  clientAccessAttempts?: number;
  clientAccessLockUntil?: Timestamp;

  completedAt?: Timestamp;

  itemSummary: ProjectItemSummary;

  totalCustomerValue: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  createdByName?: string;
  updatedBy: string;
}

export interface ProjectItem {
  id: string;
  projectId: string;

  name: string;
  environment: string;
  description?: string;
  material?: string;
  notes?: string;

  status: ProjectItemStatus;
  clientApprovalStatus: ClientApprovalStatus;

  designerId?: string;
  designerName?: string;

  deadlineCurrent?: Timestamp;
  estimatedDeliveryDate?: Timestamp;

  currentVersionId?: string;

  budget?: ItemBudget;

  approvedAt?: Timestamp;
  rejectedAt?: Timestamp;
  changeRequestedAt?: Timestamp;
  completedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export interface ItemBudgetLine {
  id: string;
  description: string;
  amount: number;
}

export interface ItemBudget {
  lines: ItemBudgetLine[];
  totalCost: number;
  customerAmount: number;
  suggestedAssemblerAmount: number;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Attachment {
  id: string;
  projectId: string;
  itemId: string;

  fileName: string;
  originalFileName: string;
  storagePath: string;
  downloadUrl?: string;
  mimeType: string;
  sizeBytes: number;
  fileKind?: AttachmentFileKind;

  category: string;
  visibility: AttachmentVisibility;

  uploadedBy: string;
  uploadedByName?: string;
  uploadedByRole: UserRole;

  clientVisible: boolean;

  createdAt: Timestamp;
}

export interface ProjectItemVersion {
  id: string;
  projectId: string;
  itemId: string;

  versionNumber: number;
  description?: string;

  attachmentIds: string[];

  createdBy: string;
  createdByName?: string;
  createdAt: Timestamp;

  visibleToClient: boolean;
}

export interface StatusHistory {
  id: string;
  projectId: string;
  itemId: string;

  fromStatus?: ProjectItemStatus;
  toStatus: ProjectItemStatus;

  changedBy: string;
  changedByName?: string;
  changedByRole: UserRole | 'client';

  note?: string;
  createdAt: Timestamp;
}

export interface AssemblerAssignment {
  id: string;
  projectId: string;
  itemId: string;

  assemblerId: string;
  assemblerName?: string;

  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  itemName?: string;
  itemEnvironment?: string;
  itemStatus?: ProjectItemStatus;

  amountToReceive: number;
  paymentStatus: AssemblerPaymentStatus;

  assignedAt: Timestamp;
  assignedBy: string;
  assignedByName?: string;

  dueAt?: Timestamp;
  completedAt?: Timestamp;

  paidAt?: Timestamp;
  paidBy?: string;

  paymentId?: string;
  paymentConfirmedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AssemblerPayment {
  id: string;

  projectId: string;
  itemId: string;
  assignmentId: string;

  assemblerId: string;
  assemblerName?: string;

  amount: number;
  status: 'pago' | 'confirmado_pelo_montador';

  proofAttachmentId?: string;
  proofStoragePath?: string;

  paidAt: Timestamp;
  paidBy: string;
  paidByName?: string;

  confirmedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DeadlineDefaults {
  desenhoDias: number;
  orcamentoDias: number;
  aprovacaoClienteDias: number;
  atribuicaoMontadorDias: number;
  producaoDias: number;
  montagemDias: number;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface ClientAttachmentDTO {
  fileName: string;
  url: string;
  mimeType: string;
  fileKind?: AttachmentFileKind;
}

export interface ClientProjectItemDTO {
  itemId: string;
  name: string;
  environment: string;
  customerAmount?: number;
  approvalStatus: ClientApprovalStatus;
  clientStatusLabel: string;
  estimatedDeliveryDate?: string;
  attachments: ClientAttachmentDTO[];
}

export interface ClientProjectDTO {
  projectId: string;
  customerName: string;
  sellerContactPhone?: string;
  expiresAt?: string;
  items: ClientProjectItemDTO[];
}
