// Renderiza o vídeo: quadros do palco (Chromium headless + WebGL) → ffmpeg.
// Uso:
//   node tools/render.mjs --stills 3,40,120          (gera build/stills/*.jpg)
//   node tools/render.mjs --fps 24 --workers 3        (vídeo completo → out/palacio_endocrino.mp4)
//   node tools/render.mjs --from 0 --to 60            (trecho)
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const TLF = arg('--timeline', 'build/timeline.json'); const TL = JSON.parse(readFileSync(TLF, 'utf8'));
const PAGE = arg('--page', 'src/stage.html'); const VF = arg('--vf', 'eq=saturation=1.16:contrast=1.06,vignette=angle=PI/5,noise=alls=4:allf=t'); const MUTE = arg('--mute', 'build/video_mudo.mp4');
const FPS = +arg('--fps', 24), WORKERS = +arg('--workers', 3), SCALE = +arg('--scale', .6);
const T0 = +arg('--from', 0), T1 = +arg('--to', TL.total);
const URL = 'file://' + process.cwd() + '/' + PAGE;
async function open() {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--disable-web-security'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('PAGE ERROR', e.message)); p.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await p.addInitScript(s => { window.RENDER_SCALE = s; }, SCALE);
  await p.goto(URL); await p.waitForFunction('window.ready === true', null, { timeout: 60000 });
  return { b, p };
}
const stills = arg('--stills');
if (stills) {
  mkdirSync('build/stills', { recursive: true });
  const { b, p } = await open();
  for (const s of stills.split(',')) { const t = +s; const d = await p.evaluate(([t]) => window.grab(t, 0, .92), [t]); writeFileSync(`build/stills/t${String(t).padStart(7, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64')); console.log('still', t); }
  await b.close(); process.exit(0);
}
mkdirSync('build/chunks', { recursive: true }); mkdirSync('out', { recursive: true });
const f0 = Math.round(T0 * FPS), f1 = Math.round(T1 * FPS); const N = f1 - f0; const per = Math.ceil(N / WORKERS);
const t0 = Date.now(); const done = new Array(WORKERS).fill(0);
const prog = setInterval(() => { const d = done.reduce((a, b) => a + b, 0); const el = (Date.now() - t0) / 1000; process.stdout.write(`\r${d}/${N} quadros · ${(d / el).toFixed(1)} q/s · ETA ${((N - d) / (d / el + 1e-9) / 60).toFixed(1)} min   `); }, 5000);
await Promise.all([...Array(WORKERS).keys()].map(async w => {
  const a = f0 + w * per, z = Math.min(f1, a + per); if (a >= z) return;
  const file = `build/chunks/c${String(w).padStart(2, '0')}.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', VF || 'null', '-c:v', 'libx264', '-preset', 'fast', '-tune', 'grain', '-crf', '28', '-pix_fmt', 'yuv420p', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const { b, p } = await open();
  for (let f = a; f < z; f++) {
    const d = await p.evaluate(([t, f]) => window.grab(t, f, .93), [f / FPS, f]);
    const buf = Buffer.from(d.split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    done[w]++;
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
}));
clearInterval(prog);
const list = [...Array(WORKERS).keys()].map(w => `build/chunks/c${String(w).padStart(2, '0')}.mp4`).filter(existsSync);
writeFileSync('build/chunks/list.txt', list.map(f => `file '${f.replace('build/chunks/', '')}'`).join('\n'));
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', 'build/chunks/list.txt', '-c', 'copy', MUTE]);
console.log(`\nVídeo mudo pronto em ${((Date.now() - t0) / 60000).toFixed(1)} min`);
