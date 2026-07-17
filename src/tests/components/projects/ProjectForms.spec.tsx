import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import * as Yup from 'yup';

import { ProjectForm } from '@/components/projects/ProjectForm';
import { ProjectItemForm } from '@/components/projects/ProjectItemForm';
import {
  createProjectSchema,
  projectItemSchema,
} from '@/utils/yup/projetosValidations';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

function NewProjectHarness({
  onSubmit,
}: {
  onSubmit: (values: unknown) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(createProjectSchema as never),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
    },
  });

  return (
    <form onSubmit={event => void handleSubmit(onSubmit as never)(event)}>
      <ProjectForm register={register} errors={errors as never} />
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
}

describe('ProjectForm', () => {
  it('renderiza os campos do cliente', () => {
    render(<NewProjectHarness onSubmit={jest.fn()} />);

    expect(screen.getByLabelText('Nome do cliente')).toBeInTheDocument();
    expect(screen.getByLabelText('Telefone')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Endereço')).toBeInTheDocument();
  });

  it('exige apenas nome e telefone no submit', async () => {
    render(<NewProjectHarness onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Criar projeto' }));

    expect(
      await screen.findByText('Nome do cliente é obrigatório'),
    ).toBeInTheDocument();
    expect(screen.getByText('Telefone é obrigatório')).toBeInTheDocument();
    expect(
      screen.queryByText('E-mail é obrigatório'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Endereço é obrigatório'),
    ).not.toBeInTheDocument();
  });

  it('deixa a validacao nativa do type=email barrar o submit quando preenchido', async () => {
    const onSubmit = jest.fn();
    render(<NewProjectHarness onSubmit={onSubmit} />);

    fillCustomer();
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'nao-e-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar projeto' }));

    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeInvalid());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submete apenas com nome e telefone preenchidos', async () => {
    const onSubmit = jest.fn();
    render(<NewProjectHarness onSubmit={onSubmit} />);

    fillCustomer();
    fireEvent.click(screen.getByRole('button', { name: 'Criar projeto' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: 'Cliente Alpha',
        customerPhone: '24999990000',
      }),
      expect.anything(),
    );
  });

  it('submete com e-mail e endereço quando preenchidos', async () => {
    const onSubmit = jest.fn();
    render(<NewProjectHarness onSubmit={onSubmit} />);

    fillCustomer();
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'cliente@alpha.com' },
    });
    fireEvent.change(screen.getByLabelText('Endereço'), {
      target: { value: 'Rua A, 1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar projeto' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: 'cliente@alpha.com',
        customerAddress: 'Rua A, 1',
      }),
      expect.anything(),
    );
  });
});

const addItemSchema = Yup.object().shape({
  items: Yup.array().of(projectItemSchema).min(1).required(),
});

/** Harness isolado do ProjectItemForm: usado pelo modal "Adicionar item" da Fase 2. */
function AddItemHarness({ onSubmit }: { onSubmit: (values: unknown) => void }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(addItemSchema as never),
    defaultValues: { items: [{ name: '', environment: '' }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  return (
    <form onSubmit={event => void handleSubmit(onSubmit as never)(event)}>
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
      <button type="submit">Salvar</button>
    </form>
  );
}

describe('ProjectItemForm', () => {
  it('renderiza o primeiro item', () => {
    render(<AddItemHarness onSubmit={jest.fn()} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('exibe as mensagens de validacao no submit', async () => {
    render(<AddItemHarness onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Nome do item é obrigatório'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ambiente é obrigatório')).toBeInTheDocument();
  });

  it('nao permite remover quando ha um unico item', () => {
    render(<AddItemHarness onSubmit={jest.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'Remover' }),
    ).not.toBeInTheDocument();
  });

  it('adiciona e remove itens dinamicamente', () => {
    render(<AddItemHarness onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remover' })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: 'Remover' })[1]);
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
  });

  it('submete o payload do item preenchido', async () => {
    const onSubmit = jest.fn();
    render(<AddItemHarness onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Nome do item'), {
      target: { value: 'Cozinha planejada' },
    });
    fireEvent.change(screen.getByLabelText('Ambiente'), {
      target: { value: 'Cozinha' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            name: 'Cozinha planejada',
            environment: 'Cozinha',
          }),
        ],
      }),
      expect.anything(),
    );
  });
});
