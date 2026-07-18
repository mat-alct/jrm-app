import { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/services/firebaseAdmin';

import { ensureAuthUser } from './emulator';
import { seedUsers } from './factories';

export const SEED_USER_PASSWORD = 'Seed@12345';
export const CLIENT_ACCESS_PASSWORD = 'ABC123';
/** Senha do vendedor usada na area legada de cortes (id do doc em `sellers`). */
export const SEED_SELLER_PASSWORD = 'vendedor123';
export const SEED_MATERIAL_NAME =
  '340 - 00000000000730 - MDF Branco Texturizado 15mm';

export async function seedEmulator(): Promise<void> {
  await Promise.all(
    seedUsers.map(user =>
      ensureAuthUser({
        uid: user.uid,
        email: user.email,
        password: SEED_USER_PASSWORD,
        displayName: user.name,
      }),
    ),
  );

  const now = Timestamp.fromDate(new Date('2026-01-15T12:00:00.000Z'));
  const batch = adminDb.batch();

  for (const user of seedUsers) {
    batch.set(adminDb.collection('users').doc(user.uid), {
      name: user.name,
      email: user.email,
      roles: [user.role],
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  batch.set(adminDb.collection('settings').doc('deadlineDefaults'), {
    desenhoDias: 5,
    orcamentoDias: 2,
    aprovacaoClienteDias: 3,
    atribuicaoMontadorDias: 2,
    producaoDias: 10,
    montagemDias: 2,
    updatedAt: now,
    updatedBy: 'seed-admin',
  });

  const projectRef = adminDb.collection('projects').doc('seed-project-1');
  batch.set(projectRef, {
    customerName: 'Cliente Seed 1',
    customerPhone: '24999990000',
    customerEmail: 'cliente1@seed.jrm',
    customerAddress: 'Rua de Teste, 123 - Centro',
    sellerId: 'seed-seller',
    sellerName: 'Vendedor Seed',
    clientAccessCodeHash: 'seed-hash-placeholder',
    clientAccessPublicId: 'seed-cliente-1',
    itemSummary: {
      total: 2,
      aguardandoAprovacao: 1,
      aprovados: 0,
      emProducao: 1,
      emMontagem: 0,
      finalizados: 0,
      atrasados: 0,
    },
    totalCustomerValue: 1200,
    createdAt: now,
    updatedAt: now,
    createdBy: 'seed-seller',
    createdByName: 'Vendedor Seed',
    updatedBy: 'seed-seller',
  });

  batch.set(projectRef.collection('items').doc('seed-item-1'), {
    projectId: projectRef.id,
    name: 'Cozinha planejada',
    environment: 'Cozinha',
    description: 'Item seed para smoke e2e',
    status: 'aguardando_aprovacao_cliente',
    clientApprovalStatus: 'aguardando',
    designerId: 'seed-designer',
    designerName: 'Desenhista Seed',
    budget: {
      lines: [
        { id: 'line-1', description: 'Material e ferragens', amount: 600 },
      ],
      totalCost: 600,
      customerAmount: 1200,
      suggestedAssemblerAmount: 300,
      createdBy: 'seed-seller',
      createdByName: 'Vendedor Seed',
      createdAt: now,
      updatedAt: now,
    },
    deadlineCurrent: Timestamp.fromDate(new Date('2026-01-20T12:00:00.000Z')),
    createdAt: now,
    updatedAt: now,
    createdBy: 'seed-seller',
    createdByName: 'Vendedor Seed',
    updatedBy: 'seed-seller',
  });

  batch.set(projectRef.collection('items').doc('seed-item-2'), {
    projectId: projectRef.id,
    name: 'Armario de quarto',
    environment: 'Quarto',
    description: 'Item seed atribuido ao montador',
    status: 'em_producao',
    clientApprovalStatus: 'aprovado',
    designerId: 'seed-designer',
    designerName: 'Desenhista Seed',
    assemblerAssignedAt: now,
    deadlineCurrent: Timestamp.fromDate(new Date('2026-01-22T12:00:00.000Z')),
    createdAt: now,
    updatedAt: now,
    createdBy: 'seed-seller',
    createdByName: 'Vendedor Seed',
    updatedBy: 'seed-seller',
  });

  batch.set(
    projectRef
      .collection('items')
      .doc('seed-item-2')
      .collection('assemblerAssignments')
      .doc('seed-assembler'),
    {
      projectId: projectRef.id,
      itemId: 'seed-item-2',
      assemblerId: 'seed-assembler',
      assemblerName: 'Montador Seed',
      // Os mesmos campos denormalizados que `assignAssemblers` grava em producao.
      customerName: 'Cliente Seed 1',
      itemName: 'Armario de quarto',
      itemStatus: 'em_producao',
      amountToReceive: 250,
      paymentStatus: 'pendente',
      assignedAt: now,
      assignedBy: 'seed-admin',
      assignedByName: 'Admin Seed',
      createdAt: now,
      updatedAt: now,
    },
  );

  // A "senha do vendedor" da area de cortes e o proprio id do doc em `sellers`.
  batch.set(adminDb.collection('sellers').doc(SEED_SELLER_PASSWORD), {
    name: 'Vendedor Seed',
    createdAt: now,
  });

  // O pedido semeado usa o codigo 1: o proximo pedido criado deve ser o 2.
  batch.set(adminDb.collection('counters').doc('orders'), { code: 2 });

  batch.set(adminDb.collection('materials').doc('seed-material-1'), {
    name: SEED_MATERIAL_NAME,
    width: 2750,
    height: 1850,
    price: 220,
    materialType: 'MDF',
    createdAt: now,
    updatedAt: now,
  });

  batch.set(adminDb.collection('orders').doc('seed-order-1'), {
    orderCode: 1,
    customer: {
      name: 'Cliente Corte Seed',
      telephone: '24999990001',
      address: 'Rua do Corte, 10',
      area: 'Centro',
      city: 'Volta Redonda',
      state: 'RJ',
    },
    cutlist: [
      {
        id: 'seed-cut-1',
        material: {
          materialId: 'seed-material-1',
          name: SEED_MATERIAL_NAME,
          width: 2750,
          height: 1850,
          price: 220,
        },
        amount: 1,
        sideA: 1000,
        sideB: 500,
        borderA: 0,
        borderB: 0,
        price: 38,
        hasHingeHoles: false,
        hingeHolesQuantity: 0,
        hasDrawerSlot: false,
        hasRoundedCorners: false,
      },
    ],
    orderPrice: 38,
    deliveryType: 'Entrega',
    paymentType: 'Dinheiro',
    freightPrice: 0,
    seller: 'Vendedor Seed',
    // Mesmo valor que a UI grava ao criar um pedido.
    orderStatus: 'Em Produção',
    deliveryDate: Timestamp.fromDate(new Date('2026-01-25T12:00:00.000Z')),
    createdAt: now,
    updatedAt: now,
  });

  const secondProjectRef = adminDb.collection('projects').doc('seed-project-2');
  batch.set(secondProjectRef, {
    customerName: 'Cliente Seed 2',
    customerPhone: '24999990002',
    customerEmail: 'cliente2@seed.jrm',
    customerAddress: 'Rua Dois, 456 - Centro',
    sellerId: 'seed-seller',
    sellerName: 'Vendedor Seed',
    clientAccessCodeHash: 'seed-hash-placeholder',
    clientAccessPublicId: 'seed-cliente-2',
    itemSummary: {
      total: 3,
      aguardandoAprovacao: 0,
      aprovados: 0,
      emProducao: 1,
      emMontagem: 1,
      finalizados: 1,
      atrasados: 0,
    },
    totalCustomerValue: 2700,
    createdAt: now,
    updatedAt: now,
    createdBy: 'seed-seller',
    createdByName: 'Vendedor Seed',
    updatedBy: 'seed-seller',
  });

  batch.set(secondProjectRef.collection('items').doc('seed-item-3'), {
    projectId: secondProjectRef.id,
    name: 'Rack de sala',
    environment: 'Sala',
    description: 'Item pronto para montagem',
    status: 'pronto_para_montagem',
    clientApprovalStatus: 'aprovado',
    designerId: 'seed-designer',
    designerName: 'Desenhista Seed',
    budget: {
      lines: [
        { id: 'line-1', description: 'Material e ferragens', amount: 700 },
      ],
      totalCost: 700,
      customerAmount: 1400,
      suggestedAssemblerAmount: 350,
      createdBy: 'seed-seller',
      createdByName: 'Vendedor Seed',
      createdAt: now,
      updatedAt: now,
    },
    deadlineCurrent: Timestamp.fromDate(new Date('2026-01-24T12:00:00.000Z')),
    createdAt: now,
    updatedAt: now,
    createdBy: 'seed-seller',
    createdByName: 'Vendedor Seed',
    updatedBy: 'seed-seller',
  });

  batch.set(secondProjectRef.collection('items').doc('seed-item-4'), {
    projectId: secondProjectRef.id,
    name: 'Bancada de lavanderia',
    environment: 'Lavanderia',
    description: 'Item aguardando pagamento de montador',
    status: 'aguardando_pagamento_montador',
    clientApprovalStatus: 'aprovado',
    designerId: 'seed-designer',
    designerName: 'Desenhista Seed',
    budget: {
      lines: [
        { id: 'line-1', description: 'Material e ferragens', amount: 450 },
      ],
      totalCost: 450,
      customerAmount: 900,
      suggestedAssemblerAmount: 220,
      createdBy: 'seed-seller',
      createdByName: 'Vendedor Seed',
      createdAt: now,
      updatedAt: now,
    },
    deadlineCurrent: Timestamp.fromDate(new Date('2026-01-26T12:00:00.000Z')),
    createdAt: now,
    updatedAt: now,
    createdBy: 'seed-seller',
    createdByName: 'Vendedor Seed',
    updatedBy: 'seed-seller',
  });

  batch.set(secondProjectRef.collection('items').doc('seed-item-5'), {
    projectId: secondProjectRef.id,
    name: 'Guarda-roupa planejado',
    environment: 'Quarto',
    description: 'Item finalizado',
    status: 'finalizado',
    clientApprovalStatus: 'aprovado',
    designerId: 'seed-designer',
    designerName: 'Desenhista Seed',
    completedAt: Timestamp.fromDate(new Date('2026-01-18T12:00:00.000Z')),
    budget: {
      lines: [
        { id: 'line-1', description: 'Material e ferragens', amount: 200 },
      ],
      totalCost: 200,
      customerAmount: 400,
      suggestedAssemblerAmount: 100,
      createdBy: 'seed-seller',
      createdByName: 'Vendedor Seed',
      createdAt: now,
      updatedAt: now,
    },
    deadlineCurrent: Timestamp.fromDate(new Date('2026-01-18T12:00:00.000Z')),
    createdAt: now,
    updatedAt: now,
    createdBy: 'seed-seller',
    createdByName: 'Vendedor Seed',
    updatedBy: 'seed-seller',
  });

  await batch.commit();
}
