# Glowy Move

Coach visual de exercícios. Três superfícies na mesma casca: **Analisar vídeo**, **Exercícios** e **Rotina**.

O vídeo enviado nunca sai do navegador. O MediaPipe PoseLandmarker roda no dispositivo, extrai os pontos da pose quadro a quadro, deriva ângulos de cotovelo e joelho, separa cada repetição (ou cada passada, no afundo caminhando) e aplica regras de desvio com incerteza declarada. Altura, peso e rotina também ficam no navegador.

## Rodar localmente

Requisitos: Node.js 20.9 ou superior.

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`. O `predev` copia o runtime WebAssembly do MediaPipe de `node_modules` para `public/mediapipe`, então o motor de visão é servido pelo próprio domínio da aplicação.

### Banco de dados (opcional)

O catálogo embutido em `src/data/catalog.json` é o fallback obrigatório: sem banco, tudo funciona. Para usar o SQLite com Drizzle:

```bash
npm run db:seed        # cria data/glowy-move.db com os 23 exercícios
```

Aponte para outro arquivo com `GLOWY_MOVE_DB_PATH=/caminho/glowy-move.db`. Quando o banco responde, a biblioteca marca `data-fonte="banco"` no HTML; sem ele, `data-fonte="catálogo embutido"`.

O banco é a fonte persistente dos campos editoriais (nome, descrição, passos, equipamento). Os campos de análise e de vídeo (`analyzable`, `analysisProfile`, `cameraView`, `videoId`, `videoSource`, `videoUrl`) sempre vêm do catálogo embutido, para que um banco semeado por uma versão antiga não apague um recurso nem sirva um vídeo já corrigido.

### Modelo de pose (opcional)

Por padrão o modelo `pose_landmarker_lite` é buscado na CDN oficial do MediaPipe no primeiro uso. Para deixar a aplicação totalmente self-hosted:

```bash
npm run fetch:model    # salva em public/models/pose_landmarker_lite.task
```

A aplicação prefere a cópia local quando ela existe. Em qualquer um dos dois casos o vídeo continua sem sair do dispositivo: o que é baixado é o modelo, não o seu vídeo.

## Verificação

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run test           # vitest: catálogo, vídeos, banco, planejador, análise, afundo, SSR
npm run build          # build de produção
npm run verify         # os quatro acima, em sequência
```

Verificação de fluxo em navegador real, contra o build de produção:

```bash
npm run build && npm run test:e2e        # servidor Node, 51 verificações
npm run build:static && npm run test:static   # export estático, 8 verificações
```

O script sobe `next start`, abre o Chromium e checa 55 pontos: HTML entregue pelo servidor, navegação, busca, filtros, modal com teclado, geração e persistência da rotina, análise de demonstração ponta a ponta, execução de referência, as 15 frases de microcopy obrigatória, player de vídeo que só carrega no clique e pelo domínio sem cookie, ausência de rolagem horizontal em desktop e celular. Ele também salva capturas em `e2e/`.

## Publicar

O passo a passo completo para a Hostinger está em [DEPLOY.md](./DEPLOY.md). Em resumo, há dois modos de build:

```bash
npm run build          # servidor Node (next start, Vercel, VPS, plano Business ou Cloud)
npm run build:static   # site estático em out/, sobe em qualquer hospedagem de arquivos
```

As três rotas são pré-renderizadas: o HTML entregue já contém o produto, nunca um esqueleto. O modo estático inclui `.htaccess` com o tipo MIME `application/wasm`, sem o qual o motor de análise não carrega em servidor Apache.

`better-sqlite3` é dependência **opcional** e fica fora do bundle via `serverExternalPackages`: se o ambiente não conseguir compilar o módulo nativo, a instalação continua e o catálogo embutido assume. Para usar o banco em produção, inclua `data/glowy-move.db` no deploy e defina `GLOWY_MOVE_DB_PATH`.

## Marca

A logomarca do Glowy Move está em `brand/`: as três variações canônicas em SVG e PNG, o favicon, a folha de especificação (`folha-de-marca.png`) e as regras de uso (`marca-glowy-move.md`).

A geometria é gerada por `brand/marca.py`. Rodar `python3 brand/marca.py` regenera todas as variações, o favicon e o componente `src/components/brand-mark.tsx` de uma vez. Não edite esses SVGs à mão: a próxima geração sobrescreve.

## Mapa do código

```
brand/                       logomarca: SVGs, PNGs, folha de especificação e gerador
src/app/                     rotas: / (análise), /exercicios, /rotina
src/components/analyze/      escolha, upload, progresso, resultado, overlay, referência
src/components/library/      biblioteca e modal de detalhes
src/components/planner/      planejador semanal
src/lib/analysis/            motor de análise
  constants.ts               limiares de ciclo, regras, amostragem e score
  geometry.ts                índices de pontos, ângulos e medidas por quadro
  signal.ts                  interpolação, média móvel, percentis, mínimos locais
  cycles.ts                  histerese (estacionários) e vales (afundo contínuo)
  rules.ts                   regras de feedback com valor medido e cue
  analyze.ts                 orquestração, score e consistência
  pose-runner.ts             MediaPipe no navegador, GPU com fallback para CPU
  demo.ts                    sequência sintética da análise de demonstração
  video.ts                   validação de arquivo, duração e suporte do navegador
src/lib/planner.ts           rotina semanal determinística
src/lib/catalog.ts           catálogo embutido validado em tempo de carga
src/lib/exercise-merge.ts    fusão banco + catálogo com precedência do catálogo
db/                          schema Drizzle, cliente SQLite e seed
tests/                       vitest
e2e/smoke.mjs                verificação em navegador
```

## Como a análise funciona

1. O vídeo é lido por `URL.createObjectURL`, sem upload. Tipo, tamanho (250 MB) e duração (45 s) são validados antes de tudo.
2. O PoseLandmarker roda em `runningMode: VIDEO`, com `numPoses: 1` e confianças de detecção, presença e rastreio em 0,48. Tenta GPU e cai para CPU.
3. O vídeo é percorrido a 10 quadros por segundo, com timestamp em milissegundos.
4. A qualidade de cada quadro é a visibilidade média das articulações do perfil. Quadros abaixo de 0,32 são descartados, e a análise exige o maior valor entre 12 quadros e 35% do amostrado.
5. A série de ângulos passa por média móvel de raio 2.
6. Agachamento, flexão e rosca são segmentados por histerese (alto, descida, retorno ao alto). O afundo caminhando é contínuo: cada passada é um vale proeminente na flexão do joelho, com amplitude estimada por percentis 15% e 85% da própria sequência, sem exigir volta à posição neutra.
7. Cada ciclo recebe seus alertas, com valor medido, cue prático, severidade, confiança, número e timestamp. O score é `clamp(round(96 - 11 x alertas), 58, 98)` e a consistência é a média dos scores.

## Limites declarados

Resultado visual, não diagnóstico. As estimativas vêm da posição das articulações e podem errar com roupa larga, pouca luz, enquadramento parcial ou câmera em movimento. A rotina é sugestão educacional montada por regras, não prescrição. Dor, lesão, gestação ou condição clínica pedem orientação de um profissional qualificado.

Não há reconhecimento facial, o vídeo não é armazenado e nenhum dado físico é enviado para serviços externos. Não existe conta, histórico em nuvem nem IA externa neste código: a ação "Minhas análises" apenas informa isso, sem simular persistência.
