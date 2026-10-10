"""Converte o logotipo em contornos vetoriais a partir da Outfit variável.
Assim o SVG final não depende de a fonte estar instalada em quem abrir."""
import io
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

SRC = "/home/claude/glowy-move/node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2"

def outline(text, weight, cap_height, tracking_em):
    font = TTFont(SRC)
    font = instancer.instantiateVariableFont(font, {"wght": weight}, inplace=False)
    upem = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    # altura de caixa alta real da fonte
    cap = font["OS/2"].sCapHeight if hasattr(font["OS/2"], "sCapHeight") and font["OS/2"].sCapHeight else upem * 0.7
    scale = cap_height / cap
    tracking = tracking_em * upem
    x = 0.0
    parts = []
    for ch in text:
        name = cmap.get(ord(ch))
        if name is None:
            x += upem * 0.3 + tracking
            continue
        pen = SVGPathPen(gs)
        # y invertido: SVG cresce para baixo
        tpen = TransformPen(pen, Transform(scale, 0, 0, -scale, x * scale, 0))
        gs[name].draw(tpen)
        d = pen.getCommands()
        if d:
            parts.append(d)
        x += gs[name].width + tracking
    total = (x - tracking) * scale
    return " ".join(parts), total

if __name__ == "__main__":
    d, w = outline("GLOWY", 700, 22, 0.13)
    print("GLOWY largura", round(w, 2), "| comandos", len(d))
    d2, w2 = outline("MOVE", 300, 22, 0.19)
    print("MOVE  largura", round(w2, 2))
