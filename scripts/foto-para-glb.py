"""
Transforma a FOTO de uma pizza (ou de qualquer prato achatado e redondo) num modelo 3D simplificado (.glb)
para a realidade aumentada: um "disco" com o contorno real da pizza, a foto como textura na face de cima,
e a lateral e o fundo na cor da borda. NÃO é um escaneamento: o lado de baixo e a altura são simplificados.

Uso:
  python scripts/foto-para-glb.py foto.jpg saida.glb --diametro 35 --recorte 0,250,896,990

  --diametro   diâmetro médio da pizza em cm (tamanho que aparece na mesa)
  --espessura  espessura em cm (padrão 1.8)
  --recorte    x0,y0,x1,y1 da região da foto que contém SÓ a pizza (para cortar textos e marcas)
  --debug      pasta onde salvar a imagem "endireitada" com o contorno, para conferir

Funciona melhor com foto de cima. Foto em ângulo (até uns 50°) é "endireitada" esticando a imagem na
vertical; a borda da frente fica um pouco distorcida. Precisa de: pip install numpy pillow
"""
import argparse
import io
import json
import math
import struct
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def segmentar(img: Image.Image) -> np.ndarray:
    """Separa a pizza do fundo neutro (cinza): a pizza é bem mais 'quente' e colorida que o fundo."""
    a = np.asarray(img).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    sat = (a.max(2) - a.min(2)) / (a.max(2) + 1.0)
    mask = (sat > 0.22) | ((r - b) > 30)
    m = Image.fromarray((mask * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))  # tira ruído
    m = m.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))  # fecha buracos pequenos
    return np.asarray(m) > 127


def inclinacao(mask: np.ndarray):
    """Razão entre os eixos da silhueta (menor/maior) e ângulo do eixo maior, por momentos estatísticos."""
    ys, xs = np.nonzero(mask)
    cov = np.cov(np.stack([xs, ys]))
    vals, vecs = np.linalg.eigh(cov)
    q = math.sqrt(vals[0] / vals[1])
    ang = math.degrees(math.atan2(vecs[1, 1], vecs[0, 1]))
    return q, ang, xs.mean(), ys.mean()


def perfil_radial(mask: np.ndarray, cx: float, cy: float, n: int, erode: float):
    """Distância do centro até a borda em n direções. Ignora buracos (queijo claro) e sombras fora da pizza."""
    h, w = mask.shape
    raios = []
    for k in range(n):
        t = 2 * math.pi * k / n
        dx, dy = math.cos(t), math.sin(t)
        ultimo, vazio, r = 0.0, 0, 0.0
        while True:
            x, y = int(round(cx + r * dx)), int(round(cy + r * dy))
            if not (0 <= x < w and 0 <= y < h):
                break
            if mask[y, x]:
                ultimo, vazio = r, 0
            else:
                vazio += 1
                if vazio >= 14:  # 14 px seguidos de fundo = saiu da pizza
                    break
            r += 1.0
        raios.append(max(ultimo - erode, 5.0))
    raios = np.array(raios)
    # suaviza (média móvel circular) para a borda não ficar serrilhada
    kern = np.ones(5) / 5
    ext = np.concatenate([raios[-2:], raios, raios[:2]])
    return np.convolve(ext, kern, mode="valid")


def montar_glb(args) -> None:
    img = Image.open(args.foto).convert("RGB")
    if args.recorte:
        x0, y0, x1, y1 = (int(v) for v in args.recorte.split(","))
        img = img.crop((x0, y0, x1, y1))
    w, h = img.size

    mask = segmentar(img)
    q, ang, _, _ = inclinacao(mask)
    k = min(max(1.0 / q, 1.0), 2.5)  # quanto esticar na vertical para "deitar" a pizza
    print(f"razão dos eixos {q:.2f} · ângulo do eixo maior {ang:.0f}° · esticar vertical x{k:.2f}")
    desvio = min(abs(ang % 180), 180 - abs(ang % 180))  # 0 = eixo maior na horizontal
    if desvio > 25:
        print("AVISO: a pizza parece girada na foto; o resultado pode sair distorcido.")

    nh = int(round(h * k))
    rect = img.resize((w, nh), Image.LANCZOS)
    mask_r = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize((w, nh), Image.BILINEAR)) > 127
    ys, xs = np.nonzero(mask_r)
    cx, cy = xs.mean(), ys.mean()

    N = 240
    raios = perfil_radial(mask_r, cx, cy, N, erode=9.0)  # recua 9 px para não pegar a franja do fundo nem a sombra
    ang_rad = np.array([2 * math.pi * i / N for i in range(N)])
    px = cx + raios * np.cos(ang_rad)
    py = cy + raios * np.sin(ang_rad)

    # escala: o diâmetro médio vira o valor pedido (em metros)
    s = (args.diametro / 100.0) / (2 * raios.mean())
    esp = args.espessura / 100.0

    # textura = região da foto endireitada que contém a pizza
    bx0, bx1 = int(max(px.min() - 2, 0)), int(min(px.max() + 2, w))
    by0, by1 = int(max(py.min() - 2, 0)), int(min(py.max() + 2, nh))
    bw, bh = bx1 - bx0, by1 - by0
    tex = rect.crop((bx0, by0, bx1, by1)).resize((args.tamanho_textura, args.tamanho_textura), Image.LANCZOS)
    buf = io.BytesIO()
    tex.save(buf, "JPEG", quality=88, optimize=True)
    jpeg = buf.getvalue()

    # cor da borda (lateral e fundo): mediana dos pixels logo dentro do contorno
    amostra = []
    for i in range(0, N, 3):
        for f in (0.97, 0.94):
            x = int(cx + raios[i] * f * math.cos(ang_rad[i]))
            y = int(cy + raios[i] * f * math.sin(ang_rad[i]))
            amostra.append(rect.getpixel((x, y)))
    crosta = np.median(np.array(amostra), axis=0) / 255.0
    crosta_escura = crosta * 0.75

    X = (px - cx) * s
    Z = (py - cy) * s
    U = (px - bx0) / bw
    V = (py - by0) / bh  # glTF: v cresce para baixo, igual ao eixo y da imagem

    def tri(lista, a, b, c, pos, normal):
        """Adiciona o triângulo com a orientação que aponta para o lado certo (normal desejada)."""
        pa, pb, pc = pos[a], pos[b], pos[c]
        n = np.cross(pb - pa, pc - pa)
        lista.extend([a, b, c] if np.dot(n, normal) >= 0 else [a, c, b])

    # ---- primitiva 0: face de cima (com a foto) ----
    pos0 = np.zeros((N + 1, 3), np.float32)
    uv0 = np.zeros((N + 1, 2), np.float32)
    pos0[0] = (0, esp, 0)
    uv0[0] = ((cx - bx0) / bw, (cy - by0) / bh)
    for i in range(N):
        pos0[i + 1] = (X[i], esp, Z[i])
        uv0[i + 1] = (U[i], V[i])
    nor0 = np.tile(np.array([0, 1, 0], np.float32), (N + 1, 1))
    idx0 = []
    for i in range(N):
        tri(idx0, 0, 1 + i, 1 + (i + 1) % N, pos0, np.array([0, 1, 0]))

    # ---- primitiva 1: lateral + fundo (cor da borda) ----
    pos1, nor1, idx1 = [], [], []
    for i in range(N):  # lateral: anel de cima (y=esp) e anel de baixo (y=0)
        rad = np.array([math.cos(ang_rad[i]), 0, math.sin(ang_rad[i])], np.float32)
        pos1.append((X[i], esp, Z[i]))
        nor1.append(rad)
        pos1.append((X[i], 0.0, Z[i]))
        nor1.append(rad)
    p1 = np.array(pos1, np.float32)
    for i in range(N):
        j = (i + 1) % N
        a, b, c, d = 2 * i, 2 * i + 1, 2 * j, 2 * j + 1  # topo_i, base_i, topo_j, base_j
        rad = (np.array(nor1[2 * i]) + np.array(nor1[2 * j]))
        tri(idx1, a, b, c, p1, rad)
        tri(idx1, c, b, d, p1, rad)
    base0 = len(pos1)  # fundo (disco de baixo)
    pos1.append((0.0, 0.0, 0.0))
    nor1.append(np.array([0, -1, 0], np.float32))
    for i in range(N):
        pos1.append((X[i], 0.0, Z[i]))
        nor1.append(np.array([0, -1, 0], np.float32))
    p1 = np.array(pos1, np.float32)
    for i in range(N):
        tri(idx1, base0, base0 + 1 + i, base0 + 1 + (i + 1) % N, p1, np.array([0, -1, 0]))
    nor1 = np.array(nor1, np.float32)

    # ---- montagem do arquivo GLB ----
    partes = []  # bytes de cada bufferView, alinhados a 4 bytes
    views = []

    def add_view(data: bytes, target=None):
        off = sum(len(p) for p in partes)
        partes.append(data + b"\x00" * ((4 - len(data) % 4) % 4))
        v = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target:
            v["target"] = target
        views.append(v)
        return len(views) - 1

    acc = []

    def add_acc(view, comp, count, tipo, mn=None, mx=None):
        a = {"bufferView": view, "componentType": comp, "count": count, "type": tipo}
        if mn is not None:
            a["min"], a["max"] = mn, mx
        acc.append(a)
        return len(acc) - 1

    def prim(pos, nor, idx, uv, material):
        pos = np.asarray(pos, np.float32)
        a_pos = add_acc(add_view(pos.tobytes(), 34962), 5126, len(pos), "VEC3", pos.min(0).tolist(), pos.max(0).tolist())
        a_nor = add_acc(add_view(np.asarray(nor, np.float32).tobytes(), 34962), 5126, len(pos), "VEC3")
        ind = np.asarray(idx, np.uint16)
        a_idx = add_acc(add_view(ind.tobytes(), 34963), 5123, len(ind), "SCALAR")
        attrs = {"POSITION": a_pos, "NORMAL": a_nor}
        if uv is not None:
            attrs["TEXCOORD_0"] = add_acc(add_view(np.asarray(uv, np.float32).tobytes(), 34962), 5126, len(pos), "VEC2")
        return {"attributes": attrs, "indices": a_idx, "material": material}

    prims = [prim(pos0, nor0, idx0, uv0, 0), prim(p1, nor1, idx1, None, 1)]
    img_view = add_view(jpeg)

    gltf = {
        "asset": {"version": "2.0", "generator": "mesa-digital foto-para-glb"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "prato"}],
        "meshes": [{"primitives": prims}],
        "materials": [
            {
                "name": "foto-do-prato",
                "pbrMetallicRoughness": {"baseColorTexture": {"index": 0}, "metallicFactor": 0.0, "roughnessFactor": 0.85},
            },
            {
                "name": "borda",
                "pbrMetallicRoughness": {
                    "baseColorFactor": [*map(float, crosta_escura), 1.0],
                    "metallicFactor": 0.0,
                    "roughnessFactor": 0.95,
                },
            },
        ],
        "textures": [{"source": 0, "sampler": 0}],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
        "images": [{"bufferView": img_view, "mimeType": "image/jpeg"}],
        "buffers": [{"byteLength": sum(len(p) for p in partes)}],
        "bufferViews": views,
        "accessors": acc,
    }
    binario = b"".join(partes)
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(binario)
    saida = Path(args.saida)
    saida.parent.mkdir(parents=True, exist_ok=True)
    with open(saida, "wb") as f:
        f.write(b"glTF" + struct.pack("<II", 2, total))
        f.write(struct.pack("<I", len(js)) + b"JSON" + js)
        f.write(struct.pack("<I", len(binario)) + b"BIN\x00" + binario)
    print(f"gerado {saida} · {saida.stat().st_size / 1024:.0f} KB · diâmetro médio {args.diametro} cm · borda {tuple(int(c*255) for c in crosta)}")

    if args.debug:
        d = Path(args.debug)
        d.mkdir(parents=True, exist_ok=True)
        dbg = rect.copy()
        dr = ImageDraw.Draw(dbg)
        dr.line([*zip(px.tolist(), py.tolist()), (px[0], py[0])], fill=(0, 255, 0), width=3)
        dbg.save(d / "endireitada-com-contorno.jpg", quality=85)
        tex.save(d / "textura.jpg", quality=85)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Foto de pizza -> modelo 3D (.glb)")
    ap.add_argument("foto")
    ap.add_argument("saida")
    ap.add_argument("--diametro", type=float, default=35.0)
    ap.add_argument("--espessura", type=float, default=1.8)
    ap.add_argument("--recorte")
    ap.add_argument("--tamanho-textura", type=int, default=1024)
    ap.add_argument("--debug")
    montar_glb(ap.parse_args())

