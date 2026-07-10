import React from 'react';

import type {
  CuttingPlanPlacement,
  CuttingPlanSheet,
  EdgeBandEdge,
} from '@/domain/cutting-plan';

interface CuttingSheetSvgProps {
  compact?: boolean;
  maxHeight?: string;
  onPieceSelect?: (placement: CuttingPlanPlacement) => void;
  selectedPieceId?: string;
  sheet: CuttingPlanSheet;
}

const safeSvgId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

const shortLabel = (placement: CuttingPlanPlacement) => {
  const instance = placement.pieceInstanceId.split('-').at(-1);
  return `${placement.description}${instance ? ` · ${instance}` : ''}`;
};

const edgeCoordinates = (
  placement: CuttingPlanPlacement,
  edge: EdgeBandEdge,
) => {
  const x1 = placement.xMm;
  const y1 = placement.yMm;
  const x2 = placement.xMm + placement.widthMm;
  const y2 = placement.yMm + placement.heightMm;
  switch (edge) {
    case 'top':
      return { x1, y1, x2, y2: y1 };
    case 'right':
      return { x1: x2, y1, x2, y2 };
    case 'bottom':
      return { x1, y1: y2, x2, y2 };
    case 'left':
      return { x1, y1, x2: x1, y2 };
  }
};

const grainLabel = (placement: CuttingPlanPlacement) =>
  placement.grainDirection === 'along_length'
    ? 'horizontal (lado maior)'
    : 'vertical (lado menor)';

export const CuttingSheetSvg = React.memo<CuttingSheetSvgProps>(
  ({ compact = false, maxHeight, onPieceSelect, selectedPieceId, sheet }) => {
    const sheetKey = safeSvgId(sheet.id);
    const offcutPatternId = `offcut-hatch-${sheetKey}`;
    const outerPatternId = `outer-hatch-${sheetKey}`;
    const internalTrimPatternId = `internal-trim-${sheetKey}`;
    const grainMarkerId = `grain-arrow-${sheetKey}`;
    const paddingX = sheet.totalWidthMm * 0.05;
    const paddingY = sheet.totalLengthMm * 0.05;
    const viewBox = [
      -paddingX,
      -paddingY,
      sheet.totalWidthMm + paddingX * 2,
      sheet.totalLengthMm + paddingY * 2,
    ].join(' ');
    const allEdges: EdgeBandEdge[] = ['top', 'right', 'bottom', 'left'];

    return (
      <svg
        role="img"
        aria-label={`Plano 2D da chapa ${sheet.number} — ${sheet.material.name}`}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        data-scale-unit="mm"
        data-sheet-width-mm={sheet.totalWidthMm}
        data-sheet-length-mm={sheet.totalLengthMm}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          maxHeight: maxHeight ?? (compact ? '218mm' : '760px'),
          background: '#fff',
        }}
      >
        <title>
          Chapa {sheet.number}: {sheet.totalWidthMm} × {sheet.totalLengthMm} mm
        </title>
        <defs>
          <pattern
            id={offcutPatternId}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="24" height="24" fill="#f8fafc" />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="24"
              stroke="#9ca3af"
              strokeWidth="5"
            />
          </pattern>
          <pattern
            id={outerPatternId}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="16" height="16" fill="#e5e7eb" />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="16"
              stroke="#6b7280"
              strokeWidth="3"
            />
          </pattern>
          <pattern
            id={internalTrimPatternId}
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <rect width="10" height="10" fill="#d1d5db" />
            <path
              d="M 0 10 L 10 0 M -2 2 L 2 -2 M 8 12 L 12 8"
              stroke="#111827"
              strokeWidth="2"
            />
          </pattern>
          <marker
            id={grainMarkerId}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#111827" />
          </marker>
          {sheet.placements.map(placement => (
            <clipPath
              key={placement.id}
              id={`piece-clip-${safeSvgId(placement.id)}`}
            >
              <rect
                x={placement.xMm + 2}
                y={placement.yMm + 2}
                width={Math.max(0, placement.widthMm - 4)}
                height={Math.max(0, placement.heightMm - 4)}
              />
            </clipPath>
          ))}
        </defs>

        <g aria-label="Dimensões totais da chapa">
          <line
            x1="0"
            y1={-paddingY * 0.45}
            x2={sheet.totalWidthMm}
            y2={-paddingY * 0.45}
            stroke="#111827"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="0"
            y1={-paddingY * 0.55}
            x2="0"
            y2={-paddingY * 0.35}
            stroke="#111827"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={sheet.totalWidthMm}
            y1={-paddingY * 0.55}
            x2={sheet.totalWidthMm}
            y2={-paddingY * 0.35}
            stroke="#111827"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={sheet.totalWidthMm / 2}
            y={-paddingY * 0.58}
            fontSize="28"
            fontWeight="700"
            textAnchor="middle"
            fill="#111827"
          >
            {sheet.totalWidthMm} mm
          </text>
          <line
            x1={-paddingX * 0.45}
            y1="0"
            x2={-paddingX * 0.45}
            y2={sheet.totalLengthMm}
            stroke="#111827"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={-paddingX * 0.65}
            y={sheet.totalLengthMm / 2}
            fontSize="28"
            fontWeight="700"
            textAnchor="middle"
            fill="#111827"
            transform={`rotate(-90 ${-paddingX * 0.65} ${sheet.totalLengthMm / 2})`}
          >
            {sheet.totalLengthMm} mm
          </text>
        </g>

        <rect
          x="0"
          y="0"
          width={sheet.totalWidthMm}
          height={sheet.totalLengthMm}
          fill={`url(#${outerPatternId})`}
          stroke="#111827"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          data-region="outer-margin"
        >
          <title>
            Margem externa nominal; incorporada à sobra quando não houver corte
            nesta direção
          </title>
        </rect>
        <rect
          x={sheet.usableArea.xMm}
          y={sheet.usableArea.yMm}
          width={sheet.usableArea.widthMm}
          height={sheet.usableArea.heightMm}
          fill="#ffffff"
          stroke="#6b7280"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />

        {sheet.wasteRegions.map(region => {
          const isOffcut = region.reason === 'remainder';
          const isInternalTrim = region.reason === 'internal_trim';
          const fill = isOffcut
            ? `url(#${offcutPatternId})`
            : isInternalTrim
              ? `url(#${internalTrimPatternId})`
              : '#4b5563';
          const title = isOffcut
            ? `Sobra ${region.widthMm.toFixed(1)} × ${region.heightMm.toFixed(1)} mm`
            : isInternalTrim
              ? `Ajuste interno ${Math.min(region.widthMm, region.heightMm).toFixed(1)} mm`
              : `Perda da serra ${Math.min(region.widthMm, region.heightMm).toFixed(1)} mm`;
          return (
            <g key={region.id} data-waste-reason={region.reason}>
              <title>{title}</title>
              <rect
                x={region.xMm}
                y={region.yMm}
                width={region.widthMm}
                height={region.heightMm}
                fill={fill}
                stroke={isInternalTrim ? '#111827' : '#6b7280'}
                strokeWidth={isInternalTrim ? '1.5' : '1'}
                strokeDasharray={isOffcut ? '5 4' : undefined}
                vectorEffect="non-scaling-stroke"
              />
              {isOffcut && region.widthMm >= 260 && region.heightMm >= 130 && (
                <text
                  x={region.xMm + region.widthMm / 2}
                  y={region.yMm + region.heightMm / 2}
                  fontSize="26"
                  fontWeight="600"
                  textAnchor="middle"
                  fill="#374151"
                  style={{
                    paintOrder: 'stroke',
                    stroke: '#fff',
                    strokeWidth: 8,
                  }}
                >
                  Sobra · {Math.round(region.widthMm)} ×{' '}
                  {Math.round(region.heightMm)}
                </text>
              )}
            </g>
          );
        })}

        {sheet.placements.map(placement => {
          const clipId = `piece-clip-${safeSvgId(placement.id)}`;
          const fontSize = Math.max(
            18,
            Math.min(38, placement.widthMm / 9, placement.heightMm / 5),
          );
          const showText = placement.widthMm >= 125 && placement.heightMm >= 75;
          const selected = selectedPieceId === placement.id;
          const interactive = Boolean(onPieceSelect);
          const selectPiece = () => onPieceSelect?.(placement);
          return (
            <g
              key={placement.id}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={
                interactive
                  ? `${shortLabel(placement)}, ${Math.round(placement.widthMm)} por ${Math.round(placement.heightMm)} milímetros`
                  : undefined
              }
              onClick={selectPiece}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectPiece();
                }
              }}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
              data-piece-id={placement.id}
            >
              <title>
                {shortLabel(placement)}: {Math.round(placement.widthMm)} ×{' '}
                {Math.round(placement.heightMm)} mm
                {placement.rotated ? ' (rotacionada)' : ''}
                {placement.grainDirection !== 'none'
                  ? `; veio ${grainLabel(placement)}`
                  : '; rotação livre'}
              </title>
              <rect
                x={placement.xMm}
                y={placement.yMm}
                width={placement.widthMm}
                height={placement.heightMm}
                fill="#ffffff"
              />
              {allEdges.map(edge => {
                const coordinates = edgeCoordinates(placement, edge);
                const banded = placement.edgeBandEdges.includes(edge);
                return (
                  <line
                    key={edge}
                    {...coordinates}
                    data-edge={edge}
                    data-banded={banded ? 'true' : 'false'}
                    stroke={banded ? '#050505' : '#9ca3af'}
                    strokeWidth={banded ? '3.5' : '1.25'}
                    strokeDasharray={banded ? undefined : '5 4'}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
              {selected && (
                <rect
                  x={placement.xMm + 2}
                  y={placement.yMm + 2}
                  width={Math.max(0, placement.widthMm - 4)}
                  height={Math.max(0, placement.heightMm - 4)}
                  fill="none"
                  stroke="#111827"
                  strokeWidth="3"
                  strokeDasharray="8 5"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              )}
              {showText && (
                <g clipPath={`url(#${clipId})`} pointerEvents="none">
                  <text
                    x={placement.xMm + placement.widthMm / 2}
                    y={placement.yMm + placement.heightMm / 2 - fontSize * 0.2}
                    fontSize={fontSize}
                    fontWeight="800"
                    textAnchor="middle"
                    fill="#111827"
                  >
                    {shortLabel(placement)}
                  </text>
                  <text
                    x={placement.xMm + placement.widthMm / 2}
                    y={placement.yMm + placement.heightMm / 2 + fontSize}
                    fontSize={fontSize * 0.78}
                    textAnchor="middle"
                    fill="#374151"
                  >
                    {Math.round(placement.widthMm)} ×{' '}
                    {Math.round(placement.heightMm)} mm
                  </text>
                </g>
              )}
              {placement.grainDirection !== 'none' && (
                <line
                  x1={placement.xMm + placement.widthMm * 0.84}
                  y1={placement.yMm + placement.heightMm * 0.28}
                  x2={placement.xMm + placement.widthMm * 0.84}
                  y2={placement.yMm + placement.heightMm * 0.72}
                  stroke="#111827"
                  strokeWidth="2"
                  markerEnd={`url(#${grainMarkerId})`}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        <g aria-label="Sentido do veio da chapa: comprimento de 2750 milímetros">
          <line
            x1={sheet.totalWidthMm + paddingX * 0.45}
            y1={sheet.totalLengthMm * 0.2}
            x2={sheet.totalWidthMm + paddingX * 0.45}
            y2={sheet.totalLengthMm * 0.8}
            stroke="#111827"
            strokeWidth="2"
            markerEnd={`url(#${grainMarkerId})`}
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={sheet.totalWidthMm + paddingX * 0.72}
            y={sheet.totalLengthMm / 2}
            fontSize="23"
            fontWeight="700"
            textAnchor="middle"
            fill="#111827"
            transform={`rotate(90 ${sheet.totalWidthMm + paddingX * 0.72} ${sheet.totalLengthMm / 2})`}
          >
            VEIO DA CHAPA · {sheet.totalLengthMm} mm
          </text>
        </g>
      </svg>
    );
  },
);

CuttingSheetSvg.displayName = 'CuttingSheetSvg';
