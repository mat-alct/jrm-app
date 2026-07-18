import { Timestamp } from 'firebase/firestore';

import { buildProjectItem } from '@/tests/helpers/factories';
import {
  canAssignAssembler,
  canAssignDesigner,
  canEditItemStatus,
  canManageUsers,
  canSeeAssemblerFinance,
  canViewAttachment,
  hasRole,
  isAdmin,
  isSellerLocked,
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
    const allTrue = {
      seller: true,
      designer: true,
      assembler: true,
      client: true,
    };
    const noneVisible = {
      seller: false,
      designer: false,
      assembler: false,
      client: false,
    };

    it('lets admin see everything, even when excluded from the audience', () => {
      expect(canViewAttachment(noneVisible, ['admin'])).toBe(true);
    });

    it('restricts by audience per role', () => {
      expect(
        canViewAttachment({ ...noneVisible, designer: true }, ['designer']),
      ).toBe(true);
      expect(
        canViewAttachment({ ...noneVisible, designer: true }, ['seller']),
      ).toBe(false);
      expect(
        canViewAttachment({ ...noneVisible, assembler: true }, ['assembler']),
      ).toBe(true);
      expect(
        canViewAttachment({ ...noneVisible, seller: true }, ['seller']),
      ).toBe(true);
    });

    it('lets any role with a matching audience flag see the attachment', () => {
      expect(canViewAttachment(allTrue, ['seller'])).toBe(true);
      expect(canViewAttachment(allTrue, ['designer'])).toBe(true);
    });

    it('blocks unauthenticated users regardless of audience', () => {
      expect(canViewAttachment(allTrue, undefined)).toBe(false);
      expect(canViewAttachment(allTrue, [])).toBe(false);
    });
  });

  describe('isSellerLocked', () => {
    const assignedItem = buildProjectItem({
      assemblerAssignedAt: Timestamp.fromDate(
        new Date('2026-07-17T12:00:00.000Z'),
      ),
    });

    it('locks only a seller-only user after an assembler is assigned', () => {
      expect(isSellerLocked(assignedItem, ['seller'])).toBe(true);
      expect(isSellerLocked(assignedItem, ['admin'])).toBe(false);
      expect(isSellerLocked(assignedItem, ['admin', 'seller'])).toBe(false);
      expect(isSellerLocked(assignedItem, ['seller', 'designer'])).toBe(false);
    });

    it('does not lock before assignment or without an effective role', () => {
      expect(isSellerLocked(buildProjectItem(), ['seller'])).toBe(false);
      expect(isSellerLocked(assignedItem, [])).toBe(false);
      expect(isSellerLocked(undefined, ['seller'])).toBe(false);
    });
  });
});
