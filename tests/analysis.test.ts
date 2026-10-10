import { describe, expect, it } from 'vitest';
import { analyzeFrames, minimumValidFrames, scoreForFindings } from '@/lib/analysis/analyze';
import { CYCLE_CONFIG, FRAME_QUALITY_MIN, POSE_LANDMARKER_OPTIONS, SAMPLE_FPS } from '@/lib/analysis/constants';
import { detectHysteresisCycles } from '@/lib/analysis/cycles';
import { DEMO_DURATION_SECONDS, generateDemoFrames } from '@/lib/analysis/demo';
import { AnalysisError, type PoseFrame } from '@/lib/analysis/types';
import { movingAverage, percentile } from '@/lib/analysis/signal';
import { validateDuration, validateFile } from '@/lib/analysis/video';

describe('parâmetros do motor', () => {
  it('mantém a amostragem e a configuração do PoseLandmarker combinadas', () => {
    expect(SAMPLE_FPS).toBe(10);
    expect(FRAME_QUALITY_MIN).toBe(0.32);
    expect(POSE_LANDMARKER_OPTIONS).toEqual({
      numPoses: 1,
      minPoseDetectionConfidence: 0.48,
      minPosePresenceConfidence: 0.48,
      minTrackingConfidence: 0.48,
    });
  });

  it('exige o maior valor entre 12 quadros e 35% do amostrado', () => {
    expect(minimumValidFrames(20)).toBe(12);
    expect(minimumValidFrames(100)).toBe(35);
    expect(minimumValidFrames(450)).toBe(158);
  });

  it('calcula o score com a fórmula combinada', () => {
    expect(scoreForFindings(0)).toBe(96);
    expect(scoreForFindings(1)).toBe(85);
    expect(scoreForFindings(2)).toBe(74);
    expect(scoreForFindings(4)).toBe(58);
    expect(scoreForFindings(10)).toBe(58);
  });

  it('usa os limiares de ciclo declarados no produto', () => {
    expect(CYCLE_CONFIG.squat).toMatchObject({ highAngle: 158, lowAngle: 132, minCycleSeconds: 0.65 });
    expect(CYCLE_CONFIG.pushup).toMatchObject({ highAngle: 148, lowAngle: 112, minCycleSeconds: 0.65 });
    expect(CYCLE_CONFIG.curl).toMatchObject({ highAngle: 135, lowAngle: 92, minCycleSeconds: 0.65 });
  });
});

describe('utilitários de sinal', () => {
  it('suaviza com média móvel de raio 2', () => {
    expect(movingAverage([10, 20, 30, 40, 50], 2)).toEqual([20, 25, 30, 35, 40]);
  });

  it('calcula percentis por interpolação', () => {
    const values = [10, 20, 30, 40, 50];
    expect(percentile(values, 0)).toBe(10);
    expect(percentile(values, 1)).toBe(50);
    expect(percentile(values, 0.5)).toBe(30);
  });
});

describe('análise de agachamento (sequência sintética)', () => {
  const result = analyzeFrames({
    profile: 'squat',
    view: 'Lateral',
    frames: generateDemoFrames(),
    aspect: 1,
    durationSec: DEMO_DURATION_SECONDS,
  });

  it('encontra as quatro repetições da sequência', () => {
    expect(result.cycles).toHaveLength(4);
    expect(result.cycles.map((c) => c.number)).toEqual([1, 2, 3, 4]);
  });

  it('aponta amplitude parcial e tronco inclinado, com número e timestamp', () => {
    for (const cycle of result.cycles) {
      expect(cycle.findings.map((f) => f.title)).toEqual(['Amplitude parcial', 'Tronco bem inclinado']);
      for (const finding of cycle.findings) {
        expect(finding.cycleNumber).toBe(cycle.number);
        expect(finding.timestamp).toBeGreaterThanOrEqual(cycle.startSec);
        expect(finding.timestamp).toBeLessThanOrEqual(cycle.endSec);
        expect(finding.cue.length).toBeGreaterThan(20);
        expect(finding.detail).toMatch(/\d/);
        expect(finding.confidence).toBe('Alta');
      }
      expect(cycle.score).toBe(74);
    }
    expect(result.consistency).toBe(74);
    expect(result.consistent).toBe(false);
  });

  it('não acusa ritmo acelerado em repetições longas', () => {
    expect(result.findings.some((f) => f.title === 'Ritmo acelerado')).toBe(false);
    result.cycles.forEach((cycle) => expect(cycle.durationSec).toBeGreaterThan(1.05));
  });

  it('recusa sequência sem articulações visíveis', () => {
    const blind: PoseFrame[] = generateDemoFrames().map((frame) => ({
      t: frame.t,
      landmarks: frame.landmarks.map((p) => ({ ...p, visibility: 0.1 })),
    }));
    expect(() =>
      analyzeFrames({ profile: 'squat', view: 'Lateral', frames: blind, aspect: 1, durationSec: 10 }),
    ).toThrowError(AnalysisError);
  });

  it('recusa sequência sem nenhum ciclo', () => {
    const still = generateDemoFrames().slice(0, 5);
    let thrown: unknown;
    try {
      analyzeFrames({ profile: 'squat', view: 'Lateral', frames: still, aspect: 1, durationSec: 0.5 });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(AnalysisError);
  });
});

describe('detecção estacionária', () => {
  it('ignora oscilação curta demais para ser repetição', () => {
    const times: number[] = [];
    const angles: number[] = [];
    for (let i = 0; i <= 40; i += 1) {
      const t = i / 10;
      times.push(t);
      angles.push(165 + 3 * Math.sin(2 * Math.PI * t));
    }
    expect(detectHysteresisCycles(times, angles, CYCLE_CONFIG.squat as never)).toHaveLength(0);
  });
});

describe('validação de arquivo', () => {
  it('recusa arquivo que não é vídeo', () => {
    expect(() => validateFile({ name: 'treino.pdf', type: 'application/pdf', size: 1000 })).toThrowError(
      AnalysisError,
    );
  });

  it('aceita mp4, mov e webm', () => {
    expect(() => validateFile({ name: 'a.mp4', type: 'video/mp4', size: 10 })).not.toThrow();
    expect(() => validateFile({ name: 'a.mov', type: 'video/quicktime', size: 10 })).not.toThrow();
    expect(() => validateFile({ name: 'a.webm', type: 'video/webm', size: 10 })).not.toThrow();
    expect(() => validateFile({ name: 'a.mov', type: '', size: 10 })).not.toThrow();
  });

  it('recusa acima de 250 MB e acima de 45 segundos', () => {
    expect(() => validateFile({ name: 'a.mp4', type: 'video/mp4', size: 251 * 1024 * 1024 })).toThrowError(
      /250 MB/,
    );
    expect(() => validateDuration(45.5)).toThrowError(/45 segundos/);
    expect(() => validateDuration(44.9)).not.toThrow();
    expect(() => validateDuration(0)).toThrowError(AnalysisError);
  });
});
