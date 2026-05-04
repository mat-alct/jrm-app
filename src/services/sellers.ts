import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';

import { db } from './firebase';

export interface SellerRecord {
  id: string;
  name: string;
}

export const normalizeSellerPassword = (password: string) => password.trim();

export const isValidSellerPasswordId = (password: string) => {
  const normalized = normalizeSellerPassword(password);
  return (
    normalized.length > 0 &&
    normalized !== '.' &&
    normalized !== '..' &&
    !normalized.includes('/') &&
    !/^__.*__$/.test(normalized)
  );
};

export const getSellerByPassword = async (
  sellerPassword: string,
): Promise<SellerRecord | null> => {
  const password = normalizeSellerPassword(sellerPassword);
  if (!isValidSellerPasswordId(password)) return null;

  const sellerDoc = await getDoc(doc(db, 'sellers', password));
  if (sellerDoc.exists()) {
    const name = sellerDoc.data().name as string | undefined;
    if (name) return { id: sellerDoc.id, name };
  }

  const legacySellerQuery = query(
    collection(db, 'sellers'),
    where('password', '==', password),
    limit(1),
  );
  const legacySellerSnap = await getDocs(legacySellerQuery);
  if (legacySellerSnap.empty) return null;

  const legacySellerDoc = legacySellerSnap.docs[0];
  const legacyName = legacySellerDoc.data().name as string | undefined;
  if (!legacyName) return null;

  return { id: legacySellerDoc.id, name: legacyName };
};
