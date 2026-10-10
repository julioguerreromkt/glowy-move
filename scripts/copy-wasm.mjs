// Copia os binários WASM do @mediapipe/tasks-vision para public/mediapipe.
// Assim o runtime de visão é servido pelo próprio domínio da aplicação:
// nada de CDN de terceiro para o motor que processa o vídeo.
import { cp, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const to = path.join(root, 'public', 'mediapipe');

if (!existsSync(from)) {
  console.warn('[copy-wasm] pasta wasm do @mediapipe/tasks-vision não encontrada. Rode npm install.');
  process.exit(0);
}

await mkdir(to, { recursive: true });
await cp(from, to, { recursive: true });
const files = await readdir(to);
console.log(`[copy-wasm] ${files.length} arquivos copiados para public/mediapipe`);
