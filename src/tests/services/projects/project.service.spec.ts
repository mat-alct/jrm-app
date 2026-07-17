import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import {
  createProject,
  getProject,
  listProjects,
  updateProject,
} from '@/services/projects/project.service';

jest.mock('firebase/firestore', () => {
  const actual = jest.requireActual('firebase/firestore');
  return {
    ...actual,
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
  };
});

jest.mock('@/services/firebase', () => ({ db: {} }));

const mockedDoc = doc as jest.Mock;
const mockedGetDoc = getDoc as jest.Mock;
const mockedGetDocs = getDocs as jest.Mock;
const mockedCollection = collection as jest.Mock;
const mockedQuery = query as jest.Mock;
const mockedWhere = where as jest.Mock;
const mockedOrderBy = orderBy as jest.Mock;
const mockedSetDoc = setDoc as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;

describe('services/projects/project.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDoc.mockReturnValue({ id: 'new-project-id' });
    mockedCollection.mockReturnValue('collection-ref');
    mockedQuery.mockReturnValue('query-ref');
    mockedWhere.mockReturnValue('where-clause');
    mockedOrderBy.mockReturnValue('order-clause');
    mockedSetDoc.mockResolvedValue(undefined);
    mockedUpdateDoc.mockResolvedValue(undefined);
  });

  describe('createProject', () => {
    const validInput = {
      customerName: 'Fulano',
      customerPhone: '82999999999',
      customerEmail: 'fulano@example.com',
      customerAddress: 'Rua Um, 123',
    };
    const actor = { uid: 'admin-1' };

    it('rejects missing required fields', async () => {
      await expect(
        createProject({ ...validInput, customerName: '' }, actor),
      ).rejects.toThrow();
      expect(mockedSetDoc).not.toHaveBeenCalled();

      await expect(
        createProject({ ...validInput, customerPhone: '' }, actor),
      ).rejects.toThrow();
      expect(mockedSetDoc).not.toHaveBeenCalled();
    });

    it('creates a project with only name and phone, omitting email/address', async () => {
      await createProject(
        { customerName: 'Fulano', customerPhone: '82999999999' },
        actor,
      );

      const [, payload] = mockedSetDoc.mock.calls[0];
      expect(payload).not.toHaveProperty('customerEmail');
      expect(payload).not.toHaveProperty('customerAddress');
    });

    it('creates the project deriving seller from the actor', async () => {
      const id = await createProject(validInput, actor);

      expect(id).toBe('new-project-id');
      expect(mockedSetDoc).toHaveBeenCalledWith(
        { id: 'new-project-id' },
        expect.objectContaining({
          customerName: 'Fulano',
          sellerId: 'admin-1',
          clientAccessCodeHash: '',
          clientAccessPublicId: '',
          totalCustomerValue: 0,
          itemSummary: expect.objectContaining({ total: 0 }),
          createdBy: 'admin-1',
          updatedBy: 'admin-1',
        }),
      );
    });

    it('omits sellerName when the actor has no name', async () => {
      await createProject(validInput, actor);

      const [, payload] = mockedSetDoc.mock.calls[0];
      expect(payload).not.toHaveProperty('sellerName');
    });

    it('sets sellerName from the actor name when provided', async () => {
      await createProject(validInput, {
        uid: 'admin-1',
        name: 'Fulano Vendedor',
      });

      const [, payload] = mockedSetDoc.mock.calls[0];
      expect(payload).toHaveProperty('sellerName', 'Fulano Vendedor');
    });
  });

  describe('updateProject', () => {
    it('updates fields and stamps updatedAt/updatedBy', async () => {
      await updateProject('p1', { customerName: 'Novo nome' }, 'admin-1');

      expect(mockedUpdateDoc).toHaveBeenCalledWith(
        { id: 'new-project-id' },
        expect.objectContaining({
          customerName: 'Novo nome',
          updatedBy: 'admin-1',
        }),
      );
    });
  });

  describe('getProject', () => {
    it('returns null when the project does not exist', async () => {
      mockedGetDoc.mockResolvedValue({ exists: () => false });

      const result = await getProject('missing');

      expect(result).toBeNull();
    });

    it('returns the project with id when it exists', async () => {
      mockedGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'p1',
        data: () => ({ customerName: 'Fulano' }),
      });

      const result = await getProject('p1');

      expect(result).toEqual({ id: 'p1', customerName: 'Fulano' });
    });
  });

  describe('listProjects', () => {
    it('applies sellerId filter and client-side search', async () => {
      mockedGetDocs.mockResolvedValue({
        docs: [
          { id: 'p1', data: () => ({ customerName: 'Fulano Souza' }) },
          { id: 'p2', data: () => ({ customerName: 'Beltrano Silva' }) },
        ],
      });

      const result = await listProjects({ sellerId: 's1', search: 'fulano' });

      expect(mockedWhere).toHaveBeenCalledWith('sellerId', '==', 's1');
      expect(result).toEqual([{ id: 'p1', customerName: 'Fulano Souza' }]);
    });
  });
});
