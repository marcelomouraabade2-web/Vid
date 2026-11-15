# Trilha de fundo procedural: "pad" orquestral quente, progressão I–vi–IV–V (Fá maior), estilo musical de estúdio anos 60.
# Uso: python3 tools/music.py <duração_s> build/musica.wav
import sys, wave, numpy as np
D = float(sys.argv[1]); OUT = sys.argv[2]; SR = 48000
n = int(D * SR); t = np.arange(n) / SR
CH = [[53, 57, 60, 65], [50, 57, 62, 65], [46, 58, 62, 65], [48, 55, 60, 64]]  # F, Dm, Bb, C (MIDI)
LEN = 8.0
f = lambda m: 440 * 2 ** ((m - 69) / 12)
L = np.zeros(n); R = np.zeros(n)
for k in range(int(D / LEN) + 2):
    a, b = int((k * LEN - 1.5) * SR), int(((k + 1) * LEN + 1.5) * SR)
    a0, b0 = max(a, 0), min(b, n)
    if a0 >= b0: continue
    tt = t[a0:b0]; loc = tt - (k * LEN - 1.5); span = LEN + 3
    env = np.clip(loc / 2.2, 0, 1) * np.clip((span - loc) / 2.2, 0, 1)
    for i, m in enumerate(CH[k % 4]):
        for det, pan in ((-0.12, .3), (0.12, .7)):
            fr = f(m) * 2 ** (det / 12)
            s = sum(np.sin(2 * np.pi * fr * h * tt + i) / h ** 1.6 for h in (1, 2, 3, 4))
            L[a0:b0] += s * env * (1 - pan); R[a0:b0] += s * env * pan
# sino suave a cada compasso (celesta)
for k in range(int(D / 2)):
    m = CH[(k // 4) % 4][k % 4] + 24; a = int(k * 2 * SR); b = min(n, a + int(1.8 * SR))
    if a >= n: break
    tt = t[a:b] - t[a]; s = np.sin(2 * np.pi * f(m) * tt) * np.exp(-tt * 3) * .5
    L[a:b] += s * .6; R[a:b] += s * .4
st = np.stack([L, R], 1); st /= np.abs(st).max() + 1e-9; st *= .5
fade = np.clip(np.minimum(t / 3, (D - t) / 4), 0, 1)[:, None]; st *= fade
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
