import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LibrarySurface } from '@/components/library/library-surface';
import { PlannerSurface } from '@/components/planner/planner-surface';
import { ReferenceExecution } from '@/components/analyze/reference-execution';
import { BodyFigure } from '@/components/analyze/body-figure';
import { SiteFooter } from '@/components/site-footer';
import { EXERCISE_CATALOG, referenceExerciseFor } from '@/lib/catalog';
import { MUSCLE_GROUPS } from '@/lib/types';

function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('renderização no servidor', () => {
  it('entrega a biblioteca completa já no HTML, sem esqueleto de carregamento', () => {
    const markup = renderToStaticMarkup(<LibrarySurface exercises={EXERCISE_CATALOG} />);
    const content = text(markup);

    expect(content).toContain('Aprenda primeiro.');
    expect(content).toContain('Treine melhor.');
    for (const exercise of EXERCISE_CATALOG) {
      expect(content).toContain(exercise.name);
    }
    for (const group of MUSCLE_GROUPS) {
      expect(content).toContain(group);
    }
    expect(markup).not.toContain('<iframe');
    expect(markup).toContain('loading="lazy"');
    expect(markup.match(/i\.ytimg\.com/g) ?? []).toHaveLength(23);
    expect(content).toContain('Exercícios 23');
    expect(content).toContain('Grupos musculares 9');
    expect(content).toContain('Com análise por vídeo 4');
    expect(markup.match(/Analisa vídeo/g) ?? []).toHaveLength(4);
  });

  it('entrega o planejador com campos, dias e músculos no HTML', () => {
    const markup = renderToStaticMarkup(<PlannerSurface exercises={EXERCISE_CATALOG} />);
    const content = text(markup);

    expect(content).toContain('Sua rotina.');
    expect(content).toContain('Do seu jeito.');
    expect(content).toContain('Planejamento inteligente no dispositivo');
    expect(content).toContain('Seus dados físicos não são enviados para serviços externos.');
    expect(content).toContain('Gerar minha rotina inteligente');
    expect(markup).toContain('id="altura"');
    expect(markup).toContain('id="peso"');
    expect(markup).toContain('aria-pressed');
    for (const day of ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']) {
      expect(content).toContain(day);
    }
    for (const goal of ['Hipertrofia', 'Força', 'Condicionamento', 'Saúde e constância']) {
      expect(content).toContain(goal);
    }
    for (const minutes of ['30 min', '45 min', '60 min', '75 min']) {
      expect(content).toContain(minutes);
    }
  });

  it('entrega a execução de referência do agachamento', () => {
    const reference = referenceExerciseFor(EXERCISE_CATALOG, 'squat');
    expect(reference).toBeDefined();
    const markup = renderToStaticMarkup(<ReferenceExecution exercise={reference!} />);
    const content = text(markup);

    expect(content).toContain('EXECUÇÃO DE REFERÊNCIA');
    expect(content).toContain('Compare com uma execução bem feita.');
    expect(content).toContain('Assistir execução correta');
    expect(content).toContain('Agachamento livre');
    expect(markup).toContain('https://www.youtube.com/watch?v=l83R5PblSMA');
    expect(markup).not.toContain('<iframe');
  });

  it('entrega a figura corporal montada com CSS, sem imagem externa', () => {
    const markup = renderToStaticMarkup(<BodyFigure />);
    expect(markup).toContain('Joelho 118°');
    expect(markup).not.toContain('<img');
    expect(markup).toContain('rotate(');
  });

  it('entrega o rodapé responsável', () => {
    const content = text(renderToStaticMarkup(<SiteFooter />));
    expect(content).toContain('Resultado visual, não diagnóstico');
    expect(content).toContain('Processado no dispositivo');
    expect(content).toContain('Sem reconhecimento facial');
    expect(content).toContain('profissional qualificado');
  });
});
