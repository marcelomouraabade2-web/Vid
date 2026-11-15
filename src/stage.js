// Palco principal: linha do tempo, câmera, composição 2D (cartões, legendas, cortina, grão)
import { THREE, makeSky, initTextures, ease, ease2, clamp, rng } from './core.js';
import { SETS } from './sets.js';

const TL = window.TIMELINE;
const OUT_W = 1080, OUT_H = 1920;
const SCALE = window.RENDER_SCALE || .75;
const RW = Math.round(OUT_W * SCALE), RH = Math.round(OUT_H * SCALE);

initTextures();
const renderer = new THREE.WebGLRenderer({ antialias: !!window.AA, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(RW, RH);
renderer.shadowMap.enabled = !window.NOSHADOW; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.4;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe98a52, 40, 150);
const sky = makeSky(); scene.add(sky);
const camera = new THREE.PerspectiveCamera(52, RW / RH, .1, 900);
// luz-chave quente, rasante, de sombras longas
const key = new THREE.DirectionalLight(0xffb56e, 3.6);
key.castShadow = true; key.shadow.mapSize.set(window.SHADOW || 1024, window.SHADOW || 1024); key.shadow.bias = -.0004; key.shadow.normalBias = .03;
const sc = key.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 140;
scene.add(key, key.target);
// preenchimento frio ≈ 1/4 da chave
const fill = new THREE.HemisphereLight(0x8fa6ff, 0x5a3424, 1.1); scene.add(fill);
const amb = new THREE.AmbientLight(0xffe0c0, .22); scene.add(amb);

const built = {};
function getSet(S) {
  if (!built[S.id]) { const s = SETS[S.set](); built[S.id] = s; s.group.visible = false; scene.add(s.group); }
  return built[S.id];
}

// ---------- câmera ----------
const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);
function runsOf(S) {
  if (S._runs) return S._runs;
  const R = [];
  S.segs.forEach((g, i) => { if (!R.length || R[R.length - 1].f !== g.f) R.push({ f: g.f, start: i === 0 ? S.start : g.start }); });
  return (S._runs = R);
}
function focusPose(set, f, el) {
  const c = set.cams[f] || set.cams[0]; const p = v3(c), l = v3([c[3], c[4], c[5]]);
  const dir = l.clone().sub(p); const dist = dir.length(); dir.normalize();
  const push = Math.min(el * .07, dist * .22);
  p.addScaledVector(dir, push);
  p.x += Math.sin(el * .21) * .12; p.y += Math.sin(el * .17) * .05;
  return { p, l };
}
function sigPose(set) { const s = set.sig; return { p: v3(s).add(new THREE.Vector3(0, 2.4, 3)), l: v3([s[3], s[4], s[5]]) }; }
function lerpPose(a, b, k) { return { p: a.p.clone().lerp(b.p, k), l: a.l.clone().lerp(b.l, k) }; }
function poseAt(S, set, t, ri = null) {
  const R = runsOf(S);
  if (ri === null) { ri = 0; while (ri + 1 < R.length && R[ri + 1].start <= t) ri++; }
  const r = R[ri]; const el = t - r.start; const target = focusPose(set, r.f, el);
  if (ri === 0) {
    const s = sigPose(set); const D = (S.segs[0].start - S.start) + 3.2; const k = ease2(el / D);
    // descida contínua: sobe o olhar do céu para o cenário enquanto a grua desce
    const p = s.p.clone().lerp(target.p, k); p.y += Math.sin(k * Math.PI) * .6 * (1 - k);
    const l = s.l.clone().lerp(target.l, ease(el / (D * .9)));
    return { p, l };
  }
  const prev = (r._prev ||= poseAt(S, set, r.start - 1e-4, ri - 1));
  return lerpPose(prev, target, ease2(el / 2.8));
}

// ---------- composição 2D ----------
const out = document.createElement('canvas'); out.width = OUT_W; out.height = OUT_H; if (window.SHOW) document.body.appendChild(out);
const X = out.getContext('2d');
const PIX = new Uint8Array(RW * RH * 4); const TMP = document.createElement('canvas'); TMP.width = RW; TMP.height = RH; const TX = TMP.getContext('2d'); const IMG = TX.createImageData(RW, RH);
const C = { cream: '#F4E6C8', ink: '#2A160F', hero: '#D97757', red: '#B02A1E', gold: '#F0B545', sky: '#E0481E' };
const grains = []; { const R = rng(99); for (let k = 0; k < 6; k++) { const g = document.createElement('canvas'); g.width = 540; g.height = 960; const gx = g.getContext('2d'); const d = gx.createImageData(540, 960); for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (R() - .5) * 120; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } gx.putImageData(d, 0, 0); grains.push(g); } }

function rr(x, y, w, h, r) { X.beginPath(); X.roundRect(x, y, w, h, r); }
function wrap(text, maxW, font) { X.font = font; const words = text.split(' '); const lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (X.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
const F = (w, s, fam = 'Inter') => `${w} ${s}px "${fam}"`;

function panel(x, y, w, h) {
  X.save(); X.shadowColor = 'rgba(20,6,2,.55)'; X.shadowBlur = 30; X.shadowOffsetY = 12;
  X.fillStyle = C.cream; rr(x, y, w, h, 26); X.fill(); X.restore();
  X.lineWidth = 6; X.strokeStyle = C.ink; rr(x, y, w, h, 26); X.stroke();
  X.fillStyle = C.hero; X.save(); rr(x, y, w, h, 26); X.clip(); X.fillRect(x, y, w, 16); X.restore();
  X.lineWidth = 2; X.strokeStyle = 'rgba(42,22,15,.35)'; rr(x + 12, y + 26, w - 24, h - 38, 18); X.stroke();
}
function measureCard(c) {
  const W = 960, pad = 46; let h = 0; const iw = W - pad * 2;
  if (c.type === 'title') { const tl = wrap(c.title, iw, F(900, 112, 'Inter Display')); const sl = c.sub ? wrap(c.sub, iw, F(600, 44)) : []; return { W, h: 190 + (tl.length - 1) * 116 + (sl.length ? 74 + (sl.length - 1) * 56 : 0) + 48, tl, sl }; }
  if (c.type === 'key') { const tl = wrap(c.text, iw, F(800, 54, 'Inter Display')); return { W, h: 130 + tl.length * 66 + 30, tl }; }
  if (c.type === 'list') { const items = c.items.map(t => wrap(t, iw - 70, F(600, 46))); h = 132 + items.reduce((a, l) => a + l.length * 56 + 18, 0) + 14; return { W, h, items }; }
  if (c.type === 'table') { const rows = c.rows.map(([a, b2]) => ({ a: wrap(a, 330, F(800, 42)), b: wrap(b2, iw - 370, F(500, 40)) })); h = 132 + rows.reduce((a, r) => a + Math.max(r.a.length * 50, r.b.length * 48) + 30, 0) + 6; return { W, h, rows }; }
  if (c.type === 'chain') { const steps = c.steps.map(t => wrap(t, iw - 80, F(700, 44))); h = 132 + steps.reduce((a, l) => a + l.length * 52 + 34 + 46, 0) - 46 + (c.back ? 100 : 0) + 20; return { W, h, steps }; }
  return { W, h: 200 };
}
function drawCard(c, a, el) {
  if (!c || a <= 0) return;
  const m = c._m || (c._m = measureCard(c)); const x = (OUT_W - m.W) / 2, y = 168 + (1 - a) * -40, pad = 46;
  X.save(); X.globalAlpha = a; panel(x, y, m.W, m.h);
  X.textBaseline = 'alphabetic'; X.textAlign = 'left';
  const kick = (t, yy) => { X.font = F(800, 30); X.fillStyle = C.red; X.fillText(t.toUpperCase().split('').join(' '), x + pad, yy); };
  if (c.type === 'title') {
    X.textAlign = 'center'; X.font = F(800, 32); X.fillStyle = C.red; X.fillText((c.kicker || '').toUpperCase(), OUT_W / 2, y + 78);
    X.font = F(900, 112, 'Inter Display'); X.fillStyle = C.ink; m.tl.forEach((l, i) => X.fillText(l, OUT_W / 2, y + 190 + i * 116));
    X.font = F(600, 44); X.fillStyle = '#6b3a24'; m.sl.forEach((l, i) => X.fillText(l, OUT_W / 2, y + 190 + (m.tl.length - 1) * 116 + 74 + 56 * i));
  } else if (c.type === 'key') {
    kick(c.title, y + 80); X.fillStyle = C.hero; X.beginPath(); X.arc(x + m.W - 80, y + 70, 26, 0, 7); X.fill(); X.fillStyle = C.ink; X.fillRect(x + m.W - 80, y + 64, 44, 12);
    X.font = F(800, 54, 'Inter Display'); X.fillStyle = C.ink; m.tl.forEach((l, i) => X.fillText(l, x + pad, y + 160 + i * 66));
  } else if (c.type === 'list') {
    kick(c.title, y + 80); let yy = y + 150;
    m.items.forEach((ls, i) => { const k = clamp((el - .25 - i * .32) / .35); X.globalAlpha = a * k; X.fillStyle = C.hero; X.beginPath(); X.arc(x + pad + 16, yy - 15, 13, 0, 7); X.fill(); X.lineWidth = 3; X.strokeStyle = C.ink; X.stroke(); X.font = F(600, 46); X.fillStyle = C.ink; ls.forEach((l, j) => X.fillText(l, x + pad + 58 + (1 - k) * 20, yy + j * 56)); yy += ls.length * 56 + 18; });
  } else if (c.type === 'table') {
    kick(c.title, y + 80); let yy = y + 140;
    m.rows.forEach((r, i) => { const k = clamp((el - .2 - i * .3) / .35); X.globalAlpha = a * k; const rh = Math.max(r.a.length * 50, r.b.length * 48) + 30; X.fillStyle = i % 2 ? 'rgba(217,119,87,.10)' : 'rgba(217,119,87,.22)'; rr(x + 26, yy - 4, m.W - 52, rh - 6, 12); X.fill(); X.font = F(800, 42); X.fillStyle = C.red; r.a.forEach((l, j) => X.fillText(l, x + pad, yy + 42 + j * 50)); X.font = F(500, 40); X.fillStyle = C.ink; r.b.forEach((l, j) => X.fillText(l, x + pad + 360, yy + 42 + j * 48)); yy += rh; });
  } else if (c.type === 'chain') {
    kick(c.title, y + 80); let yy = y + 128;
    m.steps.forEach((ls, i) => { const k = clamp((el - .2 - i * .45) / .4); X.globalAlpha = a * k; const bh = ls.length * 52 + 34; X.fillStyle = i === m.steps.length - 1 ? C.hero : '#fff4dc'; rr(x + pad, yy, m.W - pad * 2, bh, 40); X.fill(); X.lineWidth = 4; X.strokeStyle = C.ink; X.stroke(); X.font = F(700, 44); X.fillStyle = C.ink; X.textAlign = 'center'; ls.forEach((l, j) => X.fillText(l, OUT_W / 2, yy + 52 + j * 52)); X.textAlign = 'left'; yy += bh; if (i < m.steps.length - 1) { X.fillStyle = C.ink; X.beginPath(); X.moveTo(OUT_W / 2 - 18, yy + 10); X.lineTo(OUT_W / 2 + 18, yy + 10); X.lineTo(OUT_W / 2, yy + 36); X.fill(); yy += 46; } });
    if (c.back) { const k = clamp((el - .4 - m.steps.length * .45) / .4); X.globalAlpha = a * k; X.font = F(800, 40); X.fillStyle = C.red; X.textAlign = 'center'; X.fillText('↺  ' + c.back, OUT_W / 2, yy + 70); X.textAlign = 'left'; }
  }
  X.restore();
}
function drawCaption(text, a) {
  if (!text || a <= 0) return;
  const font = F(700, 48); const lines = wrap(text, 900, font); const lh = 62; const h = lines.length * lh + 40; const y = 1590 - h / 2;
  X.save(); X.globalAlpha = a; X.font = font; const w = Math.max(...lines.map(l => X.measureText(l).width)) + 64;
  X.fillStyle = 'rgba(24,10,6,.72)'; rr((OUT_W - w) / 2, y, w, h, 22); X.fill();
  X.textAlign = 'center'; X.fillStyle = '#FFF3DE'; lines.forEach((l, i) => X.fillText(l, OUT_W / 2, y + 62 + i * lh));
  X.restore();
}
function drawChrome(si, S, lt) {
  // etiqueta da cena
  const t = S.titulo.toUpperCase(); X.save(); X.font = F(800, 30); const w = X.measureText(t).width + 56; const a = clamp(lt / 1.2);
  X.globalAlpha = a; X.fillStyle = 'rgba(24,10,6,.70)'; rr(44, 64, w, 60, 30); X.fill(); X.fillStyle = C.hero; X.beginPath(); X.arc(72, 94, 9, 0, 7); X.fill();
  X.fillStyle = '#FFF3DE'; X.fillText(t, 92, 105); X.restore();
  // trilha do palácio (10 paradas)
  const n = TL.scenes.length, x0 = 150, x1 = OUT_W - 150, y = 1858;
  X.save(); X.globalAlpha = .9; X.strokeStyle = 'rgba(255,243,222,.55)'; X.lineWidth = 4; X.beginPath(); X.moveTo(x0, y); X.lineTo(x1, y); X.stroke();
  for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * i / (n - 1); X.beginPath(); X.arc(x, y, i === si ? 14 : 8, 0, 7); X.fillStyle = i < si ? '#FFF3DE' : i === si ? C.hero : 'rgba(255,243,222,.35)'; X.fill(); if (i === si) { X.lineWidth = 4; X.strokeStyle = C.ink; X.stroke(); } }
  X.restore();
}
function drawCurtain(k) {
  if (k <= 0) return; const half = OUT_W / 2 * ease(k) + 2;
  for (const side of [0, 1]) {
    const x0 = side ? OUT_W - half : 0; const g = X.createLinearGradient(x0, 0, x0 + half, 0);
    const folds = 7; for (let i = 0; i <= folds; i++) { g.addColorStop(i / folds, i % 2 ? '#c4271c' : '#6e0d10'); }
    X.fillStyle = g; X.fillRect(x0, 0, half, OUT_H);
    X.fillStyle = C.gold; X.fillRect(x0, OUT_H - 70, half, 18); for (let x = x0; x < x0 + half; x += 26) { X.fillRect(x, OUT_H - 52, 6, 30); }
  }
  // sanefa
  const vg = X.createLinearGradient(0, 0, 0, 150); vg.addColorStop(0, '#5a0a0c'); vg.addColorStop(1, '#a51e18'); X.fillStyle = vg; X.fillRect(0, 0, OUT_W, 120 * ease(k));
}

// ---------- quadro ----------
function sceneIndex(t) { let i = 0; while (i + 1 < TL.scenes.length && TL.scenes[i + 1].start <= t) i++; return i; }
function cardAt(S, t) {
  let idx = -1; for (let i = 0; i < S.segs.length; i++) if (S.segs[i].start <= t + .05) idx = i;
  if (idx < 0) return null;
  // procura o início do bloco de cartões idênticos
  const cur = S.segs[idx].card; if (!cur) return null; const sig = JSON.stringify(cur);
  let s0 = idx; while (s0 > 0 && JSON.stringify(S.segs[s0 - 1].card) === sig) s0--;
  let e0 = idx; while (e0 + 1 < S.segs.length && JSON.stringify(S.segs[e0 + 1].card) === sig) e0++;
  const start = S.segs[s0].start, end = e0 + 1 < S.segs.length ? S.segs[e0 + 1].start : S.end;
  const a = Math.min(clamp((t - start) / .45), clamp((end - t) / .35));
  return { card: S.segs[s0].card, a, el: t - start };
}
function captionAt(S, t) {
  for (const g of S.segs) for (const c of g.caps) if (t >= c.t && t < c.t + c.d + .25) return { text: c.text, a: Math.min(clamp((t - c.t) / .15 + .3), 1) };
  return null;
}

let lastSet = null, lastShadowSet = null, lastFi = -9;
window.renderFrame = function (t, fi = 0) {
  const si = sceneIndex(t), S = TL.scenes[si]; const set = getSet(S);
  if (lastSet !== set) { if (lastSet) lastSet.group.visible = false; set.group.visible = true; lastSet = set; }
  const lt = t - S.start; const env = { dark: set.dark ? .35 : 0 };
  const R = runsOf(S);
  const fStart = f => { const r = R.find(r => r.f === f); return r ? r.start - S.start : 1e9; };
  const segI = (() => { let k = -1; S.segs.forEach((g, i) => { if (g.start <= t) k = i; }); return k; })();
  set.update({ lt, t, seg: segI, fStart, spot: (f, d = 2.5) => ease((lt - fStart(f)) / d), env });
  // luz e céu
  sky.material.color.setScalar(1 - env.dark * .62); sky.rotation.y = t * .0015;
  key.intensity = 3.6 * (1 - env.dark * .7); fill.intensity = .9 * (1 - env.dark * .3);
  scene.fog.color.setHex(env.dark ? 0x6a4048 : 0xe98a52);
  const ps = poseAt(S, set, t); camera.position.copy(ps.p); camera.lookAt(ps.l);
  key.position.set(ps.l.x - 42, 13, ps.l.z - 14); key.target.position.copy(ps.l); key.target.updateMatrixWorld();
  sky.position.copy(camera.position);
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = (fi % 2 === 0) || lastShadowSet !== set || Math.abs(fi - lastFi) > 1; lastShadowSet = set; lastFi = fi;
  const _a = performance.now(); renderer.render(scene, camera); renderer.getContext().finish(); const _b = performance.now();
  // composição
  const gl = renderer.getContext(); gl.readPixels(0, 0, RW, RH, gl.RGBA, gl.UNSIGNED_BYTE, PIX); const _r = performance.now();
  const row = RW * 4; for (let y = 0; y < RH; y++) IMG.data.set(PIX.subarray((RH - 1 - y) * row, (RH - y) * row), y * row);
  TX.putImageData(IMG, 0, 0);
  X.save(); if (window.PAGEGRADE) X.filter = 'saturate(1.16) contrast(1.06)'; X.drawImage(TMP, 0, 0, OUT_W, OUT_H); X.restore();
  if (window.PROF) { window.PROF.read = (window.PROF.read || 0) + (_r - _b); }
  if (window.PAGEGRADE) { const vg = X.createRadialGradient(OUT_W / 2, OUT_H * .48, OUT_H * .3, OUT_W / 2, OUT_H * .5, OUT_H * .78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(25,6,2,.5)'); X.fillStyle = vg; X.fillRect(0, 0, OUT_W, OUT_H); }
  const _c = performance.now(); drawChrome(si, S, lt);
  const cd = cardAt(S, t); if (cd) drawCard(cd.card, cd.a, cd.el);
  const cp = captionAt(S, t); if (cp) drawCaption(cp.text, cp.a);
  // cortina entre cenas
  let ck = 0; const nx = TL.scenes[si + 1];
  if (nx) ck = Math.max(ck, clamp(1 - (nx.start - t) / .9));
  if (si > 0) ck = Math.max(ck, clamp(1 - (t - S.start) / 1.1));
  if (si === 0) ck = Math.max(ck, clamp(1 - t / 1.6));
  if (!nx) ck = Math.max(ck, clamp(1 - (TL.total - t) / 1.6));
  drawCurtain(ck);
  // grão fino (±3%)
  if (window.PAGEGRADE) { X.save(); X.globalCompositeOperation = 'overlay'; X.globalAlpha = .10; X.drawImage(grains[fi % grains.length], 0, 0, OUT_W, OUT_H); X.restore(); }
  if (window.PROF) { const P = window.PROF; P.gl = (P.gl || 0) + (_b - _a) / 10; P.comp = (P.comp || 0) + (_c - _b) / 10; P.over = (P.over || 0) + (performance.now() - _c) / 10; P.calls = renderer.info.render.calls; P.tris = renderer.info.render.triangles; }
  return true;
};
window.grab = (t, fi = 0, q = .9) => { window.renderFrame(t, fi); return out.toDataURL('image/jpeg', q); };
window.ready = true;
