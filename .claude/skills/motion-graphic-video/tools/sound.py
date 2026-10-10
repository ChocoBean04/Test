"""Synthesize sound effects + a music bed for a motion-graphic video.

usage: python3 sound.py events.json notebook|paper out.wav

events.json comes from tools/events.mjs: {"duration": s, "sfx": [{"kind", "t", ...}]}.
Everything is generated from code (no samples), so there is nothing to license.
"""
import json
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
rng = np.random.default_rng(20260827)


# ---------------------------------------------------------------- helpers
def n_of(sec):
    return max(1, int(round(sec * SR)))


def tt(n):
    return np.arange(n) / SR


def _sos(kind, f, order=2):
    return signal.butter(order, f, btype=kind, fs=SR, output='sos')


def bp(x, lo, hi, order=2):
    return signal.sosfilt(_sos('band', [lo, min(hi, SR / 2 - 100)], order), x)


def lp(x, f, order=2):
    return signal.sosfilt(_sos('low', f, order), x)


def hp(x, f, order=2):
    return signal.sosfilt(_sos('high', f, order), x)


def noise(n):
    return rng.standard_normal(n)


def fade(n, a=0.006, r=0.03):
    e = np.ones(n)
    na, nr = min(n, n_of(a)), min(n, n_of(r))
    e[:na] = np.linspace(0, 1, na) ** 1.5
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


def bell(n, peak=0.5):
    x = np.linspace(0, 1, n)
    return np.where(x < peak, np.sin(np.pi / 2 * x / peak), np.cos(np.pi / 2 * (x - peak) / (1 - peak))) ** 2


def sweep_lp(x, f0, f1, shape):
    """one-pole low-pass whose cutoff follows f0 + (f1-f0)*shape (shape in 0..1, len == len(x))."""
    fc = f0 + (f1 - f0) * shape
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = a[i] * acc + (1 - a[i]) * x[i]
        y[i] = acc
    return y


def grain(n, rate=28, depth=0.6):
    g = lp(np.abs(noise(n)), rate)
    g = g / (np.max(g) + 1e-9)
    return (1 - depth) + depth * g


def tone(f, n, phase=0.0):
    return np.sin(2 * np.pi * f * tt(n) + phase)


def glide(f0, f1, n, curve=2.0):
    f = f0 + (f1 - f0) * (np.linspace(0, 1, n) ** (1 / curve))
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def click(n_ms=3, lo=1500, hi=7000):
    n = n_of(n_ms / 1000)
    return bp(noise(n), lo, hi) * np.exp(-np.linspace(0, 6, n))


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------------------------------------------------------------- sound effects (mono)
def sfx_pen(dur, **_):
    n = n_of(dur + 0.03)
    x = noise(n)
    s = bp(x, 2400, 7800) * 0.65 + bp(x, 700, 1900) * 0.3
    return s * grain(n, 32, 0.65) * fade(n, 0.006, 0.03) * 0.16


def sfx_marker(dur, **_):
    n = n_of(dur + 0.05)
    x = noise(n)
    s = bp(x, 900, 3600) * 0.75 + bp(x, 3600, 9000) * 0.18
    squeak = np.sin(2 * np.pi * np.cumsum(1950 + 60 * np.sin(2 * np.pi * 7 * tt(n))) / SR) * 0.035
    return (s * grain(n, 10, 0.35) + squeak * bell(n, 0.3)) * fade(n, 0.015, 0.05) * 0.2


def sfx_write(dur, n=8, **_):
    total = n_of(dur + 0.1)
    out = np.zeros(total)
    strokes = max(3, int(n * 2.6))
    for _ in range(strokes):
        d = rng.uniform(0.035, 0.11)
        st = n_of(rng.uniform(0, max(0.01, dur - d)))
        s = sfx_pen(d) * rng.uniform(0.6, 1.0)
        out[st:st + len(s)] += s[:total - st]
    return out * 0.75


def sfx_whoosh(dur, dist=1920, **_):
    n = n_of(dur + 0.25)
    shape = bell(n, 0.5)
    x = lp(noise(n), 7000)
    y = sweep_lp(x, 180, 2600, shape)
    y = hp(y, 90)
    g = min(1.0, dist / 1920) ** 0.7
    return y * shape * 0.55 * g


def sfx_swish(dur=0.5, **_):
    d = min(0.7, max(0.25, dur * 0.5))
    n = n_of(d)
    shape = bell(n, 0.35)
    y = sweep_lp(hp(noise(n), 800), 900, 5200, shape)
    return y * shape * 0.12


def sfx_paper(**_):
    n = n_of(0.22)
    out = np.zeros(n)
    for _ in range(rng.integers(4, 8)):
        c = click(rng.uniform(3, 12), 1400, 7500) * rng.uniform(0.2, 0.55)
        st = n_of(rng.uniform(0, 0.09))
        out[st:st + len(c)] += c[:n - st]
    th = np.sin(2 * np.pi * 78 * tt(n)) * np.exp(-tt(n) / 0.045) * 0.3
    body = lp(noise(n), 380) * np.exp(-tt(n) / 0.03) * 0.25
    return (out + th + body) * 0.8


def sfx_drop(dur=0.42, **_):
    n = n_of(dur)
    shape = np.linspace(0, 1, n) ** 2
    y = sweep_lp(hp(noise(n), 300), 2400, 700, np.linspace(0, 1, n))
    return y * shape * 0.1


def sfx_thud(**_):
    n = n_of(0.28)
    t = tt(n)
    body = glide(150, 62, n, 3.0) * np.exp(-t / 0.07) * 0.55
    knock = lp(noise(n), 1800) * np.exp(-t / 0.012) * 0.25
    return (body + knock) * fade(n, 0.002, 0.04)


def sfx_pop(soft=0, big=0, gain=1.0, **_):
    f0 = rng.uniform(560, 760) if not big else 380
    d = 0.09 if not big else 0.16
    n = n_of(d)
    t = tt(n)
    y = glide(f0, f0 * 0.72, n, 1.5) * np.exp(-t / (0.03 if not big else 0.05))
    y[:len(click(2))] += click(2) * 0.4
    return y * (0.16 if soft else 0.28) * (1.6 if big else 1.0) * gain


def sfx_lift(dur=0.6, **_):
    n = n_of(dur + 0.3)
    return glide(260, 390, n, 1.0) * bell(n, 0.4) * 0.05


def sfx_jump(dur=0.8, **_):
    n = n_of(dur)
    shape = bell(n, 0.45)
    y = sweep_lp(hp(noise(n), 400), 700, 3800, shape) * 0.14 + glide(300, 720, n, 1.0) * 0.05
    return y * shape


def sfx_buzz(dur=0.6, **_):
    n = n_of(dur)
    t = tt(n)
    y = sum(np.sin(2 * np.pi * k * 92 * t) / k for k in (1, 3, 5, 7)) + sum(np.sin(2 * np.pi * k * 97.5 * t) / k for k in (1, 3, 5))
    y = lp(y, 650) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * t))
    return y * fade(n, 0.01, 0.15) * 0.08


def sfx_slide(dur=0.6, **_):
    n = n_of(dur + 0.05)
    y = bp(noise(n), 450, 2600) * grain(n, 18, 0.5)
    return y * fade(n, 0.04, 0.12) * 0.1


def kalimba(f, dur=1.6, vel=1.0):
    n = n_of(dur)
    t = tt(n)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.75)
    y += 0.32 * np.sin(2 * np.pi * 5.93 * f * t) * np.exp(-t / 0.07)
    y += 0.10 * np.sin(2 * np.pi * 15.4 * f * t) * np.exp(-t / 0.018)
    y += 0.06 * np.sin(2 * np.pi * f * 1.003 * t) * np.exp(-t / 0.9)
    y[:n_of(0.004)] += click(4, 2000, 8000)[:n_of(0.004)] * 0.15
    return y * (1 - np.exp(-t / 0.0015)) * vel


PENTA = [72, 74, 76, 79, 81, 84, 86, 88]


def sfx_grow(step=0, **_):
    a = PENTA[min(step, 4)]
    b = PENTA[min(step + 2, 7)]
    y = kalimba(midi(a), 1.4, 0.32)
    z = kalimba(midi(b), 1.3, 0.3)
    out = np.zeros(len(y) + n_of(0.11))
    out[:len(y)] += y
    out[n_of(0.11):n_of(0.11) + len(z)] += z
    return out * 0.7


def sfx_shrink(dur=3.6, **_):
    n = n_of(dur + 0.3)
    y = glide(430, 170, n, 0.8) * 0.06 + lp(noise(n), 260) * 0.05
    return y * bell(n, 0.3)


def sfx_pit(dur=1.4, **_):
    n = n_of(dur + 1.2)
    t = tt(n)
    y = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.4 * t)) * bell(n, 0.35)
    return lp(y, 300) * 0.12


def sfx_flip(**_):
    a = sfx_swish(0.5)
    out = np.zeros(len(a) + n_of(0.1))
    out[:len(a)] += a
    out[n_of(0.1):n_of(0.1) + len(a)] += a * 0.7
    c = click(6, 1200, 6000) * 0.25
    out[n_of(0.16):n_of(0.16) + len(c)] += c
    return out


def sfx_clack(**_):
    n = n_of(0.12)
    t = tt(n)
    y = bp(noise(n), 700, 3200) * np.exp(-t / 0.018) * 0.5 + np.sin(2 * np.pi * 210 * t) * np.exp(-t / 0.035) * 0.4
    return y


def sfx_tick(**_):
    n = n_of(0.15)
    t = tt(n)
    y = (np.sin(2 * np.pi * 1150 * t) + 0.6 * np.sin(2 * np.pi * 1730 * t)) * np.exp(-t / 0.03) * 0.3
    y += np.sin(2 * np.pi * 130 * t) * np.exp(-t / 0.04) * 0.3
    return y


def sfx_flick(dur=0.6, **_):
    n = n_of(dur)
    shape = bell(n, 0.5)
    return sweep_lp(hp(noise(n), 1500), 1500, 6000, shape) * shape * 0.05


def sfx_ring(step=0, **_):
    f = midi(PENTA[step % len(PENTA)] + 12)
    n = n_of(2.2)
    t = tt(n)
    y = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) for a, r, d in ((1, 1, 1.3), (0.4, 2.76, 0.6), (0.2, 5.4, 0.25)))
    return y * (1 - np.exp(-t / 0.002)) * 0.07


def sfx_lamp(**_):
    n = n_of(0.12)
    t = tt(n)
    y = np.zeros(n)
    c = click(2, 2000, 7000) * 0.9
    y[:len(c)] += c
    y += np.sin(2 * np.pi * 145 * t) * np.exp(-t / 0.018) * 0.35
    return y * 0.8


def sfx_tape(**_):
    n = n_of(0.24)
    t = tt(n)
    am = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * np.cumsum(rng.uniform(60, 140, n)) / SR))
    return bp(noise(n), 2000, 9000) * lp(am, 400) * fade(n, 0.005, 0.06) * 0.12


def sfx_ghost(dur=1.3, **_):
    n = n_of(dur + 0.4)
    y = hp(noise(n), 3000) * 0.04 + np.sin(2 * np.pi * 820 * tt(n)) * 0.012 * (1 + np.sin(2 * np.pi * 5 * tt(n)))
    return y * bell(n, 0.4)


SFX = {k[4:]: v for k, v in globals().items() if k.startswith('sfx_')}
GAIN = {'pen': 0.75, 'write': 0.8, 'marker': 0.9}


# ---------------------------------------------------------------- music
def piano(m, dur, vel):
    f = midi(m)
    n = n_of(dur + 2.6)
    t = tt(n)
    y = np.zeros(n)
    B = 0.00032
    for k in range(1, 11):
        fk = k * f * np.sqrt(1 + B * k * k)
        if fk > 9000:
            break
        y += (1 / k ** 1.35) * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28)) * np.exp(-t * (0.75 + 0.42 * k) * (f / 260) ** 0.35)
    y *= 1 - np.exp(-t / 0.004)
    y += lp(noise(n), 2200) * np.exp(-t / 0.008) * 0.03
    # damper after the key is released
    rel = n_of(dur)
    if rel < n:
        y[rel:] *= np.exp(-np.arange(n - rel) / n_of(0.35))
    return lp(y, 3200) * vel


def pad(ms, dur, gain=0.03, cutoff=1000):
    n = n_of(dur + 1.5)
    t = tt(n)
    y = np.zeros(n)
    for m in ms:
        f = midi(m)
        for det in (-0.12, 0.0, 0.11):
            ph = (f * 2 ** (det / 12) * t) % 1.0
            y += 2 * ph - 1
    y = lp(y, cutoff, 2)
    e = np.minimum(1, t / 0.9) * np.where(t > dur, np.exp(-(t - dur) / 0.9), 1)
    return y * e * gain / len(ms)


def bass(m, dur, vel=0.5):
    f = midi(m)
    n = n_of(dur + 0.4)
    t = tt(n)
    y = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.9) * (1 - np.exp(-t / 0.006))
    return y * vel


def add(buf, sig, t, pan=0.0, gain=1.0):
    i = n_of(t)
    if i >= buf.shape[1]:
        return
    s = sig[:buf.shape[1] - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + len(s)] += s * l
    buf[1, i:i + len(s)] += s * r


def human(t, amt=0.012):
    return max(0.0, t + rng.uniform(-amt, amt))


def music_notebook(dur):
    """warm felt piano, lo-fi study feel, D major, 72 bpm."""
    buf = np.zeros((2, n_of(dur + 4)))
    beat = 60 / 72
    bar = beat * 4
    prog = [  # (bass, right-hand voicing)
        (38, [57, 61, 64, 66]),   # Dmaj9
        (35, [54, 57, 62, 64]),   # Bm11
        (31, [54, 59, 62, 64]),   # Gmaj7(6)
        (33, [52, 57, 59, 62]),   # Asus
    ]
    melody = {1: [(2, 78)], 3: [(1.5, 76), (2.5, 74)], 5: [(2, 81), (3, 78)], 7: [(1, 76), (2, 73)]}
    nbars = int(dur / bar) + 1
    end_sparse = dur - 22  # the closing quote: slow down
    for b in range(nbars):
        t0 = b * bar
        if t0 > dur - 2:
            break
        bs, rh = prog[b % 4]
        sparse = b < 2 or t0 > end_sparse
        add(buf, bass(bs + 12, bar * 0.95, 0.32) * 0.6 + 0, t0, -0.1)
        add(buf, piano(bs, bar * 0.9, 0.42), human(t0), -0.25)
        if sparse:
            for j, m in enumerate(rh):
                add(buf, piano(m, bar * 0.9, 0.2), human(t0 + j * 0.06), 0.2 - 0.1 * j)
        else:
            order = [0, 2, 3, 1, 2, 3]
            pos = [0, 1.0, 1.5, 2.5, 3.0, 3.5]
            for p, k in zip(pos, order):
                add(buf, piano(rh[k], beat * 1.4, rng.uniform(0.16, 0.22)), human(t0 + p * beat), 0.3 - 0.15 * k)
            for p, m in melody.get(b % 8, []):
                add(buf, piano(m, beat * 1.6, 0.17), human(t0 + p * beat), 0.15)
    # final chord rings out under the pull-back
    add(buf, piano(38, 6, 0.4), dur - 6.5, -0.2)
    for j, m in enumerate([57, 61, 64, 66, 69]):
        add(buf, piano(m, 6, 0.2), dur - 6.5 + j * 0.09, 0.25 - 0.1 * j)
    return buf


def music_paper(dur):
    """kalimba + soft pad, C major → A minor (the danger part) → back to C."""
    buf = np.zeros((2, n_of(dur + 4)))
    beat = 60 / 96
    bar = beat * 4
    C, G_B, Am, F, Dm, E, G = ([48, [60, 64, 67]], [47, [59, 62, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]],
                                [38, [57, 62, 65]], [40, [56, 59, 64]], [43, [59, 62, 67]])
    nbars = int(dur / bar) + 1
    for b in range(nbars):
        t0 = b * bar
        if t0 > dur - 1.5:
            break
        if b < 11:
            sec, ch = 'A', [C, G_B, Am, F][b % 4]
        elif b < 28:
            sec, ch = 'B', [Am, F, Dm, E][(b - 11) % 4]
        elif b < 34:
            sec, ch = 'C', [Am, Am, F, E][(b - 28) % 4]
        elif b < nbars - 4:
            sec, ch = 'D', [F, G, C, Am][(b - 34) % 4]
        else:
            sec, ch = 'E', [C, F, G, C][min(3, b - (nbars - 4))]
        root, tri = ch
        cut = {'A': 1300, 'B': 700, 'C': 650, 'D': 1500, 'E': 1700}[sec]
        add(buf, pad([m + 12 for m in tri], bar, 0.028 if sec != 'B' else 0.024, cut), t0, 0)
        add(buf, bass(root, bar * 0.9, 0.34), t0, -0.05)
        if sec == 'C':
            for k in range(1, 8):
                add(buf, bass(root, beat * 0.4, 0.14), t0 + k * beat / 2, 0)
        notes = tri + [tri[0] + 12, tri[1] + 12]
        if sec in ('A', 'E') or (sec == 'D' and b >= 42):
            steps = [(i * 0.5, notes[[0, 2, 1, 3, 2, 4, 3, 1][i]]) for i in range(8)]
            hi = 12 if (sec == 'D' and b >= 50) else 0
        elif sec == 'D':
            steps = [(i, notes[[0, 2, 3, 4][i]]) for i in range(4)]
            hi = 0
        else:  # B / C: sparse and low
            steps = [(0, notes[0] - 12), (1.5, notes[1] - 12), (3, notes[2] - 12)] if b % 2 == 0 else [(0.5, notes[2] - 12), (2.5, notes[1] - 12)]
            hi = 0
        for p, m in steps:
            v = rng.uniform(0.11, 0.16)
            add(buf, kalimba(midi(m + 12 + hi), 1.6, v), human(t0 + p * beat, 0.008), rng.uniform(-0.45, 0.45))
    # closing chord
    end = dur - 3.2
    for j, m in enumerate([72, 76, 79, 84]):
        add(buf, kalimba(midi(m), 2.5, 0.16), end + j * 0.12, -0.3 + 0.2 * j)
    add(buf, pad([60, 64, 67, 72], 2.5, 0.03, 1500), end, 0)
    return buf


# ---------------------------------------------------------------- reverb + mix
def reverb(buf, seconds=2.2, wet=0.3, damp=4500):
    n = n_of(seconds)
    t = tt(n)
    out = np.zeros_like(buf)
    for ch in range(2):
        ir = lp(noise(n), damp) * np.exp(-t / (seconds / 6.5))
        ir[:n_of(0.012)] = 0
        ir /= np.sqrt(np.sum(ir ** 2))
        out[ch] = signal.fftconvolve(buf[ch], ir)[:buf.shape[1]]
    return buf * (1 - wet) + out * wet * 2.2


def main():
    events_path, style, out = sys.argv[1:4]
    data = json.load(open(events_path))
    dur = float(data['duration'])
    fx = np.zeros((2, n_of(dur + 4)))
    for e in data['sfx']:
        fn = SFX.get(e['kind'])
        if not fn:
            print('skip', e['kind'])
            continue
        kw = {k: v for k, v in e.items() if k not in ('kind', 't')}
        y = fn(**kw)
        add(fx, y, e['t'], rng.uniform(-0.35, 0.35), GAIN.get(e['kind'], 1.0))
    fx = reverb(fx, 0.5, 0.16, 6000)
    mus = music_notebook(dur) if style == 'notebook' else music_paper(dur)
    mus = reverb(mus, 2.4, 0.32, 4200)
    mix = fx * 1.0 + mus * (0.55 if style == 'notebook' else 0.6)
    mix = mix[:, :n_of(dur + 0.5)]
    # gentle fade in/out and soft clip
    nf = n_of(0.6)
    mix[:, -nf:] *= np.linspace(1, 0, nf)
    mix /= max(1e-9, np.max(np.abs(mix))) / 0.8
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    wavfile.write(out, SR, mix.T.astype(np.float32))
    print('wrote', out, f'{dur:.1f}s')


if __name__ == '__main__':
    main()
