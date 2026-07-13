import type {
  CuttingPlanInput,
  CuttingPlanOptimizationMode,
  CuttingPlanPiece,
} from '@/domain/cutting-plan';
import {
  DEFAULT_CUTTING_PLAN_SETTINGS,
  generateCuttingPlan,
  getPieceCompatibilityKey,
  searchCuttingPlan,
} from '@/domain/cutting-plan';

const material = {
  id: 'mdf-15',
  name: 'MDF Branco 15mm',
  thicknessMm: 15,
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
  it('embute as bordas sem criar refilos na sobra não utilizada', () => {
    const result = generateCuttingPlan(input([piece()]));

    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].placements).toHaveLength(1);
    expect(
      result.cutSequence.filter(cut => cut.kind === 'edge_trim'),
    ).toHaveLength(2);
    expect(result.metrics.movementCount).toBe(4);
    expect(result.metrics.movementCount).toBe(result.cutSequence.length);
    const remainders = result.sheets[0].wasteRegions.filter(
      region => region.reason === 'remainder',
    );
    expect(
      remainders.some(
        region =>
          Math.abs(region.xMm + region.widthMm - 1850) < 0.001 ||
          Math.abs(region.yMm + region.heightMm - 2750) < 0.001,
      ),
    ).toBe(true);
  });

  it('não cria cortes internos quando a peça ocupa exatamente a área útil', () => {
    const settings = {
      ...DEFAULT_CUTTING_PLAN_SETTINGS,
      sheetWidthMm: 100,
      sheetLengthMm: 100,
      edgeTrimMm: 10,
    };
    const result = generateCuttingPlan(
      input(
        [piece({ widthMm: 80, lengthMm: 80, canRotate: false })],
        'balanced',
        settings,
      ),
    );

    expect(result.cutSequence.filter(cut => cut.kind === 'piece')).toHaveLength(
      0,
    );
    expect(result.metrics.movementCount).toBe(4);
    expect(result.sheets[0].placements[0]).toMatchObject({
      widthMm: 80,
      heightMm: 80,
    });
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
      internalEdgeTrimMm: 0,
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

  it('não repete acerto nas bordas herdadas da chapa refilada', () => {
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
    expect(pieceCuts.map(cut => cut.internalCutLossMm)).toEqual([0, 0]);
    expect(
      result.sheets[0].wasteRegions.filter(
        region => region.reason === 'internal_trim',
      ),
    ).toHaveLength(0);
  });

  it('preserva a faixa completa refilada ao mudar a direção do corte', () => {
    const settings = {
      ...DEFAULT_CUTTING_PLAN_SETTINGS,
      sheetWidthMm: 100,
      sheetLengthMm: 100,
      edgeTrimMm: 0,
      kerfMm: 2,
    };
    // Rasgadas em duas tiras de 45 (45 + 2 + 45 = 92), as peças só cabem
    // duas por tira se o acerto couber junto: 44 + 15 + 2 + 44 = 105 > 100.
    const pieces = [
      piece({
        widthMm: 45,
        lengthMm: 44,
        quantity: 4,
        canRotate: false,
      }),
    ];
    const withoutInternalLoss = generateCuttingPlan(
      input(pieces, 'best_yield', { ...settings, internalEdgeTrimMm: 0 }),
    );
    const withInternalLoss = generateCuttingPlan(
      input(pieces, 'best_yield', { ...settings, internalEdgeTrimMm: 7.5 }),
    );

    expect(withoutInternalLoss.metrics.sheetCount).toBe(1);
    expect(withInternalLoss.metrics.sheetCount).toBe(1);
  });

  it('não cobra acerto ao virar uma faixa que conserva as bordas refiladas', () => {
    const result = generateCuttingPlan(
      input(
        [
          piece({ id: 'tira', widthMm: 2000, lengthMm: 300, quantity: 5 }),
          piece({ id: 'painel', widthMm: 1600, lengthMm: 350, quantity: 2 }),
        ],
        'best_yield',
        DEFAULT_CUTTING_PLAN_SETTINGS,
      ),
    );
    const pieceCuts = result.cutSequence.filter(cut => cut.kind === 'piece');

    // A serra entra em todo corte; o acerto entra uma vez por painel virado.
    expect(pieceCuts.every(cut => cut.kerfLossMm === 3.2)).toBe(true);
    expect(pieceCuts.every(cut => cut.internalCutLossMm === 0)).toBe(true);

    // As sete peças cabem numa chapa só porque as bordas refiladas da faixa
    // dispensam novo acerto: 5 × 300 + 4 × 3,2 = 1512,8 ≤ 1830.
    expect(result.metrics.sheetCount).toBe(1);
  });

  it('acomoda seis peças de 2000x300 e duas de 1600x300 em uma chapa', () => {
    const result = generateCuttingPlan(
      input([
        piece({
          id: 'longa',
          widthMm: 2000,
          lengthMm: 300,
          quantity: 6,
        }),
        piece({
          id: 'curta',
          widthMm: 1600,
          lengthMm: 300,
          quantity: 2,
        }),
      ]),
    );

    expect(result.metrics.sheetCount).toBe(1);
    expect(result.sheets[0].placements).toHaveLength(8);
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

    expect(cuts[0].kind).toBe('edge_trim');
    expect(cuts[1].kind).toBe('piece');
    expect(firstSecondaryTrim).toBeGreaterThan(lastPrimaryPieceCut);
    const trimsAfterTurningStrips = cuts
      .slice(firstSecondaryTrim)
      .filter(cut => cut.kind === 'edge_trim');
    expect(
      trimsAfterTurningStrips.every(
        cut => cut.orientation === secondaryOrientation,
      ),
    ).toBe(true);
    expect(trimsAfterTurningStrips).toHaveLength(6);
    expect(
      trimsAfterTurningStrips.reduce<Record<string, number>>((count, cut) => {
        count[cut.targetRegionId] = (count[cut.targetRegionId] ?? 0) + 1;
        return count;
      }, {}),
    ).toEqual(
      expect.objectContaining(
        Object.fromEntries(
          result.sheets[0].placements.map(placement => [placement.id, 2]),
        ),
      ),
    );

    const largestOffcut = result.sheets[0].wasteRegions
      .filter(region => region.reason === 'remainder')
      .sort((a, b) => b.widthMm * b.heightMm - a.widthMm * a.heightMm)[0];
    expect(largestOffcut.yMm).toBe(0);
    expect(largestOffcut.heightMm).toBe(2750);
    expect(largestOffcut.xMm + largestOffcut.widthMm).toBe(1850);
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

  it('alinha o veio escolhido ao comprimento de 2750mm da chapa', () => {
    const settings = {
      ...DEFAULT_CUTTING_PLAN_SETTINGS,
      sheetWidthMm: 500,
      sheetLengthMm: 900,
      edgeTrimMm: 0,
    };

    const horizontalGrain = generateCuttingPlan(
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
    );
    expect(horizontalGrain.sheets[0].placements[0].rotated).toBe(true);
    expect(() =>
      generateCuttingPlan(
        input(
          [
            piece({
              widthMm: 800,
              lengthMm: 400,
              grainDirection: 'along_width',
            }),
          ],
          'balanced',
          settings,
        ),
      ),
    ).toThrow('não cabe');
  });

  it('mantém peças com veios diferentes juntas quando a chapa é a mesma', () => {
    const result = generateCuttingPlan(
      input([
        piece({ id: 'a', grainDirection: 'none' }),
        piece({ id: 'b', grainDirection: 'along_length' }),
      ]),
    );

    expect(result.metrics.sheetCount).toBe(1);
    expect(getPieceCompatibilityKey(piece({ grainDirection: 'none' }))).toBe(
      getPieceCompatibilityKey(piece({ grainDirection: 'along_length' })),
    );
  });

  it.each<CuttingPlanOptimizationMode>([
    'fewer_cuts',
    'best_yield',
    'balanced',
  ])('converte o modo legado %s para a otimização única', mode => {
    const result = generateCuttingPlan(
      input(
        [
          piece({ id: 'a', widthMm: 1000, lengthMm: 500, quantity: 2 }),
          piece({ id: 'b', widthMm: 600, lengthMm: 800, quantity: 2 }),
        ],
        mode,
      ),
    );

    expect(result.optimizationMode).toBe('best_yield');
    expect(result.metrics.sheetCount).toBeGreaterThan(0);
    expect(result.metrics.utilizationPercentage).toBeGreaterThan(0);
  });

  it('produz o mesmo melhor plano independentemente do modo legado', () => {
    const pieces = [
      piece({ id: 'a', widthMm: 900, lengthMm: 400, quantity: 3 }),
      piece({ id: 'b', widthMm: 500, lengthMm: 700, quantity: 3 }),
      piece({ id: 'c', widthMm: 350, lengthMm: 1000, quantity: 2 }),
    ];
    const fewerCuts = generateCuttingPlan(input(pieces, 'fewer_cuts'));
    const bestYield = generateCuttingPlan(input(pieces, 'best_yield'));

    expect(fewerCuts).toEqual(bestYield);
  });

  it('explora combinações adicionais e mantém o melhor resultado encontrado', () => {
    const planInput = input([
      piece({ id: 'a', widthMm: 900, lengthMm: 400, quantity: 3 }),
      piece({ id: 'b', widthMm: 500, lengthMm: 700, quantity: 3 }),
      piece({ id: 'c', widthMm: 350, lengthMm: 1000, quantity: 2 }),
    ]);
    const baseline = generateCuttingPlan(planInput);
    const progress: number[] = [];
    const searched = searchCuttingPlan(
      planInput,
      {
        maxCandidates: 30,
        maxDurationMs: 60_000,
        seed: 1234,
        stagnationMs: 60_000,
      },
      update => progress.push(update.candidatesTested),
    );

    expect(progress[0]).toBeGreaterThan(0);
    expect(progress.at(-1)).toBe(30);
    expect(searched.metrics.sheetCount).toBeLessThanOrEqual(
      baseline.metrics.sheetCount,
    );
    if (searched.metrics.sheetCount === baseline.metrics.sheetCount) {
      expect(searched.metrics.movementCount).toBeLessThanOrEqual(
        baseline.metrics.movementCount,
      );
      if (searched.metrics.movementCount === baseline.metrics.movementCount) {
        expect(searched.metrics.processLossAreaMm2).toBeLessThanOrEqual(
          baseline.metrics.processLossAreaMm2,
        );
      }
    }
  });

  it('produz busca reproduzível quando recebe a mesma semente', () => {
    const planInput = input([
      piece({ id: 'a', widthMm: 720, lengthMm: 410, quantity: 4 }),
      piece({ id: 'b', widthMm: 330, lengthMm: 980, quantity: 3 }),
    ]);
    const options = {
      maxCandidates: 18,
      maxDurationMs: 60_000,
      seed: 9876,
      stagnationMs: 60_000,
    };

    expect(searchCuttingPlan(planInput, options)).toEqual(
      searchCuttingPlan(planInput, options),
    );
  });

  it('encerra a busca quando passa o período configurado sem melhora', () => {
    let clockMs = 0;
    const clock = jest
      .spyOn(Date, 'now')
      .mockImplementation(() => (clockMs += 1_000));
    const progress: number[] = [];

    try {
      searchCuttingPlan(
        input([piece({ quantity: 2 })]),
        {
          maxCandidates: 1_000,
          maxDurationMs: 60_000,
          stagnationMs: 10_000,
        },
        update => progress.push(update.elapsedMs),
      );
    } finally {
      clock.mockRestore();
    }

    expect(progress.at(-1)).toBeLessThanOrEqual(60_000);
    expect(clockMs).toBeLessThan(60_000);
  });

  it('é determinístico para a mesma entrada', () => {
    const planInput = input([piece({ quantity: 4 })]);
    expect(generateCuttingPlan(planInput)).toEqual(
      generateCuttingPlan(planInput),
    );
  });

  it('rejeita lista vazia e peça maior que a área útil', () => {
    expect(() => generateCuttingPlan(input([]))).toThrow('ao menos uma peça');
    expect(() =>
      generateCuttingPlan(input([piece({ widthMm: 1900, lengthMm: 2800 })])),
    ).toThrow('não cabe');
  });
});
