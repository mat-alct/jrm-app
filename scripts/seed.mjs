import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}
const db = getFirestore();

const SELLER_NAME = 'Vendedor Teste';
const SELLER_PASSWORD = '0000';

const MATERIALS = [
  { name: 'MDF 15mm Comum', width: 2750, height: 1850, price: 300, materialType: 'MDF' },
  { name: 'MDF 15mm Ultra', width: 2750, height: 1850, price: 400, materialType: 'MDF' },
];

const FIRST = ['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Beatriz', 'Felipe', 'Carla', 'Rafael', 'Juliana', 'Marcos', 'Patrícia', 'Bruno', 'Larissa', 'Thiago'];
const LAST = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Ferreira', 'Carvalho'];
const AREAS = ['Japuíba', 'Centro', 'Praia Linda', 'Frade', 'Bracuhy', 'Camorim', 'Parque Mambucaba', 'Monsuaba'];
const STREETS = ['R. Japoranga', 'Av. Brasil', 'R. das Palmeiras', 'R. Coronel Carvalho', 'Estrada do Contorno', 'R. Marechal Deodoro'];
const STATUSES = ['Em Produção', 'Liberado para Transporte', 'Concluído'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function ensureSeller() {
  const snap = await db.collection('sellers').where('name', '==', SELLER_NAME).get();
  if (snap.empty) {
    await db.collection('sellers').add({ name: SELLER_NAME, password: SELLER_PASSWORD });
    console.log(`✓ Vendedor criado: ${SELLER_NAME} (senha: ${SELLER_PASSWORD})`);
  } else {
    console.log(`✓ Vendedor já existia: ${SELLER_NAME}`);
  }
}

async function ensureMaterials() {
  const result = [];
  for (const mat of MATERIALS) {
    const snap = await db.collection('materials').where('name', '==', mat.name).get();
    if (snap.empty) {
      const ref = await db.collection('materials').add({
        ...mat,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      result.push({ id: ref.id, ...mat });
      console.log(`✓ Material criado: ${mat.name} (R$ ${mat.price})`);
    } else {
      result.push({ id: snap.docs[0].id, ...snap.docs[0].data() });
      console.log(`✓ Material já existia: ${mat.name}`);
    }
  }
  return result;
}

function buildCutlist(materials, numItems, indexBase) {
  const cutlist = [];
  let total = 0;
  for (let j = 0; j < numItems; j++) {
    const mat = materials[(indexBase + j) % materials.length];
    const sideA = randInt(200, 2400);
    const sideB = randInt(200, 1800);
    const amount = randInt(1, 6);
    const borderA = (indexBase + j) % 3;
    const borderB = (indexBase + j + 1) % 3;
    // Cada 3ª peça com furação de dobradiça
    const hasHingeHoles = (indexBase + j) % 3 === 0;
    const itemPrice = randInt(40, 600);

    const cut = {
      id: randomUUID(),
      material: {
        materialId: mat.id,
        name: mat.name,
        width: mat.width,
        height: mat.height,
        price: mat.price,
      },
      amount,
      sideA,
      sideB,
      borderA,
      borderB,
      price: itemPrice,
    };
    if (hasHingeHoles) {
      cut.hasHingeHoles = true;
      cut.hingeHolesSide = j % 2 === 0 ? 'Maior' : 'Menor';
      cut.hingeHolesQuantity = randInt(2, 6);
    }
    cutlist.push(cut);
    total += itemPrice;
  }
  return { cutlist, total };
}

async function seedOrders(materials) {
  const SEED_START = 99001; // range de teste, isolado do counter real (5693)
  const N = 50;
  // Ciclo de tamanhos pra cobrir poucas e muitas peças
  const SIZES = [1, 2, 3, 5, 8, 12, 1, 4, 6, 2];

  for (let i = 0; i < N; i++) {
    const code = SEED_START + i;
    const numItems = SIZES[i % SIZES.length];
    const { cutlist, total } = buildCutlist(materials, numItems, i);

    const status = STATUSES[i % STATUSES.length];
    const isUrgent = i % 3 === 0;
    const hasEdits = i % 4 === 0;
    const deliveryType = i % 2 === 0 ? 'Retirar na Loja' : 'Entrega';
    const paymentType = i % 2 === 0 ? 'Pago' : 'Receber na Entrega';

    const customerName = `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`;
    const customer = {
      name: customerName,
      telephone: `24999${String(100000 + i * 137).slice(0, 6)}`,
      city: '',
      state: 'Rio de Janeiro',
      customerId: '',
      address: deliveryType === 'Entrega' ? `${STREETS[i % STREETS.length]}, ${randInt(1, 2000)}` : '',
      area: deliveryType === 'Entrega' ? AREAS[i % AREAS.length] : '',
    };

    const createdAtMs = Date.now() - (60 - i) * 86400000;
    const deliveryMs = createdAtMs + (3 + (i % 21)) * 86400000;
    const createdAt = Timestamp.fromMillis(createdAtMs);
    const updatedAt = Timestamp.fromMillis(createdAtMs + 3600000);
    const deliveryDate = Timestamp.fromMillis(deliveryMs);

    const order = {
      cutlist,
      customer,
      orderStatus: status,
      paymentType,
      deliveryType,
      isUrgent,
      seller: SELLER_NAME,
      orderCode: code,
      orderPrice: total,
      deliveryDate,
      createdAt,
      updatedAt,
    };

    if (paymentType === 'Receber na Entrega' && i % 4 === 1) {
      order.amountDue = String(Math.max(50, Math.floor(total / 2)));
    }
    if (i % 5 === 0) {
      order.ps = 'Cliente pediu prioridade. Confirmar antes de entregar.';
    }

    if (hasEdits) {
      const previousCutlist = cutlist.slice(0, Math.max(1, cutlist.length - 1));
      const previousOrderPrice = previousCutlist.reduce((a, c) => a + c.price, 0);
      order.edits = [
        {
          editedAt: Timestamp.fromMillis(createdAtMs + 86400000),
          editedBy: SELLER_NAME,
          previousCutlist,
          previousOrderPrice,
          priceDifference: total - previousOrderPrice,
          shouldCharge: total - previousOrderPrice > 0,
        },
      ];
    }

    await db.collection('orders').doc(randomUUID()).set(order);
    if ((i + 1) % 10 === 0) console.log(`  • ${i + 1}/${N} pedidos`);
  }
  console.log(`✓ ${N} pedidos criados (códigos ${SEED_START}–${SEED_START + N - 1})`);
}

async function main() {
  console.log('🌱 Seed iniciando...\n');
  await ensureSeller();
  const materials = await ensureMaterials();
  await seedOrders(materials);
  console.log(`\n✅ Concluído. Counter de pedidos reais segue em 5693.`);
  console.log(`   Pra apagar os seeds depois: orderCode entre 99001 e 99050.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
