import fs from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { setLogLevel } from 'firebase/firestore';

type RoleName =
  | 'admin'
  | 'seller'
  | 'designer'
  | 'otherDesigner'
  | 'assembler'
  | 'otherAssembler'
  | 'woodworker'
  | 'inactive';

const uid: Record<RoleName, string> = {
  admin: 'admin-uid',
  seller: 'seller-uid',
  designer: 'designer-uid',
  otherDesigner: 'other-designer-uid',
  assembler: 'assembler-uid',
  otherAssembler: 'other-assembler-uid',
  woodworker: 'woodworker-uid',
  inactive: 'inactive-uid',
};

const roles: Record<RoleName, string[]> = {
  admin: ['admin'],
  seller: ['seller'],
  designer: ['designer'],
  otherDesigner: ['designer'],
  assembler: ['assembler'],
  otherAssembler: ['assembler'],
  woodworker: ['woodworker'],
  inactive: ['admin', 'seller', 'designer', 'assembler', 'woodworker'],
};

describe('firestore.rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    // Negativas de permissão são o resultado esperado de assertFails.
    setLogLevel('silent');
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-jrm',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8'),
      },
      storage: {
        rules: fs.readFileSync('storage.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedFirestore();
  });

  function dbAs(role: RoleName) {
    return testEnv.authenticatedContext(uid[role]).firestore();
  }

  function anonDb() {
    return testEnv.unauthenticatedContext().firestore();
  }

  async function seedFirestore() {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore();

      await Promise.all(
        Object.entries(uid).map(([role, userId]) =>
          db.doc(`users/${userId}`).set({
            name: role,
            email: `${role}@seed.jrm`,
            roles: roles[role as RoleName],
            active: role !== 'inactive',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          }),
        ),
      );

      await db.doc('settings/deadlineDefaults').set({
        desenhoDias: 5,
        updatedBy: uid.admin,
      });

      await db.doc('projects/project-1').set({
        customerName: 'Cliente Alpha',
        sellerId: uid.seller,
        createdBy: uid.seller,
      });

      await db.doc('projects/project-1/attachments/project-attachment').set({
        visibility: 'client',
        uploadedBy: uid.seller,
      });

      await db.doc('projects/project-1/items/designer-item').set({
        projectId: 'project-1',
        name: 'Item do desenhista',
        designerId: uid.designer,
        status: 'aguardando_desenho',
      });

      await db.doc('projects/project-1/items/other-designer-item').set({
        projectId: 'project-1',
        name: 'Item de outro desenhista',
        designerId: uid.otherDesigner,
        status: 'aguardando_desenho',
      });

      await db
        .doc(
          'projects/project-1/items/designer-item/attachments/assembler-file',
        )
        .set({
          visibility: 'assembler',
          uploadedBy: uid.assembler,
          uploadedByRole: 'assembler',
        });

      await db
        .doc('projects/project-1/items/designer-item/attachments/internal-file')
        .set({
          visibility: 'internal',
          uploadedBy: uid.seller,
          uploadedByRole: 'seller',
        });

      await db
        .doc('projects/project-1/items/designer-item/statusHistory/history-1')
        .set({
          toStatus: 'aguardando_desenho',
          changedBy: uid.seller,
        });

      await db
        .doc('projects/project-1/items/designer-item/versions/version-1')
        .set({
          projectId: 'project-1',
          itemId: 'designer-item',
          attachmentIds: [],
          createdBy: uid.designer,
        });

      await db
        .doc(
          `projects/project-1/items/designer-item/assemblerAssignments/${uid.assembler}`,
        )
        .set({
          projectId: 'project-1',
          itemId: 'designer-item',
          assemblerId: uid.assembler,
          amountToReceive: 250,
          assignedBy: uid.admin,
          paymentStatus: 'pago',
          paymentId: 'payment-owned',
        });

      await db
        .doc(
          'projects/project-1/items/designer-item/assemblerAssignments/wrong-id',
        )
        .set({
          projectId: 'project-1',
          itemId: 'designer-item',
          assemblerId: uid.assembler,
          amountToReceive: 250,
          assignedBy: uid.admin,
          paymentStatus: 'pago',
          paymentId: 'payment-owned',
        });

      await db.doc('payments/payment-owned').set(paymentData(uid.assembler));
      await db
        .doc('payments/payment-other')
        .set(paymentData(uid.otherAssembler));
    });
  }

  function paymentData(assemblerId: string) {
    return {
      projectId: 'project-1',
      itemId: 'designer-item',
      assignmentId: assemblerId,
      assemblerId,
      amount: 250,
      status: 'pago',
      paidAt: new Date('2026-01-02T00:00:00.000Z'),
      paidBy: uid.admin,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
  }

  const basicDoc = {
    ok: true,
    createdAt: new Date('2026-01-03T00:00:00.000Z'),
  };

  describe('users/{userId}', () => {
    it('permite leitura por autenticado ativo e escrita apenas por admin', async () => {
      await assertSucceeds(dbAs('admin').doc(`users/${uid.seller}`).get());
      await assertSucceeds(dbAs('seller').doc(`users/${uid.admin}`).get());
      await assertFails(dbAs('inactive').doc(`users/${uid.admin}`).get());
      await assertFails(anonDb().doc(`users/${uid.admin}`).get());

      await assertSucceeds(
        dbAs('admin')
          .doc('users/new-user')
          .set({
            name: 'Novo',
            roles: ['seller'],
            active: true,
          }),
      );
      await assertSucceeds(
        dbAs('admin').doc(`users/${uid.seller}`).update({ active: true }),
      );
      await assertSucceeds(
        dbAs('admin').doc(`users/${uid.woodworker}`).delete(),
      );

      await assertFails(
        dbAs('seller').doc('users/seller-create').set(basicDoc),
      );
      await assertFails(anonDb().doc('users/anon-create').set(basicDoc));
      await assertFails(
        dbAs('inactive').doc(`users/${uid.seller}`).update({ active: false }),
      );
    });
  });

  describe('settings/{settingId}', () => {
    it('permite leitura autenticada ativa e escrita apenas por admin', async () => {
      await assertSucceeds(
        dbAs('seller').doc('settings/deadlineDefaults').get(),
      );
      await assertFails(
        dbAs('inactive').doc('settings/deadlineDefaults').get(),
      );
      await assertFails(anonDb().doc('settings/deadlineDefaults').get());

      await assertSucceeds(
        dbAs('admin').doc('settings/deadlineDefaults').set({ desenhoDias: 6 }),
      );
      await assertFails(
        dbAs('seller').doc('settings/deadlineDefaults').set({ desenhoDias: 7 }),
      );
      await assertFails(
        anonDb().doc('settings/deadlineDefaults').set({ desenhoDias: 8 }),
      );
    });
  });

  describe('sellers/{sellerId}', () => {
    it('permite leitura para usuario ativo e escrita apenas por admin', async () => {
      await assertSucceeds(
        dbAs('admin').doc('sellers/senha-123').set({
          name: 'Vendedor Legado',
          password: 'legado',
        }),
      );

      await assertSucceeds(dbAs('seller').doc('sellers/senha-123').get());
      await assertSucceeds(
        dbAs('seller')
          .collection('sellers')
          .where('password', '==', 'legado')
          .get(),
      );
      await assertFails(
        dbAs('seller').doc('sellers/senha-123').update({ name: 'No' }),
      );
      await assertFails(
        dbAs('designer').doc('sellers/outro').set({ name: 'No' }),
      );
      await assertFails(anonDb().doc('sellers/senha-123').get());
      await assertFails(dbAs('inactive').doc('sellers/senha-123').get());
    });
  });

  describe('orders/{orderId} e estimates/{estimateId}', () => {
    it.each(['orders', 'estimates'] as const)(
      'permite leitura ativa, create/update de admin e seller, delete apenas admin em %s',
      async collection => {
        for (const role of ['admin', 'seller'] as const) {
          await assertSucceeds(
            dbAs(role).doc(`${collection}/doc-${role}`).set(basicDoc),
          );
          await assertSucceeds(
            dbAs(role).doc(`${collection}/doc-${role}`).update({ ok: false }),
          );
        }

        for (const role of ['designer', 'assembler', 'woodworker'] as const) {
          await assertSucceeds(dbAs(role).doc(`${collection}/doc-admin`).get());
          await assertFails(dbAs(role).doc(`${collection}/novo`).set(basicDoc));
          await assertFails(
            dbAs(role).doc(`${collection}/doc-admin`).update({ ok: false }),
          );
          await assertFails(dbAs(role).doc(`${collection}/doc-admin`).delete());
        }

        await assertFails(
          dbAs('seller').doc(`${collection}/doc-admin`).delete(),
        );
        await assertSucceeds(
          dbAs('admin').doc(`${collection}/doc-seller`).delete(),
        );

        await assertFails(
          dbAs('inactive').doc(`${collection}/doc-admin`).get(),
        );
        await assertFails(anonDb().doc(`${collection}/doc-admin`).get());
        await assertFails(anonDb().doc(`${collection}/anon`).set(basicDoc));
      },
    );
  });

  describe('materials/{materialId}', () => {
    it('permite leitura ativa e CRUD completo para admin e seller', async () => {
      for (const role of ['admin', 'seller'] as const) {
        await assertSucceeds(
          dbAs(role).doc(`materials/mat-${role}`).set(basicDoc),
        );
        await assertSucceeds(
          dbAs(role).doc(`materials/mat-${role}`).update({ ok: false }),
        );
        await assertSucceeds(dbAs(role).doc(`materials/mat-${role}`).delete());
      }

      await assertSucceeds(
        dbAs('admin').doc('materials/mat-shared').set(basicDoc),
      );

      for (const role of ['designer', 'assembler', 'woodworker'] as const) {
        await assertSucceeds(dbAs(role).doc('materials/mat-shared').get());
        await assertFails(dbAs(role).doc('materials/novo').set(basicDoc));
        await assertFails(
          dbAs(role).doc('materials/mat-shared').update({ ok: false }),
        );
        await assertFails(dbAs(role).doc('materials/mat-shared').delete());
      }

      await assertFails(dbAs('inactive').doc('materials/mat-shared').get());
      await assertFails(anonDb().doc('materials/mat-shared').get());
      await assertFails(anonDb().doc('materials/anon').set(basicDoc));
    });
  });

  describe('counters/{counterId}', () => {
    it('permite leitura ativa e escrita para admin e seller (sequencia de codigos)', async () => {
      await assertSucceeds(
        dbAs('admin').doc('counters/orders').set({ value: 1 }),
      );
      await assertSucceeds(
        dbAs('seller').doc('counters/orders').set({ value: 2 }),
      );

      for (const role of ['designer', 'assembler', 'woodworker'] as const) {
        await assertSucceeds(dbAs(role).doc('counters/orders').get());
        await assertFails(dbAs(role).doc('counters/orders').set({ value: 3 }));
        await assertFails(dbAs(role).doc('counters/orders').delete());
      }

      await assertFails(dbAs('inactive').doc('counters/orders').get());
      await assertFails(anonDb().doc('counters/orders').get());
      await assertFails(anonDb().doc('counters/orders').set({ value: 4 }));
    });
  });

  describe('config/{configId}', () => {
    it('restringe configurações gerais, mas libera a máquina aos papéis de corte', async () => {
      await assertSucceeds(
        dbAs('admin').doc('config/fretes').set({ value: 10 }),
      );

      for (const role of [
        'seller',
        'designer',
        'assembler',
        'woodworker',
      ] as const) {
        await assertSucceeds(dbAs(role).doc('config/fretes').get());
        await assertFails(dbAs(role).doc('config/fretes').set({ value: 20 }));
        await assertFails(dbAs(role).doc('config/fretes').delete());
      }

      await assertSucceeds(dbAs('admin').doc('config/fretes').delete());
      for (const role of ['admin', 'seller', 'woodworker'] as const) {
        await assertSucceeds(
          dbAs(role).doc('config/cutting-machine').set({ kerfMm: 4.5 }),
        );
      }
      for (const role of ['designer', 'assembler'] as const) {
        await assertFails(
          dbAs(role).doc('config/cutting-machine').set({ kerfMm: 4.5 }),
        );
      }
      await assertFails(dbAs('seller').doc('config/cutting-machine').delete());
      await assertFails(
        dbAs('woodworker').doc('config/cutting-machine').delete(),
      );
      await assertFails(dbAs('inactive').doc('config/fretes').get());
      await assertFails(anonDb().doc('config/fretes').get());
      await assertFails(anonDb().doc('config/fretes').set({ value: 30 }));
    });
  });

  describe('projects/{projectId}', () => {
    it('permite read/create/update para admin e seller; delete apenas admin', async () => {
      for (const role of ['admin', 'seller'] as const) {
        await assertSucceeds(dbAs(role).doc('projects/project-1').get());
        await assertSucceeds(
          dbAs(role).doc(`projects/create-${role}`).set(basicDoc),
        );
        await assertSucceeds(
          dbAs(role).doc('projects/project-1').update({ updatedBy: uid[role] }),
        );
      }

      await assertSucceeds(
        dbAs('designer')
          .doc('projects/project-1')
          .update({
            itemSummary: { total: 2 },
            totalCustomerValue: 1200,
          }),
      );
      await assertSucceeds(dbAs('admin').doc('projects/project-1').delete());

      await assertFails(dbAs('designer').doc('projects/project-1').get());
      await assertFails(
        dbAs('designer').doc('projects/project-1').update({
          customerName: 'Alterado indevido',
        }),
      );
      await assertFails(dbAs('assembler').doc('projects/project-1').get());
      await assertFails(dbAs('woodworker').doc('projects/project-1').get());
      await assertFails(dbAs('seller').doc('projects/project-1').delete());
      await assertFails(anonDb().doc('projects/project-1').get());
      await assertFails(anonDb().doc('projects/new-project').set(basicDoc));
      await assertFails(dbAs('inactive').doc('projects/project-1').get());
    });
  });

  describe('projects/*/attachments', () => {
    const path = 'projects/project-1/attachments/project-attachment';

    it('permite read/create para admin e seller; update/delete apenas admin', async () => {
      for (const role of ['admin', 'seller'] as const) {
        await assertSucceeds(dbAs(role).doc(path).get());
        await assertSucceeds(
          dbAs(role)
            .doc(`projects/project-1/attachments/create-${role}`)
            .set(basicDoc),
        );
      }

      await assertSucceeds(dbAs('admin').doc(path).update({ reviewed: true }));
      await assertSucceeds(dbAs('admin').doc(path).delete());

      await assertFails(dbAs('designer').doc(path).get());
      await assertFails(dbAs('seller').doc(path).update({ reviewed: false }));
      await assertFails(dbAs('seller').doc(path).delete());
      await assertFails(anonDb().doc(path).get());
      await assertFails(dbAs('inactive').doc(path).get());
    });
  });

  describe('projects/*/items', () => {
    const ownPath = 'projects/project-1/items/designer-item';
    const otherPath = 'projects/project-1/items/other-designer-item';

    it('restringe leitura e edicao do item por papel e designer atribuido', async () => {
      for (const role of ['admin', 'seller'] as const) {
        await assertSucceeds(dbAs(role).doc(ownPath).get());
        await assertSucceeds(
          dbAs(role).doc(`projects/project-1/items/new-${role}`).set(basicDoc),
        );
        await assertSucceeds(
          dbAs(role).doc(ownPath).update({ touchedBy: role }),
        );
      }

      await assertSucceeds(dbAs('designer').doc(ownPath).get());
      await assertSucceeds(
        dbAs('designer').doc(ownPath).update({ designerNote: 'ok' }),
      );
      await assertSucceeds(dbAs('assembler').doc(ownPath).get());

      await assertFails(dbAs('designer').doc(otherPath).get());
      await assertFails(
        dbAs('designer').doc(otherPath).update({ designerNote: 'no' }),
      );
      await assertFails(dbAs('assembler').doc(otherPath).get());
      await assertFails(
        dbAs('assembler').doc(ownPath).update({ assemblerNote: 'no' }),
      );
      await assertFails(dbAs('woodworker').doc(ownPath).get());
      await assertFails(
        dbAs('designer')
          .doc('projects/project-1/items/designer-create')
          .set(basicDoc),
      );
      await assertSucceeds(dbAs('admin').doc(ownPath).delete());
      await assertFails(dbAs('seller').doc(ownPath).delete());
      await assertFails(anonDb().doc(ownPath).get());
      await assertFails(dbAs('inactive').doc(ownPath).get());
    });

    it('permite query collection-group de itens para o designer atribuido', async () => {
      await assertSucceeds(
        dbAs('designer')
          .collectionGroup('items')
          .where('designerId', '==', uid.designer)
          .get(),
      );
      await assertFails(
        dbAs('otherDesigner')
          .collectionGroup('items')
          .where('designerId', '==', uid.designer)
          .get(),
      );
    });
  });

  describe('items/*/attachments', () => {
    const assemblerFile =
      'projects/project-1/items/designer-item/attachments/assembler-file';
    const internalFile =
      'projects/project-1/items/designer-item/attachments/internal-file';

    it('permite montador atribuido ler/criar apenas anexos assembler e admin controlar updates', async () => {
      await assertSucceeds(dbAs('admin').doc(assemblerFile).get());
      await assertSucceeds(dbAs('seller').doc(assemblerFile).get());
      await assertSucceeds(dbAs('assembler').doc(assemblerFile).get());
      await assertSucceeds(dbAs('designer').doc(internalFile).get());

      await assertFails(dbAs('assembler').doc(internalFile).get());
      await assertFails(dbAs('otherAssembler').doc(assemblerFile).get());
      await assertFails(dbAs('designer').doc(assemblerFile).get());
      await assertFails(anonDb().doc(assemblerFile).get());

      const createPath =
        'projects/project-1/items/designer-item/attachments/assembler-created';
      await assertSucceeds(
        dbAs('assembler').doc(createPath).set({
          visibility: 'assembler',
          uploadedBy: uid.assembler,
          uploadedByRole: 'assembler',
        }),
      );
      await assertFails(
        dbAs('assembler').doc(`${createPath}-client`).set({
          visibility: 'client',
          uploadedBy: uid.assembler,
          uploadedByRole: 'assembler',
        }),
      );
      await assertFails(
        dbAs('assembler').doc(`${createPath}-wrong-user`).set({
          visibility: 'assembler',
          uploadedBy: uid.otherAssembler,
          uploadedByRole: 'assembler',
        }),
      );
      await assertFails(
        dbAs('assembler').doc(`${createPath}-wrong-role`).set({
          visibility: 'assembler',
          uploadedBy: uid.assembler,
          uploadedByRole: 'seller',
        }),
      );

      const designerCreatePath =
        'projects/project-1/items/designer-item/attachments/designer-client';
      await assertSucceeds(
        dbAs('designer').doc(designerCreatePath).set({
          visibility: 'client',
          uploadedBy: uid.designer,
          uploadedByRole: 'designer',
        }),
      );
      await assertFails(
        dbAs('designer').doc(`${designerCreatePath}-assembler`).set({
          visibility: 'assembler',
          uploadedBy: uid.designer,
          uploadedByRole: 'designer',
        }),
      );
      await assertFails(
        dbAs('otherDesigner').doc(`${designerCreatePath}-other`).set({
          visibility: 'client',
          uploadedBy: uid.otherDesigner,
          uploadedByRole: 'designer',
        }),
      );

      await assertSucceeds(
        dbAs('admin').doc(assemblerFile).update({ reviewed: true }),
      );
      await assertSucceeds(dbAs('admin').doc(assemblerFile).delete());
      await assertFails(
        dbAs('seller').doc(assemblerFile).update({ reviewed: false }),
      );
      await assertFails(dbAs('assembler').doc(assemblerFile).delete());
      await assertFails(dbAs('inactive').doc(assemblerFile).get());
    });
  });

  describe('items/*/statusHistory', () => {
    const path =
      'projects/project-1/items/designer-item/statusHistory/history-1';

    it('permite create por autenticado ativo e nunca permite update/delete', async () => {
      for (const role of [
        'admin',
        'seller',
        'designer',
        'assembler',
        'woodworker',
      ] as const) {
        await assertSucceeds(
          dbAs(role)
            .doc(
              `projects/project-1/items/designer-item/statusHistory/create-${role}`,
            )
            .set({ toStatus: 'aguardando_desenho', changedBy: uid[role] }),
        );
      }

      await assertFails(dbAs('inactive').doc(`${path}-inactive`).set(basicDoc));
      await assertFails(anonDb().doc(`${path}-anon`).set(basicDoc));
      await assertFails(dbAs('admin').doc(path).update({ note: 'no' }));
      await assertFails(dbAs('seller').doc(path).delete());
      await assertFails(dbAs('designer').doc(path).update({ note: 'no' }));
    });
  });

  describe('items/*/versions', () => {
    const path = 'projects/project-1/items/designer-item/versions/version-1';

    it('permite designer do item ler/criar versoes e update/delete apenas admin', async () => {
      await assertSucceeds(dbAs('admin').doc(path).get());
      await assertSucceeds(dbAs('seller').doc(path).get());
      await assertSucceeds(dbAs('designer').doc(path).get());
      await assertSucceeds(
        dbAs('designer')
          .doc(
            'projects/project-1/items/designer-item/versions/designer-version',
          )
          .set({ attachmentIds: [], createdBy: uid.designer }),
      );
      await assertSucceeds(
        dbAs('admin').doc(path).update({ visibleToClient: true }),
      );
      await assertSucceeds(dbAs('admin').doc(path).delete());

      await assertFails(dbAs('otherDesigner').doc(path).get());
      await assertFails(
        dbAs('otherDesigner')
          .doc('projects/project-1/items/designer-item/versions/other-version')
          .set({ attachmentIds: [], createdBy: uid.otherDesigner }),
      );
      await assertFails(
        dbAs('seller').doc(path).update({ visibleToClient: false }),
      );
      await assertFails(dbAs('designer').doc(path).delete());
      await assertFails(anonDb().doc(path).get());
    });
  });

  describe('items/*/assemblerAssignments', () => {
    const path =
      'projects/project-1/items/designer-item/assemblerAssignments/assembler-uid';
    const wrongIdPath =
      'projects/project-1/items/designer-item/assemblerAssignments/wrong-id';

    it('permite montador ler apenas propria atribuicao e escrita apenas admin', async () => {
      await assertSucceeds(dbAs('admin').doc(path).get());
      await assertSucceeds(dbAs('assembler').doc(path).get());
      await assertFails(dbAs('assembler').doc(wrongIdPath).get());
      await assertFails(dbAs('otherAssembler').doc(path).get());
      await assertFails(dbAs('seller').doc(path).get());
      await assertFails(anonDb().doc(path).get());

      await assertSucceeds(
        dbAs('assembler')
          .collectionGroup('assemblerAssignments')
          .where('assemblerId', '==', uid.assembler)
          .get(),
      );

      await assertFails(
        dbAs('assembler').doc(path).update({
          paymentStatus: 'confirmado_pelo_montador',
          amountToReceive: 999,
        }),
      );
      await assertSucceeds(
        dbAs('assembler').doc(path).update({
          paymentStatus: 'confirmado_pelo_montador',
          paymentConfirmedAt: 1,
          updatedAt: 2,
        }),
      );

      await assertSucceeds(
        dbAs('admin')
          .doc(
            'projects/project-1/items/designer-item/assemblerAssignments/new-one',
          )
          .set({ assemblerId: uid.otherAssembler }),
      );
      await assertSucceeds(
        dbAs('admin').doc(path).update({ amountToReceive: 300 }),
      );
      await assertSucceeds(dbAs('admin').doc(path).delete());

      await assertFails(
        dbAs('seller').doc(path).set({ assemblerId: uid.seller }),
      );
      await assertFails(
        dbAs('assembler').doc(path).update({ amountToReceive: 1 }),
      );
      await assertFails(dbAs('assembler').doc(path).delete());
      await assertFails(dbAs('inactive').doc(path).get());
    });
  });

  describe('payments/{paymentId}', () => {
    const ownedPath = 'payments/payment-owned';
    const otherPath = 'payments/payment-other';

    it('permite admin controlar pagamentos e montador confirmar apenas o proprio sem mudar invariantes', async () => {
      await assertSucceeds(dbAs('admin').doc(ownedPath).get());
      await assertSucceeds(dbAs('assembler').doc(ownedPath).get());
      await assertFails(dbAs('assembler').doc(otherPath).get());
      await assertFails(dbAs('seller').doc(ownedPath).get());
      await assertFails(anonDb().doc(ownedPath).get());

      await assertSucceeds(
        dbAs('admin')
          .doc('payments/new-payment')
          .set(paymentData(uid.assembler)),
      );
      await assertSucceeds(
        dbAs('admin').doc(ownedPath).update({ amount: 300 }),
      );
      await assertSucceeds(dbAs('admin').doc(otherPath).delete());

      await assertSucceeds(
        dbAs('assembler').doc(ownedPath).update({
          status: 'confirmado_pelo_montador',
        }),
      );

      await assertFails(
        dbAs('otherAssembler').doc(ownedPath).update({
          status: 'confirmado_pelo_montador',
        }),
      );
      await assertFails(dbAs('assembler').doc(ownedPath).delete());
      await assertFails(
        dbAs('seller')
          .doc('payments/seller-create')
          .set(paymentData(uid.assembler)),
      );
      await assertFails(dbAs('inactive').doc(ownedPath).get());
    });

    it('nega confirmacao do montador quando qualquer campo imutavel muda', async () => {
      const invariantViolations = [
        { amount: 999 },
        { assemblerId: uid.otherAssembler },
        { projectId: 'other-project' },
        { itemId: 'other-item' },
        { assignmentId: 'other-assignment' },
        { paidBy: uid.seller },
        { paidAt: new Date('2026-01-03T00:00:00.000Z') },
      ];

      for (const [index, violation] of invariantViolations.entries()) {
        const path = `payments/invariant-${index}`;
        await testEnv.withSecurityRulesDisabled(async context => {
          await context.firestore().doc(path).set(paymentData(uid.assembler));
        });
        await assertFails(
          dbAs('assembler')
            .doc(path)
            .update({ status: 'confirmado_pelo_montador', ...violation }),
        );
      }

      await testEnv.withSecurityRulesDisabled(async context => {
        await context
          .firestore()
          .doc('payments/not-paid')
          .set({
            ...paymentData(uid.assembler),
            status: 'confirmado_pelo_montador',
          });
      });
      await assertFails(
        dbAs('assembler')
          .doc('payments/not-paid')
          .update({ status: 'confirmado_pelo_montador' }),
      );
    });
  });

  it('nega usuario nao autenticado em todas as colecoes principais', async () => {
    const paths = [
      'users/admin-uid',
      'settings/deadlineDefaults',
      'sellers/senha-123',
      'orders/order-1',
      'estimates/estimate-1',
      'materials/material-1',
      'counters/orders',
      'config/fretes',
      'projects/project-1',
      'projects/project-1/attachments/project-attachment',
      'projects/project-1/items/designer-item',
      'projects/project-1/items/designer-item/attachments/assembler-file',
      'projects/project-1/items/designer-item/statusHistory/history-1',
      'projects/project-1/items/designer-item/versions/version-1',
      'projects/project-1/items/designer-item/assemblerAssignments/assembler-uid',
      'payments/payment-owned',
    ];

    for (const path of paths) {
      await assertFails(anonDb().doc(path).get());
      await assertFails(anonDb().doc(path).set(basicDoc));
      await assertFails(anonDb().doc(path).delete());
    }
  });
});
