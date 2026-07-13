import { ModelViewerPreview } from '@/components/projects/ModelViewerPreview';

import { render, screen, waitFor } from '../../testUtils';

// O custom element do @google/model-viewer nao roda em jsdom (PLANO-DE-TESTES.md 14.4).
// Mockamos apenas o modulo carregado dinamicamente; a renderizacao real e coberta no e2e.
jest.mock('@google/model-viewer', () => ({}), { virtual: true });

const SRC = 'https://storage.test/modelo.glb';

describe('ModelViewerPreview', () => {
  it('mostra o placeholder antes de o visualizador carregar', async () => {
    render(<ModelViewerPreview src={SRC} fileName="modelo.glb" />);

    expect(
      screen.getByText('Carregando visualizador 3D...'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.querySelector('model-viewer')).toBeInTheDocument(),
    );
  });

  it('renderiza o model-viewer com src e alt apos carregar o modulo', async () => {
    const { container } = render(
      <ModelViewerPreview src={SRC} fileName="modelo.glb" />,
    );

    await waitFor(() =>
      expect(container.querySelector('model-viewer')).toBeInTheDocument(),
    );

    const viewer = container.querySelector('model-viewer')!;
    expect(viewer).toHaveAttribute('src', SRC);
    expect(viewer).toHaveAttribute('alt', 'Modelo 3D - modelo.glb');
    expect(
      screen.queryByText('Carregando visualizador 3D...'),
    ).not.toBeInTheDocument();
  });

  it('mostra o nome do arquivo e o link de download', async () => {
    render(<ModelViewerPreview src={SRC} fileName="armario.glb" />);

    expect(screen.getByText('armario.glb')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Baixar modelo' });
    expect(link).toHaveAttribute('href', SRC);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    await waitFor(() =>
      expect(document.querySelector('model-viewer')).toBeInTheDocument(),
    );
  });
});
