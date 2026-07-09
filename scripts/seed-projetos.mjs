// Seed de desenvolvimento do modulo de Gestao de Projetos de Marcenaria.
//
// Cria, no projeto Firebase apontado pelas variaveis de ambiente:
// - um usuario Auth + doc em users/{uid} para cada papel (admin, vendedor,
//   desenhista, montador);
// - settings/deadlineDefaults;
// - 2 projetos com itens cobrindo os 13 status do fluxo real (desenho,
//   orcamento, aprovacao do cliente, atribuicao de montador, producao,
//   montagem e pagamento);
// - orcamento (ItemBudget) nos itens que ja passaram do desenho;
// - assemblerAssignments de exemplo (um pendente, um pago);
// - um anexo fake por projeto (metadados no Firestore; nao sobe arquivo
//   real ao Storage).
//
// ATENCAO: este script grava dados reais no projeto Firebase configurado
// pelas variaveis de ambiente (.env.local / .env). Rode-o SOMENTE apontando
// para um projeto/banco de testes — nunca contra producao.
//
// Uso:
//   node scripts/seed-projetos.mjs
//
// Para reexecutar do zero, apague antes as colecoes criadas (users com
// email @seed.jrm, projects com sellerName 'Vendedor Seed') pelo console
// do Firebase ou por um script de limpeza dedicado.

import { randomBytes, scryptSync } from 'node:crypto';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(
        /\\n/g,
        '\n',
      ),
    }),
  });
}

const auth = getAuth();
const db = getFirestore();

const SEED_USERS = [
  { name: 'Admin Seed', email: 'admin@seed.jrm', roles: ['admin'] },
  { name: 'Vendedor Seed', email: 'vendedor@seed.jrm', roles: ['seller'] },
  { name: 'Desenhista Seed', email: 'desenhista@seed.jrm', roles: ['designer'] },
  { name: 'Montador Seed', email: 'montador@seed.jrm', roles: ['assembler'] },
];
const SEED_USER_PASSWORD = 'Seed@12345';

const CLIENT_ACCESS_PASSWORD = 'ABC123';

function hashAccessCode(code) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(code, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function ensureSeedUsers() {
  const created = {};

  for (const seedUser of SEED_USERS) {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(seedUser.email);
      console.log(`✓ Usuario Auth ja existia: ${seedUser.email}`);
    } catch {
      userRecord = await auth.createUser({
        email: seedUser.email,
        password: SEED_USER_PASSWORD,
        displayName: seedUser.name,
      });
      console.log(`✓ Usuario Auth criado: ${seedUser.email}`);
    }

    await db
      .collection('users')
      .doc(userRecord.uid)
      .set({
        name: seedUser.name,
        email: seedUser.email,
        roles: seedUser.roles,
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

    created[seedUser.roles[0]] = { uid: userRecord.uid, ...seedUser };
  }

  return created;
}

async function ensureDeadlineDefaults(adminUid) {
  await db
    .collection('settings')
    .doc('deadlineDefaults')
    .set({
      desenhoDias: 5,
      orcamentoDias: 2,
      aprovacaoClienteDias: 3,
      atribuicaoMontadorDias: 2,
      producaoDias: 10,
      montagemDias: 2,
      updatedAt: Timestamp.now(),
      updatedBy: adminUid,
    });
  console.log('✓ settings/deadlineDefaults configurado');
}

function futureTimestamp(daysFromNow) {
  return Timestamp.fromMillis(Date.now() + daysFromNow * 86400000);
}

// Status que ja tem orcamento preenchido no fluxo real (tudo a partir de
// aguardando_aprovacao_cliente, inclusive).
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
    lines: [
      { id: '0', description: 'Material e ferragens', amount: totalCost },
    ],
    totalCost,
    customerAmount,
    suggestedAssemblerAmount,
    createdBy: users.seller.uid,
    createdByName: users.seller.name,
    createdAt: now,
    updatedAt: now,
  };
}

async function seedProject({ users, index, itemsSpec }) {
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
    clientAccessCodeHash: hashAccessCode(CLIENT_ACCESS_PASSWORD),
    clientAccessPublicId: publicId,
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

  console.log(
    `✓ Projeto criado: ${projectRef.id} (cliente ${index}, link /cliente/${publicId}, senha ${CLIENT_ACCESS_PASSWORD})`,
  );

  for (const [itemIndex, itemSpec] of itemsSpec.entries()) {
    const itemRef = projectRef.collection('items').doc();
    const budget = itemBudgets[itemIndex];
    const hasDesigner = itemSpec.status !== 'projeto_criado';

    await itemRef.set({
      projectId: projectRef.id,
      name: itemSpec.name,
      environment: itemSpec.environment,
      description: 'Item de seed para teste manual das duas vias.',
      status: itemSpec.status,
      clientApprovalStatus: itemSpec.clientApprovalStatus,
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
      await itemRef
        .collection('assemblerAssignments')
        .doc()
        .set({
          projectId: projectRef.id,
          itemId: itemRef.id,
          assemblerId: users.assembler.uid,
          assemblerName: users.assembler.name,
          amountToReceive: budget?.suggestedAssemblerAmount ?? 150,
          paymentStatus: itemSpec.assignAssembler,
          assignedAt: Timestamp.now(),
          assignedBy: users.admin.uid,
          assignedByName: users.admin.name,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
    }

    console.log(`  • item ${itemIndex + 1}/${itemsSpec.length}: ${itemSpec.name} [${itemSpec.status}]`);
  }
}

async function main() {
  console.log('🌱 Seed de gestao de projetos iniciando...\n');

  const users = await ensureSeedUsers();
  await ensureDeadlineDefaults(users.admin.uid);

  await seedProject({
    users,
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
  });

  await seedProject({
    users,
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
  });

  console.log('\n✅ Seed concluido.');
  console.log(`   Senha dos usuarios de login interno: ${SEED_USER_PASSWORD}`);
  console.log(`   Senha de acesso do cliente (ambos os projetos): ${CLIENT_ACCESS_PASSWORD}`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
