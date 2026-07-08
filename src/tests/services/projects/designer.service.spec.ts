import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';

import { uploadAttachment } from '@/services/projects/attachment.service';
import {
  getDesignerQueue,
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

const mockedDoc = doc as jest.Mock;
const mockedGetDocs = getDocs as jest.Mock;
const mockedCollection = collection as jest.Mock;
const mockedCollectionGroup = collectionGroup as jest.Mock;
const mockedQuery = query as jest.Mock;
const mockedWhere = where as jest.Mock;
const mockedSetDoc = setDoc as jest.Mock;
const mockedUploadAttachment = uploadAttachment as jest.Mock;
const mockedUpdateProjectItem = updateProjectItem as jest.Mock;
const mockedUpdateItemStatus = updateItemStatus as jest.Mock;

describe('services/projects/designer.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDoc.mockReturnValue({ id: 'new-version-id' });
    mockedCollection.mockReturnValue('collection-ref');
    mockedCollectionGroup.mockReturnValue('collection-group-ref');
    mockedQuery.mockReturnValue('query-ref');
    mockedWhere.mockReturnValue('where-clause');
    mockedSetDoc.mockResolvedValue(undefined);
    mockedUpdateProjectItem.mockResolvedValue(undefined);
    mockedUpdateItemStatus.mockResolvedValue(undefined);
  });

  describe('getDesignerQueue', () => {
    it('queries the items collection group filtered by designerId', async () => {
      mockedGetDocs.mockResolvedValue({
        docs: [{ id: 'i1', data: () => ({ name: 'Cozinha' }) }],
      });

      const result = await getDesignerQueue('designer-1');

      expect(mockedCollectionGroup).toHaveBeenCalledWith({}, 'items');
      expect(mockedWhere).toHaveBeenCalledWith('designerId', '==', 'designer-1');
      expect(result).toEqual([{ id: 'i1', name: 'Cozinha' }]);
    });
  });

  describe('submitDesignerVersion', () => {
    const actor = { uid: 'designer-1', role: 'designer' as const };

    it('numbers the first version as 1 when there are no previous versions', async () => {
      mockedGetDocs.mockResolvedValue({ docs: [] });

      const id = await submitDesignerVersion(
        'p1',
        'i1',
        [],
        undefined,
        actor,
      );

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
      const files = [
        new File(['a'], 'a.png'),
        new File(['b'], 'b.png'),
      ];

      await submitDesignerVersion('p1', 'i1', files, 'nova versao', actor);

      expect(mockedUploadAttachment).toHaveBeenCalledTimes(2);
      expect(mockedUploadAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'versao-1', visibility: 'client' }),
      );
      expect(mockedSetDoc).toHaveBeenCalledWith(
        { id: 'new-version-id' },
        expect.objectContaining({
          attachmentIds: ['att-1', 'att-2'],
          description: 'nova versao',
        }),
      );
    });

    it('sets currentVersionId and advances status to aguardando_aprovacao_cliente', async () => {
      mockedGetDocs.mockResolvedValue({ docs: [] });

      await submitDesignerVersion('p1', 'i1', [], undefined, actor);

      expect(mockedUpdateProjectItem).toHaveBeenCalledWith(
        'p1',
        'i1',
        { currentVersionId: 'new-version-id' },
        'designer-1',
      );
      expect(mockedUpdateItemStatus).toHaveBeenNthCalledWith(
        1,
        'p1',
        'i1',
        'projeto_desenhado',
        actor,
      );
      expect(mockedUpdateItemStatus).toHaveBeenNthCalledWith(
        2,
        'p1',
        'i1',
        'aguardando_aprovacao_cliente',
        actor,
      );
    });
  });
});
