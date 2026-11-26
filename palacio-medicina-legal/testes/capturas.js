#!/usr/bin/env node
// Capturas com Chromium headless (Playwright): silhuetas (seção 10b), amostra de materiais,
// vistas do mundo e orçamento de desempenho. Uso:
//   node testes/capturas.js <pasta-de-saida> [caminho/local/three.min.js]
// Sem o segundo argumento, o Three.js vem do cdnjs como na página publicada.
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const SAIDA = path.resolve(process.argv[2] || 'capturas');
const THREE_LOCAL = process.argv[3];
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
fs.mkdirSync(SAIDA, { recursive: true });

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const nova = async (vp) => {
    const p = await b.newPage({ viewport: vp || { width: 1280, height: 720 } });
    p.on('pageerror', e => console.log('ERRO:', e.message));
    p.on('console', m => m.type() === 'error' && console.log('console:', m.text()));
    if (THREE_LOCAL) await p.route('**/three.min.js', r => r.fulfill({ path: THREE_LOCAL, contentType: 'application/javascript' }));
    return p;
  };
  const so = process.env.SO ? '&so=' + process.env.SO : '';
  let p = await nova({ width: 2048, height: 2200 });
  await p.goto(URL + '?modo=silhuetas' + so + (process.env.T ? '&t=' + process.env.T : ''));
  await p.waitForFunction(() => window.__pronto, null, { timeout: 60000 });
  await p.screenshot({ path: path.join(SAIDA, 'silhuetas.png'), fullPage: true });
  await p.close();

  if (process.env.SO) { await b.close(); return; }
  p = await nova({ width: 1400, height: 560 });
  await p.goto(URL + '?modo=amostra'); await p.waitForFunction(() => window.__pronto);
  await p.screenshot({ path: path.join(SAIDA, 'amostra.png') }); await p.close();

  p = await nova();
  await p.goto(URL); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('entrada').click());
  const vistas = JSON.parse(process.env.VISTAS || '[]');
  const padrao = [
    ['hub', 0, 0, Math.PI / 2, -0.05], ['sala1', -40, -9, 0, -0.1], ['sala1ilha', -40, -14, 0, -0.15], ['sala2', 0, -7.5, 0, -0.08],
    ['sala3', 40, -8, 0, -0.05], ['sala3cruz', 40, -17, Math.PI / 2, -0.05], ['sala4', -40, 9, Math.PI, -0.05], ['sala5', 0, 7.5, Math.PI, -0.08], ['sala6', 40, 9, Math.PI, -0.05], ['sala6b', 40, 21, Math.PI, -0.05]
  ];
  for (const [nome, x, z, g, a] of (vistas.length ? vistas : padrao)) {
    await p.evaluate(([x, z, g, a]) => window.__palacio.ir(x, z, g, a), [x, z, g, a]);
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(SAIDA, `mundo_${nome}.png`) });
  }
  const info = await p.evaluate(() => window.__palacio.info());
  console.log('orçamento:', JSON.stringify(info));
  await b.close();
})();
