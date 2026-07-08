import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

import {
  assignAssemblers,
  canAssemblerTransition,
  getAssemblerAssignments,
  mapAddressLink,
  mapTelLink,
  sortAssignmentsByDueDate,
  updateAssignment,
} from '@/services/projects/assembler.service';
import { AssemblerAssignment } from '@/types/projects';

jest.mock('firebase/firestore', () => {
  const actual = jest.requireActual('firebase/firestore');
  return {
    ...actual,
    collection: jest.fn(),
    collectionGroup: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    orderBy: jest.fn(),
    query: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    where: jest.fn(),
  };
});

jest.mock('@/services/firebase', () => ({ db: {} }));

const mockedDoc = doc as jest.Mock;
const mockedGetDoc = getDoc as jest.Mock;
const mockedGetDocs = getDocs as jest.Mock;
const mockedSetDoc = setDoc as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;

describe('services/projects/assembler.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDoc.mockImplementation((_, path: string) => path);
    mockedSetDoc.mockResolvedValue(undefined);
    mockedUpdateDoc.mockResolvedValue(undefined);
  });

  it('allows only forward assembler transitions and blocks finalizado', () => {
    expect(
      canAssemblerTransition('aguardando_separacao_materiais', 'em_producao'),
    ).toBe(true);
    expect(canAssemblerTransition('em_montagem', 'montagem_concluida')).toBe(
      true,
    );
    expect(canAssemblerTransition('em_producao', 'aguardando_separacao_materiais')).toBe(
      false,
    );
    expect(canAssemblerTransition('montagem_concluida', 'finalizado')).toBe(
      false,
    );
  });

  it('sorts assignments by due date and builds contact links', () => {
    const late = {
      id: 'late',
      dueAt: Timestamp.fromDate(new Date('2026-01-01T12:00:00Z')),
    } as AssemblerAssignment;
    const soon = {
      id: 'soon',
      dueAt: Timestamp.fromDate(new Date('2025-12-01T12:00:00Z')),
    } as AssemblerAssignment;
    const noDate = { id: 'no-date' } as AssemblerAssignment;

    expect(sortAssignmentsByDueDate([noDate, late, soon]).map(item => item.id)).toEqual([
      'soon',
      'late',
      'no-date',
    ]);
    expect(mapTelLink('(11) 99999-8888')).toBe('tel:11999998888');
    expect(mapAddressLink('Rua Teste, 123')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Rua%20Teste%2C%20123',
    );
  });

  it('creates assignments with nao_liberado and denormalized job data', async () => {
    mockedGetDoc
      .mockResolvedValueOnce({
        id: 'project-1',
        exists: () => true,
        data: () => ({
          customerName: 'Cliente Teste',
          customerPhone: '11999999999',
          customerAddress: 'Rua Teste, 123',
        }),
      })
      .mockResolvedValueOnce({
        id: 'item-1',
        exists: () => true,
        data: () => ({
          name: 'Armario',
          environment: 'Quarto',
          status: 'aguardando_separacao_materiais',
          deadlineCurrent: Timestamp.fromDate(new Date('2026-02-01T12:00:00Z')),
        }),
      });

    const result = await assignAssemblers(
      'project-1',
      'item-1',
      [
        {
          assemblerId: 'assembler-1',
          assemblerName: 'Montador 1',
          amountToReceive: 500,
        },
      ],
      { id: 'admin-1', roles: ['admin'] },
    );

    expect(result).toHaveLength(1);
    expect(mockedSetDoc).toHaveBeenCalledWith(
      'projects/project-1/items/item-1/assemblerAssignments/assembler-1',
      expect.objectContaining({
        assemblerId: 'assembler-1',
        customerName: 'Cliente Teste',
        itemName: 'Armario',
        amountToReceive: 500,
        paymentStatus: 'nao_liberado',
        assignedBy: 'admin-1',
      }),
    );
  });

  it('lists assignments without dueAt (regression: no orderBy on the query)', async () => {
    mockedGetDocs.mockResolvedValueOnce({
      docs: [
        { id: 'no-date', data: () => ({ assemblerId: 'assembler-1' }) },
        {
          id: 'with-date',
          data: () => ({
            assemblerId: 'assembler-1',
            dueAt: Timestamp.fromDate(new Date('2026-01-01T12:00:00Z')),
          }),
        },
      ],
    });

    const result = await getAssemblerAssignments('assembler-1');

    expect(result.map(item => item.id)).toEqual(['with-date', 'no-date']);
  });

  it('rejects non-admin assignment updates before writing', async () => {
    await expect(
      updateAssignment(
        'project-1',
        'item-1',
        'assignment-1',
        { amountToReceive: 600 },
        { roles: ['assembler'] },
      ),
    ).rejects.toThrow('Apenas administradores');

    expect(mockedUpdateDoc).not.toHaveBeenCalled();
  });
});
