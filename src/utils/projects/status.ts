import { ProjectItemStatus } from '@/types/projects';

const TRANSITIONS: Record<ProjectItemStatus, ProjectItemStatus[]> = {
  orcamento_criado: ['aguardando_desenho', 'aguardando_aprovacao_cliente'],
  aguardando_desenho: ['projeto_desenhado'],
  projeto_desenhado: ['aguardando_aprovacao_cliente'],
  aguardando_aprovacao_cliente: [
    'aprovado',
    'recusado_pelo_cliente',
    'alteracao_solicitada',
  ],
  alteracao_solicitada: ['aguardando_desenho'],
  recusado_pelo_cliente: [],
  aprovado: ['aguardando_separacao_materiais'],
  aguardando_separacao_materiais: ['em_producao'],
  em_producao: ['pronto_para_transporte'],
  pronto_para_transporte: ['em_transporte'],
  em_transporte: ['em_montagem'],
  em_montagem: ['montagem_concluida'],
  montagem_concluida: ['finalizado'],
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
  orcamento_criado: 'Orçamento em preparação',
  aguardando_desenho: 'Projeto em desenvolvimento',
  projeto_desenhado: 'Projeto pronto para análise',
  aguardando_aprovacao_cliente: 'Aguardando sua aprovação',
  alteracao_solicitada: 'Alteração solicitada',
  recusado_pelo_cliente: 'Item recusado',
  aprovado: 'Projeto aprovado',
  aguardando_separacao_materiais: 'Separação de materiais',
  em_producao: 'Em produção',
  pronto_para_transporte: 'Pronto para transporte',
  em_transporte: 'Em transporte',
  em_montagem: 'Em montagem',
  montagem_concluida: 'Montagem concluída',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export function getClientStatusLabel(status: ProjectItemStatus): string {
  return CLIENT_STATUS_LABELS[status];
}

export const INTERNAL_STATUS_LABELS: Record<ProjectItemStatus, string> = {
  orcamento_criado: 'Orçamento criado',
  aguardando_desenho: 'Aguardando desenho',
  projeto_desenhado: 'Projeto desenhado',
  aguardando_aprovacao_cliente: 'Aguardando aprovação do cliente',
  alteracao_solicitada: 'Alteração solicitada pelo cliente',
  recusado_pelo_cliente: 'Recusado pelo cliente',
  aprovado: 'Aprovado',
  aguardando_separacao_materiais: 'Aguardando separação de materiais',
  em_producao: 'Em produção',
  pronto_para_transporte: 'Pronto para transporte',
  em_transporte: 'Em transporte',
  em_montagem: 'Em montagem',
  montagem_concluida: 'Montagem concluída',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export const INTERNAL_STATUS_COLORS: Record<ProjectItemStatus, string> = {
  orcamento_criado: 'gray',
  aguardando_desenho: 'purple',
  projeto_desenhado: 'purple',
  aguardando_aprovacao_cliente: 'yellow',
  alteracao_solicitada: 'orange',
  recusado_pelo_cliente: 'red',
  aprovado: 'green',
  aguardando_separacao_materiais: 'blue',
  em_producao: 'blue',
  pronto_para_transporte: 'blue',
  em_transporte: 'blue',
  em_montagem: 'blue',
  montagem_concluida: 'teal',
  finalizado: 'green',
  cancelado: 'red',
};
