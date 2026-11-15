// Página de quadrinhos anos 70 — Reels "O Parque de Diversões do Sistema Endócrino"
// Tudo é desenhado vetorialmente em coordenadas de página a cada quadro; a retícula Ben-Day
// vive no espaço da página, então os pontos crescem (e continuam redondos) quando a câmera avança.
const TL = window.TIMELINE;
const OW = 1080, OH = 1920;
const PW = 1000, PH = 1778, PGAP = 70;   // página e espaço entre páginas (dobra da lombada)
const K = '#1C161A', CY = '#1696CD', MG = '#DE2C70', YE = '#FFD616', PAPER = '#EEE2C2';
const out = document.createElement('canvas'); out.width = OW; out.height = OH; if (window.SHOW) document.body.appendChild(out);
const X = out.getContext('2d');

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const ease3 = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s ^= s >>> 16) >>> 0) / 4294967296); }

// ---------- retícula Ben-Day ----------
const SP = 7.5; // espaçamento dos pontos (unidades de página)
const PAT = {};
function dots(color, dens) {
  const key = color + dens; if (PAT[key]) return PAT[key];
  const T = 64, c = document.createElement('canvas'); c.width = c.height = T; const x = c.getContext('2d');
  x.fillStyle = color; const r = T * .5 * Math.sqrt(dens) * 1.18;
  for (const [cx, cy] of [[0, 0], [T, 0], [0, T], [T, T], [T / 2, T / 2]]) { x.beginPath(); x.arc(cx, cy, r * .72, 0, 7); x.fill(); }
  const p = X.createPattern(c, 'repeat'); p.setTransform(new DOMMatrix().rotate(45).scale(SP / (T / 1.414)));
  return (PAT[key] = p);
}
const MIS = { [CY]: [1.3, 0], [MG]: [0, 1.3], [YE]: [-1, -.7], [K]: [0, 0] };
// inks: lista [cor, densidade]; cada placa é impressa separadamente, levemente fora de registro
function fill(path, inks) {
  for (const [col, d] of inks) {
    X.save(); const [dx, dy] = MIS[col] || [0, 0]; X.translate(dx, dy);
    X.globalCompositeOperation = 'multiply'; X.fillStyle = d >= 1 ? col : dots(col, d); X.fill(path); X.restore();
  }
}
const INK = { c: [[CY, .85]], m: [[MG, .85]], y: [[YE, .95]], g: [[CY, .75], [YE, .9]], r: [[MG, .85], [YE, .9]], o: [[MG, .45], [YE, .95]], b: [[CY, .85], [MG, .55]], sky: [[CY, .32]], pink: [[MG, .3]], tan: [[YE, .5], [MG, .18]], grey: [[K, .22]], lc: [[CY, .45]], ly: [[YE, .6]], purple: [[CY, .6], [MG, .7]] };
function ink(path, w = 5) { X.save(); X.lineWidth = w; X.strokeStyle = K; X.lineJoin = 'round'; X.lineCap = 'round'; X.stroke(path); X.restore(); }
function solid(path, col = K) { X.save(); X.fillStyle = col; X.fill(path); X.restore(); }
function shape(path, inks, w = 5) { fill(path, inks); ink(path, w); return path; }
// pincel afilado
function taper(pts, w0, w1 = 0) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
    const u = i / (pts.length - 1); const w = (w0 + (w1 - w0) * u) * Math.sin(Math.PI * (.15 + .85 * u)) * .5 + .4;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  const p = new Path2D(); p.moveTo(...L[0]); L.forEach(q => p.lineTo(...q)); R.reverse().forEach(q => p.lineTo(...q)); p.closePath(); solid(p);
}
function stroke(x0, y0, x1, y1, w) { const pts = []; for (let i = 0; i <= 6; i++) pts.push([x0 + (x1 - x0) * i / 6, y0 + (y1 - y0) * i / 6]); taper(pts, w, w * .1); }
// pretos chapados com bordas "penteadas"
function feather(x, y, w, h, dir = 1, n = 9, seed = 1) {
  const r = rng(seed); for (let i = 0; i < n; i++) { const yy = y + h * (i + .5) / n; const L = w * (.4 + r() * .6); stroke(x, yy, x + dir * L, yy + (r() - .5) * 6, 5 + r() * 3); }
}
function speed(cx, cy, r0, r1, n, seed = 2, a0 = 0, a1 = Math.PI * 2) {
  const r = rng(seed); for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * r(); const rr = r0 + r() * 40; stroke(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 3 + r() * 4); }
}
// bolhas de energia (crepitação cósmica)
function krackle(cx, cy, R, t, seed = 3, n = 26) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * 7, d = Math.sqrt(r()) * R, s = (4 + r() * 16) * (1 + .18 * Math.sin(t * 3 + i));
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    X.save(); X.fillStyle = K; X.beginPath(); X.arc(x, y, s, 0, 7); X.fill();
    X.strokeStyle = K; X.lineWidth = 1.6; X.beginPath(); X.arc(x, y, s * 1.7 + 3, .3 + i, 4.5 + i); X.stroke(); X.restore();
  }
}
function burst(cx, cy, R, n, inks, rot = 0) {
  const p = new Path2D(); for (let i = 0; i < n * 2; i++) { const a = rot + i / (n * 2) * Math.PI * 2; const rr = i % 2 ? R * .62 : R; i ? p.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : p.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } p.closePath(); shape(p, inks, 5);
}
// ---------- letreiramento ----------
function text(s, x, y, size, o = {}) {
  X.save(); X.font = `${o.w || 700} ${size}px ${o.f || '"Comic Neue"'}`; X.textAlign = o.a || 'center'; X.textBaseline = 'middle'; X.fillStyle = o.c || K;
  const lines = String(s).split('\n'); lines.forEach((l, i) => X.fillText(l, x, y + (i - (lines.length - 1) / 2) * size * 1.08)); X.restore();
}
function wrapW(s, maxW, font) { X.save(); X.font = font; const out = []; let cur = ''; for (const w of s.split(' ')) { const tt = cur ? cur + ' ' + w : w; if (X.measureText(tt).width > maxW && cur) { out.push(cur); cur = w; } else cur = tt; } if (cur) out.push(cur); X.restore(); return out; }
function caption(s, x, y, w, size = 26, inks = INK.y) {
  const font = `700 ${size}px "Comic Neue"`; const L = wrapW(s.toUpperCase(), w - 28, font); const h = L.length * size * 1.1 + 22;
  const p = new Path2D(); p.rect(x, y, w, h); X.save(); X.fillStyle = PAPER; X.fill(p); X.restore(); shape(p, inks, 3.5);
  L.forEach((l, i) => text(l, x + 14, y + 11 + size * .55 + i * size * 1.1, size, { a: 'left' })); return h;
}
function label(s, x, y, size = 24, w = 260) { return caption(s, x - w / 2, y, w, size, [[YE, .95]]); }
function balloon(s, x, y, w, size, tx, ty) {
  const font = `700 ${size}px "Comic Neue"`; const L = wrapW(s.toUpperCase(), w * .78, font); const h = L.length * size * 1.1 + size * 1.3;
  const p = new Path2D(); p.ellipse(x, y, w / 2, h / 2, 0, 0, 7);
  const tl = new Path2D(); tl.moveTo(x - w * .1, y + h * .35); tl.lineTo(tx, ty); tl.lineTo(x + w * .08, y + h * .4); tl.closePath();
  X.save(); X.fillStyle = '#F8F0DA'; X.fill(tl); X.fill(p); X.restore(); ink(p, 4); ink(tl, 4); X.save(); X.fillStyle = '#F8F0DA'; X.beginPath(); X.ellipse(x, y, w / 2 - 2.5, h / 2 - 2.5, 0, 0, 7); X.fill(); X.restore();
  L.forEach((l, i) => text(l, x, y + (i - (L.length - 1) / 2) * size * 1.1, size));
}
function sfx(s, x, y, size, rot = -.12, inks = INK.y, t = 0) {
  X.save(); X.translate(x, y); X.rotate(rot + Math.sin(t * 4) * .02); const sc = 1 + Math.sin(t * 5) * .03; X.scale(sc, sc);
  X.font = `400 ${size}px "Bangers"`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.lineJoin = 'round';
  X.fillStyle = MG; X.fillText(s, 7, 7); X.lineWidth = size * .12; X.strokeStyle = K; X.strokeText(s, 7, 7);
  X.strokeText(s, 0, 0); X.fillStyle = YE; X.fillText(s, 0, 0); X.restore();
}
// ---------- formas recorrentes ----------
const P = () => new Path2D();
function rectP(x, y, w, h) { const p = P(); p.rect(x, y, w, h); return p; }
function ellP(x, y, rx, ry, r = 0) { const p = P(); p.ellipse(x, y, rx, ry, r, 0, 7); return p; }
function poly(pts) { const p = P(); pts.forEach((q, i) => i ? p.lineTo(...q) : p.moveTo(...q)); p.closePath(); return p; }
function curve(pts, close = false) { const p = P(); p.moveTo(...pts[0]); for (let i = 1; i < pts.length - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; p.quadraticCurveTo(pts[i][0], pts[i][1], ...m); } p.lineTo(...pts[pts.length - 1]); if (close) p.closePath(); return p; }
function bulbs(path, n, t) { /* lâmpadas ao longo de um arco */ }
function brain(cx, cy, s) {
  const p = P(); p.ellipse(cx, cy, 120 * s, 78 * s, 0, Math.PI, 0); p.quadraticCurveTo(cx + 110 * s, cy + 50 * s, cx, cy + 40 * s); p.quadraticCurveTo(cx - 110 * s, cy + 50 * s, cx - 120 * s, cy); shape(p, INK.pink, 6);
  const r = rng(7); for (let i = 0; i < 9; i++) { const x0 = cx - 95 * s + i * 22 * s; const q = curve([[x0, cy - 55 * s + r() * 30 * s], [x0 + 18 * s, cy - 20 * s], [x0 - 6 * s, cy + 10 * s], [x0 + 10 * s, cy + 28 * s]]); ink(q, 3.5); }
}
function mouth(cx, cy, s) {
  const up = P(); up.moveTo(cx - 150 * s, cy); up.quadraticCurveTo(cx, cy - 120 * s, cx + 150 * s, cy); up.quadraticCurveTo(cx, cy - 40 * s, cx - 150 * s, cy); shape(up, INK.r, 6);
  const lo = P(); lo.moveTo(cx - 150 * s, cy + 10 * s); lo.quadraticCurveTo(cx, cy + 140 * s, cx + 150 * s, cy + 10 * s); lo.quadraticCurveTo(cx, cy + 50 * s, cx - 150 * s, cy + 10 * s); shape(lo, INK.r, 6);
  for (let i = 0; i < 6; i++) { const t = rectP(cx - 75 * s + i * 25 * s, cy - 32 * s + Math.abs(i - 2.5) * 6 * s, 20 * s, 22 * s); shape(t, [[YE, .15]], 2.5); }
}
function butterfly(cx, cy, s, inks = INK.r) {
  for (const k of [-1, 1]) shape(ellP(cx + k * 48 * s, cy, 40 * s, 72 * s, k * .25), inks, 5);
  shape(rectP(cx - 34 * s, cy + 10 * s, 68 * s, 26 * s), inks, 4);
}
function trachea(cx, y0, y1, s) { shape(rectP(cx - 34 * s, y0, 68 * s, y1 - y0), [[YE, .25], [MG, .1]], 5); for (let y = y0 + 14; y < y1; y += 26 * s) ink(curve([[cx - 34 * s, y], [cx, y + 9 * s], [cx + 34 * s, y]]), 3.5); }
function car(x, y, s, inks, lab) {
  const b = P(); b.roundRect(x - 60 * s, y - 34 * s, 120 * s, 50 * s, 16 * s); shape(b, inks, 5);
  shape(ellP(x - 34 * s, y + 18 * s, 14 * s, 14 * s), [[K, 1]], 3); shape(ellP(x + 34 * s, y + 18 * s, 14 * s, 14 * s), [[K, 1]], 3);
  shape(rectP(x - 38 * s, y - 62 * s, 76 * s, 30 * s), [[CY, .25]], 4); if (lab) text(lab, x, y - 8 * s, 24 * s, { w: 700 });
}
function cell(x, y, r, inks, nuc = true) { shape(ellP(x, y, r, r * .9), inks, 3.5); if (nuc) solid(ellP(x, y, r * .3, r * .3), K); }

// ---------- páginas ----------
function layout4() { return [[36, 176, 928, 724], [36, 922, 452, 408], [512, 922, 452, 408], [36, 1352, 928, 390]]; }
const PAGES = {
  entrada: {
    title: 'A ENTRADA DO PARQUE', n: 1, panels: layout4(),
    draw: [
      (r, t) => { // splash: portão em perspectiva + dois elevadores rumo à hipófise
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.sky, 0); krackle(x + w * .5, y + h * .42, 170, t, 11, 34);
        speed(x + w / 2, y + h * .42, 260, 700, 34, 4);
        for (const k of [-1, 1]) { const p = poly([[x + w / 2 + k * 470, y + h], [x + w / 2 + k * 300, y + h], [x + w / 2 + k * 210, y + 70], [x + w / 2 + k * 290, y + 40]]); shape(p, INK.r, 7); feather(x + w / 2 + k * 300, y + 200, 90, h - 260, -k, 12, 5 + k); }
        const arch = P(); arch.moveTo(x + w / 2 - 300, y + 120); arch.quadraticCurveTo(x + w / 2, y - 60, x + w / 2 + 300, y + 120); arch.lineTo(x + w / 2 + 270, y + 175); arch.quadraticCurveTo(x + w / 2, y + 20, x + w / 2 - 270, y + 175); arch.closePath(); shape(arch, INK.y, 7);
        text('PARQUE ENDÓCRINO', x + w / 2, y + 108, 44, { f: '"Bangers"', w: 400 });
        for (let i = 0; i < 13; i++) { const a = Math.PI * (1.12 + i * .064); const on = (Math.floor(t * 4) + i) % 3; shape(ellP(x + w / 2 + Math.cos(a) * 285, y + 170 + Math.sin(a) * 120, 7, 7), on ? INK.y : [[K, .5]], 2); }
        const pod = [x + w / 2, y + h * .44]; for (const k of [-1, 1]) { const sh = rectP(pod[0] + k * 70 - 22, k < 0 ? pod[1] : y + 190, 44, k < 0 ? h - (pod[1] - y) : pod[1] - y - 190); shape(sh, [[K, .2]], 4); }
        const u = (t * .25) % 1; car(pod[0] - 70, y + h - 60 - u * (h - 60 - (pod[1] - y)), .55, INK.c, 'ADENO'); car(pod[0] + 70, y + 230 + u * (pod[1] - y - 230), .55, INK.m, 'NEURO');
        burst(pod[0], pod[1], 92, 12, INK.y, t * .2); text('HIPÓFISE', pod[0], pod[1], 30, { f: '"Bangers"', w: 400 });
        caption('Cada brinquedo é uma glândula!', x + 22, y + h - 92, 380, 26);
      },
      (r, t) => { // adeno: sobe do teto da boca
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.ly, 0); mouth(x + w / 2, y + h - 90, 1.1);
        const u = ease((t % 4) / 3); const pp = P(); pp.moveTo(x + w / 2 - 40, y + h - 170); pp.bezierCurveTo(x + w / 2 - 70, y + 210, x + w / 2 + 70, y + 210, x + w / 2 + 40, y + h - 170); shape(pp, INK.pink, 5);
        shape(ellP(x + w / 2, y + 140, 70, 46), INK.c, 5); text('ADENO', x + w / 2, y + 140, 28, { f: '"Bangers"', w: 400 });
        car(x + w / 2, y + h - 180 - u * 150, .4, INK.c); stroke(x + w - 70, y + h - 120, x + w - 70, y + 120, 14); poly([[x + w - 92, y + 130], [x + w - 48, y + 130], [x + w - 70, y + 90]]); shape(poly([[x + w - 96, y + 136], [x + w - 44, y + 136], [x + w - 70, y + 90]]), [[K, 1]], 2);
        label('Bolsa de Rathke', x + 120, y + 236, 22, 200); label('Teto da boca primitiva', x + 140, y + h - 54, 20, 250);
        sfx('SOBE!', x + 100, y + 70, 54, -.2, INK.y, t);
      },
      (r, t) => { // neuro: desce do diencéfalo
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.lc, 0); brain(x + w / 2, y + 130, 1.25);
        const st = P(); st.moveTo(x + w / 2 - 14, y + 175); st.lineTo(x + w / 2 - 10, y + h - 130); st.lineTo(x + w / 2 + 10, y + h - 130); st.lineTo(x + w / 2 + 14, y + 175); st.closePath(); shape(st, INK.pink, 4);
        shape(ellP(x + w / 2, y + h - 100, 70, 46), INK.m, 5); text('NEURO', x + w / 2, y + h - 100, 28, { f: '"Bangers"', w: 400 });
        const u = ease((t % 4) / 3); car(x + w / 2 + 80, y + 230 + u * 120, .4, INK.m);
        label('Neuroectoderma do diencéfalo', x + w / 2, y + 16, 20, 300); label('Infundíbulo', x + 100, y + h / 2 + 10, 20, 150);
        sfx('DESCE!', x + w - 100, y + h - 50, 54, .15, INK.y, t);
      },
      (r, t) => { // mnemônico
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), [[K, .12]], 0); krackle(x + w / 2, y + h / 2, 120, t, 21, 18);
        burst(x + 240, y + h / 2, 170, 14, INK.y, .1); text('ADENO\n= BOCA', x + 240, y + h / 2, 50, { f: '"Bangers"', w: 400 });
        burst(x + w - 240, y + h / 2, 170, 14, INK.c, .3); text('NEURO\n= CÉREBRO', x + w - 240, y + h / 2, 46, { f: '"Bangers"', w: 400 });
        sfx('LEMBRE!', x + w / 2, y + 60, 60, -.08, INK.r, t);
      },
    ],
  },
  montanha: {
    title: 'A MONTANHA-RUSSA DA TIREOIDE', n: 2, panels: layout4(),
    draw: [
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.sky, 0); speed(x + w * .8, y + h * .8, 200, 900, 30, 9, Math.PI, Math.PI * 1.5);
        const tg = P(); tg.moveTo(x - 20, y + 60); tg.bezierCurveTo(x + 420, y + 20, x + 520, y + 140, x + 440, y + 250); tg.bezierCurveTo(x + 300, y + 330, x + 80, y + 300, x - 20, y + 330); tg.closePath(); shape(tg, INK.r, 7);
        shape(ellP(x + 330, y + 170, 22, 12), [[K, 1]], 3); label('Forame cego', x + 330, y + 196, 22, 170);
        const tr = [[x + 330, y + 170], [x + 420, y + 330], [x + 260, y + 420], [x + 300, y + 560], [x + 620, y + 600], [x + 760, y + 470]];
        const cv = curve(tr); X.save(); X.lineWidth = 34; X.strokeStyle = K; X.lineCap = 'round'; X.stroke(cv); X.lineWidth = 22; X.strokeStyle = PAPER; X.stroke(cv); X.setLineDash([4, 18]); X.lineWidth = 34; X.strokeStyle = K; X.stroke(cv); X.restore();
        trachea(x + 800, y + 330, y + h + 10, 1.4); butterfly(x + 800, y + 460, 1.3);
        const u = (((t * .18) % 1) + 1) % 1; const seg = Math.min(tr.length - 2, Math.floor(u * (tr.length - 1))); const f = u * (tr.length - 1) - seg; const cx = tr[seg][0] + (tr[seg + 1][0] - tr[seg][0]) * f, cy = tr[seg][1] + (tr[seg + 1][1] - tr[seg][1]) * f;
        car(cx, cy - 30, .55, INK.y);
        burst(x + 150, y + 470, 110, 12, INK.y, .2); text('4ª\nSEMANA!', x + 150, y + 470, 34, { f: '"Bangers"', w: 400 });
        caption('Endoderma do assoalho da faringe primitiva', x + w - 430, y + 24, 408, 24);
      },
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.ly, 0);
        const p = curve([[x + 80, y + 70], [x + 260, y + 160], [x + 120, y + 260], [x + 300, y + h - 60]]); X.save(); X.setLineDash([16, 14]); X.lineWidth = 10; X.strokeStyle = K; X.globalAlpha = .55 + .45 * Math.cos(t * 2); X.stroke(p); X.restore();
        const u = (t * .3) % 1; car(x + 80 + u * 220, y + 70 + u * (h - 140), .4, INK.y);
        caption('Ducto tireoglosso: normalmente desaparece', x + 18, y + h - 130, 300, 22, INK.ly.concat([[YE, .95]]));
        sfx('ZUUUM!', x + w - 110, y + 80, 50, .2, INK.y, t);
      },
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.lc, 0); X.save(); X.lineWidth = 5; X.strokeStyle = K; X.beginPath(); X.moveTo(x, y + h / 2); X.lineTo(x + w, y + h / 2); X.stroke(); X.restore();
        const tg = P(); tg.ellipse(x + 160, y + 120, 130, 60, 0, 0, 7); shape(tg, INK.r, 5); butterfly(x + 170, y + 105, .45, INK.y); text('PAROU!', x + 340, y + 70, 34, { f: '"Bangers"', w: 400 });
        label('Tireoide lingual', x + w - 120, y + 150, 22, 190);
        X.save(); X.setLineDash([10, 10]); X.lineWidth = 5; X.strokeStyle = K; X.beginPath(); X.moveTo(x + 140, y + h / 2 + 20); X.lineTo(x + 140, y + h - 20); X.stroke(); X.restore();
        const b = 1 + .06 * Math.sin(t * 3); shape(ellP(x + 140, y + h / 2 + 110, 46 * b, 40 * b), INK.c, 5); text('CISTO', x + 140, y + h / 2 + 110, 22, { f: '"Bangers"', w: 400 });
        label('Cisto tireoglosso (ducto persistiu)', x + w - 130, y + h / 2 + 90, 22, 230);
      },
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), [[K, .1]], 0);
        const fx = x + 190, fy = y + h / 2; shape(ellP(fx, fy, 120, 120), INK.r, 5); shape(ellP(fx, fy, 78, 78), INK.o, 4); for (let i = 0; i < 14; i++) { const a = i / 14 * 7; solid(ellP(fx + Math.cos(a) * 100, fy + Math.sin(a) * 100, 8, 8)); }
        text('COLOIDE', fx, fy, 22);
        caption('Foliculares → T3 e T4', x + 330, y + 70, 270, 30);
        cell(x + w - 150, y + h / 2 + 10, 70, INK.c); caption('Células C → calcitonina', x + 330, y + 200, 270, 30, INK.c.concat([[YE, .2]]));
        sfx('ATENÇÃO!', x + w - 150, y + 60, 46, .1, INK.y, t);
      },
    ],
  },
  espelhos: {
    title: 'A CASA DOS ESPELHOS', n: 3, panels: layout4(),
    draw: [
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.purple.map(([c, d]) => [c, d * .4]), 0); krackle(x + w / 2, y + 120, 300, t, 31, 30);
        const fa = poly([[x + 90, y + h], [x + 140, y + 200], [x + w / 2, y + 120], [x + w - 140, y + 200], [x + w - 90, y + h]]); shape(fa, INK.y, 7);
        text('CASA DOS ESPELHOS', x + w / 2, y + 230, 52, { f: '"Bangers"', w: 400 });
        for (const [k, n] of [[-1, '3'], [1, '4']]) { const dx = x + w / 2 + k * 190; const d = P(); d.moveTo(dx - 110, y + h - 10); d.lineTo(dx - 110, y + 400); d.quadraticCurveTo(dx, y + 290, dx + 110, y + 400); d.lineTo(dx + 110, y + h - 10); d.closePath(); shape(d, k < 0 ? INK.c : INK.m, 7); burst(dx, y + 480, 66, 10, INK.y, t * .3 * k); text(n, dx, y + 482, 70, { f: '"Bangers"', w: 400 }); text(n + 'ª BOLSA', dx, y + 600, 34, { f: '"Bangers"', w: 400, c: '#F8F0DA' }); }
        for (const k of [-1, 1]) { const mx = x + w / 2 + k * 400; for (let i = 0; i < 5; i++) ink(curve([[mx - 30, y + 330 + i * 70], [mx, y + 350 + i * 70 + Math.sin(t * 2 + i) * 10], [mx + 30, y + 330 + i * 70]]), 3); }
        caption('Bolsas faríngeas', x + w / 2 - 150, y + 26, 300, 28);
      },
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.lc, 0);
        const po = P(); po.ellipse(x + w / 2, y + 90, 150, 50, 0, 0, 7); shape(po, INK.c, 5); text('3ª BOLSA', x + w / 2, y + 90, 30, { f: '"Bangers"', w: 400 });
        const u = ease((t % 5) / 4);
        shape(ellP(x + 130, y + 190 + u * 150, 60, 80), INK.pink, 5); shape(ellP(x + 190, y + 190 + u * 150, 50, 70), INK.pink, 5); text('TIMO', x + 160, y + 190 + u * 150, 30, { f: '"Bangers"', w: 400 });
        for (const k of [0, 1]) shape(ellP(x + w - 150 + k * 50, y + 190 + u * 110, 18, 18), INK.y, 4);
        stroke(x + w / 2 - 60, y + 150, x + 170, y + 190, 8); stroke(x + w / 2 + 60, y + 150, x + w - 130, y + 175, 8);
        label('Ventral → timo → mediastino', x + 150, y + h - 70, 20, 240); label('Dorsal → paratireoides inferiores', x + w - 140, y + h - 70, 20, 230);
      },
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.pink, 0);
        const po = P(); po.ellipse(x + w / 2, y + 90, 150, 50, 0, 0, 7); shape(po, INK.m, 5); text('4ª BOLSA', x + w / 2, y + 90, 30, { f: '"Bangers"', w: 400 });
        for (const k of [0, 1]) shape(ellP(x + w / 2 - 25 + k * 50, y + 230, 22, 22), INK.y, 4);
        stroke(x + w / 2, y + 150, x + w / 2, y + 200, 8);
        label('Dorsal → paratireoides superiores', x + w / 2, y + h - 96, 22, 300); sfx('FICAM NO ALTO!', x + w / 2, y + 290, 34, -.06, INK.y, t);
      },
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), [[K, .1]], 0);
        trachea(x + 260, y + 10, y + h - 10, 1); butterfly(x + 260, y + h / 2, 1.5, INK.r);
        for (const k of [-1, 1]) { shape(ellP(x + 260 + k * 80, y + h / 2 - 70, 16, 16), INK.y, 4); shape(ellP(x + 260 + k * 85, y + h / 2 + 95, 16, 16), INK.y, 4); }
        text('SUP.', x + 120, y + h / 2 - 70, 22, { w: 800 }); text('INF.', x + 120, y + h / 2 + 95, 22, { w: 800 });
        caption('Inferiores ficam mais baixas: desceram com o timo!', x + 470, y + 40, 440, 26);
        burst(x + 700, y + 260, 110, 14, INK.y, t * .2); text('PTH\n↑ Ca²⁺', x + 700, y + 262, 40, { f: '"Bangers"', w: 400 });
      },
    ],
  },
  queda: {
    title: 'A QUEDA LIVRE DA SUPRARRENAL', n: 4, panels: [[36, 176, 928, 724], [36, 922, 928, 480], [36, 1424, 928, 318]],
    draw: [
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.sky, 0); speed(x + w / 2, y + 40, 100, 900, 40, 41, .3, Math.PI - .3);
        const tw = poly([[x + w / 2 - 150, y + h], [x + w / 2 - 40, y + 130], [x + w / 2 + 40, y + 130], [x + w / 2 + 150, y + h]]); shape(tw, INK.r, 7);
        for (let i = 0; i < 12; i++) { const yy = y + 160 + i * 48; const hw = 40 + (yy - y - 130) / (h - 130) * 110; ink(curve([[x + w / 2 - hw, yy], [x + w / 2, yy + 8], [x + w / 2 + hw, yy]]), 3); }
        const cap = poly([[x + w / 2 - 120, y + 140], [x + w / 2, y + 30], [x + w / 2 + 120, y + 140]]); shape(cap, INK.y, 6); text('SUPRARRENAL', x + w / 2, y + 112, 22, { w: 800 });
        const u = ((t * .35) % 1); const gy = y + 180 + ease3(u) * (h - 260); const gw = 60 + (gy - y - 130) / (h - 130) * 120;
        shape(rectP(x + w / 2 - gw - 30, gy, 2 * gw + 60, 40), INK.c, 5); for (let k = -2; k <= 2; k++) { const px = x + w / 2 + k * gw * .45; shape(ellP(px, gy - 12, 12, 14), INK.tan, 3); }
        sfx('WHOOOSH!', x + 220, y + 330, 74, -.25, INK.y, t); feather(x + w / 2 + 150, y + 400, 80, 300, 1, 10, 43);
        const kid = P(); kid.ellipse(x + w / 2, y + h - 20, 230, 70, 0, Math.PI, 0); shape(kid, INK.purple, 6); text('RIM', x + w / 2, y + h - 40, 28, { f: '"Bangers"', w: 400 });
      },
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.ly, 0); const cx = x + 280, cy = y + h / 2;
        shape(ellP(cx, cy, 210, 210), INK.y, 6); shape(ellP(cx, cy, 110, 110), INK.m, 6); krackle(cx, cy, 80, t, 51, 14);
        caption('Córtex (externo): mesoderma → hormônios esteroides', x + 520, y + 50, 390, 26);
        caption('Medula (interna): crista neural → células cromafins → adrenalina e noradrenalina', x + 520, y + 220, 390, 26, INK.m.map(([c, d]) => [c, .35]).concat([[YE, .5]]));
      },
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), [[K, .1]], 0); const rows = [['G', 'GLOMERULOSA → ALDOSTERONA', INK.y], ['F', 'FASCICULADA → CORTISOL', INK.o], ['R', 'RETICULADA → ANDROGÊNIOS', INK.lc]];
        rows.forEach(([l, s, ik], i) => { const yy = y + 22 + i * 96; shape(rectP(x + 150, yy, w - 180, 80), ik, 5); text(s, x + 150 + (w - 180) / 2, yy + 40, 34, { f: '"Bangers"', w: 400 }); burst(x + 80, yy + 40, 52, 10, INK.r, t * .3 + i); text(l, x + 80, yy + 42, 48, { f: '"Bangers"', w: 400 }); });
      },
    ],
  },
  batebate: {
    title: 'OS CARRINHOS DE BATE-BATE', n: 5, panels: layout4(),
    draw: [
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), [[K, .55]], 0);
        for (let i = 0; i < 9; i++) ink(curve([[x + i * 120, y], [x + i * 120 + 40, y + 100]]), 3); krackle(x + w / 2, y + 120, 200, t, 61, 26);
        const fl = poly([[x, y + h], [x + 120, y + 330], [x + w - 120, y + 330], [x + w, y + h]]); shape(fl, INK.tan, 6);
        const u = (t * .4) % 2.4, k = ease(Math.min(u, 1.2) / 1.2);
        car(x + 160 + k * 260, y + 560, 1.15, INK.c, 'DORSAL'); car(x + w - 160 - k * 260, y + 560, 1.15, INK.m, 'VENTRAL');
        if (u > 1.05 && u < 2) { burst(x + w / 2, y + 470, 120 * (1 + .1 * Math.sin(t * 20)), 14, INK.y, 0); sfx('BAM!', x + w / 2, y + 470, 96, -.1, INK.r, t); }
        caption('Dois brotos endodérmicos', x + 22, y + 22, 380, 28);
      },
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.ly, 0); const cx = x + w / 2, cy = y + h / 2 + 10;
        const du = P(); du.arc(cx, cy, 130, -Math.PI * .45, Math.PI * .45, true); X.save(); X.lineWidth = 56; X.strokeStyle = K; X.stroke(du); X.lineWidth = 44; X.strokeStyle = '#E9B94A'; X.stroke(du); X.restore();
        text('DUODENO', cx - 40, cy, 26, { w: 800 });
        shape(ellP(cx + 60, cy - 165, 50, 30), INK.c, 5);
        const a = Math.PI * (.35 - .5 * ease((t % 5) / 3.5)); shape(ellP(cx + Math.cos(a) * 190, cy + Math.sin(a) * 190, 40, 26), INK.m, 5);
        ink(curve([[cx + 200, cy + 120], [cx + 250, cy], [cx + 200, cy - 110]]), 5); solid(poly([[cx + 186, cy - 120], [cx + 222, cy - 106], [cx + 196, cy - 86]]));
        burst(x + 90, y + 80, 70, 12, INK.y, .2); text('~90°', x + 90, y + 82, 36, { f: '"Bangers"', w: 400 });
      },
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.lc.map(([c, d]) => [c, .25]), 0);
        const body = P(); body.moveTo(x + 120, y + 150); body.bezierCurveTo(x + 220, y + 90, x + 380, y + 110, x + 430, y + 70); body.lineTo(x + 440, y + 120); body.bezierCurveTo(x + 380, y + 170, x + 240, y + 170, x + 170, y + 210); body.closePath(); shape(body, INK.c, 5);
        const vh = P(); vh.ellipse(x + 130, y + 230, 60, 42, .3, 0, 7); shape(vh, INK.m, 5);
        const wi = curve([[x + 420, y + 100], [x + 250, y + 140], [x + 140, y + 200], [x + 80, y + 250]]); X.save(); X.lineWidth = 9; X.strokeStyle = K; X.stroke(wi); X.restore();
        const sa = curve([[x + 220, y + 135], [x + 140, y + 130], [x + 70, y + 150]]); X.save(); X.lineWidth = 4; X.setLineDash([8, 6]); X.strokeStyle = K; X.stroke(sa); X.restore();
        label('Wirsung (principal)', x + 330, y + 176, 20, 200); label('Santorini (acessório)', x + 330, y + 18, 20, 210);
        label('Ventral: cabeça inferior + uncinado', x + w / 2, y + h - 70, 20, 330); text('DORSAL', x + 300, y + 130, 24, { f: '"Bangers"', w: 400 });
      },
      (r, t) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), [[K, .1]], 0); const cx = x + 200, cy = y + h / 2;
        shape(ellP(cx, cy, 160, 150), INK.ly, 6); const R = rng(71);
        for (let i = 0; i < 22; i++) { const a = R() * 7, d = Math.sqrt(R()) * 120; const kk = i < 13 ? INK.c : i < 19 ? INK.m : INK.y; cell(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .9, 20, kk); }
        caption('β (beta) → insulina', x + 400, y + 50, 480, 32, INK.c.map(([c]) => [c, .4]).concat([[YE, .4]]));
        caption('α (alfa) → glucagon', x + 400, y + 150, 480, 32, [[MG, .35], [YE, .5]]);
        caption('δ (delta) → somatostatina', x + 400, y + 250, 480, 32);
      },
    ],
  },
  saida: {
    title: 'SAÍDA DO PARQUE', n: 6, panels: [[36, 176, 928, 1566]],
    draw: [
      (r, t, S) => {
        const [x, y, w, h] = r; shape(rectP(x, y, w, h), INK.r.map(([c, d]) => [c, d * .55]), 0); krackle(x + w / 2, y + 380, 340, t, 81, 50);
        speed(x + w / 2, y + 380, 220, 1100, 46, 83);
        // silhuetas do parque
        X.save(); X.lineWidth = 16; X.strokeStyle = K; X.stroke(curve([[x, y + 980], [x + 150, y + 760], [x + 260, y + 900], [x + 380, y + 720], [x + 470, y + 980]])); X.restore();
        solid(poly([[x + 600, y + 980], [x + 640, y + 620], [x + 680, y + 980]])); solid(rectP(x + 740, y + 820, 160, 160)); solid(poly([[x + 720, y + 830], [x + 820, y + 740], [x + 920, y + 830]]));
        const g = P(); g.moveTo(x + 120, y + h); g.lineTo(x + 200, y + 1020); g.quadraticCurveTo(x + w / 2, y + 850, x + w - 200, y + 1020); g.lineTo(x + w - 120, y + h); g.lineTo(x + w - 230, y + h); g.lineTo(x + w - 290, y + 1090); g.quadraticCurveTo(x + w / 2, y + 960, x + 290, y + 1090); g.lineTo(x + 230, y + h); g.closePath(); shape(g, INK.y, 8);
        text('SAÍDA', x + w / 2, y + 985, 70, { f: '"Bangers"', w: 400 });
        const fin = clamp((t - (S.segs[1].start + S.segs[1].dur - S.start) + .3) / .6);
        if (fin > 0) {
          X.save(); X.globalAlpha = fin; X.translate(x + w / 2, y + 330); X.scale(.8 + .2 * ease(fin), .8 + .2 * ease(fin));
          burst(0, 0, 330, 18, INK.y, .05); text('EMBRIOLOGIA\nENDÓCRINA', 0, -10, 92, { f: '"Bangers"', w: 400 }); X.restore();
          X.save(); X.globalAlpha = fin; caption('Não decore estruturas isoladas. Visualize como elas se formam.', x + 120, y + 640, w - 240, 38); X.restore();
        } else balloon('Estudar é criar caminhos para a memória!', x + w / 2, y + 320, 560, 40, x + w / 2 + 40, y + 520);
      },
    ],
  },
};
const ORDER = TL.scenes.map(s => s.set);

// ---------- papel, página e mesa ----------
const grain = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const d = g.createImageData(256, 256); const R = rng(5); for (let i = 0; i < d.data.length; i += 4) { const v = 200 + R() * 55; d.data[i] = v; d.data[i + 1] = v * .97; d.data[i + 2] = v * .9; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); g.fillStyle = 'rgba(120,80,40,.25)'; for (let i = 0; i < 60; i++) g.fillRect(R() * 256, R() * 256, R() * 3, R() * 3); return X.createPattern(c, 'repeat'); })();
function pageX(i) { return i * (PW + PGAP); }
function drawPage(i, S, tl) {
  const pg = PAGES[ORDER[i]]; X.save(); X.translate(pageX(i), 0);
  X.save(); X.shadowColor = 'rgba(0,0,0,.6)'; X.shadowBlur = 40; X.shadowOffsetY = 18; X.fillStyle = PAPER; X.fillRect(0, 0, PW, PH); X.restore();
  X.save(); X.globalCompositeOperation = 'multiply'; X.fillStyle = grain; X.fillRect(0, 0, PW, PH); X.restore();
  // cabeçalho
  shape(rectP(36, 36, PW - 72, 118), INK.r, 6); text(pg.title, PW / 2 + 40, 92, 52, { f: '"Bangers"', w: 400 });
  burst(96, 95, 62, 10, INK.y, .3); text(String(pg.n), 96, 98, 50, { f: '"Bangers"', w: 400 });
  pg.panels.forEach((r, k) => {
    X.save(); const cp = rectP(...r); X.clip(cp); X.fillStyle = PAPER; X.fill(cp); pg.draw[k](r, tl, S); X.restore();
    X.save(); X.lineWidth = 7; X.strokeStyle = K; X.strokeRect(...r); X.restore();
  });
  text('PARQUE ENDÓCRINO · EMBRIOLOGIA', PW / 2, PH - 16, 18, { w: 700, c: '#6a5236' });
  // bordas amarronzadas
  for (const [x0, y0, x1, y1] of [[0, 0, 60, 0], [PW, 0, PW - 60, 0], [0, 0, 0, 60], [0, PH, 0, PH - 60]]) { const g = X.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(120,70,25,.45)'); g.addColorStop(1, 'rgba(120,70,25,0)'); X.fillStyle = g; X.fillRect(0, 0, PW, PH); }
  // sombra da dobra (lombada)
  const fold = i % 2 ? [0, 90] : [PW, PW - 90]; const fg = X.createLinearGradient(fold[0], 0, fold[1], 0); fg.addColorStop(0, 'rgba(40,20,5,.55)'); fg.addColorStop(1, 'rgba(40,20,5,0)'); X.fillStyle = fg; X.fillRect(0, 0, PW, PH);
  X.restore();
}

// ---------- câmera ----------
function rectFor(si, p) {
  const pg = PAGES[ORDER[si]]; const ox = pageX(si);
  if (p < 0) return [ox - 30, -30, PW + 60, PH + 60, true];
  const r = pg.panels[p]; return [ox + r[0], r[1], r[2], r[3], false];
}
function view(rc, push, pan = .5) {
  const [x, y, w, h, full] = rc; const A = OW / OH;
  if (full) { const vw = Math.max(w, h * A) * (1 - .09 * push); return { cx: x + w / 2, cy: y + h / 2, vw }; }
  // painel ocupa ~74% da altura da tela; se for mais largo que a tela, a câmera percorre o painel
  let vw = Math.min(w * 1.04, h * 1.06 / .74 * A); vw *= 1 - .08 * push; const vh = vw / A;
  const cx = w * 1.04 <= vw + 1 ? x + w / 2 : x + vw / 2 - 10 + (w - vw + 20) * pan;
  return { cx, cy: y + h / 2 + vh * .1, vw };
}
const KEYS = []; TL.scenes.forEach((S, si) => S.segs.forEach((g, k) => { const prev = KEYS[KEYS.length - 1]; if (prev && prev.si === si && prev.p === g.p) return; KEYS.push({ si, p: g.p, t: k === 0 ? S.start : g.start - .15 }); }));
KEYS.forEach((k, i) => k.end = i + 1 < KEYS.length ? KEYS[i + 1].t : TL.total);
function camAt(t) {
  let i = 0; while (i + 1 < KEYS.length && KEYS[i + 1].t <= t) i++;
  const k = KEYS[i]; const pushOf = (kk, tt) => ease((tt - kk.t) / Math.max(2, kk.end - kk.t)); const panOf = (kk, tt) => ease3((tt - kk.t - .4) / Math.max(1.5, kk.end - kk.t - .9));
  let v = view(rectFor(k.si, k.p), pushOf(k, t), panOf(k, t));
  if (i === 0) { const z = ease(t / 2.5); v.vw *= 1.25 - .25 * z; }
  if (i > 0) { const pk = KEYS[i - 1]; const pv = view(rectFor(pk.si, pk.p), pushOf(pk, k.t), panOf(pk, k.t)); const D = pk.si !== k.si ? 1.1 : .75; const e = ease3((t - k.t) / D); v = { cx: pv.cx + (v.cx - pv.cx) * e, cy: pv.cy + (v.cy - pv.cy) * e, vw: pv.vw + (v.vw - pv.vw) * e }; if (pk.si !== k.si) v.vw *= 1 + .18 * Math.sin(Math.PI * clamp((t - k.t) / D)); }
  return v;
}

// ---------- legenda narrada (recordatório amarelo) ----------
function narration(t) {
  for (const S of TL.scenes) for (const g of S.segs) for (const c of g.caps) if (t >= c.t && t < c.t + c.d + .2) {
    const font = `700 46px "Comic Neue"`; const L = wrapW(c.text.toUpperCase(), 900, font); const lh = 52, h = L.length * lh + 34, w = 960, x = (OW - w) / 2, y = 1690 - h / 2;
    X.save(); X.fillStyle = 'rgba(0,0,0,.35)'; X.fillRect(x + 10, y + 10, w, h); X.fillStyle = YE; X.fillRect(x, y, w, h); X.lineWidth = 5; X.strokeStyle = K; X.strokeRect(x, y, w, h); X.restore();
    L.forEach((l, i) => text(l, OW / 2, y + 17 + lh / 2 + i * lh, 46)); return;
  }
}

// ---------- quadro ----------
window.renderFrame = function (t) {
  let si = 0; while (si + 1 < TL.scenes.length && TL.scenes[si + 1].start <= t) si++;
  const v = camAt(t); const s = OW / v.vw;
  X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = '#3a2416'; X.fillRect(0, 0, OW, OH);
  X.setTransform(s, 0, 0, s, OW / 2 - v.cx * s, OH / 2 - v.cy * s);
  X.save(); X.fillStyle = 'rgba(0,0,0,.25)'; for (let k = -2; k < 12; k++) X.fillRect(pageX(-2) + k * 330, -400, 6, PH + 800); X.restore(); // veios da mesa
  for (let i = 0; i < TL.scenes.length; i++) { const px = pageX(i); if (px + PW < v.cx - v.vw && px > v.cx + v.vw) continue; if (Math.abs(px + PW / 2 - v.cx) > v.vw / 2 + PW / 2 + 10) continue; drawPage(i, TL.scenes[i], t - TL.scenes[i].start); }
  X.setTransform(1, 0, 0, 1, 0, 0);
  // luz quente de luminária (decai nas bordas)
  const lg = X.createRadialGradient(OW * .42, OH * .32, 120, OW * .5, OH * .5, OH * .78); lg.addColorStop(0, 'rgba(255,220,150,.10)'); lg.addColorStop(.6, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(40,15,0,.45)'); X.fillStyle = lg; X.fillRect(0, 0, OW, OH);
  narration(t);
  return true;
};
window.grab = (t, fi = 0, q = .92) => { window.renderFrame(t); return out.toDataURL('image/jpeg', q); };
document.fonts.load('400 40px "Bangers"').then(() => document.fonts.load('700 40px "Comic Neue"')).then(() => { window.ready = true; });
