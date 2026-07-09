import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { AppUser, UserRole } from '@/types/projects';

import { db } from '../firebase';
import { E2E_MOCKS_ENABLED, listE2EUsersByRole } from './e2eMockStore';
import { USERS_COLLECTION } from './paths';

export interface CreateUserInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  roles: UserRole[];
}

export interface UpdateUserInput {
  id: string;
  name?: string;
  roles?: UserRole[];
  active?: boolean;
}

async function postAdminUsers(
  method: 'POST' | 'PATCH',
  body: CreateUserInput | UpdateUserInput,
): Promise<{ id: string }> {
  const response = await fetch('/api/admin/users', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Erro ao processar usuário.');
  }

  return data;
}

export function createAdminUser(input: CreateUserInput) {
  return postAdminUsers('POST', input);
}

export function updateAdminUser(input: UpdateUserInput) {
  return postAdminUsers('PATCH', input);
}

export async function listUsers(): Promise<AppUser[]> {
  if (E2E_MOCKS_ENABLED) {
    return listE2EUsersByRole('admin');
  }

  const snap = await getDocs(collection(db, USERS_COLLECTION));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as AppUser);
}

export async function listUsersByRole(role: UserRole): Promise<AppUser[]> {
  if (E2E_MOCKS_ENABLED) {
    return listE2EUsersByRole(role);
  }

  const q = query(
    collection(db, USERS_COLLECTION),
    where('roles', 'array-contains', role),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as AppUser);
}

export function useUsers(): UseQueryResult<AppUser[]> {
  return useQuery({
    queryKey: ['projects', 'users'],
    queryFn: listUsers,
  });
}

export function useUsersByRole(role: UserRole): UseQueryResult<AppUser[]> {
  return useQuery({
    queryKey: ['projects', 'users', 'byRole', role],
    queryFn: () => listUsersByRole(role),
  });
}
