"""Beat grid for a music track -> JS file the page loads before its build code.

usage: python3 -I beatgrid.py music.mp3 out.js [--name GRID]
Writes window.GRID = {beats: [...s], phase: i, beat: mean seconds, bpm}.
phase = index into beats of the first downbeat (bar line), guessed from which of the
4 beat positions carries the most low-frequency onset energy.
"""
import json
import sys

import librosa
import numpy as np

args = sys.argv[1:]
name = 'GRID'
if '--name' in args:
    i = args.index('--name'); name = args[i + 1]; args = args[:i] + args[i + 2:]
path, out = args
y, sr = librosa.load(path, sr=22050, mono=True)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time', tightness=200)
beats = [round(float(b), 4) for b in beats]
# low-band onset strength at each beat
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
f = librosa.fft_frequencies(sr=sr, n_fft=2048)
low = S[f < 200].sum(0)
flux = np.maximum(0, np.diff(low, prepend=low[0]))
times = librosa.frames_to_time(np.arange(len(flux)), sr=sr, hop_length=512)
def at(t):
    k = np.searchsorted(times, t)
    return flux[max(0, k - 2):k + 3].max() if k < len(flux) else 0
scores = [sum(at(beats[j]) for j in range(p, len(beats), 4)) / max(1, len(range(p, len(beats), 4))) for p in range(4)]
phase = int(np.argmax(scores))
beat = float(np.median(np.diff(beats)))
open(out, 'w').write(f'window.{name} = ' + json.dumps({'beats': beats, 'phase': phase, 'beat': round(beat, 4), 'bpm': round(60 / beat, 2)}) + ';\n')
print(out, 'beats', len(beats), 'bpm', round(60 / beat, 2), 'phase', phase, 'scores', [round(float(s), 1) for s in scores], 'first', beats[:6])
