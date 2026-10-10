'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck, ScanFace } from 'lucide-react';
import { BodyFigure } from '@/components/analyze/body-figure';
import { ExercisePicker } from '@/components/analyze/exercise-picker';
import { ResultsPanel } from '@/components/analyze/results-panel';
import { Uploader, type SelectedVideo } from '@/components/analyze/uploader';
import { RESET_ANALYSIS_EVENT } from '@/components/site-header';
import { ANALYSIS_PROFILE_META, ANALYSIS_PROFILE_ORDER, referenceExerciseFor } from '@/lib/catalog';
import { analyzeFrames } from '@/lib/analysis/analyze';
import { DEMO_DURATION_SECONDS, generateDemoFrames } from '@/lib/analysis/demo';
import { PROGRESS_MESSAGES, samplePoseFrames, type ProgressUpdate } from '@/lib/analysis/pose-runner';
import { AnalysisError, type AnalysisResult } from '@/lib/analysis/types';
import { readVideoMetadata, supportsPoseAnalysis, validateDuration, validateFile } from '@/lib/analysis/video';
import type { AnalysisProfile, Exercise, ShotView } from '@/lib/types';

type Stage = 'choose' | 'ready' | 'analyzing' | 'results';

interface AnalyzeSurfaceProps {
  exercises: Exercise[];
}

const PROFILE_BY_EXERCISE: Record<string, AnalysisProfile> = Object.fromEntries(
  ANALYSIS_PROFILE_ORDER.map((profile) => [ANALYSIS_PROFILE_META[profile].referenceExerciseId, profile]),
);

export function AnalyzeSurface({ exercises }: AnalyzeSurfaceProps) {
  const [stage, setStage] = useState<Stage>('choose');
  const [profile, setProfile] = useState<AnalysisProfile | null>(null);
  const [view, setView] = useState<ShotView>('Lateral');
  const [selected, setSelected] = useState<SelectedVideo | null>(null);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [progress, setProgress] = useState<ProgressUpdate>({
    stage: 'modelo',
    message: PROGRESS_MESSAGES.modelo,
    ratio: 0,
  });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const objectUrlRef = useRef<string | null>(null);
  const samplingVideoRef = useRef<HTMLVideoElement | null>(null);

  const releaseVideo = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    releaseVideo();
    setSelected(null);
    setResult(null);
    setError(null);
    setIsDemo(false);
    setStage('choose');
    setProfile(null);
    setView('Lateral');
  }, [releaseVideo]);

  useEffect(() => {
    const handler = () => reset();
    window.addEventListener(RESET_ANALYSIS_EVENT, handler);
    return () => window.removeEventListener(RESET_ANALYSIS_EVENT, handler);
  }, [reset]);

  useEffect(() => releaseVideo, [releaseVideo]);

  // Pré-seleção vinda da biblioteca (/?exercicio=push-up). Lida no cliente,
  // depois da montagem, para que a página continue sendo HTML completo no servidor.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('exercicio');
    if (!requested) return;
    const mapped = PROFILE_BY_EXERCISE[requested];
    if (!mapped) return;
    setProfile(mapped);
    setView(ANALYSIS_PROFILE_META[mapped].views[0]);
    setStage('ready');
  }, []);

  const chooseProfile = (next: AnalysisProfile) => {
    setProfile(next);
    setView(ANALYSIS_PROFILE_META[next].views[0]);
    setError(null);
    setStage('ready');
  };

  const handleFile = async (file: File) => {
    setError(null);
    try {
      validateFile(file);
      releaseVideo();
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      const meta = await readVideoMetadata(url);
      validateDuration(meta.duration);
      setSelected({
        name: file.name,
        size: file.size,
        durationSec: meta.duration,
        url,
        width: meta.width,
        height: meta.height,
      });
    } catch (caught) {
      releaseVideo();
      setSelected(null);
      if (caught instanceof AnalysisError) setError({ message: caught.message, hint: caught.hint });
      else setError({ message: 'Não consegui preparar este vídeo.', hint: 'Tente outro arquivo em MP4, MOV ou WebM.' });
    }
  };

  const runAnalysis = async () => {
    if (!profile || !selected) return;
    if (!supportsPoseAnalysis()) {
      setError({
        message: 'Este navegador não suporta a análise no dispositivo.',
        hint: 'Abra o Form em uma versão atualizada de Chrome, Edge, Firefox ou Safari.',
      });
      return;
    }
    setError(null);
    setStage('analyzing');
    setProgress({ stage: 'modelo', message: PROGRESS_MESSAGES.modelo, ratio: 0.02 });

    try {
      const video = samplingVideoRef.current;
      if (!video) throw new AnalysisError('FALHA_PROCESSAMENTO', 'O leitor de vídeo não ficou pronto.');
      if (video.readyState < 1) {
        await new Promise<void>((resolve, reject) => {
          const ok = () => {
            video.removeEventListener('loadedmetadata', ok);
            resolve();
          };
          const fail = () => {
            video.removeEventListener('error', fail);
            reject(new AnalysisError('ARQUIVO_INVALIDO', 'Não consegui abrir este vídeo no navegador.'));
          };
          video.addEventListener('loadedmetadata', ok);
          video.addEventListener('error', fail);
        });
      }

      const frames = await samplePoseFrames({
        video,
        durationSec: selected.durationSec,
        onProgress: setProgress,
      });

      setProgress({ stage: 'ciclos', message: PROGRESS_MESSAGES.ciclos, ratio: 0.86 });
      const analysis = analyzeFrames({
        profile,
        view,
        frames,
        aspect: selected.width / selected.height,
        durationSec: selected.durationSec,
      });

      setProgress({ stage: 'recomendacoes', message: PROGRESS_MESSAGES.recomendacoes, ratio: 0.96 });
      setResult(analysis);
      setIsDemo(false);
      setStage('results');
    } catch (caught) {
      if (caught instanceof AnalysisError) setError({ message: caught.message, hint: caught.hint });
      else
        setError({
          message: 'A análise não pôde ser concluída neste vídeo.',
          hint: 'Tente novamente com o corpo inteiro no quadro e a câmera parada.',
        });
      setStage('ready');
    }
  };

  const runDemo = () => {
    const frames = generateDemoFrames();
    const analysis = analyzeFrames({
      profile: 'squat',
      view: 'Lateral',
      frames,
      aspect: 1,
      durationSec: DEMO_DURATION_SECONDS,
    });
    releaseVideo();
    setSelected(null);
    setProfile('squat');
    setView('Lateral');
    setResult(analysis);
    setIsDemo(true);
    setError(null);
    setStage('results');
  };

  const reference = result ? referenceExerciseFor(exercises, result.profile) : undefined;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      {stage !== 'results' ? (
        <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="eyebrow">COACH DE MOVIMENTO</p>
            <span aria-hidden="true" className="mt-3 block h-px w-14 bg-line" />
            <h1 className="display mt-5 text-[40px] text-ink sm:text-[56px] xl:text-[66px]">
              Seu movimento.
              <br />
              <span className="text-cyan">Mais consciente.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Envie um vídeo curto. A gente identifica cada repetição ou passada, destaca o que merece atenção e mostra
              como melhorar.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="pill">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-subtle" />
                Processado no dispositivo
              </span>
              <span className="pill">
                <ScanFace aria-hidden="true" className="h-3.5 w-3.5 text-subtle" />
                Sem reconhecimento facial
              </span>
            </div>
          </div>
          <BodyFigure />
        </section>
      ) : null}

      {stage === 'choose' || stage === 'ready' ? (
        <>
          <ExercisePicker value={profile} onChange={chooseProfile} view={view} onViewChange={setView} />
          {profile ? (
            <Uploader
              profile={profile}
              view={view}
              selected={selected}
              error={error}
              onSelectFile={(file) => void handleFile(file)}
              onDemo={runDemo}
              onAnalyze={() => void runAnalysis()}
              onClear={() => {
                releaseVideo();
                setSelected(null);
                setError(null);
              }}
            />
          ) : null}
        </>
      ) : null}

      {stage === 'analyzing' ? (
        <section aria-live="polite" className="mt-14 card p-8 sm:p-10">
          <p className="eyebrow">Análise em andamento</p>
          <h2 className="display mt-2 text-[28px] text-ink sm:text-[34px]">{progress.message}</h2>
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-cyan transition-[width] duration-300"
              style={{ width: `${Math.round(progress.ratio * 100)}%` }}
            />
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-subtle" />
            Tudo isso acontece no seu dispositivo. O vídeo não sai daqui.
          </p>
        </section>
      ) : null}

      {stage === 'results' && result ? (
        <div className="mt-2">
          <ResultsPanel
            result={result}
            videoUrl={isDemo ? null : (selected?.url ?? null)}
            aspect={isDemo ? 1 : selected ? selected.width / selected.height : 16 / 9}
            reference={reference}
            onRestart={reset}
          />
        </div>
      ) : null}

      {selected ? (
        <video
          ref={samplingVideoRef}
          src={selected.url}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
        />
      ) : null}
    </div>
  );
}
