process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS = '1';
process.env.USE_FIREBASE_EMULATORS = '1';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-jrm';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-jrm.appspot.com';
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'fake-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'demo-jrm.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '0';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'demo';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
process.env.CLIENT_ACCESS_SECRET = 'test-client-access-secret';
