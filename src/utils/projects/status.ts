import { AssemblerPaymentStatus, ProjectItemStatus, UserRole } from '@/types/projects';

const TRANSITIONS: Record<ProjectItemStatus, ProjectItemStatus[]> = {
  projeto_criado: ['aguardando_desenho'],
  aguardando_desenho: ['aguardando_orcamento'],
  aguardando_orcamento: ['aguardando_aprovacao_cliente'],
  aguardando_aprovacao_cliente: [
    'aguardando_atribuicao_montador',
    'recusado_pelo_cliente',
    'alteracao_solicitada',
  ],
  alteracao_solicitada: ['aguardando_desenho'],
  recusado_pelo_cliente: [],
  aguardando_atribuicao_montador: ['em_producao'],
  em_producao: ['pronto_para_montagem'],
  pronto_para_montagem: ['montagem_concluida'],
  montagem_concluida: ['aguardando_pagamento_montador'],
  aguardando_pagamento_montador: ['finalizado'],
  finalizado: [],
  cancelado: [],
};

const FINAL_STATUSES: ProjectItemStatus[] = ['finalizado', 'cancelado'];

interface CanTransitionOptions {
  isAdmin?: boolean;
}

export function canTransition(
  from: ProjectItemStatus,
  to: ProjectItemStatus,
  { isAdmin = false }: CanTransitionOptions = {},
): boolean {
  if (from === to) return false;

  if (isAdmin) {
    return to === 'cancelado' ? !FINAL_STATUSES.includes(from) : true;
  }

  if (to === 'cancelado') return false;

  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function isFinalStatus(status: ProjectItemStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

export const CLIENT_STATUS_LABELS: Record<ProjectItemStatus, string> = {
  projeto_criado: 'Projeto em preparação',
  aguardando_desenho: 'Projeto em desenvolvimento',
  aguardando_orcamento: 'Orçamento em preparação',
  aguardando_aprovacao_cliente: 'Aguardando sua aprovação',
  alteracao_solicitada: 'Alteração solicitada',
  recusado_pelo_cliente: 'Item recusado',
  aguardando_atribuicao_montador: 'Projeto aprovado',
  em_producao: 'Em produção',
  pronto_para_montagem: 'Em produção',
  montagem_concluida: 'Montagem concluída',
  aguardando_pagamento_montador: 'Montagem concluída',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export function getClientStatusLabel(status: ProjectItemStatus): string {
  return CLIENT_STATUS_LABELS[status];
}

export const INTERNAL_STATUS_LABELS: Record<ProjectItemStatus, string> = {
  projeto_criado: 'Projeto criado',
  aguardando_desenho: 'Aguardando desenho',
  aguardando_orcamento: 'Aguardando orçamento',
  aguardando_aprovacao_cliente: 'Aguardando aprovação do cliente',
  alteracao_solicitada: 'Alteração solicitada pelo cliente',
  recusado_pelo_cliente: 'Recusado pelo cliente',
  aguardando_atribuicao_montador: 'Aguardando atribuição de montador',
  em_producao: 'Em produção',
  pronto_para_montagem: 'Pronto para montagem',
  montagem_concluida: 'Montagem concluída',
  aguardando_pagamento_montador: 'Aguardando pagamento do montador',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export const INTERNAL_STATUS_COLORS: Record<ProjectItemStatus, string> = {
  projeto_criado: 'gray',
  aguardando_desenho: 'purple',
  aguardando_orcamento: 'purple',
  aguardando_aprovacao_cliente: 'yellow',
  alteracao_solicitada: 'orange',
  recusado_pelo_cliente: 'red',
  aguardando_atribuicao_montador: 'green',
  em_producao: 'blue',
  pronto_para_montagem: 'blue',
  montagem_concluida: 'teal',
  aguardando_pagamento_montador: 'teal',
  finalizado: 'green',
  cancelado: 'red',
};

export const PAYMENT_STATUS_LABELS: Record<AssemblerPaymentStatus, string> = {
  nao_liberado: 'Não liberado',
  pendente: 'Pendente',
  pago: 'Pago',
  confirmado_pelo_montador: 'Confirmado pelo montador',
};

export const PAYMENT_STATUS_COLORS: Record<AssemblerPaymentStatus, string> = {
  nao_liberado: 'gray',
  pendente: 'yellow',
  pago: 'blue',
  confirmado_pelo_montador: 'green',
};

export const INTERNAL_ROLE_LABELS: Record<UserRole | 'client', string> = {
  admin: 'Administrador',
  seller: 'Vendedor',
  designer: 'Desenhista',
  assembler: 'Montador',
  woodworker: 'Marceneiro',
  client: 'Cliente',
};
