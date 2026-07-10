import {
  countCorners,
  emptyCorners,
  TagSchemaSvg,
} from '@/components/NewOrder/TagSchemaSvg';

import { fireEvent, render } from '../../testUtils';

describe('countCorners', () => {
  it('conta 0 quando nao ha cantos', () => {
    expect(countCorners()).toBe(0);
    expect(countCorners(emptyCorners())).toBe(0);
  });

  it('conta cada canto marcado', () => {
    expect(countCorners({ tl: true, tr: false, bl: false, br: false })).toBe(1);
    expect(countCorners({ tl: true, tr: true, bl: false, br: false })).toBe(2);
    expect(countCorners({ tl: true, tr: true, bl: true, br: true })).toBe(4);
  });
});

describe('emptyCorners', () => {
  it('devolve os quatro cantos desmarcados', () => {
    expect(emptyCorners()).toEqual({ tl: false, tr: false, bl: false, br: false });
  });

  it('devolve um objeto novo a cada chamada', () => {
    expect(emptyCorners()).not.toBe(emptyCorners());
  });
});

describe('TagSchemaSvg', () => {
  it('usa opacidade cheia na borda presente e reduzida na ausente', () => {
    const { container } = render(<TagSchemaSvg gborder={1} pborder={0} />);

    const opacities = Array.from(container.querySelectorAll('[opacity]')).map(node =>
      node.getAttribute('opacity'),
    );

    expect(opacities).toContain('1');
    expect(opacities).toContain('0.3');
  });

  it('amplia o viewBox no modo interativo, para caber os cantos clicaveis', () => {
    const { container: still } = render(<TagSchemaSvg gborder={0} pborder={0} />);
    const { container: interactive } = render(
      <TagSchemaSvg gborder={0} pborder={0} interactive onToggleCorner={jest.fn()} />,
    );

    expect(still.querySelector('svg')).toHaveAttribute('viewBox', '0 0 76 76');
    expect(interactive.querySelector('svg')).toHaveAttribute('viewBox', '-10 -10 96 96');
  });

  it('nao expoe cantos clicaveis fora do modo interativo', () => {
    const onToggleCorner = jest.fn();
    const { container } = render(
      <TagSchemaSvg gborder={0} pborder={0} onToggleCorner={onToggleCorner} />,
    );

    const clickable = container.querySelectorAll('[style*="cursor: pointer"]');
    expect(clickable).toHaveLength(0);
  });

  it('avisa qual canto foi clicado no modo interativo', () => {
    const onToggleCorner = jest.fn();
    const { container } = render(
      <TagSchemaSvg
        gborder={1}
        pborder={1}
        corners={emptyCorners()}
        interactive
        onToggleCorner={onToggleCorner}
      />,
    );

    const corners = container.querySelectorAll('[style*="cursor: pointer"]');
    expect(corners).toHaveLength(4);

    fireEvent.click(corners[0]);
    expect(onToggleCorner).toHaveBeenCalledTimes(1);
    expect(['tl', 'tr', 'bl', 'br']).toContain(onToggleCorner.mock.calls[0][0]);

    fireEvent.click(corners[3]);
    expect(onToggleCorner).toHaveBeenCalledTimes(2);
    expect(onToggleCorner.mock.calls[0][0]).not.toBe(onToggleCorner.mock.calls[1][0]);
  });
});
