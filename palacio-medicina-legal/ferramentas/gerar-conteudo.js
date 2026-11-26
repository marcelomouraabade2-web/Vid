#!/usr/bin/env node
// Extrai a Parte B de PALACIO_MINECRAFT_SPEC.md e grava o bloco SALAS dentro de index.html,
// entre os marcadores /*<CONTEUDO>*/ e /*</CONTEUDO>*/.
// O texto é copiado literalmente: nenhuma palavra da Parte B é reescrita aqui.
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SPEC = path.join(RAIZ, 'PALACIO_MINECRAFT_SPEC.md');
const HTML = path.join(RAIZ, 'index.html');

const num = s => Number(s.trim().replace('−', '-').replace(',', '.'));

function parse(md) {
  const linhas = md.split('\n');
  const ini = linhas.findIndex(l => l.startsWith('# PARTE B'));
  const fim = linhas.findIndex(l => l.startsWith('## 13.'));
  const L = linhas.slice(ini, fim);
  const salas = [];
  let sala = null, parada = null, bloco = null, item = null;

  const fechaItem = () => { item = null; };
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    let m;
    if ((m = l.match(/^## SALA (\w+) · (.+?) — (.+)$/))) {
      sala = { id: m[1], nome: m[2], tema: m[3], intro: [], paradas: [] };
      salas.push(sala); parada = null; bloco = 'intro'; fechaItem();
      continue;
    }
    if (!sala) continue;
    if ((m = l.match(/^\*\*Centro \((.+?), (.+?)\) · (.+?) · porta em \((.+?), (.+?)\) · luz (.+?) `(#\w+)`\*\*$/))) {
      sala.centro = [num(m[1]), num(m[2])];
      sala.forma = m[3];
      sala.porta = [num(m[4]), num(m[5])];
      sala.luzNome = m[6];
      sala.luz = parseInt(m[7].slice(1), 16);
      continue;
    }
    if ((m = l.match(/^\*Lema[^:]*:\* "(.+)"$/))) { sala.lema = m[1]; continue; }
    if ((m = l.match(/^#### (\d+) · (.+)$/))) {
      parada = { n: Number(m[1]), titulo: m[2], ancoras: [], fatos: [] };
      sala.paradas.push(parada); bloco = 'cab'; fechaItem();
      continue;
    }
    if (l.startsWith('---')) { bloco = null; fechaItem(); continue; }
    if (!parada) {
      if (bloco === 'intro' && l.trim() && !l.startsWith('**Centro')) {
        if (sala.intro.length && !L[i - 1].trim()) sala.intro.push(l.trim());
        else if (sala.intro.length) sala.intro[sala.intro.length - 1] += ' ' + l.trim();
        else sala.intro.push(l.trim());
      }
      continue;
    }
    if ((m = l.match(/^`(.+?)` · pos \((.+?) \/ (.+?)\) · `(#\w+)` · legenda \*\*(.+?)\*\* \/ \*(.+?)\*$/))) {
      parada.k = m[1];
      parada.pos = [num(m[2]), num(m[3])];
      parada.cor = parseInt(m[4].slice(1), 16);
      parada.l1 = m[5];
      parada.l2 = m[6];
      continue;
    }
    if ((m = l.match(/^\*\*Escultura:\*\* (.+)$/))) { parada.escultura = m[1]; bloco = 'escultura'; continue; }
    if ((m = l.match(/^\*\*Imagem mental:\*\* (.+)$/))) { parada.imagem = m[1]; bloco = 'imagem'; continue; }
    if (l === '**Âncoras:**') { bloco = 'ancoras'; fechaItem(); continue; }
    if (l === '**Fatos:**') { bloco = 'fatos'; fechaItem(); continue; }
    if (!l.trim()) { if (bloco === 'escultura' || bloco === 'imagem') bloco = null; fechaItem(); continue; }

    if (bloco === 'escultura') { parada.escultura += ' ' + l.trim(); continue; }
    if (bloco === 'imagem') { parada.imagem += ' ' + l.trim(); continue; }
    if (bloco === 'ancoras' && l.startsWith('- ')) {
      const t = l.slice(2);
      const setas = t.split(' → ').length - 1;
      let a, b;
      if (setas >= 2 && t.includes(' = ')) { const k = t.indexOf(' = '); a = t.slice(0, k); b = t.slice(k + 3); }
      else { const k = t.lastIndexOf(' → '); a = t.slice(0, k); b = t.slice(k + 3); }
      parada.ancoras.push([a, b]);
      continue;
    }
    if (bloco === 'fatos') {
      if (l.startsWith('- ')) { item = l.slice(2); parada.fatos.push(item); continue; }
      if (l.startsWith('  ') && parada.fatos.length) {
        parada.fatos[parada.fatos.length - 1] += ' ' + l.trim();
        continue;
      }
    }
  }
  return salas;
}

const md = fs.readFileSync(SPEC, 'utf8');
const salas = parse(md);

// Conferências mínimas antes de gravar
const todas = salas.flatMap(s => s.paradas);
const problemas = [];
if (salas.length !== 6) problemas.push(`salas: ${salas.length}`);
if (todas.length !== 50) problemas.push(`paradas: ${todas.length}`);
todas.forEach((p, i) => {
  if (p.n !== i + 1) problemas.push(`ordem: ${p.n} na posição ${i + 1}`);
  for (const c of ['k', 'pos', 'cor', 'l1', 'l2', 'escultura', 'imagem']) if (p[c] == null) problemas.push(`${p.n} sem ${c}`);
  if (!p.ancoras.length) problemas.push(`${p.n} sem âncoras`);
  if (!p.fatos.length) problemas.push(`${p.n} sem fatos`);
});
salas.forEach(s => { for (const c of ['centro', 'porta', 'luz', 'lema']) if (s[c] == null) problemas.push(`sala ${s.id} sem ${c}`); });
if (problemas.length) { console.error('Falha ao ler a especificação:\n  ' + problemas.join('\n  ')); process.exit(1); }

const bloco = '/*<CONTEUDO>*/\n// Gerado por ferramentas/gerar-conteudo.js a partir da Parte B da especificação. Não edite à mão.\n' +
  'const SALAS = ' + JSON.stringify(salas, null, 1) + ';\n/*</CONTEUDO>*/';

const html = fs.readFileSync(HTML, 'utf8');
const re = /\/\*<CONTEUDO>\*\/[\s\S]*?\/\*<\/CONTEUDO>\*\//;
if (!re.test(html)) { console.error('Marcadores /*<CONTEUDO>*/ não encontrados em index.html'); process.exit(1); }
fs.writeFileSync(HTML, html.replace(re, () => bloco));
console.log(`conteúdo gravado: ${salas.length} salas, ${todas.length} paradas`);
