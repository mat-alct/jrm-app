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
    expect(screen.getByText('Valor total')).toBeInTheDocument();
    expect(screen.getByText(/^Sobras:/)).toBeInTheDocument();
    expect(screen.getByText('Composição de custos')).toBeInTheDocument();
  });

  it('renderiza cada chapa proporcionalmente em SVG com legenda e peças', () => {
    render(<CuttingPlanPreview plan={plan} />);

    const drawing = screen.getByRole('img', { name: /Plano 2D da chapa 1/ });
    expect(drawing).toHaveAttribute('viewBox', '-92.5 -137.5 2035 3025');
    expect(drawing).toHaveAttribute('data-scale-unit', 'mm');
    expect(screen.getByText('Peça sem fita')).toBeInTheDocument();
    expect(screen.getAllByText('Fita de borda').length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Ajuste interno \(7.5 mm por lado\)/),
    ).toBeInTheDocument();
    expect(
      within(drawing)
        .getAllByText(/Porta/)
        .filter(node => node.tagName.toLowerCase() === 'text'),
    ).toHaveLength(2);
    expect(drawing.querySelector('[data-banded="true"]')).not.toHaveAttribute(
      'stroke-dasharray',
    );
    expect(drawing.querySelector('[data-banded="false"]')).toHaveAttribute(
      'stroke-dasharray',
      '5 4',
    );
    expect(
      drawing.querySelector('[data-waste-reason="internal_trim"]'),
    ).toBeInTheDocument();
  });

  it('não expõe a ordem sugerida nem numeração dos cortes', () => {
    render(<CuttingPlanPreview plan={plan} />);

    expect(
      screen.queryByText('Ordem sugerida dos cortes'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Etapa')).not.toBeInTheDocument();
    expect(document.querySelectorAll('circle')).toHaveLength(0);
  });

  it('usa apenas cores em escala de cinza no desenho', () => {
    render(<CuttingPlanPreview plan={plan} />);

    const drawing = screen.getByRole('img', { name: /Plano 2D da chapa 1/ });
    const coloredHex =
      /#(?:f(?:ed7aa|de68a|bcfe8)|bfdbfe|c7d2fe|ddd6fe|a7f3d0|bae6fd|dc2626|7c3aed|991b1b)/i;
    expect(drawing.innerHTML).not.toMatch(coloredHex);
  });
});
