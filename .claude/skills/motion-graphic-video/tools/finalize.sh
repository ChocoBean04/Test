#!/usr/bin/env bash
# finalize.sh <video.mp4> <audio.wav> <out.mp4>
# Mux the synthesized audio, level it (compress → limit → -16 LUFS) and re-encode at a shareable size.
set -euo pipefail
ffmpeg -v error -y -i "$1" -i "$2" -map 0:v -map 1:a \
  -c:v libx264 -preset medium -crf 20 -tune animation -pix_fmt yuv420p \
  -af "acompressor=threshold=0.125:ratio=3:attack=3:release=150,alimiter=limit=0.7:level=false,loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest "$3"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of compact=p=0 "$3"
