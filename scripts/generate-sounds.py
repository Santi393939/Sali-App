"""
Placeholder sound families, one per tap-sound reward: a burst ("-cluster")
for +100/+300 and a flourish ("-big") for +1,000 and the number pad.
Replace with the purchased sound set later (same file names).

    python3 scripts/generate-sounds.py
"""
import math, random, struct, wave

SR = 44100
OUT = 'assets/sounds/'
random.seed(11)


def write(name, s, peak=0.7):
    pk = max(abs(x) for x in s) or 1
    with wave.open(OUT + name, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(x / pk * peak * 32767)) for x in s))


def mix(length, parts):
    out = [0.0] * int(SR * length)
    for start, samples, gain in parts:
        o = int(SR * start)
        for i, x in enumerate(samples):
            if o + i < len(out):
                out[o + i] += x * gain
    return out


def tone(dur, partials, decay, attack=0.002):
    n = int(SR * dur)
    return [min(1, (i / SR) / attack) * sum(a * math.exp(-d * (i / SR)) * math.sin(2 * math.pi * f * (i / SR)) for f, a, d in partials) for i in range(n)]


# ---- base voices ----
def knock(p=1.0):
    return [math.exp(-45 * t) * (math.sin(2 * math.pi * 170 * p * t) + 0.5 * math.sin(2 * math.pi * 410 * p * t)) + random.uniform(-1, 1) * 0.4 * math.exp(-400 * t)
            for t in (i / SR for i in range(int(SR * 0.12)))]

def clink(p=1.0):
    return tone(0.14, [(3150 * p, 1, 50), (4720 * p, 0.6, 60), (6900 * p, 0.3, 80)], 0)

def drop(p=1.0):
    return [math.exp(-28 * t) * min(1, t / 0.002) * math.sin(2 * math.pi * (1500 * p * t - 1300 * p * t * t)) for t in (i / SR for i in range(int(SR * 0.22)))]

def bell(f=1320, dur=0.5):
    return tone(dur, [(f, 1, 7), (f * 2, 0.5, 9), (f * 3, 0.25, 12)], 0, 0.003)

def gong(f=196, dur=0.8, d=4.5):
    return tone(dur, [(f, 1, d), (f * 1.5, 0.6, d + 1), (f * 3, 0.3, d + 2)], 0, 0.01)

def chirp(f0, f1, dur):
    out, ph = [], 0
    for i in range(int(SR * dur)):
        t = i / SR; f = f0 + (f1 - f0) * (t / dur); ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * math.sin(math.pi * t / dur))
    return out


# ---- cedar knock ----
write('knock-cluster.wav', mix(0.3, [(0, knock(1.0), 1), (0.07, knock(1.08), 0.9), (0.14, knock(0.95), 0.85), (0.2, knock(1.12), 0.7)]), 0.6)
write('knock-big.wav', mix(1.2, [(0, knock(1.0), 1), (0.16, knock(1.05), 1), (0.34, tone(0.85, [(392, 1, 4), (588, 0.6, 5), (784, 0.3, 6)], 0, 0.004), 0.9)]), 0.6)

# ---- tile clink ----
write('clink-cluster.wav', mix(0.36, [(i * 0.055, clink(1 + 0.06 * (i % 3)), 1 - 0.1 * i) for i in range(5)]), 0.45)
write('clink-big.wav', mix(1.0, [(i * 0.045, clink(0.9 + 0.08 * i), 0.9) for i in range(7)] + [(0.32, tone(0.65, [(2093, 1, 5), (3136, 0.6, 6), (4186, 0.35, 8)], 0), 0.9)]), 0.45)

# ---- water drop ----
write('drop-cluster.wav', mix(0.45, [(0, drop(1.0), 1), (0.08, drop(1.18), 0.8), (0.15, drop(0.9), 0.85), (0.23, drop(1.3), 0.6)]), 0.6)
splash = [random.uniform(-1, 1) * math.exp(-9 * t) * (1 - math.exp(-60 * t)) * 0.35 for t in (i / SR for i in range(int(SR * 0.6)))]
write('drop-big.wav', mix(1.2, [(0, drop(0.85), 1), (0.05, splash, 1)] + [(0.18 + i * 0.09, drop(1.1 + 0.15 * (i % 3)), 0.6 - 0.07 * i) for i in range(6)]), 0.6)

# ---- small bell ----
write('bell-cluster.wav', mix(0.7, [(0, bell(1320, 0.4), 1), (0.1, bell(1568, 0.4), 0.8), (0.2, bell(1760, 0.45), 0.7)]), 0.5)
write('bell-big.wav', mix(1.6, [(0, bell(1047, 1.2), 1), (0.12, bell(1319, 1.2), 0.85), (0.24, bell(1568, 1.3), 0.8), (0.5, bell(2093, 1.0), 0.5)]), 0.5)

# ---- soft gong ----
write('gong-cluster.wav', mix(1.0, [(0, gong(220, 0.6, 6), 1), (0.22, gong(262, 0.7, 6), 0.8)]), 0.6)
write('gong-big.wav', mix(2.2, [(0, gong(146, 2.0, 2.2), 1), (0.02, gong(196, 1.8, 2.6), 0.6)]), 0.6)

# ---- birdsong ----
write('birds-cluster.wav', mix(0.5, [(0, chirp(2600, 4300, 0.07), 1), (0.1, chirp(2900, 4700, 0.08), 0.9), (0.21, chirp(3100, 4500, 0.06), 0.8), (0.3, chirp(2700, 4900, 0.09), 0.7)]), 0.45)
song = [(0, chirp(2400, 3900, 0.12), 1), (0.16, chirp(3900, 2800, 0.1), 0.9), (0.3, chirp(2800, 4600, 0.08), 0.9), (0.42, chirp(3000, 4200, 0.07), 0.8),
        (0.52, chirp(3300, 5000, 0.07), 0.8), (0.64, chirp(4600, 3200, 0.14), 0.8), (0.85, chirp(2600, 4400, 0.09), 0.7)]
write('birds-big.wav', mix(1.1, song), 0.45)
print('done')
