import React, { useState } from 'react';

import { CuttingPlanSection } from '@/components/CuttingPlan';
import {
  type CuttingPlan,
  DEFAULT_CUTTING_MACHINE_CONFIGURATION,
} from '@/domain/cutting-plan';
import { getCuttingMachineConfiguration } from '@/services/cuttingMachine.service';
import type { Cutlist } from '@/types';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

jest.mock('uuid', () => ({ v4: () => 'generated-plan-id' }));
jest.mock('@/services/cuttingMachine.service', () => ({
  CUTTING_MACHINE_QUERY_KEY: ['cutting-machine-configuration'],
  getCuttingMachineConfiguration: jest.fn(),
}));

const cut = (overrides: Partial<Cutlist> = {}): Cutlist => ({
  id: 'piece-1',
  description: 'Porta',
  material: {
    materialId: 'material-1',
    name: 'MDF Branco 15mm',
    width: 2750,
    height: 1850,
    price: 220,
  },
  amount: 1,
  sideA: 500,
  sideB: 900,
  borderA: 2,
  borderB: 0,
  price: 100,
  ...overrides,
});

const Harness = ({
  initialPlan,
  pieces = [cut()],
}: {
  initialPlan?: CuttingPlan;
  pieces?: Cutlist[];
}) => {
  const [plan, setPlan] = useState(initialPlan);
  return (
    <CuttingPlanSection
      cutlist={pieces}
      plan={plan}
      onPlanChange={setPlan}
      required
    />
  );
};

const generate = async () => {
  const button = screen.getByRole('button', { name: /Gerar plano de corte/i });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  await screen.findByTestId('cutting-plan-preview');
};

const startGeneration = async () => {
  const button = screen.getByRole('button', {
    name: /Gerar plano de corte/i,
  });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
};

describe('CuttingPlanSection', () => {
  beforeEach(() => {
    jest
      .mocked(getCuttingMachineConfiguration)
      .mockResolvedValue(DEFAULT_CUTTING_MACHINE_CONFIGURATION);
  });

  it('gera o plano com carregamento, métricas e ações', async () => {
    render(<Harness />);

    await startGeneration();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Calculando o melhor plano',
    );

    expect(
      await screen.findByTestId('cutting-plan-preview'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Rascunho · versão 1/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Aprovar plano/i }),
    ).toBeEnabled();
  });

  it('permite escolher a estratégia e aprovar', async () => {
    render(<Harness />);

    fireEvent.click(screen.getByText('Maior aproveitamento'));
    await generate();
    expect(screen.getAllByText('Maior aproveitamento').length).toBeGreaterThan(
      0,
    );

    fireEvent.click(screen.getByRole('button', { name: /Aprovar plano/i }));
    expect(screen.getByText(/Aprovado · versão 1/)).toBeInTheDocument();
  });

  it('usa a configuração global e não expõe parâmetros dentro do gerador', async () => {
    render(<Harness />);

    await generate();
    expect(
      screen.getByRole('link', { name: /parâmetros globais da máquina/i }),
    ).toHaveAttribute('href', '/cortes/configuracoes-maquina');
    expect(
      screen.queryByLabelText('Espessura da serra — kerf (mm)'),
    ).not.toBeInTheDocument();
  });

  it('mostra erro claro para uma peça impossível', async () => {
    render(<Harness pieces={[cut({ sideA: 3000, sideB: 3000 })]} />);

    await startGeneration();
    expect(
      await screen.findByText(/não cabe na área útil/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('cutting-plan-preview'),
    ).not.toBeInTheDocument();
  });

  it('gera uma nova versão ao regenerar', async () => {
    render(<Harness />);
    await generate();

    fireEvent.click(screen.getByRole('button', { name: /Gerar novamente/i }));
    await waitFor(() =>
      expect(screen.getByText(/Rascunho · versão 2/)).toBeInTheDocument(),
    );
  });
});
