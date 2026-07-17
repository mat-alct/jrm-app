import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { AttachmentList } from '@/components/projects/AttachmentList';
import { updateAttachmentAudience } from '@/services/projects/attachmentAdmin';
import { Attachment, AttachmentAudience } from '@/types/projects';

import { act, fireEvent, render, screen, waitFor } from '../../testUtils';

jest.mock('@/services/projects/attachmentAdmin', () => ({
  deleteAttachment: jest.fn(),
  updateAttachmentAudience: jest.fn(),
}));

const mockedUpdateAudience = jest.mocked(updateAttachmentAudience);

const FULL_AUDIENCE: AttachmentAudience = {
  seller: true,
  designer: true,
  assembler: true,
  client: true,
};

function attachment(overrides: Partial<Attachment>): Attachment {
  return {
    id: overrides.id ?? 'a1',
    projectId: 'p1',
    itemId: 'i1',
    fileName: 'foto.jpg',
    originalFileName: 'foto.jpg',
    storagePath: 'projects/p1/items/i1/fotos/a1_foto.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    category: 'Fotos',
    audience: FULL_AUDIENCE,
    uploadedBy: 'u1',
    uploadedByRole: 'admin',
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
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpdateAudience.mockResolvedValue(undefined);
  });

  it('shows an empty state when there is nothing visible for the role', () => {
    renderWithClient(
      <AttachmentList
        projectId="p1"
        itemId="i1"
        attachments={[attachment({ audience: { ...FULL_AUDIENCE, seller: false } })]}
        viewerRoles={undefined}
      />,
    );

    expect(screen.getByText('Nenhum anexo disponível.')).toBeInTheDocument();
  });

  it('shows no action buttons for a seller without edit/delete rights', () => {
    const attachments = [attachment({ id: 'a1' })];

    renderWithClient(
      <AttachmentList
        projectId="p1"
        itemId="i1"
        attachments={attachments}
        viewerRoles={['seller']}
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows delete and edit-audience buttons only for admins', () => {
    const attachments = [attachment({ id: 'a1' })];

    renderWithClient(
      <AttachmentList
        projectId="p1"
        itemId="i1"
        attachments={attachments}
        viewerRoles={['admin']}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Editar visibilidade' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('groups attachments by category', () => {
    const attachments = [
      attachment({ id: 'a1', category: 'Fotos' }),
      attachment({ id: 'a2', category: 'Contratos' }),
    ];

    renderWithClient(
      <AttachmentList
        projectId="p1"
        itemId="i1"
        attachments={attachments}
        viewerRoles={['admin']}
      />,
    );

    expect(screen.getByText('Fotos')).toBeInTheDocument();
    expect(screen.getByText('Contratos')).toBeInTheDocument();
  });

  it('shows which roles are excluded from the audience', () => {
    const attachments = [
      attachment({ audience: { ...FULL_AUDIENCE, assembler: false } }),
    ];

    renderWithClient(
      <AttachmentList
        projectId="p1"
        itemId="i1"
        attachments={attachments}
        viewerRoles={['admin']}
      />,
    );

    expect(screen.getByText('Oculto para: Montador')).toBeInTheDocument();
  });

  it('lets an admin deselect a role and save the new audience', async () => {
    const attachments = [attachment({ id: 'a1' })];

    renderWithClient(
      <AttachmentList
        projectId="p1"
        itemId="i1"
        attachments={attachments}
        viewerRoles={['admin']}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar visibilidade' }));
    const montadorCheckbox = screen.getByRole('checkbox', { name: 'Montador' });
    await act(async () => {
      fireEvent.click(montadorCheckbox);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(mockedUpdateAudience).toHaveBeenCalledWith(
        'p1',
        'i1',
        'a1',
        { ...FULL_AUDIENCE, assembler: false },
      ),
    );
  });
});
