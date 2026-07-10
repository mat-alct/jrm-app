import { adminStorage } from '../firebaseAdmin';

/**
 * Fronteira de assinatura de URL do Cloud Storage.
 *
 * `getSignedUrl` assina com a chave privada da service account e por isso nao
 * funciona contra o emulador (ver docs/PLANO-DE-TESTES.md, secao 14.2). Este
 * modulo existe para ser o unico ponto mockado nos testes de integracao — todo
 * o resto do caminho (Firestore, Storage, regras) roda de verdade.
 */
export async function getSignedReadUrl(
  storagePath: string,
  expiresAtMs: number,
): Promise<string> {
  const [url] = await adminStorage
    .bucket()
    .file(storagePath)
    .getSignedUrl({ action: 'read', expires: expiresAtMs });
  return url;
}
