import { NextApiRequest, NextApiResponse } from 'next';

import { handleClientItemTransitionRoute } from '@/services/projects/clientActionRoute.server';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return handleClientItemTransitionRoute(req, res, 'recusado_pelo_cliente');
}
