import {
  canAssignAssembler,
  canAssignDesigner,
  canEditItemStatus,
  canManageUsers,
  canSeeAssemblerFinance,
  canViewAttachment,
  hasRole,
  isAdmin,
} from '@/utils/projects/permissions';

describe('utils/projects/permissions', () => {
  describe('hasRole / isAdmin', () => {
    it('detects a role in the list', () => {
      expect(hasRole(['seller'], 'seller')).toBe(true);
      expect(hasRole(['seller'], 'admin')).toBe(false);
      expect(hasRole(undefined, 'admin')).toBe(false);
    });

    it('detects admin role', () => {
      expect(isAdmin(['admin', 'designer'])).toBe(true);
      expect(isAdmin(['designer'])).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe('financial visibility', () => {
    it('lets admin and assembler see assembler finance', () => {
      expect(canSeeAssemblerFinance(['admin'])).toBe(true);
      expect(canSeeAssemblerFinance(['assembler'])).toBe(true);
    });

    it('hides assembler finance from seller and plain designer', () => {
      expect(canSeeAssemblerFinance(['seller'])).toBe(false);
      expect(canSeeAssemblerFinance(['designer'])).toBe(false);
    });
  });

  describe('management permissions', () => {
    it('admins and sellers can assign designers; only admins assign assemblers or manage users', () => {
      expect(canAssignDesigner(['admin'])).toBe(true);
      expect(canAssignDesigner(['seller'])).toBe(true);
      expect(canAssignDesigner(['designer'])).toBe(false);
      expect(canAssignAssembler(['admin'])).toBe(true);
      expect(canAssignAssembler(['seller'])).toBe(false);
      expect(canManageUsers(['admin'])).toBe(true);
      expect(canManageUsers(['seller'])).toBe(false);
    });

    it('admin, designer and assembler can edit item status', () => {
      expect(canEditItemStatus(['admin'])).toBe(true);
      expect(canEditItemStatus(['designer'])).toBe(true);
      expect(canEditItemStatus(['assembler'])).toBe(true);
      expect(canEditItemStatus(['seller'])).toBe(false);
    });
  });

  describe('canViewAttachment', () => {
    it('lets admin see everything', () => {
      expect(canViewAttachment('internal', ['admin'])).toBe(true);
      expect(canViewAttachment('designer', ['admin'])).toBe(true);
      expect(canViewAttachment('assembler', ['admin'])).toBe(true);
    });

    it('restricts designer-only attachments to designers', () => {
      expect(canViewAttachment('designer', ['designer'])).toBe(true);
      expect(canViewAttachment('designer', ['seller'])).toBe(false);
    });

    it('restricts assembler-only attachments to assemblers', () => {
      expect(canViewAttachment('assembler', ['assembler'])).toBe(true);
      expect(canViewAttachment('assembler', ['seller'])).toBe(false);
    });

    it('lets any internal role see internal/client attachments', () => {
      expect(canViewAttachment('internal', ['seller'])).toBe(true);
      expect(canViewAttachment('client', ['designer'])).toBe(true);
    });

    it('blocks unauthenticated users from every visibility', () => {
      expect(canViewAttachment('internal', undefined)).toBe(false);
      expect(canViewAttachment('client', [])).toBe(false);
    });
  });
});
