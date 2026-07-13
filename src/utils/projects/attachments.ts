import { Attachment, AttachmentFileKind } from '@/types/projects';

const MODEL_3D_EXTENSIONS = new Set(['glb', 'gltf', 'usdz']);
const MODEL_3D_MIME_TYPES = new Set([
  'model/gltf-binary',
  'model/gltf+json',
  'model/vnd.usdz+zip',
  'application/octet-stream',
]);

function extensionFromFileName(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

export function isModel3DAttachment(
  input: Pick<
    Attachment,
    'fileName' | 'originalFileName' | 'mimeType' | 'fileKind'
  >,
): boolean {
  if (input.fileKind === 'model_3d') return true;
  const extension = extensionFromFileName(
    input.originalFileName || input.fileName,
  );
  if (!MODEL_3D_EXTENSIONS.has(extension)) return false;
  return (
    MODEL_3D_MIME_TYPES.has(input.mimeType) ||
    input.mimeType.startsWith('model/')
  );
}

export function inferAttachmentFileKind(file: {
  name: string;
  type?: string;
}): AttachmentFileKind {
  const mimeType = file.type || 'application/octet-stream';
  const extension = extensionFromFileName(file.name);
  if (
    MODEL_3D_EXTENSIONS.has(extension) &&
    (MODEL_3D_MIME_TYPES.has(mimeType) || mimeType.startsWith('model/'))
  ) {
    return 'model_3d';
  }
  if (mimeType.startsWith('image/')) return 'image';
  return 'document';
}
