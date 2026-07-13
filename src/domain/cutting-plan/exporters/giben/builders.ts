import type { GibenExportProfileSettings } from '../../machine-settings';
import {
  assertLength,
  fixedTenths,
  fixedText,
  FixedWidthLine,
  formatAdDate,
  formatLabelDimensionSignature,
  formatLabelMm,
  toAscii,
  zeroPadInteger,
} from './format';
import type {
  GibenCutGroup,
  GibenEdgeBand,
  GibenExportContext,
  GibenMaterialPlan,
  GibenOffcut,
  GibenPattern,
  GibenTreePlacement,
} from './types';
import { GibenExportError } from './types';

export interface AcHeaderInput {
  dimensionAMm: number;
  dimensionBMm: number;
  flag: 0 | 1;
  globalPatternNumber: number;
  materialKey: string;
  repeatCount: number;
  thicknessMm: number;
}

export interface AcCutInput {
  dimensionMm: number;
  globalPatternNumber: number;
  localPartNumber: number;
  materialKey: string;
  phase: 2 | 3 | 4 | 5;
  quantity: number;
  thicknessMm: number;
}

export const buildAcHeader = (input: AcHeaderInput): string => {
  const line = [
    fixedText(input.materialKey, 15),
    fixedTenths(input.thicknessMm, 3),
    zeroPadInteger(input.globalPatternNumber, 2),
    '1',
    zeroPadInteger(input.repeatCount, 5),
    fixedTenths(input.dimensionAMm, 5),
    fixedTenths(input.dimensionBMm, 5),
    String(input.flag),
  ].join('');
  assertLength(line, 37, 'Cabeçalho AC');
  return line;
};

export const buildAcCut = (input: AcCutInput): string => {
  const line = [
    fixedText(input.materialKey, 15),
    fixedTenths(input.thicknessMm, 3),
    zeroPadInteger(input.globalPatternNumber, 2),
    String(input.phase),
    zeroPadInteger(input.localPartNumber, 2),
    fixedTenths(input.dimensionMm, 5),
    zeroPadInteger(input.quantity, 2),
  ].join('');
  assertLength(line, 30, 'Corte AC');
  return line;
};

export const emitAcCutGroup = (group: GibenCutGroup): AcCutInput[] => {
  const records: AcCutInput[] = [];
  group.segments.forEach(segment => {
    const hasPiece = Boolean(segment.finalPiece);
    const hasChild = Boolean(segment.childGroup);
    if (
      hasPiece === hasChild ||
      segment.sizeMm <= 0 ||
      segment.cutQuantity < 1
    ) {
      throw new GibenExportError(
        `Segmento inválido na fase ${group.phase} do arquivo AC.`,
      );
    }
    if (segment.childGroup && segment.childGroup.phase !== group.phase + 1) {
      throw new GibenExportError(
        `Fase filha inválida após a fase ${group.phase}.`,
      );
    }
    records.push({
      materialKey: '',
      thicknessMm: 0,
      globalPatternNumber: 0,
      phase: group.phase,
      localPartNumber: segment.finalPiece?.localPartNumber ?? 0,
      dimensionMm: segment.sizeMm,
      quantity: segment.cutQuantity,
    });
    if (segment.childGroup) {
      records.push(...emitAcCutGroup(segment.childGroup));
    }
  });
  return records;
};

const splitHeaderName = (name: string) => {
  const ascii = toAscii(name);
  return { first: ascii.slice(0, 9), continuation: ascii.slice(9) };
};

export const buildAdHeader = (input: {
  generatedAt: Date;
  materialCode: string;
  operatorName: string;
  thicknessMm: number;
}): string => {
  const line = new FixedWidthLine(498);
  const name = splitHeaderName(input.operatorName);
  line
    .put(1, 15, input.materialCode)
    .put(16, 4, fixedTenths(input.thicknessMm, 4))
    .put(20, 9, name.first)
    .put(29, 1, '1')
    .put(38, 25, name.continuation)
    .put(63, 9, formatAdDate(input.generatedAt));
  const result = line.toString();
  assertLength(result, 498, 'AD tipo 1');
  return result;
};

const compactDecimal = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(value).replace(',', '.');

const formatEdgeBandShort = (edge: GibenEdgeBand | null): string =>
  edge
    ? `${compactDecimal(edge.thicknessMm)}x${compactDecimal(edge.heightMm)} ${edge.description}`.slice(
        0,
        15,
      )
    : '';

const formatEdgeBandLong = (edge: GibenEdgeBand | null): string =>
  edge
    ? `${compactDecimal(edge.thicknessMm)}x${compactDecimal(edge.heightMm)} ${edge.description}`.slice(
        0,
        21,
      )
    : '';

const edgeBandsFor = (
  piece: GibenTreePlacement,
  profile: GibenExportProfileSettings,
): [
  GibenEdgeBand | null,
  GibenEdgeBand | null,
  GibenEdgeBand | null,
  GibenEdgeBand | null,
] => {
  const configured: GibenEdgeBand = {
    thicknessMm: profile.defaultEdgeBandThicknessMm,
    heightMm: profile.defaultEdgeBandHeightMm,
    description: profile.defaultEdgeBandDescription,
  };
  return (['top', 'right', 'bottom', 'left'] as const).map(edge =>
    piece.edgeBandEdges.includes(edge) ? { ...configured } : null,
  ) as [
    GibenEdgeBand | null,
    GibenEdgeBand | null,
    GibenEdgeBand | null,
    GibenEdgeBand | null,
  ];
};

const labelImagePath = (
  profile: GibenExportProfileSettings,
  labelId: string,
): string =>
  `${profile.labelImageDirectory.replace(/[\\/]+$/, '')}\\${labelId}.bmp`;

export const buildAdPiece = (input: {
  adSequenceNumber: number;
  context: GibenExportContext;
  labelId: string;
  material: GibenMaterialPlan;
  pattern: GibenPattern;
  piece: GibenTreePlacement;
}): string => {
  const { adSequenceNumber, context, labelId, material, piece } = input;
  const placement = piece.placement;
  const edgeBands = edgeBandsFor(piece, context.profile);
  const line = new FixedWidthLine(922);
  line
    .put(1, 15, material.adMaterialCode)
    .put(16, 4, fixedTenths(material.thicknessMm, 4))
    .put(29, 1, '2')
    .put(30, 4, String(adSequenceNumber), 'right')
    .put(34, 6, fixedTenths(placement.widthMm, 6))
    .put(40, 6, fixedTenths(placement.heightMm, 6))
    .put(46, 5, '00001')
    .put(51, 1, '1')
    .put(53, 1, '0')
    .put(55, 1, '0')
    .put(61, 20, placement.description)
    .put(81, 8, '')
    .put(89, 11, context.customerName)
    .put(100, 31, '0'.repeat(31))
    .put(157, 1, '0')
    .put(251, 15, formatEdgeBandShort(edgeBands[0]))
    .put(266, 15, formatEdgeBandShort(edgeBands[1]))
    .put(281, 15, formatEdgeBandShort(edgeBands[2]))
    .put(296, 15, formatEdgeBandShort(edgeBands[3]))
    .put(320, 10, '')
    .put(331, 20, '')
    .put(410, 9, labelId)
    .put(
      450,
      12,
      formatLabelDimensionSignature(piece.designWidthMm, piece.designHeightMm),
    )
    .put(491, 40, labelImagePath(context.profile, labelId))
    .put(584, 1, String(edgeBands.filter(Boolean).length))
    .put(587, 8, context.orderId)
    .put(603, 9, labelId)
    .put(619, 8, context.customerName)
    .put(635, 14, context.operatorName)
    .put(657, 40, material.materialLabel)
    .put(699, 22, placement.description)
    .put(723, 20, '')
    .put(745, 7, '')
    .put(762, 7, context.customerName)
    .put(780, 1, String(Math.min(piece.requestedQuantity, 9)))
    .put(786, 7, formatLabelMm(piece.designWidthMm))
    .put(793, 7, formatLabelMm(piece.designHeightMm))
    .put(800, 21, formatEdgeBandLong(edgeBands[0]))
    .put(821, 21, formatEdgeBandLong(edgeBands[1]))
    .put(842, 21, formatEdgeBandLong(edgeBands[2]))
    .put(863, 21, formatEdgeBandLong(edgeBands[3]));
  const result = line.toString();
  assertLength(result, 922, 'AD tipo 2');
  return result;
};

export const buildAdOffcut = (
  material: GibenMaterialPlan,
  offcut: GibenOffcut,
): string => {
  const line = new FixedWidthLine(490);
  line
    .put(1, 15, material.adMaterialCode)
    .put(16, 4, fixedTenths(material.thicknessMm, 4))
    .put(29, 1, '3')
    .put(30, 4, String(offcut.sequenceNumber), 'right')
    .put(34, 6, fixedTenths(offcut.widthMm, 6))
    .put(40, 6, fixedTenths(offcut.heightMm, 6))
    .put(46, 5, '00001')
    .put(51, 1, '0')
    .put(53, 1, '0')
    .put(55, 1, '0')
    .put(100, 26, '0'.repeat(26))
    .put(131, 1, offcut.letter)
    .put(157, 1, '0');
  const result = line.toString();
  assertLength(result, 490, 'AD tipo 3');
  return result;
};

export const buildAdSheet = (
  material: GibenMaterialPlan,
  pattern: GibenPattern,
): string => {
  const line = new FixedWidthLine(490);
  line
    .put(1, 15, material.adMaterialCode)
    .put(16, 4, fixedTenths(material.thicknessMm, 4))
    .put(29, 1, '4')
    .put(30, 4, String(pattern.localPatternIndex), 'right')
    .put(34, 6, fixedTenths(pattern.stockLengthMm, 6))
    .put(40, 6, fixedTenths(pattern.stockWidthMm, 6))
    .put(46, 5, '00001')
    .put(51, 1, pattern.rotatedFromStock ? '1' : '0')
    .put(61, 39, material.materialLabel)
    .put(126, 1, '0');
  const result = line.toString();
  assertLength(result, 490, 'AD tipo 4');
  return result;
};
