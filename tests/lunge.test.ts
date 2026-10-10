import { describe, expect, it } from 'vitest';
import { CYCLE_CONFIG, type ValleyConfig } from '@/lib/analysis/constants';
import { detectHysteresisCycles, detectValleyCycles } from '@/lib/analysis/cycles';
import { interpolateGaps, movingAverage } from '@/lib/analysis/signal';

const lungeConfig = CYCLE_CONFIG.lunge as ValleyConfig;

/**
 * Afundo caminhando: o joelho oscila em torno de um valor médio, nunca reabre
 * até 158° e ainda deriva para baixo porque a pessoa avança pelo espaço.
 */
function continuousStrideSeries(strides: number, period = 1.4, drift = 1) {
  const times: number[] = [];
  const angles: number[] = [];
  const totalSeconds = strides * period;
  for (let i = 0; i <= Math.round(totalSeconds * 10); i += 1) {
    const t = Number((i / 10).toFixed(2));
    times.push(t);
    angles.push(127.5 + 22.5 * Math.cos((2 * Math.PI * t) / period) - drift * t);
  }
  return { times, angles: movingAverage(interpolateGaps(angles), 2) };
}

describe('afundo caminhando', () => {
  const { times, angles } = continuousStrideSeries(5);

  it('trabalha com um sinal que nunca volta ao estado alto de 158°', () => {
    expect(Math.max(...angles)).toBeLessThan(158);
  });

  it('trabalha com um sinal que nunca volta à mesma posição', () => {
    const firstPeak = angles[0];
    const lastPeak = angles[angles.length - 1];
    expect(Math.abs(firstPeak - lastPeak)).toBeGreaterThan(3);
  });

  it('a histerese dos exercícios estacionários não encontra nada nesse sinal', () => {
    expect(detectHysteresisCycles(times, angles, CYCLE_CONFIG.squat as never)).toHaveLength(0);
    expect(detectHysteresisCycles(times, angles, CYCLE_CONFIG.pushup as never)).toHaveLength(0);
  });

  it('a detecção por vales encontra cada passada', () => {
    const cycles = detectValleyCycles(times, angles, lungeConfig);
    expect(cycles).toHaveLength(5);
    cycles.forEach((cycle, index) => {
      expect(cycle.durationSec).toBeGreaterThanOrEqual(lungeConfig.minCycleSeconds);
      expect(cycle.durationSec).toBeLessThanOrEqual(lungeConfig.maxCycleSeconds);
      expect(cycle.bottomSec).toBeGreaterThan(cycle.startSec);
      expect(cycle.endSec).toBeGreaterThan(cycle.bottomSec);
      if (index > 0) {
        expect(cycle.bottomSec - cycles[index - 1].bottomSec).toBeGreaterThanOrEqual(
          lungeConfig.minSeparationSeconds,
        );
      }
    });
  });

  it('rejeita sequência com amplitude menor que 12°', () => {
    const flat = continuousStrideSeries(5, 1.4, 0);
    const damped = flat.angles.map((value) => 130 + (value - 130) * 0.15);
    expect(detectValleyCycles(flat.times, damped, lungeConfig)).toHaveLength(0);
  });

  it('funde vales separados por menos de 0,55 s', () => {
    const fast = continuousStrideSeries(6, 0.5, 0);
    const cycles = detectValleyCycles(fast.times, fast.angles, lungeConfig);
    const gaps = cycles.slice(1).map((c, i) => c.bottomSec - cycles[i].bottomSec);
    gaps.forEach((gap) => expect(gap).toBeGreaterThanOrEqual(lungeConfig.minSeparationSeconds));
  });

  it('limita o resultado a 20 passadas', () => {
    const many = continuousStrideSeries(30, 1.4, 0.2);
    expect(detectValleyCycles(many.times, many.angles, lungeConfig).length).toBeLessThanOrEqual(20);
  });

  it('mantém os parâmetros combinados para o perfil de afundo', () => {
    expect(lungeConfig).toMatchObject({
      kind: 'valley',
      percentileLow: 0.15,
      percentileHigh: 0.85,
      minAmplitude: 12,
      bottomRatio: 0.46,
      minSeparationSeconds: 0.55,
      prominenceAbs: 8,
      prominenceRatio: 0.24,
      minCycleSeconds: 0.45,
      maxCycleSeconds: 4,
    });
  });
});
