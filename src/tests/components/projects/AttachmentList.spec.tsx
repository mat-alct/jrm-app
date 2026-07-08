import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { AttachmentList } from '@/components/projects/AttachmentList';
import { Attachment } from '@/types/projects';

import { render, screen } from '../../testUtils';

jest.mock('@/services/projects/attachmentAdmin', () => ({
  deleteAttachment: jest.fn(),
}));

function attachment(overrides: Partial<Attachment>): Attachment {
  return {
    id: overrides.id ?? 'a1',
    projectId: 'p1',
    fileName: 'foto.jpg',
    originalFileName: 'foto.jpg',
    storagePath: 'projects/p1/general/a1_foto.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    category: 'Fotos',
    visibility: 'internal',
    uploadedBy: 'u1',
    uploadedByRole: 'admin',
    clientVisible: false,
    createdAt: {} as never,
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('Component: AttachmentList', () => {
  it('shows an empty state when there is nothing visible for the role', () => {
    renderWithClient(
      <AttachmentList
        projectId="p1"
        attachments={[attachment({ visibility: 'internal' })]}
        viewerRoles={undefined}
      />,
    );

    expect(screen.getByText('Nenhum anexo disponível.')).toBeInTheDocument();
  });

  it('shows the delete button only for admins', () => {
    const attachments = [attachment({ id: 'a1' })];

    const { unmount } = renderWithClient(
      <AttachmentList
        projectId="p1"
        attachments={attachments}
        viewerRoles={['seller']}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();

    renderWithClient(
      <AttachmentList
        projectId="p1"
        attachments={attachments}
        viewerRoles={['admin']}
      />,
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('groups attachments by category', () => {
    const attachments = [
      attachment({ id: 'a1', category: 'Fotos' }),
      attachment({ id: 'a2', category: 'Contratos' }),
    ];

    renderWithClient(
      <AttachmentList
        projectId="p1"
        attachments={attachments}
        viewerRoles={['admin']}
      />,
    );

    expect(screen.getByText('Fotos')).toBeInTheDocument();
    expect(screen.getByText('Contratos')).toBeInTheDocument();
  });
});
