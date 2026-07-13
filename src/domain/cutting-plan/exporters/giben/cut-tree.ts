import type {
  CuttingPlanCut,
  CuttingPlanPiece,
  CuttingPlanPlacement,
  CuttingPlanRegion,
  CuttingPlanSheet,
} from '../../types';
import type {
  GibenCutAxis,
  GibenCutGroup,
  GibenCutPhase,
  GibenTreePlacement,
} from './types';
import { GibenExportError } from './types';

const EPSILON_MM = 0.05;

interface CutTreeNode {
  children?: [CutTreeNode, CutTreeNode];
  cut?: CuttingPlanCut;
  id: string;
  placement?: CuttingPlanPlacement;
  region: CuttingPlanRegion;
}

const sameRegion = (a: CuttingPlanRegion, b: CuttingPlanRegion): boolean =>
  Math.abs(a.xMm - b.xMm) <= EPSILON_MM &&
  Math.abs(a.yMm - b.yMm) <= EPSILON_MM &&
  Math.abs(a.widthMm - b.widthMm) <= EPSILON_MM &&
  Math.abs(a.heightMm - b.heightMm) <= EPSILON_MM;

const cutAxis = (cut: CuttingPlanCut): GibenCutAxis =>
  cut.orientation === 'vertical' ? 'X' : 'Y';

const axisSize = (region: CuttingPlanRegion, axis: GibenCutAxis): number =>
  axis === 'X' ? region.widthMm : region.heightMm;

const phaseAfter = (phase: GibenCutPhase): GibenCutPhase => {
  if (phase === 5) {
    throw new GibenExportError(
      'O padrão exige mais de quatro fases guilhotinadas e não cabe no perfil Giben.',
    );
  }
  return (phase + 1) as GibenCutPhase;
};

const splitRegions = (
  cut: CuttingPlanCut,
): [CuttingPlanRegion, CuttingPlanRegion] => {
  const target = cut.targetRegion;
  const lossMm = cut.kerfLossMm + cut.internalCutLossMm;
  if (cut.orientation === 'vertical') {
    const firstWidth = cut.positionMm - target.xMm;
    const secondX = cut.positionMm + lossMm;
    const secondWidth = target.xMm + target.widthMm - secondX;
    if (firstWidth < -EPSILON_MM || secondWidth < -EPSILON_MM) {
      throw new GibenExportError(`Corte vertical inválido em ${cut.id}.`);
    }
    return [
      {
        id: cut.resultRegionIds[0],
        xMm: target.xMm,
        yMm: target.yMm,
        widthMm: Math.max(0, firstWidth),
        heightMm: target.heightMm,
      },
      {
        id: cut.resultRegionIds[1],
        xMm: secondX,
        yMm: target.yMm,
        widthMm: Math.max(0, secondWidth),
        heightMm: target.heightMm,
      },
    ];
  }

  const firstHeight = cut.positionMm - target.yMm;
  const secondY = cut.positionMm + lossMm;
  const secondHeight = target.yMm + target.heightMm - secondY;
  if (firstHeight < -EPSILON_MM || secondHeight < -EPSILON_MM) {
    throw new GibenExportError(`Corte horizontal inválido em ${cut.id}.`);
  }
  return [
    {
      id: cut.resultRegionIds[0],
      xMm: target.xMm,
      yMm: target.yMm,
      widthMm: target.widthMm,
      heightMm: Math.max(0, firstHeight),
    },
    {
      id: cut.resultRegionIds[1],
      xMm: target.xMm,
      yMm: secondY,
      widthMm: target.widthMm,
      heightMm: Math.max(0, secondHeight),
    },
  ];
};

const buildTree = (sheet: CuttingPlanSheet): CutTreeNode => {
  const cuts = sheet.cuts.filter(cut => cut.kind === 'piece');
  const byTarget = new Map<string, CuttingPlanCut>();
  cuts.forEach(cut => {
    if (byTarget.has(cut.targetRegionId) || cut.resultRegionIds.length !== 2) {
      throw new GibenExportError(
        `Árvore guilhotinada ambígua na chapa ${sheet.number}.`,
      );
    }
    byTarget.set(cut.targetRegionId, cut);
  });
  const visited = new Set<string>();

  const visit = (id: string, region: CuttingPlanRegion): CutTreeNode => {
    if (visited.has(id)) {
      throw new GibenExportError(`Ciclo detectado na região ${id}.`);
    }
    const cut = byTarget.get(id);
    if (cut) {
      if (!sameRegion(cut.targetRegion, region)) {
        throw new GibenExportError(`Geometria divergente na região ${id}.`);
      }
      visited.add(id);
      const childRegions = splitRegions(cut);
      const children = childRegions.map(child => visit(child.id, child)) as [
        CutTreeNode,
        CutTreeNode,
      ];
      visited.delete(id);
      return { id, region, cut, children };
    }

    const placement = sheet.placements.find(
      candidate =>
        (candidate.id === id || candidate.sourceRegionId === id) &&
        sameRegion(candidate, region),
    );
    return { id, region, placement };
  };

  return visit(sheet.usableArea.id, sheet.usableArea);
};

const flattenAxis = (node: CutTreeNode, axis: GibenCutAxis): CutTreeNode[] => {
  if (node.cut && node.children && cutAxis(node.cut) === axis) {
    return node.children.flatMap(child => flattenAxis(child, axis));
  }
  return [node];
};

export const buildGibenCutTree = (input: {
  pieces: CuttingPlanPiece[];
  sheet: CuttingPlanSheet;
}): { placements: GibenTreePlacement[]; rootCutGroup: GibenCutGroup } => {
  const { pieces, sheet } = input;
  const root = buildTree(sheet);
  const orderedPlacements: GibenTreePlacement[] = [];
  const assigned = new Set<string>();
  let nextPartNumber = 1;

  const buildGroup = (
    node: CutTreeNode,
    phase: GibenCutPhase,
  ): GibenCutGroup => {
    const axis: GibenCutAxis = node.cut ? cutAxis(node.cut) : 'X';
    const flattened = flattenAxis(node, axis);
    const lastContentIndex = flattened.reduce(
      (last, item, index) =>
        item.placement || item.cut ? Math.max(last, index) : last,
      -1,
    );
    if (lastContentIndex < 0) {
      throw new GibenExportError(
        `Padrão sem peça final na chapa ${sheet.number}.`,
      );
    }
    if (
      flattened
        .slice(0, lastContentIndex + 1)
        .some(item => !item.placement && !item.cut)
    ) {
      throw new GibenExportError(
        `Sobra intermediária incompatível com o perfil Giben na chapa ${sheet.number}.`,
      );
    }

    const segments = flattened.slice(0, lastContentIndex + 1).map(item => {
      const sizeMm = axisSize(item.region, axis);
      if (!(sizeMm > 0)) {
        throw new GibenExportError(`Segmento sem medida na região ${item.id}.`);
      }
      if (item.placement) {
        if (nextPartNumber > 99) {
          throw new GibenExportError(
            `A chapa ${sheet.number} excede 99 peças no padrão.`,
          );
        }
        const source = pieces.find(
          piece => piece.id === item.placement!.originalPieceId,
        );
        if (!source || assigned.has(item.placement.id)) {
          throw new GibenExportError(
            `Peça ${item.placement.id} ausente ou duplicada na árvore.`,
          );
        }
        const finalPiece: GibenTreePlacement = {
          placement: item.placement,
          localPartNumber: nextPartNumber,
          designWidthMm: source.widthMm,
          designHeightMm: source.lengthMm,
          requestedQuantity: source.quantity,
          edgeBandEdges: [...item.placement.edgeBandEdges],
        };
        nextPartNumber += 1;
        assigned.add(item.placement.id);
        orderedPlacements.push(finalPiece);
        return { sizeMm, cutQuantity: 1, finalPiece };
      }
      return {
        sizeMm,
        cutQuantity: 1,
        childGroup: buildGroup(item, phaseAfter(phase)),
      };
    });

    return {
      phase,
      axis,
      parentWidthMm: node.region.widthMm,
      parentHeightMm: node.region.heightMm,
      segments,
    };
  };

  const rootCutGroup = buildGroup(root, 2);
  if (assigned.size !== sheet.placements.length) {
    throw new GibenExportError(
      `A árvore da chapa ${sheet.number} contém ${assigned.size} de ${sheet.placements.length} peças.`,
    );
  }
  return { rootCutGroup, placements: orderedPlacements };
};
