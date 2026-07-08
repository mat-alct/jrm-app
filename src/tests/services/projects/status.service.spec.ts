import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import {
  InvalidStatusTransitionError,
  updateItemStatus,
} from '@/services/projects/status.service';
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
    where: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    writeBatch: jest.fn(),
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
const mockedSetDoc = setDoc as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedWriteBatch = writeBatch as jest.Mock;
const mockedRecalculate = recalculateProjectSummary as jest.Mock;

describe('services/projects/status.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDoc.mockReturnValue('doc-ref');
    mockedCollection.mockReturnValue('collection-ref');
    mockedUpdateDoc.mockResolvedValue(undefined);
    mockedSetDoc.mockResolvedValue(undefined);
    mockedRecalculate.mockResolvedValue(undefined);
    mockedGetDocs.mockResolvedValue({ empty: true, docs: [] });
  });

  it('rejects an invalid transition without writing anything', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: 'orcamento_criado' }),
    });

    await expect(
      updateItemStatus('p1', 'i1', 'finalizado', {
        uid: 'seller1',
        role: 'seller',
      }),
    ).rejects.toThrow(InvalidStatusTransitionError);

    expect(mockedUpdateDoc).not.toHaveBeenCalled();
    expect(mockedSetDoc).not.toHaveBeenCalled();
  });

  it('applies a valid transition, records history and recalculates the summary', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: 'aguardando_desenho' }),
    });

    await updateItemStatus('p1', 'i1', 'projeto_desenhado', {
      uid: 'designer1',
      role: 'designer',
    });

    expect(mockedUpdateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        status: 'projeto_desenhado',
        updatedBy: 'designer1',
      }),
    );
    expect(mockedSetDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        fromStatus: 'aguardando_desenho',
        toStatus: 'projeto_desenhado',
        changedBy: 'designer1',
        changedByRole: 'designer',
      }),
    );
    expect(mockedRecalculate).toHaveBeenCalledWith('p1');
  });

  it('releases pending assembler assignments when the item reaches montagem_concluida', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: 'em_montagem' }),
    });

    const batchUpdate = jest.fn();
    const batchCommit = jest.fn().mockResolvedValue(undefined);
    mockedWriteBatch.mockReturnValue({
      update: batchUpdate,
      commit: batchCommit,
    });

    mockedGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ ref: 'assignment-ref-1' }, { ref: 'assignment-ref-2' }],
    });

    await updateItemStatus('p1', 'i1', 'montagem_concluida', {
      uid: 'assembler1',
      role: 'assembler',
    });

    expect(batchUpdate).toHaveBeenCalledTimes(2);
    expect(batchUpdate).toHaveBeenCalledWith(
      'assignment-ref-1',
      expect.objectContaining({ paymentStatus: 'pendente' }),
    );
    expect(batchCommit).toHaveBeenCalled();
  });

  it('does not touch assignments when there are none pending', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: 'em_montagem' }),
    });
    mockedGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

    await updateItemStatus('p1', 'i1', 'montagem_concluida', {
      uid: 'assembler1',
      role: 'assembler',
    });

    expect(mockedWriteBatch).not.toHaveBeenCalled();
  });

  it('sets project completedAt and clientLinkExpiresAt when every item becomes final', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: 'montagem_concluida' }),
    });
    mockedGetDocs.mockResolvedValueOnce({
      empty: true,
      docs: [{ data: () => ({ status: 'finalizado' }) }],
    });

    await updateItemStatus('p1', 'i1', 'finalizado', {
      uid: 'admin1',
      role: 'admin',
    });

    expect(mockedUpdateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        completedAt: expect.anything(),
        clientLinkExpiresAt: expect.anything(),
      }),
    );
  });

  it('does not complete the project while some item is not final yet', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: 'montagem_concluida' }),
    });
    mockedGetDocs.mockResolvedValueOnce({
      empty: true,
      docs: [
        { data: () => ({ status: 'finalizado' }) },
        { data: () => ({ status: 'em_producao' }) },
      ],
    });

    await updateItemStatus('p1', 'i1', 'finalizado', {
      uid: 'admin1',
      role: 'admin',
    });

    const projectUpdateCall = mockedUpdateDoc.mock.calls.find(call =>
      Object.prototype.hasOwnProperty.call(call[1], 'clientLinkExpiresAt'),
    );
    expect(projectUpdateCall).toBeUndefined();
  });

  it('lets an admin force an otherwise invalid transition', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: 'orcamento_criado' }),
    });

    await expect(
      updateItemStatus('p1', 'i1', 'cancelado', {
        uid: 'admin1',
        role: 'admin',
      }),
    ).resolves.not.toThrow();

    expect(mockedUpdateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ status: 'cancelado' }),
    );
  });

  it('throws when the item does not exist', async () => {
    mockedGetDoc.mockResolvedValue({ exists: () => false });

    await expect(
      updateItemStatus('p1', 'missing', 'aprovado', {
        uid: 'admin1',
        role: 'admin',
      }),
    ).rejects.toThrow('nao encontrado');
  });
});
