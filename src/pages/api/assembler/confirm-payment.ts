import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { NextApiRequest, NextApiResponse } from 'next';

import { adminDb } from '@/services/firebaseAdmin';
import { ApiAuthError, requireInternalUser } from '@/services/projects/internalAuth.server';
import { itemAssemblerAssignmentPath, paymentPath } from '@/services/projects/paths';
import { AssemblerPayment } from '@/types/projects';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const user = await requireInternalUser(req, ['assembler']);
    const { paymentId } = req.body as { paymentId?: string };
    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId obrigatorio.' });
    }

    const paymentRef = adminDb.doc(paymentPath(paymentId));
    const paymentSnap = await paymentRef.get();
    if (!paymentSnap.exists) {
      return res.status(404).json({ error: 'Pagamento nao encontrado.' });
    }

    const payment = {
      id: paymentSnap.id,
      ...paymentSnap.data(),
    } as AssemblerPayment;
    if (payment.assemblerId !== user.uid || payment.status !== 'pago') {
      return res.status(403).json({ error: 'Pagamento nao pode ser confirmado.' });
    }

    const now = AdminTimestamp.now();
    await paymentRef.update({
      status: 'confirmado_pelo_montador',
      confirmedAt: now,
      updatedAt: now,
    });
    await adminDb
      .doc(
        itemAssemblerAssignmentPath(
          payment.projectId,
          payment.itemId,
          payment.assignmentId,
        ),
      )
      .update({
        paymentStatus: 'confirmado_pelo_montador',
        paymentConfirmedAt: now,
        updatedAt: now,
      });

    return res.status(200).json({ status: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('Assembler confirm payment error:', error);
    return res.status(500).json({ error: 'Erro inesperado.' });
  }
}

export default handler;
