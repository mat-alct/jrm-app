import React from 'react';

import { RoundedCorners } from '../../types';

interface TagSchemaSvgProps {
  // Borda canônica (gborder = lado maior; pborder = lado menor)
  // Mantém compatibilidade com sortAndReturnTag.
  gborder: number;
  pborder: number;
  corners?: RoundedCorners;
  size?: number;
  interactive?: boolean;
  onToggleCorner?: (corner: keyof RoundedCorners) => void;
}

const CORNER_RADIUS = 14;

// As 4 quinas em coordenadas SVG (76x76):
// tl = topo-esquerda, tr = topo-direita, bl = base-esquerda, br = base-direita
const CORNER_POS: Record<keyof RoundedCorners, { x: number; y: number }> = {
  tl: { x: 5.5, y: 13.5 },
  tr: { x: 70.5, y: 13.5 },
  bl: { x: 5.5, y: 57.5 },
  br: { x: 70.5, y: 57.5 },
};

// Opacidade conforme borda (replica o padrão dos SVGs estáticos):
// 0 = sem fita (0.3), 1 = fita simples (1), 2 = fita reforçada (1).
const opacityFor = (border: number) => (border > 0 ? 1 : 0.3);

export const TagSchemaSvg: React.FC<TagSchemaSvgProps> = ({
  gborder,
  pborder,
  corners,
  size = 76,
  interactive = false,
  onToggleCorner,
}) => {
  const c = corners ?? { tl: false, tr: false, bl: false, br: false };

  // Pontos de início/fim de cada lado, descontando o raio quando o canto
  // adjacente é arredondado, para a curva ficar contínua.
  const r = CORNER_RADIUS;
  const top = {
    x1: c.tl ? 3 + r : 3,
    x2: c.tr ? 73 - r : 73,
    y: 13.5,
  };
  const bottom = {
    x1: c.bl ? 3 + r : 3,
    x2: c.br ? 73 - r : 73,
    y: 57.5,
  };
  const left = {
    x: 5.5,
    y1: c.tl ? 16 + r : 16,
    y2: c.bl ? 55 - r : 55,
  };
  const right = {
    x: 70.5,
    y1: c.tr ? 16 + r : 16,
    y2: c.br ? 55 - r : 55,
  };

  // Cada canto arredondado é um arco quarto-de-círculo entre lado horizontal
  // e lado vertical. A opacidade segue a do lado adjacente "mais forte" (>0).
  const arcOpacity = (h: number, v: number) =>
    Math.max(opacityFor(h), opacityFor(v));

  const arcs: { d: string; opacity: number; key: keyof RoundedCorners }[] = [];
  if (c.tl) {
    arcs.push({
      key: 'tl',
      d: `M ${3 + r} 13.5 A ${r} ${r} 0 0 0 5.5 ${16 + r}`,
      opacity: arcOpacity(gborder, pborder),
    });
  }
  if (c.tr) {
    arcs.push({
      key: 'tr',
      d: `M ${73 - r} 13.5 A ${r} ${r} 0 0 1 70.5 ${16 + r}`,
      opacity: arcOpacity(gborder, pborder),
    });
  }
  if (c.bl) {
    arcs.push({
      key: 'bl',
      d: `M 5.5 ${55 - r} A ${r} ${r} 0 0 0 ${3 + r} 57.5`,
      opacity: arcOpacity(gborder, pborder),
    });
  }
  if (c.br) {
    arcs.push({
      key: 'br',
      d: `M 70.5 ${55 - r} A ${r} ${r} 0 0 1 ${73 - r} 57.5`,
      opacity: arcOpacity(gborder, pborder),
    });
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={interactive ? '-10 -10 96 96' : '0 0 76 76'}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <rect width="76" height="76" fill="white" />
      {/* Lados */}
      <line
        opacity={opacityFor(gborder)}
        x1={top.x1}
        y1={top.y}
        x2={top.x2}
        y2={top.y}
        stroke="black"
        strokeWidth="5"
      />
      <line
        opacity={opacityFor(gborder)}
        x1={bottom.x1}
        y1={bottom.y}
        x2={bottom.x2}
        y2={bottom.y}
        stroke="black"
        strokeWidth="5"
      />
      <line
        opacity={opacityFor(pborder)}
        x1={left.x}
        y1={left.y1}
        x2={left.x}
        y2={left.y2}
        stroke="black"
        strokeWidth="5"
      />
      <line
        opacity={opacityFor(pborder)}
        x1={right.x}
        y1={right.y1}
        x2={right.x}
        y2={right.y2}
        stroke="black"
        strokeWidth="5"
      />
      {/* Cantos arredondados */}
      {arcs.map(arc => (
        <path
          key={arc.key}
          d={arc.d}
          stroke="black"
          strokeWidth="5"
          opacity={arc.opacity}
          fill="none"
        />
      ))}
      {/* Hit areas interativas — círculo grande clicável em cada canto */}
      {interactive &&
        (Object.keys(CORNER_POS) as (keyof RoundedCorners)[]).map(key => {
          const pos = CORNER_POS[key];
          const active = c[key];
          return (
            <g
              key={key}
              onClick={() => onToggleCorner?.(key)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={7}
                fill={active ? '#805ad5' : 'white'}
                stroke={active ? '#805ad5' : '#cbd5e0'}
                strokeWidth={1.5}
              />
            </g>
          );
        })}
    </svg>
  );
};

export const countCorners = (corners?: RoundedCorners): number => {
  if (!corners) return 0;
  return (
    (corners.tl ? 1 : 0) +
    (corners.tr ? 1 : 0) +
    (corners.bl ? 1 : 0) +
    (corners.br ? 1 : 0)
  );
};

export const emptyCorners = (): RoundedCorners => ({
  tl: false,
  tr: false,
  bl: false,
  br: false,
});
