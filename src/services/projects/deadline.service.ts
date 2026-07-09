import { addDays } from 'date-fns';
import { doc, getDoc, Timestamp } from 'firebase/firestore';

import { DeadlineDefaults, ProjectItemStatus } from '@/types/projects';

import { db } from '../firebase';
import { deadlineDefaultsPath } from './paths';

export const FALLBACK_DEADLINE_DEFAULTS: Omit<
  DeadlineDefaults,
  'updatedAt' | 'updatedBy'
> = {
  desenhoDias: 5,
  orcamentoDias: 2,
  aprovacaoClienteDias: 3,
  atribuicaoMontadorDias: 2,
  producaoDias: 10,
  montagemDias: 2,
};

const STATUS_TO_DEFAULTS_KEY: Partial<
  Record<ProjectItemStatus, keyof typeof FALLBACK_DEADLINE_DEFAULTS>
> = {
  aguardando_desenho: 'desenhoDias',
  aguardando_orcamento: 'orcamentoDias',
  aguardando_aprovacao_cliente: 'aprovacaoClienteDias',
  aguardando_atribuicao_montador: 'atribuicaoMontadorDias',
  em_producao: 'producaoDias',
  pronto_para_montagem: 'montagemDias',
};

export function computeDeadline(
  status: ProjectItemStatus,
  defaults: Omit<DeadlineDefaults, 'updatedAt' | 'updatedBy'>,
  from: Date = new Date(),
): Timestamp | undefined {
  const key = STATUS_TO_DEFAULTS_KEY[status];
  if (!key) return undefined;

  return Timestamp.fromDate(addDays(from, defaults[key]));
}

export async function getDeadlineDefaults(): Promise<
  Omit<DeadlineDefaults, 'updatedAt' | 'updatedBy'>
> {
  const snap = await getDoc(doc(db, deadlineDefaultsPath()));
  if (!snap.exists()) return FALLBACK_DEADLINE_DEFAULTS;

  const data = snap.data() as DeadlineDefaults;
  return {
    desenhoDias: data.desenhoDias ?? FALLBACK_DEADLINE_DEFAULTS.desenhoDias,
    orcamentoDias:
      data.orcamentoDias ?? FALLBACK_DEADLINE_DEFAULTS.orcamentoDias,
    aprovacaoClienteDias:
      data.aprovacaoClienteDias ??
      FALLBACK_DEADLINE_DEFAULTS.aprovacaoClienteDias,
    atribuicaoMontadorDias:
      data.atribuicaoMontadorDias ??
      FALLBACK_DEADLINE_DEFAULTS.atribuicaoMontadorDias,
    producaoDias: data.producaoDias ?? FALLBACK_DEADLINE_DEFAULTS.producaoDias,
    montagemDias: data.montagemDias ?? FALLBACK_DEADLINE_DEFAULTS.montagemDias,
  };
}
