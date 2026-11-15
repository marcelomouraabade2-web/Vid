#!/usr/bin/env bash
# Mixagem final: vídeo mudo + narração + trilha (ducking sob a voz)
set -e
cd "$(dirname "$0")/.."
D=$(node -e "console.log(require('./build/timeline.json').total)")
[ -f build/musica.wav ] || python3 tools/music.py "$D" build/musica.wav
mkdir -p out
ffmpeg -y -v error -i build/video_mudo.mp4 -i build/narracao.wav -i build/musica.wav -filter_complex \
 "[1:a]aformat=channel_layouts=stereo,asplit=2[v][sc];[2:a]volume=0.32[m];[m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[md];[v][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest out/palacio_memoria_sistema_endocrino.mp4
ls -la out/
