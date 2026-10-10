import { POSE_LANDMARKER_OPTIONS, SAMPLE_FPS } from './constants';
import { AnalysisError, type PoseFrame } from './types';

const LOCAL_MODEL = '/models/pose_landmarker_lite.task';
const CDN_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export type ProgressStage = 'modelo' | 'articulacoes' | 'ciclos' | 'recomendacoes';

export interface ProgressUpdate {
  stage: ProgressStage;
  message: string;
  /** 0 a 1. */
  ratio: number;
}

export const PROGRESS_MESSAGES: Record<ProgressStage, string> = {
  modelo: 'Carregando o modelo de pose no seu dispositivo',
  articulacoes: 'Mapeando as articulações quadro a quadro',
  ciclos: 'Identificando as repetições ou passadas',
  recomendacoes: 'Organizando as recomendações',
};

async function resolveModelPath(): Promise<string> {
  try {
    const res = await fetch(LOCAL_MODEL, { method: 'HEAD' });
    if (res.ok) return LOCAL_MODEL;
  } catch {
    /* sem cópia local: usa a CDN oficial do MediaPipe */
  }
  return CDN_MODEL;
}

function waitForSeek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      reject(new AnalysisError('FALHA_PROCESSAMENTO', 'O navegador não conseguiu percorrer o vídeo.'));
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = time;
  });
}

export interface SampleOptions {
  video: HTMLVideoElement;
  durationSec: number;
  onProgress?: (update: ProgressUpdate) => void;
  signal?: { aborted: boolean };
}

/**
 * Percorre o vídeo a 10 quadros por segundo e devolve os pontos da pose.
 * Todo o processamento acontece no dispositivo: nada é enviado a servidor.
 */
export async function samplePoseFrames({
  video,
  durationSec,
  onProgress,
  signal,
}: SampleOptions): Promise<PoseFrame[]> {
  onProgress?.({ stage: 'modelo', message: PROGRESS_MESSAGES.modelo, ratio: 0.02 });

  let vision: typeof import('@mediapipe/tasks-vision');
  try {
    vision = await import('@mediapipe/tasks-vision');
  } catch {
    throw new AnalysisError(
      'NAVEGADOR_INCOMPATIVEL',
      'Este navegador não conseguiu carregar o motor de análise.',
      'Use a versão mais recente do Chrome, Edge, Firefox ou Safari em um dispositivo com WebAssembly.',
    );
  }

  const { FilesetResolver, PoseLandmarker } = vision;

  let fileset;
  try {
    fileset = await FilesetResolver.forVisionTasks('/mediapipe');
  } catch {
    throw new AnalysisError(
      'NAVEGADOR_INCOMPATIVEL',
      'Não consegui iniciar o runtime de visão neste navegador.',
      'Verifique se o navegador está atualizado e se WebAssembly está habilitado.',
    );
  }

  const modelAssetPath = await resolveModelPath();

  let landmarker: import('@mediapipe/tasks-vision').PoseLandmarker | null = null;
  try {
    landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath, delegate: 'GPU' },
      runningMode: 'VIDEO',
      ...POSE_LANDMARKER_OPTIONS,
    });
  } catch {
    try {
      landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate: 'CPU' },
        runningMode: 'VIDEO',
        ...POSE_LANDMARKER_OPTIONS,
      });
    } catch {
      throw new AnalysisError(
        'NAVEGADOR_INCOMPATIVEL',
        'Não foi possível iniciar a detecção de pose neste dispositivo.',
        'Tente em outro navegador atualizado ou em um aparelho com mais memória disponível.',
      );
    }
  }

  const frames: PoseFrame[] = [];
  const step = 1 / SAMPLE_FPS;
  const total = Math.max(1, Math.floor(durationSec / step));

  try {
    for (let i = 0; i <= total; i += 1) {
      if (signal?.aborted) break;
      const time = Math.min(durationSec - 0.001, i * step);
      if (time < 0) break;
      await waitForSeek(video, time);
      const timestampMs = Math.round(time * 1000);
      const result = landmarker.detectForVideo(video, timestampMs);
      const landmarks = result.landmarks?.[0];
      if (landmarks?.length) {
        frames.push({
          t: time,
          landmarks: landmarks.map((p) => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility })),
        });
      }
      if (i % 3 === 0 || i === total) {
        onProgress?.({
          stage: 'articulacoes',
          message: PROGRESS_MESSAGES.articulacoes,
          ratio: 0.05 + 0.75 * (i / total),
        });
      }
    }
  } finally {
    landmarker.close();
    try {
      video.currentTime = 0;
    } catch {
      /* alguns navegadores recusam seek após close: sem impacto no resultado */
    }
  }

  return frames;
}
