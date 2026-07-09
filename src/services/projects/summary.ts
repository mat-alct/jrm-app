import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';

import { ProjectItem, ProjectItemSummary } from '@/types/projects';

import { isDelayed } from '../../utils/projects/delay';
import { db } from '../firebase';
import { projectItemsPath, projectPath } from './paths';

export function computeItemSummary(
  items: Pick<ProjectItem, 'status' | 'deadlineCurrent' | 'customerPrice'>[],
  now: Date = new Date(),
): ProjectItemSummary {
  return items.reduce<ProjectItemSummary>(
    (summary, item) => {
      summary.total += 1;

      if (item.status === 'aguardando_aprovacao_cliente') {
        summary.aguardandoAprovacao += 1;
      }
      if (item.status === 'aguardando_atribuicao_montador') {
        summary.aprovados += 1;
      }
      if (item.status === 'em_producao' || item.status === 'pronto_para_montagem') {
        summary.emProducao += 1;
      }
      if (
        item.status === 'montagem_concluida' ||
        item.status === 'aguardando_pagamento_montador'
      ) {
        summary.emMontagem += 1;
      }
      if (item.status === 'finalizado') {
        summary.finalizados += 1;
      }
      if (isDelayed(item, now)) {
        summary.atrasados += 1;
      }

      return summary;
    },
    {
      total: 0,
      aguardandoAprovacao: 0,
      aprovados: 0,
      emProducao: 0,
      emMontagem: 0,
      finalizados: 0,
      atrasados: 0,
    },
  );
}

export function computeTotalCustomerValue(
  items: Pick<ProjectItem, 'budget'>[],
): number {
  return items.reduce(
    (total, item) => total + (item.budget?.customerAmount || 0),
    0,
  );
}

export async function recalculateProjectSummary(
  projectId: string,
): Promise<void> {
  const itemsSnap = await getDocs(collection(db, projectItemsPath(projectId)));
  const items = itemsSnap.docs.map(d => d.data() as ProjectItem);

  await updateDoc(doc(db, projectPath(projectId)), {
    itemSummary: computeItemSummary(items),
    totalCustomerValue: computeTotalCustomerValue(items),
  });
}

// Reexportado para conveniencia de quem so precisa ler o resumo atual.
export async function getProjectSummary(
  projectId: string,
): Promise<ProjectItemSummary | null> {
  const snap = await getDoc(doc(db, projectPath(projectId)));
  if (!snap.exists()) return null;

  return snap.data().itemSummary as ProjectItemSummary;
}
