import { ClientLoginWithCode } from '@/components/client/ClientLoginWithCode';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

function codeInput() {
  return screen.getByPlaceholderText('Ex.: A2B3C4');
}

describe('ClientLoginWithCode', () => {
  it('mantem o botao desabilitado enquanto nao ha codigo', () => {
    render(<ClientLoginWithCode onSubmit={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  });

  it('mantem o botao desabilitado quando o codigo e so espaco', () => {
    render(<ClientLoginWithCode onSubmit={jest.fn()} />);

    fireEvent.change(codeInput(), { target: { value: '   ' } });

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  });

  it('normaliza o codigo para maiusculas e sem espacos ao enviar', async () => {
    const onSubmit = jest.fn();
    render(<ClientLoginWithCode onSubmit={onSubmit} />);

    fireEvent.change(codeInput(), { target: { value: '  a2b3c4 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('A2B3C4'));
  });

  it('exibe a mensagem de erro de codigo invalido', () => {
    render(
      <ClientLoginWithCode onSubmit={jest.fn()} error="Código inválido" />,
    );

    expect(screen.getByText('Código inválido')).toBeInTheDocument();
  });

  it('orienta a procurar a loja quando o link expirou', () => {
    render(<ClientLoginWithCode onSubmit={jest.fn()} error="Link expirado" />);

    expect(
      screen.getByText(
        'Entre em contato com a loja para liberar um novo acesso.',
      ),
    ).toBeInTheDocument();
  });

  it('nao mostra a orientacao de contato para outros erros', () => {
    render(
      <ClientLoginWithCode onSubmit={jest.fn()} error="Código inválido" />,
    );

    expect(
      screen.queryByText(
        'Entre em contato com a loja para liberar um novo acesso.',
      ),
    ).not.toBeInTheDocument();
  });

  it('desabilita o envio enquanto submete', () => {
    const { container } = render(
      <ClientLoginWithCode onSubmit={jest.fn()} isSubmitting />,
    );

    fireEvent.change(codeInput(), { target: { value: 'A2B3C4' } });

    // Em estado `loading` o Chakra troca o rotulo por um spinner: buscamos pelo type.
    expect(container.querySelector('button[type="submit"]')).toBeDisabled();
  });
});
