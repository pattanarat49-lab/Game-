# A suspense score for the Riftborn intro, synthesised from scratch (no samples), timed to the video's cuts.
import numpy as np, wave, sys
SR = 44100
DUR = 60.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

def t_(d): return np.arange(int(d * SR)) / SR
def add(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * np.sqrt((1 - pan) / 2) * 1.414
    R[i:i + len(sig)] += sig * np.sqrt((1 + pan) / 2) * 1.414
def env(n, a, d, sus=1.0, rel=None):
    e = np.ones(n) * sus
    ai = max(1, int(a * SR)); e[:ai] = np.linspace(0, 1, ai) if ai < n else np.linspace(0, 1, n)[:ai]
    if d: di = int(d * SR); e[ai:ai + di] = np.linspace(1, sus, len(e[ai:ai + di]))
    if rel: ri = int(rel * SR); e[-ri:] *= np.linspace(1, 0, ri)
    return e
def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.zeros_like(x); acc = 0.0
    # vectorised one-pole via lfilter-like recursion in chunks
    from itertools import accumulate
    out = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; out[i] = s
    return out
def lp(x, cutoff):  # fast: FFT brickwall-ish smooth lowpass
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4); return np.fft.irfft(X, len(x))
def hp(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / (1 + (f / cutoff) ** 4); return np.fft.irfft(X, len(x))
def saw(freq, d, detune=0.0):
    t = t_(d); s = 0
    for k in range(1, 24):
        if freq * k > 12000: break
        s = s + np.sin(2 * np.pi * freq * (1 + detune) * k * t) / k
    return s * 0.6
def note(n): return 440 * 2 ** ((n - 69) / 12)
def kick(d=0.5, f0=150, f1=42, g=1.0):
    t = t_(d); f = f1 + (f0 - f1) * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * g
def snare(d=0.25):
    t = t_(d); return (rng.standard_normal(len(t)) * np.exp(-t * 18) * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.5)
def hat(d=0.06):
    t = t_(d); return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * 60) * 0.5
def boom(d=3.0, g=1.0):
    t = t_(d); f = 32 + 90 * np.exp(-t * 9)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    crack = lp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 7) * 0.8
    return np.tanh((body + crack) * 1.5) * g
def riser(d, f0=200, f1=3000, g=0.5):
    t = t_(d); x = t / d
    noise = rng.standard_normal(len(t)); tone = np.sin(2 * np.pi * np.cumsum(f0 * (f1 / f0) ** x) / SR)
    return (hp(noise, 800) * 0.25 + tone * 0.35) * x ** 2 * g
def chime(freq, d=2.5, g=0.35):
    t = t_(d); return (np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 5)) * np.exp(-t * 2.2) * g
def pad(notes, d, g=0.18, cutoff=1400, a=2.0, rel=1.0):
    s = sum(saw(note(n), d, 0.003) + saw(note(n), d, -0.004) for n in notes)
    return lp(s, cutoff) * env(len(s), a, 0, 1, rel) * g
def blip(f, d=0.07, g=0.25):
    t = t_(d); return np.sign(np.sin(2 * np.pi * f * t)) * env(len(t), 0.002, 0, 1, 0.01) * g

# Act 1, 0-12 s: calm, a soft pad and a music-box arpeggio around the crystal.
add(pad([45, 52, 57, 59, 60, 64], 12.2, 0.07, 1500, 2.5, 0.25), 0)
arp = [69, 72, 76, 71, 74, 77, 72, 76, 79, 74, 77, 81]
for i in range(20):
    add(chime(note(arp[i % len(arp)]), 2.2, 0.16), 1.0 + i * 0.52, pan=(-0.4 if i % 2 else 0.4))
# tape-stop into the glitch
tt = t_(0.5); add(np.sin(2 * np.pi * np.cumsum(220 * (1 - tt / 0.55)) / SR) * (1 - tt / 0.5) * 0.15, 11.5)

# Act 2, 12-23.4 s: the glitch. Error beeps, stutter, then the drone of THE GLITCH and a heartbeat.
for k, at in enumerate([12.5, 12.65, 13.6, 13.75, 14.8, 14.95, 15.3, 15.45, 15.7, 15.8]):
    add(blip(1320 if k % 2 == 0 else 990), at, pan=rng.uniform(-0.6, 0.6))
for i in range(26):
    at = 12.2 + rng.uniform(0, 11)
    burst = rng.standard_normal(int(SR * rng.uniform(0.02, 0.09)))
    burst = np.round(burst * 4) / 4 * 0.12  # crushed
    add(burst, at, pan=rng.uniform(-0.8, 0.8))
add(boom(2.5, 0.8), 17.6); add(boom(1.2, 0.4), 18.6)
dr = t_(7.6)
drone = np.tanh((saw(55, 7.6) + saw(55.7, 7.6) + 0.6 * np.sin(2 * np.pi * 36.7 * dr)) * 1.8)
add(lp(drone, 500) * np.linspace(0.05, 0.32, len(dr)), 16.0)
for i in range(9):
    add(kick(0.4, 90, 38, 0.55), 16.6 + i * 0.75); add(kick(0.3, 80, 36, 0.35), 16.6 + i * 0.75 + 0.22)
add(riser(2.0, 150, 2500, 0.5), 21.4)

# 23.4 s: the Rift Core shatters.
add(boom(3.5, 1.1), 23.4)
for i in range(40):
    add(chime(rng.uniform(2200, 7000), 1.6, 0.05), 23.4 + rng.uniform(0, 0.5), pan=rng.uniform(-0.9, 0.9))

# 23.4-30 s: the walls fall. Wind, a low drone, rifts tearing open, a riser into the fights.
w = t_(6.6); wind = lp(rng.standard_normal(len(w)), 700) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.35 * w)) * 0.12
add(wind * env(len(w), 1.0, 0, 1, 0.3), 23.6)
add(pad([33, 40, 45], 6.6, 0.12, 400, 1.5, 0.3), 23.6)
for k in range(4): add(boom(1.0, 0.45), 26.45 + k * 0.3, pan=(-0.5 + k / 3))
for at in [27.6, 28.6]:
    add(riser(0.6, 400, 1500, 0.35)[::-1] if False else riser(0.6, 1500, 300, 0.3), at, pan=rng.uniform(-0.5, 0.5))
add(riser(2.0, 120, 3200, 0.6), 28.0)

# Act 3, 30-54 s: the heroes fight. 132 BPM drums, a driving A-minor bass and stabs; hits on the cuts.
bpm = 132; beat = 60 / bpm; s16 = beat / 4
bassline = [33, 33, 45, 33, 33, 45, 31, 43, 33, 33, 45, 33, 36, 48, 31, 43]
start, end = 30.0, 54.0
t = start; step = 0
while t < end - 0.01:
    fast = t >= 47.0
    b = step % 16
    if b in (0, 8) or (fast and b in (4, 12)) or b == 10: add(kick(0.45, 150, 42, 0.8), t)
    if b in (4, 12): add(snare(), t, gain=0.5)
    if fast and b % 2 == 1 and t > 50.5: add(snare(0.12), t, gain=0.25 + 0.3 * (t - 50.5) / 3.5)
    if b % 2 == 0: add(hat(), t, pan=0.3, gain=0.6 if b % 4 else 0.9)
    bn = bassline[b]; bd = s16 * 0.9
    bs = lp(np.tanh(saw(note(bn), bd) * 2), 900) * env(int(bd * SR), 0.004, 0.05, 0.6, 0.02) * 0.22
    add(bs, t)
    if b == 0:
        root = [57, 57, 55, 53][(step // 16) % 4]
        stab = lp(saw(note(root), 0.35) + saw(note(root + 7), 0.35) + saw(note(root + 12), 0.35), 2600)
        add(stab * env(len(stab), 0.005, 0.2, 0.3, 0.1) * 0.11, t)
    t += s16; step += 1
for at in [30.0, 31.5, 32.9, 34.5, 36.0, 36.85, 37.75, 39.6, 41.0, 45.0, 47.0, 47.9, 48.8, 49.7, 50.6, 50.95, 51.3, 51.65]:
    add(boom(1.2, 0.55), at); add(snare(0.3), at, gain=0.5)
add(riser(3.0, 200, 4000, 0.6), 51.0)

# 54 s: the title. One huge hit, a dark held chord, crackles of THE GLITCH, a last chime under the line.
add(boom(4.0, 1.2), 54.0); add(boom(2.5, 0.8), 55.8)
add(pad([33, 45, 48, 52, 57], 6.0, 0.12, 900, 0.05, 1.5), 54.03)
for i in range(12):
    burst = np.round(rng.standard_normal(int(SR * rng.uniform(0.02, 0.06))) * 3) / 3 * 0.08
    add(burst, 54.5 + rng.uniform(0, 5), pan=rng.uniform(-0.8, 0.8))
for i, n in enumerate([69, 72, 76]):
    add(chime(note(n), 3.0, 0.14), 56.45 + i * 0.12)

# A little room: convolve with a decaying noise tail.
ir_t = t_(1.8); ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.2); ir[0] = 0
def conv(x):
    n = len(x) + len(ir); n2 = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, n2) * np.fft.rfft(ir, n2), n2)[: len(x)]
wetL, wetR = conv(L), conv(R)
k = 0.18 / np.abs(np.concatenate([wetL, wetR])).max() * np.abs(np.concatenate([L, R])).max()
L, R = L + wetL * k, R + wetR * k
fade = np.ones(N); fade[-int(0.8 * SR):] = np.linspace(1, 0, int(0.8 * SR))
mix = np.stack([L, R], 1) * fade[:, None]
mix = np.tanh(mix / np.abs(mix).max() * 1.6) / np.tanh(1.6) * 0.9
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("ok")
