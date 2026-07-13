import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { ProjectForm } from '@/components/projects/ProjectForm';
import { ProjectItemForm } from '@/components/projects/ProjectItemForm';
import { createProjectSchema } from '@/utils/yup/projetosValidations';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

/** Pagina de novo projeto reduzida ao essencial: form + array de itens. */
function NewProjectHarness({
  onSubmit,
}: {
  onSubmit: (values: unknown) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(createProjectSchema as never),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      items: [{ name: '', environment: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  return (
    <form onSubmit={event => void handleSubmit(onSubmit as never)(event)}>
      <ProjectForm register={register} errors={errors as never} />

      {fields.map((field, index) => (
        <ProjectItemForm
          key={field.id}
          index={index}
          register={register}
          errors={errors as never}
          onRemove={() => remove(index)}
          canRemove={fields.length > 1}
        />
      ))}

      <button
        type="button"
        onClick={() => append({ name: '', environment: '' })}
      >
        Adicionar item
      </button>
      <button type="submit">Criar projeto</button>
    </form>
  );
}

function fillCustomer() {
  fireEvent.change(screen.getByLabelText('Nome do cliente'), {
    target: { value: 'Cliente Alpha' },
  });
  fireEvent.change(screen.getByLabelText('Telefone'), {
    target: { value: '24999990000' },
  });
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'cliente@alpha.com' },
  });
  fireEvent.change(screen.getByLabelText('Endereço'), {
    target: { value: 'Rua A, 1' },
  });
}

describe('ProjectForm + ProjectItemForm', () => {
  it('renderiza os campos do cliente e o primeiro item', () => {
    render(<NewProjectHarness onSubmit={jest.fn()} />);

    expect(screen.getByLabelText('Nome do cliente')).toBeInTheDocument();
    expect(screen.getByLabelText('Telefone')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Endereço')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('exibe as mensagens de validacao no submit', async () => {
    render(<NewProjectHarness onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Criar projeto' }));

    expect(
      await screen.findByText('Nome do cliente é obrigatório'),
    ).toBeInTheDocument();
    expect(screen.getByText('Telefone é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Endereço é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Nome do item é obrigatório')).toBeInTheDocument();
  });

  it('deixa a validacao nativa do type=email barrar o submit', async () => {
    const onSubmit = jest.fn();
    render(<NewProjectHarness onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'nao-e-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar projeto' }));

    // O input e type="email": o proprio navegador (e o jsdom) bloqueia o submit,
    // entao o yup nem chega a rodar. Vale registrar: o `.email()` do yup e permissivo
    // (aceita ate "joao@empresa"), entao quem barra e-mail malformado aqui e a
    // validacao nativa do HTML, nao o schema.
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeInvalid());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.queryByText('Digite um e-mail válido'),
    ).not.toBeInTheDocument();
  });

  it('nao permite remover quando ha um unico item', () => {
    render(<NewProjectHarness onSubmit={jest.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'Remover' }),
    ).not.toBeInTheDocument();
  });

  it('adiciona e remove itens dinamicamente', () => {
    render(<NewProjectHarness onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remover' })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: 'Remover' })[1]);
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
  });

  it('mostra o erro no item certo do array', async () => {
    render(<NewProjectHarness onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));
    fireEvent.change(screen.getAllByLabelText('Nome do item')[0], {
      target: { value: 'Cozinha' },
    });
    fireEvent.change(screen.getAllByLabelText('Ambiente')[0], {
      target: { value: 'Cozinha' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar projeto' }));

    // Apenas o item 2, que ficou vazio, acusa erro.
    expect(
      await screen.findByText('Nome do item é obrigatório'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Nome do item é obrigatório')).toHaveLength(1);
  });

  it('submete o payload completo com todos os itens', async () => {
    const onSubmit = jest.fn();
    render(<NewProjectHarness onSubmit={onSubmit} />);

    fillCustomer();
    fireEvent.change(screen.getAllByLabelText('Nome do item')[0], {
      target: { value: 'Cozinha planejada' },
    });
    fireEvent.change(screen.getAllByLabelText('Ambiente')[0], {
      target: { value: 'Cozinha' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));
    fireEvent.change(screen.getAllByLabelText('Nome do item')[1], {
      target: { value: 'Armario' },
    });
    fireEvent.change(screen.getAllByLabelText('Ambiente')[1], {
      target: { value: 'Quarto' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Criar projeto' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: 'Cliente Alpha',
        customerPhone: '24999990000',
        customerEmail: 'cliente@alpha.com',
        customerAddress: 'Rua A, 1',
        items: [
          expect.objectContaining({
            name: 'Cozinha planejada',
            environment: 'Cozinha',
          }),
          expect.objectContaining({ name: 'Armario', environment: 'Quarto' }),
        ],
      }),
      expect.anything(),
    );
  });
});
