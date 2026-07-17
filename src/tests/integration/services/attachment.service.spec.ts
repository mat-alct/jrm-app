import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getBytes, getMetadata, ref } from 'firebase/storage';

import { auth, storage } from '@/services/firebase';
import { adminDb, adminStorage } from '@/services/firebaseAdmin';
import {
  listAttachments,
  uploadAttachment,
} from '@/services/projects/attachment.service';
import {
  deleteAttachment,
  updateAttachmentAudience,
} from '@/services/projects/attachmentAdmin';
import {
  itemAttachmentPath,
  itemAttachmentStoragePath,
} from '@/services/projects/paths';
import { resetEmulator, TEST_STORAGE_BUCKET } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD, seedEmulator } from '@/tests/helpers/seedEmulator';
import type { Attachment } from '@/types/projects';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

function textFile(name: string, contents: string, type = 'text/plain'): File {
  return new File([contents], name, { type });
}

async function expectDownloadUrlToReturn(
  downloadUrl: string,
  expectedContents: string,
): Promise<void> {
  const response = await fetch(downloadUrl);
  expect(response.status).toBe(200);
  await expect(response.text()).resolves.toBe(expectedContents);
}

async function expectStoredObject(
  storagePath: string,
  expectedContents: string,
): Promise<void> {
  const [exists] = await adminStorage.bucket().file(storagePath).exists();
  expect(exists).toBe(true);

  const sdkBytes = await getBytes(ref(storage, storagePath));
  expect(Buffer.from(sdkBytes).toString('utf8')).toBe(expectedContents);

  const metadata = await getMetadata(ref(storage, storagePath));
  expect(metadata.bucket).toBe(TEST_STORAGE_BUCKET);
}

async function expectAttachmentDoc(
  path: string,
  attachment: Attachment,
): Promise<void> {
  const doc = await adminDb.doc(path).get();
  expect(doc.exists).toBe(true);
  expect(doc.data()).toMatchObject({
    id: attachment.id,
    projectId: attachment.projectId,
    ...(attachment.itemId ? { itemId: attachment.itemId } : {}),
    fileName: attachment.fileName,
    originalFileName: attachment.originalFileName,
    storagePath: attachment.storagePath,
    downloadUrl: attachment.downloadUrl,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    fileKind: attachment.fileKind,
    category: attachment.category,
    audience: attachment.audience,
    uploadedBy: attachment.uploadedBy,
    uploadedByName: attachment.uploadedByName,
    uploadedByRole: attachment.uploadedByRole,
  });
}

describe('services/projects/attachment.service integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('uploads, stores, downloads and lists an item-level attachment with the default audience', async () => {
    await signInAs('vendedor@seed.jrm');
    const contents = 'foto do item';

    const attachment = await uploadAttachment({
      projectId: 'seed-project-1',
      itemId: 'seed-item-1',
      file: textFile('Foto Medição.png', contents, 'image/png'),
      category: 'medicao',
      uploadedBy: 'seed-seller',
      uploadedByName: 'Vendedor Seed',
      uploadedByRole: 'seller',
    });

    expect(attachment).toMatchObject({
      projectId: 'seed-project-1',
      itemId: 'seed-item-1',
      fileName: 'Foto_Medicao.png',
      originalFileName: 'Foto Medição.png',
      mimeType: 'image/png',
      sizeBytes: contents.length,
      fileKind: 'image',
      category: 'medicao',
      audience: { seller: true, designer: true, assembler: true, client: true },
    });
    expect(attachment.storagePath).toBe(
      itemAttachmentStoragePath(
        'seed-project-1',
        'seed-item-1',
        'medicao',
        attachment.id,
        'Foto_Medicao.png',
      ),
    );

    await expectStoredObject(attachment.storagePath, contents);
    expect(attachment.downloadUrl).toEqual(expect.any(String));
    await expectDownloadUrlToReturn(attachment.downloadUrl as string, contents);
    await expectAttachmentDoc(
      itemAttachmentPath('seed-project-1', 'seed-item-1', attachment.id),
      attachment,
    );

    await expect(
      listAttachments('seed-project-1', 'seed-item-1'),
    ).resolves.toEqual([
      expect.objectContaining({
        id: attachment.id,
        storagePath: attachment.storagePath,
        fileKind: 'image',
        audience: { seller: true, designer: true, assembler: true, client: true },
      }),
    ]);
  });

  it('uploads an attachment with a custom audience, excluding the assembler', async () => {
    await signInAs('vendedor@seed.jrm');

    const attachment = await uploadAttachment({
      projectId: 'seed-project-1',
      itemId: 'seed-item-1',
      file: textFile('Orcamento.pdf', 'orcamento', 'application/pdf'),
      category: 'orcamento',
      audience: { seller: true, designer: true, assembler: false, client: true },
      uploadedBy: 'seed-seller',
      uploadedByName: 'Vendedor Seed',
      uploadedByRole: 'seller',
    });

    expect(attachment.audience).toEqual({
      seller: true,
      designer: true,
      assembler: false,
      client: true,
    });
    await expectAttachmentDoc(
      itemAttachmentPath('seed-project-1', 'seed-item-1', attachment.id),
      attachment,
    );
  });

  it('updates the audience of an existing attachment as admin', async () => {
    await signInAs('vendedor@seed.jrm');
    const attachment = await uploadAttachment({
      projectId: 'seed-project-1',
      itemId: 'seed-item-1',
      file: textFile('Contrato.pdf', 'contrato', 'application/pdf'),
      category: 'contrato',
      uploadedBy: 'seed-seller',
      uploadedByName: 'Vendedor Seed',
      uploadedByRole: 'seller',
    });
    await signOut(auth);

    await signInAs('admin@seed.jrm');
    const newAudience = {
      seller: true,
      designer: false,
      assembler: false,
      client: true,
    };
    await updateAttachmentAudience(
      'seed-project-1',
      'seed-item-1',
      attachment.id,
      newAudience,
    );

    const snap = await adminDb
      .doc(itemAttachmentPath('seed-project-1', 'seed-item-1', attachment.id))
      .get();
    expect(snap.data()).toMatchObject({ audience: newAudience });
  });

  it('deletes attachment metadata and object for an admin user', async () => {
    await signInAs('vendedor@seed.jrm');
    const attachment = await uploadAttachment({
      projectId: 'seed-project-1',
      itemId: 'seed-item-1',
      file: textFile('Remover.txt', 'remover'),
      category: 'geral',
      uploadedBy: 'seed-seller',
      uploadedByName: 'Vendedor Seed',
      uploadedByRole: 'seller',
    });
    await signOut(auth);

    await signInAs('admin@seed.jrm');
    await deleteAttachment(attachment);

    await expect(
      adminDb
        .doc(itemAttachmentPath('seed-project-1', 'seed-item-1', attachment.id))
        .get(),
    ).resolves.toMatchObject({ exists: false });
    await expect(
      adminStorage.bucket().file(attachment.storagePath).exists(),
    ).resolves.toEqual([false]);
  });
});
