import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';

import {
  deleteAttachment,
  updateAttachmentAudience,
} from '@/services/projects/attachmentAdmin';
import { Attachment } from '@/types/projects';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  deleteDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  deleteObject: jest.fn(),
}));

jest.mock('@/services/firebase', () => ({ db: {}, storage: {} }));

const mockedDoc = doc as jest.Mock;
const mockedDeleteDoc = deleteDoc as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedRef = ref as jest.Mock;
const mockedDeleteObject = deleteObject as jest.Mock;

function attachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: 'a1',
    projectId: 'p1',
    itemId: 'i1',
    fileName: 'foto.jpg',
    originalFileName: 'foto.jpg',
    storagePath: 'projects/p1/items/i1/geral/a1_foto.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 100,
    category: 'geral',
    audience: { seller: true, designer: true, assembler: true, client: true },
    uploadedBy: 'u1',
    uploadedByRole: 'admin',
    createdAt: {} as never,
    ...overrides,
  };
}

describe('services/projects/attachmentAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDoc.mockReturnValue('doc-ref');
    mockedRef.mockReturnValue('storage-ref');
    mockedDeleteDoc.mockResolvedValue(undefined);
    mockedUpdateDoc.mockResolvedValue(undefined);
    mockedDeleteObject.mockResolvedValue(undefined);
  });

  it('deletes an item-level attachment from the item subcollection', async () => {
    await deleteAttachment(attachment());

    expect(mockedDoc).toHaveBeenCalledWith(
      {},
      'projects/p1/items/i1/attachments/a1',
    );
    expect(mockedDeleteDoc).toHaveBeenCalledWith('doc-ref');
    expect(mockedDeleteObject).toHaveBeenCalledWith('storage-ref');
  });

  it('updates the audience of an attachment', async () => {
    const audience = {
      seller: true,
      designer: false,
      assembler: false,
      client: true,
    };

    await updateAttachmentAudience('p1', 'i1', 'a1', audience);

    expect(mockedDoc).toHaveBeenCalledWith(
      {},
      'projects/p1/items/i1/attachments/a1',
    );
    expect(mockedUpdateDoc).toHaveBeenCalledWith('doc-ref', { audience });
  });
});
