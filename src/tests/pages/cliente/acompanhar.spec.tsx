import ClientTrackingPage from '@/pages/cliente/[publicId]/acompanhar';
import { ClientProjectDTO } from '@/types/projects';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

const push = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push, query: { publicId: 'Abc123' } }),
}));
jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const fetchMock = jest.fn();

const project: ClientProjectDTO = {
  projectId: 'project-1',
  customerName: 'Cliente Alpha',
  sellerContactPhone: '+5524999990000',
  items: [
    {
      itemId: 'item-1',
      name: 'Cozinha planejada',
      environment: 'Cozinha',
      customerAmount: 1200,
      approvalStatus: 'aprovado',
      clientStatusLabel: 'Em produção',
      attachments: [],
    },
  ],
} as ClientProjectDTO;

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('pages/cliente/[publicId]/acompanhar', () => {
  it('busca o projeto do portal e mostra a timeline', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => project });

    render(<ClientTrackingPage />);

    // A timeline resume o projeto pelos rotulos de status do cliente,
    // sem listar o nome de cada item.
    await waitFor(() => expect(screen.getByText('Em produção')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/client-access/project');
  });

  it('mostra o erro da API e orienta o cliente', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Sessao do cliente invalida.' }),
    });

    render(<ClientTrackingPage />);

    expect(await screen.findByText('Sessao do cliente invalida.')).toBeInTheDocument();
    expect(
      screen.getByText('Entre em contato com a loja se o acesso estiver expirado.'),
    ).toBeInTheDocument();
  });

  it('mostra erro generico quando a rede falha', async () => {
    fetchMock.mockRejectedValue(new Error('Failed to fetch'));

    render(<ClientTrackingPage />);

    expect(await screen.findByText('Failed to fetch')).toBeInTheDocument();
  });

  it('nao mostra a timeline enquanto carrega', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    render(<ClientTrackingPage />);

    expect(screen.queryByText('Em produção')).not.toBeInTheDocument();
  });

  it('volta para a pagina de aprovacao do mesmo publicId', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => project });

    render(<ClientTrackingPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para aprovação' }));

    expect(push).toHaveBeenCalledWith('/cliente/Abc123');
  });

  it('usa o telefone do vendedor no cabecalho quando disponivel', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => project });

    render(<ClientTrackingPage />);

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /\+5524999990000/ })).toHaveAttribute(
        'href',
        'tel:+5524999990000',
      ),
    );
  });
});
