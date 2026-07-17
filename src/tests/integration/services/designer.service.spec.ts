import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getBytes, ref } from 'firebase/storage';
import { FieldValue } from 'firebase-admin/firestore';

import { auth, storage } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import {
  approveItemForDesign,
  assignDesignerByName,
  claimDesignItem,
  DesignClaimError,
  getDesignQueue,
  listItemVersions,
  submitDesignerVersion,
} from '@/services/projects/designer.service';
import {
  itemAttachmentPath,
  itemVersionPath,
  projectItemPath,
} from '@/services/projects/paths';
import { resetEmulator } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD, seedEmulator } from '@/tests/helpers/seedEmulator';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

function file(name: string, contents: string, type: string): File {
  return new File([contents], name, { type });
}

describe('services/projects/designer.service integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  describe('getDesignQueue', () => {
    it('returns items in queue statuses, assigned or not', async () => {
      await adminDb.doc(projectItemPath('seed-project-1', 'seed-item-1')).update({
        status: 'aguardando_desenho',
      });
      await adminDb.doc(projectItemPath('seed-project-1', 'seed-item-2')).update({
        status: 'alteracao_solicitada',
        designerId: null,
        designerName: null,
      });
      // seed-item-3/4/5 permanecem fora dos status de fila.

      await signInAs('desenhista@seed.jrm');

      const queue = await getDesignQueue();

      expect(queue.map(item => item.id).sort()).toEqual([
        'seed-item-1',
        'seed-item-2',
      ]);
    });
  });

  describe('approveItemForDesign', () => {
    it('sets deadlineCurrent and advances the item to aguardando_desenho', async () => {
      await adminDb.doc(`projects/seed-project-1/items/seed-item-novo`).set({
        projectId: 'seed-project-1',
        name: 'Item Novo',
        environment: 'Sala',
        status: 'projeto_criado',
        clientApprovalStatus: 'aguardando',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'seed-seller',
        updatedBy: 'seed-seller',
      });
      await signInAs('vendedor@seed.jrm');

      await approveItemForDesign('seed-project-1', 'seed-item-novo', {
        uid: 'seed-seller',
        name: 'Vendedor Seed',
        role: 'seller',
      });

      const snap = await adminDb
        .doc('projects/seed-project-1/items/seed-item-novo')
        .get();
      expect(snap.data()).toMatchObject({ status: 'aguardando_desenho' });
      expect(snap.data()?.deadlineCurrent).toBeDefined();

      const historySnap = await adminDb
        .collection(
          'projects/seed-project-1/items/seed-item-novo/statusHistory',
        )
        .get();
      expect(historySnap.docs.map(d => d.data().toStatus)).toContain(
        'aguardando_desenho',
      );
    });
  });

  describe('claimDesignItem', () => {
    it('lets an active designer claim an unassigned queued item', async () => {
      await adminDb.doc(projectItemPath('seed-project-1', 'seed-item-1')).update({
        status: 'aguardando_desenho',
        designerId: FieldValue.delete(),
        designerName: FieldValue.delete(),
      });
      await signInAs('desenhista@seed.jrm');

      await claimDesignItem('seed-project-1', 'seed-item-1', {
        uid: 'seed-designer',
        name: 'Desenhista Seed',
      });

      const snap = await adminDb
        .doc(projectItemPath('seed-project-1', 'seed-item-1'))
        .get();
      expect(snap.data()).toMatchObject({
        designerId: 'seed-designer',
        designerName: 'Desenhista Seed',
      });
    });

    it('rejects claiming an item that already has a designer (corrida)', async () => {
      await adminDb.doc(projectItemPath('seed-project-1', 'seed-item-1')).update({
        status: 'aguardando_desenho',
        designerId: 'seed-designer',
        designerName: 'Desenhista Seed',
      });
      await signInAs('desenhista@seed.jrm');

      await expect(
        claimDesignItem('seed-project-1', 'seed-item-1', {
          uid: 'seed-designer',
          name: 'Segunda tentativa',
        }),
      ).rejects.toThrow(DesignClaimError);

      const snap = await adminDb
        .doc(projectItemPath('seed-project-1', 'seed-item-1'))
        .get();
      expect(snap.data()?.designerName).toBe('Desenhista Seed');
    });
  });

  describe('assignDesignerByName', () => {
    it('matches an active designer by name and sets designerId', async () => {
      await adminDb.doc(projectItemPath('seed-project-1', 'seed-item-1')).update({
        status: 'aguardando_desenho',
        designerId: null,
        designerName: null,
      });
      await signInAs('admin@seed.jrm');

      await assignDesignerByName(
        'seed-project-1',
        'seed-item-1',
        'Desenhista Seed',
        [{ id: 'seed-designer', name: 'Desenhista Seed' }],
        { uid: 'seed-admin' },
      );

      const snap = await adminDb
        .doc(projectItemPath('seed-project-1', 'seed-item-1'))
        .get();
      expect(snap.data()).toMatchObject({
        designerId: 'seed-designer',
        designerName: 'Desenhista Seed',
      });
    });

    it('keeps only the name and clears designerId for an unmatched name', async () => {
      await adminDb.doc(projectItemPath('seed-project-1', 'seed-item-1')).update({
        status: 'aguardando_desenho',
        designerId: 'seed-designer',
        designerName: 'Desenhista Seed',
      });
      await signInAs('admin@seed.jrm');

      await assignDesignerByName(
        'seed-project-1',
        'seed-item-1',
        'Renato',
        [{ id: 'seed-designer', name: 'Desenhista Seed' }],
        { uid: 'seed-admin' },
      );

      const snap = await adminDb
        .doc(projectItemPath('seed-project-1', 'seed-item-1'))
        .get();
      expect(snap.data()?.designerName).toBe('Renato');
      expect(snap.data()?.designerId).toBeUndefined();
    });
  });

  it('submits a version with real attachment upload and advances the item status', async () => {
    await adminDb.doc(projectItemPath('seed-project-1', 'seed-item-1')).update({
      status: 'aguardando_desenho',
      currentVersionId: null,
    });
    await signInAs('desenhista@seed.jrm');

    const versionId = await submitDesignerVersion(
      'seed-project-1',
      'seed-item-1',
      [file('Projeto 3D.glb', 'model-bytes', 'model/gltf-binary')],
      'Primeira versão do desenho',
      {
        uid: 'seed-designer',
        name: 'Desenhista Seed',
        role: 'designer',
      },
    );

    const versions = await listItemVersions('seed-project-1', 'seed-item-1');
    expect(versions).toEqual([
      expect.objectContaining({
        id: versionId,
        projectId: 'seed-project-1',
        itemId: 'seed-item-1',
        versionNumber: 1,
        description: 'Primeira versão do desenho',
        createdBy: 'seed-designer',
        visibleToClient: true,
        attachmentIds: [expect.any(String)],
      }),
    ]);

    const attachmentId = versions[0].attachmentIds[0];
    const attachmentSnap = await adminDb
      .doc(itemAttachmentPath('seed-project-1', 'seed-item-1', attachmentId))
      .get();
    expect(attachmentSnap.data()).toMatchObject({
      id: attachmentId,
      projectId: 'seed-project-1',
      itemId: 'seed-item-1',
      fileName: 'Projeto_3D.glb',
      originalFileName: 'Projeto 3D.glb',
      category: 'versao-1',
      audience: { seller: true, designer: true, assembler: true, client: true },
      uploadedBy: 'seed-designer',
      uploadedByName: 'Desenhista Seed',
      uploadedByRole: 'designer',
      fileKind: 'model_3d',
    });

    const storagePath = attachmentSnap.data()?.storagePath as string;
    const bytes = await getBytes(ref(storage, storagePath));
    expect(Buffer.from(bytes).toString('utf8')).toBe('model-bytes');

    const versionSnap = await adminDb
      .doc(itemVersionPath('seed-project-1', 'seed-item-1', versionId))
      .get();
    expect(versionSnap.exists).toBe(true);

    const itemSnap = await adminDb
      .doc(projectItemPath('seed-project-1', 'seed-item-1'))
      .get();
    expect(itemSnap.data()).toMatchObject({
      currentVersionId: versionId,
      status: 'aguardando_orcamento',
      updatedBy: 'seed-designer',
    });
  });
});
