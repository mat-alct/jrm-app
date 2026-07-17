import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { doc, getDoc } from 'firebase/firestore';
import React, { ReactNode } from 'react';

import {
  listAttachments,
  uploadAttachment,
} from '@/services/projects/attachment.service';
import { deleteAttachment } from '@/services/projects/attachmentAdmin';
import {
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
} from '@/services/projects/attachmentHooks';
import { useAppUser } from '@/services/projects/users.service';
import { fakeAuthUser, TestAuthProvider } from '@/tests/helpers/authTestUtils';
import { AppUser, Attachment } from '@/types/projects';

jest.mock('@/services/projects/attachment.service', () => ({
  listAttachments: jest.fn(),
  uploadAttachment: jest.fn(),
}));
jest.mock('@/services/projects/attachmentAdmin', () => ({
  deleteAttachment: jest.fn(),
}));
// `useAppUser` chama o `getAppUser` interno do proprio modulo: mockar o export nao
// teria efeito. Mockamos a fronteira real (Firestore).
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(),
}));

function makeWrapper(
  user: ReturnType<typeof fakeAuthUser> | null = fakeAuthUser(),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TestAuthProvider user={user}>{children}</TestAuthProvider>
      </QueryClientProvider>
    );
  }

  return { Wrapper, queryClient };
}

describe('useAppUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('busca o perfil do usuario logado e devolve o doc do Firestore', async () => {
    jest.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      id: 'user-uid',
      data: () => ({ name: 'Admin', roles: ['admin'] }),
    } as never);
    jest.mocked(doc).mockReturnValue({} as never);
    const { Wrapper } = makeWrapper(fakeAuthUser({ uid: 'user-uid' }));

    const { result } = renderHook(() => useAppUser(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(result.current.data).toEqual({
        id: 'user-uid',
        name: 'Admin',
        roles: ['admin'],
      } as AppUser),
    );
    // O path lido e users/{uid} do usuario autenticado.
    expect(jest.mocked(doc).mock.calls[0][1]).toBe('users/user-uid');
  });

  it('devolve null quando o usuario nao tem perfil no Firestore', async () => {
    jest.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useAppUser(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('nao busca perfil enquanto nao ha usuario autenticado', () => {
    const { Wrapper } = makeWrapper(null);

    const { result } = renderHook(() => useAppUser(), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(getDoc).not.toHaveBeenCalled();
  });

  it('propaga o estado de erro do Firestore', async () => {
    jest.mocked(getDoc).mockRejectedValue(new Error('permission-denied'));
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useAppUser(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useAttachments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('usa queryKey de item', async () => {
    jest.mocked(listAttachments).mockResolvedValue([]);
    const { Wrapper, queryClient } = makeWrapper();

    renderHook(() => useAttachments('project-1', 'item-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryState([
          'projects',
          'project-1',
          'items',
          'item-1',
          'attachments',
        ]),
      ).toBeDefined(),
    );
    expect(listAttachments).toHaveBeenCalledWith('project-1', 'item-1');
  });

  it('nao busca sem projectId ou itemId', () => {
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useAttachments('', ''), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(listAttachments).not.toHaveBeenCalled();
  });
});

describe('useUploadAttachment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('injeta projectId/itemId e invalida a lista de anexos do item', async () => {
    jest.mocked(uploadAttachment).mockResolvedValue({ id: 'a1' } as Attachment);
    const { Wrapper, queryClient } = makeWrapper();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => useUploadAttachment('project-1', 'item-1'),
      { wrapper: Wrapper },
    );

    await result.current.mutateAsync({
      file: new File(['x'], 'a.pdf', { type: 'application/pdf' }),
      category: 'desenho',
      visibility: 'internal',
      uploadedBy: 'user-uid',
      uploadedByRole: 'seller',
    } as never);

    expect(uploadAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-1', itemId: 'item-1' }),
    );
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['projects', 'project-1', 'items', 'item-1', 'attachments'],
      }),
    );
  });

  it('propaga o erro do service sem invalidar a lista', async () => {
    jest
      .mocked(uploadAttachment)
      .mockRejectedValue(new Error('storage/unauthorized'));
    const { Wrapper, queryClient } = makeWrapper();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => useUploadAttachment('project-1', 'item-1'),
      { wrapper: Wrapper },
    );

    await expect(result.current.mutateAsync({} as never)).rejects.toThrow(
      'storage/unauthorized',
    );
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useDeleteAttachment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('remove o anexo e invalida a lista do item', async () => {
    jest.mocked(deleteAttachment).mockResolvedValue(undefined);
    const { Wrapper, queryClient } = makeWrapper();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => useDeleteAttachment('project-1', 'item-1'),
      { wrapper: Wrapper },
    );

    const attachment = { id: 'a1' } as Attachment;
    await result.current.mutateAsync(attachment);

    expect(deleteAttachment).toHaveBeenCalledWith(attachment);
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['projects', 'project-1', 'items', 'item-1', 'attachments'],
      }),
    );
  });
});
