import {
  deleteApp as deleteAdminApp,
  getApps as getAdminApps,
} from 'firebase-admin/app';
import { deleteApp } from 'firebase/app';
import { signOut } from 'firebase/auth';
import { terminate } from 'firebase/firestore';

import { app, auth, db } from '@/services/firebase';

// Sem isso o Auth cliente mantem o timer de refresh de token e os SDKs mantem streams
// gRPC abertos: o Jest avisa "did not exit one second after the test run" e no CI o job
// fica pendurado ate o timeout.
afterAll(async () => {
  await signOut(auth).catch(() => undefined);
  await terminate(db);
  await deleteApp(app);
  await Promise.all(getAdminApps().map(adminApp => deleteAdminApp(adminApp)));

  // O `fetch` global do Node (undici) mantem sockets keep-alive por alguns segundos.
  // O --detectOpenHandles do Jest nao os enxerga, mas eles atrasam a saida do processo.
  const dispatcher = (
    globalThis as unknown as Record<symbol, { close?: () => Promise<void> }>
  )[Symbol.for('undici.globalDispatcher.1')];
  await dispatcher?.close?.().catch(() => undefined);
});
