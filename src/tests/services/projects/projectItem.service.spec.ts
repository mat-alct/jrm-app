import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import {
  createProjectItem,
  getProjectItem,
  listItemStatusHistory,
  listProjectItems,
  updateProjectItem,
} from '@/services/projects/projectItem.service';
import { recalculateProjectSummary } from '@/services/projects/summary';

jest.mock('firebase/firestore', () => {
  const actual = jest.requireActual('firebase/firestore');
  return {
    ...actual,
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    orderBy: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
  };
});

jest.mock('@/services/firebase', () => ({ db: {} }));

jest.mock('@/services/projects/summary', () => ({
  recalculateProjectSummary: jest.fn(),
}));

const mockedDoc = doc as jest.Mock;
const mockedGetDoc = getDoc as jest.Mock;
const mockedGetDocs = getDocs as jest.Mock;
const mockedCollection = collection as jest.Mock;
const mockedQuery = query as jest.Mock;
const mockedOrderBy = orderBy as jest.Mock;
const mockedSetDoc = setDoc as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedRecalculate = recalculateProjectSummary as jest.Mock;

describe('services/projects/projectItem.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDoc.mockReturnValue({ id: 'new-item-id' });
    mockedCollection.mockReturnValue('collection-ref');
    mockedQuery.mockReturnValue('query-ref');
    mockedOrderBy.mockReturnValue('order-clause');
    mockedSetDoc.mockResolvedValue(undefined);
    mockedUpdateDoc.mockResolvedValue(undefined);
    mockedRecalculate.mockResolvedValue(undefined);
  });

  describe('createProjectItem', () => {
    const validInput = {
      name: 'Cozinha',
      environment: 'Cozinha',
    };

    it('rejects missing name/environment', async () => {
      await expect(
        createProjectItem('p1', { ...validInput, name: '' }, 'admin-1'),
      ).rejects.toThrow();
      expect(mockedSetDoc).not.toHaveBeenCalled();
    });

    it('creates the item with initial status and recalculates the summary', async () => {
      const id = await createProjectItem('p1', validInput, 'admin-1');

      expect(id).toBe('new-item-id');
      expect(mockedSetDoc).toHaveBeenCalledWith(
        { id: 'new-item-id' },
        expect.objectContaining({
          projectId: 'p1',
          status: 'projeto_criado',
          clientApprovalStatus: 'aguardando',
          createdBy: 'admin-1',
        }),
      );
      expect(mockedRecalculate).toHaveBeenCalledWith('p1');
    });
  });

  describe('updateProjectItem', () => {
    it('updates fields and recalculates the summary', async () => {
      await updateProjectItem('p1', 'i1', { material: 'MDF' }, 'admin-1');

      expect(mockedUpdateDoc).toHaveBeenCalledWith(
        { id: 'new-item-id' },
        expect.objectContaining({ material: 'MDF', updatedBy: 'admin-1' }),
      );
      expect(mockedRecalculate).toHaveBeenCalledWith('p1');
    });
  });

  describe('getProjectItem', () => {
    it('returns null when the item does not exist', async () => {
      mockedGetDoc.mockResolvedValue({ exists: () => false });

      const result = await getProjectItem('p1', 'missing');

      expect(result).toBeNull();
    });
  });

  describe('listProjectItems', () => {
    it('maps documents with id', async () => {
      mockedGetDocs.mockResolvedValue({
        docs: [{ id: 'i1', data: () => ({ name: 'Cozinha' }) }],
      });

      const result = await listProjectItems('p1');

      expect(result).toEqual([{ id: 'i1', name: 'Cozinha' }]);
    });
  });

  describe('listItemStatusHistory', () => {
    it('maps history documents with id', async () => {
      mockedGetDocs.mockResolvedValue({
        docs: [{ id: 'h1', data: () => ({ toStatus: 'aprovado' }) }],
      });

      const result = await listItemStatusHistory('p1', 'i1');

      expect(result).toEqual([{ id: 'h1', toStatus: 'aprovado' }]);
    });
  });
});
