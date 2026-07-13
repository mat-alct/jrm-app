// pages/api/login.ts

import { serialize } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';

import { adminAuth } from '../../services/firebaseAdmin';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body: unknown = req.body;
    const token =
      typeof body === 'object' &&
      body !== null &&
      'token' in body &&
      typeof body.token === 'string'
        ? body.token
        : null;

    if (!token) {
      return res.status(400).json({ error: 'Token is required.' });
    }

    // Define a duração do cookie de sessão (ex: 5 dias)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    // Cria o cookie de sessão com o token do cliente
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn,
    });

    const cookieOptions = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'strict' as const,
    };

    // Define o cookie no header da resposta
    res.setHeader(
      'Set-Cookie',
      serialize('session', sessionCookie, cookieOptions),
    );

    return res
      .status(200)
      .json({ status: true, message: 'Logged in successfully.' });
  } catch {
    return res.status(401).json({ error: 'Authentication failed.' });
  }
};

export default handler;
