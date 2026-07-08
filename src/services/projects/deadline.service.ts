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
  aprovacaoClienteDias: 3,
  separacaoMateriaisDias: 2,
  producaoDias: 10,
  transporteDias: 2,
  montagemDias: 2,
};

const STATUS_TO_DEFAULTS_KEY: Partial<
  Record<ProjectItemStatus, keyof typeof FALLBACK_DEADLINE_DEFAULTS>
> = {
  aguardando_desenho: 'desenhoDias',
  aguardando_aprovacao_cliente: 'aprovacaoClienteDias',
  aguardando_separacao_materiais: 'separacaoMateriaisDias',
  em_producao: 'producaoDias',
  em_transporte: 'transporteDias',
  em_montagem: 'montagemDias',
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
    aprovacaoClienteDias:
      data.aprovacaoClienteDias ??
      FALLBACK_DEADLINE_DEFAULTS.aprovacaoClienteDias,
    separacaoMateriaisDias:
      data.separacaoMateriaisDias ??
      FALLBACK_DEADLINE_DEFAULTS.separacaoMateriaisDias,
    producaoDias: data.producaoDias ?? FALLBACK_DEADLINE_DEFAULTS.producaoDias,
    transporteDias:
      data.transporteDias ?? FALLBACK_DEADLINE_DEFAULTS.transporteDias,
    montagemDias: data.montagemDias ?? FALLBACK_DEADLINE_DEFAULTS.montagemDias,
  };
}
