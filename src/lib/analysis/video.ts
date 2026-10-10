import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS } from './constants';
import { AnalysisError } from './types';

export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/*'];
const ACCEPTED_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v'];

export function isAcceptedVideo(file: { name: string; type: string }): boolean {
  if (file.type.startsWith('video/')) return true;
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1).replace('.', ',')} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatSeconds(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0,0 s';
  return `${value.toFixed(1).replace('.', ',')} s`;
}

export function validateFile(file: { name: string; type: string; size: number }): void {
  if (!isAcceptedVideo(file)) {
    throw new AnalysisError(
      'ARQUIVO_INVALIDO',
      'Esse arquivo não é um vídeo compatível.',
      'Envie um arquivo MP4, MOV ou WebM gravado pelo celular ou pela câmera.',
    );
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new AnalysisError(
      'ARQUIVO_GRANDE',
      `Este vídeo tem ${formatBytes(file.size)} e o limite é 250 MB.`,
      'Grave um trecho mais curto ou reduza a resolução antes de enviar.',
    );
  }
}

export function validateDuration(seconds: number): void {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new AnalysisError(
      'ARQUIVO_INVALIDO',
      'Não consegui ler a duração deste vídeo.',
      'Tente exportar o vídeo novamente em MP4 e enviar de novo.',
    );
  }
  if (seconds > MAX_VIDEO_SECONDS) {
    throw new AnalysisError(
      'VIDEO_LONGO',
      `Este vídeo tem ${formatSeconds(seconds)} e o limite é 45 segundos.`,
      'Corte o trecho com as repetições que você quer revisar e envie só ele.',
    );
  }
}

/** Lê metadados do vídeo localmente, sem upload. */
export function readVideoMetadata(url: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };
    video.onloadedmetadata = () => {
      const data = {
        duration: video.duration,
        width: video.videoWidth || 16,
        height: video.videoHeight || 9,
      };
      cleanup();
      resolve(data);
    };
    video.onerror = () => {
      cleanup();
      reject(
        new AnalysisError(
          'ARQUIVO_INVALIDO',
          'Não consegui abrir este vídeo no navegador.',
          'Tente exportar em MP4 (H.264) e enviar de novo.',
        ),
      );
    };
    video.src = url;
  });
}

export function supportsPoseAnalysis(): boolean {
  if (typeof window === 'undefined') return false;
  const hasWasm = typeof WebAssembly === 'object';
  const hasCanvas = typeof document !== 'undefined' && !!document.createElement('canvas').getContext('2d');
  const hasVideo = typeof HTMLVideoElement !== 'undefined';
  return hasWasm && hasCanvas && hasVideo;
}
