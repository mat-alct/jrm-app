import { adminStorage } from '@/services/firebaseAdmin';
import { getSignedReadUrl } from '@/services/projects/storageSignedUrl.server';

const getSignedUrl = jest.fn();
const file = jest.fn(() => ({ getSignedUrl }));

jest.mock('@/services/firebaseAdmin', () => ({
  adminStorage: { bucket: jest.fn() },
}));

describe('services/projects/storageSignedUrl.server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(adminStorage.bucket).mockReturnValue({ file } as never);
    getSignedUrl.mockResolvedValue(['https://signed.test/arquivo.pdf']);
  });

  // Este adapter e a unica fronteira mockada na integracao (PLANO-DE-TESTES.md 14.2),
  // entao o contrato dele com o Admin SDK precisa estar coberto aqui.
  it('assina leitura do arquivo pedido com a expiracao informada', async () => {
    const expiresAtMs = Date.parse('2026-02-01T00:00:00.000Z');

    const url = await getSignedReadUrl(
      'projects/p1/general/doc.pdf',
      expiresAtMs,
    );

    expect(url).toBe('https://signed.test/arquivo.pdf');
    expect(file).toHaveBeenCalledWith('projects/p1/general/doc.pdf');
    expect(getSignedUrl).toHaveBeenCalledWith({
      action: 'read',
      expires: expiresAtMs,
    });
  });

  it('propaga a falha de assinatura em vez de devolver url vazia', async () => {
    getSignedUrl.mockRejectedValue(
      new Error('Could not load the default credentials'),
    );

    await expect(
      getSignedReadUrl('projects/p1/general/doc.pdf', 0),
    ).rejects.toThrow('Could not load the default credentials');
  });
});
