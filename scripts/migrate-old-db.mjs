// Migra collections do projeto Firebase antigo para o atual.
// Uso:
//   1. Coloque o service account JSON do banco ANTIGO em scripts/old-firebase-key.json
//      (ou aponte OLD_FIREBASE_KEY pra outro caminho).
//   2. Garanta que .env tem as credenciais do banco NOVO (NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//      FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).
//   3. Rode:  node --env-file=.env scripts/migrate-old-db.mjs
//
// Por padrão copia: counters, estimates, materials, orders, sellers.
// Pra rodar só uma collection: node --env-file=.env scripts/migrate-old-db.mjs orders
//
// Cópia 1:1 preservando doc IDs. Firestore é schemaless, então campos extras
// ou faltando do banco antigo não quebram nada — só seguem como vieram.

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_COLLECTIONS = ['counters', 'sellers', 'materials', 'estimates', 'orders'];
const BATCH_SIZE = 400; // Firestore aceita até 500 ops por batch; 400 dá folga.
const DRY_RUN = process.env.DRY_RUN === '1';

const oldKeyPath = resolve(process.env.OLD_FIREBASE_KEY || './scripts/old-firebase-key.json');
let oldKey;
try {
  oldKey = JSON.parse(readFileSync(oldKeyPath, 'utf8'));
} catch (err) {
  console.error(`❌ Não consegui ler o service account em ${oldKeyPath}`);
  console.error(`   ${err.message}`);
  process.exit(1);
}

const newProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const newClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const newPrivateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!newProjectId || !newClientEmail || !newPrivateKey) {
  console.error('❌ Faltam env vars do banco NOVO. Rode com --env-file=.env.');
  process.exit(1);
}

if (oldKey.project_id === newProjectId) {
  console.error(`❌ Banco antigo e novo são o mesmo projeto (${newProjectId}). Abortando.`);
  process.exit(1);
}

const oldApp = initializeApp({ credential: cert(oldKey) }, 'old');
const newApp = initializeApp(
  {
    credential: cert({
      projectId: newProjectId,
      clientEmail: newClientEmail,
      privateKey: newPrivateKey,
    }),
  },
  'new',
);

const oldDb = getFirestore(oldApp);
const newDb = getFirestore(newApp);

async function migrateCollection(name) {
  const start = Date.now();
  console.log(`\n→ ${name}`);
  const snap = await oldDb.collection(name).get();
  const total = snap.size;
  console.log(`  ${total} documentos no antigo`);

  if (DRY_RUN) {
    console.log('  (dry-run, nada escrito)');
    return { name, total, written: 0 };
  }
  if (total === 0) return { name, total, written: 0 };

  let written = 0;
  let batch = newDb.batch();
  let inBatch = 0;

  for (const doc of snap.docs) {
    const ref = newDb.collection(name).doc(doc.id);
    batch.set(ref, doc.data());
    inBatch++;

    if (inBatch >= BATCH_SIZE) {
      await batch.commit();
      written += inBatch;
      console.log(`  ✓ ${written}/${total}`);
      batch = newDb.batch();
      inBatch = 0;
    }
  }

  if (inBatch > 0) {
    await batch.commit();
    written += inBatch;
    console.log(`  ✓ ${written}/${total}`);
  }

  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  Concluído em ${secs}s`);
  return { name, total, written };
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const collections = args.length > 0 ? args : DEFAULT_COLLECTIONS;

  console.log('🚚 Migração Firestore');
  console.log(`  Antigo: ${oldKey.project_id}`);
  console.log(`  Novo:   ${newProjectId}`);
  console.log(`  Collections: ${collections.join(', ')}`);
  if (DRY_RUN) console.log('  Modo: DRY RUN (não escreve)');

  const results = [];
  for (const name of collections) {
    results.push(await migrateCollection(name));
  }

  console.log('\n📊 Resumo:');
  for (const r of results) {
    console.log(`  ${r.name}: ${r.written}/${r.total}`);
  }
  console.log('\n✅ Fim.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Erro:', err);
  process.exit(1);
});
