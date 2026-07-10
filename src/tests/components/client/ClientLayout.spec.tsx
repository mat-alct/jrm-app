import { ClientLayout } from '@/components/client/ClientLayout';

import { render, screen } from '../../testUtils';

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ClientLayout', () => {
  it('renderiza o conteudo e a marca', () => {
    render(
      <ClientLayout>
        <p>conteudo do portal</p>
      </ClientLayout>,
    );

    expect(screen.getByText('conteudo do portal')).toBeInTheDocument();
    expect(screen.getByAltText('JRM Compensados')).toBeInTheDocument();
  });

  it('mostra o telefone de contato como link de ligacao quando informado', () => {
    render(
      <ClientLayout contactPhone="+5524999990000">
        <p>conteudo</p>
      </ClientLayout>,
    );

    const link = screen.getByRole('link', { name: /\+5524999990000/ });
    expect(link).toHaveAttribute('href', 'tel:+5524999990000');
  });

  it('cai no texto padrao de atendimento quando nao ha telefone', () => {
    render(
      <ClientLayout>
        <p>conteudo</p>
      </ClientLayout>,
    );

    expect(screen.getByText('Atendimento JRM')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('usa o titulo informado, com um padrao para o portal', () => {
    const { rerender } = render(
      <ClientLayout title="Meu projeto | JRM">
        <p>conteudo</p>
      </ClientLayout>,
    );

    expect(document.querySelector('title')).toHaveTextContent('Meu projeto | JRM');

    rerender(
      <ClientLayout>
        <p>conteudo</p>
      </ClientLayout>,
    );

    expect(document.querySelector('title')).toHaveTextContent(
      'Portal do Cliente | JRM Compensados',
    );
  });
});
