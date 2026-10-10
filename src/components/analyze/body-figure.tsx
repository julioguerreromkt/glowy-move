/**
 * Figura corporal abstrata montada com elementos posicionados por CSS.
 * O contêiner é quadrado, então as coordenadas em porcentagem valem para os
 * dois eixos e os segmentos podem ser calculados por trigonometria simples.
 */
const JOINTS = {
  head: { x: 45, y: 18 },
  shoulder: { x: 43, y: 29 },
  elbow: { x: 55, y: 38 },
  wrist: { x: 62, y: 48 },
  hip: { x: 35, y: 51 },
  knee: { x: 47, y: 68 },
  ankle: { x: 37, y: 85 },
  foot: { x: 47, y: 88 },
} as const;

const BONES: Array<[keyof typeof JOINTS, keyof typeof JOINTS]> = [
  ['head', 'shoulder'],
  ['shoulder', 'elbow'],
  ['elbow', 'wrist'],
  ['shoulder', 'hip'],
  ['hip', 'knee'],
  ['knee', 'ankle'],
  ['ankle', 'foot'],
];

function Bone({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <span
      aria-hidden="true"
      className="absolute h-[3px] rounded-full bg-muted/70"
      style={{
        left: `${from.x}%`,
        top: `${from.y}%`,
        width: `${length}%`,
        transform: `translateY(-50%) rotate(${angle}deg)`,
        transformOrigin: '0 50%',
      }}
    />
  );
}

export function BodyFigure() {
  return (
    <figure className="relative mx-auto w-full max-w-[420px]">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-elevated">
        <span
          aria-hidden="true"
          className="absolute inset-x-8 bottom-8 h-px bg-ink/10"
          style={{ boxShadow: '0 -28px 0 -27px rgba(232,238,244,0.10), 0 -56px 0 -55px rgba(232,238,244,0.07)' }}
        />

        {BONES.map(([a, b]) => (
          <Bone key={`${a}-${b}`} from={JOINTS[a]} to={JOINTS[b]} />
        ))}

        {Object.entries(JOINTS).map(([name, point], index) => {
          // O acento marca só a articulação medida na etiqueta. O resto é neutro.
          const measured = name === 'knee';
          return (
            <span
              key={name}
              aria-hidden="true"
              className={`absolute block rounded-full border-2 border-night ${
                measured ? 'bg-cyan joint-pulse' : 'bg-muted'
              }`}
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                width: name === 'head' ? '10%' : '5%',
                height: name === 'head' ? '10%' : '5%',
                transform: 'translate(-50%, -50%)',
                animationDelay: `${index * 180}ms`,
              }}
            />
          );
        })}

        <span
          aria-hidden="true"
          className="absolute rounded-full border-2 border-dashed border-cyan/35"
          style={{
            left: `${JOINTS.knee.x}%`,
            top: `${JOINTS.knee.y}%`,
            width: '26%',
            height: '26%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        <span
          className="absolute rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-canvas"
          style={{ left: `${JOINTS.knee.x + 13}%`, top: `${JOINTS.knee.y - 4}%` }}
        >
          Joelho 118°
        </span>

        <span className="absolute left-4 top-4 rounded-full bg-night/70 px-2.5 py-1 text-[11px] font-semibold text-muted">
          Pontos da pose no dispositivo
        </span>
      </div>
      <figcaption className="mt-3 text-xs text-muted">
        Representação das articulações acompanhadas durante a análise. Nenhum traço facial é usado.
      </figcaption>
    </figure>
  );
}
