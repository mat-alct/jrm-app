import './testEnv';

import { expect, loginAs, test } from './fixtures';

const PDF_FIXTURE = {
  name: 'contrato-e2e.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 conteudo de teste e2e'),
};

test.describe('jornada Via A — operação interna', () => {
  test('cria projeto, anexa arquivo real, atribui desenhista, orça e gera acesso do cliente', async ({
    page,
    adminDb,
    adminStorage,
  }) => {
    await loginAs(page, 'admin');

    // ---------- 1. cria o cadastro basico do cliente ----------
    await page.goto('/projetos/novo');
    await page.getByLabel('Nome do cliente').fill('Cliente Playwright');
    await page.getByLabel('Telefone').fill('(24) 98888-7777');

    await page.getByRole('button', { name: 'Criar projeto' }).click();

    // `/projetos/novo` também casaria com /projetos/<algo>: exigimos outro segmento.
    await expect(page).toHaveURL(/\/projetos\/(?!novo$)[^/]+$/);
    const projectId = page.url().split('/').pop()!;
    await expect(page.getByText('Cliente Playwright').first()).toBeVisible();

    // Verificação dupla: documento no path certo, sem e-mail/endereço.
    const projectSnap = await adminDb.doc(`projects/${projectId}`).get();
    expect(projectSnap.exists).toBe(true);
    expect(projectSnap.data()).toMatchObject({ customerName: 'Cliente Playwright' });
    expect(projectSnap.data()).not.toHaveProperty('customerEmail');
    expect(projectSnap.data()?.itemSummary).toMatchObject({ total: 0 });

    // ---------- 1b. completa e-mail/endereço e adiciona 2 itens no detalhe ----------
    await page.getByRole('button', { name: 'Editar' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Editar dados do cliente' });
    await editDialog.getByLabel('E-mail').fill('cliente.playwright@example.com');
    await editDialog.getByLabel('Endereço').fill('Rua Playwright, 456');
    await editDialog.getByRole('button', { name: 'Salvar' }).click();
    await expect(editDialog).toBeHidden();
    await expect(page.getByText('cliente.playwright@example.com')).toBeVisible();

    await page.getByRole('button', { name: 'Adicionar item' }).click();
    const addItemDialog1 = page.getByRole('dialog', { name: 'Adicionar item' });
    await addItemDialog1.getByLabel('Nome do item').fill('Balcao gourmet');
    await addItemDialog1.getByLabel('Ambiente').fill('Varanda');
    await addItemDialog1.getByRole('button', { name: 'Adicionar' }).click();
    await expect(addItemDialog1).toBeHidden();
    await expect(page.getByText('Balcao gourmet')).toBeVisible();

    await page.getByRole('button', { name: 'Adicionar item' }).click();
    const addItemDialog2 = page.getByRole('dialog', { name: 'Adicionar item' });
    await addItemDialog2.getByLabel('Nome do item').fill('Cristaleira');
    await addItemDialog2.getByLabel('Ambiente').fill('Sala');
    await addItemDialog2.getByRole('button', { name: 'Adicionar' }).click();
    await expect(addItemDialog2).toBeHidden();
    await expect(page.getByText('Cristaleira')).toBeVisible();

    const projectSnapAfterItems = await adminDb.doc(`projects/${projectId}`).get();
    expect(projectSnapAfterItems.data()).toMatchObject({
      customerEmail: 'cliente.playwright@example.com',
      customerAddress: 'Rua Playwright, 456',
    });
    expect(projectSnapAfterItems.data()?.itemSummary).toMatchObject({ total: 2 });

    const itemsSnap = await adminDb.collection(`projects/${projectId}/items`).get();
    expect(itemsSnap.size).toBe(2);
    const itemsByName = new Map(
      itemsSnap.docs.map(doc => [doc.data().name as string, doc]),
    );
    expect([...itemsByName.keys()].sort()).toEqual(['Balcao gourmet', 'Cristaleira']);

    // ---------- 2. upload de anexo geral (o passo que faltou no bug do Storage) ----------
    await page.getByPlaceholder('Ex: fotos do ambiente').fill('contrato');
    await page.locator('select').first().selectOption('client');
    await page.locator('input[type="file"]').setInputFiles(PDF_FIXTURE);
    await page.getByRole('button', { name: 'Enviar' }).click();

    await expect(page.getByText('contrato-e2e.pdf')).toBeVisible();
    const downloadLink = page.getByRole('link', { name: 'Baixar' });
    await expect(downloadLink).toBeVisible();

    // Verificação dupla (a): doc de attachment na subcoleção certa.
    const attachmentsSnap = await adminDb
      .collection(`projects/${projectId}/attachments`)
      .get();
    expect(attachmentsSnap.size).toBe(1);
    const attachment = attachmentsSnap.docs[0].data();
    expect(attachment).toMatchObject({
      originalFileName: 'contrato-e2e.pdf',
      visibility: 'client',
      category: 'contrato',
    });

    // Verificação dupla (b): o objeto existe no Storage e tem bytes > 0.
    const storagePath = attachment.storagePath as string;
    expect(storagePath).toContain(`projects/${projectId}/general/`);
    const [fileExists] = await adminStorage.bucket().file(storagePath).exists();
    expect(fileExists).toBe(true);
    const [contents] = await adminStorage.bucket().file(storagePath).download();
    expect(contents.byteLength).toBeGreaterThan(0);

    // Verificação dupla (c): o downloadUrl exposto na UI responde 200.
    const downloadUrl = await downloadLink.getAttribute('href');
    expect(downloadUrl).toBeTruthy();
    const response = await page.request.get(downloadUrl!);
    expect(response.status()).toBe(200);
    expect((await response.body()).byteLength).toBeGreaterThan(0);

    // ---------- 3. atribui desenhista (prazo automático) ----------
    const balcaoId = itemsByName.get('Balcao gourmet')!.id;
    await page.goto(`/projetos/${projectId}/itens/${balcaoId}`);

    await page.getByRole('button', { name: 'Atribuir desenhista' }).click();
    const dialog = page.getByRole('dialog', { name: 'Atribuir desenhista' });
    await expect(dialog).toBeVisible();
    await dialog.locator('select').selectOption('seed-designer');
    await expect(dialog.locator('input[type="date"]')).not.toHaveValue('');
    await dialog.getByRole('button', { name: 'Atribuir' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Desenhista: Desenhista Seed')).toBeVisible();
    await expect(page.getByText('Aguardando desenho').first()).toBeVisible();

    const afterAssign = await adminDb
      .doc(`projects/${projectId}/items/${balcaoId}`)
      .get();
    expect(afterAssign.data()).toMatchObject({
      designerId: 'seed-designer',
      status: 'aguardando_desenho',
    });
    expect(afterAssign.data()?.deadlineCurrent).toBeDefined();

    const historySnap = await adminDb
      .collection(`projects/${projectId}/items/${balcaoId}/statusHistory`)
      .get();
    expect(historySnap.size).toBe(1);
    expect(historySnap.docs[0].data()).toMatchObject({
      toStatus: 'aguardando_desenho',
      changedByRole: 'admin',
    });
  });

  test('desenhista envia versão do item e o admin lança o orçamento', async ({
    page,
    adminDb,
    adminStorage,
  }) => {
    const projectId = 'seed-project-1';
    // seed-item-1 já está com designerId = seed-designer.
    const itemId = 'seed-item-1';

    // Coloca o item no estágio de desenho, como no fluxo real.
    await adminDb
      .doc(`projects/${projectId}/items/${itemId}`)
      .update({ status: 'aguardando_desenho' });

    // ---------- 4. desenhista vê a fila e envia a versão ----------
    await loginAs(page, 'designer');
    await expect(page.getByText('Minha Fila').first()).toBeVisible();
    await expect(page.getByText('Cozinha planejada')).toBeVisible();

    await page.goto(`/projetos/${projectId}/itens/${itemId}`);

    // A página do item tem dois inputs de arquivo (versão do desenhista e anexo
    // geral): escopamos pelo rótulo do painel, que é irmão do input.
    const versionFileInput = page
      .getByText('Arquivos da versão', { exact: true })
      .locator('..')
      .locator('input[type="file"]');
    await versionFileInput.setInputFiles({
      name: 'desenho-v1.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF desenho'),
    });
    await page.getByPlaceholder('Descrição da versão (opcional)').fill('Versão 1');
    await page.getByRole('button', { name: 'Enviar versão' }).click();

    await expect(page.getByText('Versão enviada.')).toBeVisible();

    // Verificação dupla: versão gravada e arquivo no Storage.
    const versionsSnap = await adminDb
      .collection(`projects/${projectId}/items/${itemId}/versions`)
      .get();
    expect(versionsSnap.size).toBe(1);

    const versionAttachments = await adminDb
      .collection(`projects/${projectId}/items/${itemId}/attachments`)
      .get();
    expect(versionAttachments.size).toBeGreaterThan(0);
    const storagePath = versionAttachments.docs[0].data().storagePath as string;
    const [exists] = await adminStorage.bucket().file(storagePath).exists();
    expect(exists).toBe(true);

    const afterUpload = await adminDb.doc(`projects/${projectId}/items/${itemId}`).get();
    expect(afterUpload.data()?.status).toBe('aguardando_orcamento');

    // ---------- 5. admin lança o orçamento e envia ao cliente ----------
    await loginAs(page, 'admin');
    await page.goto(`/projetos/${projectId}/itens/${itemId}`);

    await page.locator('input[name="lines.0.description"]').fill('Ferragens');
    await page.locator('input[name="lines.0.amount"]').fill('320');
    await page.getByLabel('Valor cobrado do cliente').fill('900');
    await page.getByLabel('Sugestão de valor para o montador').fill('260');
    await page.getByRole('button', { name: 'Salvar orçamento' }).click();
    await expect(page.getByText('Orçamento salvo.')).toBeVisible();

    await page.getByRole('button', { name: 'Enviar orçamento ao cliente' }).click();
    await expect(page.getByText('Orçamento enviado ao cliente.')).toBeVisible();

    // A escrita no Firestore é assíncrona em relação ao toast: poll em vez de espera fixa.
    await expect
      .poll(async () => {
        const snap = await adminDb.doc(`projects/${projectId}/items/${itemId}`).get();
        return snap.data()?.status;
      })
      .toBe('aguardando_aprovacao_cliente');

    const afterBudget = await adminDb.doc(`projects/${projectId}/items/${itemId}`).get();
    expect(afterBudget.data()?.budget).toMatchObject({
      totalCost: 320,
      customerAmount: 900,
    });

    // ---------- 6. gera acesso do cliente ----------
    await page.goto(`/projetos/${projectId}`);
    await page.getByRole('button', { name: /Gerar senha|Regenerar senha/ }).click();

    await expect(page.getByRole('button', { name: 'Copiar link' })).toBeVisible();
    await expect(page.getByText(/\/cliente\//)).toBeVisible();

    const projectAfter = await adminDb.doc(`projects/${projectId}`).get();
    expect(projectAfter.data()?.clientAccessCodeHash).toBeTruthy();
    expect(projectAfter.data()?.clientAccessPublicId).toMatch(/^[0-9A-Za-z]{12}$/);
  });
});
