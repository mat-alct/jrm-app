import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { doc, getDoc } from 'firebase/firestore';
import React from 'react';

import { useAuth } from '@/hooks/authContext';
import { getAppUser, useAppUser } from '@/services/projects/users.service';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock('@/services/firebase', () => ({ db: {} }));

jest.mock('@/hooks/authContext', () => ({ useAuth: jest.fn() }));

const mockedDoc = doc as jest.Mock;
const mockedGetDoc = getDoc as jest.Mock;
const mockedUseAuth = useAuth as jest.Mock;

describe('services/projects/users.service', () => {
  beforeEach(() => {
    mockedDoc.mockReset();
    mockedGetDoc.mockReset();
    mockedDoc.mockReturnValue('doc-ref');
  });

  it('returns null when the user document does not exist', async () => {
    mockedGetDoc.mockResolvedValue({ exists: () => false });

    const result = await getAppUser('u1');

    expect(result).toBeNull();
  });

  it('returns the user with its id when the document exists', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'u1',
      data: () => ({ name: 'Mateus', roles: ['admin'], active: true }),
    });

    const result = await getAppUser('u1');

    expect(result).toEqual({
      id: 'u1',
      name: 'Mateus',
      roles: ['admin'],
      active: true,
    });
  });

  describe('useAppUser', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      );
    };

    it('does not fetch when there is no authenticated user', async () => {
      mockedUseAuth.mockReturnValue({ user: null });

      const { result } = renderHook(() => useAppUser(), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockedGetDoc).not.toHaveBeenCalled();
    });

    it('fetches the app user for the authenticated uid', async () => {
      mockedUseAuth.mockReturnValue({ user: { uid: 'u1' } });
      mockedGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'u1',
        data: () => ({ name: 'Mateus', roles: ['admin'], active: true }),
      });

      const { result } = renderHook(() => useAppUser(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        id: 'u1',
        name: 'Mateus',
        roles: ['admin'],
        active: true,
      });
    });
  });
});
