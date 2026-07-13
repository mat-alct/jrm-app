import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { Material } from '@/types';

import { db } from './firebase';

export async function createMaterial(materialData: Material): Promise<void> {
  await addDoc(collection(db, 'materials'), materialData);
}

export async function removeMaterial(id: string): Promise<void> {
  await deleteDoc(doc(db, 'materials', id));
}

export async function updateMaterialPrice(input: {
  id: string;
  newPrice: number;
}): Promise<void> {
  await updateDoc(doc(db, 'materials', input.id), {
    price: input.newPrice,
    updatedAt: Timestamp.fromDate(new Date()),
  });
}

export async function getMaterials(
  materialFilter: string,
): Promise<Material[]> {
  const materialsQuery = query(
    collection(db, 'materials'),
    where('materialType', '==', materialFilter),
  );
  const querySnapshot = await getDocs(materialsQuery);
  return querySnapshot.docs.map(
    d => ({ ...d.data(), id: d.id }) as unknown as Material,
  );
}

export async function getAllMaterials(): Promise<Material[]> {
  const querySnapshot = await getDocs(collection(db, 'materials'));
  return querySnapshot.docs.map(
    doc => ({ ...doc.data(), id: doc.id }) as Material,
  );
}
