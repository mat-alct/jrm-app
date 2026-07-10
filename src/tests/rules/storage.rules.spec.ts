import fs from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

type RoleName =
  | 'admin'
  | 'seller'
  | 'designer'
  | 'assembler'
  | 'otherAssembler'
  | 'woodworker'
  | 'inactive';

const uid: Record<RoleName, string> = {
  admin: 'admin-uid',
  seller: 'seller-uid',
  designer: 'designer-uid',
  assembler: 'assembler-uid',
  otherAssembler: 'other-assembler-uid',
  woodworker: 'woodworker-uid',
  inactive: 'inactive-uid',
};

const roles: Record<RoleName, string[]> = {
  admin: ['admin'],
  seller: ['seller'],
  designer: ['designer'],
  assembler: ['assembler'],
  otherAssembler: ['assembler'],
  woodworker: ['woodworker'],
  inactive: ['admin', 'seller', 'designer', 'assembler', 'woodworker'],
};

describe('storage.rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
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
    await testEnv.clearStorage();
    await seedFirestore();
  });

  function storageAs(role: RoleName) {
    return testEnv.authenticatedContext(uid[role]).storage();
  }

  function anonStorage() {
    return testEnv.unauthenticatedContext().storage();
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
          }),
        ),
      );

      await db.doc('projects/project-1').set({
        customerName: 'Cliente Alpha',
        sellerId: uid.seller,
      });
      await db.doc('projects/project-1/items/item-1').set({
        projectId: 'project-1',
        name: 'Item Alpha',
      });
      await db
        .doc(`projects/project-1/items/item-1/assemblerAssignments/${uid.assembler}`)
        .set({
          projectId: 'project-1',
          itemId: 'item-1',
          assemblerId: uid.assembler,
        });
      await db.doc('payments/payment-owned').set({
        assemblerId: uid.assembler,
        amount: 250,
        status: 'pago',
      });
      await db.doc('payments/payment-other').set({
        assemblerId: uid.otherAssembler,
        amount: 250,
        status: 'pago',
      });
    });
  }

  function bytes() {
    return new Uint8Array([74, 82, 77]);
  }

  function uploadAs(role: RoleName, path: string): Promise<unknown> {
    return storageAs(role).ref(path).put(bytes()) as unknown as Promise<unknown>;
  }

  function uploadAnon(path: string): Promise<unknown> {
    return anonStorage().ref(path).put(bytes()) as unknown as Promise<unknown>;
  }

  async function putAs(role: RoleName, path: string) {
    await assertSucceeds(uploadAs(role, path));
  }

  describe('projects/{id}/general/*', () => {
    const path = 'projects/project-1/general/contrato.pdf';

    it('permite read admin/seller/designer, write admin/seller e delete apenas admin', async () => {
      await putAs('admin', path);

      for (const role of ['admin', 'seller', 'designer'] as const) {
        await assertSucceeds(storageAs(role).ref(path).getMetadata());
      }

      await assertSucceeds(uploadAs('seller', 'projects/project-1/general/seller.pdf'));

      await assertFails(uploadAs('designer', 'projects/project-1/general/designer.pdf'));
      await assertFails(storageAs('assembler').ref(path).getMetadata());
      await assertFails(storageAs('woodworker').ref(path).getMetadata());
      await assertFails(storageAs('seller').ref(path).delete());
      await assertFails(storageAs('inactive').ref(path).getMetadata());
      await assertFails(anonStorage().ref(path).getMetadata());
      await assertFails(uploadAnon('projects/project-1/general/anon.pdf'));
      await assertSucceeds(storageAs('admin').ref(path).delete());
    });
  });

  describe('projects/{id}/items/{itemId}/{category}/*', () => {
    const path = 'projects/project-1/items/item-1/assembler/foto.jpg';

    it('permite read/write para admin/seller/designer e montador atribuido', async () => {
      await putAs('admin', path);

      for (const role of ['admin', 'seller', 'designer', 'assembler'] as const) {
        await assertSucceeds(storageAs(role).ref(path).getMetadata());
        await assertSucceeds(
          uploadAs(role, `projects/project-1/items/item-1/assembler/${role}.jpg`),
        );
      }

      await assertFails(storageAs('otherAssembler').ref(path).getMetadata());
      await assertFails(
        uploadAs(
          'otherAssembler',
          'projects/project-1/items/item-1/assembler/not-assigned.jpg',
        ),
      );
      await assertFails(storageAs('woodworker').ref(path).getMetadata());
      await assertFails(storageAs('seller').ref(path).delete());
      await assertFails(storageAs('inactive').ref(path).getMetadata());
      await assertFails(anonStorage().ref(path).getMetadata());
      await assertSucceeds(storageAs('admin').ref(path).delete());
    });
  });

  describe('projects/.../versions/{versionId}/*', () => {
    const path = 'projects/project-1/items/item-1/versions/version-1/model.glb';

    it('permite write admin/designer, nega write seller, e delete apenas admin', async () => {
      await assertSucceeds(uploadAs('admin', path));

      for (const role of ['admin', 'seller', 'designer'] as const) {
        await assertSucceeds(storageAs(role).ref(path).getMetadata());
      }

      await assertSucceeds(
        uploadAs(
          'designer',
          'projects/project-1/items/item-1/versions/version-1/designer.glb',
        ),
      );
      await assertFails(
        uploadAs(
          'seller',
          'projects/project-1/items/item-1/versions/version-1/seller.glb',
        ),
      );
      await assertFails(
        uploadAs(
          'assembler',
          'projects/project-1/items/item-1/versions/version-1/assembler.glb',
        ),
      );

      await assertFails(storageAs('designer').ref(path).delete());
      await assertFails(storageAs('inactive').ref(path).getMetadata());
      await assertFails(anonStorage().ref(path).getMetadata());
      await assertSucceeds(storageAs('admin').ref(path).delete());
    });
  });

  describe('payments/{paymentId}/*', () => {
    const path = 'payments/payment-owned/comprovante.pdf';

    it('permite read admin e montador dono; write/delete apenas admin', async () => {
      await assertSucceeds(uploadAs('admin', path));

      await assertSucceeds(storageAs('admin').ref(path).getMetadata());
      await assertSucceeds(storageAs('assembler').ref(path).getMetadata());
      await assertFails(storageAs('otherAssembler').ref(path).getMetadata());
      await assertFails(storageAs('seller').ref(path).getMetadata());
      await assertFails(storageAs('woodworker').ref(path).getMetadata());

      await assertFails(
        uploadAs('assembler', 'payments/payment-owned/assembler-upload.pdf'),
      );
      await assertFails(
        uploadAs('otherAssembler', 'payments/payment-other/other-upload.pdf'),
      );
      await assertFails(storageAs('assembler').ref(path).delete());
      await assertSucceeds(storageAs('admin').ref(path).delete());
      await assertFails(storageAs('inactive').ref(path).getMetadata());
      await assertFails(anonStorage().ref(path).getMetadata());
    });
  });

  it('nega anonimo em todos os paths de Storage cobertos', async () => {
    const paths = [
      'projects/project-1/general/anon.pdf',
      'projects/project-1/items/item-1/assembler/anon.jpg',
      'projects/project-1/items/item-1/versions/version-1/anon.glb',
      'payments/payment-owned/anon.pdf',
    ];

    for (const path of paths) {
      await assertFails(uploadAnon(path));
      await assertFails(anonStorage().ref(path).getMetadata());
    }
  });
});
