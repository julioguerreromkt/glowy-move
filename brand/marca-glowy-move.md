# Glowy Move · logomarca

Ativo de identidade do Glowy Move, ferramenta digital de análise de movimento da Glowy Life.

## Conceito

Uma fita única e fechada. Ela atravessa a marca como onda, faz meia-volta na direita, volta como a onda invertida e fecha na esquerda, cruzando a si mesma duas vezes no caminho. A silhueta resultante é o M do Move. Os dois cruzamentos são a ideia central do produto: duas trajetórias do mesmo movimento, a de referência e a sua, comparadas ponto a ponto.

A construção é paramétrica, não desenhada à mão: duas senoides de amplitudes diferentes ligadas por meias-voltas elípticas, amostradas e convertidas em cúbicas. Por isso a curva é contínua de verdade, sem emenda visível em nenhum tamanho.

A paleta não foi escolhida aqui. É a ROTA 1 Deep Ocean Cyan, travada no `glowy-brand-guidelines` para ferramenta digital, a mesma do Chronos Map, MOB360 e Radar.

### Origem e independência

A direção partiu de uma imagem de referência trazida pelo fundador, uma marca de terceiro em fita contínua com gradiente. Dela veio a **ideia estrutural**: fita única, forma de M, entrelace. Proporção, ritmo das ondas, amplitude, espessura, acabamento das voltas e paleta são próprios.

A decisão de não perseguir a geometria da referência foi tomada de forma consciente em 02/09/2026, com o risco de colidência apresentado ao fundador e a escolha registrada. Recomendação em aberto: busca de anterioridade no INPI antes do uso público em escala.

## As três variações canônicas

| Variação | Quando usar | Arquivos |
|---|---|---|
| **A · Branca** | Fundos escuros, material institucional da Glowy Life | `logo/*-a-branca.svg` |
| **B · Escura** | Fundos claros, impresso, e-commerce, documentos | `logo/*-b-escura.svg` |
| **C · Produto** | O app Glowy Move e as peças do produto | `logo/*-c-produto.svg` |

Cada variação existe em três assinaturas: `simbolo-`, `horizontal-` e `vertical-`.

A variação C não vai para fundo claro. Ciano puro sobre branco não alcança contraste aceitável; nesse caso a regra é usar a variação B.

## Arquivos

```
logo/
  simbolo-{a-branca,b-escura,c-produto}.svg      símbolo isolado, 130x96
  horizontal-{...}.svg                            símbolo à esquerda, logotipo em duas linhas
  vertical-{...}.svg                              símbolo acima, logotipo centralizado
  favicon.svg                                     símbolo com fundo próprio, cantos arredondados
  png/                                            os mesmos arquivos em PNG com fundo transparente, 1400 px
folha-de-marca.png                                a especificação visual em uma página
marca.py                                          gerador: fonte única da geometria
wordmark.py                                       conversão do logotipo em contornos
```

O logotipo está em contornos vetoriais nos arquivos SVG, extraído da Outfit variável. Ninguém precisa ter a fonte instalada para abrir ou imprimir.

Alterar `marca.py` e rodar `python3 marca.py` regenera todas as variações de uma vez, incluindo o componente do app e o favicon. Não edite os SVGs à mão: a próxima geração sobrescreve.

## Cores

| Papel | HEX | RGB |
|---|---|---|
| Fundo | `#0A1628` | 10 22 40 |
| Acento | `#00FFFF` | 0 255 255 |
| Texto primário | `#E8EEF4` | 232 238 244 |
| Texto secundário | `#A8B8C8` | 168 184 200 |
| Texto terciário | `#7A8FA0` | 122 143 160 |

Nenhum hex fora desta lista entra na marca. Não há valor CMYK homologado: para impressão, converta a partir do HEX no perfil de cor da gráfica e valide prova física antes de tiragem.

## Tipografia do logotipo

Outfit. GLOWY em peso 700, MOVE em peso 300, ambos em caixa alta. O tracking do MOVE é calculado para que as duas linhas fechem exatamente na mesma largura.

## Regras de uso

- **Tamanho mínimo:** 22 px de largura para o símbolo em digital, 170 px para o lockup horizontal, 25 mm em impresso.
- **Área de proteção:** no mínimo uma altura de caixa alta do logotipo em todos os lados, livre de texto e de outros elementos.
- **Acento pontual:** a marca já consome o acento ciano da tela. Pela regra da ROTA 1, o restante da peça deve ficar em neutro.

## Proibido

Girar, distorcer proporções, achatar, aplicar gradiente, aplicar sombra, trocar as cores por outras fora da ROTA 1, sobrepor texto ao símbolo, usar a variação C em fundo claro, ou misturar duas variações na mesma peça.

## Rastreabilidade

Produzida na sessão de 02/09/2026 pela skill `criador-marca`, seguindo o Protocolo Anti-IA e a regra das três variações formalizada no `glowy-brand-guidelines` v0.4. Quatro rodadas de exploração até chegar aqui: figura humana, símbolos abstratos de medição, crescente com figura e fita entrelaçada.

Pendência declarada: esta é a variação de produto do Glowy Move, não a logomarca institucional da Glowy Life Nutrition. Ela não substitui as variações da marca-mãe e não foi registrada no artefato 1.7 de identidade visual do produto, que é território da `identidade-visual-produto`.
