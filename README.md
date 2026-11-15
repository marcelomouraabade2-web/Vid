# Palácio da Memória — Sistema Endócrino

Aula cinematográfica vertical (1080×1920, 24 fps, ~22 min) com narração em português do Brasil, no estilo **palco 3D Technicolor** (musical de estúdio dos anos 1960): geometria simplificada, tijolo, reboco e pedra texturizados, janelas com peitoril, sacadas com gradil, escadas de marinheiro e varais de bandeirolas; sol baixo e quente com sombras longas e luz de preenchimento fria; céu pintado vermelho-alaranjado (#E0481E) com faixas de nuvens de borda dourada; em cada cena, **um herói laranja (#D97757) com contorno preto**; bonecos-manequim articulados; grão fino.

## Cenas (loci)

| # | Cômodo | Glândula | Herói laranja |
|---|---|---|---|
| 0 | Fachada | O Palácio da Homeostase | Torre central com cúpula |
| 1 | Recepção | Sistema endócrino (hormônios, receptores, feedback) | Chave gigante |
| 2 | Sala de comando | Hipotálamo | O prefeito |
| 3 | Elevador central | Hipófise (adeno = fábrica, neuro = depósito) | Cabine do elevador |
| 4 | Fábrica borboleta | Tireoide | A borboleta (lobos, istmo, piramidal) |
| 5 | Quatro pequenas salas | Paratireoides | As quatro casinhas |
| 6 | Sala do relógio | Pineal | O relógio |
| 7 | Torres de emergência | Suprarrenais | As torres sobre os rins |
| 8 | Cozinha energética | Pâncreas | O pâncreas (cabeça → cauda) |
| 9 | Fechamento | Revisão do percurso | Torre central |

A decupagem completa (tempo, plano, cartão e narração de cada trecho) está em [`ROTEIRO_TECNICO.md`](ROTEIRO_TECNICO.md).
O texto narrado fica em [`src/roteiro.mjs`](src/roteiro.mjs): editar ali e regenerar o vídeo.

## Como gerar

Requisitos: Node 22, ffmpeg, Chromium/Playwright, `espeak-ng` + vozes MBROLA brasileiras (`apt-get install espeak-ng mbrola mbrola-br3`), Python 3 com numpy.

```bash
npm install                                   # three.js
node tools/build_audio.mjs                    # narração + linha do tempo (build/)
node tools/render.mjs --stills 10,300,900     # quadros de conferência (build/stills/)
node tools/render.mjs --fps 24 --workers 3    # vídeo mudo (build/video_mudo.mp4)
./tools/mix.sh                                # narração + trilha → out/palacio_memoria_sistema_endocrino.mp4
```

## Estrutura

- `src/roteiro.mjs` — roteiro narrado, cartões didáticos e mapa de pronúncia para o sintetizador
- `src/core.js` — céu pintado, texturas procedurais, construtor de fachadas, manequins, placas
- `src/sets.js` — os 10 cenários e seus planos de câmera
- `src/stage.js` — linha do tempo, movimento de câmera, cartões, legendas, cortina
- `tools/` — narração (TTS), renderização, trilha procedural e mixagem

## Limitações conhecidas

- A narração usa síntese de voz offline (espeak-ng/MBROLA): é inteligível, mas soa robótica. Para publicação, recomenda-se regravar com voz humana ou TTS neural; a linha do tempo se ajusta sozinha às novas durações (`build/audio/seg_*.wav`).
- As ilustrações são esquemáticas e teatrais, não anatomia fotorrealista: servem de âncora mnemônica, não substituem atlas e lâminas reais.
