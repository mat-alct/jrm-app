import { DEFAULT_CUTTING_MACHINE_CONFIGURATION } from '@/domain/cutting-plan';
import MachineSettingsPage from '@/pages/cortes/configuracoes-maquina';
import {
  getCuttingMachineConfiguration,
  saveCuttingMachineConfiguration,
} from '@/services/cuttingMachine.service';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

jest.mock('@/hooks/authContext', () => ({
  useAuth: () => ({ user: { uid: 'seller-1' } }),
}));
jest.mock('@/components/Dashboard', () => ({
  Dashboard: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('@/components/Dashboard/Content/Header', () => ({
  Header: ({ pageTitle }: { pageTitle: string }) => <h1>{pageTitle}</h1>,
}));
jest.mock('@/components/ui/toaster', () => ({
  toaster: { create: jest.fn() },
}));
jest.mock('@/services/cuttingMachine.service', () => ({
  CUTTING_MACHINE_QUERY_KEY: ['cutting-machine-configuration'],
  getCuttingMachineConfiguration: jest.fn(),
  saveCuttingMachineConfiguration: jest.fn(),
}));

describe('parâmetros da máquina', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(getCuttingMachineConfiguration)
      .mockResolvedValue(DEFAULT_CUTTING_MACHINE_CONFIGURATION);
    jest
      .mocked(saveCuttingMachineConfiguration)
      .mockResolvedValue(DEFAULT_CUTTING_MACHINE_CONFIGURATION);
  });

  it('carrega e salva margens, kerf, custos e perfil Giben', async () => {
    render(<MachineSettingsPage />);

    expect(
      await screen.findByRole('heading', { name: 'Parâmetros da Máquina' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Margem externa por borda (mm)')).toHaveValue(
      10,
    );
    expect(screen.getByLabelText('Acerto interno por borda (mm)')).toHaveValue(
      7.5,
    );

    fireEvent.change(screen.getByLabelText('Espessura da serra / kerf (mm)'), {
      target: { value: '4.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar parâmetros' }));

    await waitFor(() =>
      expect(saveCuttingMachineConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          cutting: expect.objectContaining({ kerfMm: 4.5 }),
          exportProfile: expect.objectContaining({
            id: 'giben-cortecloud-v1',
          }),
        }),
        'seller-1',
      ),
    );
  });
});
