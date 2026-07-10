import { ClientAccessPanel } from '@/components/projects/ClientAccessPanel';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

const fetchMock = jest.fn();
const writeText = jest.fn();

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
});

function respondWith(body: unknown, ok = true) {
  fetchMock.mockResolvedValue({ ok, json: async () => body });
}

describe('ClientAccessPanel', () => {
  it('gera o acesso e exibe link e senha', async () => {
    respondWith({ publicId: 'Abc123', accessCode: 'K7M2P9' });

    render(<ClientAccessPanel projectId="project-1" baseUrl="https://jrm.test" />);

    fireEvent.click(screen.getByRole('button', { name: 'Gerar senha' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/client-access/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'project-1' }),
    });

    expect(await screen.findByText('https://jrm.test/cliente/Abc123')).toBeInTheDocument();
    expect(screen.getByText('K7M2P9')).toBeInTheDocument();
  });

  it('troca o rotulo do botao para regenerar apos gerar', async () => {
    respondWith({ publicId: 'Abc123', accessCode: 'K7M2P9' });

    render(<ClientAccessPanel projectId="project-1" baseUrl="https://jrm.test" />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar senha' }));

    expect(await screen.findByRole('button', { name: 'Regenerar senha' })).toBeInTheDocument();
  });

  it('copia o link para a area de transferencia', async () => {
    respondWith({ publicId: 'Abc123', accessCode: 'K7M2P9' });

    render(<ClientAccessPanel projectId="project-1" baseUrl="https://jrm.test" />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar senha' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Copiar link' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://jrm.test/cliente/Abc123'),
    );
  });

  it('mostra a validade quando informada', async () => {
    respondWith({ publicId: 'Abc123', accessCode: 'K7M2P9' });

    render(
      <ClientAccessPanel
        projectId="project-1"
        baseUrl="https://jrm.test"
        expiresAt="2026-03-10T12:00:00.000Z"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gerar senha' }));

    expect(await screen.findByText('Validade')).toBeInTheDocument();
    expect(screen.getByText('10/03/2026')).toBeInTheDocument();
  });

  it('exibe a mensagem de erro devolvida pela API', async () => {
    respondWith({ error: 'Acesso restrito a administradores.' }, false);

    render(<ClientAccessPanel projectId="project-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar senha' }));

    expect(
      await screen.findByText('Acesso restrito a administradores.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copiar link' })).not.toBeInTheDocument();
  });

  it('exibe erro generico quando a rede falha', async () => {
    fetchMock.mockRejectedValue(new Error('Failed to fetch'));

    render(<ClientAccessPanel projectId="project-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar senha' }));

    expect(await screen.findByText('Failed to fetch')).toBeInTheDocument();
  });

  it('nao exibe link nem senha antes de gerar', () => {
    render(<ClientAccessPanel projectId="project-1" />);

    expect(screen.queryByText('Senha exibida uma vez')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copiar link' })).not.toBeInTheDocument();
  });
});
