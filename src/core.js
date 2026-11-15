// Motor do palco Technicolor: céu pintado, texturas procedurais, construtor de cenários, manequins e placas.
import * as THREE from '../node_modules/three/build/three.module.js';
import { mergeGeometries } from '../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
export { THREE };

export const HERO = 0xD97757;
// gerador pseudoaleatório determinístico
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s ^= s >>> 16) >>> 0) / 4294967296); }
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const ease2 = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

// ---------- céu pintado ----------
export function makeSky() {
  // céu pintado pré-calculado (equiretangular) — mesmo desenho do shader original, custo zero por quadro
  const W = 2048, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const img = x.createImageData(W, H); const A = img.data;
  const hsh = (px, py) => { const v = Math.sin(px * 127.1 + py * 311.7) * 43758.5453; return v - Math.floor(v); };
  const nz = (px, py) => { const ix = Math.floor(px), iy = Math.floor(py); let fx = px - ix, fy = py - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = hsh(ix, iy), b = hsh(ix + 1, iy), cc = hsh(ix, iy + 1), d = hsh(ix + 1, iy + 1); return (a + (b - a) * fx) * (1 - fy) + (cc + (d - cc) * fx) * fy; };
  const fbm = (px, py) => { let a = .5, s = 0; for (let i = 0; i < 5; i++) { s += a * nz(px, py); px *= 2.03; py *= 2.03; a *= .5; } return s; };
  const sm = (e0, e1, v) => { const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const haze = [1, .70, .42], red = [.878, .282, .118], deep = [.74, .20, .10], vio = [.36, .16, .38];
  const sd = [-.95, .12, -.3]; const sl = Math.hypot(...sd); sd[0] /= sl; sd[1] /= sl; sd[2] /= sl;
  for (let j = 0; j < H; j++) {
    const th = j / H * Math.PI, y = Math.cos(th), st = Math.sin(th);
    if (y < -.2) { for (let i = 0; i < W; i++) { const o = (j * W + i) * 4; A[o] = 242; A[o + 1] = 158; A[o + 2] = 92; A[o + 3] = 255; } continue; }
    for (let i = 0; i < W; i++) {
      const ph = i / W * Math.PI * 2, dx = -Math.cos(ph) * st, dz = Math.sin(ph) * st, az = Math.atan2(dx, dz);
      let c3 = mix(haze, red, sm(-.02, .20, y)); c3 = mix(c3, deep, sm(.38, .62, y)); c3 = mix(c3, vio, sm(.70, .92, y));
      for (let k = 0; k < 4; k++) {
        const yc = .07 + k * .105, thk = .028 + k * .01; const f = fbm(az * (2.2 + k * .7) + k * 7 + 40, y * 9);
        const band = 1 - sm(0, thk, Math.abs(y - yc - (f - .5) * .07)); const dens = sm(.42, .62, f) * band;
        if (dens <= 0) continue;
        const edge = sm(0, .5, dens) - sm(.5, 1, dens), under = 1 - sm(yc - .03, yc + .02, y);
        const body = mix([.80, .27, .12], [.62, .17, .10], k / 3); c3 = mix(c3, body, dens * .85);
        const g = edge * (.55 + .6 * under); c3 = [c3[0] + g, c3[1] + .74 * g, c3[2] + .30 * g];
      }
      const sun = Math.max(0, dx * sd[0] + y * sd[1] + dz * sd[2]); const sg = Math.pow(sun, 400) * 1.6 + Math.pow(sun, 18) * .25;
      c3 = [c3[0] + sg, c3[1] + .78 * sg, c3[2] + .40 * sg];
      c3 = mix(c3, [.95, .62, .36], sm(.02, -.10, y));
      const o = (j * W + i) * 4; A[o] = Math.min(255, c3[0] * 255); A[o + 1] = Math.min(255, c3[1] * 255); A[o + 2] = Math.min(255, c3[2] * 255); A[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false });
  mat.uniforms = { uT: { value: 0 }, uDark: { value: 0 } };
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 32), mat);
  m.frustumCulled = false; m.renderOrder = -1;
  return m;
}

// ---------- texturas procedurais ----------
const TEX = {};
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function speckle(x, w, h, amt, seed) {
  const R = rng(seed); const d = x.getImageData(0, 0, w, h); const a = d.data;
  for (let i = 0; i < a.length; i += 4) { const v = (R() - .5) * amt; a[i] += v; a[i + 1] += v; a[i + 2] += v; }
  x.putImageData(d, 0, 0);
}
function brickCanvas(base, mortar, seed, bw = 64, bh = 26) {
  const W = 512, H = 512, c = cv(W, H), x = c.getContext('2d'), R = rng(seed);
  x.fillStyle = mortar; x.fillRect(0, 0, W, H);
  for (let r = 0; r * bh < H; r++) for (let k = -1; k * bw < W; k++) {
    const off = (r % 2) * bw / 2; const v = .78 + R() * .38;
    const [br, bg, bb] = base; x.fillStyle = `rgb(${br * v | 0},${bg * v | 0},${bb * v | 0})`;
    x.fillRect(k * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
    if (R() < .3) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(k * bw + off + 2, r * bh + bh - 7, bw - 4, 5); }
    if (R() < .25) { x.fillStyle = 'rgba(255,200,140,.10)'; x.fillRect(k * bw + off + 4, r * bh + 3, bw - 12, 4); }
  }
  speckle(x, W, H, 34, seed + 1);
  return c;
}
function plasterCanvas(base, seed) {
  const W = 512, H = 512, c = cv(W, H), x = c.getContext('2d'), R = rng(seed);
  x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) { const r = 10 + R() * 60; x.fillStyle = `rgba(${R() < .5 ? '90,50,30' : '255,235,200'},${.03 + R() * .05})`; x.beginPath(); x.arc(R() * W, R() * H, r, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(70,40,25,.18)'; x.lineWidth = 1;
  for (let i = 0; i < 14; i++) { x.beginPath(); let px = R() * W, py = R() * H; x.moveTo(px, py); for (let j = 0; j < 6; j++) { px += (R() - .5) * 40; py += R() * 30; x.lineTo(px, py); } x.stroke(); }
  speckle(x, W, H, 26, seed + 3);
  return c;
}
function stoneCanvas(base, seed, n = 6) {
  const W = 512, H = 512, c = cv(W, H), x = c.getContext('2d'), R = rng(seed);
  x.fillStyle = '#3a2a22'; x.fillRect(0, 0, W, H); const s = W / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = .75 + R() * .4; const [r, g, b] = base;
    x.fillStyle = `rgb(${r * v | 0},${g * v | 0},${b * v | 0})`;
    const o = 3 + R() * 3; x.beginPath(); x.roundRect(i * s + o, j * s + o, s - 2 * o, s - 2 * o, 10); x.fill();
  }
  speckle(x, W, H, 30, seed + 5);
  return c;
}
function checkerCanvas(a, b) {
  const c = cv(512, 512), x = c.getContext('2d'); const s = 64;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(i * s, j * s, s, s); }
  x.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, 512); x.moveTo(0, i * s); x.lineTo(512, i * s); x.stroke(); }
  speckle(x, 512, 512, 20, 9);
  return c;
}
function woodCanvas() {
  const c = cv(256, 256), x = c.getContext('2d'), R = rng(77);
  x.fillStyle = '#c99561'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(110,60,25,${.08 + R() * .15})`; x.beginPath(); const y = R() * 256; x.moveTo(0, y); x.bezierCurveTo(80, y + R() * 10 - 5, 170, y + R() * 10 - 5, 256, y); x.stroke(); }
  speckle(x, 256, 256, 14, 78);
  return c;
}
function texFrom(canvas, key) {
  const t = new THREE.CanvasTexture(canvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX[key] = t; return t;
}
export function initTextures() {
  texFrom(brickCanvas([128, 48, 32], '#5b3a2c', 11), 'brick');
  texFrom(brickCanvas([70, 34, 30], '#2c1e1a', 12), 'darkbrick');
  texFrom(brickCanvas([168, 98, 60], '#6e4a34', 13), 'tanbrick');
  texFrom(plasterCanvas('226,196,150', 21), 'plaster');
  texFrom(plasterCanvas('196,140,96', 22), 'ochre');
  texFrom(plasterCanvas('110,128,150', 23), 'blueplaster');
  texFrom(stoneCanvas([150, 112, 84], 31), 'cobble');
  texFrom(stoneCanvas([110, 92, 82], 32, 4), 'rock');
  texFrom(checkerCanvas('#2b1d1a', '#e7d3ad'), 'checker');
  texFrom(woodCanvas(), 'wood');
}

// materiais em cache
const MATS = {};
export function mat(key) {
  if (MATS[key]) return MATS[key];
  const P = {
    brick: { map: 'brick', rough: .92 }, darkbrick: { map: 'darkbrick', rough: .95 }, tanbrick: { map: 'tanbrick', rough: .9 },
    plaster: { map: 'plaster', rough: .9 }, ochre: { map: 'ochre', rough: .9 }, blueplaster: { map: 'blueplaster', rough: .9 },
    cobble: { map: 'cobble', rough: .95 }, rock: { map: 'rock', rough: .95 }, checker: { map: 'checker', rough: .6 }, wood: { map: 'wood', rough: .8 },
    trim: { color: 0xe9d2a6, rough: .8 }, dark: { color: 0x1d1210, rough: .9 }, iron: { color: 0x2a201c, rough: .5, metal: .6 },
    brass: { color: 0xd6a34a, rough: .35, metal: .8 }, glass: { color: 0xffc77a, emissive: 0xff9a40, ei: .9, rough: .3 },
    window: { color: 0x2a1812, rough: .7 }, hero: { color: HERO, rough: .5, emissive: HERO, ei: .32 }, cream: { color: 0xf3e3c2, rough: .7 },
    red: { color: 0xb02a1e, rough: .7 }, blood: { color: 0x8e1b1b, rough: .5 }, kidney: { color: 0x7a2b25, rough: .6 },
    pink: { color: 0xe6869a, rough: .6 }, blue: { color: 0x5a63b8, rough: .6 }, pale: { color: 0xd9cfc0, rough: .7 },
    gold: { color: 0xf0b545, rough: .4, metal: .5 }, green: { color: 0x4f7a4a, rough: .8 }, white: { color: 0xf4efe6, rough: .7 },
    bone: { color: 0xe8dcc0, rough: .8 }, water: { color: 0x6aa8d8, rough: .2, emissive: 0x153a5a, ei: .5 },
    lamp: { color: 0xffe0a0, emissive: 0xffb050, ei: 2.2 }, redlamp: { color: 0xff4030, emissive: 0xff2010, ei: 2.5 },
    colloid: { color: 0xf0b860, rough: .35, emissive: 0x6a3a10, ei: .25 }, purple: { color: 0x7b4f9e, rough: .6 },
    acinar: { color: 0x8a3f6a, rough: .7 }, islet: { color: 0xf0d8b8, rough: .7 }, liver: { color: 0x6e2a1e, rough: .6 },
  }[key] || { color: 0xff00ff };
  const m = new THREE.MeshStandardMaterial({ color: P.color ?? 0xffffff, roughness: P.rough ?? .8, metalness: P.metal ?? 0 });
  if (P.map) { m.map = TEX[P.map]; if (window.BUMP) { m.bumpMap = TEX[P.map]; m.bumpScale = 1.6; } }
  if (P.emissive) { m.emissive = new THREE.Color(P.emissive); m.emissiveIntensity = P.ei; }
  MATS[key] = m; return m;
}

// UV por projeção em caixa (escala do mundo), para texturas contínuas em geometrias mescladas
function boxUV(g, scale) {
  const p = g.attributes.position, nrm = g.attributes.normal; const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i));
    let u, v; if (nx >= ny && nx >= nz) { u = p.getZ(i); v = p.getY(i); } else if (ny >= nz) { u = p.getX(i); v = p.getZ(i); } else { u = p.getX(i); v = p.getY(i); }
    uv[2 * i] = u / scale; uv[2 * i + 1] = v / scale;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
const UVSCALE = { brick: 2.4, darkbrick: 2.4, tanbrick: 2.4, plaster: 4, ochre: 4, blueplaster: 4, cobble: 5, rock: 4, checker: 6, wood: 1.5 };

// ---------- construtor (mescla geometrias por material) ----------
export class Builder {
  constructor() { this.parts = {}; this.extra = []; }
  add(key, geom, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
    const g = geom.index ? geom.toNonIndexed() : geom.clone();
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scl));
    g.applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (UVSCALE[key]) boxUV(g, UVSCALE[key]);
    (this.parts[key] ||= []).push(g); return this;
  }
  box(key, w, h, d, x, y, z, ry = 0) { return this.add(key, BOX, [x, y, z], [0, ry, 0], [w, h, d]); }
  cyl(key, r, h, x, y, z, rot = [0, 0, 0], seg = 10) { return this.add(key, new THREE.CylinderGeometry(r, r, h, seg), [x, y, z], rot); }
  build() {
    const grp = new THREE.Group();
    for (const [k, gs] of Object.entries(this.parts)) {
      const mesh = new THREE.Mesh(mergeGeometries(gs, false), mat(k)); mesh.castShadow = mesh.receiveShadow = true; grp.add(mesh);
    }
    return grp;
  }
}
const BOX = new THREE.BoxGeometry(1, 1, 1);

// fachada detalhada: tijolo, janelas com peitoril, cornija, sacada com gradil, escada de marinheiro, varal
export function facade(b, o) {
  const { x = 0, z = 0, ry = 0, w = 8, h = 9, d = .6, tex = 'brick', cols = 3, rows = 3, seed = 1, balcony = true, ladder = true, door = false } = o;
  const R = rng(seed); const c = Math.cos(ry), s = Math.sin(ry);
  const P = (lx, ly, lz) => [x + lx * c + lz * s, ly, z - lx * s + lz * c];
  const bx = (k, W, H, D, lx, ly, lz) => b.add(k, BOX, P(lx, ly, lz), [0, ry, 0], [W, H, D]);
  bx(tex, w, h, d, 0, h / 2, 0);
  bx('trim', w + .3, .28, d + .35, 0, h + .14, 0); bx('trim', w + .1, .16, d + .2, 0, h * .36, 0); // cornija e friso
  bx('plaster', w + .4, .5, d + .4, 0, .25, 0); // embasamento
  const cw = w / cols, rh = (h - 1.2) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const wx = -w / 2 + cw * (i + .5), wy = 1.2 + rh * (j + .45), ww = Math.min(1.3, cw * .45), wh = Math.min(2, rh * .6);
    if (door && j === 0 && i === Math.floor(cols / 2)) {
      bx('window', 1.6, 2.6, .1, wx, 1.3, d / 2 + .02); bx('trim', 2, .25, .3, wx, 2.7, d / 2 + .1); bx('trim', .2, 2.7, .3, wx - .9, 1.35, d / 2 + .1); bx('trim', .2, 2.7, .3, wx + .9, 1.35, d / 2 + .1);
      continue;
    }
    bx(R() < .28 ? 'glass' : 'window', ww, wh, .1, wx, wy, d / 2 + .01);
    bx('trim', ww + .3, .14, .45, wx, wy - wh / 2 - .07, d / 2 + .15); // peitoril
    bx('trim', ww + .24, .16, .2, wx, wy + wh / 2 + .08, d / 2 + .06); // verga
    bx('trim', .1, wh, .16, wx - ww / 2 - .05, wy, d / 2 + .05); bx('trim', .1, wh, .16, wx + ww / 2 + .05, wy, d / 2 + .05);
    bx('iron', .05, wh, .06, wx, wy, d / 2 + .08); // caixilho
    if (R() < .35) { bx('green', ww * .48, wh, .06, wx - ww * .75, wy, d / 2 + .06); bx('green', ww * .48, wh, .06, wx + ww * .75, wy, d / 2 + .06); }
  }
  if (balcony && rows > 1) {
    const by = 1.2 + rh * 1 - .1, bw = Math.min(w * .5, 4);
    bx('plaster', bw, .18, 1, 0, by, d / 2 + .5);
    for (let k = 0; k <= 10; k++) bx('iron', .05, .9, .05, -bw / 2 + bw * k / 10, by + .5, d / 2 + .95);
    bx('iron', bw, .06, .08, 0, by + .95, d / 2 + .95);
    for (let k = 0; k < 4; k++) bx('red', .4, .3, .3, -bw / 2 + .5 + k * (bw - 1) / 3, by + .25, d / 2 + .3); // floreiras
  }
  if (ladder) {
    const lx = w / 2 - .5; for (const sx of [-.22, .22]) bx('iron', .05, h - .6, .05, lx + sx, h / 2 + .3, d / 2 + .25);
    for (let k = 0; k < (h - 1) / .4; k++) bx('iron', .44, .04, .04, lx, .8 + k * .4, d / 2 + .25);
  }
}
// varal com bandeirolas entre dois pontos
export function bunting(b, a, c, n = 14, sag = .8, colors = ['red', 'cream', 'gold', 'hero']) {
  const A = new THREE.Vector3(...a), C = new THREE.Vector3(...c);
  const curve = new THREE.QuadraticBezierCurve3(A, A.clone().lerp(C, .5).add(new THREE.Vector3(0, -sag * 2, 0)), C);
  b.add('iron', new THREE.TubeGeometry(curve, 24, .02, 4));
  for (let i = 1; i < n; i++) {
    const p = curve.getPoint(i / n); const tg = new THREE.ConeGeometry(.16, .4, 3); tg.rotateX(Math.PI);
    b.add(colors[i % colors.length], tg, [p.x, p.y - .22, p.z], [0, Math.atan2(C.x - A.x, C.z - A.z) + Math.PI / 2, 0], [1, 1, .2]);
  }
}

// ---------- contorno preto para o herói ----------
const RIM = new THREE.MeshBasicMaterial({ color: 0x0a0605, side: THREE.BackSide });
RIM.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.07;'); };
export function heroize(obj) {
  const adds = [];
  obj.traverse(o => { if (o.isMesh && !o.userData.rim) { o.castShadow = o.receiveShadow = true; const r = new THREE.Mesh(o.geometry, RIM); r.userData.rim = true; adds.push([o, r]); } });
  for (const [o, r] of adds) o.add(r);
  return obj;
}
export function heroMesh(geom, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  const m = new THREE.Mesh(geom, mat('hero')); m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scl); heroize(m); return m;
}

// ---------- placas de texto ----------
export function label(text, o = {}) {
  const { w = 2, h = .8, bg = '#f3e3c2', fg = '#2a160f', border = '#2a160f', font = 'Inter Display', weight = 900, size = 0.62, emissive = 0, stick = 0 } = o;
  const W = 512, H = Math.round(512 * h / w); const c = cv(W, H), x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, W, H); }
  if (border) { x.strokeStyle = border; x.lineWidth = 14; x.strokeRect(7, 7, W - 14, H - 14); }
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lines = String(text).split('\n'); let fs = H * size / lines.length;
  x.font = `${weight} ${fs}px "${font}"`; const mw = Math.max(...lines.map(l => x.measureText(l).width));
  if (mw > W * .86) { fs *= W * .86 / mw; x.font = `${weight} ${fs}px "${font}"`; }
  lines.forEach((l, i) => x.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * fs * 1.1));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: .7, side: THREE.DoubleSide });
  if (emissive) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = t; m.emissiveIntensity = emissive; }
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.castShadow = true; g.add(p);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + .08, h + .08, .05), mat('dark')); back.position.z = -.04; back.castShadow = true; g.add(back);
  if (stick) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, stick), mat('wood')); s.position.y = -h / 2 - stick / 2; s.castShadow = true; g.add(s); }
  g.userData.mat = m;
  return g;
}

// ---------- carta (hormônio) ----------
const ENV_G = new THREE.BoxGeometry(.5, .32, .03);
const SEAL_G = new THREE.CylinderGeometry(.07, .07, .03, 12);
export function letter(sealKey = 'hero') {
  const g = new THREE.Group(); const e = new THREE.Mesh(ENV_G, mat('cream')); e.castShadow = true; g.add(e);
  const s = new THREE.Mesh(SEAL_G, mat(sealKey)); s.rotation.x = Math.PI / 2; s.position.z = .02; g.add(s);
  return g;
}

// ---------- manequim articulado ----------
const J = new THREE.SphereGeometry(1, 14, 10);
const CAP = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
const G = { head: new THREE.SphereGeometry(.13, 18, 14), torso: CAP(.17, .38), pelvis: CAP(.15, .08), ua: CAP(.05, .26), la: CAP(.045, .24), ul: CAP(.07, .34), ll: CAP(.06, .34), hand: new THREE.SphereGeometry(.055, 10, 8), foot: new THREE.BoxGeometry(.11, .07, .24), neck: new THREE.CylinderGeometry(.045, .05, .1, 8) };
export function puppet(o = {}) {
  const { body = 'wood', suit = null, scale = 1, hat = null } = o;
  const M = k => mat(k); const sm = suit ? M(suit) : M(body);
  const root = new THREE.Group(); const hip = new THREE.Group(); hip.position.y = .98; root.add(hip);
  const mk = (geo, m, parent, y = 0) => { const x = new THREE.Mesh(geo, m); x.position.y = y; x.castShadow = true; parent.add(x); return x; };
  mk(G.pelvis, sm, hip, .02).rotation.z = Math.PI / 2;
  const chest = new THREE.Group(); chest.position.y = .08; hip.add(chest);
  mk(G.torso, sm, chest, .3);
  mk(G.neck, M(body), chest, .62);
  const head = new THREE.Group(); head.position.y = .78; chest.add(head); mk(G.head, M(body), head, .02);
  const jnt = (parent, y) => { const j = new THREE.Mesh(J, M('dark')); j.scale.setScalar(.045); j.position.y = y; parent.add(j); };
  if (hat === 'top') { mk(new THREE.CylinderGeometry(.11, .11, .22, 14), M('dark'), head, .22); mk(new THREE.CylinderGeometry(.18, .18, .02, 16), M('dark'), head, .12); }
  if (hat === 'chef') { mk(new THREE.CylinderGeometry(.12, .1, .2, 14), M('white'), head, .2); mk(new THREE.SphereGeometry(.15, 12, 8), M('white'), head, .33); }
  if (hat === 'cap') { mk(new THREE.CylinderGeometry(.14, .14, .08, 14), M(suit || 'hero'), head, .12); }
  const limb = (side) => {
    const sh = new THREE.Group(); sh.position.set(side * .25, .55, 0); chest.add(sh); jnt(sh, 0);
    mk(G.ua, sm, sh, -.18); const el = new THREE.Group(); el.position.y = -.36; sh.add(el); jnt(el, 0);
    mk(G.la, M(body), el, -.16); const hand = new THREE.Group(); hand.position.y = -.33; el.add(hand); mk(G.hand, M(body), hand);
    const hp = new THREE.Group(); hp.position.set(side * .1, .98, 0); hip.parent.add(hp); jnt(hp, 0);
    mk(G.ul, sm, hp, -.22); const kn = new THREE.Group(); kn.position.y = -.45; hp.add(kn); jnt(kn, 0);
    mk(G.ll, M(body), kn, -.22); const ft = mk(G.foot, M('dark'), kn, -.48); ft.position.z = .06;
    return { sh, el, hand, hp, kn };
  };
  const L = limb(1), Rr = limb(-1);
  root.scale.setScalar(scale);
  root.userData = { hip, chest, head, L, R: Rr };
  return root;
}
// pose em função do tempo — movimentos suaves, sem "pulos"
export function pose(p, t, mode = 'idle', ph = 0) {
  const u = p.userData; const s = Math.sin;
  let sw = 0, f = 0, bob = 0, lean = 0;
  if (mode === 'walk') { f = 6.2; sw = .55; bob = .03; lean = .05; }
  else if (mode === 'run') { f = 11; sw = .95; bob = .06; lean = .22; }
  else if (mode === 'slow') { f = 2.4; sw = .25; bob = .01; lean = -.08; }
  const a = t * f + ph;
  if (sw) {
    u.L.hp.rotation.x = s(a) * sw; u.R.hp.rotation.x = -s(a) * sw;
    u.L.kn.rotation.x = Math.max(0, -s(a + 1.2)) * sw * 1.4; u.R.kn.rotation.x = Math.max(0, s(a + 1.2)) * sw * 1.4;
    u.L.sh.rotation.x = -s(a) * sw * .8; u.R.sh.rotation.x = s(a) * sw * .8;
    u.L.el.rotation.x = -.3 - (mode === 'run' ? .9 : .1); u.R.el.rotation.x = -.3 - (mode === 'run' ? .9 : .1);
    u.hip.position.y = .98 + Math.abs(s(a)) * bob; u.chest.rotation.x = lean; u.chest.rotation.y = s(a) * .08;
  } else {
    const br = s(t * 1.6 + ph);
    u.hip.position.y = .98 + br * .006; u.chest.rotation.x = br * .02; u.head.rotation.y = s(t * .5 + ph) * .25;
    u.L.sh.rotation.z = .08; u.R.sh.rotation.z = -.08; u.L.sh.rotation.x = br * .04; u.R.sh.rotation.x = -br * .04;
    for (const k of ['L', 'R']) { u[k].hp.rotation.x = 0; u[k].kn.rotation.x = 0; u[k].el.rotation.x = -.15; }
    if (mode === 'hold') { u.R.sh.rotation.x = -2.2 + br * .03; u.R.el.rotation.x = -.25; u.R.sh.rotation.z = .1; }
    if (mode === 'raise') { u.R.sh.rotation.z = -2.6 + br * .04; u.R.el.rotation.z = -.2; u.L.sh.rotation.x = -1.2; u.L.el.rotation.x = -.8; }
    if (mode === 'carry') { u.L.sh.rotation.x = -.9; u.R.sh.rotation.x = -.9; u.L.el.rotation.x = -.9; u.R.el.rotation.x = -.9; u.L.sh.rotation.z = -.25; u.R.sh.rotation.z = .25; }
    if (mode === 'sit') { u.hip.position.y = .55; for (const k of ['L', 'R']) { u[k].hp.rotation.x = -1.5; u[k].kn.rotation.x = 1.5; } u.L.sh.rotation.x = -.9 + br * .03; u.R.sh.rotation.x = -.9 - br * .03; u.L.el.rotation.x = -.5; u.R.el.rotation.x = -.5; }
    if (mode === 'point') { u.R.sh.rotation.x = -1.5; u.R.sh.rotation.z = -.3 + s(t * .8) * .1; u.R.el.rotation.x = -.05; }
  }
}
// manequim com placa na mão
export function signPuppet(text, o = {}) {
  const p = puppet(o); const sg = label(text, { w: o.sw || 1.1, h: o.sh || .55, stick: .7, bg: o.bg, fg: o.fg });
  sg.position.set(-.3, 2.35, .32); p.add(sg);
  p.userData.sign = sg; p.userData.mode = 'hold';
  return p;
}
// grupo de partículas/objetos dispostos ao longo de uma curva (ex.: cartas viajando)
export function along(curve, u) { return curve.getPointAt(((u % 1) + 1) % 1); }
