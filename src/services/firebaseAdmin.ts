// src/services/firebaseAdmin.ts

import * as admin from 'firebase-admin';

// Verifica se o app já foi inicializado para evitar erros no modo de desenvolvimento
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // A chave privada precisa ser parseada corretamente, especialmente na Vercel
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

// Exporta o SDK Admin inicializado
export { admin };
