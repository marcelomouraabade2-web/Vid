#!/usr/bin/env node
// Harness sem WebGL (seção 10a + 10c): carrega index.html, recorta o conteúdo e o núcleo lógico
// por fatiamento de string e verifica planta, paradas, colisão e travessia completa do percurso.
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const ini = html.indexOf('/*<CONTEUDO>*/'), fim = html.indexOf('// ==/NUCLEO==');
if (ini < 0 || fim < 0) { console.error('marcadores não encontrados'); process.exit(1); }
// O núcleo não usa THREE nem DOM; ainda assim deixamos ambos indefinidos de propósito.
const mod = { exports: {} };
new Function('module', 'THREE', 'document', 'window', html.slice(ini, fim) + '\nmodule.exports = { SALAS, NUCLEO };')(mod, undefined, undefined, undefined);
const { SALAS, NUCLEO: N } = mod.exports;
// ICO é montado na camada de renderização a partir das chaves de VOX: conferimos a mesma regra aqui.
const ICO_ok = /for \(const p of TODAS\) ICO\[p\.k\] = function/.test(html);

const falhas = [];
const ok = (cond, msg) => { if (!cond) falhas.push(msg); };
const P = N.TODAS;

// --- conteúdo ---
ok(SALAS.length === 6, `salas: ${SALAS.length}`);
ok(P.length === 50, `paradas: ${P.length}`);
const chaves = new Set(P.map(p => p.k));
ok(chaves.size === P.length, 'chave k repetida');
P.forEach((p, i) => ok(p.n === i + 1, `numeração fora de ordem em ${p.n}`));
for (const p of P) {
  ok(typeof N.VOX[p.k] === 'function', `${p.n} ${p.k}: sem VOX`);
  ok(ICO_ok, `${p.n} ${p.k}: sem ICO`);
  ok(p.l1.length <= 22, `${p.n} l1 com ${p.l1.length} caracteres`);
  ok(p.l2.length <= 30, `${p.n} l2 com ${p.l2.length} caracteres`);
  ok(p.ancoras.length > 0 && p.fatos.length > 0 && p.imagem, `${p.n} sem cartão completo`);
  const v = N.voxDe(p.k);
  ok(v.m.size > 20, `${p.n} ${p.k}: escultura vazia (${v.m.size} blocos)`);
  ok(v.dim.A >= 0.8, `${p.n} ${p.k}: escultura baixa demais (${v.dim.A.toFixed(2)} m)`);
}

// --- posição das paradas ---
for (const p of P) {
  const [x, z] = N.empurra(p.g[0], p.g[1], N.segsParede);
  const d = Math.hypot(x - p.g[0], z - p.g[1]);
  ok(d < 0.02, `${p.n} ${p.k} encostada em parede (empurra desloca ${d.toFixed(3)} m)`);
  ok(N.salaPorPos(p.g[0], p.g[1]) === p.sala, `${p.n} ${p.k} fora da sala ${p.sala} (está em ${N.regiao(p.g[0], p.g[1])})`);
  // a escultura inteira (pedestal) cabe na sala, sem invadir parede
  for (const c of p.cantos) ok(N.ehPiso(c[0], c[1]), `${p.n} ${p.k}: canto do pedestal fora do piso (${c.map(a => a.toFixed(1))})`);
  ok(N.livre(p.ver[0], p.ver[1]) || N.ehPiso(p.ver[0], p.ver[1]), `${p.n} ${p.k}: ponto de leitura fora do piso`);
}
let menor = 1e9, par = null;
for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
  const d = Math.hypot(P[i].g[0] - P[j].g[0], P[i].g[1] - P[j].g[1]);
  if (d < menor) { menor = d; par = [P[i].n, P[j].n]; }
  ok(d >= 3.0, `paradas ${P[i].n} e ${P[j].n} a ${d.toFixed(2)} m (< 3,0 m)`);
}
// pedestais não se sobrepõem
for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
  const a = P[i], b = P[j];
  if (Math.hypot(a.g[0] - b.g[0], a.g[1] - b.g[1]) > 8) continue;
  for (const c of a.cantos) ok(N.distParada(b, c[0], c[1]) > 0.3, `pedestais de ${a.n} e ${b.n} encostados`);
}

// --- simulação de caminhada ---
function passo(x, z, dx, dz, v, dt) {
  const L = Math.hypot(dx, dz) || 1;
  let nx = x + dx / L * v * dt, nz = z + dz / L * v * dt;
  [nx, nz] = N.empurra(nx, nz);
  if (!N.ehPiso(nx, nz)) return [x, z];
  return [nx, nz];
}
for (const s of SALAS) {
  let [x, z] = s.porta;
  const dt = 1 / 30;
  for (let t = 0; t < 4; t += dt) [x, z] = passo(x, z, s.centro[0] - s.porta[0], s.centro[1] - s.porta[1], 3.2, dt);
  ok(N.salaPorPos(x, z) === s.id, `a partir da porta da sala ${s.id}, 4 s de caminhada terminam em ${N.regiao(x, z)}`);
}

// --- percurso e travessia completa ---
const R = N.rota();
let atravessa = 0, vaza = 0;
for (const tr of R) {
  if (!tr.pts) { falhas.push(`sem caminho até a parada ${tr.n}`); continue; }
  for (let k = 0; k < tr.pts.length - 1; k++) {
    const a = tr.pts[k], b = tr.pts[k + 1], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1);
    for (let i = 0; i <= n; i++) {
      const x = a[0] + (b[0] - a[0]) * i / n, z = a[1] + (b[1] - a[1]) * i / n;
      if (!N.ehPiso(x, z)) { atravessa++; break; }
    }
  }
}
ok(atravessa === 0, `o percurso atravessa parede em ${atravessa} trechos`);

let x = N.INICIO[0], z = N.INICIO[1], t = 0, alcancadas = 0;
const dt = 1 / 30;
for (const tr of R) {
  if (!tr.pts) continue;
  const alvo = P[tr.n - 1];
  let chegou = false;
  for (const wp of tr.pts.slice(1)) {
    let preso = 0, ult = Infinity;
    while (Math.hypot(wp[0] - x, wp[1] - z) > 0.15) {
      [x, z] = passo(x, z, wp[0] - x, wp[1] - z, Math.min(3.2, Math.hypot(wp[0] - x, wp[1] - z) / dt), dt);
      t += dt;
      if (!N.ehPiso(x, z)) vaza++;
      if (N.distParada(alvo, x, z) < 2.2) chegou = true;
      const d = Math.hypot(wp[0] - x, wp[1] - z);
      if (d >= ult - 1e-4) { if (++preso > 90) break; } else preso = 0;
      ult = d;
    }
  }
  if (N.distParada(alvo, x, z) < 2.2) chegou = true;
  if (chegou) alcancadas++; else falhas.push(`travessia: parada ${alvo.n} ${alvo.k} inalcançada (parou em ${x.toFixed(1)}, ${z.toFixed(1)})`);
}
ok(vaza === 0, `o jogador vazou do mapa ${vaza} vezes`);
ok(alcancadas === 50, `travessia alcançou ${alcancadas}/50 paradas`);

const comp = R.reduce((s, tr) => s + (tr.pts || []).reduce((a, p, i, arr) => a + (i ? Math.hypot(p[0] - arr[i - 1][0], p[1] - arr[i - 1][1]) : 0), 0), 0);
const paredes = N.segsParede.length;
console.log(`menor distância entre paradas: ${menor.toFixed(2)} m (${par.join(' e ')}) · percurso: ${comp.toFixed(0)} m, ${Math.round(t / 60)} min a pé · blocos de escultura: ${P.reduce((s, p) => s + N.voxDe(p.k).m.size, 0)}`);
if (falhas.length) {
  console.log(`salas ${SALAS.length} | paradas ${P.length} | paredes ${paredes} — ${falhas.length} FALHA(S):`);
  falhas.forEach(f => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log(`salas ${SALAS.length} | paradas ${P.length} | paredes ${paredes} — TODOS OS TESTES PASSARAM`);
