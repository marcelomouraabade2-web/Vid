#!/usr/bin/env bash
# Renderiza uma única cena com áudio. Uso: tools/preview.sh tireoide
set -e; cd "$(dirname "$0")/.."
read A B < <(node -e "const s=require('./build/timeline.json').scenes.find(s=>s.id==='$1');console.log(s.start,s.end)")
node tools/render.mjs --fps 24 --workers 3 --from $A --to $B
D=$(node -e "console.log(require('./build/timeline.json').total)"); [ -f build/musica.wav ] || python3 tools/music.py "$D" build/musica.wav
mkdir -p out
ffmpeg -y -v error -i build/video_mudo.mp4 -ss $A -t $(echo "$B - $A" | bc) -i build/narracao.wav -ss $A -t $(echo "$B - $A" | bc) -i build/musica.wav -filter_complex \
 "[1:a]aformat=channel_layouts=stereo,asplit=2[v][sc];[2:a]volume=0.32[m];[m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[md];[v][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest out/previa_$1.mp4
ls -la out/
