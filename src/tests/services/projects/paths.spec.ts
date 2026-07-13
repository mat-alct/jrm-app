import {
  deadlineDefaultsPath,
  itemAssemblerAssignmentPath,
  itemAssemblerAssignmentsPath,
  itemAttachmentPath,
  itemAttachmentsPath,
  itemAttachmentStoragePath,
  itemStatusHistoryPath,
  itemVersionPath,
  itemVersionsPath,
  itemVersionStoragePath,
  paymentPath,
  paymentProofStoragePath,
  projectAttachmentPath,
  projectAttachmentsPath,
  projectAttachmentStoragePath,
  projectItemPath,
  projectItemsPath,
  projectPath,
  userPath,
} from '@/services/projects/paths';

describe('services/projects/paths', () => {
  it('builds top-level document paths', () => {
    expect(userPath('u1')).toBe('users/u1');
    expect(projectPath('p1')).toBe('projects/p1');
    expect(paymentPath('pay1')).toBe('payments/pay1');
    expect(deadlineDefaultsPath()).toBe('settings/deadlineDefaults');
  });

  it('builds project item paths', () => {
    expect(projectItemsPath('p1')).toBe('projects/p1/items');
    expect(projectItemPath('p1', 'i1')).toBe('projects/p1/items/i1');
  });

  it('builds project-level attachment paths', () => {
    expect(projectAttachmentsPath('p1')).toBe('projects/p1/attachments');
    expect(projectAttachmentPath('p1', 'a1')).toBe(
      'projects/p1/attachments/a1',
    );
  });

  it('builds item-level attachment paths', () => {
    expect(itemAttachmentsPath('p1', 'i1')).toBe(
      'projects/p1/items/i1/attachments',
    );
    expect(itemAttachmentPath('p1', 'i1', 'a1')).toBe(
      'projects/p1/items/i1/attachments/a1',
    );
  });

  it('builds status history and version paths', () => {
    expect(itemStatusHistoryPath('p1', 'i1')).toBe(
      'projects/p1/items/i1/statusHistory',
    );
    expect(itemVersionsPath('p1', 'i1')).toBe('projects/p1/items/i1/versions');
    expect(itemVersionPath('p1', 'i1', 'v1')).toBe(
      'projects/p1/items/i1/versions/v1',
    );
  });

  it('builds assembler assignment paths', () => {
    expect(itemAssemblerAssignmentsPath('p1', 'i1')).toBe(
      'projects/p1/items/i1/assemblerAssignments',
    );
    expect(itemAssemblerAssignmentPath('p1', 'i1', 'as1')).toBe(
      'projects/p1/items/i1/assemblerAssignments/as1',
    );
  });

  it('builds storage paths', () => {
    expect(projectAttachmentStoragePath('p1', 'a1', 'foto.png')).toBe(
      'projects/p1/general/a1_foto.png',
    );
    expect(
      itemAttachmentStoragePath('p1', 'i1', 'medidas', 'a1', 'foto.png'),
    ).toBe('projects/p1/items/i1/medidas/a1_foto.png');
    expect(itemVersionStoragePath('p1', 'i1', 'v1', 'a1', 'foto.png')).toBe(
      'projects/p1/items/i1/versions/v1/a1_foto.png',
    );
    expect(paymentProofStoragePath('pay1', 'a1', 'comprovante.pdf')).toBe(
      'payments/pay1/a1_comprovante.pdf',
    );
  });
});
