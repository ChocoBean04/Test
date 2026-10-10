"""Objective look at short voice-like samples: pitch, voicing, syllables, brightness.
usage: python3 -I voicecheck.py a.mp3 b.mp3 ..."""
import sys
import librosa
import numpy as np
for p in sys.argv[1:]:
    y, sr = librosa.load(p, sr=22050, mono=True)
    dur = len(y) / sr
    f0, vflag, vprob = librosa.pyin(y, fmin=120, fmax=1200, sr=sr, frame_length=1024)
    f = f0[vflag] if vflag.any() else np.array([np.nan])
    on = librosa.onset.onset_detect(y=y, sr=sr, units='time', backtrack=True)
    cen = float(np.median(librosa.feature.spectral_centroid(y=y, sr=sr)))
    rms = librosa.feature.rms(y=y)[0]
    act = float((rms > rms.max() * 0.12).mean())
    print(f"{p.split('/')[-1]:>9} dur {dur:5.2f}s  f0 med {np.nanmedian(f):6.0f}Hz (p10 {np.nanpercentile(f,10):5.0f} p90 {np.nanpercentile(f,90):5.0f})  voiced {vflag.mean()*100:4.0f}%  onsets {len(on):2d}  centroid {cen:5.0f}Hz  active {act*100:3.0f}%  peak {20*np.log10(np.abs(y).max()+1e-9):5.1f}dB")
