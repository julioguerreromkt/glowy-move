"""Logomarca oficial do Glowy Move.

Uma fita única e fechada: ela atravessa como onda, faz meia-volta na direita,
volta como a onda invertida e fecha na esquerda, cruzando a si mesma duas vezes.
A silhueta resultante é o M do Move; os dois cruzamentos são as duas trajetórias
que o produto compara.

Fonte única de verdade da geometria. Rodar este arquivo regenera todas as
variações, o favicon, os PNGs e o componente do app.
"""
import io, math, os
from wordmark import outline

# ---- Paleta ROTA 1 (glowy-brand-guidelines). Nenhum hex fora desta lista. ----
INK  = '#E8EEF4'
CYAN = '#00FFFF'
NAVY = '#0A1628'

# ---- Geometria ----
W, H = 130.0, 96.0
U0, U1 = 0.13, 0.87
A_MID, A_AMP = 0.2915, 0.2430
B_MID, B_AMP = 0.5725, 0.3725
APERTO = 0.72            # quanto as meias-voltas laterais fecham
SW = 9.2

def _ya(u): return A_MID - A_AMP * math.cos(2*math.pi*(u-U0)/(U1-U0))
def _yb(u): return B_MID + B_AMP * math.cos(2*math.pi*(u-U0)/(U1-U0))

def _pontos(n=60):
    pts = []
    for i in range(n+1):
        u = U0 + (U1-U0)*i/n
        pts.append((u*W, _ya(u)*H))
    cx, cy = U1*W, (_ya(U1)+_yb(U1))/2*H
    rx, ry = (1.0-U1)*W*APERTO, (_yb(U1)-_ya(U1))/2*H
    for i in range(1, 24):
        t = math.pi*i/24
        pts.append((cx + rx*math.sin(t), cy - ry*math.cos(t)))
    for i in range(n+1):
        u = U1 - (U1-U0)*i/n
        pts.append((u*W, _yb(u)*H))
    cx, rx = U0*W, U0*W*APERTO
    for i in range(1, 24):
        t = math.pi*i/24
        pts.append((cx - rx*math.sin(t), cy + ry*math.cos(t)))
    return pts

def _curva(pts, fechada):
    n = len(pts)
    d = [f'M{pts[0][0]:.2f} {pts[0][1]:.2f}']
    limite = n if fechada else n-1
    for i in range(limite):
        p0 = pts[(i-1) % n] if fechada else (pts[i-1] if i > 0 else pts[i])
        p1 = pts[i % n]
        p2 = pts[(i+1) % n]
        p3 = pts[(i+2) % n] if fechada else (pts[i+2] if i+2 < n else pts[i+1])
        c1 = (p1[0] + (p2[0]-p0[0])/6, p1[1] + (p2[1]-p0[1])/6)
        c2 = (p2[0] - (p3[0]-p1[0])/6, p2[1] - (p3[1]-p1[1])/6)
        d.append(f'C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}')
    return ' '.join(d) + (' Z' if fechada else '')

def simbolo(cor, cor2=None, sw=SW):
    """Uma cor: a fita inteira em traço fechado.
    Duas cores: a ida recebe o neutro e a volta recebe o acento."""
    pts = _pontos()
    if not cor2 or cor2 == cor:
        return (f'  <path d="{_curva(pts, True)}" fill="none" stroke="{cor}" stroke-width="{sw}" '
                f'stroke-linejoin="round" stroke-linecap="round"/>')
    meia = len(pts)//2
    volta = pts[meia:] + [pts[0]]
    ida = pts[:meia+1]
    return (f'  <path d="{_curva(volta, False)}" fill="none" stroke="{cor2}" stroke-width="{sw}" '
            f'stroke-linejoin="round" stroke-linecap="round"/>\n'
            f'  <path d="{_curva(ida, False)}" fill="none" stroke="{cor}" stroke-width="{sw}" '
            f'stroke-linejoin="round" stroke-linecap="round"/>')

def svg_simbolo(cor, cor2=None):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" '
            f'width="{W:.0f}" height="{H:.0f}" role="img" aria-label="Glowy Move">\n'
            + simbolo(cor, cor2) + '\n</svg>\n')

# ---- Logotipo em contornos, sem depender da fonte instalada ----
CAP = 20.0
GLOWY_D, GLOWY_W = outline('GLOWY', 700, CAP, 0.13)
def _track(alvo):
    lo, hi = 0.0, 0.8
    for _ in range(60):
        mid = (lo+hi)/2
        if outline('MOVE', 300, CAP, mid)[1] < alvo: lo = mid
        else: hi = mid
    return (lo+hi)/2
MOVE_D, MOVE_W = outline('MOVE', 300, CAP, _track(GLOWY_W))

def lockup_horizontal(cor, cor2, cg, cm):
    s = 0.72
    sw, sh = W*s, H*s
    gap, linha = 20, CAP*1.62
    LW = sw + gap + max(GLOWY_W, MOVE_W)
    LH = max(sh, linha + CAP)
    ty = (LH - (linha + CAP))/2
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LW:.1f} {LH:.1f}" width="{LW:.0f}" height="{LH:.0f}" role="img" aria-label="Glowy Move">
  <g transform="translate(0 {(LH-sh)/2:.2f}) scale({s})">
{simbolo(cor, cor2)}
  </g>
  <g transform="translate({sw+gap:.2f} {ty+CAP:.2f})"><path d="{GLOWY_D}" fill="{cg}"/></g>
  <g transform="translate({sw+gap:.2f} {ty+linha+CAP:.2f})"><path d="{MOVE_D}" fill="{cm}"/></g>
</svg>
'''

def lockup_vertical(cor, cor2, cg, cm):
    s = 0.98
    sw, sh = W*s, H*s
    gap, linha = 18, CAP*1.62
    LW = max(sw, GLOWY_W)
    LH = sh + gap + linha + CAP
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LW:.1f} {LH:.1f}" width="{LW:.0f}" height="{LH:.0f}" role="img" aria-label="Glowy Move">
  <g transform="translate({(LW-sw)/2:.2f} 0) scale({s})">
{simbolo(cor, cor2)}
  </g>
  <g transform="translate({(LW-GLOWY_W)/2:.2f} {sh+gap+CAP:.2f})"><path d="{GLOWY_D}" fill="{cg}"/></g>
  <g transform="translate({(LW-MOVE_W)/2:.2f} {sh+gap+linha+CAP:.2f})"><path d="{MOVE_D}" fill="{cm}"/></g>
</svg>
'''

VARIACOES = {
    'a-branca':  (INK,  None, INK,  INK),
    'b-escura':  (NAVY, None, NAVY, NAVY),
    'c-produto': (INK,  CYAN, CYAN, INK),
}

if __name__ == '__main__':
    os.makedirs('logo', exist_ok=True)
    for f in os.listdir('logo'):
        if f.endswith('.svg'): os.remove(f'logo/{f}')
    for nome, (c1, c2, cg, cm) in VARIACOES.items():
        io.open(f'logo/simbolo-{nome}.svg','w',encoding='utf-8').write(svg_simbolo(c1, c2))
        io.open(f'logo/horizontal-{nome}.svg','w',encoding='utf-8').write(lockup_horizontal(c1, c2, cg, cm))
        io.open(f'logo/vertical-{nome}.svg','w',encoding='utf-8').write(lockup_vertical(c1, c2, cg, cm))
    favicon = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130">'
               '<rect width="130" height="130" rx="29" fill="#0A1628"/>'
               '<g transform="translate(0 17)">'
               + simbolo(INK, CYAN).replace('\n','') + '</g></svg>\n')
    io.open('logo/favicon.svg','w',encoding='utf-8').write(favicon)
    tsx = ('/**\n * Logomarca do Glowy Move, variação C (produto).\n'
           ' * Geometria gerada por brand/marca.py. Não editar à mão:\n'
           ' * alterar lá e regerar mantém app, favicon e materiais em sincronia.\n */\n'
           "export function BrandMark({ className = 'h-7' }: { className?: string }) {\n"
           '  return (\n'
           '    <span className={`inline-flex ${className}`} aria-hidden="true">\n'
           f'      <svg viewBox="0 0 {W:.0f} {H:.0f}" className="h-full w-auto" role="presentation" focusable="false">\n'
           + simbolo(INK, CYAN) + '\n'
           '      </svg>\n    </span>\n  );\n}\n')
    io.open('/home/claude/glowy-move/src/components/brand-mark.tsx','w',encoding='utf-8').write(tsx)
    io.open('/home/claude/glowy-move/src/app/icon.svg','w',encoding='utf-8').write(favicon)
    print(len([f for f in os.listdir("logo") if f.endswith(".svg")]), 'SVGs + app e favicon regenerados')
