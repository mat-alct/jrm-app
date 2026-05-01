// Faturamento de pedidos de corte mês a mês.
//
// Uso:
//   node --env-file=.env scripts/faturamento-mensal.mjs
//
// Flags (todas opcionais):
//   --by=createdAt|releasedAt|updatedAt   Campo de data usado para agrupar (padrão: createdAt)
//   --from=YYYY-MM                        Mês inicial (inclusive)
//   --to=YYYY-MM                          Mês final (inclusive)
//   --status=Concluído                    Só conta pedidos com esse orderStatus
//   --include-freight                     Soma freightPrice no faturamento
//   --include-deactivated                 Inclui pedidos desativados (padrão: ignora)
//   --json                                Saída em JSON (em vez de tabela)
//
// Exemplos:
//   node --env-file=.env scripts/faturamento-mensal.mjs
//   node --env-file=.env scripts/faturamento-mensal.mjs --from=2025-01 --to=2025-12
//   node --env-file=.env scripts/faturamento-mensal.mjs --status=Concluído --include-freight
//   node --env-file=.env scripts/faturamento-mensal.mjs --by=releasedAt --status=Concluído

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    }),
);

const BY_FIELD = ['createdAt', 'releasedAt', 'updatedAt'].includes(args.by)
  ? args.by
  : 'createdAt';
const FROM = args.from || null; // "YYYY-MM"
const TO = args.to || null;
const STATUS_FILTER = args.status || null;
const INCLUDE_FREIGHT = args['include-freight'] === true;
const INCLUDE_DEACTIVATED = args['include-deactivated'] === true;
const JSON_OUTPUT = args.json === true;

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Faltam env vars do Firebase. Rode com --env-file=.env.');
  process.exit(1);
}

const app = initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});
const db = getFirestore(app);

const fmtBRL = (n) =>
  n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

const monthKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const inRange = (key) => {
  if (FROM && key < FROM) return false;
  if (TO && key > TO) return false;
  return true;
};

async function main() {
  console.log('📊 Faturamento mensal de pedidos de corte');
  console.log(`  Projeto: ${projectId}`);
  console.log(`  Agrupando por: ${BY_FIELD}`);
  if (STATUS_FILTER) console.log(`  Status filtrado: ${STATUS_FILTER}`);
  if (FROM || TO) console.log(`  Período: ${FROM || '...'} → ${TO || '...'}`);
  console.log(`  Frete incluído: ${INCLUDE_FREIGHT ? 'sim' : 'não'}`);
  console.log(`  Desativados incluídos: ${INCLUDE_DEACTIVATED ? 'sim' : 'não'}`);

  const snap = await db.collection('orders').get();
  console.log(`  Total de pedidos lidos: ${snap.size}\n`);

  const buckets = new Map(); // "YYYY-MM" -> { revenue, freight, count }
  let skippedNoDate = 0;
  let skippedDeactivated = 0;
  let skippedStatus = 0;
  let skippedRange = 0;

  for (const doc of snap.docs) {
    const o = doc.data();

    if (!INCLUDE_DEACTIVATED && o.isDeactivated) {
      skippedDeactivated++;
      continue;
    }
    if (STATUS_FILTER && o.orderStatus !== STATUS_FILTER) {
      skippedStatus++;
      continue;
    }

    const ts = o[BY_FIELD];
    if (!ts || typeof ts.toDate !== 'function') {
      skippedNoDate++;
      continue;
    }

    const key = monthKey(ts.toDate());
    if (!inRange(key)) {
      skippedRange++;
      continue;
    }

    const orderPrice = Number(o.orderPrice) || 0;
    const freight = Number(o.freightPrice) || 0;

    if (!buckets.has(key)) {
      buckets.set(key, { revenue: 0, freight: 0, count: 0 });
    }
    const b = buckets.get(key);
    b.revenue += orderPrice;
    b.freight += freight;
    b.count += 1;
  }

  const rows = [...buckets.entries()]
    .map(([key, b]) => ({
      mes: key,
      pedidos: b.count,
      cortes: b.revenue,
      frete: b.freight,
      total: INCLUDE_FREIGHT ? b.revenue + b.freight : b.revenue,
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  }

  if (rows.length === 0) {
    console.log('Nenhum pedido encontrado para os filtros aplicados.');
    process.exit(0);
  }

  const totalCortes = rows.reduce((s, r) => s + r.cortes, 0);
  const totalFrete = rows.reduce((s, r) => s + r.frete, 0);
  const totalPedidos = rows.reduce((s, r) => s + r.pedidos, 0);
  const grandTotal = INCLUDE_FREIGHT ? totalCortes + totalFrete : totalCortes;

  const colMes = 'Mês'.padEnd(9);
  const colPed = 'Pedidos'.padStart(8);
  const colCortes = 'Cortes (R$)'.padStart(16);
  const colFrete = 'Frete (R$)'.padStart(16);
  const colTotal = 'Total (R$)'.padStart(16);

  const header = INCLUDE_FREIGHT
    ? `${colMes} ${colPed} ${colCortes} ${colFrete} ${colTotal}`
    : `${colMes} ${colPed} ${colCortes}`;

  console.log(header);
  console.log('-'.repeat(header.length));

  for (const r of rows) {
    const line = INCLUDE_FREIGHT
      ? `${r.mes.padEnd(9)} ${String(r.pedidos).padStart(8)} ${fmtBRL(r.cortes).padStart(16)} ${fmtBRL(r.frete).padStart(16)} ${fmtBRL(r.total).padStart(16)}`
      : `${r.mes.padEnd(9)} ${String(r.pedidos).padStart(8)} ${fmtBRL(r.cortes).padStart(16)}`;
    console.log(line);
  }

  console.log('-'.repeat(header.length));
  const totalLine = INCLUDE_FREIGHT
    ? `${'TOTAL'.padEnd(9)} ${String(totalPedidos).padStart(8)} ${fmtBRL(totalCortes).padStart(16)} ${fmtBRL(totalFrete).padStart(16)} ${fmtBRL(grandTotal).padStart(16)}`
    : `${'TOTAL'.padEnd(9)} ${String(totalPedidos).padStart(8)} ${fmtBRL(totalCortes).padStart(16)}`;
  console.log(totalLine);

  if (skippedNoDate || skippedDeactivated || skippedStatus || skippedRange) {
    console.log('\nIgnorados:');
    if (skippedDeactivated) console.log(`  - desativados: ${skippedDeactivated}`);
    if (skippedStatus) console.log(`  - status diferente de "${STATUS_FILTER}": ${skippedStatus}`);
    if (skippedNoDate) console.log(`  - sem campo ${BY_FIELD}: ${skippedNoDate}`);
    if (skippedRange) console.log(`  - fora do período: ${skippedRange}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Erro:', err);
  process.exit(1);
});
