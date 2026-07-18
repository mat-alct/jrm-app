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

import {
  createNotification,
  listNotifications,
  requestMoreInformation,
  resolveNotification,
  resolveNotificationsForItem,
} from '@/services/projects/notification.service';
import { updateItemStatus } from '@/services/projects/status.service';

jest.mock('firebase/firestore', () => {
  const actual = jest.requireActual('firebase/firestore');
  return {
    ...actual,
    doc: jest.fn(),
    getDocs: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
  };
});

jest.mock('@/services/firebase', () => ({ db: {} }));

jest.mock('@/services/projects/status.service', () => ({
  updateItemStatus: jest.fn(),
}));

const mockedDoc = doc as jest.Mock;
const mockedGetDocs = getDocs as jest.Mock;
const mockedCollection = collection as jest.Mock;
const mockedQuery = query as jest.Mock;
const mockedWhere = where as jest.Mock;
const mockedSetDoc = setDoc as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedUpdateItemStatus = updateItemStatus as jest.Mock;

describe('services/projects/notification.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDoc.mockReturnValue({ id: 'new-notification-id' });
    mockedCollection.mockReturnValue('collection-ref');
    mockedQuery.mockReturnValue('query-ref');
    mockedWhere.mockReturnValue('where-clause');
    mockedSetDoc.mockResolvedValue(undefined);
    mockedUpdateDoc.mockResolvedValue(undefined);
    mockedUpdateItemStatus.mockResolvedValue(undefined);
  });

  describe('createNotification', () => {
    it('writes a notification with resolvedAt explicitly set to null', async () => {
      const id = await createNotification(
        'p1',
        'i1',
        'Cozinha',
        'Falta a medida do vão',
        { uid: 'designer-1', name: 'Desenhista Um', role: 'designer' },
      );

      expect(id).toBe('new-notification-id');
      expect(mockedSetDoc).toHaveBeenCalledWith(
        { id: 'new-notification-id' },
        expect.objectContaining({
          id: 'new-notification-id',
          projectId: 'p1',
          itemId: 'i1',
          itemName: 'Cozinha',
          type: 'info_solicitada',
          message: 'Falta a medida do vão',
          createdBy: 'designer-1',
          createdByName: 'Desenhista Um',
          createdByRole: 'designer',
          resolvedAt: null,
        }),
      );
    });

    it('omits createdByName when the actor has no name', async () => {
      await createNotification('p1', 'i1', 'Cozinha', 'msg', {
        uid: 'designer-1',
        role: 'designer',
      });

      const written = mockedSetDoc.mock.calls[0][1];
      expect(written).not.toHaveProperty('createdByName');
    });
  });

  describe('listNotifications', () => {
    it('maps the collection snapshot to notifications', async () => {
      mockedGetDocs.mockResolvedValue({
        docs: [{ data: () => ({ id: 'n1', message: 'msg' }) }],
      });

      const result = await listNotifications('p1');

      expect(result).toEqual([{ id: 'n1', message: 'msg' }]);
    });
  });

  describe('resolveNotification', () => {
    it('sets resolvedAt on the given notification', async () => {
      await resolveNotification('p1', 'n1');

      expect(mockedUpdateDoc).toHaveBeenCalledWith(
        { id: 'new-notification-id' },
        expect.objectContaining({ resolvedAt: expect.any(Timestamp) }),
      );
    });
  });

  describe('resolveNotificationsForItem', () => {
    it('resolves every unresolved notification for the item', async () => {
      const doc1 = { ref: 'ref-1' };
      const doc2 = { ref: 'ref-2' };
      mockedGetDocs.mockResolvedValue({ docs: [doc1, doc2] });

      await resolveNotificationsForItem('p1', 'i1');

      expect(mockedWhere).toHaveBeenCalledWith('itemId', '==', 'i1');
      expect(mockedWhere).toHaveBeenCalledWith('resolvedAt', '==', null);
      expect(mockedUpdateDoc).toHaveBeenCalledWith(
        'ref-1',
        expect.objectContaining({ resolvedAt: expect.any(Timestamp) }),
      );
      expect(mockedUpdateDoc).toHaveBeenCalledWith(
        'ref-2',
        expect.objectContaining({ resolvedAt: expect.any(Timestamp) }),
      );
    });

    it('does nothing when there are no unresolved notifications', async () => {
      mockedGetDocs.mockResolvedValue({ docs: [] });

      await resolveNotificationsForItem('p1', 'i1');

      expect(mockedUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('requestMoreInformation', () => {
    const actor = {
      uid: 'designer-1',
      name: 'Desenhista Um',
      role: 'designer' as const,
    };

    it('moves the item to aguardando_informacoes and creates a notification', async () => {
      await requestMoreInformation(
        'p1',
        'i1',
        'Cozinha',
        ' Falta a medida do vão ',
        actor,
      );

      expect(mockedUpdateItemStatus).toHaveBeenCalledWith(
        'p1',
        'i1',
        'aguardando_informacoes',
        actor,
        'Falta a medida do vão',
      );
      expect(mockedSetDoc).toHaveBeenCalledWith(
        { id: 'new-notification-id' },
        expect.objectContaining({ message: 'Falta a medida do vão' }),
      );
    });

    it('rejects an empty message without touching status or creating a notification', async () => {
      await expect(
        requestMoreInformation('p1', 'i1', 'Cozinha', '   ', actor),
      ).rejects.toThrow('Descreva o que falta para o item avançar.');

      expect(mockedUpdateItemStatus).not.toHaveBeenCalled();
      expect(mockedSetDoc).not.toHaveBeenCalled();
    });

    it('rejects actors outside designer/admin before changing the item', async () => {
      await expect(
        requestMoreInformation('p1', 'i1', 'Cozinha', 'Falta uma medida', {
          uid: 'seller-1',
          role: 'seller',
        }),
      ).rejects.toThrow('Apenas desenhistas ou administradores');

      expect(mockedUpdateItemStatus).not.toHaveBeenCalled();
      expect(mockedSetDoc).not.toHaveBeenCalled();
    });
  });
});
