/**
 * Glowy Move — verificação da Onda 1 contra o export estático (out/).
 * Roda: npm run build:static && node e2e/onda1.mjs
 *
 * Cobre o critério de pronto: carregar um plano, executar o treino do dia pela
 * tela guiada com carga pré-preenchida e timer, cada série grava local, PR ao
 * vivo, e tudo funciona offline como app instalado.
 *
 * Screenshots vão para e2e/screenshot-onda1-*.png (ignorados pelo git) ou para
 * SHOT_DIR quando definido.
 */
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve('out');
const SHOT_DIR = process.env.SHOT_DIR ?? path.resolve('e2e');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.json': 'application/json',
  '.txt': 'text/plain', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, p);
    try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); }
    catch { file = path.join(ROOT, p.replace(/\/$/, '') + '.html'); }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nao encontrado'); }
});
await new Promise((r) => server.listen(3466, r));
await mkdir(SHOT_DIR, { recursive: true });

const BASE = 'http://127.0.0.1:3466';
const results = [];
let fail = 0;
const check = (name, cond, detail = '') => { if (!cond) fail += 1; results.push(`${cond ? 'OK  ' : 'FALHA'} ${name}${detail ? ' :: ' + detail : ''}`); };
const shot = (page, name) => page.screenshot({ path: path.join(SHOT_DIR, `screenshot-onda1-${name}.png`), fullPage: true });

const TODAY_KEY = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'][new Date().getDay()];
const TODAY_LABEL = { SEG: 'Segunda', TER: 'Terça', QUA: 'Quarta', QUI: 'Quinta', SEX: 'Sexta', SAB: 'Sábado', DOM: 'Domingo' }[TODAY_KEY];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1180, height: 1500 } });
const page = await context.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));

// 1. Planos prontos (Entrega 2): carregar PPL como rotina.
await page.goto(`${BASE}/rotina/`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.ready);
check('Seção "Planos prontos" aparece no planejador', (await page.getByText('Planos prontos').count()) >= 1);
await page.getByRole('button', { name: /Push \/ Pull \/ Legs/ }).click();
await page.getByText('Carregado na rotina').first().waitFor();
check('PPL carrega como rotina editável', (await page.getByText('Carregado na rotina').count()) === 1);
await shot(page, 'planos-prontos');

// 2. Gera uma rotina que inclui hoje, para o treino guiado ter sessão hoje.
const todayBtn = page.getByRole('button', { name: TODAY_LABEL, exact: true });
if ((await todayBtn.getAttribute('aria-pressed')) === 'false') await todayBtn.click();
await page.getByRole('button', { name: 'Gerar minha rotina inteligente' }).click();
await page.getByText('Semana montada').waitFor();

// SW passa a controlar após um reload; aí o cache dos assets é populado.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(() => !!navigator.serviceWorker.controller);

// 3. Treino guiado (Entrega 3).
await page.getByRole('link', { name: 'Treino', exact: true }).click();
await page.waitForURL('**/treino/**');
check('Tela guiada abre em sessão ativa hoje', (await page.getByText('Treino guiado').count()) >= 1, `hoje=${TODAY_KEY}`);

const carga = page.locator('#g-carga');
check('Carga vem vazia na primeira vez (sem registro anterior)', (await carga.inputValue()) === '');
const alvoTexto = await page.getByRole('button', { name: /Registrar série/ }).innerText();
const alvo = Number(alvoTexto.match(/\/(\d+)/)?.[1] ?? '1');

await carga.fill('40');
await page.locator('#g-reps').fill('10');
await page.getByRole('button', { name: /Registrar série/ }).click();
check('PR aparece ao vivo no primeiro registro', (await page.getByText('Novo recorde').count()) >= 1);
check('Timer de descanso aparece após registrar', (await page.getByText('Descanso entre séries').count()) === 1);
check('Carga fica pré-preenchida para a próxima série', (await carga.inputValue()) === '40');
await shot(page, 'guiado-ativo');

// completa o restante das séries do primeiro exercício
for (let i = 1; i < alvo; i += 1) {
  await page.getByRole('button', { name: /Registrar série/ }).click();
}
check('Botão de avançar aparece ao bater a meta de séries', (await page.getByRole('button', { name: /Próximo exercício|Finalizar treino/ }).count()) >= 1);

// 4. Grava local: confere o set-log no localStorage.
const stored = await page.evaluate(() => window.localStorage.getItem('glowy-move-set-log-v1'));
const parsed = stored ? JSON.parse(stored) : { sets: [] };
check('Cada série gravou no armazenamento local', parsed.sets.length === alvo, `${parsed.sets.length} séries`);
check('PR = maior carga registrada bate com o gravado', Math.max(...parsed.sets.map((s) => s.weightKg)) === 40);

// 5. Registro (Entrega 1): histórico mostra as séries.
await page.getByRole('link', { name: 'Registro', exact: true }).click();
await page.waitForURL('**/registro/**');
check('Histórico mostra as séries registradas', (await page.getByText(/séries registradas|série registrada/).count()) >= 1);
await shot(page, 'registro');

// 6. PWA offline (Entrega 4): sem rede, o app ainda abre.
// Visita /treino/ como navegação real (online) para o SW cachear o documento.
await page.goto(`${BASE}/treino/`, { waitUntil: 'networkidle' });
await context.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
const headerOffline = await page.getByRole('link', { name: /Glowy Move/ }).count();
const guidedOffline = await page.getByText('Treino guiado').count();
check('Treino guiado abre offline (service worker serve do cache)', headerOffline >= 1 && guidedOffline >= 1);
await shot(page, 'offline');
await context.setOffline(false);

check('Sem erro de script em todo o fluxo', errs.length === 0, errs[0] ?? '');

await browser.close();
server.close();
console.log(results.join('\n'));
console.log(`\n${results.length - fail}/${results.length} verificações da Onda 1 passaram.`);
process.exit(fail ? 1 : 0);
