import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve('out');
const TYPES = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.wasm':'application/wasm','.woff2':'font/woff2','.json':'application/json','.task':'application/octet-stream','.txt':'text/plain','.png':'image/png'};

const server = createServer(async (req,res)=>{
  try{
    let p = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, p);
    try { if ((await stat(file)).isDirectory()) file = path.join(file,'index.html'); }
    catch { file = path.join(ROOT, p.replace(/\/$/,'') + '.html'); }
    const body = await readFile(file);
    res.writeHead(200,{'content-type':TYPES[path.extname(file)] ?? 'application/octet-stream'});
    res.end(body);
  }catch{ res.writeHead(404); res.end('nao encontrado'); }
});
await new Promise(r=>server.listen(3455,r));

const results=[]; let fail=0;
const check=(n,c,d='')=>{ if(!c) fail++; results.push(`${c?'OK  ':'FALHA'} ${n}${d?' :: '+d:''}`); };

const raw = await (await fetch('http://127.0.0.1:3455/')).text();
check('HTML estático da home traz a headline', raw.includes('Mais consciente'));
const rawLib = await (await fetch('http://127.0.0.1:3455/exercicios/')).text();
check('HTML estático da biblioteca traz as 23 miniaturas', (rawLib.match(/i\.ytimg\.com/g)??[]).length===23);
const rawPl = await (await fetch('http://127.0.0.1:3455/rotina/')).text();
check('HTML estático do planejador traz o formulário', rawPl.includes('id="altura"'));
check('Sem iframe no export', ![raw,rawLib,rawPl].some(h=>h.includes('<iframe')));

const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const p = await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://127.0.0.1:3455/',{waitUntil:'networkidle'});
await p.getByRole('button',{name:/Agachamento/}).first().click();
await p.getByRole('button',{name:'Ver uma análise de demonstração'}).click();
await p.getByText('ANÁLISE CONCLUÍDA').waitFor({timeout:15000});
check('Análise de demonstração roda no export estático', (await p.getByRole('heading',{level:2}).first().innerText()).includes('4 repetições encontradas'));
await p.getByRole('link',{name:'Exercícios',exact:true}).click();
await p.waitForURL('**/exercicios/**');
check('Navegação funciona entre páginas estáticas', (await p.getByRole('button',{name:/^Ver detalhes de /}).count())===23);
await p.getByRole('link',{name:'Rotina',exact:true}).click();
await p.waitForURL('**/rotina/**');
await p.getByRole('button',{name:'Gerar minha rotina inteligente'}).click();
await p.getByText('Recuperação').first().waitFor();
check('Planejador funciona no export estático', (await p.getByText('Recuperação').count())===4);
check('Sem erro de script no export', errs.length===0, errs[0]??'');
await b.close(); server.close();
console.log(results.join('\n'));
console.log(`\n${results.length-fail}/${results.length} verificações do export estático passaram.`);
process.exit(fail?1:0);
