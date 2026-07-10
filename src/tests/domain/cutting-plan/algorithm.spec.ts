import type {
  CuttingPlanInput,
  CuttingPlanOptimizationMode,
  CuttingPlanPiece,
} from '@/domain/cutting-plan';
import {
  DEFAULT_CUTTING_PLAN_SETTINGS,
  generateCuttingPlan,
  getPieceCompatibilityKey,
} from '@/domain/cutting-plan';

const material = {
  id: 'mdf-15',
  name: 'MDF Branco 15mm',
  unitPrice: 200,
};

const piece = (
  overrides: Partial<CuttingPlanPiece> = {},
): CuttingPlanPiece => ({
  id: 'piece-1',
  referenceItemId: 'item-1',
  description: 'Lateral',
  widthMm: 400,
  lengthMm: 800,
  quantity: 1,
  materialId: material.id,
  thicknessMm: 15,
  grainDirection: 'none',
  canRotate: true,
  edgeBandEdges: [],
  ...overrides,
});

const input = (
  pieces: CuttingPlanPiece[],
  optimizationMode: CuttingPlanOptimizationMode = 'balanced',
  settings = DEFAULT_CUTTING_PLAN_SETTINGS,
): CuttingPlanInput => ({
  pieces,
  materials: [material],
  settings,
  optimizationMode,
});

describe('guillotine cutting plan algorithm', () => {
  it('gera uma chapa para uma única peça e inclui os quatro refinos', () => {
    const result = generateCuttingPlan(input([piece()]));

    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].placements).toHaveLength(1);
    expect(result.cutSequence.filter(cut => cut.kind === 'edge_trim')).toHaveLength(
      4,
    );
    expect(result.metrics.movementCount).toBe(result.cutSequence.length);
  });

  it('mantém identificação individual para peças repetidas', () => {
    const result = generateCuttingPlan(input([piece({ quantity: 3 })]));
    const ids = result.sheets.flatMap(sheet =>
      sheet.placements.map(placement => placement.pieceInstanceId),
    );

    expect(ids).toEqual(['piece-1-001', 'piece-1-002', 'piece-1-003']);
    expect(new Set(ids).size).toBe(3);
  });

  it('considera o kerf entre duas peças', () => {
    const settings = {
      ...DEFAULT_CUTTING_PLAN_SETTINGS,
      sheetWidthMm: 100,
      sheetLengthMm: 100,
      edgeTrimMm: 0,
      internalCutLossMm: 0,
      reusableWasteMinWidthMm: 10,
      reusableWasteMinLengthMm: 10,
    };
    const pieces = [
      piece({ id: 'a', widthMm: 50, lengthMm: 100, canRotate: false }),
      piece({ id: 'b', widthMm: 49, lengthMm: 100, canRotate: false }),
    ];

    expect(
      generateCuttingPlan(input(pieces, 'balanced', { ...settings, kerfMm: 1 }))
        .metrics.sheetCount,
    ).toBe(1);
    expect(
      generateCuttingPlan(input(pieces, 'balanced', { ...settings, kerfMm: 2 }))
        .metrics.sheetCount,
    ).toBe(2);
  });

  it('registra separadamente a perda interna de 15mm em cortes aninhados', () => {
    const result = generateCuttingPlan(
      input(
        [piece({ widthMm: 400, lengthMm: 800 })],
        'balanced',
        DEFAULT_CUTTING_PLAN_SETTINGS,
      ),
    );
    const pieceCuts = result.cutSequence.filter(cut => cut.kind === 'piece');

    expect(pieceCuts).toHaveLength(2);
    expect(pieceCuts.map(cut => cut.kerfLossMm)).toEqual([3.2, 3.2]);
    expect(pieceCuts.map(cut => cut.internalCutLossMm)).toEqual([0, 15]);
  });

  it('refina as bordas por direção e só vira as tiras depois dos cortes longitudinais', () => {
    const result = generateCuttingPlan(
      input(
        [
          piece({
            widthMm: 500,
            lengthMm: 2730,
            quantity: 3,
            canRotate: false,
          }),
        ],
        'fewer_cuts',
      ),
    );
    const cuts = result.sheets[0].cuts;
    const primaryOrientation = cuts[0].orientation;
    const secondaryOrientation =
      primaryOrientation === 'vertical' ? 'horizontal' : 'vertical';
    const firstSecondaryTrim = cuts.findIndex(
      cut =>
        cut.kind === 'edge_trim' && cut.orientation === secondaryOrientation,
    );
    const lastPrimaryPieceCut = cuts.reduce(
      (last, cut, index) =>
        cut.kind === 'piece' && cut.orientation === primaryOrientation
          ? index
          : last,
      -1,
    );

    expect(cuts.slice(0, 2).every(cut => cut.kind === 'edge_trim')).toBe(true);
    expect(cuts[2].kind).toBe('piece');
    expect(firstSecondaryTrim).toBeGreaterThan(lastPrimaryPieceCut);
    expect(
      cuts
        .slice(firstSecondaryTrim)
        .filter(cut => cut.kind === 'edge_trim')
        .every(cut => cut.orientation === secondaryOrientation),
    ).toBe(true);
  });

  it('usa várias chapas quando necessário e nunca sobrepõe as peças', () => {
    const result = generateCuttingPlan(
      input([piece({ widthMm: 1800, lengthMm: 2700, quantity: 2 })]),
    );

    expect(result.metrics.sheetCount).toBe(2);
    result.sheets.forEach(sheet => {
      expect(sheet.placements).toHaveLength(1);
    });
  });

  it('bloqueia a rotação quando há sentido de veio', () => {
    const settings = {
      ...DEFAULT_CUTTING_PLAN_SETTINGS,
      sheetWidthMm: 500,
      sheetLengthMm: 900,
      edgeTrimMm: 0,
    };

    expect(() =>
      generateCuttingPlan(
        input(
          [
            piece({
              widthMm: 800,
              lengthMm: 400,
              grainDirection: 'along_length',
            }),
          ],
          'balanced',
          settings,
        ),
      ),
    ).toThrow('não cabe');
    expect(
      generateCuttingPlan(
        input([piece({ widthMm: 800, lengthMm: 400 })], 'balanced', settings),
      ).sheets[0].placements[0].rotated,
    ).toBe(true);
  });

  it('separa grupos incompatíveis por material, espessura e acabamento', () => {
    const result = generateCuttingPlan(
      input([
        piece({ id: 'a', thicknessMm: 15, finish: 'fosco' }),
        piece({ id: 'b', thicknessMm: 18, finish: 'fosco' }),
        piece({ id: 'c', thicknessMm: 15, finish: 'brilho' }),
      ]),
    );

    expect(result.metrics.sheetCount).toBe(3);
    expect(
      getPieceCompatibilityKey(piece({ thicknessMm: 15, finish: 'fosco' })),
    ).not.toBe(
      getPieceCompatibilityKey(piece({ thicknessMm: 18, finish: 'fosco' })),
    );
  });

  it.each<CuttingPlanOptimizationMode>([
    'fewer_cuts',
    'best_yield',
    'balanced',
  ])('executa o modo de otimização %s', mode => {
    const result = generateCuttingPlan(
      input(
        [
          piece({ id: 'a', widthMm: 1000, lengthMm: 500, quantity: 2 }),
          piece({ id: 'b', widthMm: 600, lengthMm: 800, quantity: 2 }),
        ],
        mode,
      ),
    );

    expect(result.optimizationMode).toBe(mode);
    expect(result.metrics.sheetCount).toBeGreaterThan(0);
    expect(result.metrics.utilizationPercentage).toBeGreaterThan(0);
  });

  it('prioriza movimentos no modo fewer_cuts e chapas no best_yield', () => {
    const pieces = [
      piece({ id: 'a', widthMm: 900, lengthMm: 400, quantity: 3 }),
      piece({ id: 'b', widthMm: 500, lengthMm: 700, quantity: 3 }),
      piece({ id: 'c', widthMm: 350, lengthMm: 1000, quantity: 2 }),
    ];
    const fewerCuts = generateCuttingPlan(input(pieces, 'fewer_cuts'));
    const bestYield = generateCuttingPlan(input(pieces, 'best_yield'));

    expect(fewerCuts.metrics.movementCount).toBeLessThanOrEqual(
      bestYield.metrics.movementCount,
    );
    expect(bestYield.metrics.sheetCount).toBeLessThanOrEqual(
      fewerCuts.metrics.sheetCount,
    );
  });

  it('é determinístico para a mesma entrada', () => {
    const planInput = input([piece({ quantity: 4 })]);
    expect(generateCuttingPlan(planInput)).toEqual(generateCuttingPlan(planInput));
  });

  it('rejeita lista vazia e peça maior que a área útil', () => {
    expect(() => generateCuttingPlan(input([]))).toThrow('ao menos uma peça');
    expect(() =>
      generateCuttingPlan(input([piece({ widthMm: 1900, lengthMm: 2800 })])),
    ).toThrow('não cabe');
  });
});
