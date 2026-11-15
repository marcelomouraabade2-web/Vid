// Os cenários do Palácio. Cada set devolve { group, sig, cams, update(ctx), dark? }
// cams[i] = [px,py,pz, lx,ly,lz]  (posição da câmera e ponto de mira)
import { THREE, Builder, facade, bunting, heroMesh, heroize, label, letter, puppet, pose, signPuppet, mat, rng, ease, clamp, along } from './core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const place = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
const spot = (fStart, f, lt, d = 2.5) => ease((lt - fStart(f)) / d);

// ---------- peças comuns ----------
function ground(b, key = 'cobble', size = 90) { b.box(key, size, .3, size, 0, -.15, 0); }
function backdrop(b, R = 26, seed = 3, tex = ['brick', 'tanbrick', 'ochre']) {
  const r = rng(seed);
  for (let i = -3; i <= 3; i++) {
    const h = 7 + r() * 7, w = 7 + r() * 3;
    facade(b, { x: i * 8.5, z: -R, w, h, tex: tex[(i + 9) % tex.length], cols: 3, rows: Math.max(2, Math.round(h / 3.2)), seed: seed * 10 + i, balcony: r() < .6 });
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const h = 6 + r() * 6; facade(b, { x: sx * R * .95, z: -R * .6 + i * 9, ry: -sx * Math.PI / 2, w: 8, h, tex: tex[i % tex.length], cols: 3, rows: Math.max(2, Math.round(h / 3.2)), seed: seed * 20 + i + sx });
  }
}
function lampPost(b, x, z, h = 4) {
  b.cyl('iron', .08, h, x, h / 2, z); b.cyl('iron', .2, .3, x, .15, z);
  b.box('iron', .7, .06, .06, x + .3, h - .1, z); b.add('lamp', new THREE.SphereGeometry(.2, 10, 8), [x + .6, h - .35, z]);
}
function crate(b, x, y, z, s = 1, ry = 0) {
  b.add('wood', new THREE.BoxGeometry(s, s, s), [x, y + s / 2, z], [0, ry, 0]);
  for (const k of [-1, 1]) b.add('iron', new THREE.BoxGeometry(s * 1.02, .06, s * 1.02), [x, y + s / 2 + k * s * .35, z], [0, ry, 0]);
}
function railing(b, x0, z0, x1, z1, y = 0, h = 1) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / .3));
  for (let i = 0; i <= n; i++) b.cyl('iron', .025, h, x0 + (x1 - x0) * i / n, y + h / 2, z0 + (z1 - z0) * i / n, [0, 0, 0], 5);
  const L = Math.hypot(x1 - x0, z1 - z0); b.add('iron', new THREE.BoxGeometry(L, .05, .06), [(x0 + x1) / 2, y + h, (z0 + z1) / 2], [0, -Math.atan2(z1 - z0, x1 - x0), 0]);
}
function stand(text, x, z, o = {}) { const s = label(text, { w: o.w || 2.4, h: o.h || .7, stick: o.stick ?? 1.3, ...o }); s.position.set(x, (o.y ?? 0) + (o.stick ?? 1.3) + (o.h || .7) / 2, z); s.rotation.y = o.ry || 0; return s; }
function kidneyGeo() { const g = new THREE.SphereGeometry(1, 28, 20); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const dent = Math.exp(-((x - 0) ** 2 * 3 + (z + 1) ** 2 * 2)) * .45; p.setXYZ(i, x * 1.7, y * .8, z * 1 + dent); } g.computeVertexNormals(); return g; }
function blobAlong(points, r0, r1, matKey, hero = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => V(...p))); const b = new Builder(); const n = 34;
  for (let i = 0; i <= n; i++) { const u = i / n; const p = curve.getPointAt(u); const r = r0 + (r1 - r0) * u; b.add(matKey, new THREE.SphereGeometry(r, 16, 12), [p.x, p.y, p.z]); }
  const g = b.build(); if (hero) heroize(g); return g;
}
// maquete do encéfalo em corte (para localização anatômica)
function brainModel(hi) {
  const g = new THREE.Group(); const b = new Builder();
  b.box('wood', 2.6, 1, 1.6, 0, .5, 0); b.box('trim', 2.8, .12, 1.8, 0, 1.06, 0);
  b.add('pink', new THREE.SphereGeometry(1.1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), [0, 1.12, 0], [0, 0, 0], [1.1, 1, .7]);
  b.box('dark', .5, .38, .3, 0, 1.55, .62); // 3º ventrículo (corte)
  b.cyl('pale', .06, .42, .06, 1.02, .66, [0, 0, .25]); // infundíbulo
  g.add(b.build());
  const mk = (pos, r, on) => { const m = on ? heroMesh(new THREE.SphereGeometry(r, 16, 12), pos) : new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat('pale')); m.position.set(...pos); m.castShadow = true; g.add(m); return m; };
  mk([0, 1.3, .66], .17, hi === 'hipotalamo');
  mk([.1, .8, .66], .14, hi === 'hipofise');
  mk([-.32, 1.82, .62], .1, hi === 'pineal');
  const lb = (t, x, y) => { const s = label(t, { w: 1.5, h: .32, size: .6 }); s.position.set(x, y, .75); g.add(s); };
  lb('3º VENTRÍCULO', 0, 2.5);
  if (hi === 'hipotalamo') { lb('HIPOTÁLAMO', 1.5, 1.4); lb('INFUNDÍBULO → HIPÓFISE', 1.2, .5); }
  if (hi === 'pineal') { lb('EPITÁLAMO · PINEAL', -1.4, 2.05); }
  return g;
}
// cartas que viajam ao longo de uma curva
function letterStream(group, curve, n, seal = 'hero', speed = .12) {
  const L = []; for (let i = 0; i < n; i++) { const l = letter(seal); group.add(l); L.push(l); }
  return lt => L.forEach((l, i) => { const u = lt * speed + i / n; const p = along(curve, u); l.position.copy(p); const q = along(curve, u + .01); l.lookAt(q); l.rotateY(Math.PI / 2); });
}
function walkers(group, n, path, o = {}) {
  const W = []; const R = rng(o.seed || 5);
  for (let i = 0; i < n; i++) {
    const suits = o.suits || ['red', 'blue', 'green', 'ochre', 'purple', 'cream'];
    const p = puppet({ suit: suits[i % suits.length], scale: .95 + R() * .1, hat: o.hat });
    if (o.letters !== false) { const l = letter(o.seal || 'hero'); l.position.set(0, 1.3, .32); l.rotation.x = -.3; p.add(l); }
    group.add(p); W.push({ p, off: i / n, ph: R() * 6 });
  }
  return lt => W.forEach(w => {
    const u = lt * (o.speed || .025) + w.off; const a = along(path, u), c = along(path, u + .002);
    w.p.position.copy(a); w.p.rotation.y = Math.atan2(c.x - a.x, c.z - a.z); pose(w.p, lt, 'walk', w.ph);
    if (o.letters !== false) { w.p.userData.L.sh.rotation.x = -1.1; w.p.userData.R.sh.rotation.x = -1.1; w.p.userData.L.el.rotation.x = -.6; w.p.userData.R.el.rotation.x = -.6; }
  });
}
const ellipse = (cx, cz, rx, rz, y = 0) => { const pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; pts.push(V(cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz)); } return new THREE.CatmullRomCurve3(pts, true); };

// =========================================================
// PALÁCIO (introdução e fechamento)
// =========================================================
function palaceBase(names) {
  const group = new THREE.Group(); const b = new Builder();
  ground(b, 'cobble', 120);
  // alas de tijolo
  facade(b, { x: -8, z: -7, w: 10, h: 11, cols: 4, rows: 3, seed: 2, tex: 'brick' });
  facade(b, { x: 8, z: -7, w: 10, h: 11, cols: 4, rows: 3, seed: 3, tex: 'brick' });
  facade(b, { x: -15, z: -12, w: 6, h: 14, cols: 2, rows: 4, seed: 4, tex: 'darkbrick' });
  facade(b, { x: 15, z: -12, w: 6, h: 14, cols: 2, rows: 4, seed: 5, tex: 'darkbrick' });
  // escadaria
  for (let i = 0; i < 6; i++) b.box('plaster', 7 - i * .3, .22, 1, 0, .11 + i * .22, -1 + -i * .55);
  railing(b, -3.6, -.6, -2.2, -4, 0, 1); railing(b, 3.6, -.6, 2.2, -4, 0, 1);
  // base escura atrás da torre
  b.box('darkbrick', 7, 6, 3, 0, 3, -6.6);
  // avenida com 8 pavilhões (os loci)
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1, zz = 8 + Math.floor(i / 2) * 8 + (side > 0 ? 4 : 0);
    facade(b, { x: side * 6.2, z: zz, ry: -side * Math.PI / 2, w: 6, h: 6 + (i % 3), cols: 2, rows: 2, seed: 40 + i, tex: ['brick', 'ochre', 'tanbrick', 'blueplaster'][i % 4], balcony: false, door: true });
    const s = label(names[i], { w: 3.4, h: .9, size: .5 }); s.position.set(side * 5.4, 3.9, zz); s.rotation.y = -side * Math.PI / 2; group.add(s);
    lampPost(b, side * 3.6, zz - 2.5);
  }
  for (let i = 0; i < 4; i++) bunting(b, [-5.4, 5.5, 8 + i * 8], [5.4, 5.5, 12 + i * 8], 16, .5);
  bunting(b, [-12.5, 9, -6.6], [-3, 7.5, -4.4], 14, .7); bunting(b, [3, 7.5, -4.4], [12.5, 9, -6.6], 14, .7);
  backdrop(b, 34, 7);
  group.add(b.build());
  // HERÓI: torre central laranja com cúpula
  const tower = new THREE.Group();
  tower.add(heroMesh(new THREE.CylinderGeometry(2.3, 2.5, 11, 32), [0, 5.5, 0]));
  tower.add(heroMesh(new THREE.SphereGeometry(2.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), [0, 11, 0]));
  tower.add(heroMesh(new THREE.ConeGeometry(.35, 2.6, 12), [0, 14.4, 0]));
  tower.add(heroMesh(new THREE.TorusGeometry(2.45, .16, 8, 40), [0, 11, 0], [Math.PI / 2, 0, 0]));
  const tb = new Builder();
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; tb.box('window', .5, 1.4, .1, Math.sin(a) * 2.42, 7.6, Math.cos(a) * 2.42, a); tb.box('trim', .75, .14, .3, Math.sin(a) * 2.45, 6.85, Math.cos(a) * 2.45, a); }
  tb.box('window', 1.6, 2.8, .2, 0, 1.4, 2.4); tb.box('brass', .25, .25, .1, .5, 1.4, 2.52);
  tower.add(tb.build());
  tower.position.set(0, 1.3, -5); group.add(tower);
  const flag = label('HOMEOSTASE', { w: 3.6, h: .8, bg: '#b02a1e', fg: '#f3e3c2', border: '#2a160f' }); flag.position.set(0, 5.2, -2.45); group.add(flag);
  const upd = walkers(group, 8, ellipse(0, 6, 3, 2.2), { seed: 9, speed: .02 });
  return { group, upd };
}
export function palacio() {
  const { group, upd } = palaceBase(['RECEPÇÃO', 'HIPOTÁLAMO', 'HIPÓFISE', 'TIREOIDE', 'PARATIREOIDES', 'PINEAL', 'SUPRARRENAIS', 'PÂNCREAS']);
  return { group, sig: [0, .7, 15, 0, 13, -5], cams: [[0, 1.7, 15, 0, 6.5, -5], [4, 1.5, 11, 0, 1.6, 5], [-3.5, 2, 12, 0, 8, -5], [0, 2.3, 4, 0, 2.2, 30], [0, 2.2, 20, 0, 2.4, 44]], update: c => upd(c.lt) };
}
export function mapa() {
  const { group, upd } = palaceBase(['RECEPÇÃO · HORMÔNIOS', 'HIPOTÁLAMO · COMANDO', 'HIPÓFISE · FÁBRICA/DEPÓSITO', 'TIREOIDE · METABOLISMO', 'PARATIREOIDES · CÁLCIO', 'PINEAL · SONO', 'SUPRARRENAIS · ESTRESSE', 'PÂNCREAS · GLICEMIA']);
  return { group, sig: [0, .7, 15, 0, 13, -5], cams: [[12, 13, 32, 0, 2, 16], [0, 2.3, 6, 0, 2.4, 22], [0, 2.3, 22, 0, 2.4, 42], [0, 1.6, 16, 0, 7, -5], [0, .8, 13, 0, 12.5, -5]], update: c => upd(c.lt) };
}

// =========================================================
// RECEPÇÃO
// =========================================================
export function recepcao() {
  const group = new THREE.Group(); const b = new Builder();
  ground(b, 'cobble', 90); b.box('checker', 24, .06, 20, 0, .03, -1);
  facade(b, { x: -6, z: -9, w: 12, h: 9, tex: 'ochre', cols: 4, rows: 3, seed: 11 });
  facade(b, { x: 6, z: -9, w: 12, h: 9, tex: 'ochre', cols: 4, rows: 3, seed: 12, ladder: false });
  facade(b, { x: -11.5, z: -2, ry: Math.PI / 2, w: 14, h: 8, tex: 'brick', cols: 4, rows: 2, seed: 13 });
  facade(b, { x: 11.5, z: -2, ry: -Math.PI / 2, w: 14, h: 8, tex: 'brick', cols: 4, rows: 2, seed: 14 });
  // balcão
  b.box('wood', 5, 1.1, 1.2, 0, .55, -2.5); b.box('trim', 5.3, .12, 1.4, 0, 1.16, -2.5); b.box('hero', .01, .01, .01, 0, -5, 0);
  for (let i = 0; i < 12; i++) b.box('cream', .3, .04, .2, -2 + i * .35, 1.25, -2.4 - (i % 3) * .1); // pilha de cartas
  // escaninhos (caixas postais) na parede do fundo
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { b.box('wood', .8, .6, .4, -3.2 + i * .9, 2.2 + j * .7, -8.5); b.box('dark', .6, .4, .1, -3.2 + i * .9, 2.2 + j * .7, -8.3); }
  bunting(b, [-11, 7, -4], [11, 7, -4], 22, .6);
  lampPost(b, -9, 3); lampPost(b, 9, 3);
  backdrop(b, 30, 17);
  // fechadura gigante (placa de latão) e célula sem ductos + capilar
  b.box('brass', 2.6, 3.4, .25, 4.2, 4.5, -8.6); b.box('dark', .5, 1.2, .3, 4.2, 4.3, -8.5); b.add('dark', new THREE.CylinderGeometry(.42, .42, .3, 20), [4.2, 5, -8.48], [Math.PI / 2, 0, 0]);
  b.box('pink', 2.2, 2.2, 2.2, -8.2, 1.1, -5); b.box('trim', 2.4, .15, 2.4, -8.2, 2.25, -5);
  const capCurve = new THREE.CatmullRomCurve3([V(-10.5, .6, -1), V(-7, .7, -2.5), V(-6.6, 1.5, -6), V(-8, 2.6, -8), V(-10.5, 3, -8.3)]);
  b.add('blood', new THREE.TubeGeometry(capCurve, 40, .32, 10));
  // ar-condicionado + termômetro (parede direita)
  b.box('plaster', .5, 1.4, 2.6, 11.05, 4.2, -3.5); for (let k = 0; k < 6; k++) b.box('iron', .06, .08, 2.3, 10.78, 3.7 + k * .18, -3.5);
  b.box('trim', .2, 2.6, .5, 11, 3.6, -.8); b.cyl('white', .08, 2.2, 10.85, 3.6, -.8);
  // eixo de feedback (três plataformas)
  const ax = [[-8.5, 7, 'HIPOTÁLAMO'], [-8.5, 4.5, 'HIPÓFISE'], [-8.5, 2, 'TIREOIDE']];
  for (const [x, y] of ax) { b.box('plaster', 2.4, .3, 1.6, x, y, -7); b.cyl('iron', .1, y, x - .9, y / 2, -7.6); b.cyl('iron', .1, y, x + .9, y / 2, -7.6); }
  group.add(b.build());
  ax.forEach(([x, y, t]) => { const s = label(t, { w: 2.2, h: .5, size: .55 }); s.position.set(x, y + .55, -6.15); group.add(s); });
  const downC = new THREE.CatmullRomCurve3([V(-8, 7.4, -6.6), V(-7.2, 5.8, -6.4), V(-8, 4.9, -6.6), V(-7.2, 3.3, -6.4), V(-8, 2.4, -6.6)]);
  const backC = new THREE.CatmullRomCurve3([V(-9.1, 2.4, -6.5), V(-10.4, 4.6, -6.4), V(-9.2, 7.3, -6.5)]);
  const back = new THREE.Mesh(new THREE.TubeGeometry(backC, 30, .07, 6), mat('red')); group.add(back);
  const sDown = letterStream(group, downC, 4, 'hero', .18); const sBack = letterStream(group, backC, 2, 'red', .14);
  const sCap = letterStream(group, capCurve, 6, 'hero', .05);
  // termômetro (coluna de mercúrio)
  const merc = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 1, 10), mat('redlamp')); merc.position.set(10.82, 2.5, -.8); group.add(merc);
  // ar: fitas onduladas
  const airs = []; for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.TorusGeometry(.6 + k * .25, .03, 6, 24, Math.PI * .7), mat('white')); m.position.set(10.3 - k * .25, 3.2, -3.5); m.rotation.set(0, Math.PI / 2, Math.PI * .6); group.add(m); airs.push(m); }
  const gl = label('SEM DUCTOS', { w: 2, h: .5 }); gl.position.set(-8.2, 2.7, -3.85); group.add(gl);
  const acl = label('FEEDBACK', { w: 1.8, h: .45 }); acl.position.set(10.7, 5.3, -3.5); acl.rotation.y = -Math.PI / 2; group.add(acl);
  // HERÓI: chave gigante
  const key = new THREE.Group();
  key.add(heroMesh(new THREE.TorusGeometry(1.15, .32, 14, 36), [0, 0, 0]));
  key.add(heroMesh(new THREE.CylinderGeometry(.24, .24, 3.6, 16), [0, 0, -2.9], [Math.PI / 2, 0, 0]));
  key.add(heroMesh(new THREE.BoxGeometry(.25, .9, .35), [0, -.5, -4.2])); key.add(heroMesh(new THREE.BoxGeometry(.25, .6, .3), [0, -.4, -3.6]));
  group.add(key);
  // três funcionários especiais
  const peps = signPuppet('PEPTÍDICO', { suit: 'blue', sw: 1.5 }); place(peps, -2.2, 0, 1.2);
  const ster = signPuppet('ESTEROIDE', { suit: 'gold', sw: 1.5 }); place(ster, 0, 0, 1.2);
  const amin = signPuppet('AMINOÁCIDO', { suit: 'green', sw: 1.6 }); place(amin, 2.2, 0, 1.2);
  group.add(peps, ster, amin);
  // adereços: cadeia de contas (proteína), anéis (esteroide), anel com cauda (amina)
  for (let k = 0; k < 9; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), mat(k % 2 ? 'blue' : 'cream')); s.position.set(-.35 + k * .09, 1.55 - Math.sin(k / 8 * Math.PI) * .3, .25); peps.add(s); }
  const ring = r => { const m = new THREE.Mesh(new THREE.TorusGeometry(.13, .035, 6, 6), mat('gold')); m.position.set(...r); ster.add(m); };
  ring([-.2, 1.5, .3]); ring([.02, 1.5, .3]); ring([.24, 1.5, .3]); ring([.42, 1.62, .3]);
  const am = new THREE.Mesh(new THREE.TorusGeometry(.15, .04, 6, 6), mat('green')); am.position.set(0, 1.5, .3); amin.add(am);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .4), mat('green')); tail.position.set(.3, 1.4, .3); tail.rotation.z = 1; amin.add(tail);
  // membrana translúcida atravessada pelo esteroide
  const mem = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, .08), new THREE.MeshStandardMaterial({ color: 0xffd9a0, transparent: true, opacity: .35, roughness: .3 })); mem.position.set(0, 1.2, -.2); group.add(mem);
  const upd = walkers(group, 9, ellipse(0, -4.6, 5.5, 1.5), { seed: 4, speed: .018 });
  return {
    group, sig: [0, .8, 14, 2, 7, -6],
    cams: [[0, 1.8, 12, 0, 2.6, -3], [-3, 1.6, 4.5, 0, 1.4, -4], [6.5, 4.6, 3, 4.2, 4.4, -6], [-4.5, 2.4, 2.5, -8, 1.8, -5], [-2.2, 1.7, 4.6, -2.2, 1.6, 1.2], [0, 1.7, 4.6, 0, 1.6, 1.2], [2.2, 1.7, 4.6, 2.2, 1.6, 1.2], [5.5, 2.8, 1, 10.8, 3.6, -2.5], [-4.2, 4.2, 3, -8.5, 4.4, -7]],
    update(c) {
      upd(c.lt); sDown(c.lt); sBack(c.lt); sCap(c.lt);
      const k = c.spot(2, 3.5); const turn = ease((c.lt - c.fStart(2) - 3.6) / 1.2);
      key.position.set(4.2, 4.6, -1.2 - k * 3.1 + Math.sin(c.lt * .8) * .05 * (1 - k)); key.rotation.set(0, 0, turn * Math.PI / 2 + Math.sin(c.lt * .6) * .05 * (1 - k));
      for (const [p, ph, md] of [[peps, 0, 'idle'], [ster, 1, 'idle'], [amin, 2, 'idle']]) pose(p, c.lt, 'hold', ph);
      ster.position.z = 1.2 - ease((c.lt - c.fStart(5)) / 4) * 2.2;
      const temp = .5 + .35 * Math.sin(c.lt * .5); merc.scale.y = .4 + temp * 1.6; merc.position.y = 2.4 + merc.scale.y / 2;
      airs.forEach((a, i) => { a.position.x = 10.3 - ((c.lt * .6 + i * .3) % 1.4); a.material = mat('white'); });
    },
  };
}

// =========================================================
// HIPOTÁLAMO — sala de comando
// =========================================================
export function comando() {
  const group = new THREE.Group(); const b = new Builder();
  ground(b, 'cobble', 90); b.box('wood', 26, .1, 18, 0, .05, -1);
  b.box('darkbrick', 14, 8.5, 1, 0, 4.25, -9.5); b.box('trim', 14.4, .3, 1.4, 0, 8.6, -9.5);
  facade(b, { x: -11, z: -6, ry: Math.PI / 2, w: 10, h: 9, tex: 'brick', cols: 3, rows: 3, seed: 21 });
  facade(b, { x: 11, z: -6, ry: -Math.PI / 2, w: 10, h: 9, tex: 'brick', cols: 3, rows: 3, seed: 22 });
  // escadaria de chegada
  for (let i = 0; i < 5; i++) b.box('plaster', 3, .2, .6, -9 + i * .6, .1 + i * .2, 6);
  // plataforma do prefeito
  b.box('plaster', 4.6, 1.2, 4, 0, .6, -2.5); railing(b, -2.3, -.5, 2.3, -.5, 1.2, .9); b.box('wood', 1.6, 1.6, .3, 0, 2.2, -1.2); b.box('wood', 1.8, .3, 1.6, 0, 1.75, -2);
  // monitores
  const mons = ['TEMPERATURA', 'OSMOLARIDADE', 'FOME', 'SEDE', 'SONO', 'ESTRESSE'];
  mons.forEach((t, i) => { const x = (i % 3 - 1) * 3.8, y = i < 3 ? 6 : 3.4; b.box('iron', 3.4, 2.3, .4, x, y, -8.9); });
  // cubículos dos núcleos hipotalâmicos
  for (let i = 0; i < 3; i++) { const z = 1 - i * 2.6; b.box('ochre', .2, 2.2, 2.2, 6.5, 1.1, z); b.box('ochre', .2, 2.2, 2.2, 9.5, 1.1, z); b.box('ochre', 3.2, 2.2, .2, 8, 1.1, z - 1.1); b.box('trim', 3.4, .14, 2.4, 8, 2.25, z); b.add('lamp', new THREE.SphereGeometry(.12, 8, 6), [8, 2, z]); }
  // torneira + cano + rim (ADH)
  b.cyl('iron', .2, 5, -9, 2.5, -4); b.cyl('iron', .2, 2, -8, 4.8, -4, [0, 0, Math.PI / 2]); b.cyl('brass', .14, .6, -7, 4.5, -4); b.box('brass', .6, .12, .12, -7, 5, -4);
  // parede do ducto coletor (aquaporinas)
  b.box('pink', .4, 3, 4, -9.6, 1.5, -7.2); b.box('trim', .5, .2, 4.2, -9.6, 3.05, -7.2);
  // berço e mamadeira (ocitocina)
  b.box('wood', 1.6, .6, .9, 8.5, .5, -6); for (let k = 0; k < 7; k++) b.cyl('wood', .03, .5, 7.8 + k * .23, 1, -5.6);
  bunting(b, [-10.5, 7.5, -3], [10.5, 7.5, -3], 20, .5);
  backdrop(b, 30, 23, ['darkbrick', 'brick', 'tanbrick']);
  group.add(b.build());
  mons.forEach((t, i) => { const s = label(t, { w: 3.1, h: 2, bg: '#163a3a', fg: '#ffd27a', border: '#0b1f1f', emissive: .9, size: .3 }); s.position.set((i % 3 - 1) * 3.8, i < 3 ? 6 : 3.4, -8.65); group.add(s); });
  const kid = new THREE.Mesh(kidneyGeo(), mat('kidney')); kid.position.set(-7, 1, -4); kid.scale.setScalar(.7); kid.castShadow = true; group.add(kid);
  const drops = []; for (let k = 0; k < 5; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), mat('water')); group.add(d); drops.push(d); }
  const aqps = []; for (let k = 0; k < 5; k++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .9, 12), mat('water')); a.rotation.z = Math.PI / 2; group.add(a); aqps.push(a); }
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .5, 12), mat('white')); bottle.position.set(8.6, 1.1, -5.3); group.add(bottle);
  const bm = brainModel('hipotalamo'); place(bm, -6, 0, 1.5, .5); group.add(bm);
  group.add(stand('NÚCLEOS HIPOTALÂMICOS', 8, 2.6, { w: 3.2, h: .55, stick: 1.8 }));
  group.add(stand('DUCTO COLETOR · V2 · AQP2', -9.2, -4.9, { w: 3, h: .5, stick: 2.6, ry: Math.PI / 2 }));
  // HERÓI: o prefeito
  const mayor = puppet({ suit: 'hero', body: 'wood', scale: 2.3, hat: 'top' }); heroize(mayor); place(mayor, 0, 1.2, -2.2, Math.PI); group.add(mayor);
  // neurônios dos núcleos
  const neur = []; for (let i = 0; i < 3; i++) { const p = puppet({ suit: 'blue', scale: .8 }); place(p, 8, 0, 1 - i * 2.6, -Math.PI / 2); group.add(p); neur.push(p); }
  // seis funcionários com placas
  const six = ['TRH', 'CRH', 'GnRH', 'GHRH', 'SOMATOSTATINA', 'DOPAMINA'].map((t, i) => { const p = signPuppet(t, { suit: ['red', 'purple', 'green', 'blue', 'ochre', 'gold'][i], sw: t.length > 5 ? 1.9 : 1.1 }); place(p, -5 + i * 2, 0, 3.4); group.add(p); return p; });
  const adh = signPuppet('ADH', { suit: 'blue' }); place(adh, -7.4, 0, -2.4, .9); group.add(adh);
  const oci = signPuppet('OCITOCINA', { suit: 'pink', sw: 1.7 }); place(oci, 7.3, 0, -4.3, -.6); group.add(oci);
  return {
    group, sig: [2.5, .8, 7.5, 0, 6.2, -3],
    cams: [[0, 2.2, 10, 0, 3.6, -3], [2.8, 3.8, 1.6, 0, 4.7, -8.8], [-3.6, 2.4, 5.6, -6, 1.8, 1.5], [4.4, 2.1, 4.6, 8.2, 1.4, -1], [-3, 1.9, 9.4, -3, 1.9, 3.4], [3, 1.9, 9.4, 3, 1.9, 3.4], [-4.2, 2.3, 1.5, -7.6, 2.2, -3.5], [-6.2, 2.3, -3.5, -9.6, 1.8, -7.2], [4.6, 2.2, -.6, 8, 1.4, -5.2], [0, 6.5, 15, 0, 2.6, -3]],
    update(c) {
      pose(mayor, c.lt, 'sit'); mayor.userData.head.rotation.y = Math.sin(c.lt * .35) * .5;
      neur.forEach((p, i) => pose(p, c.lt, 'point', i));
      six.forEach((p, i) => pose(p, c.lt, 'hold', i * .7)); pose(adh, c.lt, 'hold', 2); pose(oci, c.lt, 'hold', 3);
      const flow = 1 - c.spot(6, 4); // ADH fecha as torneiras
      drops.forEach((d, i) => { const u = ((c.lt * .9 + i / 5) % 1); d.position.set(-7, 4.2 - u * 3.2, -4); d.scale.setScalar(flow > .05 ? 1 : .001); });
      const ins = c.spot(7, 3);
      aqps.forEach((a, i) => a.position.set(-8.4 - ins * .9, .7 + (i % 3) * .8, -8.6 + i * .7));
      bottle.position.y = 1.1 + Math.sin(c.lt * 2) * .03;
    },
  };
}

// =========================================================
// HIPÓFISE — elevador central
// =========================================================
export function elevador() {
  const group = new THREE.Group(); const b = new Builder();
  ground(b, 'cobble', 90);
  // poço do elevador
  b.box('darkbrick', 5.4, 15, .6, 0, 7.5, -2.7); b.box('darkbrick', .6, 15, 5.4, 2.7, 7.5, 0); for (let k = 0; k < 8; k++) b.box('iron', .1, .1, 5.4, -2.7, 1 + k * 2, 0); b.cyl('iron', .12, 15, -2.7, 7.5, -2.6); b.cyl('iron', .12, 15, -2.7, 7.5, 2.6);
  for (let i = 0; i < 16; i++) b.cyl('iron', .04, 15, -2.3 + i * .31, 7.5, 2.5, [0, 0, 0], 5);
  for (let k = 0; k < 6; k++) b.box('iron', 5.4, .1, .1, 0, 1 + k * 2.6, 2.5);
  b.box('trim', 6.2, .5, 6.2, 0, 15.2, 0); b.cyl('iron', .5, .8, 0, 15.7, 0, [Math.PI / 2, 0, 0], 16);
  // 1º andar: fábrica (lâmina histológica gigante)
  b.add('plaster', new THREE.CylinderGeometry(4, 4.2, .3, 40), [-7, .15, 0]); b.add('trim', new THREE.TorusGeometry(4.05, .12, 8, 48), [-7, .3, 0], [Math.PI / 2, 0, 0]);
  const R = rng(31);
  const cords = [new THREE.CatmullRomCurve3([V(-10.5, .55, -2), V(-8, .55, -1.2), V(-5, .55, -2.2), V(-3.5, .55, -1)]), new THREE.CatmullRomCurve3([V(-10.5, .55, 1.4), V(-8, .55, .4), V(-6, .55, 1.6), V(-3.6, .55, .8)])];
  for (const cc of cords) b.add('blood', new THREE.TubeGeometry(cc, 40, .22, 8)); // capilares sinusoidais
  const cellAt = (x, z, k, s) => { b.add(k, new THREE.SphereGeometry(.32 * s, 12, 10), [x, .55, z], [0, 0, 0], [1, .8, 1]); b.add('purple', new THREE.SphereGeometry(.1 * s, 8, 6), [x, .82 * (s > 1 ? 1.1 : 1), z]); };
  for (let i = 0; i < 26; i++) cellAt(-9.4 + R() * 2.2, -.9 + R() * 1.3, 'pink', 1);   // acidófilas
  for (let i = 0; i < 26; i++) cellAt(-6.9 + R() * 2.2, -.9 + R() * 1.3, 'blue', 1);   // basófilas
  for (let i = 0; i < 14; i++) cellAt(-8.2 + R() * 2.6, 1.2 + R() * 1.4, 'pale', .9); // cromófobas
  // 2º andar: depósito (plataforma elevada)
  b.box('plaster', 9, .4, 7, 7.2, 6.8, 0); railing(b, 2.8, 3.4, 11.6, 3.4, 7, 1); for (const x of [3.2, 11.2]) for (const z of [-3, 3]) b.cyl('iron', .15, 6.8, x, 3.4, z);
  for (let k = 0; k < 11; k++) b.box('iron', .5, .06, .06, 11.8, .4 + k * .62, 2.6); for (const zz of [2.36, 2.84]) b.cyl('iron', .03, 6.8, 11.8, 3.4, zz);
  crate(b, 9.8, 7, -2.2, 1.2, .2); crate(b, 10.8, 7, -1, .9, -.3); crate(b, 9.6, 8.2, -2.1, .8, .5); crate(b, 4.2, 7, -2.4, 1, 0);
  const ax = [];
  for (let k = 0; k < 5; k++) { // axônios descendo do hipotálamo
    const x = 5 + k * 1.1; const cc = new THREE.CatmullRomCurve3([V(x, 14, -2.6), V(x + .3, 11, -1.6), V(x - .2, 9, -.8), V(x, 7.3, -.2)]);
    b.add('pale', new THREE.TubeGeometry(cc, 30, .07, 6)); ax.push(cc);
    for (const u of [.55, .8]) { const p = cc.getPointAt(u); b.add('colloid', new THREE.SphereGeometry(.2, 10, 8), [p.x, p.y, p.z]); } // corpos de Herring
  }
  for (let k = 0; k < 6; k++) b.add('pale', new THREE.IcosahedronGeometry(.25, 0), [4.4 + k * 1.2, 7.3, 1.2 + (k % 2) * .8], [k, k, 0], [1, 1.6, 1]); // pituícitos
  b.box('plaster', 4, .3, 1.2, 7.6, 14, -2.6);
  bunting(b, [-11, 8, -4], [-2.7, 9, -2.7], 14, .5); bunting(b, [2.7, 12, -2.7], [11.6, 10, -3], 12, .5);
  backdrop(b, 30, 33);
  group.add(b.build());
  group.add(stand('ACIDÓFILAS', -8.3, -2.6, { w: 1.9, h: .45, bg: '#e6869a' }), stand('BASÓFILAS', -5.8, -2.6, { w: 1.9, h: .45, bg: '#8e96e0' }), stand('CROMÓFOBAS', -7, 3.3, { w: 1.9, h: .45 }));
  group.add(stand('ADENO-HIPÓFISE · FÁBRICA', -7, -4.8, { w: 4, h: .7, stick: 2.4 }));
  const dep = label('NEURO-HIPÓFISE · DEPÓSITO', { w: 4.2, h: .7 }); dep.position.set(7.6, 9.6, -3.2); group.add(dep);
  const hl = label('DO HIPOTÁLAMO', { w: 3, h: .5 }); hl.position.set(7.6, 14.5, -2); group.add(hl);
  group.add(stand('PITUÍCITOS', 6, 2.9, { y: 7, w: 1.8, h: .4, stick: .9 }), stand('CORPOS DE HERRING', 9.4, 2.9, { y: 7, w: 2.6, h: .4, stick: .9 }));
  const vesic = letterStream(group, ax[2], 3, 'gold', .1);
  // HERÓI: cabine do elevador
  const cab = new THREE.Group();
  cab.add(heroMesh(new THREE.BoxGeometry(4.2, 4, 4.2), [0, 2, 0]));
  cab.add(heroMesh(new THREE.ConeGeometry(2.8, 1.2, 4), [0, 4.6, 0], [0, Math.PI / 4, 0]));
  const cb = new Builder(); cb.box('window', 2.2, 2.8, .1, 0, 1.6, 2.12); cb.box('brass', 2.5, .2, .2, 0, 3.15, 2.15); cb.box('brass', .3, .3, .1, 1.5, 2.2, 2.15); for (let i = 0; i < 7; i++) cb.box('iron', .04, 2.7, .05, -1 + i * .33, 1.6, 2.18);
  cab.add(cb.build()); group.add(cab);
  const floorSign = label('1', { w: .9, h: .9, bg: '#2a160f', fg: '#ffd27a', emissive: .8 }); floorSign.position.set(0, 3.6, 2.2); cab.add(floorSign);
  // os seis funcionários
  const six = [['GH', 'pink', 1.55, -11.5], ['PRL', 'pink', 1, -9.4], ['TSH', 'blue', 1, -6.6], ['ACTH', 'blue', 1, -5.1], ['FSH', 'blue', 1, -3.6], ['LH', 'blue', 1, -2.1]].map(([t, s, sc, x]) => { const p = signPuppet(t, { suit: s, scale: sc, sw: 1 }); place(p, x, 0, 5); group.add(p); return p; });
  return {
    group, sig: [0, .7, 11, 0, 9.5, 0],
    cams: [[0, 1.9, 12, 0, 3.4, 0], [-3, 3.6, 11, 0, 3.4, 0], [-7, 7.2, 6.2, -7, .3, -.2], [-8.6, 2.2, 2.6, -8.4, .5, -.6], [-5.6, 2.2, 2.6, -5.8, .5, -.6], [-7, 2.6, 4.6, -7, .4, 1.6], [-10.6, 2.2, 10.5, -10.4, 2, 5], [-8.2, 1.9, 9.6, -8.4, 1.7, 5], [-5.4, 1.9, 9.6, -5.6, 1.7, 5], [-2.9, 1.9, 9.6, -2.9, 1.7, 5], [3.4, 9.2, 10, 6.6, 7.6, 0], [4.6, 8.4, 4.5, 7, 9, -1.4], [0, 6, 19, 0, 5, 0]],
    update(c) {
      const down = ease(c.lt / 8), up = c.spot(10, 4);
      cab.position.y = 7.2 * (1 - down) + 7.2 * up; cab.position.z = 0;
      six.forEach((p, i) => pose(p, c.lt, 'hold', i));
      vesic(c.lt);
    },
  };
}

// =========================================================
// TIREOIDE — fábrica borboleta
// =========================================================
export function borboleta() {
  const group = new THREE.Group(); const b = new Builder();
  ground(b, 'cobble', 90);
  // traqueia com anéis de cartilagem + laringe
  b.cyl('pale', 1.5, 13, 0, 6.5, -3, [0, 0, 0], 24);
  for (let k = 0; k < 17; k++) b.add('bone', new THREE.TorusGeometry(1.55, .14, 8, 28), [0, .6 + k * .62, -3], [Math.PI / 2, 0, 0]);
  b.add('bone', new THREE.CylinderGeometry(2.2, 1.6, 2.4, 6), [0, 12.4, -3]); b.box('bone', 2.8, 1.4, .4, 0, 12.4, -1.2);
  // galpão da fábrica atrás
  facade(b, { x: -8, z: -8, w: 10, h: 8, tex: 'brick', cols: 4, rows: 2, seed: 41 }); facade(b, { x: 8, z: -8, w: 10, h: 8, tex: 'tanbrick', cols: 4, rows: 2, seed: 42 });
  for (const x of [-10, -6, 6, 10]) { b.cyl('darkbrick', .5, 4, x, 10, -8.5, [0, 0, 0], 12); b.cyl('iron', .6, .3, x, 12, -8.5, [0, 0, 0], 12); }
  // campo de folículos (histologia)
  const R = rng(51); const fol = [];
  for (let i = 0; i < 16; i++) {
    const fx = 4 + (i % 4) * 2.3 + R() * .4, fz = .6 + Math.floor(i / 4) * 2.1 + R() * .3, r = .75 + R() * .25, tall = i % 3 === 0 ? 1.8 : (i % 3 === 1 ? 1 : .55);
    b.add('colloid', new THREE.CylinderGeometry(r - .1, r - .1, .3, 20), [fx, .2, fz]);
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; b.add('pink', new THREE.BoxGeometry(.32, .3 * tall, .22), [fx + Math.cos(a) * r, .15 * tall + .05, fz + Math.sin(a) * r], [0, -a, 0]); b.add('purple', new THREE.SphereGeometry(.07, 6, 4), [fx + Math.cos(a) * (r + .02), .3 * tall * .5 + .1, fz + Math.sin(a) * (r + .02)]); }
    fol.push([fx, fz]);
  }
  b.box('plaster', 10.5, .1, 9, 7.6, .02, 3.6);
  bunting(b, [-12, 7.6, -7.7], [-2, 9, -5], 14, .5); bunting(b, [2, 9, -5], [12, 7.6, -7.7], 14, .5);
  // pista dos trabalhadores (hipo/hiper)
  b.box('ochre', 6, .08, 6, -9, .04, 4.5); railing(b, -12, 1.5, -6, 1.5, 0, .8);
  backdrop(b, 32, 43);
  group.add(b.build());
  group.add(stand('FOLÍCULOS · COLOIDE', 7.6, -.6, { w: 3.2, h: .6, stick: 1.8 }));
  group.add(stand('LARINGE', -2.6, -1.2, { w: 1.8, h: .45, stick: 10.6 }), stand('TRAQUEIA', 2.4, -1.4, { w: 1.9, h: .45, stick: 1.2 }));
  // HERÓI: borboleta (lobos + istmo + lobo piramidal)
  const thy = new THREE.Group();
  for (const s of [-1, 1]) { thy.add(heroMesh(new THREE.SphereGeometry(1, 32, 24), [s * 2.4, 5.4, -1.6], [0, 0, s * -.25], [1.45, 3.1, 1.1])); }
  thy.add(heroMesh(new THREE.CapsuleGeometry(.6, 2.4, 6, 16), [0, 4, -1.25], [0, 0, Math.PI / 2]));
  thy.add(heroMesh(new THREE.ConeGeometry(.35, 2.4, 14), [-.6, 6, -1.4], [0, 0, .15]));
  const tb = new Builder(); for (const s of [-1, 1]) for (let k = 0; k < 4; k++) tb.box('glass', .35, .5, .1, s * (2.1 + (k % 2) * .6), 4.2 + k * .9, -.5 + (k % 2) * -.05); for (const s of [-1, 1]) tb.cyl('iron', .2, 1.6, s * 2.9, 8.7, -1.8);
  thy.add(tb.build()); group.add(thy);
  group.add(stand('LOBO DIREITO', -4.6, 0, { w: 2.4, h: .45, stick: 2.4 }), stand('LOBO ESQUERDO', 4.6, 0, { w: 2.4, h: .45, stick: 2.4 }), stand('ISTMO', 0, .4, { w: 1.4, h: .45, stick: 1.6 }), stand('PIRAMIDAL', -1.3, .2, { w: 1.9, h: .4, stick: 7.6 }));
  const smoke = []; for (let k = 0; k < 8; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.4, 10, 8), mat('cream')); group.add(s); smoke.push(s); }
  // T3 e T4, iodeto
  const t3 = signPuppet('T3', { suit: 'gold' }), t4 = signPuppet('T4', { suit: 'ochre' }); place(t3, -4.2, 0, 3); place(t4, -2.4, 0, 3); group.add(t3, t4);
  const iod = []; for (let k = 0; k < 8; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), mat('purple')); group.add(s); iod.push(s); }
  // células C
  const cc = []; for (let k = 0; k < 3; k++) { const p = signPuppet(k === 1 ? 'CONTROLE DO CÁLCIO' : 'CÉLULA C', { suit: 'white', scale: .75, sw: k === 1 ? 2.4 : 1.4 }); place(p, 5.2 + k * 2.3, 0, 3.6 + (k % 2) * 2.1); group.add(p); cc.push(p); }
  const hipo = signPuppet('HIPO', { suit: 'blue' }); const hiper = signPuppet('HIPER', { suit: 'red' }); group.add(hipo, hiper);
  return {
    group, sig: [0, .8, 12.5, 0, 8.5, -2],
    cams: [[0, 4, 14, 0, 5.4, -1.5], [-3.6, 6.5, 8, 0, 6, -1.8], [7.6, 6.4, 12, 7.6, 0, 3.6], [6.3, 1.8, 6.8, 6.6, .4, 3.4], [-3.3, 1.9, 8, -3.3, 1.7, 3], [-1.5, 3.4, 11, 0, 4.5, -1.5], [8.6, 1.9, 9.4, 7.6, 1.2, 4.2], [-8.4, 1.9, 11, -8.4, 1.4, 4.6], [-9.6, 2.1, 10.6, -9.6, 1.3, 4.6], [0, 3.2, 16, 0, 5.2, -1.5]],
    update(c) {
      smoke.forEach((s, i) => { const u = (c.lt * .12 + i / 8) % 1; const s2 = i % 2 ? 1 : -1; s.position.set(s2 * 2.9 + u * .8, 9.5 + u * 4, -1.8); s.scale.setScalar(.4 + u * 1.4); });
      pose(t3, c.lt, 'hold', 0); pose(t4, c.lt, 'hold', 1); cc.forEach((p, i) => pose(p, c.lt, 'hold', i));
      iod.forEach((s, i) => { const u = (c.lt * .25 + i / 8) % 1; s.position.set(-3.3 + Math.sin(i * 2.1) * 1.6 * (1 - u), .2 + u * 1.2 + Math.sin(u * 3.14) * .8, 6 - u * 2.6); });
      const u1 = (c.lt * .025) % 1; hipo.position.set(-8.4, 0, 2.4 + Math.abs(u1 * 2 - 1) * 4.4); hipo.rotation.y = u1 < .5 ? 0 : Math.PI; pose(hipo, c.lt, 'slow');
      const a = c.lt * .9; hiper.position.set(-10 + Math.cos(a) * 1.6, 0, 4.6 + Math.sin(a) * 1.6); hiper.rotation.y = -a; pose(hiper, c.lt, 'run');
      hipo.userData.sign.position.y = 2.35; hiper.userData.sign.position.y = 2.35;
    },
  };
}

// =========================================================
// PARATIREOIDES — quatro pequenas salas
// =========================================================
export function quatrosalas() {
  const group = new THREE.Group(); const b = new Builder();
  ground(b, 'cobble', 90);
  // dorso da tireoide (cenário pintado, sem saturação de herói)
  for (const s of [-1, 1]) b.add('ochre', new THREE.SphereGeometry(1, 28, 20), [s * 3.6, 4.2, -6.5], [0, 0, s * .2], [2.4, 4.4, 1.4]);
  b.add('ochre', new THREE.CapsuleGeometry(1, 3, 6, 12), [0, 3, -6.6], [0, 0, Math.PI / 2]);
  facade(b, { x: -10, z: -10, w: 8, h: 10, tex: 'darkbrick', cols: 3, rows: 3, seed: 61 }); facade(b, { x: 10, z: -10, w: 8, h: 10, tex: 'darkbrick', cols: 3, rows: 3, seed: 62 });
  // lâmina histológica
  b.add('plaster', new THREE.CylinderGeometry(2.6, 2.7, .3, 36), [-6, .15, 0]); b.add('trim', new THREE.TorusGeometry(2.62, .1, 8, 40), [-6, .3, 0], [Math.PI / 2, 0, 0]);
  const R = rng(63);
  for (let i = 0; i < 40; i++) { const x = -8 + R() * 2.3, z = -1.5 + R() * 3; b.add('blue', new THREE.SphereGeometry(.22, 10, 8), [x, .45, z], [0, 0, 0], [1, .7, 1]); b.add('purple', new THREE.SphereGeometry(.08, 6, 4), [x, .6, z]); }
  for (let i = 0; i < 7; i++) { const x = -5 + R() * 1.6, z = -1.2 + R() * 2.4; b.add('pink', new THREE.SphereGeometry(.45, 14, 10), [x, .55, z], [0, 0, 0], [1, .75, 1]); for (let k = 0; k < 5; k++) b.add('hero', new THREE.CapsuleGeometry(.04, .12, 3, 6), [x + (R() - .5) * .5, .85, z + (R() - .5) * .5], [R() * 3, R() * 3, 0]); }
  // osso + osteoclastos
  b.cyl('bone', .5, 5, -7, .7, 7, [0, 0, Math.PI / 2], 16); for (const s of [-1, 1]) for (const dz of [-.4, .4]) b.add('bone', new THREE.SphereGeometry(.75, 14, 10), [-7 + s * 2.6, .75, 7 + dz]);
  // rim + túbulo
  b.add('kidney', kidneyGeo(), [6, 1.4, 7], [0, .4, 0], [1, 1.2, 1]);
  const tub = new THREE.CatmullRomCurve3([V(4.8, 1.4, 8), V(4, .5, 9.5), V(5.5, .4, 10.4), V(7.5, .5, 9.6), V(8.5, .3, 8)]); b.add('pink', new THREE.TubeGeometry(tub, 30, .18, 8));
  // intestino + sol (vitamina D)
  const intC = []; for (let k = 0; k < 40; k++) { const a = k * .45; intC.push(V(Math.cos(a) * (1.4 - k * .02), .4 + (k % 2) * .05, 10 + Math.sin(a) * (1.1 - k * .015))); }
  b.add('pink', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(intC), 140, .2, 8));
  // balança
  b.cyl('brass', .08, 2.4, 6, 1.2, 0); b.cyl('brass', .4, .1, 6, .05, 0);
  bunting(b, [-12, 8, -9.5], [12, 8, -9.5], 22, .5);
  lampPost(b, -3, 4); lampPost(b, 3.6, 4);
  backdrop(b, 30, 65);
  group.add(b.build());
  const sun = new THREE.Mesh(new THREE.SphereGeometry(.9, 20, 14), mat('lamp')); sun.position.set(-2.6, 4.2, 10); group.add(sun);
  group.add(stand('PRINCIPAIS', -6.9, -2, { w: 1.8, h: .45 }), stand('OXÍFILAS', -4.4, -2, { w: 1.6, h: .45, bg: '#e6869a' }));
  group.add(stand('OSSO · RANKL', -7, 9, { w: 2.2, h: .5 }), stand('RIM · TÚBULO DISTAL', 6.4, 9.4, { w: 2.8, h: .5 }), stand('INTESTINO · CALCITRIOL', 0, 12.2, { w: 3, h: .5 }));
  // HERÓI: quatro salinhas
  const rooms = new THREE.Group();
  for (const [x, z] of [[-1.7, -1.2], [1.7, -1.2], [-1.9, -4], [1.9, -4]]) {
    rooms.add(heroMesh(new THREE.BoxGeometry(2.2, 2.4, 2), [x, 1.2, z]));
    rooms.add(heroMesh(new THREE.ConeGeometry(1.7, 1.2, 4), [x, 3, z], [0, Math.PI / 4, 0]));
    const rb = new Builder(); rb.box('window', .7, 1.3, .1, x, .65, z + 1.02); rb.box('trim', .9, .12, .2, x, 1.35, z + 1.05); rb.box('glass', .45, .45, .08, x + .65, 1.6, z + 1.02); rb.box('trim', .6, .08, .2, x + .65, 1.33, z + 1.06);
    rooms.add(rb.build());
  }
  group.add(rooms);
  // PTH com detector
  const pth = signPuppet('PTH', { suit: 'blue' }); place(pth, 0, 0, 2.6); group.add(pth);
  const det = new THREE.Group(); const dsk = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .06, 18), mat('brass')); dsk.rotation.x = Math.PI / 2; det.add(dsk);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(.02, .18, .02), mat('redlamp')); needle.position.z = .04; det.add(needle); det.position.set(.35, 1.2, .45); pth.add(det);
  const alarm = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), mat('redlamp')); alarm.position.set(0, 2.05, 0); pth.add(alarm);
  // osteoclastos
  const ocl = []; for (let k = 0; k < 2; k++) { const p = puppet({ suit: 'purple', scale: 1.15 }); place(p, -8 + k * 2, 0, 5.4); group.add(p); ocl.push(p); }
  const ca = []; for (let k = 0; k < 10; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), mat('white')); group.add(s); ca.push(s); }
  const ph = []; for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), mat('green')); group.add(s); ph.push(s); }
  // balança calcitonina × PTH
  const beam = new THREE.Group(); beam.position.set(6, 2.4, 0); group.add(beam);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(3, .1, .1), mat('brass')); beam.add(bar);
  const pans = [-1.4, 1.4].map((x, i) => { const g = new THREE.Group(); g.position.x = x; beam.add(g); const pn = new THREE.Mesh(new THREE.CylinderGeometry(.5, .4, .1, 16), mat('brass')); pn.position.y = -.9; g.add(pn); const s = label(i ? 'PTH ↑Ca' : 'CALCITONINA ↓Ca', { w: 1.4, h: .4, size: .5 }); s.position.y = -.4; g.add(s); return g; });
  return {
    group, sig: [0, .8, 8.5, 0, 5, -3],
    cams: [[0, 4.2, 9.5, 0, 1.6, -2.4], [-7.4, 2.5, 3, -7, .4, 0], [-4.6, 2.5, 3, -4.6, .4, 0], [0, 1.9, 6.6, 0, 1.6, 2.6], [-6.4, 2.4, 11.6, -7, 1, 6.6], [6.2, 2.4, 12, 6, 1, 7.6], [0, 2.8, 15.5, -.6, 2, 10], [5, 2.2, 5, 6, 1.6, 0]],
    update(c) {
      pose(pth, c.lt, 'hold'); needle.rotation.z = Math.sin(c.lt * 3) * .6; alarm.material = mat(Math.sin(c.lt * 6) > 0 ? 'redlamp' : 'dark');
      ocl.forEach((p, i) => { pose(p, c.lt, 'point', i); p.rotation.y = Math.PI * .9; });
      ca.forEach((s, i) => { const u = (c.lt * .3 + i / 10) % 1; s.position.set(-8.5 + (i % 5) * .8, .8 + u * 2.5, 7 + Math.sin(i) * .4); s.scale.setScalar(Math.sin(u * Math.PI) + .01); });
      ph.forEach((s, i) => { const u = (c.lt * .1 + i / 5) % 1; const p = tub.getPointAt(u); s.position.set(p.x, p.y + .25, p.z); });
      const tilt = Math.sin(c.lt * .7) * .18; beam.rotation.z = tilt; pans.forEach(g => g.rotation.z = -tilt);
      sun.scale.setScalar(1 + Math.sin(c.lt * 2) * .04);
    },
  };
}

// =========================================================
// PINEAL — sala do relógio
// =========================================================
export function relogio() {
  const group = new THREE.Group(); const b = new Builder();
  ground(b, 'cobble', 90); b.box('wood', 14, .1, 12, 0, .05, -1);
  b.box('darkbrick', 14, 10, .8, 0, 5, -6.2); b.box('darkbrick', .8, 10, 12, -7, 5, -1); b.box('darkbrick', .8, 10, 12, 7, 5, -1);
  b.box('trim', 14.6, .3, 1.2, 0, 10.1, -6.2);
  // janela lateral (luz externa)
  b.box('trim', .9, 3.2, 2.6, 6.6, 4.5, -1.5);
  // mesas com velas
  for (let i = 0; i < 3; i++) { const x = -5 + i * 1.6; b.box('wood', 1.2, .8, .8, x, .4, -2.5 - i * .4); b.cyl('cream', .06, .3, x, .95, -2.5 - i * .4); b.add('lamp', new THREE.SphereGeometry(.06, 6, 4), [x, 1.15, -2.5 - i * .4]); }
  // jarro de areia cerebral
  b.box('wood', 1.4, .9, 1.4, -2, .45, 1.6); const R = rng(71); for (let i = 0; i < 40; i++) b.add('gold', new THREE.SphereGeometry(.07 + R() * .08, 6, 5), [-2 + (R() - .5) * 1, 1 + R() * .4, 1.6 + (R() - .5) * 1]);
  // prateleiras
  for (let j = 0; j < 3; j++) { b.box('wood', .4, .1, 5, -6.5, 2.5 + j * 1.6, -2); for (let k = 0; k < 6; k++) b.box(['red', 'blue', 'green', 'ochre'][k % 4], .3, .6, .25, -6.4, 2.85 + j * 1.6, -4 + k * .7); }
  b.box('brass', 4.8, 4.8, .1, 0, 6, -5.75);
  backdrop(b, 30, 73, ['darkbrick', 'brick', 'darkbrick']);
  group.add(b.build());
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xffa040, emissiveIntensity: 1.5 })); win.position.set(6.55, 4.5, -1.5); win.rotation.y = -Math.PI / 2; group.add(win);
  const noite = label('NOITE', { w: 3, h: 1, bg: '#1b1030', fg: '#ff9a40', border: '#ffd27a' }); noite.position.set(0, 9, -5.7); group.add(noite);
  // HERÓI: relógio
  const clock = new THREE.Group(); clock.position.set(0, 6, -5.6);
  clock.add(heroMesh(new THREE.CylinderGeometry(2.2, 2.2, .4, 48), [0, 0, 0], [Math.PI / 2, 0, 0]));
  clock.add(heroMesh(new THREE.TorusGeometry(2.25, .14, 10, 48), [0, 0, .2]));
  const face = new Builder(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; face.add('dark', new THREE.BoxGeometry(.12, k % 3 ? .3 : .55, .05), [Math.sin(a) * 1.75, Math.cos(a) * 1.75, .22], [0, 0, -a]); } clock.add(face.build());
  const hh = new THREE.Mesh(new THREE.BoxGeometry(.14, 1.1, .05), mat('dark')); hh.geometry.translate(0, .5, 0); hh.position.z = .27; clock.add(hh);
  const mh = new THREE.Mesh(new THREE.BoxGeometry(.09, 1.6, .05), mat('dark')); mh.geometry.translate(0, .75, 0); mh.position.z = .3; clock.add(mh);
  const pend = new THREE.Group(); pend.position.set(0, -2.2, 0); const rod = new THREE.Mesh(new THREE.BoxGeometry(.06, 2, .05), mat('brass')); rod.position.y = -1; pend.add(rod); const bob = heroMesh(new THREE.CylinderGeometry(.35, .35, .1, 24), [0, -2.1, 0], [Math.PI / 2, 0, 0]); pend.add(bob); clock.add(pend);
  group.add(clock);
  // pinealócitos de touca, gliais, maquete
  const pin = []; for (let i = 0; i < 3; i++) { const p = puppet({ suit: 'blue', scale: .9, hat: 'cap' }); place(p, -5 + i * 1.6, 0, -1.6 - i * .4, Math.PI); group.add(p); pin.push(p); }
  const glia = []; for (let i = 0; i < 4; i++) { const g = new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 0), mat('pale')); g.scale.set(1, 1.5, 1); group.add(g); glia.push(g); }
  group.add(stand('PINEALÓCITOS', -3.4, -.2, { w: 2.2, h: .45 }), stand('CÉLULAS GLIAIS', 2.6, 1.6, { w: 2.2, h: .45 }), stand('CORPORA ARENACEA', -2, 2.6, { w: 2.6, h: .45, y: .9, stick: .5 }));
  const bm = brainModel('pineal'); place(bm, 4.6, 0, 0.2, -.3); group.add(bm);
  const keeper = signPuppet('MELATONINA', { suit: 'purple', sw: 1.8 }); place(keeper, 1.6, 0, -3.2); group.add(keeper);
  return {
    group, dark: true, sig: [0, .8, 8, 0, 7, -5.5],
    cams: [[0, 2.6, 9.5, 0, 4.6, -5.5], [3.4, 2.4, 4.4, 4.6, 1.7, .2], [-3, 2, 3.4, -3.6, 1, -1.6], [.8, 3, 3.6, .6, 6, -5.5], [0, 2, 12, 0, 4.6, -5.5]],
    update(c) {
      const k = c.spot(3, 3);
      noite.userData.mat.emissive = new THREE.Color(0xffffff); noite.userData.mat.emissiveMap = noite.userData.mat.map; noite.userData.mat.emissiveIntensity = k * 1.3;
      win.material.emissiveIntensity = 1.5 * (1 - k) + .05;
      mh.rotation.z = -c.lt * .5; hh.rotation.z = -c.lt * .5 / 12 - 2; pend.rotation.z = Math.sin(c.lt * 2.2) * .25;
      pin.forEach((p, i) => pose(p, c.lt, 'point', i)); pose(keeper, c.lt, 'hold');
      glia.forEach((g, i) => { g.position.set(2 + (i % 2) * 1.2, .45 + Math.sin(c.lt + i) * .05, 2.4 + Math.floor(i / 2) * .9); g.rotation.y = c.lt * .3 + i; });
      c.env.dark = .35 + k * .35;
    },
  };
}

// =========================================================
// SUPRARRENAIS — torres de emergência
// =========================================================
export function torres() {
  const group = new THREE.Group(); const b0 = new Builder(); let b = b0;
  ground(b0, 'rock', 90);
  const bg = new THREE.Group(); bg.position.set(-5.5, 0, 1); group.add(bg); const bb = new Builder(); b = bb;
  // prédio de três andares (corte de casa de bonecas)
  const fw = 7.6, fh = 2.6;
  for (let f = 0; f <= 3; f++) b.box('plaster', fw + .4, .25, 3.4, 0, f * fh, 3);
  b.box('brick', .4, fh * 3, 3.4, -fw / 2, fh * 1.5, 3); b.box('brick', .4, fh * 3, 3.4, fw / 2, fh * 1.5, 3); b.box('brick', fw, fh * 3, .3, 0, fh * 1.5, 1.4);
  b.box('trim', fw + .8, .35, 3.8, 0, fh * 3 + .2, 3);
  for (let f = 0; f < 3; f++) railing(b, -fw / 2 + .3, 4.6, fw / 2 - .3, 4.6, f * fh + .12, .7);
  for (let f = 0; f < 3; f++) for (let k = 0; k < 3; k++) b.box('glass', .8, 1.1, .1, -2.5 + k * 2.5, f * fh + 1.4, 1.58);
  // sacos de sal, galões, frascos
  for (let k = 0; k < 6; k++) b.add('white', new THREE.SphereGeometry(.3, 10, 8), [-3 + k * .45, .5, 2.2], [0, 0, 0], [1, .8, .8]);
  for (let k = 0; k < 5; k++) b.box('red', .45, .6, .3, -3 + k * .5, fh + .45, 2.1);
  for (let k = 0; k < 6; k++) b.cyl('green', .1, .4, -3 + k * .4, 2 * fh + .35, 2.1);
  // escada lateral
  for (let k = 0; k < 18; k++) b.box('iron', .7, .06, .06, fw / 2 + .6, .4 * k + .3, 4.6); for (const dz of [4.35, 4.85]) b.cyl('iron', .03, 7.6, fw / 2 + .6, 3.8, dz);
  bg.add(bb.build()); const mg = new THREE.Group(); mg.position.set(-3, 0, 1.2); group.add(mg); const mb = new Builder(); b = mb;
  // sala da medula (sirene)
  b.box('darkbrick', 3.2, 3, .3, 7.5, 1.5, 2.2); b.box('darkbrick', .3, 3, 3, 6, 1.5, 3.6); b.box('trim', 3.6, .25, 3.4, 7.5, 3.1, 3.6);
  mg.add(mb.build()); b = b0;
  // rins ao fundo
  b.add('kidney', kidneyGeo(), [-4.2, 1.6, -6], [0, .3, 0], [2, 2, 2]); b.add('kidney', kidneyGeo(), [4.2, 1.6, -6], [0, -.3 + Math.PI, 0], [2, 2, 2]);
  bunting(b, [-9.5, 6.8, 5.7], [-1.5, 6.8, 5.7], 14, .3);
  backdrop(b, 32, 83, ['tanbrick', 'brick', 'ochre']);
  group.add(b.build());
  group.add(stand('RIM', -1.4, -3.4, { w: 1.2, h: .45, stick: 2 }));
  [['ZONA GLOMERULOSA · ALDOSTERONA', 0], ['ZONA FASCICULADA · CORTISOL', 1], ['ZONA RETICULAR · ANDRÓGENOS', 2]].forEach(([t, f]) => { const s = label(t, { w: 5.2, h: .5, size: .55 }); s.position.set(0, f * fh + 2.25, 1.6); bg.add(s); });
  const ms = label('MEDULA · CÉLULAS CROMAFINS', { w: 3, h: .45, size: .5 }); ms.position.set(7.5, 2.6, 2.4); mg.add(ms);
  // HERÓI: as duas torres sobre os rins
  const tw = new THREE.Group();
  for (const s of [-1, 1]) {
    const x = s * 4.2; tw.add(heroMesh(new THREE.CylinderGeometry(1.2, 1.7, 5.5, 24), [x, 6.4, -6]));
    tw.add(heroMesh(new THREE.ConeGeometry(1.5, 1.8, 24), [x, 10, -6]));
    for (let k = 0; k < 3; k++) tw.add(heroMesh(new THREE.TorusGeometry(1.5 - k * .14, .1, 6, 28), [x, 4.7 + k * 1.6, -6], [Math.PI / 2, 0, 0]));
  }
  group.add(tw);
  const sirens = [-4.2, 4.2, 7.5].map((x, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(i < 2 ? .4 : .3, 12, 10), mat('redlamp')); s.position.set(x + (i < 2 ? 0 : -3), i < 2 ? 11.1 : 2.9, i < 2 ? -6 : 4.4); group.add(s); return s; });
  const beamM = new THREE.MeshBasicMaterial({ color: 0xff6040, transparent: true, opacity: .25, depthWrite: false });
  const beams = sirens.map(s => { const m = new THREE.Mesh(new THREE.ConeGeometry(.6, 3, 16, 1, true), beamM); m.geometry.translate(0, -1.5, 0); m.position.copy(s.position); group.add(m); return m; });
  // trabalhadores
  const wk = [];
  const add = (suit, x, f, mode, ph) => { const p = puppet({ suit, scale: .85 }); bg.add(p); wk.push({ p, x, f, mode, ph }); };
  add('white', -2, 0, 'carry', 0); add('white', 1.5, 0, 'walk', 1); add('red', -1.5, 1, 'walk', 2); add('red', 2, 1, 'carry', 3); add('purple', -1, 2, 'point', 4); add('purple', 2.4, 2, 'walk', 5);
  const crom = []; for (let k = 0; k < 2; k++) { const p = puppet({ suit: 'red', scale: .9, hat: 'cap' }); place(p, 7 + k * 1.1, 0, 3.6); mg.add(p); crom.push(p); }
  const heart = new THREE.Mesh(new THREE.SphereGeometry(.35, 16, 12), mat('blood')); heart.position.set(9.6, 1.1, 4.2); mg.add(heart);
  return {
    group, sig: [3.2, .8, 9, 4.2, 8.5, -6],
    cams: [[2.6, 3.2, 12, 3.4, 5.6, -6], [-.5, 4.4, 6.5, 4, 6.4, -6], [-5.5, 1.9, 11, -5.5, 1.4, 4], [-5.5, 4.5, 11, -5.5, 4, 4], [-5.5, 7.1, 11, -5.5, 6.6, 4], [-5.5, 4.2, 18, -5.5, 4, 4], [4.4, 2.2, 10.7, 4.8, 1.5, 4.8], [1, 7, 20, 0, 4, -2]],
    update(c) {
      wk.forEach(w => { const y = w.f * fh + .12; let x = w.x; if (w.mode === 'walk') { x = w.x + Math.sin(c.lt * .35 + w.ph) * 1.6; w.p.rotation.y = Math.cos(c.lt * .35 + w.ph) > 0 ? Math.PI / 2 : -Math.PI / 2; } w.p.position.set(x, y, 3.4); pose(w.p, c.lt, w.mode, w.ph); });
      const alarm = .5 + .5 * c.spot(6, 1.5);
      sirens.forEach((s, i) => { s.material = mat(Math.sin(c.lt * 7 + i) > -.2 ? 'redlamp' : 'blood'); }); beams.forEach((m, i) => { m.rotation.z = Math.PI / 2; m.rotation.y = c.lt * 3 + i; m.material.opacity = .12 + .2 * alarm; });
      crom.forEach((p, i) => pose(p, c.lt, c.seg >= 0 && c.lt > c.fStart(6) ? 'run' : 'idle', i));
      heart.scale.setScalar(1 + Math.max(0, Math.sin(c.lt * (6 + alarm * 6))) * .15);
    },
  };
}

// =========================================================
// PÂNCREAS — cozinha energética
// =========================================================
export function cozinha() {
  const group = new THREE.Group(); const b = new Builder();
  ground(b, 'cobble', 90); b.box('checker', 22, .06, 16, 0, .03, 0);
  b.box('blueplaster', 18, 9, .6, 0, 4.5, -8); b.box('trim', 18.4, .3, 1, 0, 9.1, -8);
  facade(b, { x: -10.5, z: -2, ry: Math.PI / 2, w: 12, h: 8, tex: 'brick', cols: 4, rows: 2, seed: 91 });
  facade(b, { x: 10.5, z: -2, ry: -Math.PI / 2, w: 12, h: 8, tex: 'brick', cols: 4, rows: 2, seed: 92 });
  // prateleiras com panelas, ganchos
  for (let j = 0; j < 2; j++) { b.box('wood', 16, .12, .6, 0, 2.6 + j * 1.5, -7.5); for (let k = 0; k < 12; k++) b.cyl(['iron', 'brass', 'red'][k % 3], .25, .4, -7 + k * 1.25, 2.9 + j * 1.5, -7.5, [0, 0, 0], 12); }
  for (let k = 0; k < 9; k++) { b.cyl('iron', .02, .6, -6 + k * 1.5, 8, -6.5); b.add('brass', new THREE.CylinderGeometry(.35, .3, .1, 14), [-6 + k * 1.5, 7.6, -6.5], [Math.PI / 2, 0, 0]); }
  // ácinos (fogões escuros em cachos) com ductos para o "duodeno"
  const R = rng(93);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, x = Math.cos(a) * 4.3, z = 2 + Math.sin(a) * 3.1; for (let k = 0; k < 5; k++) b.add('acinar', new THREE.SphereGeometry(.42, 12, 10), [x + Math.cos(k * 1.3) * .5, .4, z + Math.sin(k * 1.3) * .5], [0, 0, 0], [1, .8, 1]); }
  const duct = new THREE.CatmullRomCurve3([V(-4.3, .3, 2), V(-6.5, .3, 3), V(-8.5, .3, 5), V(-9.8, .5, 6.5)]); b.add('trim', new THREE.TubeGeometry(duct, 30, .12, 6));
  b.cyl('ochre', .9, 3, -9.8, 1.5, 6.5, [0, 0, 0], 16);
  // ilhota (bancada clara redonda)
  b.add('islet', new THREE.CylinderGeometry(2, 2.1, 1, 40), [0, .5, 2]); b.add('trim', new THREE.TorusGeometry(2.05, .08, 8, 40), [0, 1.02, 2], [Math.PI / 2, 0, 0]);
  for (let k = 0; k < 10; k++) b.box('white', .2, .2, .2, -.8 + (k % 5) * .4, 1.12, 1.6 + Math.floor(k / 5) * .5); // cubos de açúcar
  // porta da célula (insulina)
  b.box('wood', .2, 2.4, .2, .6, 1.2, 4.6); b.box('wood', .2, 2.4, .2, 2.4, 1.2, 4.6); b.box('wood', 2, .2, .2, 1.5, 2.4, 4.6);
  // tanques de combustível
  for (const [x, z] of [[7.6, -3], [9, -.5]]) { b.cyl('iron', 1, 3.6, x, 1.8, z, [0, 0, 0], 20); b.cyl('brass', 1.05, .15, x, 3.6, z, [0, 0, 0], 20); b.cyl('brass', 1.05, .15, x, .5, z, [0, 0, 0], 20); }
  // fígado
  b.add('liver', new THREE.SphereGeometry(1, 20, 14), [-7.4, 1.3, -2.8], [0, .4, .2], [2.2, 1.3, 1.5]);
  bunting(b, [-10, 7, -1], [10, 7, -1], 22, .5);
  backdrop(b, 30, 95);
  group.add(b.build());
  // estômago (translúcido, à frente) e HERÓI: pâncreas
  const stom = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0xe6869a, transparent: true, opacity: .4, roughness: .4, depthWrite: false })); stom.position.set(-1.5, 7.4, -4.4); stom.scale.set(2.6, 1.6, 1); group.add(stom);
  const pan = blobAlong([[4.6, 5.2, -6], [3, 5.8, -6], [1, 6.2, -6], [-1.5, 6.4, -6], [-4, 6.9, -6], [-5.8, 7.6, -6]], .95, .38, 'hero', true); group.add(pan);
  [['CABEÇA', 4.6, 3.8], ['COLO', 2.2, 4.4], ['CORPO', -.8, 4.8], ['CAUDA', -4.6, 5.6]].forEach(([t, x, y]) => { const s = label(t, { w: 1.6, h: .45 }); s.position.set(x, y, -5.4); group.add(s); });
  const st = label('ESTÔMAGO (À FRENTE)', { w: 2.8, h: .45 }); st.position.set(-1.5, 9.4, -4); group.add(st);
  group.add(stand('ILHOTA DE LANGERHANS', 0, 4.3, { w: 3.4, h: .55, stick: 1.2 }), stand('ÁCINOS · EXÓCRINO', -5.8, 4.6, { w: 2.8, h: .5 }), stand('DUODENO', -9.8, 8, { w: 1.8, h: .45 }), stand('FÍGADO', -7.4, -.6, { w: 1.6, h: .45, stick: 2 }), stand('DEPÓSITO', 8.3, 1.6, { w: 1.8, h: .45, stick: 3 }));
  const beta = signPuppet('β · INSULINA', { suit: 'blue', sw: 1.9, hat: 'chef' }); place(beta, 1.5, 0, 5.4); group.add(beta);
  const alpha = signPuppet('α · GLUCAGON', { suit: 'red', sw: 1.9, hat: 'chef' }); group.add(alpha);
  const delta = signPuppet('δ · SOMATOSTATINA', { suit: 'green', sw: 2.4, hat: 'chef' }); place(delta, 3.4, 0, 1.3, -.5); group.add(delta);
  const ppc = signPuppet('PP (F)', { suit: 'purple', sw: 1.3, hat: 'chef' }); place(ppc, 5, 0, .4, -.6); group.add(ppc);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, .1), mat('wood')); door.geometry.translate(.8, 0, 0); door.position.set(.7, 1.15, 4.6); group.add(door);
  const sug = []; for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2), mat('white')); group.add(s); sug.push(s); }
  const gauge = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 1, 20), mat('colloid')); gauge.position.set(9, 0, -.5); group.add(gauge);
  return {
    group, sig: [0, .8, 9.5, 0, 7.5, -6],
    cams: [[0, 3.2, 13, 0, 5, -5], [0, 6, 6.5, 0, 6.4, -6], [4.5, 5, 10, 1, 0, 1.5], [1.6, 2, 9.4, 1.5, 1.6, 4.6], [-3.6, 2.4, 9, -5, 1.4, 1], [5.4, 2.1, 6.4, 4.2, 1.6, 1], [4.6, 3.2, 6.4, 8.4, 2, -1.8]],
    update(c) {
      pose(beta, c.lt, 'hold'); pose(delta, c.lt, 'hold', 1); pose(ppc, c.lt, 'hold', 2);
      const op = c.spot(3, 2); door.rotation.y = -op * 1.3;
      sug.forEach((s, i) => { const u = (c.lt * .3 + i / 6) % 1; s.position.set(1.5 + Math.sin(i) * .3, .2 + Math.sin(u * Math.PI) * .6, 8 - u * 5 * op - (1 - op) * 0); s.visible = op > .1; });
      const a = c.lt * .55; alpha.position.set(-4.4 + Math.cos(a) * 2.4, 0, 1.6 + Math.sin(a) * 1.6); alpha.rotation.y = -a; pose(alpha, c.lt, 'run', 1);
      const lvl = .5 + .4 * Math.sin(c.lt * .4); gauge.scale.y = 3 * lvl; gauge.position.y = .5 + 1.5 * lvl;
    },
  };
}

export const SETS = { palacio, mapa, recepcao, comando, elevador, borboleta, quatrosalas, relogio, torres, cozinha };
