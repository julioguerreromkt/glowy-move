/** Preenche buracos (NaN) por interpolação linear entre amostras válidas. */
export function interpolateGaps(values: number[]): number[] {
  const out = values.slice();
  const validIndexes = out.map((v, i) => (Number.isFinite(v) ? i : -1)).filter((i) => i >= 0);
  if (!validIndexes.length) return out;

  const first = validIndexes[0];
  const last = validIndexes[validIndexes.length - 1];
  for (let i = 0; i < first; i += 1) out[i] = out[first];
  for (let i = last + 1; i < out.length; i += 1) out[i] = out[last];

  for (let k = 0; k < validIndexes.length - 1; k += 1) {
    const a = validIndexes[k];
    const b = validIndexes[k + 1];
    if (b - a <= 1) continue;
    const span = b - a;
    for (let i = a + 1; i < b; i += 1) {
      const ratio = (i - a) / span;
      out[i] = out[a] + (out[b] - out[a]) * ratio;
    }
  }
  return out;
}

/** Média móvel simples de raio fixo, com janela encurtada nas bordas. */
export function movingAverage(values: number[], radius: number): number[] {
  if (radius <= 0) return values.slice();
  const out = new Array<number>(values.length);
  for (let i = 0; i < values.length; i += 1) {
    let sum = 0;
    let count = 0;
    for (let j = i - radius; j <= i + radius; j += 1) {
      if (j < 0 || j >= values.length) continue;
      const v = values[j];
      if (!Number.isFinite(v)) continue;
      sum += v;
      count += 1;
    }
    out[i] = count ? sum / count : Number.NaN;
  }
  return out;
}

/** Percentil por interpolação linear. `p` vai de 0 a 1. */
export function percentile(values: number[], p: number): number {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return Number.NaN;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * Math.min(1, Math.max(0, p));
  const low = Math.floor(pos);
  const high = Math.ceil(pos);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low);
}

/** Índices de mínimos locais, com platôs resolvidos pelo ponto central. */
export function findLocalMinima(values: number[]): number[] {
  const minima: number[] = [];
  let i = 1;
  while (i < values.length - 1) {
    const v = values[i];
    if (!(v <= values[i - 1])) {
      i += 1;
      continue;
    }
    let j = i;
    while (j + 1 < values.length && values[j + 1] === v) j += 1;
    const nextIndex = j + 1;
    if (nextIndex < values.length && values[nextIndex] > v && values[i - 1] > v) {
      minima.push(Math.floor((i + j) / 2));
    }
    i = j + 1;
  }
  return minima;
}

export function argMax(values: number[], from: number, to: number): number {
  let best = from;
  for (let i = from; i <= to && i < values.length; i += 1) {
    if (values[i] > values[best]) best = i;
  }
  return best;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
