import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-24 sm:px-6">
      <p className="eyebrow">Página não encontrada</p>
      <h1 className="display mt-3 text-[42px] text-ink sm:text-[56px]">Esse endereço não existe por aqui.</h1>
      <p className="mt-4 max-w-lg text-base text-muted">
        Volte para a análise de vídeo, abra a biblioteca de exercícios ou monte a sua rotina da semana.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn-accent">
          Analisar vídeo
        </Link>
        <Link href="/exercicios" className="btn-ghost">
          Exercícios
        </Link>
        <Link href="/rotina" className="btn-ghost">
          Rotina
        </Link>
      </div>
    </div>
  );
}
