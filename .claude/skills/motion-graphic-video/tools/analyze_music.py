"""Objective look at candidate music tracks (no ears needed).

usage: python3 analyze_music.py track1.mp3 [track2.mp3 ...] [--json out.json]
Prints tempo, beat regularity, first strong downbeat, loudness curve
(per 10 s, LUFS-ish RMS dB), longest quiet gap, spectral balance.
"""
import json
import sys

import librosa
import numpy as np


def analyze(path):
    y, sr = librosa.load(path, sr=22050, mono=True)
    dur = len(y) / sr
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
    tempo = float(np.atleast_1d(tempo)[0])
    ibi = np.diff(beats)
    reg = float(np.std(ibi) / np.mean(ibi)) if len(ibi) > 4 else 1.0
    # loudness curve per 10 s
    hop = sr * 10
    blocks = [y[i:i + hop] for i in range(0, len(y), hop)]
    curve = [round(float(20 * np.log10(np.sqrt(np.mean(b ** 2)) + 1e-9)), 1) for b in blocks if len(b) > sr]
    # quiet gaps (>1.5 s under -40 dB rms in 0.25 s windows)
    w = sr // 4
    rms = np.array([np.sqrt(np.mean(y[i:i + w] ** 2)) for i in range(0, len(y) - w, w)])
    quiet = rms < 10 ** (-40 / 20)
    longest, run = 0, 0
    for q in quiet[8:-8]:
        run = run + 1 if q else 0
        longest = max(longest, run)
    S = np.abs(librosa.stft(y, n_fft=4096))
    f = librosa.fft_frequencies(sr=sr, n_fft=4096)
    e = (S ** 2).mean(1)
    tot = e.sum()
    band = lambda lo, hi: round(float(e[(f >= lo) & (f < hi)].sum() / tot * 100), 1)
    onset = librosa.onset.onset_strength(y=y, sr=sr)
    return dict(file=path.split('/')[-1], dur=round(dur, 1), bpm=round(tempo, 1), beat_irregularity=round(reg, 3),
                first_beat=round(float(beats[0]), 2) if len(beats) else None, curve_db=curve,
                longest_quiet_s=longest / 4, sub_lt80=band(0, 80), low_80_250=band(80, 250), mid_250_2k=band(250, 2000),
                high_2k_plus=band(2000, 11025), onset_mean=round(float(onset.mean()), 2),
                beats=[round(float(b), 3) for b in beats])


if __name__ == '__main__':
    args = sys.argv[1:]
    out = None
    if '--json' in args:
        i = args.index('--json'); out = args[i + 1]; args = args[:i] + args[i + 2:]
    res = []
    for p in args:
        r = analyze(p)
        res.append(r)
        print({k: v for k, v in r.items() if k != 'beats'})
    if out:
        json.dump(res, open(out, 'w'))
