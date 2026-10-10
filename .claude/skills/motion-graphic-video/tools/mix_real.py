"""Mix a music track with real (sampled) sound effects placed at the page's sound cues.

usage: python3 mix_real.py events.json music.mp3 sfx_dir[,dir2,...] out.wav [--fade 3.5] [--preset swiss|paper|slime]

events.json: {"duration": s, "sfx": [{"kind", "t", ...}]} from tools/events.mjs.
Samples are chosen per kind from SAMPLES (Mixkit free license; no attribution required).
"""
import json
import os
import sys

import librosa
import numpy as np
from scipy.io import wavfile

SR = 48000
rng = np.random.default_rng(117)

# kind -> [(mixkit sfx id, gain, lead seconds to subtract so the hit lands on the cue)]
# 'swiss' = bold colour-field reels; 'paper' = the cut-paper look (soft paper/wood/page sounds).
# Kinds missing from a preset are left silent on purpose (too frequent or no good real sample).
PAPER = {
    'paper': [('2380', 0.55, 0.11), ('1530', 0.26, 0.03)],
    'drop':  [('175', 0.30, 0.19)],
    'thud':  [('2151', 0.42, 0.10)],
    'pop':   [('2356', 0.26, 0.02), ('2357', 0.22, 0.01)],
    'swish': [('3115', 0.36, 0.07), ('175', 0.30, 0.19)],
    'slide': [('1530', 0.24, 0.03)],
    'flip':  [('1104', 0.50, 0.02)],
    'clack': [('2182', 0.28, 0.03)],
    'tick':  [('1120', 0.55, 0.10)],
    'jump':  [('166', 0.34, 0.12)],
    'buzz':  [('2876', 0.30, 0.02)],
    'grow':  [('1107', 0.32, 0.07)],
    'pit':   [('2299', 0.32, 0.06)],
    'flick': [('175', 0.22, 0.19)],
}
# 'slime' = the jelly mascot: soft wet landings, bubbly hops, sparkles. The user decided NO character voice
# (no babble, giggles, hiccups or kisses), so those cue kinds map to non-voice sounds and 'talk*' cues stay silent.
SLIME = {
    'fall':    [('168', 0.22, 0.10)],
    'whoosh':  [('166', 0.28, 0.12)],
    'land':    [('3056', 0.55, 0.40)],
    'boing':   [('2895', 0.32, 0.03)],
    'hop':     [('3000', 0.26, 0.06), ('1317', 0.40, 0.12)],
    'pop':     [('2357', 0.30, 0.01)],
    'pop2':    [('2356', 0.24, 0.02)],
    'sparkle': [('2985', 0.22, 0.05)],
    'squish':  [('1884', 0.85, 0.15)],
    'giggle':  [('2356', 0.24, 0.02)],
    'eep':     [('2895', 0.32, 0.03)],
    'kiss':    [('2985', 0.22, 0.05)],
}
SAMPLES = {
    'whoosh': [('168', 0.50, 0.10), ('166', 0.42, 0.12)],
    'swish':  [('3115', 0.42, 0.07), ('175', 0.38, 0.19)],
    'pop':    [('3005', 0.42, 0.01)],
    'pop2':   [('2356', 0.30, 0.02), ('2357', 0.26, 0.01)],
    'click':  [('2568', 0.32, 0.0)],
    'check':  [('1120', 0.55, 0.10)],
    'page':   [('1106', 0.55, 0.02)],
    'slide':  [('3120', 0.55, 0.01)],
}


def load(path, mono=True):
    y, _ = librosa.load(path, sr=SR, mono=mono)
    return y


def main():
    args = sys.argv[1:]
    fade = 3.5
    preset = SAMPLES
    if '--preset' in args:
        i = args.index('--preset'); preset = {'paper': PAPER, 'slime': SLIME}.get(args[i + 1], SAMPLES); args = args[:i] + args[i + 2:]
    if '--fade' in args:
        i = args.index('--fade'); fade = float(args[i + 1]); args = args[:i] + args[i + 2:]
    ev_path, music_path, sfx_dir, out = args
    data = json.load(open(ev_path))
    dur = float(data['duration']) + 0.3
    n = int(dur * SR)

    music = load(music_path, mono=False)
    if music.ndim == 1:
        music = np.stack([music, music])
    music = music[:, :n]
    if music.shape[1] < n:
        music = np.pad(music, ((0, 0), (0, n - music.shape[1])))
    nf = int(fade * SR)
    music[:, n - nf:] *= np.linspace(1, 0, nf) ** 1.6
    # music level: about -21 dBFS RMS over the active part
    rms = np.sqrt(np.mean(music[:, int(2 * SR):n - nf] ** 2))
    music *= 10 ** (-21 / 20) / (rms + 1e-9)

    cache = {}
    fx = np.zeros((2, n))
    counts = {}
    for e in data['sfx']:
        opts = preset.get(e['kind'])
        if not opts or e.get('soft'):
            continue
        k = counts.get(e['kind'], 0); counts[e['kind']] = k + 1
        sid, gain, lead = opts[k % len(opts)]
        if sid not in cache:
            cands = [f'{d}/{sid}.{ext}' for d in sfx_dir.split(',') for ext in ('mp3', 'wav')]
            cache[sid] = load(next(c for c in cands if os.path.exists(c)))
        s = cache[sid] * gain * 10 ** (rng.uniform(-1.5, 1.0) / 20)
        st = int(max(0.0, e['t'] - lead) * SR)
        if st >= n:
            continue
        s = s[:n - st]
        pan = rng.uniform(-0.25, 0.25)
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        fx[0, st:st + len(s)] += s * l * 1.414
        fx[1, st:st + len(s)] += s * r * 1.414

    # gentle duck: music dips 3 dB under whooshes
    env = np.ones(n)
    for e in data['sfx']:
        if e['kind'] == 'whoosh':
            a, b = int(max(0, e['t'] - 0.15) * SR), int(min(dur, e['t'] + 0.55) * SR)
            env[a:b] = np.minimum(env[a:b], 10 ** (-3 / 20))
        if e['kind'].startswith('talk'):      # let the voice through: music dips 6 dB while the mascot talks
            a, b = int(max(0, e['t'] - 0.1) * SR), int(min(dur, e['t'] + e.get('dur', 1) + 0.15) * SR)
            env[a:b] = np.minimum(env[a:b], 10 ** (-6 / 20))
    k = int(0.08 * SR)
    env = np.convolve(env, np.ones(k) / k, mode='same')
    mix = music * env + fx
    peak = np.max(np.abs(mix))
    if peak > 0.95:
        mix *= 0.95 / peak
    wavfile.write(out, SR, mix.T.astype(np.float32))
    print('wrote', out, f'{dur:.1f}s', 'events', sum(counts.values()), counts)


if __name__ == '__main__':
    main()
