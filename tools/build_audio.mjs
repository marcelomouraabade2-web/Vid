// Gera a narração (espeak-ng + MBROLA pt-BR), mede durações e monta build/timeline.json
// Uso: node tools/build_audio.mjs [--voice mb-br3] [--speed 148]
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const VOICE = arg('--voice', 'mb-br3');
const SPEED = arg('--speed', '148');
const SCRIPT = arg('--script', 'src/roteiro.mjs'); const OUT = arg('--out', 'build');
const { SCENES, pronounce } = await import('../' + SCRIPT);
const B = OUT + '/audio';
mkdirSync(B, { recursive: true });

const LEAD = +arg('--lead', 2.6);      // tempo de abertura de cada cena (plano de assinatura antes da voz)
const GAP = +arg('--gap', 0.55);      // pausa entre segmentos
const TAIL = +arg('--tail', 1.2);      // respiro ao fim de cada cena
const dur = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

const timeline = { scenes: [], total: 0 };
const concat = [];
let t = 0, n = 0;
const silence = s => { const f = `${B}/sil_${s.toFixed(2)}.wav`; if (!existsSync(f)) execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=mono`, '-t', String(s), f]); return f; };

for (const sc of SCENES) {
  const S = { id: sc.id, set: sc.set, titulo: sc.titulo, start: t, segs: [], hold: sc.hold || 0 };
  concat.push(silence(LEAD)); t += LEAD;
  sc.segs.forEach((sg, i) => {
    const raw = `${B}/raw_${String(n).padStart(3, '0')}.wav`;
    const wav = `${B}/seg_${String(n).padStart(3, '0')}.wav`;
    execFileSync('espeak-ng', ['-v', VOICE, '-s', SPEED, '-p', '45', '-g', '4', '-w', raw, pronounce(sg.txt)]);
    // limpeza leve + reamostragem
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-af', 'highpass=f=70,lowpass=f=9000,aresample=48000', '-ac', '1', wav]);
    const d = dur(wav);
    // legendas: frases distribuídas proporcionalmente ao número de caracteres
    const parts = sg.txt.match(/[^.!?:;]+[.!?:;]*/g).map(s => s.trim()).filter(Boolean);
    const chunks = [];
    for (const p of parts) { // quebra frases longas em blocos de ~60 caracteres
      const words = p.split(' '); let cur = '';
      for (const w of words) { if ((cur + ' ' + w).trim().length > 62 && cur) { chunks.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
      if (cur) chunks.push(cur);
    }
    const tot = chunks.reduce((a, c) => a + c.length + 6, 0);
    let ct = t; const caps = chunks.map(c => { const cd = d * (c.length + 6) / tot; const o = { t: ct, d: cd, text: c }; ct += cd; return o; });
    S.segs.push({ i, f: sg.f, p: sg.p, card: sg.card || null, fx: sg.fx || null, start: t, dur: d, caps });
    concat.push(wav); t += d;
    const g = i === sc.segs.length - 1 ? TAIL + (sc.hold || 0) : GAP;
    concat.push(silence(g)); t += g;
    n++;
    process.stdout.write(`\r${n} segmentos · ${t.toFixed(1)} s`);
  });
  S.end = t;
  timeline.scenes.push(S);
}
timeline.total = t;
writeFileSync(`${B}/list.txt`, concat.map(f => `file '${f.replace(B + '/', '')}'`).join('\n'));
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', `${B}/list.txt`, '-af', 'loudnorm=I=-16:TP=-1.5', '-ar', '48000', OUT + '/narracao.wav']);
writeFileSync(OUT + '/timeline.json', JSON.stringify(timeline, null, 1));
writeFileSync(OUT + '/timeline.js', 'window.TIMELINE=' + JSON.stringify(timeline) + ';');
console.log(`\nTotal: ${(t / 60).toFixed(2)} min`);
