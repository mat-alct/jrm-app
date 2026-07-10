import { Timestamp } from 'firebase/firestore';

import type { Material, Order, Estimate } from '@/types';
import type {
  AppUser,
  AssemblerAssignment,
  AssemblerPayment,
  Attachment,
  Project,
  ProjectItem,
  UserRole,
} from '@/types/projects';

const now = () => Timestamp.fromDate(new Date('2026-01-15T12:00:00.000Z'));

export function buildAppUser(overrides: Partial<AppUser> = {}): AppUser {
  const role = overrides.roles?.[0] ?? 'admin';
  return {
    id: `${role}-uid`,
    name: `${role} Teste`,
    email: `${role}@seed.jrm`,
    roles: [role],
    active: true,
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  };
}

export function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    customerName: 'Cliente Teste',
    customerPhone: '24999990000',
    customerEmail: 'cliente@example.com',
    customerAddress: 'Rua Teste, 123',
    sellerId: 'seller-uid',
    sellerName: 'Vendedor Teste',
    clientAccessCodeHash: 'salt:hash',
    clientAccessPublicId: 'cliente-teste',
    itemSummary: {
      total: 0,
      aguardandoAprovacao: 0,
      aprovados: 0,
      emProducao: 0,
      emMontagem: 0,
      finalizados: 0,
      atrasados: 0,
    },
    totalCustomerValue: 0,
    createdAt: now(),
    updatedAt: now(),
    createdBy: 'seller-uid',
    createdByName: 'Vendedor Teste',
    updatedBy: 'seller-uid',
    ...overrides,
  };
}

export function buildProjectItem(
  overrides: Partial<ProjectItem> = {},
): ProjectItem {
  return {
    id: 'item-1',
    projectId: 'project-1',
    name: 'Cozinha planejada',
    environment: 'Cozinha',
    description: 'Item de teste',
    status: 'projeto_criado',
    clientApprovalStatus: 'aguardando',
    createdAt: now(),
    updatedAt: now(),
    createdBy: 'seller-uid',
    updatedBy: 'seller-uid',
    ...overrides,
  };
}

export function buildAttachment(
  overrides: Partial<Attachment> = {},
): Attachment {
  return {
    id: 'attachment-1',
    projectId: 'project-1',
    fileName: 'arquivo.pdf',
    originalFileName: 'Arquivo.pdf',
    storagePath: 'projects/project-1/general/arquivo.pdf',
    downloadUrl: 'http://127.0.0.1:9199/download',
    mimeType: 'application/pdf',
    sizeBytes: 12,
    fileKind: 'document',
    category: 'contrato',
    visibility: 'client',
    uploadedBy: 'seller-uid',
    uploadedByName: 'Vendedor Teste',
    uploadedByRole: 'seller',
    clientVisible: true,
    createdAt: now(),
    ...overrides,
  };
}

export function buildAssemblerAssignment(
  overrides: Partial<AssemblerAssignment> = {},
): AssemblerAssignment {
  return {
    id: 'assembler-uid',
    projectId: 'project-1',
    itemId: 'item-1',
    assemblerId: 'assembler-uid',
    assemblerName: 'Montador Teste',
    amountToReceive: 250,
    paymentStatus: 'pendente',
    assignedAt: now(),
    assignedBy: 'admin-uid',
    assignedByName: 'Admin Teste',
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  };
}

export function buildAssemblerPayment(
  overrides: Partial<AssemblerPayment> = {},
): AssemblerPayment {
  return {
    id: 'payment-1',
    projectId: 'project-1',
    itemId: 'item-1',
    assignmentId: 'assembler-uid',
    assemblerId: 'assembler-uid',
    assemblerName: 'Montador Teste',
    amount: 250,
    status: 'pago',
    paidAt: now(),
    paidBy: 'admin-uid',
    paidByName: 'Admin Teste',
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  };
}

export function buildMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: 'material-1',
    name: '340 - 00000000000730 - MDF Branco 15mm',
    width: 2750,
    height: 1850,
    price: 220,
    materialType: 'MDF',
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  };
}

export function buildEstimate(overrides: Partial<Estimate> = {}): Estimate {
  return {
    name: 'Cliente Teste',
    telephone: '24999990000',
    cutlist: [],
    area: 'Centro',
    freightPrice: 0,
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  };
}

export function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    customer: {
      name: 'Cliente Teste',
      telephone: '24999990000',
      address: 'Rua Teste, 123',
      area: 'Centro',
      city: 'Volta Redonda',
      state: 'RJ',
    },
    cutlist: [],
    deliveryType: 'Entrega',
    paymentType: 'Dinheiro',
    freightPrice: 0,
    seller: 'Vendedor Teste',
    orderStatus: 'pending',
    deliveryDate: now(),
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  };
}

export const seedUsers: Array<{
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}> = [
  {
    uid: 'seed-admin',
    name: 'Admin Seed',
    email: 'admin@seed.jrm',
    role: 'admin',
  },
  {
    uid: 'seed-seller',
    name: 'Vendedor Seed',
    email: 'vendedor@seed.jrm',
    role: 'seller',
  },
  {
    uid: 'seed-designer',
    name: 'Desenhista Seed',
    email: 'desenhista@seed.jrm',
    role: 'designer',
  },
  {
    uid: 'seed-assembler',
    name: 'Montador Seed',
    email: 'montador@seed.jrm',
    role: 'assembler',
  },
  {
    uid: 'seed-woodworker',
    name: 'Marceneiro Seed',
    email: 'marceneiro@seed.jrm',
    role: 'woodworker',
  },
];
