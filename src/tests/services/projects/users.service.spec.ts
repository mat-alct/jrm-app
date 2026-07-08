import { doc, getDoc } from 'firebase/firestore';

import { getAppUser } from '@/services/projects/users.service';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock('@/services/firebase', () => ({ db: {} }));

const mockedDoc = doc as jest.Mock;
const mockedGetDoc = getDoc as jest.Mock;

describe('services/projects/users.service', () => {
  beforeEach(() => {
    mockedDoc.mockReset();
    mockedGetDoc.mockReset();
    mockedDoc.mockReturnValue('doc-ref');
  });

  it('returns null when the user document does not exist', async () => {
    mockedGetDoc.mockResolvedValue({ exists: () => false });

    const result = await getAppUser('u1');

    expect(result).toBeNull();
  });

  it('returns the user with its id when the document exists', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'u1',
      data: () => ({ name: 'Mateus', roles: ['admin'], active: true }),
    });

    const result = await getAppUser('u1');

    expect(result).toEqual({
      id: 'u1',
      name: 'Mateus',
      roles: ['admin'],
      active: true,
    });
  });
});
