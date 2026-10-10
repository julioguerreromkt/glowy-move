import { MAX_CYCLES, type CycleConfig, type HysteresisConfig, type ValleyConfig } from './constants';
import { argMax, findLocalMinima, percentile } from './signal';

export interface DetectedCycle {
  startIndex: number;
  bottomIndex: number;
  endIndex: number;
  startSec: number;
  bottomSec: number;
  endSec: number;
  durationSec: number;
  minAngle: number;
}

/**
 * Exercícios estacionários: o corpo sai de uma posição alta, desce e volta.
 * Histerese com dois limiares evita contar tremor como repetição.
 */
export function detectHysteresisCycles(
  times: number[],
  angles: number[],
  config: HysteresisConfig,
): DetectedCycle[] {
  const cycles: DetectedCycle[] = [];
  let state: 'waiting' | 'high' | 'descending' = 'waiting';
  let lastHighIndex = 0;
  let startIndex = 0;
  let bottomIndex = 0;
  let minAngle = Number.POSITIVE_INFINITY;

  for (let i = 0; i < angles.length; i += 1) {
    const angle = angles[i];
    if (!Number.isFinite(angle)) continue;

    if (state === 'waiting') {
      if (angle > config.highAngle) {
        state = 'high';
        lastHighIndex = i;
      }
      continue;
    }

    if (state === 'high') {
      if (angle > config.highAngle) {
        lastHighIndex = i;
        continue;
      }
      if (angle < config.lowAngle) {
        state = 'descending';
        startIndex = lastHighIndex;
        bottomIndex = i;
        minAngle = angle;
      }
      continue;
    }

    // state === 'descending'
    if (angle < minAngle) {
      minAngle = angle;
      bottomIndex = i;
    }
    if (angle > config.highAngle) {
      const duration = times[i] - times[startIndex];
      if (duration >= config.minCycleSeconds) {
        cycles.push({
          startIndex,
          bottomIndex,
          endIndex: i,
          startSec: times[startIndex],
          bottomSec: times[bottomIndex],
          endSec: times[i],
          durationSec: duration,
          minAngle,
        });
      }
      state = 'high';
      lastHighIndex = i;
      minAngle = Number.POSITIVE_INFINITY;
    }
  }

  return cycles.slice(0, MAX_CYCLES);
}

/**
 * Afundo caminhando é movimento contínuo: a pessoa não volta à mesma posição
 * neutra nem reabre o joelho até o valor de repouso. Cada passada é detectada
 * como um vale proeminente na flexão do joelho, com amplitude estimada por
 * percentis da própria sequência.
 */
export function detectValleyCycles(times: number[], angles: number[], config: ValleyConfig): DetectedCycle[] {
  const finite = angles.filter((a) => Number.isFinite(a));
  if (finite.length < 5) return [];

  const low = percentile(finite, config.percentileLow);
  const high = percentile(finite, config.percentileHigh);
  const amplitude = high - low;
  if (!Number.isFinite(amplitude) || amplitude < config.minAmplitude) return [];

  const bottomThreshold = low + config.bottomRatio * amplitude;
  const minProminence = Math.max(config.prominenceAbs, config.prominenceRatio * amplitude);

  const candidates = findLocalMinima(angles).filter((i) => angles[i] <= bottomThreshold);
  if (!candidates.length) return [];

  // Separação temporal: vales muito próximos representam a mesma passada.
  const separated: number[] = [];
  for (const index of candidates) {
    const previous = separated[separated.length - 1];
    if (previous === undefined || times[index] - times[previous] >= config.minSeparationSeconds) {
      separated.push(index);
      continue;
    }
    if (angles[index] < angles[previous]) separated[separated.length - 1] = index;
  }

  const cycles: DetectedCycle[] = [];
  for (let k = 0; k < separated.length; k += 1) {
    const valley = separated[k];
    const leftBound = k === 0 ? 0 : separated[k - 1];
    const rightBound = k === separated.length - 1 ? angles.length - 1 : separated[k + 1];

    const leftPeak = argMax(angles, leftBound, valley);
    const rightPeak = argMax(angles, valley, rightBound);
    const prominence = Math.min(angles[leftPeak], angles[rightPeak]) - angles[valley];
    if (!Number.isFinite(prominence) || prominence < minProminence) continue;

    const duration = times[rightPeak] - times[leftPeak];
    if (duration < config.minCycleSeconds || duration > config.maxCycleSeconds) continue;

    cycles.push({
      startIndex: leftPeak,
      bottomIndex: valley,
      endIndex: rightPeak,
      startSec: times[leftPeak],
      bottomSec: times[valley],
      endSec: times[rightPeak],
      durationSec: duration,
      minAngle: angles[valley],
    });
  }

  return cycles.slice(0, MAX_CYCLES);
}

export function detectCycles(times: number[], angles: number[], config: CycleConfig): DetectedCycle[] {
  return config.kind === 'hysteresis'
    ? detectHysteresisCycles(times, angles, config)
    : detectValleyCycles(times, angles, config);
}
