import type { CuttingPlan } from '../../types';

import {
  buildAcCut,
  buildAcHeader,
  buildAdHeader,
  buildAdOffcut,
  buildAdPiece,
  buildAdSheet,
  emitAcCutGroup,
} from './builders';
import { buildGibenCutTree } from './cut-tree';
import {
  assertCrLfFile,
  linesToAsciiFile,
  toAscii,
  toTenths,
  zeroPadInteger,
} from './format';
import type {
  GibenExportContext,
  GibenExportPair,
  GibenExportResult,
  GibenMaterialPlan,
  GibenOffcut,
  GibenPattern,
} from './types';
import { GibenExportError } from './types';

const requiredCode = (
  value: string | undefined,
  field: string,
  materialName: string,
) => {
  const normalized = value?.trim();
  if (!normalized) {
    throw new GibenExportError(
      `O material “${materialName}” não possui ${field} no nome completo. Use “código AD - chave AC - descrição xxmm”.`,
    );
  }
  const ascii = toAscii(normalized);
  if (!ascii || ascii.length > 15) {
    throw new GibenExportError(
      `${field} inválido no material “${materialName}” (máximo de 15 caracteres ASCII).`,
    );
  }
  return ascii;
};

const assignOffcuts = (pattern: GibenPattern): GibenOffcut[] => {
  const dimensionToLetter = new Map<string, string>();
  let nextLetter = 'A'.charCodeAt(0);
  return pattern.sheet.wasteRegions
    .filter(region => region.reason === 'remainder')
    .map((region, index) => {
      const key = `${toTenths(region.widthMm)}x${toTenths(region.heightMm)}`;
      let letter = dimensionToLetter.get(key);
      if (!letter) {
        if (nextLetter > 'Z'.charCodeAt(0)) {
          throw new GibenExportError(
            `A chapa ${pattern.sheet.number} possui mais de 26 tipos de sobra.`,
          );
        }
        letter = String.fromCharCode(nextLetter);
        nextLetter += 1;
        dimensionToLetter.set(key, letter);
      }
      return {
        sequenceNumber: index + 1,
        widthMm: region.widthMm,
        heightMm: region.heightMm,
        letter,
      };
    });
};

export const buildGibenMaterialPlans = (
  plan: CuttingPlan,
): GibenMaterialPlan[] => {
  if (!plan.sheets.length) {
    throw new GibenExportError('O plano não possui chapas para exportar.');
  }
  if (plan.sheets.length > 99) {
    throw new GibenExportError(
      'O plano excede 99 padrões e precisa ser dividido em lotes.',
    );
  }

  const materialPlans = new Map<string, GibenMaterialPlan>();
  let globalPatternNumber = 1;
  [...plan.sheets]
    .sort((a, b) => a.number - b.number)
    .forEach(sheet => {
      const material = sheet.material;
      const acMaterialKey = requiredCode(
        material.acMaterialKey,
        'chave AC',
        material.name,
      );
      const adMaterialCode = requiredCode(
        material.adMaterialCode,
        'código AD',
        material.name,
      );
      let materialPlan = materialPlans.get(material.id);
      if (!materialPlan) {
        materialPlan = {
          materialId: material.id,
          acMaterialKey,
          adMaterialCode,
          thicknessMm: material.thicknessMm,
          materialLabel: material.name,
          patterns: [],
        };
        materialPlans.set(material.id, materialPlan);
      } else if (
        materialPlan.materialLabel !== material.name ||
        materialPlan.thicknessMm !== material.thicknessMm ||
        materialPlan.acMaterialKey !== acMaterialKey ||
        materialPlan.adMaterialCode !== adMaterialCode
      ) {
        throw new GibenExportError(
          `Materiais diferentes foram misturados na chapa ${sheet.number}.`,
        );
      }

      const tree = buildGibenCutTree({
        sheet,
        pieces: plan.inputSnapshot.pieces,
      });
      const pattern: GibenPattern = {
        sheet,
        globalPatternNumber,
        localPatternIndex: materialPlan.patterns.length + 1,
        repeatCount: 1,
        stockWidthMm: sheet.totalWidthMm,
        stockLengthMm: sheet.totalLengthMm,
        orientedWidthMm: sheet.totalWidthMm,
        orientedHeightMm: sheet.totalLengthMm,
        rotatedFromStock: sheet.totalWidthMm !== sheet.totalLengthMm,
        rootCutGroup: tree.rootCutGroup,
        placements: tree.placements,
        offcuts: [],
      };
      pattern.offcuts = assignOffcuts(pattern);
      materialPlan.patterns.push(pattern);
      globalPatternNumber += 1;
    });
  return [...materialPlans.values()];
};

const generateAc = (
  material: GibenMaterialPlan,
  context: GibenExportContext,
): string => {
  const lines: string[] = [];
  material.patterns.forEach(pattern => {
    lines.push(
      buildAcHeader({
        materialKey: material.acMaterialKey,
        thicknessMm: material.thicknessMm,
        globalPatternNumber: pattern.globalPatternNumber,
        repeatCount: pattern.repeatCount,
        dimensionAMm: pattern.orientedWidthMm,
        dimensionBMm: pattern.orientedHeightMm,
        flag: context.profile.defaultAcHeaderFlag,
      }),
    );
    emitAcCutGroup(pattern.rootCutGroup).forEach(record => {
      lines.push(
        buildAcCut({
          ...record,
          materialKey: material.acMaterialKey,
          thicknessMm: material.thicknessMm,
          globalPatternNumber: pattern.globalPatternNumber,
        }),
      );
    });
  });
  return linesToAsciiFile(lines, 'Arquivo AC');
};

const generateAd = (
  material: GibenMaterialPlan,
  context: GibenExportContext,
): string => {
  const lines: string[] = [
    buildAdHeader({
      materialCode: material.adMaterialCode,
      thicknessMm: material.thicknessMm,
      operatorName: context.operatorName,
      generatedAt: context.generatedAt,
    }),
  ];
  let adSequenceNumber = 1;
  material.patterns.forEach(pattern => {
    pattern.placements.forEach(piece => {
      if (adSequenceNumber > 9999) {
        throw new GibenExportError('O arquivo AD excede 9999 colocações.');
      }
      const labelId = zeroPadInteger(adSequenceNumber, 9);
      lines.push(
        buildAdPiece({
          material,
          pattern,
          piece,
          context,
          adSequenceNumber,
          labelId,
        }),
      );
      adSequenceNumber += 1;
    });
  });
  material.patterns.forEach(pattern => {
    pattern.offcuts.forEach(offcut =>
      lines.push(buildAdOffcut(material, offcut)),
    );
  });
  material.patterns.forEach(pattern =>
    lines.push(buildAdSheet(material, pattern)),
  );
  return linesToAsciiFile(lines, 'Arquivo AD');
};

const safeFilePart = (value: string): string =>
  toAscii(value)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'pedido';

const validatePair = (
  pair: GibenExportPair,
  material: GibenMaterialPlan,
): void => {
  assertCrLfFile(pair.ac, `${pair.baseName}.AC`);
  assertCrLfFile(pair.ad, `${pair.baseName}.AD`);
  const acLines = pair.ac.split('\r\n').slice(0, -1);
  const adLines = pair.ad.split('\r\n').slice(0, -1);
  acLines.forEach((line, index) => {
    const expected = index === 0 || line.length === 37 ? 37 : 30;
    if (
      line.length !== expected ||
      (line.length !== 37 && line.length !== 30)
    ) {
      throw new GibenExportError(`Linha AC inválida em ${pair.baseName}.`);
    }
  });
  const types = adLines.map(line => line[28]);
  const expectedTypes = [
    '1',
    ...material.patterns.flatMap(pattern => pattern.placements.map(() => '2')),
    ...material.patterns.flatMap(pattern => pattern.offcuts.map(() => '3')),
    ...material.patterns.map(() => '4'),
  ];
  if (types.join('') !== expectedTypes.join('')) {
    throw new GibenExportError(
      `Ordem dos registros AD inválida em ${pair.baseName}.`,
    );
  }
  adLines.forEach((line, index) => {
    const expected = line[28] === '2' ? 922 : line[28] === '1' ? 498 : 490;
    if (line.length !== expected) {
      throw new GibenExportError(
        `Linha AD ${index + 1} possui ${line.length}, esperado ${expected}.`,
      );
    }
  });
  const finalParts = material.patterns.reduce(
    (total, pattern) =>
      total +
      emitAcCutGroup(pattern.rootCutGroup).filter(
        record => record.localPartNumber > 0,
      ).length,
    0,
  );
  const adPieces = types.filter(type => type === '2').length;
  if (finalParts !== adPieces) {
    throw new GibenExportError(
      `Divergência AC/AD: ${finalParts} peças no AC e ${adPieces} no AD.`,
    );
  }
};

export const exportCuttingPlanToGiben = (
  plan: CuttingPlan,
  context: GibenExportContext,
): GibenExportResult => {
  if (plan.status === 'outdated') {
    throw new GibenExportError('Gere um plano atualizado antes de exportar.');
  }
  if (context.profile.id !== 'giben-cortecloud-v1') {
    throw new GibenExportError('Perfil de exportação Giben incompatível.');
  }
  if (!context.orderId.trim() || !context.operatorName.trim()) {
    throw new GibenExportError(
      'Pedido e operador são obrigatórios na exportação.',
    );
  }
  const materials = buildGibenMaterialPlans(plan);
  const usedBaseNames = new Set<string>();
  const pairs = materials.map((material, index) => {
    const prefix = safeFilePart(context.orderId);
    const materialPart = safeFilePart(material.adMaterialCode);
    let baseName = `${prefix}-${materialPart}`;
    if (usedBaseNames.has(baseName.toLocaleLowerCase('en-US'))) {
      baseName = `${baseName}-${String(index + 1).padStart(2, '0')}`;
    }
    usedBaseNames.add(baseName.toLocaleLowerCase('en-US'));
    const pair: GibenExportPair = {
      baseName,
      materialName: material.materialLabel,
      ac: generateAc(material, context),
      ad: generateAd(material, context),
    };
    validatePair(pair, material);
    return pair;
  });
  return { profileId: 'giben-cortecloud-v1', pairs };
};
