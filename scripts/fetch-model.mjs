// Baixa o modelo pose_landmarker_lite para public/models.
// Opcional: sem ele a aplicação busca o modelo na CDN oficial do MediaPipe
// no primeiro uso. Rodar este script deixa a aplicação 100% self-hosted.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'public', 'models', 'pose_landmarker_lite.task');

const res = await fetch(MODEL_URL);
if (!res.ok) {
  console.error(`[fetch-model] falhou: HTTP ${res.status}. A aplicação seguirá usando a CDN oficial.`);
  process.exit(1);
}
const buffer = Buffer.from(await res.arrayBuffer());
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, buffer);
console.log(`[fetch-model] modelo salvo em public/models (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
