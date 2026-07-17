import {
  collection,
  collectionGroup,
  deleteField,
  doc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { uploadAttachment } from '@/services/projects/attachment.service';
import {
  computeDeadline,
  getDeadlineDefaults,
} from '@/services/projects/deadline.service';
import {
  approveItemForDesign,
  assignDesignerByName,
  claimDesignItem,
  DesignClaimError,
  getDesignQueue,
  submitDesignerVersion,
} from '@/services/projects/designer.service';
import { updateProjectItem } from '@/services/projects/projectItem.service';
import { updateItemStatus } from '@/services/projects/status.service';

jest.mock('firebase/firestore', () => {
  const actual = jest.requireActual('firebase/firestore');
  return {
    ...actual,
    doc: jest.fn(),
    getDocs: jest.fn(),
    collection: jest.fn(),
    collectionGroup: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteField: jest.fn(() => 'DELETE_FIELD_SENTINEL'),
    runTransaction: jest.fn(),
  };
});

jest.mock('@/services/firebase', () => ({ db: {} }));

jest.mock('@/services/projects/attachment.service', () => ({
  uploadAttachment: jest.fn(),
}));

jest.mock('@/services/projects/projectItem.service', () => ({
  updateProjectItem: jest.fn(),
}));

jest.mock('@/services/projects/status.service', () => ({
  updateItemStatus: jest.fn(),
}));

jest.mock('@/services/projects/deadline.service', () => ({
  computeDeadline: jest.fn(),
  getDeadlineDefaults: jest.fn(),
}));

const mockedDoc = doc as jest.Mock;
const mockedGetDocs = getDocs as jest.Mock;
const mockedCollection = collection as jest.Mock;
const mockedCollectionGroup = collectionGroup as jest.Mock;
const mockedQuery = query as jest.Mock;
const mockedWhere = where as jest.Mock;
const mockedSetDoc = setDoc as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedRunTransaction = runTransaction as jest.Mock;
const mockedUploadAttachment = uploadAttachment as jest.Mock;
const mockedUpdateProjectItem = updateProjectItem as jest.Mock;
const mockedUpdateItemStatus = updateItemStatus as jest.Mock;
const mockedComputeDeadline = computeDeadline as jest.Mock;
const mockedGetDeadlineDefaults = getDeadlineDefaults as jest.Mock;

describe('services/projects/designer.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDoc.mockReturnValue({ id: 'new-version-id' });
    mockedCollection.mockReturnValue('collection-ref');
    mockedCollectionGroup.mockReturnValue('collection-group-ref');
    mockedQuery.mockReturnValue('query-ref');
    mockedWhere.mockReturnValue('where-clause');
    mockedSetDoc.mockResolvedValue(undefined);
    mockedUpdateDoc.mockResolvedValue(undefined);
    mockedUpdateProjectItem.mockResolvedValue(undefined);
    mockedUpdateItemStatus.mockResolvedValue(undefined);
  });

  describe('getDesignQueue', () => {
    it('queries the items collection group filtered by queue statuses', async () => {
      mockedGetDocs.mockResolvedValue({
        docs: [{ id: 'i1', data: () => ({ name: 'Cozinha' }) }],
      });

      const result = await getDesignQueue();

      expect(mockedCollectionGroup).toHaveBeenCalledWith({}, 'items');
      expect(mockedWhere).toHaveBeenCalledWith('status', 'in', [
        'aguardando_desenho',
        'alteracao_solicitada',
      ]);
      expect(result).toEqual([{ id: 'i1', name: 'Cozinha' }]);
    });
  });

  describe('approveItemForDesign', () => {
    const actor = { uid: 'seller-1', name: 'Vendedor', role: 'seller' as const };

    it('computes the deadline, sets it on the item and advances status', async () => {
      mockedGetDeadlineDefaults.mockResolvedValue({ desenhoDias: 5 });
      const deadline = Timestamp.fromDate(new Date('2026-02-01T00:00:00Z'));
      mockedComputeDeadline.mockReturnValue(deadline);

      await approveItemForDesign('p1', 'i1', actor);

      expect(mockedComputeDeadline).toHaveBeenCalledWith(
        'aguardando_desenho',
        { desenhoDias: 5 },
      );
      expect(mockedUpdateProjectItem).toHaveBeenCalledWith(
        'p1',
        'i1',
        { deadlineCurrent: deadline },
        'seller-1',
        { recalculateSummary: false },
      );
      expect(mockedUpdateItemStatus).toHaveBeenCalledWith(
        'p1',
        'i1',
        'aguardando_desenho',
        actor,
      );
    });

    it('skips setting the deadline when the defaults do not resolve one', async () => {
      mockedGetDeadlineDefaults.mockResolvedValue({});
      mockedComputeDeadline.mockReturnValue(undefined);

      await approveItemForDesign('p1', 'i1', actor);

      expect(mockedUpdateProjectItem).not.toHaveBeenCalled();
      expect(mockedUpdateItemStatus).toHaveBeenCalledWith(
        'p1',
        'i1',
        'aguardando_desenho',
        actor,
      );
    });
  });

  describe('claimDesignItem', () => {
    function fakeTransaction(itemData: Record<string, unknown> | undefined) {
      return {
        get: jest.fn().mockResolvedValue({
          exists: () => !!itemData,
          data: () => itemData,
        }),
        update: jest.fn(),
      };
    }

    it('claims an unassigned item, writing designerId/designerName', async () => {
      const transaction = fakeTransaction({ status: 'aguardando_desenho' });
      mockedRunTransaction.mockImplementation(async (_db, updateFn) =>
        updateFn(transaction),
      );

      await claimDesignItem('p1', 'i1', {
        uid: 'designer-1',
        name: 'Desenhista Um',
      });

      expect(transaction.update).toHaveBeenCalledWith(
        { id: 'new-version-id' },
        expect.objectContaining({
          designerId: 'designer-1',
          designerName: 'Desenhista Um',
        }),
      );
    });

    it('rejects claiming an item that already has a designer', async () => {
      const transaction = fakeTransaction({
        status: 'aguardando_desenho',
        designerId: 'other-designer',
      });
      mockedRunTransaction.mockImplementation(async (_db, updateFn) =>
        updateFn(transaction),
      );

      await expect(
        claimDesignItem('p1', 'i1', { uid: 'designer-1' }),
      ).rejects.toThrow(DesignClaimError);
      expect(transaction.update).not.toHaveBeenCalled();
    });

    it('rejects claiming a missing item', async () => {
      const transaction = fakeTransaction(undefined);
      mockedRunTransaction.mockImplementation(async (_db, updateFn) =>
        updateFn(transaction),
      );

      await expect(
        claimDesignItem('p1', 'missing', { uid: 'designer-1' }),
      ).rejects.toThrow(DesignClaimError);
    });
  });

  describe('assignDesignerByName', () => {
    const activeDesigners = [
      { id: 'designer-1', name: 'Renato' },
      { id: 'designer-2', name: 'Marcio' },
    ];

    it('matches an active designer by name (case-insensitive) and sets designerId', async () => {
      await assignDesignerByName('p1', 'i1', ' renato ', activeDesigners, {
        uid: 'admin-1',
      });

      expect(mockedUpdateDoc).toHaveBeenCalledWith(
        { id: 'new-version-id' },
        expect.objectContaining({
          designerName: 'Renato',
          designerId: 'designer-1',
        }),
      );
    });

    it('keeps only the name and clears designerId when there is no match', async () => {
      await assignDesignerByName('p1', 'i1', 'Fulano Externo', activeDesigners, {
        uid: 'admin-1',
      });

      expect(mockedUpdateDoc).toHaveBeenCalledWith(
        { id: 'new-version-id' },
        expect.objectContaining({
          designerName: 'Fulano Externo',
          designerId: 'DELETE_FIELD_SENTINEL',
        }),
      );
      expect(deleteField).toHaveBeenCalled();
    });

    it('rejects an empty name without writing', async () => {
      await expect(
        assignDesignerByName('p1', 'i1', '   ', activeDesigners, {
          uid: 'admin-1',
        }),
      ).rejects.toThrow('Informe o nome do desenhista.');
      expect(mockedUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('submitDesignerVersion', () => {
    const actor = { uid: 'designer-1', role: 'designer' as const };

    it('numbers the first version as 1 when there are no previous versions', async () => {
      mockedGetDocs.mockResolvedValue({ docs: [] });

      const id = await submitDesignerVersion('p1', 'i1', [], undefined, actor);

      expect(id).toBe('new-version-id');
      expect(mockedSetDoc).toHaveBeenCalledWith(
        { id: 'new-version-id' },
        expect.objectContaining({ versionNumber: 1, attachmentIds: [] }),
      );
    });

    it('increments the version number based on existing versions', async () => {
      mockedGetDocs.mockResolvedValue({
        docs: [
          { data: () => ({ versionNumber: 1 }) },
          { data: () => ({ versionNumber: 2 }) },
        ],
      });

      await submitDesignerVersion('p1', 'i1', [], undefined, actor);

      expect(mockedSetDoc).toHaveBeenCalledWith(
        { id: 'new-version-id' },
        expect.objectContaining({ versionNumber: 3 }),
      );
    });

    it('uploads each file tagged with the version category', async () => {
      mockedGetDocs.mockResolvedValue({ docs: [] });
      mockedUploadAttachment.mockResolvedValueOnce({ id: 'att-1' });
      mockedUploadAttachment.mockResolvedValueOnce({ id: 'att-2' });
      const files = [new File(['a'], 'a.png'), new File(['b'], 'b.png')];

      await submitDesignerVersion('p1', 'i1', files, 'nova versao', actor);

      expect(mockedUploadAttachment).toHaveBeenCalledTimes(2);
      expect(mockedUploadAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'versao-1' }),
      );
      expect(mockedSetDoc).toHaveBeenCalledWith(
        { id: 'new-version-id' },
        expect.objectContaining({
          attachmentIds: ['att-1', 'att-2'],
          description: 'nova versao',
        }),
      );
    });

    it('sets currentVersionId and advances status to aguardando_orcamento', async () => {
      mockedGetDocs.mockResolvedValue({ docs: [] });

      await submitDesignerVersion('p1', 'i1', [], undefined, actor);

      expect(mockedUpdateProjectItem).toHaveBeenCalledWith(
        'p1',
        'i1',
        { currentVersionId: 'new-version-id' },
        'designer-1',
        { recalculateSummary: false },
      );
      expect(mockedUpdateItemStatus).toHaveBeenCalledWith(
        'p1',
        'i1',
        'aguardando_orcamento',
        actor,
      );
    });
  });
});
