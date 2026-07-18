import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { ProjectNotification, UserRole } from '@/types/projects';

import { db } from '../firebase';
import { projectNotificationPath, projectNotificationsPath } from './paths';
import { updateItemStatus } from './status.service';

export interface NotificationActor {
  uid: string;
  name?: string;
  role: UserRole;
}

export async function createNotification(
  projectId: string,
  itemId: string,
  itemName: string,
  message: string,
  actor: NotificationActor,
): Promise<string> {
  const ref = doc(collection(db, projectNotificationsPath(projectId)));
  const notification: ProjectNotification & { resolvedAt: null } = {
    id: ref.id,
    projectId,
    itemId,
    itemName,
    type: 'info_solicitada',
    message,
    createdBy: actor.uid,
    ...(actor.name ? { createdByName: actor.name } : {}),
    createdByRole: actor.role,
    // Gravado explicitamente como null (nao ausente): a query de resolucao
    // pendente filtra por resolvedAt == null, que nao casa com campo ausente.
    resolvedAt: null,
    createdAt: Timestamp.now(),
  };
  await setDoc(ref, notification);
  return ref.id;
}

export async function listNotifications(
  projectId: string,
): Promise<ProjectNotification[]> {
  const snap = await getDocs(
    collection(db, projectNotificationsPath(projectId)),
  );
  return snap.docs.map(d => d.data() as ProjectNotification);
}

export function useNotifications(
  projectId: string,
): UseQueryResult<ProjectNotification[]> {
  return useQuery({
    queryKey: ['projects', projectId, 'notifications'],
    queryFn: () => listNotifications(projectId),
    enabled: !!projectId,
  });
}

export async function resolveNotification(
  projectId: string,
  notificationId: string,
): Promise<void> {
  await updateDoc(doc(db, projectNotificationPath(projectId, notificationId)), {
    resolvedAt: Timestamp.now(),
  });
}

export async function resolveNotificationsForItem(
  projectId: string,
  itemId: string,
): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, projectNotificationsPath(projectId)),
      where('itemId', '==', itemId),
      where('resolvedAt', '==', null),
    ),
  );
  await Promise.all(
    snap.docs.map(docSnap =>
      updateDoc(docSnap.ref, { resolvedAt: Timestamp.now() }),
    ),
  );
}

/**
 * Desenhista devolve o item para o vendedor com uma justificativa: transiciona
 * para aguardando_informacoes (nota obrigatoria) e cria a notificacao.
 */
export async function requestMoreInformation(
  projectId: string,
  itemId: string,
  itemName: string,
  message: string,
  actor: NotificationActor,
): Promise<void> {
  if (actor.role !== 'designer' && actor.role !== 'admin') {
    throw new Error(
      'Apenas desenhistas ou administradores podem pedir informações.',
    );
  }

  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error('Descreva o que falta para o item avançar.');
  }

  await updateItemStatus(
    projectId,
    itemId,
    'aguardando_informacoes',
    actor,
    trimmed,
  );
  await createNotification(projectId, itemId, itemName, trimmed, actor);
}

export function useRequestMoreInformation(): UseMutationResult<
  void,
  Error,
  {
    projectId: string;
    itemId: string;
    itemName: string;
    message: string;
    actor: NotificationActor;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, itemId, itemName, message, actor }) =>
      requestMoreInformation(projectId, itemId, itemName, message, actor),
    onSuccess: (_data, { projectId, itemId }) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'items', itemId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'notifications'],
      });
    },
  });
}
