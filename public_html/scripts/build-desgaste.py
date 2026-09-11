"""Textura de desgaste para el titular y el precio del pack (img/deco/desgaste-v2.webp).

POR QUE UNA IMAGEN Y NO UN FILTRO:
Safari NO ejecuta filtros SVG dentro de una mascara. El `feTurbulence` que
usabamos se veia en Chrome y en WebKit de escritorio, pero el Safari del movil
lo ignoraba y pintaba la letra limpia. Con la textura ya calculada no hay filtro
que ejecutar y el resultado es identico en todos los motores.

EL TAMANO DEL MORDISCO SE ELIGE CON UN PASO DE BANDA:
El ruido se genera en frecuencia y se deja pasar SOLO una banda.
  - frecuencias muy bajas  = manchas gigantes -> se tragan una palabra entera
  - frecuencias muy altas  = polvillo         -> parece un cepillo, no desgaste
Nos quedamos con la banda de en medio: mordiscos GRANDES y repartidos.
`F0` es el tamano tipico (600/F0 pixeles de textura) y `ANCHO` cuanta variedad
de tamanos se admite alrededor.

Sale PERIODICO por construccion (FFT), asi que repite sin costura.
La imagen es blanca con el dibujo en ALFA: vale de mascara de alfa Y de
luminancia, y por eso no depende de `mask-mode`.
"""
import os
import numpy as np
from PIL import Image

W, H = 600, 300
F0 = 9.0                 # frecuencia central: mordiscos de ~600/9 = 66 px
ANCHO = 4.5              # amplitud de la banda (variedad de tamanos)
UMBRAL = 0.27            # fraccion de area comida
SUAVE = 0.10             # borde del mordisco: mas alto = mas desgastado, menos recortado
SEMILLA = 7

rng = np.random.default_rng(SEMILLA)

fy = np.fft.fftfreq(H)[:, None] * H
fx = np.fft.fftfreq(W)[None, :] * W
f = np.sqrt(fx**2 + fy**2)

banda = np.exp(-((f - F0) ** 2) / (2 * ANCHO ** 2))
banda[0, 0] = 0

espectro = (rng.normal(size=(H, W)) + 1j * rng.normal(size=(H, W))) * banda
ruido = np.fft.ifft2(espectro).real

lo, hi = np.percentile(ruido, [1, 99])
ruido = np.clip((ruido - lo) / (hi - lo), 0, 1)

alfa = np.clip((ruido - UMBRAL) / SUAVE, 0, 1)

rgba = np.zeros((H, W, 4), dtype=np.uint8)
rgba[..., :3] = 255
rgba[..., 3] = (alfa * 255).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save('img/deco/desgaste-v2.webp', 'WEBP', quality=86, method=6)

bloques = alfa.reshape(6, H // 6, 10, W // 10).mean(axis=(1, 3))
comido = (1 - bloques) * 100
print('img/deco/desgaste-v2.webp  %dx%d  %.1f KB  comido %.0f%%  mordisco ~%.0f px de textura'
      % (W, H, os.path.getsize('img/deco/desgaste-v2.webp') / 1024, (alfa < .5).mean() * 100, W / F0))
print('uniformidad por bloque: min %.0f%%  max %.0f%%' % (comido.min(), comido.max()))
