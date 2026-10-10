'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Pause, Play } from 'lucide-react';
import { SKELETON_EDGES } from '@/lib/analysis/geometry';
import type { CycleResult, PoseFrame } from '@/lib/analysis/types';

export interface PoseStageHandle {
  seek: (time: number) => void;
}

interface PoseStageProps {
  frames: PoseFrame[];
  cycles: CycleResult[];
  durationSec: number;
  aspect: number;
  videoUrl: string | null;
  cycleNoun: 'repeticao' | 'passada';
  handleRef?: Ref<PoseStageHandle>;
  onTimeChange?: (time: number) => void;
}

function nearestFrame(frames: PoseFrame[], time: number): PoseFrame | null {
  if (!frames.length) return null;
  let best = frames[0];
  let bestDelta = Math.abs(best.t - time);
  for (const frame of frames) {
    const delta = Math.abs(frame.t - time);
    if (delta < bestDelta) {
      best = frame;
      bestDelta = delta;
    }
  }
  return best;
}

export function PoseStage({
  frames,
  cycles,
  durationSec,
  aspect,
  videoUrl,
  cycleNoun,
  handleRef,
  onTimeChange,
}: PoseStageProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const demoStartRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  const draw = useCallback(
    (current: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const frame = nearestFrame(frames, current);
      if (!frame) return;

      const point = (index: number) => {
        const p = frame.landmarks[index];
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
        return { x: p.x * width, y: p.y * height, v: p.visibility ?? 1 };
      };

      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, width * 0.008);
      ctx.strokeStyle = 'rgba(232, 238, 244, 0.88)';
      for (const [a, b] of SKELETON_EDGES) {
        const pa = point(a);
        const pb = point(b);
        if (!pa || !pb || pa.v < 0.25 || pb.v < 0.25) continue;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }

      const radius = Math.max(3, width * 0.0095);
      for (const index of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
        const p = point(index);
        if (!p || p.v < 0.25) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#00FFFF';
        ctx.fill();
        ctx.lineWidth = Math.max(1.5, radius * 0.5);
        ctx.strokeStyle = '#0A1628';
        ctx.stroke();
      }
    },
    [frames],
  );

  const setCurrent = useCallback(
    (value: number) => {
      setTime(value);
      onTimeChange?.(value);
      draw(value);
    },
    [draw, onTimeChange],
  );

  const seek = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(durationSec, target));
      if (videoRef.current) {
        videoRef.current.currentTime = clamped;
      } else {
        demoStartRef.current = performance.now() - clamped * 1000;
      }
      setCurrent(clamped);
    },
    [durationSec, setCurrent],
  );

  useImperativeHandle(handleRef, () => ({ seek }), [seek]);

  // Relógio: acompanha o vídeo real ou roda a linha do tempo da demonstração.
  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    if (!videoUrl) demoStartRef.current = performance.now() - time * 1000;

    const tick = () => {
      if (videoRef.current) {
        setCurrent(videoRef.current.currentTime);
      } else {
        const elapsed = (performance.now() - demoStartRef.current) / 1000;
        if (elapsed >= durationSec) {
          demoStartRef.current = performance.now();
          setCurrent(0);
        } else {
          setCurrent(elapsed);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, videoUrl, durationSec, setCurrent]);

  useEffect(() => {
    draw(0);
    const onResize = () => draw(time);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw]);

  const toggle = () => {
    const video = videoRef.current;
    if (video) {
      if (playing) {
        video.pause();
        setPlaying(false);
      } else {
        void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      }
      return;
    }
    setPlaying((p) => !p);
  };

  const activeCycle = cycles.find((c) => time >= c.startSec && time <= c.endSec) ?? null;
  const noun = cycleNoun === 'passada' ? 'Passada' : 'Repetição';

  return (
    <div className="overflow-hidden rounded-card border border-line bg-night">
      <div className="relative w-full" style={{ aspectRatio: `${aspect}` }}>
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 h-full w-full object-contain"
            muted
            playsInline
            preload="metadata"
            aria-label="Vídeo enviado por você, reproduzido apenas neste dispositivo"
            onEnded={() => setPlaying(false)}
            onSeeked={(event) => setCurrent(event.currentTarget.currentTime)}
          />
        ) : (
          <div className="absolute inset-0 bg-night" aria-hidden="true" />
        )}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Sobreposição do esqueleto com as articulações acompanhadas"
        />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-night/85 px-2.5 py-1 text-[11px] font-semibold text-cyan">
            {activeCycle ? `${noun} ${activeCycle.number}` : 'Entre ciclos'}
          </span>
          {!videoUrl ? (
            <span className="rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-ink">
              Análise de demonstração
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 px-3 py-2.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pausar' : 'Reproduzir'}
          aria-pressed={playing}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-canvas transition-colors hover:bg-muted"
        >
          {playing ? (
            <Pause aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Play aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
        <span className="text-xs tabular-nums text-muted">
          {time.toFixed(1).replace('.', ',')} s de {durationSec.toFixed(1).replace('.', ',')} s
        </span>
      </div>
    </div>
  );
}
