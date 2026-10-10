"""Turn a real gibberish voice recording into a cute creature voice + a lip-sync envelope.

usage: python3 -I babble.py in.mp3 out.wav out.json [--speed 1.28] [--from 0] [--to end]
Speeds the recording up like tape (pitch rises with speed, no robotic artefacts), trims silence,
and writes the mouth-opening envelope (0..1 at 60 fps) plus syllable onsets for the page.
"""
import json
import sys

import librosa
import numpy as np
from scipy.io import wavfile

args = sys.argv[1:]
def opt(name, default):
    global args
    if name in args:
        i = args.index(name); v = float(args[i + 1]); args = args[:i] + args[i + 2:]; return v
    return default
speed, t0, t1 = opt('--speed', 1.28), opt('--from', 0.0), opt('--to', -1.0)
src, out_wav, out_json = args
SR = 48000
y, _ = librosa.load(src, sr=SR, mono=True)
if t1 > 0: y = y[int(t0 * SR):int(t1 * SR)]
else: y = y[int(t0 * SR):]
y = librosa.resample(y, orig_sr=SR, target_sr=int(SR / speed))   # played back at SR -> faster & higher
y, _ = librosa.effects.trim(y, top_db=38)
fade = int(0.012 * SR)
y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
y = y / (np.abs(y).max() + 1e-9) * 0.89
wavfile.write(out_wav, SR, y.astype(np.float32))
# envelope at 60 fps for the mouth
hop = SR // 60
rms = np.array([np.sqrt(np.mean(y[i:i + hop * 2] ** 2)) for i in range(0, len(y), hop)])
env = np.clip(rms / (np.percentile(rms, 95) + 1e-9), 0, 1) ** 0.8
env = np.convolve(env, [0.25, 0.5, 0.25], mode='same')
on = librosa.onset.onset_detect(y=y, sr=SR, units='time', backtrack=True)
json.dump({'dur': round(len(y) / SR, 3), 'fps': 60, 'env': [round(float(v), 3) for v in env], 'onsets': [round(float(o), 3) for o in on]}, open(out_json, 'w'))
print(out_wav, f'{len(y)/SR:.2f}s', 'onsets', [round(float(o), 2) for o in on])
