import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import {
  createNotification,
  listNotifications,
  requestMoreInformation,
  resolveNotification,
  resolveNotificationsForItem,
} from '@/services/projects/notification.service';
import { projectItemPath } from '@/services/projects/paths';
import { resetEmulator } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD, seedEmulator } from '@/tests/helpers/seedEmulator';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

describe('services/projects/notification.service integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  describe('createNotification / listNotifications', () => {
    it('creates a notification with resolvedAt null and lists it back', async () => {
      await signInAs('desenhista@seed.jrm');

      const id = await createNotification(
        'seed-project-1',
        'seed-item-1',
        'Item Um',
        'Falta a medida do vão',
        { uid: 'seed-designer', name: 'Desenhista Seed', role: 'designer' },
      );
      await signOut(auth);
      await signInAs('vendedor@seed.jrm');

      const notifications = await listNotifications('seed-project-1');
      expect(notifications).toEqual([
        expect.objectContaining({
          id,
          projectId: 'seed-project-1',
          itemId: 'seed-item-1',
          itemName: 'Item Um',
          type: 'info_solicitada',
          message: 'Falta a medida do vão',
          createdBy: 'seed-designer',
          createdByName: 'Desenhista Seed',
          createdByRole: 'designer',
          resolvedAt: null,
        }),
      ]);
    });
  });

  describe('resolveNotification', () => {
    it('marks a single notification as resolved', async () => {
      await signInAs('desenhista@seed.jrm');
      const id = await createNotification(
        'seed-project-1',
        'seed-item-1',
        'Item Um',
        'msg',
        { uid: 'seed-designer', role: 'designer' },
      );
      await signOut(auth);
      await signInAs('vendedor@seed.jrm');

      await resolveNotification('seed-project-1', id);

      const [notification] = await listNotifications('seed-project-1');
      expect(notification.resolvedAt).not.toBeNull();
    });
  });

  describe('resolveNotificationsForItem', () => {
    it('resolves only unresolved notifications for the given item', async () => {
      await signInAs('desenhista@seed.jrm');
      await createNotification(
        'seed-project-1',
        'seed-item-1',
        'Item Um',
        'a',
        {
          uid: 'seed-designer',
          role: 'designer',
        },
      );
      await createNotification(
        'seed-project-1',
        'seed-item-1',
        'Item Um',
        'b',
        {
          uid: 'seed-designer',
          role: 'designer',
        },
      );
      await createNotification(
        'seed-project-1',
        'seed-item-2',
        'Item Dois',
        'c',
        {
          uid: 'seed-designer',
          role: 'designer',
        },
      );
      await signOut(auth);
      await signInAs('vendedor@seed.jrm');

      await resolveNotificationsForItem('seed-project-1', 'seed-item-1');

      const notifications = await listNotifications('seed-project-1');
      const forItem1 = notifications.filter(n => n.itemId === 'seed-item-1');
      const forItem2 = notifications.filter(n => n.itemId === 'seed-item-2');
      expect(forItem1.every(n => n.resolvedAt !== null)).toBe(true);
      expect(forItem2.every(n => n.resolvedAt === null)).toBe(true);
    });
  });

  describe('requestMoreInformation', () => {
    it('moves the item to aguardando_informacoes and creates a notification', async () => {
      await adminDb
        .doc(projectItemPath('seed-project-1', 'seed-item-1'))
        .update({ status: 'aguardando_desenho', designerId: 'seed-designer' });
      await signInAs('desenhista@seed.jrm');

      await requestMoreInformation(
        'seed-project-1',
        'seed-item-1',
        'Item Um',
        'Falta a medida do vão',
        { uid: 'seed-designer', name: 'Desenhista Seed', role: 'designer' },
      );

      const itemSnap = await adminDb
        .doc(projectItemPath('seed-project-1', 'seed-item-1'))
        .get();
      expect(itemSnap.data()).toMatchObject({
        status: 'aguardando_informacoes',
        designerId: 'seed-designer',
      });

      await signOut(auth);
      await signInAs('vendedor@seed.jrm');
      const notifications = await listNotifications('seed-project-1');
      expect(notifications).toEqual([
        expect.objectContaining({
          itemId: 'seed-item-1',
          message: 'Falta a medida do vão',
          resolvedAt: null,
        }),
      ]);
    });

    it('rejects an empty message and leaves the item/status untouched', async () => {
      await adminDb
        .doc(projectItemPath('seed-project-1', 'seed-item-1'))
        .update({ status: 'aguardando_desenho', designerId: 'seed-designer' });
      await signInAs('desenhista@seed.jrm');

      await expect(
        requestMoreInformation(
          'seed-project-1',
          'seed-item-1',
          'Item Um',
          '   ',
          {
            uid: 'seed-designer',
            role: 'designer',
          },
        ),
      ).rejects.toThrow('Descreva o que falta para o item avançar.');

      const itemSnap = await adminDb
        .doc(projectItemPath('seed-project-1', 'seed-item-1'))
        .get();
      expect(itemSnap.data()?.status).toBe('aguardando_desenho');

      await signOut(auth);
      await signInAs('vendedor@seed.jrm');
      expect(await listNotifications('seed-project-1')).toEqual([]);
    });
  });
});
