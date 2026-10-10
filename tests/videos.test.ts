import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXERCISE_CATALOG, youtubeThumbnail, youtubeWatchUrl } from '@/lib/catalog';

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const sourceFiles = walk(path.join(process.cwd(), 'src'));

describe('vídeos externos', () => {
  it('aponta todos os 23 registros para uma página oficial do YouTube', () => {
    for (const exercise of EXERCISE_CATALOG) {
      expect(exercise.videoUrl).toBe(`https://www.youtube.com/watch?v=${exercise.videoId}`);
      expect(exercise.videoUrl).toBe(youtubeWatchUrl(exercise.videoId));
      expect(exercise.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
    }
  });

  it('monta a miniatura a partir do mesmo identificador', () => {
    for (const exercise of EXERCISE_CATALOG) {
      expect(youtubeThumbnail(exercise.videoId)).toBe(`https://i.ytimg.com/vi/${exercise.videoId}/hqdefault.jpg`);
    }
  });

  it('concentra o único iframe no player sob demanda', () => {
    const comIframe = sourceFiles.filter((file) => /<iframe|\/embed\//i.test(fs.readFileSync(file, 'utf8')));
    expect(comIframe.map((file) => path.basename(file))).toEqual(['video-player.tsx']);
  });

  it('usa o domínio sem cookie e só monta o player no clique', () => {
    const player = fs.readFileSync(path.join(process.cwd(), 'src/components/video-player.tsx'), 'utf8');
    expect(player).toContain('https://www.youtube-nocookie.com/embed/');
    expect(player).not.toMatch(/src=\{`https:\/\/www\.youtube\.com\/embed/);
    // O iframe fica atrás do estado: nada sai para o YouTube antes do clique.
    expect(player).toContain('{ativo ? (');
    expect(player).toContain("useState(false)");
  });

  it('abre os vídeos em nova aba com rel seguro', () => {
    const withTargetBlank = sourceFiles.filter((file) => fs.readFileSync(file, 'utf8').includes('target="_blank"'));
    expect(withTargetBlank.length).toBeGreaterThan(0);
    for (const file of withTargetBlank) {
      const content = fs.readFileSync(file, 'utf8');
      const targets = content.match(/target="_blank"/g) ?? [];
      const rels = content.match(/rel="noopener noreferrer"/g) ?? [];
      expect(rels.length).toBe(targets.length);
    }
  });

  it('carrega as miniaturas de forma preguiçosa e com dimensões declaradas', () => {
    const withThumbnails = sourceFiles.filter((file) => fs.readFileSync(file, 'utf8').includes('youtubeThumbnail('));
    expect(withThumbnails.length).toBeGreaterThan(0);
    for (const file of withThumbnails) {
      const content = fs.readFileSync(file, 'utf8');
      if (!content.includes('<img')) continue;
      expect(content).toContain('loading="lazy"');
      expect(content).toMatch(/width=\{\d+\}/);
      expect(content).toMatch(/height=\{\d+\}/);
      expect(content).toMatch(/alt=/);
    }
  });
});
