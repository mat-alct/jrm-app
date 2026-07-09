import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

import {
  aggregatePendingByAssembler,
  canConfirmAssemblerPayment,
  canCreateAssemblerPayment,
  confirmAssemblerPayment,
  createAssemblerPayment,
} from '@/services/projects/payment.service';
import { AssemblerAssignment } from '@/types/projects';

jest.mock('uuid', () => ({
  v4: jest
    .fn()
    .mockReturnValueOnce('payment-1')
    .mockReturnValueOnce('proof-1'),
}));

jest.mock('firebase/firestore', () => {
  const actual = jest.requireActual('firebase/firestore');
  return {
    ...actual,
    collection: jest.fn(),
    collectionGroup: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    where: jest.fn(),
  };
});

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
}));

jest.mock('@/services/firebase', () => ({ db: {}, storage: {} }));

const mockedDoc = doc as jest.Mock;
const mockedGetDoc = getDoc as jest.Mock;
const mockedGetDocs = getDocs as jest.Mock;
const mockedSetDoc = setDoc as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedRef = ref as jest.Mock;
const mockedUploadBytes = uploadBytes as jest.Mock;

describe('services/projects/payment.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDoc.mockImplementation((_, path?: string) =>
      path ? path : { id: 'generated-id' },
    );
    mockedRef.mockImplementation((_, path: string) => `storage:${path}`);
    mockedSetDoc.mockResolvedValue(undefined);
    mockedUpdateDoc.mockResolvedValue(undefined);
    mockedUploadBytes.mockResolvedValue(undefined);
  });

  it('aggregates pending assignments by assembler', () => {
    const assignments = [
      {
        id: 'a1',
        assemblerId: 'assembler-1',
        assemblerName: 'Montador 1',
        amountToReceive: 100,
        paymentStatus: 'pendente',
      },
      {
        id: 'a2',
        assemblerId: 'assembler-1',
        assemblerName: 'Montador 1',
        amountToReceive: 250,
        paymentStatus: 'pendente',
      },
      {
        id: 'a3',
        assemblerId: 'assembler-2',
        amountToReceive: 500,
        paymentStatus: 'pago',
      },
    ] as AssemblerAssignment[];

    expect(aggregatePendingByAssembler(assignments)).toEqual([
      {
        assemblerId: 'assembler-1',
        assemblerName: 'Montador 1',
        total: 350,
        assignments: [assignments[0], assignments[1]],
      },
    ]);
  });

  it('enforces the payment state machine', () => {
    expect(canCreateAssemblerPayment('pendente', true)).toBe(true);
    expect(canCreateAssemblerPayment('nao_liberado', true)).toBe(false);
    expect(canCreateAssemblerPayment('pendente', false)).toBe(false);
    expect(
      canConfirmAssemblerPayment(
        { assemblerId: 'assembler-1', status: 'pago' },
        'assembler-1',
      ),
    ).toBe(true);
    expect(
      canConfirmAssemblerPayment(
        { assemblerId: 'assembler-1', status: 'confirmado_pelo_montador' },
        'assembler-1',
      ),
    ).toBe(false);
    expect(
      canConfirmAssemblerPayment(
        { assemblerId: 'assembler-1', status: 'pago' },
        'assembler-2',
      ),
    ).toBe(false);
  });

  it('creates a payment, uploads proof and marks assignment as paid', async () => {
    mockedGetDoc.mockResolvedValue({
      id: 'assembler-1',
      exists: () => true,
      data: () => ({
        assemblerId: 'assembler-1',
        assemblerName: 'Montador 1',
        amountToReceive: 700,
        paymentStatus: 'pendente',
      }),
    });

    const proof = new File(['proof'], 'comprovante.pdf', {
      type: 'application/pdf',
    });

    await expect(
      createAssemblerPayment(
        {
          projectId: 'project-1',
          itemId: 'item-1',
          assignmentId: 'assembler-1',
          proofFile: proof,
          paidBy: 'admin-1',
        },
        { id: 'admin-1', roles: ['admin'] },
      ),
    ).resolves.toMatchObject({
      id: 'payment-1',
      amount: 700,
      status: 'pago',
      proofStoragePath: 'payments/payment-1/proof-1_comprovante.pdf',
    });

    expect(mockedUploadBytes).toHaveBeenCalledWith(
      'storage:payments/payment-1/proof-1_comprovante.pdf',
      proof,
      { contentType: 'application/pdf' },
    );
    expect(mockedSetDoc).toHaveBeenCalledWith(
      'payments/payment-1',
      expect.objectContaining({ status: 'pago', amount: 700 }),
    );
    expect(mockedUpdateDoc).toHaveBeenCalledWith(
      'projects/project-1/items/item-1/assemblerAssignments/assembler-1',
      expect.objectContaining({
        paymentStatus: 'pago',
        paidBy: 'admin-1',
        paymentId: 'payment-1',
      }),
    );
  });

  it('confirms payment only by the owner assembler', async () => {
    const now = Timestamp.now();
    mockedGetDoc.mockResolvedValue({
      id: 'payment-1',
      exists: () => true,
      data: () => ({
        projectId: 'project-1',
        itemId: 'item-1',
        assignmentId: 'assembler-1',
        assemblerId: 'assembler-1',
        amount: 700,
        status: 'pago',
        paidAt: now,
        paidBy: 'admin-1',
        createdAt: now,
        updatedAt: now,
      }),
    });

    await confirmAssemblerPayment('payment-1', {
      id: 'assembler-1',
      roles: ['assembler'],
    });

    expect(mockedUpdateDoc).toHaveBeenCalledWith(
      'payments/payment-1',
      expect.objectContaining({ status: 'confirmado_pelo_montador' }),
    );
    expect(mockedUpdateDoc).toHaveBeenCalledWith(
      'projects/project-1/items/item-1/assemblerAssignments/assembler-1',
      expect.objectContaining({
        paymentStatus: 'confirmado_pelo_montador',
      }),
    );
  });

  it('finalizes the item once every assignment is paid', async () => {
    const now = Timestamp.now();
    mockedGetDoc
      .mockResolvedValueOnce({
        id: 'payment-1',
        exists: () => true,
        data: () => ({
          projectId: 'project-1',
          itemId: 'item-1',
          assignmentId: 'assembler-1',
          assemblerId: 'assembler-1',
          amount: 700,
          status: 'pago',
          paidAt: now,
          paidBy: 'admin-1',
          createdAt: now,
          updatedAt: now,
        }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'aguardando_pagamento_montador' }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'aguardando_pagamento_montador' }),
      });
    mockedGetDocs
      .mockResolvedValueOnce({
        docs: [
          { data: () => ({ paymentStatus: 'confirmado_pelo_montador' }) },
          { data: () => ({ paymentStatus: 'pago' }) },
        ],
      })
      .mockResolvedValue({ empty: true, docs: [] });

    await confirmAssemblerPayment('payment-1', {
      id: 'assembler-1',
      roles: ['assembler'],
    });

    expect(mockedUpdateDoc).toHaveBeenCalledWith(
      'projects/project-1/items/item-1',
      expect.objectContaining({ status: 'finalizado' }),
    );
  });

  it('does not finalize the item while some assignment is unpaid', async () => {
    const now = Timestamp.now();
    mockedGetDoc
      .mockResolvedValueOnce({
        id: 'payment-1',
        exists: () => true,
        data: () => ({
          projectId: 'project-1',
          itemId: 'item-1',
          assignmentId: 'assembler-1',
          assemblerId: 'assembler-1',
          amount: 700,
          status: 'pago',
          paidAt: now,
          paidBy: 'admin-1',
          createdAt: now,
          updatedAt: now,
        }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'aguardando_pagamento_montador' }),
      });
    mockedGetDocs.mockResolvedValueOnce({
      docs: [
        { data: () => ({ paymentStatus: 'confirmado_pelo_montador' }) },
        { data: () => ({ paymentStatus: 'pendente' }) },
      ],
    });

    await confirmAssemblerPayment('payment-1', {
      id: 'assembler-1',
      roles: ['assembler'],
    });

    expect(mockedUpdateDoc).not.toHaveBeenCalledWith(
      'projects/project-1/items/item-1',
      expect.objectContaining({ status: 'finalizado' }),
    );
  });
});
