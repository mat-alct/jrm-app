export const USERS_COLLECTION = 'users';
export const PROJECTS_COLLECTION = 'projects';
export const PAYMENTS_COLLECTION = 'payments';
export const SETTINGS_COLLECTION = 'settings';
export const DEADLINE_DEFAULTS_DOC = 'deadlineDefaults';

export const ITEMS_SUBCOLLECTION = 'items';
export const ATTACHMENTS_SUBCOLLECTION = 'attachments';
export const STATUS_HISTORY_SUBCOLLECTION = 'statusHistory';
export const VERSIONS_SUBCOLLECTION = 'versions';
export const ASSEMBLER_ASSIGNMENTS_SUBCOLLECTION = 'assemblerAssignments';

export function userPath(uid: string): string {
  return `${USERS_COLLECTION}/${uid}`;
}

export function projectPath(projectId: string): string {
  return `${PROJECTS_COLLECTION}/${projectId}`;
}

export function projectItemsPath(projectId: string): string {
  return `${projectPath(projectId)}/${ITEMS_SUBCOLLECTION}`;
}

export function projectItemPath(projectId: string, itemId: string): string {
  return `${projectItemsPath(projectId)}/${itemId}`;
}

export function projectAttachmentsPath(projectId: string): string {
  return `${projectPath(projectId)}/${ATTACHMENTS_SUBCOLLECTION}`;
}

export function projectAttachmentPath(
  projectId: string,
  attachmentId: string,
): string {
  return `${projectAttachmentsPath(projectId)}/${attachmentId}`;
}

export function itemAttachmentsPath(projectId: string, itemId: string): string {
  return `${projectItemPath(projectId, itemId)}/${ATTACHMENTS_SUBCOLLECTION}`;
}

export function itemAttachmentPath(
  projectId: string,
  itemId: string,
  attachmentId: string,
): string {
  return `${itemAttachmentsPath(projectId, itemId)}/${attachmentId}`;
}

export function itemStatusHistoryPath(
  projectId: string,
  itemId: string,
): string {
  return `${projectItemPath(
    projectId,
    itemId,
  )}/${STATUS_HISTORY_SUBCOLLECTION}`;
}

export function itemVersionsPath(projectId: string, itemId: string): string {
  return `${projectItemPath(projectId, itemId)}/${VERSIONS_SUBCOLLECTION}`;
}

export function itemVersionPath(
  projectId: string,
  itemId: string,
  versionId: string,
): string {
  return `${itemVersionsPath(projectId, itemId)}/${versionId}`;
}

export function itemAssemblerAssignmentsPath(
  projectId: string,
  itemId: string,
): string {
  return `${projectItemPath(
    projectId,
    itemId,
  )}/${ASSEMBLER_ASSIGNMENTS_SUBCOLLECTION}`;
}

export function itemAssemblerAssignmentPath(
  projectId: string,
  itemId: string,
  assignmentId: string,
): string {
  return `${itemAssemblerAssignmentsPath(projectId, itemId)}/${assignmentId}`;
}

export function paymentPath(paymentId: string): string {
  return `${PAYMENTS_COLLECTION}/${paymentId}`;
}

export function deadlineDefaultsPath(): string {
  return `${SETTINGS_COLLECTION}/${DEADLINE_DEFAULTS_DOC}`;
}

export function projectAttachmentStoragePath(
  projectId: string,
  attachmentId: string,
  fileName: string,
): string {
  return `projects/${projectId}/general/${attachmentId}_${fileName}`;
}

export function itemAttachmentStoragePath(
  projectId: string,
  itemId: string,
  category: string,
  attachmentId: string,
  fileName: string,
): string {
  return `projects/${projectId}/items/${itemId}/${category}/${attachmentId}_${fileName}`;
}

export function itemVersionStoragePath(
  projectId: string,
  itemId: string,
  versionId: string,
  attachmentId: string,
  fileName: string,
): string {
  return `projects/${projectId}/items/${itemId}/versions/${versionId}/${attachmentId}_${fileName}`;
}

export function paymentProofStoragePath(
  paymentId: string,
  attachmentId: string,
  fileName: string,
): string {
  return `payments/${paymentId}/${attachmentId}_${fileName}`;
}
