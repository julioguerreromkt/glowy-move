import { ShieldCheck } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">Resultado visual, não diagnóstico</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              As estimativas vêm da posição das articulações no vídeo e podem errar, principalmente com roupa larga,
              pouca luz ou enquadramento parcial. Dor, lesão, gestação ou condição clínica pedem avaliação de um
              profissional qualificado.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-subtle" />
              Processado no dispositivo
            </span>
            <span>Sem reconhecimento facial</span>
            <span>Seus dados físicos não são enviados para serviços externos.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
