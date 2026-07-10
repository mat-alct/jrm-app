import React, { useMemo } from 'react';

import type {
  CuttingPlanPlacement,
  CuttingPlanSheet,
} from '@/domain/cutting-plan';

interface CuttingSheetSvgProps {
  compact?: boolean;
  sheet: CuttingPlanSheet;
  showCutNumbers?: boolean;
}

const PIECE_COLORS = [
  '#fed7aa',
  '#fde68a',
  '#bfdbfe',
  '#c7d2fe',
  '#ddd6fe',
  '#fbcfe8',
  '#a7f3d0',
  '#bae6fd',
];

const colorForPiece = (pieceId: string) => {
  const hash = [...pieceId].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return PIECE_COLORS[hash % PIECE_COLORS.length];
};

const shortLabel = (placement: CuttingPlanPlacement) => {
  const instance = placement.pieceInstanceId.split('-').at(-1);
  return `${placement.description}${instance ? ` · ${instance}` : ''}`;
};

export const CuttingSheetSvg = React.memo<CuttingSheetSvgProps>(
  ({ compact = false, sheet, showCutNumbers = true }) => {
    const markerId = `grain-arrow-${sheet.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const pieceCuts = useMemo(
      () => sheet.cuts.filter(cut => cut.kind === 'piece'),
      [sheet.cuts],
    );
    const trim = sheet.usableArea.xMm;

    return (
      <svg
        role="img"
        aria-label={`Plano 2D da chapa ${sheet.number} — ${sheet.material.name}`}
        viewBox={`0 0 ${sheet.totalWidthMm} ${sheet.totalLengthMm}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          display: 'block',
          width: '100%',
          maxHeight: compact ? '218mm' : '760px',
          background: '#fff',
        }}
      >
        <title>
          Chapa {sheet.number}: {sheet.totalWidthMm} × {sheet.totalLengthMm} mm
        </title>
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#334155" />
          </marker>
          {sheet.placements.map(placement => (
            <clipPath key={placement.id} id={`clip-${placement.id}`}>
              <rect
                x={placement.xMm + 2}
                y={placement.yMm + 2}
                width={Math.max(0, placement.widthMm - 4)}
                height={Math.max(0, placement.heightMm - 4)}
              />
            </clipPath>
          ))}
        </defs>

        <rect
          x="0"
          y="0"
          width={sheet.totalWidthMm}
          height={sheet.totalLengthMm}
          fill="#fee2e2"
          stroke="#111827"
          strokeWidth="8"
        />
        <rect
          x={sheet.usableArea.xMm}
          y={sheet.usableArea.yMm}
          width={sheet.usableArea.widthMm}
          height={sheet.usableArea.heightMm}
          fill="#f8fafc"
          stroke="#64748b"
          strokeWidth="4"
        />

        {trim > 0 && !compact && (
          <text
            x={sheet.totalWidthMm / 2}
            y={Math.max(9, trim * 0.75)}
            fontSize={Math.max(8, Math.min(22, trim * 0.65))}
            textAnchor="middle"
            fill="#991b1b"
          >
            Refino {trim} mm
          </text>
        )}

        {sheet.wasteRegions.map(region => (
          <g key={region.id}>
            <rect
              x={region.xMm}
              y={region.yMm}
              width={region.widthMm}
              height={region.heightMm}
              fill={region.reusable ? '#bbf7d0' : '#e5e7eb'}
              stroke={region.reusable ? '#15803d' : '#94a3b8'}
              strokeWidth="2"
              strokeDasharray={region.reusable ? '16 8' : '8 6'}
            />
            {region.reason === 'remainder' &&
              region.widthMm >= 260 &&
              region.heightMm >= 130 && (
                <text
                  x={region.xMm + region.widthMm / 2}
                  y={region.yMm + region.heightMm / 2}
                  fontSize="28"
                  textAnchor="middle"
                  fill={region.reusable ? '#166534' : '#475569'}
                >
                  {region.reusable ? 'Sobra' : 'Descarte'} ·{' '}
                  {Math.round(region.widthMm)} × {Math.round(region.heightMm)}
                </text>
              )}
          </g>
        ))}

        {sheet.placements.map(placement => {
          const fontSize = Math.max(
            20,
            Math.min(44, placement.widthMm / 9, placement.heightMm / 5),
          );
          const showText =
            placement.widthMm >= 125 && placement.heightMm >= 75;
          const grainIsHorizontal =
            placement.grainDirection === 'along_width';
          return (
            <g key={placement.id}>
              <title>
                {shortLabel(placement)}: {Math.round(placement.widthMm)} ×{' '}
                {Math.round(placement.heightMm)} mm
                {placement.rotated ? ' (rotacionada)' : ''}
              </title>
              <rect
                x={placement.xMm}
                y={placement.yMm}
                width={placement.widthMm}
                height={placement.heightMm}
                fill={colorForPiece(placement.originalPieceId)}
                stroke="#1f2937"
                strokeWidth="4"
              />
              {placement.edgeBandEdges.includes('top') && (
                <line
                  x1={placement.xMm}
                  y1={placement.yMm + 5}
                  x2={placement.xMm + placement.widthMm}
                  y2={placement.yMm + 5}
                  stroke="#7c3aed"
                  strokeWidth="10"
                />
              )}
              {placement.edgeBandEdges.includes('bottom') && (
                <line
                  x1={placement.xMm}
                  y1={placement.yMm + placement.heightMm - 5}
                  x2={placement.xMm + placement.widthMm}
                  y2={placement.yMm + placement.heightMm - 5}
                  stroke="#7c3aed"
                  strokeWidth="10"
                />
              )}
              {placement.edgeBandEdges.includes('left') && (
                <line
                  x1={placement.xMm + 5}
                  y1={placement.yMm}
                  x2={placement.xMm + 5}
                  y2={placement.yMm + placement.heightMm}
                  stroke="#7c3aed"
                  strokeWidth="10"
                />
              )}
              {placement.edgeBandEdges.includes('right') && (
                <line
                  x1={placement.xMm + placement.widthMm - 5}
                  y1={placement.yMm}
                  x2={placement.xMm + placement.widthMm - 5}
                  y2={placement.yMm + placement.heightMm}
                  stroke="#7c3aed"
                  strokeWidth="10"
                />
              )}
              {showText && (
                <g clipPath={`url(#clip-${placement.id})`}>
                  <text
                    x={placement.xMm + placement.widthMm / 2}
                    y={placement.yMm + placement.heightMm / 2 - fontSize * 0.25}
                    fontSize={fontSize}
                    fontWeight="700"
                    textAnchor="middle"
                    fill="#111827"
                  >
                    {shortLabel(placement)}
                  </text>
                  <text
                    x={placement.xMm + placement.widthMm / 2}
                    y={placement.yMm + placement.heightMm / 2 + fontSize}
                    fontSize={fontSize * 0.8}
                    textAnchor="middle"
                    fill="#334155"
                  >
                    {Math.round(placement.widthMm)} ×{' '}
                    {Math.round(placement.heightMm)} mm
                  </text>
                </g>
              )}
              {placement.grainDirection !== 'none' && (
                <line
                  x1={
                    grainIsHorizontal
                      ? placement.xMm + placement.widthMm * 0.25
                      : placement.xMm + placement.widthMm * 0.82
                  }
                  y1={
                    grainIsHorizontal
                      ? placement.yMm + placement.heightMm * 0.82
                      : placement.yMm + placement.heightMm * 0.25
                  }
                  x2={
                    grainIsHorizontal
                      ? placement.xMm + placement.widthMm * 0.75
                      : placement.xMm + placement.widthMm * 0.82
                  }
                  y2={
                    grainIsHorizontal
                      ? placement.yMm + placement.heightMm * 0.82
                      : placement.yMm + placement.heightMm * 0.75
                  }
                  stroke="#334155"
                  strokeWidth="8"
                  markerEnd={`url(#${markerId})`}
                />
              )}
            </g>
          );
        })}

        {pieceCuts.map(cut => {
          const isVertical = cut.orientation === 'vertical';
          const middleX = isVertical
            ? cut.positionMm
            : cut.startMm + cut.lengthMm / 2;
          const middleY = isVertical
            ? cut.startMm + cut.lengthMm / 2
            : cut.positionMm;
          return (
            <g key={cut.id}>
              <line
                x1={isVertical ? cut.positionMm : cut.startMm}
                y1={isVertical ? cut.startMm : cut.positionMm}
                x2={isVertical ? cut.positionMm : cut.startMm + cut.lengthMm}
                y2={isVertical ? cut.startMm + cut.lengthMm : cut.positionMm}
                stroke="#dc2626"
                strokeWidth="5"
                strokeDasharray="20 12"
              />
              {showCutNumbers && (
                <g>
                  <circle cx={middleX} cy={middleY} r="23" fill="#991b1b" />
                  <text
                    x={middleX}
                    y={middleY + 9}
                    fontSize="25"
                    fontWeight="700"
                    textAnchor="middle"
                    fill="#fff"
                  >
                    {cut.step}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    );
  },
);

CuttingSheetSvg.displayName = 'CuttingSheetSvg';
