import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';

import { Attachment, AttachmentAudience } from '@/types/projects';

import { db, storage } from '../firebase';
import { itemAttachmentPath } from './paths';

export async function deleteAttachment(attachment: Attachment): Promise<void> {
  const docPath = itemAttachmentPath(
    attachment.projectId,
    attachment.itemId,
    attachment.id,
  );

  await deleteDoc(doc(db, docPath));
  await deleteObject(ref(storage, attachment.storagePath));
}

export async function updateAttachmentAudience(
  projectId: string,
  itemId: string,
  attachmentId: string,
  audience: AttachmentAudience,
): Promise<void> {
  await updateDoc(doc(db, itemAttachmentPath(projectId, itemId, attachmentId)), {
    audience,
  });
}
