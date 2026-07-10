import { getDoc, setDoc } from 'firebase/firestore';

import {
  DEFAULT_CUTTING_MACHINE_CONFIGURATION,
  type CuttingMachineConfiguration,
} from '@/domain/cutting-plan';
import {
  getCuttingMachineConfiguration,
  saveCuttingMachineConfiguration,
} from '@/services/cuttingMachine.service';

jest.mock('@/services/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ path: 'config/cutting-machine' })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  Timestamp:
    jest.requireActual<typeof import('firebase/firestore')>(
      'firebase/firestore',
    ).Timestamp,
}));

describe('cuttingMachine.service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('usa os padrões quando ainda não existe configuração', async () => {
    jest.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);
    await expect(getCuttingMachineConfiguration()).resolves.toEqual(
      DEFAULT_CUTTING_MACHINE_CONFIGURATION,
    );
  });

  it('normaliza e salva a configuração com autoria', async () => {
    const configuration: CuttingMachineConfiguration = {
      ...DEFAULT_CUTTING_MACHINE_CONFIGURATION,
      cutting: {
        ...DEFAULT_CUTTING_MACHINE_CONFIGURATION.cutting,
        kerfMm: 4.5,
      },
    };

    await expect(
      saveCuttingMachineConfiguration(configuration, 'seller-1'),
    ).resolves.toMatchObject({ cutting: { kerfMm: 4.5 } });
    expect(setDoc).toHaveBeenCalledWith(
      { path: 'config/cutting-machine' },
      expect.objectContaining({
        cutting: expect.objectContaining({ kerfMm: 4.5 }),
        updatedBy: 'seller-1',
      }),
    );
  });

  it('rejeita uma configuração perigosa antes de gravar', async () => {
    await expect(
      saveCuttingMachineConfiguration(
        {
          ...DEFAULT_CUTTING_MACHINE_CONFIGURATION,
          cutting: {
            ...DEFAULT_CUTTING_MACHINE_CONFIGURATION.cutting,
            kerfMm: -1,
          },
        },
        'seller-1',
      ),
    ).rejects.toThrow('não podem ser negativos');
    expect(setDoc).not.toHaveBeenCalled();
  });
});
