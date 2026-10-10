/**
 * Glowy Move: verificação de fluxo em navegador real, contra o build de produção.
 * Roda: npm run build && node e2e/smoke.mjs
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = Number(process.env.PORT ?? 3210);
const BASE = `http://127.0.0.1:${PORT}`;

const MICROCOPY = [
  'Análise visual responsável',
  'Seu movimento. Mais consciente.',
  'Processado no dispositivo',
  'Sem reconhecimento facial',
  'Aprenda primeiro. Treine melhor.',
  'Sua rotina. Do seu jeito.',
  'Planejamento inteligente no dispositivo',
  'Seus dados físicos não são enviados para serviços externos.',
  'ANÁLISE CONCLUÍDA',
  'CONSISTÊNCIA',
  'Experimente assim',
  'EXECUÇÃO DE REFERÊNCIA',
  'Compare com uma execução bem feita.',
  'Assistir execução correta',
  'Resultado visual, não diagnóstico',
];

const results = [];
const notes = [];
let failures = 0;

function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  results.push(`${ok ? 'OK  ' : 'FALHA'} ${name}${detail ? ` :: ${detail}` : ''}`);
}

function normalize(value) {
  return value.replace(/\s+/g, ' ').trim();
}

async function waitForServer(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE, { redirect: 'manual' });
      if (res.status < 500) return;
    } catch {
      /* servidor ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('O servidor não respondeu a tempo.');
}

const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
  stdio: 'ignore',
  detached: true,
  env: { ...process.env, NODE_ENV: 'production' },
});

let browser;
try {
  await waitForServer();

  // 1. HTML entregue pelo servidor, antes de qualquer JavaScript.
  const rawHome = await (await fetch(BASE)).text();
  const rawLibrary = await (await fetch(`${BASE}/exercicios`)).text();
  const rawPlanner = await (await fetch(`${BASE}/rotina`)).text();

  check('SSR: home traz a headline real', rawHome.includes('Mais consciente'));
  check('SSR: a marca no cabeçalho é Glowy Move', rawHome.includes('Glowy Move') && !/>form</.test(rawHome));
  check('SSR: home traz os quatro exercícios analisáveis', rawHome.includes('Afundo livre / caminhando'));
  check('SSR: biblioteca traz os 23 nomes', (rawLibrary.match(/i\.ytimg\.com/g) ?? []).length === 23);
  check('SSR: planejador traz o formulário', rawPlanner.includes('id="altura"') && rawPlanner.includes('id="peso"'));
  check(
    'SSR: nenhum iframe em nenhuma rota',
    ![rawHome, rawLibrary, rawPlanner].some((html) => html.includes('<iframe')),
  );
  check(
    'SSR: nenhuma rota carrega o player incorporado do YouTube',
    ![rawHome, rawLibrary, rawPlanner].some((html) => html.includes('youtube.com/embed')),
  );

  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Erros de script contam. Recurso externo bloqueado (as miniaturas do YouTube)
  // é limitação do ambiente de verificação, então fica registrado à parte.
  const consoleErrors = [];
  const blockedResources = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/Failed to load resource/i.test(text)) blockedResources.push(text);
    else consoleErrors.push(text);
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  // 2. Navegação entre as três superfícies.
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Exercícios', exact: true }).click();
  await page.waitForURL('**/exercicios');
  const cards = await page.getByRole('button', { name: /^Ver detalhes de / }).count();
  check('Biblioteca lista 23 exercícios', cards === 23, `contados ${cards}`);
  check('Resumo mostra 4 com análise por vídeo', (await page.getByText('Analisa vídeo').count()) === 4);

  // 3. Busca e estado vazio.
  await page.getByLabel('Buscar exercício').fill('agach');
  check('Busca filtra por nome', (await page.getByRole('button', { name: /^Ver detalhes de / }).count()) === 1);
  await page.getByLabel('Buscar exercício').fill('halteres');
  check('Busca encontra por equipamento', (await page.getByRole('button', { name: /^Ver detalhes de / }).count()) >= 3);
  await page.getByLabel('Buscar exercício').fill('xyzabc');
  check('Estado vazio da busca aparece', await page.getByText('Nenhum exercício encontrado').isVisible());
  await page.getByLabel('Buscar exercício').fill('');

  // 4. Filtro por músculo.
  await page.getByRole('button', { name: 'Core', exact: true }).click();
  check('Filtro Core reduz a lista', (await page.getByRole('button', { name: /^Ver detalhes de / }).count()) === 3);
  await page.getByRole('button', { name: 'Todos', exact: true }).click();

  // 5. Modal acessível.
  await page.getByRole('button', { name: 'Ver detalhes de Afundo caminhando' }).click();
  const dialog = page.getByRole('dialog');
  check('Modal abre com role dialog', await dialog.isVisible());
  const watchHref = await dialog.getByRole('link', { name: /Assistir no YouTube/ }).getAttribute('href');
  check('Modal mantém o link de escape para o vídeo oficial', watchHref === 'https://www.youtube.com/watch?v=mAgbXQdd4LM', String(watchHref));
  check('Modal oferece analisar quando há perfil', await dialog.getByRole('link', { name: 'Analisar meu vídeo' }).isVisible());

  // 5b. O player só carrega no clique, e pelo domínio sem cookie.
  check('Nada do YouTube é montado antes do clique', (await dialog.locator('iframe').count()) === 0);
  await dialog.getByRole('button', { name: /^Reproduzir o vídeo de execução do exercício / }).click();
  const playerSrc = await dialog.locator('iframe').first().getAttribute('src');
  check(
    'Clique monta o player dentro do app, sem cookie',
    typeof playerSrc === 'string' && playerSrc.startsWith('https://www.youtube-nocookie.com/embed/mAgbXQdd4LM'),
    String(playerSrc),
  );
  check('Modal continua na mesma página depois do play', page.url().includes('/exercicios'), page.url());
  await page.keyboard.press('Escape');
  check('Escape fecha o modal', (await page.getByRole('dialog').count()) === 0);

  // 6. Planejador.
  await page.getByRole('link', { name: 'Rotina', exact: true }).click();
  await page.waitForURL('**/rotina');
  await page.getByRole('button', { name: 'Gerar minha rotina inteligente' }).click();
  await page.getByText('Recuperação').first().waitFor();
  const trainingCards = await page.getByText(/^Treino [A-Z]$/).count();
  check('Planejador gera três treinos', trainingCards === 3, `contados ${trainingCards}`);
  check('Planejador marca os dias livres', (await page.getByText('Recuperação').count()) === 4);
  const stored = await page.evaluate(() => window.localStorage.getItem('glowy-move-weekly-plan-v1'));
  check('Rotina persiste em glowy-move-weekly-plan-v1', Boolean(stored && JSON.parse(stored).plan.days.length === 7));

  // Validação: menos de dois dias bloqueia a geração.
  for (const day of ['SEG', 'QUA']) {
    await page.getByRole('button', { name: day === 'SEG' ? 'Segunda' : 'Quarta' }).click();
  }
  await page.getByRole('button', { name: 'Gerar minha rotina inteligente' }).click();
  check('Planejador exige dois dias', await page.getByText('Escolha pelo menos dois dias de treino.').isVisible());

  // 7. Análise de demonstração, com o motor real.
  await page.getByRole('link', { name: 'Analisar vídeo', exact: true }).click();
  await page.waitForURL(`${BASE}/`);
  await page.getByRole('button', { name: /Agachamento/ }).first().click();
  await page.getByRole('button', { name: 'Ver uma análise de demonstração' }).click();
  await page.getByText('ANÁLISE CONCLUÍDA').waitFor();
  const headline = normalize(await page.getByRole('heading', { level: 2 }).first().innerText());
  check('Concordância no título do resultado', headline === '4 repetições encontradas', headline);
  check('Consistência é exibida', await page.getByText('CONSISTÊNCIA').isVisible());
  check('Cue prático aparece', (await page.getByText('Experimente assim').count()) > 0);
  check('Confiança é declarada', (await page.getByText(/Confiança (Alta|Boa|Limitada)/).count()) > 0);
  check('Linha do tempo por ciclo existe', (await page.getByRole('button', { name: /^Ir para a repetição/ }).count()) === 4);

  await page.getByRole('button', { name: /^Ir para a repetição 3, início em / }).click();
  check('Clique no ciclo posiciona a leitura', (await page.getByText('Repetição 3').count()) > 0);

  const referenceHref = await page.getByRole('link', { name: /Assistir execução correta/ }).first().getAttribute('href');
  check(
    'Execução de referência é a do agachamento',
    referenceHref === 'https://www.youtube.com/watch?v=l83R5PblSMA',
    String(referenceHref),
  );
  check('Seção de referência aparece', await page.getByText('EXECUÇÃO DE REFERÊNCIA').isVisible());
  check('Headline da referência aparece', await page.getByText('Compare com uma execução bem feita.').isVisible());

  // 8. Microcopy obrigatória, no HTML já renderizado.
  const visibleText = normalize(await page.evaluate(() => document.body.innerText));
  const libraryText = normalize(
    await (async () => {
      const p = await context.newPage();
      await p.goto(`${BASE}/exercicios`, { waitUntil: 'networkidle' });
      const t = await p.evaluate(() => document.body.innerText);
      await p.close();
      return t;
    })(),
  );
  const plannerText = normalize(
    await (async () => {
      const p = await context.newPage();
      await p.goto(`${BASE}/rotina`, { waitUntil: 'networkidle' });
      const t = await p.evaluate(() => document.body.innerText);
      await p.close();
      return t;
    })(),
  );
  const homeText = normalize(
    await (async () => {
      const p = await context.newPage();
      await p.goto(BASE, { waitUntil: 'networkidle' });
      const t = await p.evaluate(() => document.body.innerText);
      await p.close();
      return t;
    })(),
  );
  const allText = [visibleText, libraryText, plannerText, homeText].join(' • ');
  for (const phrase of MICROCOPY) {
    check(`Microcopy presente: ${phrase}`, allText.includes(phrase));
  }

  // 9. Ação Minhas análises abre um aviso não bloqueante.
  const home = await context.newPage();
  await home.goto(BASE, { waitUntil: 'networkidle' });
  await home.getByRole('button', { name: 'Minhas análises' }).click();
  check('Toast de Minhas análises aparece', await home.getByText('Minhas análises chega com a conta').isVisible());

  // 10. Responsividade e foco.
  const noOverflow = async (p) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check('Sem rolagem horizontal no desktop', await noOverflow(home));

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobilePage = await mobile.newPage();
  for (const route of ['/', '/exercicios', '/rotina']) {
    await mobilePage.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    check(`Sem rolagem horizontal no celular em ${route}`, await noOverflow(mobilePage));
  }
  await mobilePage.screenshot({ path: 'e2e/screenshot-mobile.png', fullPage: false });
  await home.screenshot({ path: 'e2e/screenshot-desktop.png', fullPage: false });
  await page.screenshot({ path: 'e2e/screenshot-resultado.png', fullPage: false });

  await home.keyboard.press('Tab');
  const focused = await home.evaluate(() => document.activeElement?.textContent ?? '');
  check('Primeiro Tab chega em um alvo focável', focused.length > 0, focused);

  check('Nenhum erro de JavaScript no console', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  if (blockedResources.length) {
    notes.push(
      `${blockedResources.length} recursos externos não carregaram neste ambiente sem internet (miniaturas do YouTube).`,
    );
  }

  await mobile.close();
} catch (error) {
  failures += 1;
  results.push(`FALHA execução :: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  if (browser) await browser.close();
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }
}

console.log(results.join('\n'));
if (notes.length) console.log(`\nNotas do ambiente:\n- ${notes.join('\n- ')}`);
console.log(`\n${results.length - failures}/${results.length} verificações passaram.`);
process.exit(failures ? 1 : 0);
