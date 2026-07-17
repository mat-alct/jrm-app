import ClientPortalPage from '@/pages/cliente/[publicId]';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: { publicId: 'public-1' },
    isReady: true,
    push: jest.fn(),
  }),
}));

describe('ClientPortalPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the project after a successful access-code login', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projectId: 'project-1',
          customerName: 'Cliente Teste',
          items: [
            {
              itemId: 'item-1',
              name: 'Armario',
              environment: 'Quarto',
              customerPrice: 1200,
              approvalStatus: 'aguardando',
              clientStatusLabel: 'Aguardando sua aprovação',
              attachments: [],
            },
          ],
        }),
      });
    global.fetch = fetchMock as typeof fetch;

    render(<ClientPortalPage />);

    fireEvent.change(screen.getByLabelText('Senha de acesso'), {
      target: { value: 'abc234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByText('Cliente Teste')).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/client-access/verify',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ publicId: 'public-1', accessCode: 'ABC234' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/client-access/project');
  });

  it('shows an error when the access code is rejected', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Credenciais invalidas.' }),
    }) as typeof fetch;

    render(<ClientPortalPage />);

    fireEvent.change(screen.getByLabelText('Senha de acesso'), {
      target: { value: 'errada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Credenciais invalidas.'),
    ).toBeInTheDocument();
  });
});
