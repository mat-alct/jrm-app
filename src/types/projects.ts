import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'seller' | 'designer' | 'assembler';

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
  | 'orcamento_criado'
  | 'aguardando_desenho'
  | 'projeto_desenhado'
  | 'aguardando_aprovacao_cliente'
  | 'alteracao_solicitada'
  | 'recusado_pelo_cliente'
  | 'aprovado'
  | 'aguardando_separacao_materiais'
  | 'em_producao'
  | 'pronto_para_transporte'
  | 'em_transporte'
  | 'em_montagem'
  | 'montagem_concluida'
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
  customerEmail: string;
  customerAddress: string;

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
  updatedBy: string;
}

export interface ProjectItem {
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

export interface Attachment {
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

export interface ProjectItemVersion {
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

export interface StatusHistory {
  id: string;
  projectId: string;
  itemId: string;

  fromStatus?: ProjectItemStatus;
  toStatus: ProjectItemStatus;

  changedBy: string;
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

  confirmedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DeadlineDefaults {
  desenhoDias: number;
  aprovacaoClienteDias: number;
  separacaoMateriaisDias: number;
  producaoDias: number;
  transporteDias: number;
  montagemDias: number;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface ClientAttachmentDTO {
  fileName: string;
  url: string;
  mimeType: string;
}

export interface ClientProjectItemDTO {
  itemId: string;
  name: string;
  environment: string;
  customerPrice: number;
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
