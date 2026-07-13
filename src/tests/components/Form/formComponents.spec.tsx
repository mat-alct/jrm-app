import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';

import { FormModal } from '@/components/Form/Modal';
import { FormRadio } from '@/components/Form/Radio';
import { FormSelect } from '@/components/Form/Select';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

const schema = Yup.object().shape({
  tipo: Yup.string().required('Escolha um tipo'),
  material: Yup.string().required('Material obrigatório'),
});

interface HarnessProps {
  onSubmit: (values: { tipo?: string; material?: string }) => void;
  isDisabled?: boolean;
}

/** Formulario real (react-hook-form + yup) usando os dois campos controlados. */
function FormHarness({ onSubmit, isDisabled }: HarnessProps) {
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(schema as never),
  });

  return (
    <form onSubmit={event => void handleSubmit(onSubmit as never)(event)}>
      <FormRadio
        name="tipo"
        control={control}
        label="Tipo de entrega"
        options={['Entrega', 'Retirada']}
      />
      <FormSelect
        name="material"
        control={control}
        label="Material"
        placeholder="Selecione"
        isDisabled={isDisabled}
        options={[
          { value: 'mdf', label: 'MDF Branco' },
          { value: 'comp', label: 'Compensado' },
        ]}
      />
      <button type="submit">Salvar</button>
    </form>
  );
}

/** Abre o react-select e escolhe a opcao pelo rotulo visivel. */
async function chooseMaterial(optionLabel: string) {
  const input = document.querySelector('#material') as HTMLInputElement;
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.click(await screen.findByText(optionLabel));
}

describe('FormRadio', () => {
  it('renderiza o label e todas as opcoes', () => {
    render(<FormHarness onSubmit={jest.fn()} />);

    expect(screen.getByText('Tipo de entrega')).toBeInTheDocument();
    expect(screen.getByText('Entrega')).toBeInTheDocument();
    expect(screen.getByText('Retirada')).toBeInTheDocument();
  });

  it('registra a opcao escolhida no formulario', async () => {
    const onSubmit = jest.fn();
    render(<FormHarness onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('Retirada'));
    await chooseMaterial('MDF Branco');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'Retirada', material: 'mdf' }),
        expect.anything(),
      ),
    );
  });

  it('exibe a mensagem de erro do schema quando nada e escolhido', async () => {
    render(<FormHarness onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Escolha um tipo')).toBeInTheDocument();
  });
});

describe('FormSelect', () => {
  it('renderiza o label e o placeholder', () => {
    render(<FormHarness onSubmit={jest.fn()} />);

    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getByText('Selecione')).toBeInTheDocument();
  });

  it('grava o value (nao o label) da opcao escolhida', async () => {
    const onSubmit = jest.fn();
    render(<FormHarness onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('Entrega'));
    await chooseMaterial('Compensado');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ material: 'comp' }),
        expect.anything(),
      ),
    );
  });

  it('exibe a mensagem de erro do schema quando nada e escolhido', async () => {
    render(<FormHarness onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Material obrigatório')).toBeInTheDocument();
  });

  it('respeita isDisabled', () => {
    render(<FormHarness onSubmit={jest.fn()} isDisabled />);

    expect(document.querySelector('#material')).toBeDisabled();
  });
});

describe('FormModal', () => {
  const baseProps = {
    title: 'Confirmar acao',
    onClose: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('nao renderiza o conteudo quando fechado', () => {
    render(
      <FormModal {...baseProps} isOpen={false}>
        <p>corpo do modal</p>
      </FormModal>,
    );

    expect(screen.queryByText('corpo do modal')).not.toBeInTheDocument();
  });

  it('renderiza titulo e conteudo quando aberto', () => {
    render(
      <FormModal {...baseProps} isOpen>
        <p>corpo do modal</p>
      </FormModal>,
    );

    expect(screen.getByText('Confirmar acao')).toBeInTheDocument();
    expect(screen.getByText('corpo do modal')).toBeInTheDocument();
  });

  it('chama onSubmit ao clicar em Salvar, sem fechar o modal', () => {
    render(
      <FormModal {...baseProps} isOpen>
        <p>corpo do modal</p>
      </FormModal>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(baseProps.onSubmit).toHaveBeenCalledTimes(1);
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('chama onClose ao clicar em Cancelar, sem submeter', () => {
    render(
      <FormModal {...baseProps} isOpen>
        <p>corpo do modal</p>
      </FormModal>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    expect(baseProps.onSubmit).not.toHaveBeenCalled();
  });
});
