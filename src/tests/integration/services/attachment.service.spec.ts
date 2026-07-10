import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getBytes, getMetadata, ref } from 'firebase/storage';

import { deleteAttachment } from '@/services/projects/attachmentAdmin';
import {
  listAttachments,
  uploadAttachment,
} from '@/services/projects/attachment.service';
import {
  itemAttachmentPath,
  itemAttachmentStoragePath,
  projectAttachmentPath,
  projectAttachmentStoragePath,
} from '@/services/projects/paths';
import { auth, storage } from '@/services/firebase';
import { adminDb, adminStorage } from '@/services/firebaseAdmin';
import { resetEmulator, TEST_STORAGE_BUCKET } from '@/tests/helpers/emulator';
import { seedEmulator, SEED_USER_PASSWORD } from '@/tests/helpers/seedEmulator';
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
    visibility: attachment.visibility,
    uploadedBy: attachment.uploadedBy,
    uploadedByName: attachment.uploadedByName,
    uploadedByRole: attachment.uploadedByRole,
    clientVisible: attachment.clientVisible,
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

  it('uploads, stores, downloads and lists a project-level attachment', async () => {
    await signInAs('vendedor@seed.jrm');
    const contents = 'contrato aprovado';

    const attachment = await uploadAttachment({
      projectId: 'seed-project-1',
      file: textFile('Contrato final ção.pdf', contents, 'application/pdf'),
      category: 'contratos',
      visibility: 'client',
      uploadedBy: 'seed-seller',
      uploadedByName: 'Vendedor Seed',
      uploadedByRole: 'seller',
    });

    expect(attachment).toMatchObject({
      projectId: 'seed-project-1',
      fileName: 'Contrato_final_cao.pdf',
      originalFileName: 'Contrato final ção.pdf',
      mimeType: 'application/pdf',
      sizeBytes: contents.length,
      fileKind: 'document',
      category: 'contratos',
      visibility: 'client',
      uploadedBy: 'seed-seller',
      uploadedByName: 'Vendedor Seed',
      uploadedByRole: 'seller',
      clientVisible: true,
    });
    expect(attachment.storagePath).toBe(
      projectAttachmentStoragePath(
        'seed-project-1',
        attachment.id,
        'Contrato_final_cao.pdf',
      ),
    );

    await expectStoredObject(attachment.storagePath, contents);
    expect(attachment.downloadUrl).toEqual(expect.any(String));
    await expectDownloadUrlToReturn(attachment.downloadUrl as string, contents);
    await expectAttachmentDoc(
      projectAttachmentPath('seed-project-1', attachment.id),
      attachment,
    );

    await expect(listAttachments('seed-project-1')).resolves.toEqual([
      expect.objectContaining({
        id: attachment.id,
        storagePath: attachment.storagePath,
        fileKind: 'document',
        clientVisible: true,
      }),
    ]);
  });

  it('uploads, stores, downloads and lists an item-level attachment', async () => {
    await signInAs('vendedor@seed.jrm');
    const contents = 'foto do item';

    const attachment = await uploadAttachment({
      projectId: 'seed-project-1',
      itemId: 'seed-item-1',
      file: textFile('Foto Medição.png', contents, 'image/png'),
      category: 'medicao',
      visibility: 'internal',
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
      visibility: 'internal',
      clientVisible: false,
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
        clientVisible: false,
      }),
    ]);
  });

  it('deletes attachment metadata and object for an admin user', async () => {
    await signInAs('vendedor@seed.jrm');
    const attachment = await uploadAttachment({
      projectId: 'seed-project-1',
      file: textFile('Remover.txt', 'remover'),
      category: 'geral',
      visibility: 'internal',
      uploadedBy: 'seed-seller',
      uploadedByName: 'Vendedor Seed',
      uploadedByRole: 'seller',
    });
    await signOut(auth);

    await signInAs('admin@seed.jrm');
    await deleteAttachment(attachment);

    await expect(
      adminDb.doc(projectAttachmentPath('seed-project-1', attachment.id)).get(),
    ).resolves.toMatchObject({ exists: false });
    await expect(
      adminStorage.bucket().file(attachment.storagePath).exists(),
    ).resolves.toEqual([false]);
  });
});
