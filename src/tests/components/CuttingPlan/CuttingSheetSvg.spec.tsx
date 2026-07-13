import { CuttingSheetSvg } from '@/components/CuttingPlan';
import type {
  CuttingPlanSheet,
  CuttingPlanWasteRegion,
} from '@/domain/cutting-plan';

import { render } from '../../testUtils';

const offcut = (
  id: string,
  widthMm: number,
  heightMm: number,
): CuttingPlanWasteRegion => ({
  id,
  xMm: 0,
  yMm: 0,
  widthMm,
  heightMm,
  reason: 'remainder',
});

const sheetWith = (
  wasteRegions: CuttingPlanWasteRegion[],
): CuttingPlanSheet => ({
  id: 'sheet-001',
  number: 1,
  material: {
    id: 'mdf-15',
    name: 'MDF Branco 15mm',
    thicknessMm: 15,
    unitPrice: 200,
  },
  totalWidthMm: 1850,
  totalLengthMm: 2750,
  usableArea: { id: 'usable', xMm: 10, yMm: 10, widthMm: 1830, heightMm: 2730 },
  placements: [],
  cuts: [],
  wasteRegions,
});

const labelsOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-offcut-label="true"]')).map(
    node => node.textContent,
  );

describe('CuttingSheetSvg', () => {
  it('cota a sobra aproveitável com a medida em milímetros', () => {
    const { container } = render(
      <CuttingSheetSvg
        // 222 × 350 é aproveitável e ficava sem cota pela guarda antiga de 260.
        sheet={sheetWith([offcut('a', 620, 900), offcut('b', 222, 350)])}
      />,
    );

    expect(labelsOf(container)).toEqual([
      'Sobra · 620 × 900 mm',
      'Sobra · 222 × 350 mm',
    ]);
  });

  it('não cota sobras estreitas demais para reaproveitar', () => {
    const { container } = render(
      <CuttingSheetSvg
        sheet={sheetWith([
          offcut('sliver-horizontal', 1850, 30),
          offcut('sliver-vertical', 18.6, 500),
        ])}
      />,
    );

    expect(labelsOf(container)).toEqual([]);
  });

  it('cota sobras estreitas e altas girando o texto ao longo do lado maior', () => {
    const { container } = render(
      <CuttingSheetSvg sheet={sheetWith([offcut('faixa', 309, 2000)])} />,
    );
    const [label] = Array.from(
      container.querySelectorAll('[data-offcut-label="true"]'),
    );

    expect(label.textContent).toBe('Sobra · 309 × 2000 mm');
    expect(label.getAttribute('transform')).toMatch(/^rotate\(-90 /);
  });

  it('mantém a cota dentro da sobra encolhendo a fonte', () => {
    const { container } = render(
      <CuttingSheetSvg sheet={sheetWith([offcut('curta', 260, 130)])} />,
    );
    const [label] = Array.from(
      container.querySelectorAll('[data-offcut-label="true"]'),
    );
    const fontSize = Number(label.getAttribute('font-size'));
    const text = label.textContent ?? '';

    expect(fontSize).toBeGreaterThan(0);
    // Largura aproximada do texto precisa caber no lado maior da sobra.
    expect(text.length * 0.55 * fontSize).toBeLessThanOrEqual(260);
  });
});
