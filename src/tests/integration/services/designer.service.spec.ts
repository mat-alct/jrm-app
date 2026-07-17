import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getBytes, ref } from 'firebase/storage';

import { auth, storage } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import {
  getDesignerQueue,
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

  it('lists only items assigned to the designer via collection-group query', async () => {
    await adminDb.doc(projectItemPath('seed-project-2', 'seed-item-5')).update({
      designerId: 'other-designer',
    });
    await signInAs('desenhista@seed.jrm');

    const queue = await getDesignerQueue('seed-designer');

    expect(queue.map(item => item.id).sort()).toEqual([
      'seed-item-1',
      'seed-item-2',
      'seed-item-3',
      'seed-item-4',
    ]);
    expect(queue.every(item => item.designerId === 'seed-designer')).toBe(true);
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
