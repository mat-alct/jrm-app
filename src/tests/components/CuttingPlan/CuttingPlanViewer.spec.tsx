import { CuttingPlanViewer } from '@/components/CuttingPlan';
import {
  buildCuttingPlan,
  cutlistToCuttingPlanInput,
  generateCuttingPlan,
} from '@/domain/cutting-plan';
import type { Cutlist } from '@/types';

import { fireEvent, render, screen, within } from '../../testUtils';

const cutlist: Cutlist[] = [
  {
    id: 'panel',
    description: 'Painel lateral',
    material: {
      materialId: 'material-1',
      name: 'MDF Branco 15mm',
      width: 2750,
      height: 1850,
      price: 220,
    },
    amount: 2,
    sideA: 1800,
    sideB: 2700,
    borderA: 1,
    borderB: 0,
    grainDirection: 'along_length',
    price: 0,
  },
];

const plan = buildCuttingPlan({
  id: 'viewer-plan',
  orderId: 'order-1',
  timestamp: { seconds: 1, nanoseconds: 0 },
  result: generateCuttingPlan(
    cutlistToCuttingPlanInput({
      cutlist,
      optimizationMode: 'balanced',
    }),
  ),
});

describe('CuttingPlanViewer', () => {
  it('navega entre chapas e controla o zoom sem alterar a escala geométrica', () => {
    render(<CuttingPlanViewer plan={plan} />);

    expect(screen.getByText('Chapa 1 de 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar zoom' }));
    expect(screen.getByText('125%')).toBeInTheDocument();

    const drawing = screen.getByRole('img', { name: /Plano 2D da chapa 1/ });
    expect(drawing).toHaveAttribute('data-scale-unit', 'mm');
    expect(drawing).toHaveAttribute('data-sheet-width-mm', '1850');
    expect(drawing).toHaveAttribute('data-sheet-length-mm', '2750');

    fireEvent.click(screen.getByRole('button', { name: 'Próxima chapa' }));
    expect(screen.getByText('Chapa 2 de 2')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chapa anterior' }));
    expect(screen.getByText('Chapa 1 de 2')).toBeInTheDocument();
  });

  it('exibe os detalhes ao selecionar uma peça no desenho', () => {
    render(<CuttingPlanViewer plan={plan} />);

    const drawing = screen.getByRole('img', { name: /Plano 2D da chapa 1/ });
    const piece = drawing.querySelector('[data-piece-id]');
    expect(piece).toBeInTheDocument();
    fireEvent.click(piece!);

    const info = screen.getByTestId('selected-piece-info');
    expect(within(info).getByText('Painel lateral')).toBeInTheDocument();
    expect(within(info).getByText(/1800 × 2700 mm/)).toBeInTheDocument();
    expect(
      within(info).getByText('Horizontal (lado maior)'),
    ).toBeInTheDocument();
    expect(within(info).getByText('superior')).toBeInTheDocument();
  });
});
