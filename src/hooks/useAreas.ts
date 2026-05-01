import { useMutation, useQuery } from '@tanstack/react-query';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

import { db } from '../services/firebase';
import { queryClient } from '../services/queryClient';
import { Area } from '../types';
import { areas as seedAreas } from '../utils/listOfAreas';

const AREAS_DOC_PATH = ['config', 'areas'] as const;
const AREAS_QUERY_KEY = ['areas'] as const;

const buildSeedList = (): Area[] =>
  seedAreas.map(name => ({ name, freight: 0 }));

const sortByName = (list: Area[]) =>
  [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

const writeAreas = async (list: Area[]) => {
  const ref = doc(db, ...AREAS_DOC_PATH);
  await setDoc(ref, {
    list: sortByName(list),
    updatedAt: Timestamp.now(),
  });
};

const fetchAreas = async (): Promise<Area[]> => {
  const ref = doc(db, ...AREAS_DOC_PATH);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const seeded = buildSeedList();
    await writeAreas(seeded);
    return sortByName(seeded);
  }

  const data = snap.data();
  const stored = Array.isArray(data?.list) ? (data.list as Area[]) : [];

  // Garante que bairros novos adicionados ao listOfAreas.ts (seed canônico)
  // apareçam mesmo se o doc já existir.
  const existingNames = new Set(stored.map(a => a.name));
  const missing = seedAreas
    .filter(name => !existingNames.has(name))
    .map(name => ({ name, freight: 0 }));

  if (missing.length > 0) {
    const merged = [...stored, ...missing];
    await writeAreas(merged);
    return sortByName(merged);
  }

  return sortByName(stored);
};

export const useAreas = () => {
  return useQuery({
    queryKey: AREAS_QUERY_KEY,
    queryFn: fetchAreas,
    staleTime: 1000 * 60 * 10,
  });
};

export const useAddArea = () =>
  useMutation({
    mutationFn: async ({ name, freight }: Area) => {
      const current = await fetchAreas();
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Nome do bairro vazio');
      if (current.some(a => a.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error('Bairro já cadastrado');
      }
      await writeAreas([...current, { name: trimmed, freight }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AREAS_QUERY_KEY });
    },
  });

export const useUpdateAreaFreight = () =>
  useMutation({
    mutationFn: async ({ name, freight }: Area) => {
      const current = await fetchAreas();
      const next = current.map(a =>
        a.name === name ? { ...a, freight } : a,
      );
      await writeAreas(next);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AREAS_QUERY_KEY });
    },
  });

export const useRemoveArea = () =>
  useMutation({
    mutationFn: async (name: string) => {
      const current = await fetchAreas();
      const next = current.filter(a => a.name !== name);
      await writeAreas(next);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AREAS_QUERY_KEY });
    },
  });

export const findAreaFreight = (
  list: Area[] | undefined,
  name: string | undefined,
): number => {
  if (!list || !name) return 0;
  const match = list.find(a => a.name === name);
  return match?.freight ?? 0;
};
