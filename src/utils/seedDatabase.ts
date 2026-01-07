import {
  doc,
  getDoc,
  writeBatch,
  Timestamp,
  collection,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/firebase';

const randomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const firstNames = [
  'João',
  'Maria',
  'Pedro',
  'Ana',
  'Carlos',
  'Lúcia',
  'Marcos',
  'Fernanda',
  'Roberto',
  'Juliana',
  'Ricardo',
  'Camila',
  'Paulo',
  'Beatriz',
  'Lucas',
];
const lastNames = [
  'Silva',
  'Santos',
  'Oliveira',
  'Souza',
  'Pereira',
  'Ferreira',
  'Costa',
  'Rodrigues',
  'Almeida',
  'Nascimento',
  'Lima',
  'Araújo',
];
const bairros = [
  'Japuíba',
  'Frade',
  'Centro',
  'Belém',
  'Monsuaba',
  'Camorim',
  'Verolme',
  'Bracuí',
];
const lojas = ['Japuíba', 'Frade'];

export const seedDatabase = async () => {
  const batch = writeBatch(db);

  // 1. Pegar o número atual do contador
  const counterRef = doc(db, 'counters', 'orders');
  const counterSnap = await getDoc(counterRef);
  let currentCode = counterSnap.exists() ? counterSnap.data().code : 1;

  console.log(
    `Iniciando criação de pedidos a partir do código: ${currentCode}`,
  );

  // 2. Criar 35 pedidos (para garantir paginação > 20)
  for (let i = 0; i < 35; i++) {
    const isCompleted = i < 25; // Os primeiros 25 serão "Concluído" para testar paginação

    const id = uuidv4();
    const docRef = doc(db, 'orders', id);

    // Gerar Data aleatória nos últimos 60 dias
    const date = new Date();
    date.setDate(date.getDate() - randomNumber(0, 60));

    const orderData = {
      orderCode: currentCode + i,
      customer: {
        name: `${randomItem(firstNames)} ${randomItem(lastNames)}`,
        telephone: `(24) 99${randomNumber(100, 999)}-${randomNumber(1000, 9999)}`,
        address: `Rua das Flores, ${randomNumber(1, 500)}`,
        area: randomItem(bairros),
        city: 'Angra dos Reis',
        state: 'RJ',
        customerId: '',
      },
      cutlist: [
        {
          id: uuidv4(),
          amount: randomNumber(1, 50),
          material: {
            name: 'MDF Branco TX 15mm',
            width: 2750,
            height: 1830,
            price: 250,
          },
          sideA: randomNumber(100, 1000),
          sideB: randomNumber(100, 1000),
          borderA: randomNumber(0, 2),
          borderB: randomNumber(0, 2),
          price: randomNumber(50, 500),
        },
      ],
      orderStore: randomItem(lojas),
      deliveryType: Math.random() > 0.5 ? 'Entrega' : 'Retirar na Loja',
      paymentType: Math.random() > 0.5 ? 'Pago' : 'Receber na Entrega',
      orderStatus: isCompleted
        ? 'Concluído'
        : randomItem(['Em Produção', 'Liberado para Transporte']),
      orderPrice: randomNumber(100, 2000),
      seller: 'Sistema Teste',
      ps: 'Pedido gerado automaticamente para teste.',
      isUrgent: Math.random() > 0.8, // 20% de chance de ser urgente
      deliveryDate: Timestamp.fromDate(date),
      createdAt: Timestamp.fromDate(date),
      updatedAt: Timestamp.fromDate(date),
    };

    batch.set(docRef, orderData);
  }

  // 3. Atualizar o contador
  batch.update(counterRef, { code: currentCode + 35 });

  // 4. Enviar tudo pro Firestore
  await batch.commit();

  console.log('Sucesso! 35 pedidos criados.');
};
