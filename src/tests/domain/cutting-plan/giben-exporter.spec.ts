import {
  DEFAULT_GIBEN_EXPORT_PROFILE,
  buildAcCut,
  buildAcHeader,
  buildCuttingPlan,
  buildGibenCutTree,
  cutlistToCuttingPlanInput,
  exportCuttingPlanToGiben,
  generateCuttingPlan,
  toAscii,
  toTenths,
  buildGibenZipBytes,
} from '@/domain/cutting-plan';
import type { GibenCutGroup } from '@/domain/cutting-plan';
import type { Cutlist } from '@/types';
import JSZip from 'jszip';

const timestamp = { seconds: 1_788_462_000, nanoseconds: 0 };
const context = {
  orderId: 'PED-0042',
  customerName: 'João da Silva',
  operatorName: 'Érica Operadora',
  generatedAt: new Date(2026, 6, 3, 12, 0, 0),
  profile: DEFAULT_GIBEN_EXPORT_PROFILE,
};

const cut = (input: {
  id: string;
  materialId: string;
  materialName: string;
  materialPrice?: number;
  quantity?: number;
  sideA?: number;
  sideB?: number;
}): Cutlist => ({
  id: input.id,
  description: `Peça ${input.id}`,
  material: {
    materialId: input.materialId,
    name: input.materialName,
    width: 2750,
    height: 1850,
    price: input.materialPrice ?? 220,
  },
  amount: input.quantity ?? 1,
  sideA: input.sideA ?? 500,
  sideB: input.sideB ?? 900,
  borderA: 1,
  borderB: 0,
  price: 0,
});

const planFor = (cutlist: Cutlist[]) =>
  buildCuttingPlan({
    id: 'plan-1',
    orderId: 'order-1',
    status: 'approved',
    timestamp,
    result: generateCuttingPlan(
      cutlistToCuttingPlanInput({
        cutlist,
        optimizationMode: 'balanced',
      }),
    ),
  });

describe('Giben AC/AD exporter', () => {
  it('formata AC conforme as larguras e posições confirmadas no guia', () => {
    expect(
      buildAcHeader({
        materialKey: '00000000000730',
        thicknessMm: 15,
        globalPatternNumber: 1,
        repeatCount: 2,
        dimensionAMm: 1840,
        dimensionBMm: 2750,
        flag: 0,
      }),
    ).toBe('00000000000730 1500110000218400275000');
    expect(
      buildAcCut({
        materialKey: '00000000000730',
        thicknessMm: 15,
        globalPatternNumber: 1,
        phase: 3,
        localPartNumber: 1,
        dimensionMm: 1400,
        quantity: 1,
      }),
    ).toBe('00000000000730 150013011400001');
  });

  it('normaliza ASCII e arredonda medidas para décimos', () => {
    expect(toAscii('João – Módulo')).toBe('Joao - Modulo');
    expect([4.5, 66.3, 905.5, 1361.1].map(toTenths)).toEqual([
      45, 663, 9055, 13611,
    ]);
  });

  it('gera um par por nome completo de material e numera padrões globalmente', () => {
    const plan = planFor([
      cut({
        id: 'white',
        materialId: 'db-white',
        materialName: '340 - 00000000000730 - MDF Branco Texturizado 15mm',
      }),
      cut({
        id: 'black',
        materialId: 'db-black',
        materialName: '341 - 00000000000731 - MDF Preto 18mm',
        sideA: 600,
        sideB: 800,
      }),
    ]);

    const result = exportCuttingPlanToGiben(plan, context);

    expect(result.pairs).toHaveLength(2);
    expect(result.pairs.map(pair => pair.materialName)).toEqual([
      '340 - 00000000000730 - MDF Branco Texturizado 15mm',
      '341 - 00000000000731 - MDF Preto 18mm',
    ]);
    const headers = result.pairs.map(pair => pair.ac.split('\r\n')[0]);
    expect(headers.map(header => header.slice(18, 20))).toEqual(['01', '02']);
    expect(result.pairs.map(pair => pair.baseName)).toEqual([
      'PED-0042-340',
      'PED-0042-341',
    ]);
  });

  it('emite ASCII, CRLF final, larguras fixas e tipos AD na ordem 1/2/3/4', () => {
    const plan = planFor([
      cut({
        id: 'door',
        materialId: 'db-white',
        materialName: '340 - 00000000000730 - MDF Branco 15mm',
        quantity: 2,
      }),
    ]);

    const pair = exportCuttingPlanToGiben(plan, context).pairs[0];
    expect(pair.ac.endsWith('\r\n')).toBe(true);
    expect(pair.ad.endsWith('\r\n')).toBe(true);
    expect(pair.ac.replaceAll('\r\n', '')).not.toContain('\n');
    expect(pair.ad.replaceAll('\r\n', '')).not.toContain('\n');
    expect(
      [...pair.ac, ...pair.ad].every(char => {
        const code = char.charCodeAt(0);
        return char === '\r' || char === '\n' || (code >= 32 && code <= 126);
      }),
    ).toBe(true);

    const acLines = pair.ac.split('\r\n').slice(0, -1);
    expect(acLines[0]).toHaveLength(37);
    acLines.slice(1).forEach(line => expect(line).toHaveLength(30));
    expect(
      acLines.some(line => line.length === 30 && line.slice(21, 23) === '00'),
    ).toBe(true);

    const adLines = pair.ad.split('\r\n').slice(0, -1);
    const types = adLines.map(line => line[28]);
    expect(types[0]).toBe('1');
    expect(types.slice(1, 3)).toEqual(['2', '2']);
    expect(types.at(-1)).toBe('4');
    expect(types.indexOf('3')).toBeGreaterThan(types.lastIndexOf('2'));
    expect(types.indexOf('4')).toBeGreaterThan(types.lastIndexOf('3'));
    adLines.forEach(line => {
      expect(line).toHaveLength(
        line[28] === '2' ? 922 : line[28] === '1' ? 498 : 490,
      );
    });
    expect(adLines[0].slice(19, 28)).toBe('Erica Ope');
    expect(adLines[0].slice(37, 62).trim()).toBe('radora');
    expect(adLines[0].slice(62, 71)).toBe('2026Jul03');
  });

  it('leva fitas já rotacionadas para os quatro campos AD', () => {
    const plan = planFor([
      {
        ...cut({
          id: 'rotated',
          materialId: 'db-white',
          materialName: '340 - 00000000000730 - MDF Branco 15mm',
          sideA: 900,
          sideB: 500,
        }),
        grainDirection: 'along_length',
        borderA: 1,
      },
    ]);
    const placement = plan.sheets[0].placements[0];
    expect(placement.rotated).toBe(true);
    expect(placement.edgeBandEdges).toContain('right');

    const type2 = exportCuttingPlanToGiben(plan, context)
      .pairs[0].ad.split('\r\n')
      .find(line => line[28] === '2')!;
    expect(type2.slice(250, 265).trim()).toBe('');
    expect(type2.slice(265, 280).trim()).toContain('0.4x22');
  });

  it('recusa plano desatualizado e material sem os códigos do nome completo', () => {
    const valid = planFor([
      cut({
        id: 'door',
        materialId: 'db-white',
        materialName: '340 - 00000000000730 - MDF Branco 15mm',
      }),
    ]);
    expect(() =>
      exportCuttingPlanToGiben({ ...valid, status: 'outdated' }, context),
    ).toThrow('plano atualizado');

    const missingCodes = planFor([
      cut({
        id: 'door',
        materialId: 'db-white',
        materialName: 'MDF Branco 15mm',
      }),
    ]);
    expect(() => exportCuttingPlanToGiben(missingCodes, context)).toThrow(
      /chave AC|código AD/,
    );
  });

  it('empacota cada par no ZIP sem alterar um byte dos arquivos', async () => {
    const plan = planFor([
      cut({
        id: 'door',
        materialId: 'db-white',
        materialName: '340 - 00000000000730 - MDF Branco 15mm',
      }),
    ]);
    const result = exportCuttingPlanToGiben(plan, context);
    const bytes = await buildGibenZipBytes(result);
    const zip = await JSZip.loadAsync(bytes);
    const pair = result.pairs[0];

    expect(Object.keys(zip.files).sort()).toEqual([
      `${pair.baseName}.AC`,
      `${pair.baseName}.AD`,
    ]);
    const zippedAc = await zip.file(`${pair.baseName}.AC`)!.async('uint8array');
    const zippedAd = await zip.file(`${pair.baseName}.AD`)!.async('uint8array');
    expect(Buffer.from(zippedAc).equals(Buffer.from(pair.ac, 'ascii'))).toBe(
      true,
    );
    expect(Buffer.from(zippedAd).equals(Buffer.from(pair.ad, 'ascii'))).toBe(
      true,
    );
  });

  it('mantém peças de medidas muito variadas dentro das quatro fases da Giben', () => {
    const sizes: Array<[number, number]> = [
      [1203, 741],
      [917, 655],
      [833, 431],
      [611, 389],
      [457, 277],
      [341, 223],
      [289, 167],
      [211, 139],
      [173, 101],
      [137, 83],
      [97, 61],
      [1499, 313],
      [719, 547],
      [383, 199],
      [263, 157],
    ];
    const plan = planFor(
      sizes.map(([sideA, sideB], index) =>
        cut({
          id: `p${index}`,
          materialId: 'db-white',
          materialName: '340 - 00000000000730 - MDF Branco 15mm',
          sideA,
          sideB,
        }),
      ),
    );

    expect(() => exportCuttingPlanToGiben(plan, context)).not.toThrow();

    const phaseOf = (group: GibenCutGroup): number =>
      Math.max(
        group.phase,
        ...group.segments.map(segment =>
          segment.childGroup ? phaseOf(segment.childGroup) : group.phase,
        ),
      );
    plan.sheets.forEach(sheet => {
      const { rootCutGroup } = buildGibenCutTree({
        pieces: plan.inputSnapshot.pieces,
        sheet,
      });
      expect(phaseOf(rootCutGroup)).toBeLessThanOrEqual(5);
    });
  });
});
