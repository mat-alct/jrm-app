// Seed de demonstracao para um ambiente REAL (producao).
//
// Cria o mesmo conteudo do scripts/seed-projetos.mjs (5 usuarios por papel,
// 2 projetos cobrindo os 13 status, orcamentos, atribuicoes de montador),
// com tres diferencas que existem porque aqui o banco e o de verdade:
//
// 1. SENHAS SAO GERADAS NA HORA. Nenhuma senha fica no codigo. Elas sao
//    impressas uma unica vez no terminal, no fim da execucao. O repositorio
//    e publico: senha em arquivo versionado = conta comprometida.
// 2. NADA E SOBRESCRITO. settings/deadlineDefaults so e criado se ainda nao
//    existir (o seed de testes sobrescreve, o que apagaria os prazos reais).
// 3. TUDO E RASTREADO. Cada doc criado leva o campo `seedRun` com o id da
//    execucao, e um manifesto e salvo em .seed-runs/<runId>.json. O undo
//    apaga exatamente o que aquela execucao criou, e nada alem disso.
//
// Uso:
//   node --env-file=.env.prod scripts/seed-prod.mjs --confirm=<projectId>
//   node --env-file=.env.prod scripts/seed-prod.mjs --undo=latest
//   node --env-file=.env.prod scripts/seed-prod.mjs --undo=<runId>
//
// O --confirm precisa bater com o NEXT_PUBLIC_FIREBASE_PROJECT_ID do .env
// carregado; e a trava que impede rodar contra o projeto errado por engano.

import { randomBytes, randomInt, scryptSync } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const RUNS_DIR = '.seed-runs';

const SEED_USERS = [
  { name: 'Admin Seed', email: 'admin@seed.jrm', roles: ['admin'] },
  { name: 'Vendedor Seed', email: 'vendedor@seed.jrm', roles: ['seller'] },
  { name: 'Desenhista Seed', email: 'desenhista@seed.jrm', roles: ['designer'] },
  { name: 'Montador Seed', email: 'montador@seed.jrm', roles: ['assembler'] },
  { name: 'Marceneiro Seed', email: 'marceneiro@seed.jrm', roles: ['woodworker'] },
];

const PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';

function generatePassword(length = 20) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

function generateClientCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i += 1) out += alphabet[randomInt(alphabet.length)];
  return out;
}

function hashAccessCode(code) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(code, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function parseArgs() {
  const args = { confirm: null, undo: null };
  for (const raw of process.argv.slice(2)) {
    const [key, value] = raw.replace(/^--/, '').split('=');
    if (key === 'confirm') args.confirm = value ?? '';
    if (key === 'undo') args.undo = value ?? 'latest';
  }
  return args;
}

function initFirebase() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      '❌ Faltam credenciais. Rode com: node --env-file=.env.prod scripts/seed-prod.mjs ...',
    );
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  return projectId;
}

function saveManifest(runId, manifest) {
  if (!existsSync(RUNS_DIR)) mkdirSync(RUNS_DIR, { recursive: true });
  writeFileSync(
    join(RUNS_DIR, `${runId}.json`),
    JSON.stringify(manifest, null, 2),
  );
}

function loadManifest(runId) {
  if (runId === 'latest') {
    if (!existsSync(RUNS_DIR)) return null;
    const files = readdirSync(RUNS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort();
    if (!files.length) return null;
    return JSON.parse(readFileSync(join(RUNS_DIR, files[files.length - 1]), 'utf8'));
  }

  const path = join(RUNS_DIR, `${runId}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

// ---------------------------------------------------------------- seed

async function ensureSeedUsers(db, auth, runId, manifest) {
  const created = {};

  for (const seedUser of SEED_USERS) {
    const password = generatePassword();
    let userRecord;
    let wasCreatedByUs = false;

    try {
      userRecord = await auth.getUserByEmail(seedUser.email);
      console.log(`• Usuario Auth ja existia (senha NAO alterada): ${seedUser.email}`);
    } catch {
      userRecord = await auth.createUser({
        email: seedUser.email,
        password,
        displayName: seedUser.name,
      });
      wasCreatedByUs = true;
      manifest.authUids.push(userRecord.uid);
      console.log(`✓ Usuario Auth criado: ${seedUser.email}`);
    }

    const userDocRef = db.collection('users').doc(userRecord.uid);
    const userDocSnap = await userDocRef.get();

    if (userDocSnap.exists) {
      console.log(`• Doc users/${userRecord.uid} ja existia — preservado, papeis nao alterados`);
    } else {
      await userDocRef.set({
        name: seedUser.name,
        email: seedUser.email,
        roles: seedUser.roles,
        active: true,
        seedRun: runId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      manifest.userDocs.push(userRecord.uid);
    }

    created[seedUser.roles[0]] = {
      uid: userRecord.uid,
      ...seedUser,
      password: wasCreatedByUs ? password : '(ja existia — senha inalterada)',
    };
  }

  return created;
}

async function ensureDeadlineDefaults(db, adminUid, runId, manifest) {
  const ref = db.collection('settings').doc('deadlineDefaults');
  const snap = await ref.get();

  if (snap.exists) {
    console.log('• settings/deadlineDefaults JA EXISTE — preservado, nada foi sobrescrito');
    return;
  }

  await ref.set({
    desenhoDias: 5,
    orcamentoDias: 2,
    aprovacaoClienteDias: 3,
    atribuicaoMontadorDias: 2,
    producaoDias: 10,
    montagemDias: 2,
    seedRun: runId,
    updatedAt: Timestamp.now(),
    updatedBy: adminUid,
  });
  manifest.createdDeadlineDefaults = true;
  console.log('✓ settings/deadlineDefaults criado (nao existia)');
}

function futureTimestamp(daysFromNow) {
  return Timestamp.fromMillis(Date.now() + daysFromNow * 86400000);
}

const STATUSES_WITH_BUDGET = new Set([
  'aguardando_aprovacao_cliente',
  'alteracao_solicitada',
  'recusado_pelo_cliente',
  'aguardando_atribuicao_montador',
  'em_producao',
  'pronto_para_montagem',
  'montagem_concluida',
  'aguardando_pagamento_montador',
  'finalizado',
]);

function buildBudget({ users, totalCost, customerAmount, suggestedAssemblerAmount }) {
  const now = Timestamp.now();
  return {
    lines: [{ id: '0', description: 'Material e ferragens', amount: totalCost }],
    totalCost,
    customerAmount,
    suggestedAssemblerAmount,
    createdBy: users.seller.uid,
    createdByName: users.seller.name,
    createdAt: now,
    updatedAt: now,
  };
}

async function seedProject({ db, users, index, itemsSpec, runId, manifest, clientCode }) {
  const projectRef = db.collection('projects').doc();
  const publicId = `seed-${index}-${projectRef.id.slice(0, 6)}`;

  const itemBudgets = itemsSpec.map(item =>
    STATUSES_WITH_BUDGET.has(item.status)
      ? buildBudget({
          users,
          totalCost: item.totalCost,
          customerAmount: item.customerAmount,
          suggestedAssemblerAmount: item.suggestedAssemblerAmount,
        })
      : undefined,
  );

  await projectRef.set({
    customerName: `Cliente Seed ${index}`,
    customerPhone: '24999990000',
    customerEmail: `cliente${index}@seed.jrm`,
    customerAddress: 'Rua de Teste, 123 - Centro',
    sellerId: users.seller.uid,
    sellerName: users.seller.name,
    clientAccessCodeHash: hashAccessCode(clientCode),
    clientAccessPublicId: publicId,
    seedRun: runId,
    itemSummary: {
      total: itemsSpec.length,
      aguardandoAprovacao: itemsSpec.filter(
        i => i.status === 'aguardando_aprovacao_cliente',
      ).length,
      aprovados: itemsSpec.filter(
        i => i.status === 'aguardando_atribuicao_montador',
      ).length,
      emProducao: itemsSpec.filter(
        i => i.status === 'em_producao' || i.status === 'pronto_para_montagem',
      ).length,
      emMontagem: itemsSpec.filter(
        i =>
          i.status === 'montagem_concluida' ||
          i.status === 'aguardando_pagamento_montador',
      ).length,
      finalizados: itemsSpec.filter(i => i.status === 'finalizado').length,
      atrasados: 0,
    },
    totalCustomerValue: itemBudgets.reduce(
      (sum, budget) => sum + (budget?.customerAmount ?? 0),
      0,
    ),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: users.seller.uid,
    createdByName: users.seller.name,
    updatedBy: users.seller.uid,
  });

  manifest.projectIds.push(projectRef.id);
  console.log(`✓ Projeto criado: ${projectRef.id} (link /cliente/${publicId})`);

  for (const [itemIndex, itemSpec] of itemsSpec.entries()) {
    const itemRef = projectRef.collection('items').doc();
    const budget = itemBudgets[itemIndex];
    const hasDesigner = itemSpec.status !== 'projeto_criado';

    await itemRef.set({
      projectId: projectRef.id,
      name: itemSpec.name,
      environment: itemSpec.environment,
      description: 'Item de seed para demonstracao.',
      status: itemSpec.status,
      clientApprovalStatus: itemSpec.clientApprovalStatus,
      seedRun: runId,
      ...(hasDesigner
        ? { designerId: users.designer.uid, designerName: users.designer.name }
        : {}),
      ...(budget ? { budget } : {}),
      deadlineCurrent: futureTimestamp(itemSpec.deadlineDays),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: users.seller.uid,
      createdByName: users.seller.name,
      updatedBy: users.seller.uid,
    });

    if (itemSpec.assignAssembler) {
      await itemRef.collection('assemblerAssignments').doc().set({
        projectId: projectRef.id,
        itemId: itemRef.id,
        assemblerId: users.assembler.uid,
        assemblerName: users.assembler.name,
        amountToReceive: budget?.suggestedAssemblerAmount ?? 150,
        paymentStatus: itemSpec.assignAssembler,
        assignedAt: Timestamp.now(),
        assignedBy: users.admin.uid,
        assignedByName: users.admin.name,
        seedRun: runId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }

    console.log(`  • item ${itemIndex + 1}/${itemsSpec.length}: ${itemSpec.name} [${itemSpec.status}]`);
  }
}

const PROJECT_SPECS = [
  {
    index: 1,
    itemsSpec: [
      {
        name: 'Cozinha planejada',
        environment: 'Cozinha',
        status: 'aguardando_aprovacao_cliente',
        clientApprovalStatus: 'aguardando',
        totalCost: 6000,
        customerAmount: 8500,
        suggestedAssemblerAmount: 600,
        deadlineDays: 5,
      },
      {
        name: 'Armario de quarto',
        environment: 'Quarto',
        status: 'em_producao',
        clientApprovalStatus: 'aprovado',
        totalCost: 2200,
        customerAmount: 3200,
        suggestedAssemblerAmount: 300,
        deadlineDays: 10,
      },
      {
        name: 'Painel de TV',
        environment: 'Sala',
        status: 'projeto_criado',
        clientApprovalStatus: 'aguardando',
        deadlineDays: 3,
      },
    ],
  },
  {
    index: 2,
    itemsSpec: [
      {
        name: 'Rack de sala',
        environment: 'Sala',
        status: 'pronto_para_montagem',
        clientApprovalStatus: 'aprovado',
        totalCost: 1400,
        customerAmount: 2100,
        suggestedAssemblerAmount: 200,
        deadlineDays: 2,
        assignAssembler: 'pendente',
      },
      {
        name: 'Bancada de lavanderia',
        environment: 'Lavanderia',
        status: 'aguardando_pagamento_montador',
        clientApprovalStatus: 'aprovado',
        totalCost: 900,
        customerAmount: 1400,
        suggestedAssemblerAmount: 150,
        deadlineDays: -1,
        assignAssembler: 'pendente',
      },
      {
        name: 'Guarda-roupa planejado',
        environment: 'Quarto',
        status: 'finalizado',
        clientApprovalStatus: 'aprovado',
        totalCost: 3000,
        customerAmount: 4500,
        suggestedAssemblerAmount: 400,
        deadlineDays: -5,
        assignAssembler: 'confirmado_pelo_montador',
      },
    ],
  },
];

async function runSeed(db, auth, projectId) {
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const manifest = {
    runId,
    firebaseProjectId: projectId,
    createdAt: new Date().toISOString(),
    authUids: [],
    userDocs: [],
    projectIds: [],
    createdDeadlineDefaults: false,
  };

  console.log(`\n🌱 Seed iniciando no projeto Firebase: ${projectId}`);
  console.log(`   runId: ${runId}\n`);

  const users = await ensureSeedUsers(db, auth, runId, manifest);
  await ensureDeadlineDefaults(db, users.admin.uid, runId, manifest);

  const clientCode = generateClientCode();

  for (const spec of PROJECT_SPECS) {
    await seedProject({ db, users, runId, manifest, clientCode, ...spec });
  }

  saveManifest(runId, manifest);

  console.log('\n✅ Seed concluido.\n');
  console.log('┌─ CREDENCIAIS — copie agora, nao sao gravadas em lugar nenhum ─');
  for (const user of Object.values(users)) {
    console.log(`│ ${user.roles[0].padEnd(10)} ${user.email.padEnd(22)} ${user.password}`);
  }
  console.log(`│ portal do cliente (ambos os projetos): ${clientCode}`);
  console.log('└───────────────────────────────────────────────────────────────\n');
  console.log(`Manifesto salvo em ${RUNS_DIR}/${runId}.json (fora do git).`);
  console.log(`Para apagar tudo o que esta execucao criou:`);
  console.log(`  node --env-file=.env.prod scripts/seed-prod.mjs --undo=${runId}\n`);
}

// ---------------------------------------------------------------- undo

async function runUndo(db, auth, projectId, runIdArg) {
  const manifest = loadManifest(runIdArg);

  if (!manifest) {
    console.error(`❌ Manifesto nao encontrado para "${runIdArg}" em ${RUNS_DIR}/.`);
    process.exit(1);
  }

  if (manifest.firebaseProjectId !== projectId) {
    console.error(
      `❌ O manifesto e do projeto "${manifest.firebaseProjectId}", mas o .env aponta para "${projectId}". Abortado.`,
    );
    process.exit(1);
  }

  console.log(`\n🧹 Desfazendo run ${manifest.runId} em ${projectId}...\n`);

  for (const id of manifest.projectIds) {
    await db.recursiveDelete(db.collection('projects').doc(id));
    console.log(`✓ Projeto apagado (com itens e atribuicoes): ${id}`);
  }

  for (const uid of manifest.userDocs) {
    await db.collection('users').doc(uid).delete();
    console.log(`✓ Doc users/${uid} apagado`);
  }

  for (const uid of manifest.authUids) {
    try {
      await auth.deleteUser(uid);
      console.log(`✓ Usuario Auth apagado: ${uid}`);
    } catch {
      console.log(`• Usuario Auth ${uid} ja nao existia`);
    }
  }

  if (manifest.createdDeadlineDefaults) {
    await db.collection('settings').doc('deadlineDefaults').delete();
    console.log('✓ settings/deadlineDefaults apagado (tinha sido criado por este run)');
  } else {
    console.log('• settings/deadlineDefaults preservado (ja existia antes do seed)');
  }

  console.log('\n✅ Undo concluido.\n');
}

// ---------------------------------------------------------------- main

async function main() {
  const args = parseArgs();
  const projectId = initFirebase();
  const db = getFirestore();
  const auth = getAuth();

  if (args.undo) {
    await runUndo(db, auth, projectId, args.undo);
    process.exit(0);
  }

  if (args.confirm !== projectId) {
    console.error('❌ Confirmacao obrigatoria.\n');
    console.error(`   O .env carregado aponta para o projeto Firebase: ${projectId}`);
    console.error(`   Se e mesmo nele que voce quer gravar, rode:\n`);
    console.error(`   node --env-file=.env.prod scripts/seed-prod.mjs --confirm=${projectId}\n`);
    process.exit(1);
  }

  await runSeed(db, auth, projectId);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
