import { doc, setDoc } from 'firebase/firestore';

import { saveDeadlineDefaults } from '@/services/projects/deadlineAdmin';

jest.mock('firebase/firestore', () => {
  const actual = jest.requireActual('firebase/firestore');
  return { ...actual, doc: jest.fn(), setDoc: jest.fn() };
});

jest.mock('@/services/firebase', () => ({ db: {} }));

const mockedDoc = doc as jest.Mock;
const mockedSetDoc = setDoc as jest.Mock;

describe('services/projects/deadlineAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDoc.mockReturnValue('doc-ref');
    mockedSetDoc.mockResolvedValue(undefined);
  });

  it('saves the defaults stamped with updatedAt/updatedBy', async () => {
    await saveDeadlineDefaults(
      {
        desenhoDias: 3,
        aprovacaoClienteDias: 2,
        separacaoMateriaisDias: 1,
        producaoDias: 7,
        transporteDias: 2,
        montagemDias: 1,
      },
      'admin-1',
    );

    expect(mockedSetDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ desenhoDias: 3, updatedBy: 'admin-1' }),
    );
  });
});
