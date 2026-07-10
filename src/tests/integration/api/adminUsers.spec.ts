import usersHandler from '@/pages/api/admin/users';
import { adminAuth, adminDb } from '@/services/firebaseAdmin';
import { userPath } from '@/services/projects/paths';
import {
  internalSessionCookie,
  mockReq,
  mockRes,
  signInAs,
  signOutClient,
} from '@/tests/helpers/apiTest';
import { resetEmulator } from '@/tests/helpers/emulator';
import { seedEmulator, SEED_USER_PASSWORD } from '@/tests/helpers/seedEmulator';

describe('api/admin/users integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOutClient();
  });

  it('cria usuario no Auth e no Firestore, e o novo usuario consegue logar', async () => {
    const res = mockRes();
    await usersHandler(
      mockReq({
        method: 'POST',
        cookie: await internalSessionCookie(),
        body: {
          name: 'Desenhista Novo',
          email: 'desenhista.novo@seed.jrm',
          password: SEED_USER_PASSWORD,
          roles: ['designer'],
          phone: '(24) 99999-1234',
        },
      }),
      res,
    );

    expect(res.statusCode).toBe(201);
    const { id } = res.body as { id: string };

    const authUser = await adminAuth.getUser(id);
    expect(authUser.email).toBe('desenhista.novo@seed.jrm');
    expect(authUser.displayName).toBe('Desenhista Novo');

    const userDoc = (await adminDb.doc(userPath(id)).get()).data();
    expect(userDoc).toMatchObject({
      name: 'Desenhista Novo',
      email: 'desenhista.novo@seed.jrm',
      roles: ['designer'],
      active: true,
      // Regressao do commit d74abe3: telefone livre precisa virar E.164.
      phone: '+5524999991234',
    });

    await signOutClient();
    const credential = await signInAs('desenhista.novo@seed.jrm');
    expect(credential.user.uid).toBe(id);
  });

  it('atualiza nome, papeis, telefone e status ativo', async () => {
    const cookie = await internalSessionCookie();

    const res = mockRes();
    await usersHandler(
      mockReq({
        method: 'PATCH',
        cookie,
        body: {
          id: 'seed-designer',
          name: 'Desenhista Renomeado',
          roles: ['designer', 'seller'],
          phone: '24988887777',
          active: false,
        },
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect((await adminDb.doc(userPath('seed-designer')).get()).data()).toMatchObject({
      name: 'Desenhista Renomeado',
      roles: ['designer', 'seller'],
      phone: '+5524988887777',
      active: false,
    });
    expect((await adminAuth.getUser('seed-designer')).displayName).toBe(
      'Desenhista Renomeado',
    );
  });

  it('nega acesso sem sessao, com sessao nao-admin e com metodo invalido', async () => {
    const wrongMethodRes = mockRes();
    await usersHandler(mockReq({ method: 'GET' }), wrongMethodRes);
    expect(wrongMethodRes.statusCode).toBe(405);

    const noSessionRes = mockRes();
    await usersHandler(
      mockReq({ method: 'POST', body: { name: 'X' } }),
      noSessionRes,
    );
    expect(noSessionRes.statusCode).toBe(403);

    const sellerRes = mockRes();
    await usersHandler(
      mockReq({
        method: 'POST',
        cookie: await internalSessionCookie('vendedor@seed.jrm'),
        body: {
          name: 'Invasor',
          email: 'invasor@seed.jrm',
          password: SEED_USER_PASSWORD,
          roles: ['admin'],
        },
      }),
      sellerRes,
    );
    expect(sellerRes.statusCode).toBe(403);

    await expect(adminAuth.getUserByEmail('invasor@seed.jrm')).rejects.toThrow();
  });

  it('valida payload: campos faltando, papel invalido, email duplicado e senha curta', async () => {
    const cookie = await internalSessionCookie();

    const missingFieldsRes = mockRes();
    await usersHandler(
      mockReq({ method: 'POST', cookie, body: { name: 'Sem email' } }),
      missingFieldsRes,
    );
    expect(missingFieldsRes.statusCode).toBe(400);

    const invalidRoleRes = mockRes();
    await usersHandler(
      mockReq({
        method: 'POST',
        cookie,
        body: {
          name: 'Papel Invalido',
          email: 'papel@seed.jrm',
          password: SEED_USER_PASSWORD,
          roles: ['superuser'],
        },
      }),
      invalidRoleRes,
    );
    expect(invalidRoleRes.statusCode).toBe(400);

    const duplicateRes = mockRes();
    await usersHandler(
      mockReq({
        method: 'POST',
        cookie,
        body: {
          name: 'Admin Duplicado',
          email: 'admin@seed.jrm',
          password: SEED_USER_PASSWORD,
          roles: ['admin'],
        },
      }),
      duplicateRes,
    );
    expect(duplicateRes.statusCode).toBe(409);

    const shortPasswordRes = mockRes();
    await usersHandler(
      mockReq({
        method: 'POST',
        cookie,
        body: {
          name: 'Senha Curta',
          email: 'senha.curta@seed.jrm',
          password: '123',
          roles: ['seller'],
        },
      }),
      shortPasswordRes,
    );
    expect(shortPasswordRes.statusCode).toBe(400);

    await expect(adminAuth.getUserByEmail('papel@seed.jrm')).rejects.toThrow();
    await expect(adminAuth.getUserByEmail('senha.curta@seed.jrm')).rejects.toThrow();
  });

  it('exige id no PATCH e recusa papeis invalidos', async () => {
    const cookie = await internalSessionCookie();

    const missingIdRes = mockRes();
    await usersHandler(
      mockReq({ method: 'PATCH', cookie, body: { name: 'Sem id' } }),
      missingIdRes,
    );
    expect(missingIdRes.statusCode).toBe(400);

    const invalidRolesRes = mockRes();
    await usersHandler(
      mockReq({
        method: 'PATCH',
        cookie,
        body: { id: 'seed-designer', roles: [] },
      }),
      invalidRolesRes,
    );
    expect(invalidRolesRes.statusCode).toBe(400);

    expect((await adminDb.doc(userPath('seed-designer')).get()).data()).toMatchObject({
      name: 'Desenhista Seed',
      roles: ['designer'],
    });
  });
});
