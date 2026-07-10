import type {
  CuttingPlanPiece,
  CuttingPlanPlacement,
} from '@/domain/cutting-plan';
import {
  calculateEdgeBandLengthMeters,
  DEFAULT_CUTTING_PLAN_SETTINGS,
  getPieceOrientations,
  getUsableSheetArea,
  hasOverlappingPlacements,
  isReusableRegion,
} from '@/domain/cutting-plan';

const piece = (
  overrides: Partial<CuttingPlanPiece> = {},
): CuttingPlanPiece => ({
  id: 'piece-1',
  referenceItemId: 'item-1',
  description: 'Lateral',
  widthMm: 400,
  lengthMm: 800,
  quantity: 1,
  materialId: 'material-1',
  grainDirection: 'none',
  canRotate: true,
  edgeBandEdges: [],
  ...overrides,
});

describe('cutting plan geometry', () => {
  it('calcula a área útil descontando o refino em todos os lados', () => {
    expect(getUsableSheetArea(DEFAULT_CUTTING_PLAN_SETTINGS)).toMatchObject({
      xMm: 10,
      yMm: 10,
      widthMm: 1830,
      heightMm: 2730,
    });
  });

  it('rejeita refino que elimina a área útil', () => {
    expect(() =>
      getUsableSheetArea({
        ...DEFAULT_CUTTING_PLAN_SETTINGS,
        edgeTrimMm: 1000,
      }),
    ).toThrow('dimensões da chapa');
  });

  it('oferece rotação somente quando permitida e sem veio obrigatório', () => {
    expect(getPieceOrientations(piece())).toEqual([
      { widthMm: 400, heightMm: 800, rotated: false },
      { widthMm: 800, heightMm: 400, rotated: true },
    ]);
    expect(getPieceOrientations(piece({ canRotate: false }))).toHaveLength(1);
    expect(
      getPieceOrientations(piece({ grainDirection: 'along_length' })),
    ).toHaveLength(1);
  });

  it('detecta sobreposição, mas aceita peças apenas encostadas', () => {
    const placement = (
      id: string,
      xMm: number,
      yMm: number,
    ): CuttingPlanPlacement => ({
      id,
      pieceInstanceId: id,
      originalPieceId: id,
      referenceItemId: id,
      description: id,
      xMm,
      yMm,
      widthMm: 100,
      heightMm: 100,
      rotated: false,
      sourceRegionId: id,
      grainDirection: 'none',
      edgeBandEdges: [],
    });

    expect(
      hasOverlappingPlacements([
        placement('a', 0, 0),
        placement('b', 99, 0),
      ]),
    ).toBe(true);
    expect(
      hasOverlappingPlacements([
        placement('a', 0, 0),
        placement('b', 100, 0),
      ]),
    ).toBe(false);
  });

  it('calcula a fita pelas arestas e pela quantidade de cada peça', () => {
    expect(
      calculateEdgeBandLengthMeters([
        piece({
          quantity: 2,
          edgeBandEdges: ['top', 'bottom', 'left'],
        }),
      ]),
    ).toBe(3.2);
  });

  it('classifica sobras reutilizáveis também quando giradas', () => {
    expect(
      isReusableRegion(
        { widthMm: 500, heightMm: 300 },
        DEFAULT_CUTTING_PLAN_SETTINGS,
      ),
    ).toBe(true);
    expect(
      isReusableRegion(
        { widthMm: 299, heightMm: 500 },
        DEFAULT_CUTTING_PLAN_SETTINGS,
      ),
    ).toBe(false);
  });
});
