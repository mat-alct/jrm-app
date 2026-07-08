import {
  filterAttachmentsByRole,
  formatFileSize,
  sanitizeFileName,
} from '@/services/projects/attachment.service';
import { Attachment } from '@/types/projects';

function attachment(
  visibility: Attachment['visibility'],
): Pick<Attachment, 'visibility'> {
  return { visibility };
}

describe('services/projects/attachment.service', () => {
  describe('sanitizeFileName', () => {
    it('removes accents and replaces unsafe characters', () => {
      expect(sanitizeFileName('projeção final.pdf')).toBe(
        'projecao_final.pdf',
      );
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

  describe('filterAttachmentsByRole', () => {
    const attachments = [
      attachment('internal'),
      attachment('client'),
      attachment('designer'),
      attachment('assembler'),
    ] as Attachment[];

    it('lets admin see every visibility', () => {
      expect(filterAttachmentsByRole(attachments, ['admin'])).toHaveLength(4);
    });

    it('only lets designer see internal/client/designer attachments', () => {
      const result = filterAttachmentsByRole(attachments, ['designer']);
      expect(result.map(a => a.visibility)).toEqual([
        'internal',
        'client',
        'designer',
      ]);
    });

    it('only lets assembler see internal/client/assembler attachments', () => {
      const result = filterAttachmentsByRole(attachments, ['assembler']);
      expect(result.map(a => a.visibility)).toEqual([
        'internal',
        'client',
        'assembler',
      ]);
    });

    it('blocks unauthenticated access to every attachment', () => {
      expect(filterAttachmentsByRole(attachments, undefined)).toHaveLength(0);
    });
  });
});
