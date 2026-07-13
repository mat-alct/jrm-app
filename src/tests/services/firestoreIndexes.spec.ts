import fs from 'node:fs';

/**
 * Contrato estático de índices (PLANO-DE-TESTES.md, seção 14.1).
 *
 * O emulador do Firestore NÃO exige índices compostos: uma query que precisa de
 * índice passa nos testes e quebra em produção com `failed-precondition`. Este
 * spec transforma "esqueci o índice" em teste vermelho.
 *
 * Ao adicionar uma query com (where de igualdade + orderBy em outro campo) ou com
 * dois campos diferentes, registre-a aqui E em `firestore.indexes.json`.
 */
interface IndexField {
  fieldPath: string;
  order: 'ASCENDING' | 'DESCENDING';
}

interface CompositeIndex {
  collectionGroup: string;
  queryScope: string;
  fields: IndexField[];
}

interface FieldOverride {
  collectionGroup: string;
  fieldPath: string;
  indexes: Array<{ order?: string; queryScope: string }>;
}

const indexes = JSON.parse(
  fs.readFileSync('firestore.indexes.json', 'utf8'),
) as {
  indexes: CompositeIndex[];
  fieldOverrides: FieldOverride[];
};

/** Queries compostas conhecidas do app, com o índice que cada uma exige. */
const REQUIRED_COMPOSITE_INDEXES: Array<{
  origem: string;
  collectionGroup: string;
  queryScope: string;
  fields: IndexField[];
}> = [
  {
    origem:
      "project.service.listProjects: where('sellerId') + orderBy('createdAt','desc')",
    collectionGroup: 'projects',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'sellerId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
  },
  {
    origem:
      "orders.service.getOrders: where('orderStatus') + orderBy('orderCode','desc')",
    collectionGroup: 'orders',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'orderStatus', order: 'ASCENDING' },
      { fieldPath: 'orderCode', order: 'DESCENDING' },
    ],
  },
];

/** Queries de collection-group com um único campo, cobertas por fieldOverrides. */
const REQUIRED_COLLECTION_GROUP_FIELDS: Array<{
  origem: string;
  collectionGroup: string;
  fieldPath: string;
}> = [
  {
    origem: "designer.service: collectionGroup('items') + where('designerId')",
    collectionGroup: 'items',
    fieldPath: 'designerId',
  },
  {
    origem:
      "assembler.service: collectionGroup('assemblerAssignments') + where('assemblerId')",
    collectionGroup: 'assemblerAssignments',
    fieldPath: 'assemblerId',
  },
  {
    origem:
      "payment/dashboard.service: collectionGroup('assemblerAssignments') + where('paymentStatus')",
    collectionGroup: 'assemblerAssignments',
    fieldPath: 'paymentStatus',
  },
];

function hasCompositeIndex(
  required: (typeof REQUIRED_COMPOSITE_INDEXES)[number],
) {
  return indexes.indexes.some(
    index =>
      index.collectionGroup === required.collectionGroup &&
      index.queryScope === required.queryScope &&
      index.fields.length >= required.fields.length &&
      required.fields.every((field, position) => {
        const declared = index.fields[position];
        return (
          declared?.fieldPath === field.fieldPath &&
          declared?.order === field.order
        );
      }),
  );
}

describe('firestore.indexes.json — contrato com as queries do app', () => {
  it.each(
    REQUIRED_COMPOSITE_INDEXES.map(index => [index.origem, index] as const),
  )('declara o índice composto exigido por %s', (_origem, required) => {
    expect(hasCompositeIndex(required)).toBe(true);
  });

  it.each(
    REQUIRED_COLLECTION_GROUP_FIELDS.map(
      field => [field.origem, field] as const,
    ),
  )(
    'declara o fieldOverride de collection-group exigido por %s',
    (_origem, required) => {
      const override = indexes.fieldOverrides.find(
        entry =>
          entry.collectionGroup === required.collectionGroup &&
          entry.fieldPath === required.fieldPath,
      );

      expect(override).toBeDefined();
      expect(
        override!.indexes.some(
          entry => entry.queryScope === 'COLLECTION_GROUP',
        ),
      ).toBe(true);
    },
  );

  it('não deixa índice órfão sem query correspondente registrada aqui', () => {
    const declared = indexes.indexes.map(
      index =>
        `${index.collectionGroup}:${index.fields.map(f => f.fieldPath).join(',')}`,
    );
    const required = REQUIRED_COMPOSITE_INDEXES.map(
      index =>
        `${index.collectionGroup}:${index.fields.map(f => f.fieldPath).join(',')}`,
    );

    expect(declared.sort()).toEqual(required.sort());
  });
});
