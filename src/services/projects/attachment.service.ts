import {
  collection,
  doc,
  getDocs,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { v4 } from 'uuid';

import {
  Attachment,
  AttachmentAudience,
  DEFAULT_ATTACHMENT_AUDIENCE,
  UserRole,
} from '@/types/projects';

import { inferAttachmentFileKind } from '../../utils/projects/attachments';
import { canViewAttachment } from '../../utils/projects/permissions';
import { db, storage } from '../firebase';
import { itemAttachmentsPath, itemAttachmentStoragePath } from './paths';

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
    canViewAttachment(attachment.audience, userRoles),
  );
}

interface UploadAttachmentParams {
  projectId: string;
  itemId: string;
  file: File;
  category: string;
  audience?: AttachmentAudience;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByRole: UserRole;
}

export async function uploadAttachment({
  projectId,
  itemId,
  file,
  category,
  audience = DEFAULT_ATTACHMENT_AUDIENCE,
  uploadedBy,
  uploadedByName,
  uploadedByRole,
}: UploadAttachmentParams): Promise<Attachment> {
  const attachmentId = v4();
  const fileName = sanitizeFileName(file.name);
  const mimeType = file.type || 'application/octet-stream';

  const storagePath = itemAttachmentStoragePath(
    projectId,
    itemId,
    category,
    attachmentId,
    fileName,
  );

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: mimeType });
  const downloadUrl = await getDownloadURL(storageRef);

  const attachment: Attachment = {
    id: attachmentId,
    projectId,
    itemId,
    fileName,
    originalFileName: file.name,
    storagePath,
    downloadUrl,
    mimeType,
    sizeBytes: file.size,
    fileKind: inferAttachmentFileKind(file),
    category,
    audience,
    uploadedBy,
    ...(uploadedByName ? { uploadedByName } : {}),
    uploadedByRole,
    createdAt: Timestamp.now(),
  };

  await setDoc(
    doc(db, itemAttachmentsPath(projectId, itemId), attachmentId),
    attachment,
  );

  return attachment;
}

export async function listAttachments(
  projectId: string,
  itemId: string,
): Promise<Attachment[]> {
  const snap = await getDocs(
    collection(db, itemAttachmentsPath(projectId, itemId)),
  );
  return snap.docs.map(d => d.data() as Attachment);
}
