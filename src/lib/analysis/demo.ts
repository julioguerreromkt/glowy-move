import { SAMPLE_FPS } from './constants';
import { LM } from './geometry';
import type { PoseFrame, PoseLandmarkPoint } from './types';

const DEG = Math.PI / 180;

interface Point {
  x: number;
  y: number;
}

function offset(p: Point, length: number, angleDeg: number): Point {
  return { x: p.x + length * Math.sin(angleDeg * DEG), y: p.y - length * Math.cos(angleDeg * DEG) };
}

/** Curva de um agachamento: descida, fundo e subida, com pausa em pé. */
function kneeAngleAt(time: number): number {
  const rest = 172;
  const bottom = 118;
  const lead = 0.6;
  const repDown = 0.8;
  const repUp = 1.0;
  const pause = 0.4;
  const repSpan = repDown + repUp + pause;

  if (time < lead) return rest;
  const local = (time - lead) % repSpan;
  const repIndex = Math.floor((time - lead) / repSpan);
  if (repIndex >= 4) return rest;

  if (local < repDown) {
    const p = local / repDown;
    return rest - (rest - bottom) * (1 - Math.cos(p * Math.PI)) / 2;
  }
  if (local < repDown + repUp) {
    const p = (local - repDown) / repUp;
    return bottom + (rest - bottom) * (1 - Math.cos(p * Math.PI)) / 2;
  }
  return rest;
}

function buildLandmarks(kneeAngle: number): PoseLandmarkPoint[] {
  const flexion = 180 - kneeAngle;
  const shankLean = 0.45 * flexion;
  const thighLean = -0.55 * flexion;
  const torsoLean = 0.62 * flexion;

  const shank = 0.19;
  const thigh = 0.19;
  const torso = 0.22;

  const ankle: Point = { x: 0.46, y: 0.93 };
  const knee = offset(ankle, shank, shankLean);
  const hip = offset(knee, thigh, thighLean);
  const shoulder = offset(hip, torso, torsoLean);
  const elbow = offset(shoulder, 0.13, torsoLean + 24);
  const wrist = offset(elbow, 0.12, torsoLean + 42);
  const nose = offset(shoulder, 0.09, torsoLean - 6);
  const foot = { x: ankle.x + 0.05, y: ankle.y + 0.02 };

  const sideShift = 0.006;
  const points: PoseLandmarkPoint[] = new Array(33);

  const set = (index: number, p: Point, visibility: number, shift = 0) => {
    points[index] = { x: p.x + shift, y: p.y, z: 0, visibility };
  };

  // Rosto: presente, mas nada é usado pela análise.
  for (let i = 0; i <= 10; i += 1) set(i, nose, 0.6, (i % 3) * 0.004);

  set(LM.leftShoulder, shoulder, 0.92, -sideShift);
  set(LM.rightShoulder, shoulder, 0.9, sideShift);
  set(LM.leftElbow, elbow, 0.9, -sideShift);
  set(LM.rightElbow, elbow, 0.88, sideShift);
  set(LM.leftWrist, wrist, 0.88, -sideShift);
  set(LM.rightWrist, wrist, 0.86, sideShift);
  for (let i = 17; i <= 22; i += 1) set(i, wrist, 0.6, ((i % 2) - 0.5) * 0.008);
  set(LM.leftHip, hip, 0.93, -sideShift);
  set(LM.rightHip, hip, 0.91, sideShift);
  set(LM.leftKnee, knee, 0.93, -sideShift);
  set(LM.rightKnee, knee, 0.91, sideShift);
  set(LM.leftAnkle, ankle, 0.92, -sideShift);
  set(LM.rightAnkle, ankle, 0.9, sideShift);
  for (let i = 29; i <= 32; i += 1) set(i, foot, 0.7, ((i % 2) - 0.5) * 0.01);

  return points;
}

export const DEMO_DURATION_SECONDS = 10;

/**
 * Sequência sintética usada pela análise de demonstração. Ela passa exatamente
 * pelo mesmo motor de análise do vídeo enviado: nada aqui é resultado escrito à mão.
 */
export function generateDemoFrames(): PoseFrame[] {
  const frames: PoseFrame[] = [];
  const step = 1 / SAMPLE_FPS;
  for (let t = 0; t <= DEMO_DURATION_SECONDS + 1e-6; t += step) {
    const time = Number(t.toFixed(3));
    frames.push({ t: time, landmarks: buildLandmarks(kneeAngleAt(time)) });
  }
  return frames;
}
