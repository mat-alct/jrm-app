import { doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';

import {
  BudgetServiceError,
  computeBudgetTotals,
  saveItemBudget,
  sendBudgetToClient,
} from '@/services/projects/budget.service';
import { updateItemStatus } from '@/services/projects/status.service';

jest.mock('firebase/firestore', () => {
  const actual = jest.requireActual('firebase/firestore');
  return {
    ...actual,
    doc: jest.fn(),
    getDoc: jest.fn(),
    updateDoc: jest.fn(),
  };
});

jest.mock('@/services/firebase', () => ({ db: {} }));

jest.mock('@/services/projects/status.service', () => ({
  updateItemStatus: jest.fn(),
}));

const mockedDoc = doc as jest.Mock;
const mockedGetDoc = getDoc as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedUpdateItemStatus = updateItemStatus as jest.Mock;

describe('services/projects/budget.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDoc.mockReturnValue('doc-ref');
    mockedUpdateDoc.mockResolvedValue(undefined);
    mockedUpdateItemStatus.mockResolvedValue(undefined);
  });

  describe('computeBudgetTotals', () => {
    it('sums the amount of every line', () => {
      expect(
        computeBudgetTotals([
          { description: 'MDF', amount: 300 },
          { description: 'Ferragens', amount: 50.5 },
        ]),
      ).toBe(350.5);
    });

    it('returns 0 for an empty line list', () => {
      expect(computeBudgetTotals([])).toBe(0);
    });
  });

  describe('saveItemBudget', () => {
    const input = {
      lines: [{ description: 'MDF', amount: 300 }],
      customerAmount: 500,
      suggestedAssemblerAmount: 150,
    };
    const actor = {
      id: 'seller-1',
      name: 'Vendedor',
      roles: ['seller' as const],
    };

    it('rejects a role without permission', async () => {
      await expect(
        saveItemBudget('p1', 'i1', input, {
          id: 'designer-1',
          name: 'Desenhista',
          roles: ['designer'],
        }),
      ).rejects.toThrow(BudgetServiceError);

      expect(mockedUpdateDoc).not.toHaveBeenCalled();
    });

    it('rejects when the item is not waiting for a budget', async () => {
      mockedGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ status: 'aguardando_desenho' }),
      });

      await expect(saveItemBudget('p1', 'i1', input, actor)).rejects.toThrow(
        BudgetServiceError,
      );
    });

    it('rejects an item that does not exist', async () => {
      mockedGetDoc.mockResolvedValue({ exists: () => false });

      await expect(saveItemBudget('p1', 'i1', input, actor)).rejects.toThrow(
        'nao encontrado',
      );
    });

    it('saves the budget with computed total cost', async () => {
      mockedGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ status: 'aguardando_orcamento' }),
      });

      const budget = await saveItemBudget('p1', 'i1', input, actor);

      expect(budget.totalCost).toBe(300);
      expect(budget.customerAmount).toBe(500);
      expect(budget.suggestedAssemblerAmount).toBe(150);
      expect(budget.createdBy).toBe('seller-1');
      expect(mockedUpdateDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({
          budget: expect.objectContaining({ totalCost: 300 }),
          updatedBy: 'seller-1',
        }),
      );
    });

    it('keeps the original author when updating an existing budget', async () => {
      mockedGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'aguardando_orcamento',
          budget: {
            lines: [],
            totalCost: 0,
            customerAmount: 0,
            suggestedAssemblerAmount: 0,
            createdBy: 'original-author',
            createdByName: 'Autor Original',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          },
        }),
      });

      const budget = await saveItemBudget('p1', 'i1', input, actor);

      expect(budget.createdBy).toBe('original-author');
    });
  });

  describe('sendBudgetToClient', () => {
    it('rejects a role without permission', async () => {
      await expect(
        sendBudgetToClient('p1', 'i1', {
          id: 'designer-1',
          roles: ['designer'],
          role: 'designer',
        }),
      ).rejects.toThrow(BudgetServiceError);

      expect(mockedUpdateItemStatus).not.toHaveBeenCalled();
    });

    it('moves the item to aguardando_aprovacao_cliente', async () => {
      await sendBudgetToClient('p1', 'i1', {
        id: 'admin-1',
        roles: ['admin'],
        role: 'admin',
      });

      expect(mockedUpdateItemStatus).toHaveBeenCalledWith(
        'p1',
        'i1',
        'aguardando_aprovacao_cliente',
        { uid: 'admin-1', role: 'admin' },
      );
    });
  });
});
