import {
  filterAttachmentsByRole,
  formatFileSize,
  sanitizeFileName,
} from '@/services/projects/attachment.service';
import { Attachment, AttachmentAudience } from '@/types/projects';
import {
  inferAttachmentFileKind,
  isModel3DAttachment,
} from '@/utils/projects/attachments';

function attachment(
  audience: Partial<AttachmentAudience>,
): Pick<Attachment, 'audience'> {
  return {
    audience: {
      seller: false,
      designer: false,
      assembler: false,
      client: false,
      ...audience,
    },
  };
}

describe('services/projects/attachment.service', () => {
  describe('sanitizeFileName', () => {
    it('removes accents and replaces unsafe characters', () => {
      expect(sanitizeFileName('projeção final.pdf')).toBe('projecao_final.pdf');
    });

    it('keeps already-safe file names untouched', () => {
      expect(sanitizeFileName('render-01_v2.png')).toBe('render-01_v2.png');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes as-is below 1KB', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    });
  });

  describe('3D model detection', () => {
    it('marks GLB files as 3D models even with generic MIME type', () => {
      expect(
        inferAttachmentFileKind({
          name: 'armario.glb',
          type: 'application/octet-stream',
        }),
      ).toBe('model_3d');
    });

    it('recognizes existing model attachments by metadata or extension', () => {
      expect(
        isModel3DAttachment({
          fileName: 'armario.glb',
          originalFileName: 'armario.glb',
          mimeType: 'model/gltf-binary',
          fileKind: undefined,
        }),
      ).toBe(true);
      expect(
        isModel3DAttachment({
          fileName: 'render.png',
          originalFileName: 'render.png',
          mimeType: 'image/png',
          fileKind: 'model_3d',
        }),
      ).toBe(true);
    });
  });

  describe('filterAttachmentsByRole', () => {
    const sellerOnly = attachment({ seller: true });
    const designerOnly = attachment({ designer: true });
    const assemblerOnly = attachment({ assembler: true });
    const attachments = [sellerOnly, designerOnly, assemblerOnly] as Attachment[];

    it('lets admin see every attachment regardless of audience', () => {
      expect(filterAttachmentsByRole(attachments, ['admin'])).toHaveLength(3);
    });

    it('only lets designer see attachments with audience.designer', () => {
      const result = filterAttachmentsByRole(attachments, ['designer']);
      expect(result).toEqual([designerOnly]);
    });

    it('only lets assembler see attachments with audience.assembler', () => {
      const result = filterAttachmentsByRole(attachments, ['assembler']);
      expect(result).toEqual([assemblerOnly]);
    });

    it('blocks unauthenticated access to every attachment', () => {
      expect(filterAttachmentsByRole(attachments, undefined)).toHaveLength(0);
    });
  });
});
