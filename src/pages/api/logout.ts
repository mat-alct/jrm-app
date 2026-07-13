// pages/api/logout.ts

import { serialize } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';

const handler = (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Cria um cookie com o mesmo nome, mas com data de expiração no passado,
  // o que instrui o navegador a removê-lo.
  const cookieOptions = {
    maxAge: -1, // Expira imediatamente
    path: '/',
  };

  res.setHeader('Set-Cookie', serialize('session', '', cookieOptions));

  return res
    .status(200)
    .json({ status: true, message: 'Logged out successfully.' });
};

export default handler;
