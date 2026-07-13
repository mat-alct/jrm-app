import {
  collection,
  doc,
  getDocs,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { v4 } from 'uuid';

import { Attachment, AttachmentVisibility, UserRole } from '@/types/projects';

import { inferAttachmentFileKind } from '../../utils/projects/attachments';
import { canViewAttachment } from '../../utils/projects/permissions';
import { db, storage } from '../firebase';
import {
  itemAttachmentsPath,
  itemAttachmentStoragePath,
  projectAttachmentsPath,
  projectAttachmentStoragePath,
} from './paths';

export function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = sizeBytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function filterAttachmentsByRole(
  attachments: Attachment[],
  userRoles: UserRole[] | undefined,
): Attachment[] {
  return attachments.filter(attachment =>
    canViewAttachment(attachment.visibility, userRoles),
  );
}

interface UploadAttachmentParams {
  projectId: string;
  itemId?: string;
  file: File;
  category: string;
  visibility: AttachmentVisibility;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByRole: UserRole;
}

export async function uploadAttachment({
  projectId,
  itemId,
  file,
  category,
  visibility,
  uploadedBy,
  uploadedByName,
  uploadedByRole,
}: UploadAttachmentParams): Promise<Attachment> {
  const attachmentId = v4();
  const fileName = sanitizeFileName(file.name);
  const mimeType = file.type || 'application/octet-stream';

  const storagePath = itemId
    ? itemAttachmentStoragePath(
        projectId,
        itemId,
        category,
        attachmentId,
        fileName,
      )
    : projectAttachmentStoragePath(projectId, attachmentId, fileName);

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: mimeType });
  const downloadUrl = await getDownloadURL(storageRef);

  const attachment: Attachment = {
    id: attachmentId,
    projectId,
    ...(itemId ? { itemId } : {}),
    fileName,
    originalFileName: file.name,
    storagePath,
    downloadUrl,
    mimeType,
    sizeBytes: file.size,
    fileKind: inferAttachmentFileKind(file),
    category,
    visibility,
    uploadedBy,
    ...(uploadedByName ? { uploadedByName } : {}),
    uploadedByRole,
    clientVisible: visibility === 'client',
    createdAt: Timestamp.now(),
  };

  const collectionPath = itemId
    ? itemAttachmentsPath(projectId, itemId)
    : projectAttachmentsPath(projectId);

  await setDoc(doc(db, collectionPath, attachmentId), attachment);

  return attachment;
}

export async function listAttachments(
  projectId: string,
  itemId?: string,
): Promise<Attachment[]> {
  const collectionPath = itemId
    ? itemAttachmentsPath(projectId, itemId)
    : projectAttachmentsPath(projectId);

  const snap = await getDocs(collection(db, collectionPath));
  return snap.docs.map(d => d.data() as Attachment);
}
