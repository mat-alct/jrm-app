import { CuttingPlanPreview } from '@/components/CuttingPlan';
import {
  cutlistToCuttingPlanInput,
  generateCuttingPlan,
} from '@/domain/cutting-plan';
import type { Cutlist } from '@/types';

import { render, screen, within } from '../../testUtils';

const cutlist: Cutlist[] = [
  {
    id: 'door',
    description: 'Porta',
    material: {
      materialId: 'mdf-white',
      name: 'MDF Branco 15mm',
      width: 2750,
      height: 1850,
      price: 220,
    },
    amount: 2,
    sideA: 500,
    sideB: 900,
    borderA: 2,
    borderB: 0,
    price: 100,
  },
];

const plan = generateCuttingPlan(
  cutlistToCuttingPlanInput({ cutlist, optimizationMode: 'balanced' }),
);

describe('CuttingPlanPreview', () => {
  it('exibe métricas, custos e sobras do resultado', () => {
    render(<CuttingPlanPreview plan={plan} />);

    expect(screen.getByText('Resultado do plano')).toBeInTheDocument();
    expect(screen.getByText('Aproveitamento')).toBeInTheDocument();
    expect(screen.getAllByText('Desperdício').length).toBeGreaterThan(0);
    expect(screen.getByText('Valor total')).toBeInTheDocument();
    expect(screen.getByText(/Sobras reaproveitáveis/)).toBeInTheDocument();
    expect(screen.getByText('Composição de custos')).toBeInTheDocument();
  });

  it('renderiza cada chapa proporcionalmente em SVG com legenda e peças', () => {
    render(<CuttingPlanPreview plan={plan} />);

    const drawing = screen.getByRole('img', { name: /Plano 2D da chapa 1/ });
    expect(drawing).toHaveAttribute('viewBox', '0 0 1850 2750');
    expect(screen.getByText('Peças')).toBeInTheDocument();
    expect(screen.getByText('Bordas removidas')).toBeInTheDocument();
    expect(
      within(drawing)
        .getAllByText(/Porta/)
        .filter(node => node.tagName.toLowerCase() === 'text'),
    ).toHaveLength(2);
  });

  it('lista a sequência completa, incluindo kerf e perda interna', () => {
    render(<CuttingPlanPreview plan={plan} />);

    expect(screen.getByText('Ordem sugerida dos cortes')).toBeInTheDocument();
    expect(screen.getByText('Kerf')).toBeInTheDocument();
    expect(screen.getByText('Perda interna')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(
      plan.pricing.sheetItems.length + plan.cutSequence.length + 5,
    );
  });
});
