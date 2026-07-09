import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/client-access/provision', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        publicId: 'cliente-e2e',
        accessCode: '123456',
      }),
    });
  });
});

test('lista projetos e filtra por cliente sem depender do Firebase real', async ({
  page,
}) => {
  await page.goto('/projetos');

  await expect(page.getByText('Projetos').first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Cliente Alpha' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Cliente Beta' })).toBeVisible();

  await page.getByPlaceholder('Buscar por cliente...').fill('Alpha');
  await page.getByRole('button', { name: 'Buscar' }).click();

  await expect(page.getByRole('cell', { name: 'Cliente Alpha' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Cliente Beta' })).toBeHidden();

  await page.getByPlaceholder('Buscar por cliente...').fill('Inexistente');
  await page.getByRole('button', { name: 'Buscar' }).click();

  await expect(page.getByText('Nenhum projeto encontrado.')).toBeVisible();
});

test('cria projeto com mais de um item e abre o detalhe criado', async ({
  page,
}) => {
  await page.goto('/projetos/novo');

  await page.getByLabel('Nome do cliente').fill('Cliente Playwright');
  await page.getByLabel('Telefone').fill('(11) 98888-7777');
  await page.getByLabel('E-mail').fill('cliente.playwright@example.com');
  await page.getByLabel('Endereço').fill('Rua Playwright, 456');

  await page.locator('input[name="items.0.name"]').fill('Balcao gourmet');
  await page.locator('input[name="items.0.environment"]').fill('Varanda');
  await page.locator('input[name="items.0.material"]').fill('MDF cinza');
  await page.locator('input[name="items.0.description"]').fill('Com portas');
  await page.locator('input[name="items.0.notes"]').fill('Medir no local');

  await page.getByRole('button', { name: 'Adicionar item' }).click();
  await page.locator('input[name="items.1.name"]').fill('Cristaleira');
  await page.locator('input[name="items.1.environment"]').fill('Sala');

  await page.getByRole('button', { name: 'Criar projeto' }).click();

  await expect(page).toHaveURL(/\/projetos\/e2e-created-project-1$/);
  await expect(page.getByText('Cliente Playwright').first()).toBeVisible();
  await expect(page.getByText('(11) 98888-7777')).toBeVisible();
  await expect(page.getByText('cliente.playwright@example.com')).toBeVisible();
  await expect(page.getByText('Rua Playwright, 456')).toBeVisible();
  await expect(page.getByText('Balcao gourmet')).toBeVisible();
  await expect(page.getByText('Cristaleira')).toBeVisible();
});

test('exibe validações obrigatórias no cadastro de projeto', async ({ page }) => {
  await page.goto('/projetos/novo');

  await page.getByRole('button', { name: 'Criar projeto' }).click();

  await expect(page.getByText('Nome do cliente é obrigatório')).toBeVisible();
  await expect(page.getByText('Telefone é obrigatório')).toBeVisible();
  await expect(page.getByText('E-mail é obrigatório')).toBeVisible();
  await expect(page.getByText('Endereço é obrigatório')).toBeVisible();
  await expect(page.getByText('Nome do item é obrigatório')).toBeVisible();
  await expect(page.getByText('Ambiente é obrigatório')).toBeVisible();
});

test('abre detalhe do projeto e gera acesso do cliente via API interceptada', async ({
  page,
}) => {
  await page.goto('/projetos/e2e-projeto-alpha');

  await expect(page.getByText('Cliente Alpha').first()).toBeVisible();
  await expect(page.getByText('Cozinha planejada')).toBeVisible();
  await expect(page.getByText('Armario da suite')).toBeVisible();
  await expect(page.getByText('Nenhum anexo disponível.')).toBeVisible();

  await page.getByRole('button', { name: 'Gerar senha' }).click();

  await expect(page.getByText(/\/cliente\/cliente-e2e/)).toBeVisible();
  await expect(page.getByText('123456')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar link' })).toBeVisible();
});

test('abre item e altera status registrando histórico', async ({ page }) => {
  await page.goto('/projetos/e2e-projeto-alpha/itens/e2e-item-cozinha');

  await expect(page.getByText('Cozinha planejada').first()).toBeVisible();
  await expect(page.getByText('Ambiente: Cozinha')).toBeVisible();
  await expect(page.getByText('Projeto criado')).toBeVisible();
  await expect(
    page.getByText('Nenhuma alteração de status registrada ainda.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Aguardando desenho' }).click();

  await expect(page.getByText('Aguardando desenho').first()).toBeVisible();
  await expect(page.getByText('Admin E2E · Administrador')).toBeVisible();
});

test('exibe dashboard de projetos com filtros administrativos', async ({ page }) => {
  await page.goto('/projetos/dashboard');

  await expect(page.getByText('Dashboard de Projetos').first()).toBeVisible();
  await expect(page.getByText('Projetos em aberto')).toBeVisible();
  await expect(page.getByText('Itens atrasados')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Cliente Alpha' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Lavanderia compacta' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Cliente Beta' })).toBeVisible();

  await page.getByPlaceholder('Buscar cliente...').fill('Beta');

  await expect(page.getByRole('cell', { name: 'Cliente Beta' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Cliente Alpha' })).toBeHidden();

  await page.locator('select').nth(2).selectOption('aguardando_orcamento');
  await expect(page.getByText('Nenhum item atrasado.')).toBeVisible();
});

test('envia e lista anexo de projeto pela UI', async ({ page }) => {
  await page.goto('/projetos/e2e-projeto-alpha');

  await page.getByPlaceholder('Ex: fotos do ambiente').fill('contrato');
  await page.locator('select').selectOption('client');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'contrato-e2e.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('arquivo e2e'),
  });
  await page.getByRole('button', { name: 'Enviar' }).click();

  await expect(page.getByText('contrato', { exact: true })).toBeVisible();
  await expect(page.getByText('contrato-e2e.pdf')).toBeVisible();
  await expect(page.getByText('client', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Baixar' })).toBeVisible();
});

test('salva orçamento e envia item para aprovação do cliente', async ({ page }) => {
  await page.goto('/projetos/e2e-projeto-alpha/itens/e2e-item-orcamento');

  await expect(page.getByText('Lavanderia compacta').first()).toBeVisible();
  await expect(page.getByText('Aguardando orçamento').first()).toBeVisible();

  await page.locator('input[name="lines.0.description"]').fill('Ferragens');
  await page.locator('input[name="lines.0.amount"]').fill('320');
  await page.getByLabel('Valor cobrado do cliente').fill('900');
  await page.getByLabel('Sugestão de valor para o montador').fill('260');
  await expect(page.getByText('Custo total: 320.00')).toBeVisible();

  await page.getByRole('button', { name: 'Salvar orçamento' }).click();
  await expect(page.getByText('Orçamento salvo.')).toBeVisible();

  await page.getByRole('button', { name: 'Enviar orçamento ao cliente' }).click();
  await expect(page.getByText('Aguardando aprovação do cliente').first()).toBeVisible();
  await expect(page.getByText('Orçamento enviado ao cliente.')).toBeVisible();
});

test('atribui desenhista ao item e calcula prazo', async ({ page }) => {
  await page.goto('/projetos/e2e-projeto-alpha/itens/e2e-item-cozinha');

  await page.getByRole('button', { name: 'Atribuir desenhista' }).click();
  const dialog = page.getByRole('dialog', { name: 'Atribuir desenhista' });
  await expect(dialog).toBeVisible();
  await dialog.locator('select').selectOption('e2e-designer');
  await expect(dialog.locator('input[type="date"]')).not.toHaveValue('');
  await dialog.getByRole('button', { name: 'Atribuir' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText('Desenhista: Desenhista E2E')).toBeVisible();
  await expect(page.getByText('Aguardando desenho').first()).toBeVisible();
});

test('atribui montador e lista a atribuição no item', async ({ page }) => {
  await page.goto('/projetos/e2e-projeto-beta/itens/e2e-item-painel');

  await expect(page.getByText('Painel ripado').first()).toBeVisible();
  await expect(page.getByText('Aguardando atribuição de montador').first()).toBeVisible();

  await page.getByRole('button', { name: 'Atribuir montador' }).click();
  await page.getByLabel('Valor a receber').fill('321');
  await page.getByRole('button', { name: 'Salvar atribuições' }).click();

  await expect(page.getByText('Montador E2E')).toBeVisible();
  await expect(page.getByText('R$ 321,00')).toBeVisible();
  await expect(page.getByText('Em produção').first()).toBeVisible();
});
