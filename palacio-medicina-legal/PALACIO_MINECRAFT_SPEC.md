# Palácio da Memória — Medicina Legal, Bioética e Tanatologia
## Briefing de construção para o Claude Code — mundo em blocos (estilo Minecraft) com figuras 3D reconhecíveis

> **Como usar este arquivo.** Salve-o na raiz da pasta do projeto e abra o Claude Code ali.
> Primeiro comando sugerido:
> *"Leia PALACIO_MINECRAFT_SPEC.md por inteiro antes de escrever qualquer linha. Implemente
> somente a Etapa 1 da seção 11 e pare para eu olhar."*
>
> O arquivo tem duas metades. **Parte A (seções 1–11)** é engenharia: como construir.
> **Parte B (seção 12)** é o conteúdo: o roteiro das 50 paradas, com texto definitivo.
> O conteúdo da Parte B é material de estudo já conferido — **não reescreva, não resuma,
> não "melhore" a redação dos fatos**. Copie como está.

---

# PARTE A — ENGENHARIA

## 1. O que é o produto

Uma página HTML única, autossuficiente, que abre um mundo 3D em primeira pessoa.
O usuário **anda** por seis salas ligadas por corredores e, em cada parada, encontra uma
**escultura de blocos** que representa um fato de medicina legal. O percurso é fixo e numerado:
andar na ordem certa é o próprio método dos loci.

Não é um jogo. Não há inimigos, inventário, mineração nem construção. O Minecraft entra
**só como linguagem visual** — e por um motivo técnico, não estético: blocos cúbicos grandes,
com textura pixelada e sem suavização, são a forma mais barata de produzir objetos que o olho
identifica de longe. Detalhe realista em WebGL custa caro e some no celular; silhueta em bloco não.

### A regra que organiza tudo
O palácio só funciona se cada parada for **reconhecida em menos de um segundo, de qualquer ângulo,
a 8 metros de distância**. Um objeto bonito que o usuário precisa examinar para entender é um
objeto quebrado: ele interrompe a caminhada, e a caminhada é o que fixa a memória.

Essa regra vence qualquer outra decisão deste documento.

---

## 2. Restrições técnicas (não negociáveis)

| Restrição | Motivo |
|---|---|
| **Um único arquivo `index.html`**, com HTML, CSS e JS juntos | Publicado como artifact; não há servidor de assets |
| **Three.js r128, build UMD, via cdnjs** | É o CDN permitido pela política de conteúdo do artifact. Módulos ES e `import maps` falham |
| **Zero arquivos externos**: nenhum `.png`, `.glb`, `.gltf`, `.mp3`, nenhuma fonte web | Toda textura é gerada em `<canvas>` no próprio código |
| **Máximo 8 luzes pontuais na cena inteira** | Acima disso, GPUs de celular estouram o limite de uniforms e a tela fica preta |
| **Tem de rodar com o dedo e com teclado/mouse** | O usuário estuda no celular |
| **Nenhum emoji dentro de geometria 3D** | Emoji depende de fonte do sistema; no celular do usuário pode virar quadrado vazio. Emoji só é aceitável em HUD de interface, nunca como a figura em si |

Boilerplate de abertura:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
```

Confira `typeof THREE === 'undefined'` depois do carregamento e, se falhar, mostre uma mensagem
na tela em vez de deixar a página em branco.

---

## 3. A mistura: três resoluções de bloco

Aqui está o coração do projeto. Minecraft usa **uma** resolução de bloco para tudo, e por isso
os objetos dele são genéricos (uma "espada" só é espada porque o jogo diz que é). Nós usamos **três**:

| Camada | Tamanho do bloco | O que é feito nela |
|---|---|---|
| **Mundo** | 1,0 m | Piso, paredes, teto, vigas, degraus, batentes. Tudo alinhado à grade inteira |
| **Mobiliário** | 0,25 m | Bancadas, macas, pedestais, cercas, molduras, aparelhos. Quatro subdivisões do bloco grande |
| **Escultura** | 0,10 m | As 50 figuras. É aqui que nasce a silhueta reconhecível |

O olho leu o mundo como Minecraft nos primeiros dois segundos e aceita a convenção. A partir daí,
a escultura em 0,10 m tem resolução suficiente para que uma **forca seja uma forca** e uma
**balança seja uma balança** — sem deixar de ser feita de cubos.

É essa diferença de escala que resolve o problema. Não tente fazer as figuras com blocos de 1 m:
já foi tentado e o resultado é irreconhecível.

---

## 4. Textura procedural (o visual Minecraft)

Três linhas fazem 90% do efeito:

```js
function textura(base, variacao, res = 16) {
  const c = document.createElement('canvas');
  c.width = c.height = res;
  const x = c.getContext('2d');
  for (let i = 0; i < res; i++) for (let j = 0; j < res; j++) {
    const d = (Math.random() - 0.5) * variacao;           // ruído por pixel
    const r = ((base >> 16) & 255) + d, g = ((base >> 8) & 255) + d, b = (base & 255) + d;
    x.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
    x.fillRect(i, j, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;   // <<< ISTO é o visual Minecraft
  t.minFilter = THREE.NearestFilter;
  return t;
}
```

`NearestFilter` desliga a interpolação: o pixel cresce em quadrado em vez de desfocar.
Sem essa linha o mundo parece um jogo de 2003 mal feito; com ela, parece intencional.

Para pisos e paredes grandes, repita a textura em vez de esticá-la:

```js
t.wrapS = t.wrapT = THREE.RepeatWrapping;
t.repeat.set(largura, profundidade);   // 1 repetição por metro
```

**Reaproveite texturas.** Gere um dicionário de 10 a 14 materiais no início
(`pedra`, `pedraEscura`, `madeira`, `madeiraClara`, `metal`, `vidro`, `tecido`, `osso`,
`verde`, `agua`, `tijolo`, `areia`, `cortina`, `piso`) e use `MeshLambertMaterial`.
Não gere textura dentro de laço de construção: cada `CanvasTexture` é um upload para a GPU.

---

## 5. O sistema de esculturas — mapa de voxels em texto

Cada figura é descrita como **camadas de texto**, de baixo para cima. Um caractere = um bloco de 0,10 m.
É o mesmo princípio do pixel art, só com uma pilha de camadas.

```js
// cam[y] = camada horizontal na altura y (y=0 é a base)
// cam[y][z] = uma fileira em profundidade
// cam[y][z][x] = um bloco; '.' = vazio
const VOX = {
  chama: {
    esc: 0.10,
    pal: { M:0x8a7a62, P:0xd9d2c4, F:0x5aa6d8, A:0xbfe6ff },   // Madeira, Pavio, Fogo, Auréola
    cam: [
      ["..MMM..", "..MMM..", "..MMM.."],   // y=0  base do castiçal
      ["...M...", "...M...", "...M..."],   // y=1  haste
      ["..MMM..", "..MMM..", "..MMM.."],   // y=2  prato
      ["...P...", ".......", "......."],   // y=3  pavio
      ["...F...", ".......", "......."],   // y=4  chama
      ["..FFF..", ".......", "......."],   // y=5
      ["...F...", ".......", "......."],   // y=6
      ["...A...", ".......", "......."]    // y=7  brilho
    ]
  }
};
```

### Construtor

```js
function construirVox(nome) {
  const def = VOX[nome], g = new THREE.Group(), s = def.esc;
  const caixa = new THREE.BoxGeometry(s, s, s);
  const porCor = {};                                  // agrupa por cor → 1 mesh por cor
  def.cam.forEach((camada, y) => camada.forEach((fileira, z) => {
    [...fileira].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      (porCor[ch] = porCor[ch] || []).push([x, y, z]);
    });
  }));
  const larg = def.cam[0][0].length, prof = def.cam[0].length;
  for (const ch in porCor) {
    const m = new THREE.InstancedMesh(caixa, matVox(def.pal[ch]), porCor[ch].length);
    porCor[ch].forEach(([x, y, z], i) => {
      const mt = new THREE.Matrix4().setPosition(
        (x - larg / 2) * s, y * s, (z - prof / 2) * s);
      m.setMatrixAt(i, mt);
    });
    m.castShadow = false;
    g.add(m);
  }
  return g;
}
```

`InstancedMesh` é obrigatório. Uma escultura média tem 150 a 400 blocos; 50 esculturas em
`Mesh` individual são 15 mil draw calls e o celular trava. Agrupadas por cor, são ~200 draw calls no total.

### Como desenhar uma silhueta que funciona

1. **Escreva primeiro o contorno visto de frente**, em uma folha de 7×9 ou 9×11 caracteres.
   Se o contorno em 2D já não identifica a coisa, nenhuma profundidade vai salvar.
2. **Dois ou três tons por figura, no máximo quatro.** Mais cores viram papa visual à distância.
3. **Exagere a parte que carrega o significado.** Na forca, a corda *em diagonal* é tudo —
   faça-a com 2 blocos de espessura e inclinação de 45° inconfundível. O corpo pode ser
   um boneco esquemático.
4. **Profundidade mínima.** Muitas figuras funcionam com 2 ou 3 fileiras em Z. Não modele costas
   que ninguém vai ver.
5. **Teste de silhueta:** renderize a figura em 64×64 pixels, em preto sobre branco.
   Se você não a reconhece nesse tamanho, refaça. Isto é verificável por script (seção 10)
   e é o teste que separa este projeto da tentativa anterior, que falhou exatamente aqui.
6. **Uma figura, um conceito.** Se a parada tem três fatos, não faça três objetos grudados:
   faça um objeto e deixe os outros dois para a placa e para o cartão de texto.

---

## 6. A placa de legenda (billboard)

Cada escultura tem, flutuando acima dela, uma placa que **sempre encara a câmera**. É a rede de
segurança: se o símbolo falhar, a placa salva.

```js
function placa(num, l1, l2, cor) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const x = c.getContext('2d');
  // fundo escuro com cantos arredondados — garante contraste contra qualquer parede
  x.fillStyle = 'rgba(14,16,20,.92)'; arredondado(x, 0, 0, 512, 160, 18); x.fill();
  x.strokeStyle = '#' + cor.toString(16).padStart(6, '0'); x.lineWidth = 4;
  arredondado(x, 2, 2, 508, 156, 18); x.stroke();
  // número do percurso, em disco colorido
  x.fillStyle = x.strokeStyle; x.beginPath(); x.arc(44, 44, 26, 0, 7); x.fill();
  x.fillStyle = '#0e1014'; x.font = 'bold 30px system-ui'; x.textAlign = 'center';
  x.fillText(num, 44, 55);
  // duas linhas, com redução automática até caber
  ajustar(x, l1, 'bold', 40, 256, 78, '#ffffff',       430);
  ajustar(x, l2, '600',  30, 256, 126, clarear(cor, .55), 430);
  const t = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
  sp.scale.set(2.6, 0.81, 1);
  return sp;
}
```

Regras aprendidas na versão anterior, por tentativa e erro — respeite todas:

- **Linha 2 nunca na cor crua da parada.** Cores escuras (azul-marinho, vinho) ficam ilegíveis
  sobre fundo escuro. Clareie em 55% antes de usar: `clarear(cor, .55)`.
- **Largura útil 430 px de 512.** Legenda encostando na borda parece erro de layout.
- **Reduza a fonte em laço** até caber, com piso em 15 px. Não corte texto com `…`.
- **Nunca ponha o número no canto.** Em moldura circular ou em escudo, o canto fica fora do
  desenho. Centro do topo.
- Linha 1: no máximo 22 caracteres. Linha 2: no máximo 30.

---

## 7. Planta do mundo

Seis salas em torno de um cruzamento central, ligadas por corredores de 3 blocos de largura.
Coordenadas em metros, `y = 0` no piso. A **forma de cada sala é informação**, não decoração:

| Sala | Centro | Forma | Por que essa forma |
|---|---|---|---|
| I · Torre do Relógio | (−40, −20) | Círculo, r = 13 | Uma volta completa = a cronologia. Ilha elevada no centro = os conceitos |
| II · Corredor do Protocolo | (0, −25) | Corredor 7 × 21 | Oito portões em fila; a ordem de caminhada é a ordem da norma |
| III · Cruz das Quatro Mortes | (40, −20) | Cruz, braços de 12, largura 5 | Braços opostos = conceitos opostos. Centro = equilíbrio |
| IV · Câmara das Asfixias | (−40, 20) | Sala 13 × 12 | Cada parede é um mecanismo; o centro vê todas |
| V · Estande de Tiro | (0, 25) | Corredor 7 × 21 | A profundidade **é** a distância de tiro |
| VI · Estúdio e Bastidores | (40, 20) | Sala 13 × 12, com divisória | Palco × bastidores = o que se mostra × o que a lei decide |

Portas em `(cx, cz ∓ 7)`, voltadas para o cruzamento. Vestíbulo de 2 blocos em cada porta,
para o jogador nunca aparecer dentro da parede.

### Paredes e colisão

Construa as paredes como blocos **e** registre cada trecho em uma lista de segmentos:

```js
segs.push({ x1, z1, x2, z2 });
```

Colisão: trate o jogador como **círculo de raio 0,42 m** e empurre-o para fora de cada segmento,
em 3 passadas por quadro (o encaixe em canto só resolve iterando). Não use caixa alinhada
aos eixos: em parede diagonal ela atravessa.

```js
function empurra(px, pz) {
  const R = .42;
  for (let passo = 0; passo < 3; passo++) {
    for (const s of segs) {
      // projeta o ponto no segmento, mede a distância, empurra se < R + espessura/2
    }
  }
  return [px, pz];
}
```

### Iluminação dentro do orçamento de 8 luzes

- 1 `HemisphereLight` em 0,66 — faz o trabalho pesado, custo zero
- 1 `DirectionalLight` em 0,22, sem sombra
- 1 `PointLight` por sala (6) + 2 nos corredores = **8**

Sombra dinâmica: desligada. `renderer.shadowMap.enabled = false`. Em vez disso, escureça
levemente os blocos de teto e dê `emissive` discreto aos blocos de luz. Visualmente rende
mais do que `shadowMap` e custa nada.

---

## 8. Movimento e controles

| Plataforma | Andar | Olhar |
|---|---|---|
| Desktop | WASD / setas, `Shift` corre | Pointer Lock no clique; `Esc` solta |
| Celular | Joystick virtual, canto inferior esquerdo | Arrastar na metade direita da tela |

- Altura dos olhos: 1,62 m (a do Minecraft, e funciona bem).
- Velocidade: 3,2 m/s; correndo 5,4 m/s.
- `requestAnimationFrame` com delta limitado (`Math.min(dt, .05)`) — ao voltar de uma aba
  em segundo plano, um delta gigante teleporta o jogador para fora do mapa.
- Sem gravidade nem salto. A ilha central da Torre é alcançada por degraus de 0,25 m.

### Três modos (teclas E, R, T)

1. **Livre** — anda e lê os cartões ao se aproximar (raio 2,2 m).
   `E` fixa o cartão na tela para ler com calma.
2. **`R` Percurso** — mostra uma seta-bússola apontando para a próxima parada na ordem,
   um halo pulsante no alvo, uma fita dourada no piso e os números das paradas no chão.
   É o modo de aprender o caminho.
3. **`T` Teste** — esconde âncoras e fatos; mostra só a escultura e o número.
   Botão "Revelar" libera o texto. É o modo de recuperação ativa, que é o que realmente estuda.

### Cartão de conteúdo
Painel HTML sobreposto (não 3D), com: título da parada, **imagem mental** em itálico,
**âncoras** (par: o que você vê → o que significa) e **fatos**. Fundo semitransparente escuro,
largura máxima 520 px, no celular ocupa a largura toda na parte de baixo.

---

## 9. Orçamento de desempenho

| Item | Teto |
|---|---|
| Draw calls | < 400 |
| Triângulos | < 180 mil |
| Luzes pontuais | 8 |
| Texturas distintas | 16 |
| Tempo até a primeira imagem | < 2,5 s no celular |

Técnicas obrigatórias:
- `InstancedMesh` para todo bloco repetido (piso, parede, cada cor de escultura).
- `THREE.BufferGeometryUtils.mergeBufferGeometries` para a casca de cada sala, se disponível no r128;
  se não estiver, uma `InstancedMesh` por material por sala.
- **Nunca** um `Mesh` por bloco. Um piso de 13 × 12 são 156 blocos; seis salas e dois
  corredores passam de 2.000 só de piso.
- Faces internas do piso e do teto: `side: THREE.FrontSide`.

---

## 10. Verificação — o que testar antes de dizer "pronto"

Esta seção existe porque a versão anterior deste palácio foi entregue **sem** ela e as figuras
saíram irreconhecíveis. Não pule.

### a) Harness em Node, sem WebGL
Crie `testes/harness.js` que carrega o `index.html`, extrai os blocos `SALAS`, `VOX` e as
funções de geometria por fatiamento de string, mocka `THREE` e o DOM, e afirma:

- [ ] exatamente **50** paradas
- [ ] chave `k` única em todas; nenhuma repetida
- [ ] toda parada tem entrada em `VOX` e em `ICO`
- [ ] `l1 ≤ 22` e `l2 ≤ 30` caracteres em todas
- [ ] nenhuma parada encostada em parede: `empurra(p)` desloca < 0,02 m
- [ ] nenhum par de paradas a menos de **3,0 m** uma da outra (loci confundíveis quebram o método)
- [ ] cada parada está dentro da sala que declara (`salaPorPos(p) === sala.id`)
- [ ] simulando 4 s de caminhada reta a partir de cada porta, o jogador **entra** na sala
- [ ] a ordem do percurso não faz o jogador atravessar parede

Saída esperada: `salas 6 | paradas 50 | paredes N — TODOS OS TESTES PASSARAM`.

### b) Teste de silhueta, com imagem de verdade
Gere `testes/silhuetas.html`, que importa `VOX` do `index.html` e renderiza as 50 esculturas
em grade, **duas vezes**: uma em 256 px (conferência de detalhe) e outra em **64 px, preto sobre
branco** (conferência de silhueta). Tire a captura com Chrome headless:

```bash
google-chrome --headless --disable-gpu --screenshot=/tmp/sil.png \
  --window-size=1600,2400 --virtual-time-budget=8000 testes/silhuetas.html
```

Depois **abra a imagem e olhe**. Para cada figura, responda: "o que é isto?" sem consultar a
legenda. Toda figura que você não acertar de primeira volta para a prancheta.
Figura irreconhecível é defeito de requisito, não questão de gosto.

### c) Travessia completa
Script que percorre o caminho das 50 paradas na ordem e confirma que nenhuma fica
inalcançável e que o jogador não vaza do mapa.

---

## 11. Ordem de construção (pare ao fim de cada etapa)

1. **Esqueleto** — HTML, Three.js, céu, piso infinito, câmera em primeira pessoa, WASD,
   Pointer Lock. Nada mais. *Conferir: anda e olha, 60 fps.*
2. **Materiais** — as 14 texturas procedurais com `NearestFilter`, numa parede de amostra.
3. **Mundo** — as 6 salas com suas formas, corredores, portas, vestíbulos, teto.
   Segmentos de colisão e a função `empurra` em 3 passadas. *Conferir: não atravessa parede,
   não encrava em canto.*
4. **Iluminação** — hemisfério + direcional + 8 pontuais. *Conferir no celular: a tela não fica preta.*
5. **Motor de esculturas** — `VOX`, `construirVox`, `InstancedMesh`, e **três** figuras-piloto
   de dificuldade crescente: `chama` (fácil), `forca` (média), `balanca129` (difícil, quatro pratos).
   Rode já o teste de silhueta nessas três. *Se as três passarem, o método está validado;
   se não, corrija o método antes de desenhar as outras 47.*
6. **Placas e cartões** — billboard de legenda + painel HTML de conteúdo + detecção de proximidade.
7. **As 47 esculturas restantes** — em lotes de 8, rodando o teste de silhueta a cada lote.
8. **Modos** — percurso (seta, halo, fita, números no piso) e teste (ocultar/revelar).
9. **Controles de toque** — joystick e arrastar-para-olhar. *Conferir no celular de verdade.*
10. **Verificação completa** — harness + silhuetas + travessia. Só então publicar.

---

# PARTE B — ROTEIRO COMPLETO DO PALÁCIO

**Como ler cada parada.** `chave` é o identificador em `SALAS`, `VOX` e `ICO`.
`pos` é a coordenada local dentro da sala, em metros (a global é `centro da sala + pos`).
**Escultura** é o requisito de silhueta — o que a pilha de blocos tem de ser lida como,
sem legenda. **Imagem mental** é o texto que o cartão mostra: é mnemônica, não descrição
de modelagem. **Âncoras** são os pares *vejo isto → significa aquilo*; é a parte que faz o
palácio funcionar e precisa ir no cartão palavra por palavra. **Fatos** é o conteúdo cobrado.

> Observação sobre as cores: os valores `#rrggbb` são a cor-tema da parada — moldura da placa,
> disco do número e halo do modo percurso. A escultura usa a paleta própria do `VOX`.

---

## SALA I · Torre do Relógio — Cronotanatognose
**Centro (−40, −20) · círculo r = 13 · porta em (−40, −7) · luz âmbar `#ffd49a`**

*Lema do cartão de entrada:* "Você dá uma volta completa: a borda é o tempo, a ilha do centro são os conceitos."

A borda do círculo é uma linha do tempo. As seis primeiras paradas ficam **em círculo, na ordem
do relógio**, e o jogador necessariamente as encontra em sequência. As três últimas ficam numa
**ilha elevada em degraus** no centro — fisicamente separadas porque são conceitos, não horários.
Essa separação é o que impede o aluno de confundir "fenômeno" com "faixa de tempo".

#### 1 · O queixo acorrentado
`queixo` · pos (−4,5 / 7,8) · `#d9b779` · legenda **queixo travado** / *2–4 h*

**Escultura:** manequim esquemático pendurado de pé; uma **corrente grossa de 2 blocos** envolve
só o queixo e a nuca; braços e pernas pendem soltos, visivelmente moles (desalinhados do corpo).
Uma mancha roxa de 3 blocos no dorso. A leitura à distância é *"preso pela cabeça, solto no resto"*.

**Imagem mental:** entrando à direita, um manequim pendurado tem apenas o queixo e a nuca presos
por uma corrente enferrujada — os braços e as pernas balançam soltos. Você aperta a mancha roxa
do dorso dele e a mancha *foge do seu dedo*.

**Âncoras:**
- corrente só no queixo e na nuca → rigidez começa na mandíbula e na nuca
- braços e pernas soltos → ainda não alcançou os membros
- mancha que foge do dedo → livor móvel à digitopressão

**Fatos:**
- **2 a 4 horas.** Rigidez cadavérica de progressão **descendente**: mandíbula e nuca primeiro.
- Livores apenas esboçados e ainda deslocáveis.
- Nenhum sinal de putrefação.

#### 2 · Os braços de ferro
`bracos` · pos (−9 / 0) · `#c9a86a` · legenda **braços duros** / *4–6 h*

**Escultura:** o mesmo manequim, agora com os dois braços **na horizontal, retos, em bloco contínuo**
(como canos); pernas ainda pendentes e tortas. Mancha dorsal mais escura e maior.
Contraste de pose com a parada 1 é a informação.

**Imagem mental:** na segunda parada o mesmo manequim já ergueu os dois braços na horizontal,
rígidos como canos, enquanto as pernas ainda pendem. As manchas do dorso escureceram e agora só
cedem um pouco quando você insiste.

**Âncoras:**
- braços erguidos e duros → rigidez alcançou os membros superiores
- pernas ainda moles → ainda não chegou aos inferiores
- manchas que já resistem → livores acentuados, começando a fixar

**Fatos:**
- **4 a 6 horas.** Rigidez nos membros superiores, além da nuca e da mandíbula.
- Livores acentuados, em fixação.
- Abdome ainda sem qualquer coloração esverdeada.

#### 3 · A estátua de mármore
`estatua` · pos (−4,5 / −7,8) · `#d4cec4` · legenda **estátua inteira** / *8–16 h*

**Escultura:** a mesma figura virada **estátua branca sobre pedestal**, tudo em blocos claros,
membros todos retos e simétricos, dedos incluídos (mãos em bloco único aberto). Ventre em branco
puro — **nenhum bloco verde**, e isso é o detalhe decisivo.

**Imagem mental:** no ponto mais alto da volta, o manequim virou estátua de mármore: inteiro duro,
dedos inclusive. As manchas do dorso secaram como tinta a óleo — você empurra com o polegar e nada
acontece. O ventre continua branco, limpo.

**Âncoras:**
- estátua inteira → rigidez generalizada
- tinta seca que não cede → livores fixos
- ventre branco → ainda sem mancha verde; é o detalhe que separa desta da próxima parada

**Fatos:**
- **8 a 16 horas.** Rigidez generalizada e livores **fixos**.
- **Sem** mancha verde abdominal.
- Esse conjunto — tudo duro, tudo fixo, ventre limpo — é a assinatura da faixa.

#### 4 · O isqueiro que só faz faísca
`isqueiro` · pos (4,5 / −7,8) · `#7fa86a` · legenda **só faísca** / *16–24 h*

**Escultura:** a estátua com um **círculo verde de 2 blocos de diâmetro** no ventre (do tamanho de
uma moeda, e só) e, ao lado, um **isqueiro grande com três riscos amarelos de faísca e nenhuma chama**.
A ausência de chama é o que se tem de ver.

**Imagem mental:** alguém tenta acender um isqueiro sobre o ventre da estátua, onde apareceu uma
mancha verde do tamanho de uma moeda. O isqueiro faz faísca, faísca, faísca — e nada pega.

**Âncoras:**
- mancha do tamanho de uma moeda → esboço da mancha verde abdominal
- faísca que não pega → gases ainda não inflamáveis
- estátua ainda dura → rigidez generalizada, livores fixos

**Fatos:**
- **16 a 24 horas.** Rigidez generalizada + livores fixos + **esboço** da mancha verde.
- Gases de putrefação **não inflamáveis**.
- A mancha verde costuma começar no abdome e se espalhar a partir dali.

#### 5 · O ventre que amolece
`ventre` · pos (9 / 0) · `#6f9a58` · legenda **ventre amolece** / *24–48 h*

**Escultura:** abdome inteiro verde, escorrendo para os flancos; **um braço dobrado para baixo**,
em curva, destoando do resto do corpo ainda reto. A curva do braço é o sinal.

**Imagem mental:** a mancha verde já tomou todo o abdome e escorre para os flancos. A estátua começa
a ceder: o braço que estava duro agora dobra sozinho, devagar, como cera ao sol.

**Âncoras:**
- verde em todo o abdome → mancha verde já instalada
- braço que dobra sozinho → início da flacidez secundária; a rigidez se desfaz

**Fatos:**
- **24 a 48 horas.** Mancha verde presente e **início da flacidez**.
- A rigidez cadavérica se instala e depois se desfaz: flacidez primária → rigidez → flacidez secundária.

#### 6 · A chama azul
`chama` · pos (4,5 / 7,8) · `#5aa6d8` · legenda **chama azul** / *48–72 h*

**Escultura:** ventre todo verde e, acima dele, uma **chama azul de 5 blocos de altura**, bem
destacada. Atrás, o número **72** desenhado em blocos azul-claros (dígitos de 5 × 3 blocos).
O número é parte da figura, não só da placa.

**Imagem mental:** na última parada da volta, o mesmo isqueiro finalmente pega: uma chama azul salta
sobre o ventre completamente verde e desenha no ar o número 72.

**Âncoras:**
- a chama que enfim acende → gases agora inflamáveis
- o número 72 no ar → 48 a 72 horas

**Fatos:**
- **48 a 72 horas.** Mancha verde estendida e gases **inflamáveis**.
- 72 a 96 h: fundo de olho irreconhecível. Mais de 5 dias: perda de partes moles e fauna cadavérica.
- Mais de 2 anos: esqueletização.
- **Toda a volta é aproximada:** temperatura ambiente, massa corporal, vestes e causa da morte
  deslocam os prazos. Não existe hora exata da morte.

#### 7 · Ilha central · as duas poças
`poças` · pos (0 / −3,6) · `#8e4a5c` · legenda **duas poças** / *aperta: some ou não*

**Escultura:** na ilha elevada, **duas poças vermelho-escuras lado a lado**: a da esquerda é lisa e
brilhante (bloco de "vidro" vermelho), a da direita está **embebida num tapete** de blocos de tecido.
Sobre elas, uma mangueira de 1 bloco com um jato. Ler: *duas poças, uma por cima, uma por dentro*.

**Imagem mental:** no centro da torre há uma ilha elevada com duas poças de vinho no chão. Você pisa
na primeira e ela escorre para longe do pé. Pisa na segunda e ela não se move — está dentro do tapete.
Uma mangueira lava as duas: só a primeira some.

**Âncoras:**
- poça que escorre do pé → hipóstase: sangue dentro do vaso, desloca-se à digitopressão
- poça presa no tapete → equimose: sangue infiltrado nas malhas do tecido
- a que resiste à mangueira → não sai à lavagem, logo é reação vital

**Fatos:**
- **Hipóstase:** fenômeno passivo; cessada a circulação, o sangue desce às regiões de declive pela
  gravidade e permanece **dentro** dos vasos. Empalidece à digitopressão enquanto não se fixa.
- **Equimose:** ruptura vascular com sangue **infiltrado**. Não se desloca, não sai à lavagem,
  infiltra os planos profundos.
- A equimose é **reação vital** — prova de que a lesão ocorreu em vida. A hipóstase, não.
- Armadilha clássica: hipóstase em área de declive **simula** equimose. Resolve-se pela
  digitopressão e pela incisão.

#### 8 · Ilha central · a vitrine dos quatro conservados
`vitrine` · pos (−3,1 / 1,8) · `#cbb08a` · legenda **sabão · múmia** / *couro · gesso*

**Escultura:** uma **estante de quatro nichos** (2 × 2) em moldura de madeira, cada nicho com um
objeto inconfundível e de cor distinta: **barra de sabão** branca retangular; **múmia** enfaixada
em tiras bege; **bolsa de couro marrom dentro de uma lata cinza**; **estatueta de gesso branco com
um feto rosa dentro**. Quatro nichos, quatro cores: é o que se vê de longe.

**Imagem mental:** na mesma ilha, uma vitrine de quatro nichos, cada um com um rosto humano: uma
barra de sabão, uma múmia, uma bolsa de couro dentro de uma lata de zinco e uma estatueta de gesso
com um feto dentro.

**Âncoras:**
- barra de sabão → saponificação (adipocera)
- múmia → mumificação
- couro na lata de zinco → corificação (ataúde metálico)
- gesso com feto → calcificação (feto retido)

**Fatos:**
- **Saponificação:** adipocera por hidrólise das gorduras em meio **úmido e anaeróbio**, com ação
  bacteriana, a partir de 3 a 4 meses. Aspecto de cera ou sabão, quebradiço. Preserva lesões —
  grande valor pericial.
- **Mumificação:** o oposto — desidratação rápida em ambiente **quente, seco e arejado**.
- **Corificação:** ataúdes metálicos lacrados, sobretudo de zinco; os tecidos ganham aspecto de couro.
- **Calcificação:** deposição de sais; descrita sobretudo em **fetos retidos**.
- Todos são fenômenos **conservativos**: interrompem ou substituem a putrefação.

#### 9 · Ilha central · a esteira dos quatro períodos
`esteira` · pos (3,1 / 1,8) · `#6b7a52` · legenda **4 períodos** / *autólise sem bactéria*

**Escultura:** uma **esteira transportadora** com quatro estações, e em cada uma o mesmo corpo em
estado diferente: **verde**, **inflado como balão** (volume visivelmente maior), **derretendo**
(blocos escorrendo para baixo) e **esqueleto branco**. No peito da primeira figura, uma
**fabriqueta minúscula com chaminé**, de 3 blocos.

**Imagem mental:** do outro lado da ilha, uma esteira de quatro estações leva um corpo: pinta de
verde, infla como balão, derrete e sai esqueleto. Dentro do peito, uma fabriqueta minúscula já
estava trabalhando sozinha antes de qualquer bactéria chegar.

**Âncoras:**
- verde → balão → derrete → esqueleto = cromático, gasoso, coliquativo, esqueletização
- fabriqueta dentro do peito → autólise: enzimas dos próprios lisossomos, sem bactérias

**Fatos:**
- **Autólise:** destruição celular pelas enzimas dos **próprios lisossomos**, **sem** participação
  bacteriana.
- **Putrefação** (bacteriana), quatro períodos nesta ordem: **cromático → gasoso → coliquativo →
  esqueletização**.
- A liquefação das partes moles é do período **coliquativo** — não do gasoso.
- **Maceração:** amolecimento em meio líquido (feto retido, corpo submerso) — não é putrefação
  acelerada por calor.

---

## SALA II · Corredor do Protocolo — Morte encefálica (Resolução CFM nº 2.173/2017)
**Centro (0, −25) · corredor 7 × 21 · porta em (0, −7) · luz azul-clara `#bfe6ff`**

*Lema:* "Oito portões em fila: a ordem em que você anda é a ordem da norma."

Oito **portões físicos** atravessam o corredor, alternando lado (esquerda, direita, esquerda…),
cada um com uma passagem estreita de 2 blocos. O jogador **não pode pular etapa**: a arquitetura
impõe a sequência. O corredor em declive suave de 1 bloco a cada portão reforça a sensação de
avanço irreversível.

#### 10 · Portão 1 · o cérebro com etiqueta e o frasco riscado
`portao1` · pos (−3,6 / 16) · `#9fb6c4` · legenda **causa conhecida** / *sem droga que confunda*

**Escultura:** um **cérebro de vidro translúcido** (blocos azul-claros semitransparentes) com uma
**etiqueta amarela pendurada** por um fio, ao lado de um **frasco de remédio com um X vermelho
grande por cima**. Duas peças, encaixadas num portão que só abre com as duas.

**Imagem mental:** o primeiro portão só abre com duas peças encaixadas: um cérebro de vidro com
etiqueta de diagnóstico colada e um frasco de sedativo com um X vermelho por cima.

**Âncoras:**
- etiqueta colada no cérebro → lesão de causa conhecida e irreversível
- frasco riscado → ausência de fatores tratáveis que confundam o diagnóstico

**Fatos:**
- Pré-requisitos para **iniciar** o protocolo (art. 1º).
- Lesão encefálica de causa **conhecida, irreversível** e capaz de causar morte encefálica.
- Ausência de **fatores tratáveis** confundidores (sedativos, distúrbios metabólicos, bloqueadores).
- O protocolo começa em quem tem **coma não perceptivo**, ausência de reatividade supraespinhal e
  **apneia persistente**.

#### 11 · Portão 2 · a ampulheta de duas gargantas
`ampulheta2` · pos (3,6 / 11) · `#e0c89a` · legenda **6 h de observação** / *24 h se hipóxico*

**Escultura:** uma **ampulheta de 12 blocos de altura** com **duas gargantas visíveis**: a de cima
estreita, com **6** em blocos; a de baixo larga, com **24**. Ao lado, uma placa com uma onda e um
coração parado, acesa só quando a causa é hipóxico-isquêmica.

**Imagem mental:** uma ampulheta enorme com duas gargantas: a estreita marca 6, a larga marca 24.
A larga só é usada quando a placa ao lado acende a palavra "afogou/parou".

**Âncoras:**
- garganta do 6 → 6 horas de tratamento e observação
- garganta do 24 → 24 horas quando a causa é encefalopatia hipóxico-isquêmica

**Fatos:**
- Observação hospitalar mínima de **6 horas**.
- Se a causa primária for **encefalopatia hipóxico-isquêmica** (pós-parada, afogamento, asfixia):
  **24 horas**.
- Cuidado para não confundir este prazo com o intervalo entre os dois exames clínicos (portão 7).

#### 12 · Portão 3 · o painel 35 · 94 · 100
`painel` · pos (−3,6 / 6) · `#7fd4a0` · legenda **35 · 94 · 100** / *temp · sat · PAS*

**Escultura:** **três mostradores circulares gigantes** em fila, de 5 blocos de diâmetro cada, com
os números **35**, **94** e **100** em blocos verdes brilhantes, e acima de cada um o aparelho
correspondente em miniatura: termômetro, oxímetro de dedo, manguito de pressão.

**Imagem mental:** três mostradores gigantes piscando verde: 35 num termômetro, 94 num oxímetro,
100 num manômetro. Se um só cai, o corredor inteiro apaga e você é obrigado a voltar.

**Âncoras:**
- termômetro 35 → temperatura corporal acima de 35 °C
- oxímetro 94 → saturação arterial acima de 94%
- manômetro 100 → PAS ≥ 100 mmHg (ou PAM ≥ 60) no adulto

**Fatos:**
- Estabilidade exigida antes do exame clínico: temperatura (esofagiana, vesical ou retal) **> 35 °C**,
  saturação **> 94%**, **PAS ≥ 100 mmHg** ou **PAM ≥ 60 mmHg** no adulto.
- Para menores de 16 anos a resolução traz tabela própria de pressão por faixa etária.
- Hipotermia e hipotensão **suspendem o início**; são corrigíveis e não excluem o diagnóstico.

#### 13 · Portão 4 · as cinco lanternas queimadas
`lanternas` · pos (3,6 / 1) · `#5c6672` · legenda **5 reflexos** / *todos apagados*

**Escultura:** **cinco lanternas penduradas em fila**, todas **escuras** (blocos cinza, nenhum bloco
emissivo), e sob cada uma o instrumento do reflexo: foco de luz, chumaço de algodão, uma cabeça com
flecha de rotação, uma seringa com água e gelo, uma sonda. Cinco objetos, nenhum aceso.

**Imagem mental:** cinco lanternas penduradas em fila. Você acende a primeira na pupila, encosta
algodão na segunda, gira a cabeça da terceira, joga água gelada na quarta e enfia uma sonda na
quinta. Nenhuma responde.

**Âncoras:**
- luz na pupila → reflexo fotomotor
- algodão no olho → córneo-palpebral
- girar a cabeça → oculocefálico
- água gelada no ouvido → vestíbulo-calórico
- sonda na traqueia → reflexo de tosse

**Fatos:**
- Ausência de reatividade supraespinhal pelos **cinco reflexos de tronco**.
- Somada ao **coma não perceptivo**: nenhuma resposta motora supraespinhal ao estímulo doloroso
  intenso (supraorbitário, trapézio, leito ungueal dos quatro membros).
- Vestíbulo-calórico: 50 a 100 mL de água fria, cabeça a 30°, otoscopia prévia, 3 minutos entre os lados.
- Oculocefálico: não realizar com suspeita de lesão cervical.

#### 14 · Portão 5 · a marionete e a estátua atrás da corda
`marionete` · pos (−3,6 / −4) · `#d0a0c0` · legenda **medular passa** / *descerebração invalida*

**Escultura:** à frente, uma **marionete com os fios cortados** (fios pendentes, soltos no ar) em
pose de movimento — ombros erguidos, tronco flexionado. Atrás de uma **corda vermelha de museu**,
uma segunda boneca **travada com os braços estendidos e girados para dentro**. O contraste de pose
entre as duas é a informação inteira.

**Imagem mental:** uma marionete com os fios cortados continua dançando: ergue os ombros, flexiona
o tronco, sua. Ela passa. Atrás de uma corda vermelha, uma segunda boneca está travada com os braços
estendidos e girados — essa cancela tudo.

**Âncoras:**
- marionete sem fios que ainda dança → movimentos de origem medular: não invalidam
- boneca travada atrás da corda vermelha → descerebração ou decorticação: invalidam

**Fatos:**
- **Não invalidam** a determinação: reflexos tendinosos profundos, movimentos de membros, opistótono,
  flexão do tronco, adução e elevação de ombros, sudorese, rubor, taquicardia — espontâneos ou ao
  estímulo. São **atividade medular**.
- **Invalidam**: atitude de **descerebração** ou **decorticação**, que traduzem atividade supraespinhal.
- Explicar esses movimentos à família faz parte do dever de esclarecimento.

#### 15 · Portão 6 · o cilindro 55
`cilindro55` · pos (3,6 / −9) · `#d98b5a` · legenda **teste de apneia** / *PaCO₂ > 55*

**Escultura:** um **cilindro de gás** de 10 blocos de altura, com **55** pintado em vermelho no
corpo e um manômetro cujo ponteiro passa do 55. Ao lado, um tórax em blocos, **plano, sem elevação**,
e um **carimbo** com a palavra POSITIVO caindo sobre ele.

**Imagem mental:** um cilindro de gás com 55 pintado em vermelho. O ponteiro sobe até 61 e o peito
do manequim não se move uma única vez. Um carimbo cai sozinho: POSITIVO.

**Âncoras:**
- o número 55 → PaCO₂ final acima de 55 mmHg
- peito imóvel → ausência de movimentos respiratórios
- carimbo POSITIVO → teste positivo significa que há apneia

**Fatos:**
- **Teste de apneia:** FiO₂ 100% por ≥ 10 min, desconectar a ventilação, O₂ por cateter intratraqueal
  (6 L/min), tubo T (12 L/min) ou CPAP; observar 8 a 10 minutos.
- **Positivo** (há apneia): PaCO₂ final **> 55 mmHg** sem movimentos respiratórios — vale mesmo se
  interrompido antes dos 10 min.
- **Negativo:** qualquer movimento respiratório, ainda que débil, com qualquer PaCO₂.
  **Inconclusivo:** sem movimentos e PaCO₂ < 55.
- Realizado **uma única vez**, por um dos médicos do exame clínico; sendo positivo, não se repete.

#### 16 · Portão 7 · os três monitores
`monitores` · pos (−3,6 / −14) · `#6fa8dc` · legenda **exame complementar** / *perfusão/metab./elétrica*

**Escultura:** **três telas de monitor** lado a lado, em molduras de metal, cada uma com um desenho
em blocos: um **rio seco** (leito marrom rachado, sem azul), uma **fornalha apagada** (boca negra,
sem chama) e uma **linha reta** horizontal verde atravessando a tela.

**Imagem mental:** três monitores lado a lado: um mostra um rio seco, outro uma fornalha apagada,
o terceiro uma linha reta. Basta um deles acender para o portão abrir — mas o portão é obrigatório.

**Âncoras:**
- rio seco → ausência de perfusão sanguínea encefálica
- fornalha apagada → ausência de atividade metabólica
- linha reta → ausência de atividade elétrica

**Fatos:**
- **Exame complementar obrigatório** no Brasil — comprova **uma** das três condições.
- Perfusão: angiografia cerebral, Doppler transcraniano. Metabolismo: cintilografia, SPECT.
  Elétrica: EEG (silêncio elétrico, potencial < 2 µV).
- Escolhido conforme a situação clínica e a disponibilidade local; laudado por **especialista no método**.
- Ele **acrescenta-se** aos exames clínicos — nunca substitui nenhum deles.

#### 17 · Portão 8 · dois crachás, a ampulheta de três bocas e a catraca
`crachas` · pos (3,6 / −19) · `#e0d2a8` · legenda **2 médicos** / *1 h · 12 h · 24 h*

**Escultura:** **dois crachás grandes de cores diferentes** (um azul, um verde) pendurados em dois
bonecos distintos; entre eles, uma **ampulheta de três bocas** com **1**, **12** e **24**; à frente,
uma **catraca de metal travada** barrando um boneco com uma **caixa térmica** marcada com uma cruz.
Ao fundo do corredor, um **relógio de parede com um carimbo na testa**.

**Imagem mental:** dois médicos de crachás diferentes se revezam diante de uma ampulheta de três
bocas — 1, 12 e 24. Um cirurgião com uma caixa térmica de transplante tenta passar e a catraca o
trava. No fim do corredor, um carimbo bate a hora na testa do relógio.

**Âncoras:**
- dois crachás diferentes → dois exames clínicos, por médicos diferentes
- bocas 1 / 12 / 24 → intervalos por faixa etária
- catraca que trava o cirurgião → nenhum examinador na equipe de remoção e transplante
- carimbo na testa do relógio → hora do óbito é a conclusão do último procedimento

**Fatos:**
- **Dois exames clínicos**, por **médicos diferentes**, especificamente capacitados (≥ 1 ano com
  pacientes em coma e ≥ 10 determinações, ou curso de capacitação).
- Intervalo mínimo: **1 h** acima de 2 anos · **12 h** de 2 a 24 meses incompletos · **24 h** de
  7 dias a 2 meses incompletos.
- Nenhum examinador pode integrar a equipe de remoção e transplante (Lei nº 9.434/1997, art. 3º).
- **Hora do óbito** = conclusão do último procedimento, e não a parada cardíaca. Causa **natural** →
  DO pelo assistente; causa **externa** → pelo **legista**.
- Em não doador, suspender o suporte é lícito e ético (Resolução CFM nº 1.826/2007).

---

## SALA III · Cruz das Quatro Mortes — Eutanásia, distanásia, mistanásia, ortotanásia e DAV
**Centro (40, −20) · cruz com braços de 12 e largura 5 · porta em (40, −7) · luz âmbar `#ffc98a`**

*Lema:* "Quem adianta e quem prolonga ficam em braços opostos; no cruzamento, o tempo certo."

A planta é o argumento. **Eutanásia** e **distanásia** ficam nas pontas de braços **opostos**,
alinhadas, uma visível da outra — conceitos espelhados. **Ortotanásia** fica exatamente no
**cruzamento**, ponto de equilíbrio. E a **mistanásia** fica **fora da cruz**, no corredor de
entrada: ela não é uma decisão à beira do leito, é o sistema falhando antes de qualquer decisão.
O jogador atravessa a mistanásia sem escolher — como na vida real.

#### 18 · A fila do corredor vazio
`fila` · pos (0 / 11) · `#6b6f76` · legenda **MISTANÁSIA** / *morre na fila*

**Escultura:** **fileira de cadeiras de plástico vazias** (6 cadeiras em blocos azul-acinzentados),
sob uma **lâmpada fria piscando**. Na última cadeira, um **cobertor caído** no chão e um
**papel amassado com o número 87**. Ninguém sentado: o vazio é a figura.

**Imagem mental:** antes de entrar na cruz você atravessa uma fila de cadeiras de plástico vazias,
sob uma luz fria piscando. Na última cadeira há um cobertor caído e uma senha de atendimento
amassada, número 87, nunca chamada.

**Âncoras:**
- a fila que você atravessa *antes* da sala → a mistanásia acontece fora da decisão clínica: é a estrutura
- senha nunca chamada → morte por omissão, negligência, falta de leito e de insumo

**Fatos:**
- **Mistanásia:** morte miserável, precoce e **evitável**.
- Decorre de **omissão, negligência** ou insuficiência do atendimento em saúde — não de uma decisão
  à beira do leito.
- É a morte social: nem abreviada por alguém, nem prolongada por máquina. Simplesmente desassistida.
- Por isso ela mora no corredor, e não dentro da sala: o problema é o sistema.

#### 19 · Braço oeste · a mão que adianta o ponteiro
`maoAdianta` · pos (−10 / 0) · `#cf7070` · legenda **EUTANÁSIA** / *adianta o relógio*

**Escultura:** uma **mão gigante em blocos** (5 blocos de palma) girando o **ponteiro de um relógio
grande no sentido horário**, com setas de movimento. Sobre a mão, um **lacre vermelho com 41**.
Deve ficar **visível desde o braço oposto**: alinhe no eixo da cruz.

**Imagem mental:** no braço esquerdo da cruz, uma mão enorme gira o ponteiro de um relógio para a
frente, forçando a hora. Sobre ela, um lacre vermelho estampado "41".

**Âncoras:**
- mão que adianta o ponteiro → abreviar deliberadamente a vida
- lacre 41 → art. 41 do Código de Ética Médica
- braço *oposto* ao do engenho → eutanásia e distanásia são extremos contrários

**Fatos:**
- **Eutanásia:** abreviar deliberadamente a vida do paciente, ainda que por compaixão.
- Vedada pelo **art. 41 do Código de Ética Médica**; sem previsão de licitude no direito brasileiro.
- Não se confunde com **suspender tratamento fútil**, que é conduta lícita.

#### 20 · Braço leste · a máquina que estica
`maquinaEstica` · pos (10 / 0) · `#8f9aa6` · legenda **DISTANÁSIA** / *estica o morrer*

**Escultura:** um **engenho de molas e roldanas** que **estica uma figura como elástico** — corpo
alongado, visivelmente mais comprido que o normal, preso por correntes nas duas pontas. Mostrador
com **+3 dias**. A maca **sem paciente** ao lado é parte da figura.

**Imagem mental:** no braço direito, exatamente de frente para a mão, um engenho de molas e roldanas
estica o paciente como elástico, arrancando mais alguns centímetros de vida biológica. O mostrador
marca "+3 dias" e o paciente não está ali.

**Âncoras:**
- engenho que estica → prolongar o processo de morrer
- "+3 dias" sem o paciente presente → sustenta a vida biológica, não a pessoa
- estar de frente para a mão → é o extremo oposto da eutanásia

**Fatos:**
- **Distanásia** (obstinação ou futilidade terapêutica): prolongar o processo de morrer com
  intervenções que não trazem benefício.
- Sustenta a vida **biológica** sem qualidade nem dignidade.
- Também é conduta a evitar: o erro espelhado da eutanásia.

#### 21 · O cruzamento · o relógio no compasso certo
`relogioCerto` · pos (0 / 0) · `#7fd4a0` · legenda **ORTOTANÁSIA** / *no tempo certo*

**Escultura:** um **relógio de pêndulo de corpo inteiro** (12 blocos de altura), pêndulo visível e
centrado, **sem mão nenhuma tocando nele**. Sobre a base, um **cobertor dobrado** e um **copo d'água**.
Fica no ponto exato onde os quatro braços se cruzam.

**Imagem mental:** no centro exato da cruz, um relógio de pêndulo bate no compasso natural: ninguém
o adianta, ninguém o segura. Sobre ele há um cobertor macio e um copo d'água ao alcance da mão.

**Âncoras:**
- pêndulo no próprio ritmo → ortotanásia: a morte no tempo certo
- cobertor macio → kalotanásia: o morrer suave, com conforto
- estar no cruzamento → é o ponto de equilíbrio entre os dois braços

**Fatos:**
- **Ortotanásia:** permitir que o processo de morrer siga seu curso, sem abreviar nem prolongar
  artificialmente.
- Supõe suspensão de intervenções fúteis **somada** a cuidados paliativos integrais.
- **Kalotanásia:** a mesma ideia com ênfase no morrer **suave**, com o máximo de conforto possível.
- É o oposto tanto da eutanásia quanto da distanásia — daí ocupar o centro.

#### 22 · A mão que segura o copo
`maoSegura` · pos (−3,5 / −5) · `#f0c27b` · legenda **cuidados paliativos** / *não solta*

**Escultura:** uma **mão aberta, palma para cima**, sustentando um **copo d'água** azul. Em volta,
**quatro vultos** em blocos de cores diferentes, baixos e simples (jaleco branco, uniforme azul,
roupa civil, batina escura). A mão não tem instrumento nenhum — isso é o ponto.

**Imagem mental:** saindo do centro para o fundo, uma mão aberta sustenta um copo d'água. Ela não
cura ninguém — e não solta. Ao redor, quatro vultos: um médico, uma enfermeira, uma psicóloga e um capelão.

**Âncoras:**
- a mão que não solta → o cuidado não cessa quando o tratamento curativo cessa
- os quatro vultos → equipe multiprofissional
- o copo d'água → alívio do sofrimento, conforto

**Fatos:**
- **Cuidados paliativos:** abordagem que melhora a qualidade de vida do paciente e da família diante
  de doença ameaçadora da vida.
- Prevenção e alívio do sofrimento — físico, psicossocial e espiritual.
- Equipe **multiprofissional**; não dependem de prognóstico de horas nem excluem tratamento
  modificador da doença.
- Recusar tratamento fútil nunca significa abandono: o dever de assistir permanece.

#### 23 · Braço norte · o envelope lacrado
`envelope` · pos (0 / −9) · `#e8dbb4` · legenda **DAV** / *vence a família*

**Escultura:** um **envelope branco lacrado** (8 × 5 blocos), de pé sobre um **pedestal**, dentro de
uma **redoma de vidro** que desce até a base. Mãos estendidas de dois vultos batendo na redoma, do
lado de fora. Ao lado, uma **mesa redonda vazia** com cadeiras.

**Imagem mental:** no fundo da cruz, um envelope lacrado com a letra do próprio paciente, sobre um
pedestal. Quando familiares esticam a mão para pegá-lo, uma redoma de vidro desce e os impede.
Ao lado, uma mesa redonda vazia, pronta para ser usada só se o envelope não existir.

**Âncoras:**
- a letra do próprio paciente → a vontade é dele, manifestada antes
- redoma que barra os familiares → as diretivas prevalecem sobre o desejo da família
- mesa redonda vazia → comitê de bioética: só quando não há diretivas nem representante

**Fatos:**
- **Diretivas antecipadas de vontade** — Resolução CFM nº 1.995/2012.
- **Prevalecem** sobre qualquer parecer não médico, **inclusive sobre o desejo dos familiares**.
- O médico deve **registrá-las no prontuário**; não se exige escritura pública.
- Limite: não se acolhem diretivas em desacordo com o Código de Ética Médica.
- Sem diretivas, sem representante e sem consenso familiar: **comitê de bioética** (ou comissão de
  ética / CRM).
- Atenção: a DAV rege decisões sobre o paciente **vivo**. Depois de determinada a morte encefálica,
  não é ela o fundamento.

---

## SALA IV · Câmara das Asfixias — Constrição, meio líquido, gases e compressão
**Centro (−40, 20) · sala 13 × 12 · porta em (−40, 7) · luz verde-água `#9fd8d0`**

*Lema:* "Oeste é o pescoço, o fundo é o meio, leste é o tórax — e o que é comum a todas fica no centro."

A sala é um mapa de mecanismos. **Parede oeste:** constrição do pescoço, em sequência do instrumento
ao corpo (peso do próprio corpo → força externa → mãos nuas). **Parede do fundo:** o meio
(líquido, depois gases). **Parede leste:** o tórax e as vias aéreas. **Centro:** o que é comum a
todas. O centro é o único ponto de onde se enxergam as três paredes ao mesmo tempo — por isso
é lá que ficam os sinais gerais, e não em nenhuma parede.

#### 24 · Parede oeste · a forca inclinada
`forca` · pos (−11 / −8) · `#b08968` · legenda **ENFORCAMENTO** / *oblíquo · acima · corta*

**Escultura:** uma **viga horizontal** no alto e uma **corda em diagonal nítida de 45°**, de 2 blocos
de espessura, subindo da nuca até a viga, com o **nó alto, atrás da orelha direita**. No pescoço, um
**sulco marcado que para exatamente no nó** (deixe um vão de blocos ali — a interrupção é o fato).
Do lado **esquerdo**, oposto ao nó, um **risco vermelho** na carótida. Os pés podem tocar o chão.

**Imagem mental:** na primeira parede, uma corda sobe em diagonal até a viga. O nó fica alto, atrás
da orelha direita, e a marca no pescoço se interrompe exatamente ali. Do lado esquerdo — o lado
oposto ao nó — a carótida está rasgada por dentro.

**Âncoras:**
- corda em diagonal subindo → sulco oblíquo e ascendente
- nó alto, atrás da orelha → sulco acima da cartilagem tireoide
- marca que para no nó → sulco interrompido
- rasgo do lado oposto ao nó → sinal de Amussat, contralateral

**Fatos:**
- **Enforcamento:** o laço é acionado pelo **peso do próprio corpo** — a suspensão pode ser incompleta
  (pés tocando o solo).
- Sulco **oblíquo, ascendente** em direção ao nó, **interrompido**, de profundidade **desigual**,
  **acima** da cartilagem tireoide; leito apergaminhado com laços duros.
- **Sinal de Amussat** (laceração da íntima da carótida): unilateral e **contralateral ao nó**.
- Infiltração hemorrágica no leito do sulco = reação vital, e é ela que separa o enforcamento da
  suspensão de um cadáver.

#### 25 · Parede oeste · a corda horizontal
`corda` · pos (−11 / −2) · `#8a7a62` · legenda **ESTRANGULAR** / *horizontal · abaixo*

**Escultura:** uma **corda perfeitamente horizontal** atravessando o pescoço **abaixo do pomo de
adão**, com **duas mãos puxando pelas pontas, por trás** (mãos nas extremidades da corda, não no
pescoço). O sulco é **contínuo e de espessura igual de ponta a ponta** — nenhuma interrupção.
Risco vermelho nos **dois** lados.

**Imagem mental:** ao lado, duas mãos invisíveis puxam uma corda reta, no meio do pescoço, abaixo do
pomo de adão, apertando por igual de ponta a ponta — e desta vez os dois lados da carótida estão lesados.

**Âncoras:**
- corda reta no meio do pescoço → sulco horizontal, abaixo da tireoide
- aperto igual de ponta a ponta → sulco contínuo e de profundidade uniforme
- os dois lados lesados → lesões vasculares bilaterais
- puxada por fora, não pelo peso → força externa ao corpo

**Fatos:**
- **Estrangulamento:** constrição por laço acionado por **força externa**.
- Sulco **horizontal, contínuo, de profundidade uniforme**, **abaixo** da cartilagem tireoide;
  pode haver sulcos múltiplos.
- Lesões vasculares tendem a ser **bilaterais**.
- Variante: estrangulamento **antebraquial** ("mata-leão") — que cursa **sem** sulco cervical.

#### 26 · Parede oeste · o par de luvas
`luvas` · pos (−11 / 4) · `#d8c8b8` · legenda **ESGANADURA** / *mãos · sempre homicida*

**Escultura:** **duas luvas brancas flutuando**, dedos fechados em torno de um pescoço, e
**nenhuma corda em lugar nenhum** da cena. Na pele, **meias-luas vermelhas** (blocos em arco de
2–3 blocos) marcando as unhas. A ausência de sulco é o requisito: não ponha linha nenhuma no pescoço.

**Imagem mental:** a terceira constrição não tem instrumento nenhum: um par de luvas brancas flutua
fechando um pescoço invisível, e as unhas deixam meias-luas na pele. Não há marca de corda em lugar nenhum.

**Âncoras:**
- luvas sem corda → constrição pelas mãos: não há sulco
- meias-luas na pele → estigmas ungueais
- precisa de outra pessoa → é sempre homicida

**Fatos:**
- **Esganadura:** constrição do pescoço **pelas mãos** do agressor.
- Estigmas **ungueais**, equimoses digitiformes, infiltração hemorrágica dos planos profundos.
  **Sem sulco.**
- É **sempre homicida** — ninguém a executa em si mesmo.
- A sequência desta parede vai do instrumento ao corpo: peso do corpo → força externa → mãos nuas.

#### 27 · Fundo · o aquário dos dois peixes
`aquario` · pos (−7 / 10) · `#5aa0d0` · legenda **afogado azul** / *× afogado branco*

**Escultura:** um **aquário de vidro** com **dois corpos lado a lado**. O da esquerda é **azul**,
com um **cogumelo de espuma branca saindo da boca** e **pulmões inflados** visíveis (volume maior).
O da direita é **branco-gesso**, e o tórax aberto mostra o interior **seco, sem bloco de água**.
O contraste de cor entre os dois é o que se lê de longe.

**Imagem mental:** no fundo da sala, um aquário com dois corpos. O da esquerda é azulado, com espuma
na boca e os pulmões inchados de água. O da direita é branco como gesso, e por dentro está
completamente seco — ele morreu *dentro* da água, mas não *de* água.

**Âncoras:**
- o azul com espuma → afogado azul: houve aspiração
- pulmões inchados → enfisema aquoso, sinal de Brouardel
- o branco e seco por dentro → afogado branco: morte por inibição, sem aspiração

**Fatos:**
- **Afogado azul** (verdadeiro): há aspiração. Cianose, **cogumelo de espuma**, sinal de **Brouardel**
  (enfisema aquoso subpleural), manchas de **Paltauf** (maiores que as de Tardieu), diluição do sangue,
  líquido no estômago.
- **Afogado branco:** morte dentro da água **sem aspiração** — inibição vagal, AVC, infarto.
  Palidez acentuada.
- Estar submerso **não diagnostica** afogamento: o corpo pode ter sido lançado já sem vida — questão
  central da perícia.
- Sinal de Bernt: pele anserina. Sinal de Niles: hemorragia temporal.

#### 28 · Fundo · a garagem rosada
`garagem` · pos (0 / 10) · `#e08b5a` · legenda **MONÓXIDO** / *rosa · rigidez tardia*

**Escultura:** uma **garagem fechada** (porta de blocos descendo até o chão) com um **carro** de
motor ligado (fumaça cinza no escapamento) e, dentro, um motorista com o **rosto rosa-boneca**
(blocos rosa-claro saturado — rosa artificial, não tom de pele). Braços **pendentes e moles**.
No painel, os números **200** e **240**.

**Imagem mental:** numa garagem fechada, o motor ligado pinta o rosto do motorista de rosa de boneca
— rosa bonito, não rosa de vivo. O corpo demora muito a endurecer. No painel do carro, o número 200
vira 240.

**Âncoras:**
- rosa de boneca → livores e face claros, róseos
- corpo que demora a endurecer → rigidez cadavérica tardia
- 200 → 240 no painel → afinidade 200 a 240× maior que pelo oxigênio

**Fatos:**
- **Monóxido de carbono:** afinidade da hemoglobina **200 a 240×** maior que pelo O₂ →
  **carboxiemoglobina**.
- Obstáculo à **oxigenação das hemácias** (classificação de Oscar Freire).
- Livores e face **claros e róseos**; sangue fluido e rosado; rigidez **tardia**.
- Boate Kiss: ao CO somou-se o cianeto liberado pela queima da espuma de revestimento.

#### 29 · Fundo · o frasco de amêndoas
`frasco` · pos (7 / 10) · `#9b7fd0` · legenda **CIANETO** / *amêndoas · rígido já*

**Escultura:** um **frasco aberto** com **vapor roxo** subindo em espiral e **três amêndoas** no chão
ao lado (forma oval marrom inconfundível). O corpo ao lado é **violáceo** e **completamente rígido,
reto, braços colados** — pose oposta à do motorista da garagem. Coloque as duas paradas **vizinhas**:
o contraste é o método.

**Imagem mental:** ao lado da garagem, de propósito, um frasco aberto exala amêndoas amargas.
O corpo ali é o contrário do anterior: manchas violáceas e rigidez que travou tudo em poucos minutos.

**Âncoras:**
- cheiro de amêndoas amargas → cianeto
- manchas violáceas → livores violáceos, o oposto do CO
- travou em poucos minutos → rigidez precoce e intensa

**Fatos:**
- **Cianeto / ácido cianídrico:** odor de **amêndoas amargas**, livores violáceos, rigidez cadavérica
  **precoce e intensa**, sinais gerais de asfixia.
- Par de contraste com o CO: **rosa e mole-tardio** (CO) × **violáceo e duro-precoce** (cianeto).
- Nos venenos em geral, o diagnóstico exige **identificar a substância e dosar a concentração** —
  não basta encontrar o tóxico.
- Saturnismo = chumbo. Hidrargirismo/mercurialismo = mercúrio.

#### 30 · Parede leste · a prensa de tórax
`prensa` · pos (11 / −6) · `#9aa0a8` · legenda **sufocação indireta** / *máscara de Morestin*

**Escultura:** **duas placas de concreto** prensando o peito de uma figura deitada. Acima da linha
das placas, a **cabeça e o pescoço roxos**, inflados, salpicados de **pontinhos vermelhos** —
como uma máscara de carnaval. Abaixo da linha, cor normal. A **boca e o nariz ficam livres**,
sem nada por cima: isso precisa ser visível.

**Imagem mental:** duas placas prensam o peito de um operário soterrado. A cabeça dele incha e fica
roxa acima da linha do aperto, salpicada de pontinhos vermelhos — uma máscara de carnaval. A boca e
o nariz estão livres.

**Âncoras:**
- placas no peito → compressão do tórax: restrição aos movimentos respiratórios
- cabeça roxa acima da linha → estase na veia cava superior, máscara de Morestin
- boca e nariz livres → não há obstrução das vias aéreas

**Fatos:**
- **Sufocação indireta:** restrição mecânica aos movimentos respiratórios por compressão do tórax e
  do abdome, **sem** obstrução das vias aéreas.
- Obstáculo ao retorno venoso pela **veia cava superior** → **máscara equimótica de Morestin**:
  face e pescoço congestos, cianóticos, com equimoses puntiformes.
- Típica de soterramento, multidões e acidentes com carga.

#### 31 · Parede leste · o travesseiro e o armário
`armario` · pos (11 / 2) · `#7d8a94` · legenda **sufocação direta** / *e confinamento*

**Escultura:** duas peças juntas. À esquerda, um **travesseiro branco apertado contra um rosto**
(o travesseiro cobre boca e narinas, e tem de dar para ver isso). À direita, um **armário de madeira
fechado por fora**, com **tranca visível** e **arranhões em diagonal do lado de dentro** (riscos
claros na madeira). Nenhuma outra lesão na cena.

**Imagem mental:** no canto, um travesseiro apertado contra um rosto e, ao lado, um armário de madeira
fechado por fora, com arranhões desesperados do lado de dentro e nenhuma outra lesão.

**Âncoras:**
- travesseiro no rosto → sufocação direta: oclusão de boca e narinas
- armário fechado com arranhões por dentro → confinamento: ambiente fechado, lesões apenas do desespero

**Fatos:**
- **Sufocação direta:** oclusão das aberturas respiratórias (boca, narinas) ou da glote por corpo estranho.
- **Confinamento:** consumo progressivo do oxigênio e acúmulo de CO₂ em ambiente fechado.
- No confinamento não há lesões específicas; podem existir escoriações produzidas pela própria
  tentativa de escapar.
- Soterramento: pode somar compressão + obstrução por material pulverulento nas vias aéreas.

#### 32 · Centro · o mural dos pontinhos
`mural` · pos (0 / 0) · `#8a5c6a` · legenda **sinais gerais** / *Tardieu · comum a todas*

**Escultura:** um **painel vertical** de 7 × 7 blocos **salpicado de pontinhos vermelhos** espalhados
irregularmente, como tinta sacudida. Na base, um **frasco de sangue muito escuro**, visivelmente
fluido (sem bloco de coágulo). Fica no ponto da sala de onde se veem as três paredes.

**Imagem mental:** no meio da sala, de onde se enxergam as três paredes ao mesmo tempo, um mural
salpicado de pontinhos vermelhos — como se alguém tivesse sacudido uma caneta sobre ele. Embaixo,
um frasco de sangue escuro que não coagula.

**Âncoras:**
- ficar no centro, vendo todas as paredes → os sinais gerais são comuns a todas as asfixias
- pontinhos vermelhos → manchas de Tardieu
- sangue escuro que não coagula → sangue escuro e fluido

**Fatos:**
- **Sinais gerais das asfixias:** manchas de **Tardieu** (equimoses puntiformes subpleurais,
  subepicárdicas e subconjuntivais), congestão polivisceral, sangue **escuro e fluido**, cianose de
  face, cogumelo de espuma, projeção da língua.
- Exceção: no **afogamento** há diluição do sangue.
- **Eles não dizem qual foi a modalidade.** Isso vem dos sinais **locais** (as três paredes) e das
  circunstâncias — por isso o mural fica no centro, e não em nenhuma parede.
- Os dois materiais da disciplina divergem quanto ao **sinal de Etienne-Martin** (congestão
  polivisceral × ruptura transversal da carótida): confirme com o professor qual será cobrada.

---

## SALA V · Estande de Tiro — Instrumentos e lesões por projétil
**Centro (0, 25) · corredor 7 × 21 · porta em (0, 7) · luz quente `#ffd6a0`**

*Lema:* "Aqui a planta é a resposta: quanto mais longe do alvo você anda, menos marcas sobram."

Esta sala tem a ideia mais forte do palácio: **a profundidade do corredor é a distância do tiro**.
Há **três marcas no piso** — 30 m, 3 m e 0 m (encostado) — e o alvo no fundo. Quanto mais o jogador
avança em direção ao alvo, **mais sujeira aparece** em volta do furo. O aluno não decora a tabela:
ele anda nela. Marque as linhas no piso com blocos de cor diferente e um número gravado.

#### 33 · A bancada das três ações
`bancada` · pos (−4 / −17) · `#a8906a` · legenda **ponto·linha·área** / *punctória/incisa/contusa*

**Escultura:** uma **bancada de madeira** com **três blocos de massa de modelar** e, sobre cada um,
a ferramenta e a marca que ela deixou: um **prego** com um **furo puntiforme**; um **bisturi** com um
**risco linear comprido**; um **martelo** com uma **área afundada e larga**. Ponto, linha, área —
nessa ordem, da esquerda para a direita.

**Imagem mental:** logo na entrada, três ferramentas batem num bloco de massa de modelar: um prego
fura um ponto, um bisturi risca uma linha arrastando, um martelo amassa uma área inteira.

**Âncoras:**
- prego num ponto → punctória: pressão sobre um ponto
- bisturi riscando uma linha → incisa: pressão + deslizamento sobre uma linha
- martelo amassando a área → contusa: choque/pressão sobre uma superfície

**Fatos:**
- A classificação é pelo **modo de ação**, não pelo objeto: uma faca é classificada conforme foi
  usada no caso concreto.
- **Punctória:** afasta as fibras; lesão puntiforme, com crostícula sero-hemática.
- **Incisa:** bordas regulares, predomínio do **comprimento** sobre a profundidade, **duas caudas**.
- **Contusa:** escoriação, equimose, hematoma, bossa, luxação, fratura (as cranianas costumam ser radiadas).
- Hematoma = sangue coletado em cavidade; bossa = coleção entre pele e osso; escoriação = perda de epiderme.

#### 34 · O punhal na camisa
`punhal` · pos (4 / −16) · `#bcc4cc` · legenda **PÉRFURO-CORTANTE** / *casa de botão*

**Escultura:** uma **camisa pendurada num cabide**, com um **rasgo em forma de casa de botão**
(oval com duas pontas agudas) atravessado por um **punhal**. Ao lado, uma **régua** mostrando a
profundidade **maior** que o comprimento da lâmina, e **três caudas** desenhadas saindo do rasgo,
enquanto a lâmina mostra só **dois gumes**.

**Imagem mental:** um punhal atravessa uma camisa pendurada e deixa no tecido uma casa de botão
perfeita. Quando você mede, o buraco entrou mais fundo do que o comprimento da própria lâmina — e
sobraram três pontas, embora a lâmina só tenha dois gumes.

**Âncoras:**
- casa de botão no tecido → lesão pérfuro-incisa, biconvexa
- mais fundo que a lâmina → a profundidade pode exceder o comprimento da lâmina
- três pontas para dois gumes → o número de caudas pode não coincidir com o de gumes

**Fatos:**
- **Pérfuro-cortante:** ponta + gume; perfura e corta ao mesmo tempo.
- Lesão em **casa de botão** ou biconvexa, bordas regulares, extremidades agudas.
- A **profundidade pode exceder** o comprimento da lâmina, pela depressão dos tecidos no golpe.
- O número de **caudas pode não coincidir** com o número de gumes.
- Lesões de defesa, nesse contexto, localizam-se tipicamente nos **antebraços** e nas mãos.

#### 35 · O machado na melancia
`machado` · pos (−4 / −12) · `#8d6e4a` · legenda **CORTOCONTUNDENTE** / *gume que age por peso*

**Escultura:** um **machado grande e pesado** (cabeça de metal de 4 blocos, cabo longo) descendo sobre
uma **melancia partida**: casca **rasgada em bordas irregulares** (blocos verdes desalinhados, não
em linha reta) e, dentro, a **semente rachada** em dois. O peso da cabeça do machado precisa parecer
desproporcional ao gume.

**Imagem mental:** um machado despenca sobre uma melancia: ele tem gume, mas quem destrói é o peso.
A casca rasga irregular e a semente lá dentro racha.

**Âncoras:**
- tem gume, mas o que age é o peso → cortocontundente
- casca rasgada irregular → bordas irregulares e contundidas
- semente rachada → fratura óssea subjacente

**Fatos:**
- **Cortocontundente:** há gume, mas a ação principal é a **contusão pelo peso**.
- Lesões profundas, bordas irregulares, destruição de tecidos, frequente **fratura**.
- Exemplos: facão, foice, enxada, hélice, roda de trem, guilhotina — e **dentes** e **unhas**.
- Na região cervical anterior: **guilhotinamento**. Na nuca: **degola**.

#### 36 · O semáforo VAVA
`semaforo` · pos (5 / −9) · `#7fa86a` · legenda **V·A·V·A** / *equimose em 20 dias*

**Escultura:** um **semáforo vertical de quatro luzes**, de cima para baixo: **roxo-avermelhado,
azul, verde, amarelo** — nessa ordem exata, cada luz um bloco emissivo de 2 × 2. Ao lado, um
**cronômetro grande marcando 20**. Quatro cores em coluna: é a figura mais fácil de ler do palácio,
e deve ficar assim.

**Imagem mental:** antes da linha de tiro, um semáforo de quatro luzes troca de cor bem devagar:
roxo, azul, verde, amarelo. O cronômetro ao lado leva vinte dias para zerar.

**Âncoras:**
- as quatro luzes em ordem → V-A-V-A: vermelho-violáceo, azul, verde, amarelo
- o cronômetro de vinte dias → a equimose desaparece em cerca de 20 dias
- trocar devagar → é o que permite datar a lesão

**Fatos:**
- **Espectro equimótico:** vermelho-violáceo (1–2 d) → azulado (3–6 d) → esverdeado (7–12 d) →
  amarelado (12–20 d); desaparece em cerca de **20 dias**.
- Equimoses de cores **distintas no mesmo exame** = traumatismos em datas diferentes.
- Somadas a escoriações em estágios variados e fraturas de idades diversas: quadro sugestivo de
  **maus-tratos** — notificação compulsória.
- O amarelado é a fase **tardia**, não a recente: é a pegadinha mais comum.

#### 37 · Linha dos 30 metros · só os três anéis
`distLonga` · pos (0 / −3) · `#b0b8c0` · legenda **TIRO À DISTÂNCIA** / *só as 3 orlas*

**Escultura:** no piso, a **marca "30 m"** em blocos; à frente, um **alvo-painel** com um furo pequeno
cercado por **exatamente três anéis finos e limpos** e **nada mais em volta** — nenhum pontinho,
nenhuma fuligem, nenhuma borda escurecida. O vazio em volta é o fato; resista à tentação de decorar.

**Imagem mental:** você se posiciona na marca mais distante e atira. No alvo aparecem apenas três
anéis finos ao redor do furo — nenhuma sujeira, nenhuma fuligem, nenhuma queimadura. O furo é até
menor que a bala.

**Âncoras:**
- estar longe → tiro à distância
- só os três anéis → apenas as orlas: contusão, equimótica e enxugo
- nenhuma sujeira em volta → sem zonas de tatuagem, esfumaçamento ou chamuscamento
- furo menor que a bala → elasticidade da pele

**Fatos:**
- **Tiro à distância:** orifício arredondado, bordas invertidas, **apenas orlas**.
- As **orlas** são produzidas pelo próprio projétil e aparecem em **qualquer** distância:
  contusão/escoriação, equimótica e enxugo (orla de contusão + enxugo = **anel de Fish**).
- O diâmetro do orifício de entrada costuma ser **menor** que o do projétil, pela elasticidade da pele.
- É esta marca do chão que o perito "lê" quando não encontra zona nenhuma.

#### 38 · Linha dos 3 metros · a sujeira em volta
`distCurta` · pos (0 / 7) · `#6b6f76` · legenda **CURTA DISTÂNCIA** / *tatuagem e fuligem*

**Escultura:** a **marca "3 m"** no piso e um alvo com os três anéis **mais**: **pontinhos negros
cravados** espalhados em volta (blocos pretos pequenos, incrustados na superfície), um **borrão
cinza de fuligem** em nuvem e as **bordas chamuscadas** em marrom-escuro. Ao lado, uma **esponja
molhada** que já limpou metade do borrão — mas não os pontinhos. A esponja é a chave mnemônica.

**Imagem mental:** você avança para a marca do meio e atira de novo. Agora, além dos anéis, o alvo
ganha pontinhos negros cravados que não saem nem esfregando, um borrão de fuligem que sai com uma
esponja molhada, e as bordas ficam chamuscadas.

**Âncoras:**
- pontinhos cravados que não saem → zona de tatuagem: pólvora incombusta
- borrão que sai com esponja → zona de esfumaçamento: fuligem, a "falsa tatuagem"
- bordas chamuscadas → zona de chamuscamento: gases superaquecidos
- ter avançado no chão → as zonas só aparecem a curta distância

**Fatos:**
- **Tiro a curta distância:** orlas **+** zonas.
- **Tatuagem:** grânulos de pólvora incombusta incrustados — **não** saem com lavagem.
  **Esfumaçamento:** fuligem, **sai** com água e sabão. **Chamuscamento:** queimadura pelos gases.
- A distinção "sai / não sai com água e sabão" é cobrada o tempo todo em prova.
- As zonas são produzidas pela **pólvora e pelos gases**, não diretamente pelo projétil.

#### 39 · Linha do zero · o cano encostado
`encostado` · pos (0 / 15) · `#4f5a66` · legenda **TIRO ENCOSTADO** / *estrela de Hofmann*

**Escultura:** o cano **tocando** o alvo, e o furo **explodido em forma de estrela** — quatro a seis
pontas radiais inconfundíveis. Atrás da chapa, um **halo preto** de fuligem **por dentro**. Na
superfície, a **boca da arma e a alça de mira carimbadas** (um anel e um traço em relevo).
Por **fora**, quase nenhuma sujeira — e esse vazio externo é parte do fato.

**Imagem mental:** você encosta o cano no alvo e dispara. O buraco explode em estrela; a chapa atrás
fica com um halo preto de fuligem por dentro, e a boca da arma e a alça de mira ficam carimbadas na
superfície. Por fora, estranhamente, quase não há sujeira.

**Âncoras:**
- buraco em estrela → câmara de mina de Hofmann
- halo preto por dentro, no osso → sinal de Benassi
- boca da arma carimbada → sinal de Werkgaertner
- pouca sujeira por fora → os gases entram: sem tatuagem/esfumaçamento externos

**Fatos:**
- **Tiro encostado:** forma **estrelada** pela dilaceração dos gases — **câmara de mina de Hofmann**.
- **Sinal de Benassi:** halo fuliginoso na tábua óssea. **Sinal de Werkgaertner:** impressão da boca
  do cano e da alça de mira na pele.
- Diâmetro do ferimento **maior** que o do projétil, pela explosão dos gases.
- Sem zonas externas de tatuagem e esfumaçamento — elas ficam dentro do trajeto.

#### 40 · O alvo · os três anéis gravados
`alvo` · pos (−4,5 / 19,5) · `#cf7070` · legenda **as 3 orlas** / *em qualquer distância*

**Escultura:** o **alvo do fundo**, com **três anéis concêntricos bem distintos**, cada um de material
diferente e evidente: o externo de **pele raspada** (bege-claro, textura áspera), o do meio de
**sangue** (vermelho), o interno de **graxa** (cinza-escuro brilhante). Gravados a fogo: permanentes.

**Imagem mental:** o alvo no fundo tem três anéis gravados a fogo, sempre presentes, qualquer que
tenha sido a marca de onde você atirou: um de pele raspada, um de sangue, um de graxa.

**Âncoras:**
- anel de pele raspada → orla de escoriação/contusão
- anel de sangue → orla equimótica
- anel de graxa → orla de enxugo
- "sempre presentes" → as orlas independem da distância

**Fatos:**
- **Orla de contusão/escoriação:** a pele se invagina e se rompe pela diferença de elasticidade
  entre derme e epiderme.
- **Orla equimótica:** ruptura de pequenos vasos ao redor.
- **Orla de enxugo:** o projétil se limpa dos resíduos nas bordas do orifício.
- Orifício de **entrada**: regular, bordas **invertidas**, com orlas.
- No crânio, o **funil de Bonnet** (alargamento da tábua óssea no sentido do trajeto) confirma
  entrada e saída.

#### 41 · Atrás do alvo · o rombo irregular
`saida` · pos (4,5 / 19,5) · `#8a4a4a` · legenda **ORIFÍCIO DE SAÍDA** / *evertido · sem orlas*

**Escultura:** a **parede atrás do alvo** com um **rombo rasgado, nitidamente maior** que o furo da
frente, de **bordas viradas para fora** (blocos projetados em direção ao observador, como pétalas),
e **completamente limpo** — nenhum anel, nenhuma sujeira. Coloque-o **ao lado** do alvo da parada 40,
para a comparação ser imediata.

**Imagem mental:** atravessando o alvo, a parede de trás tem um rombo rasgado, de bordas viradas para
fora, bem maior que o furo da frente — e completamente limpo: nenhum anel, nenhuma sujeira.

**Âncoras:**
- rasgado e maior → orifício de saída: irregular, dilacerado, maior
- bordas viradas para fora → bordas evertidas
- completamente limpo → sem orlas e sem zonas

**Fatos:**
- **Orifício de saída:** irregular, dilacerado, bordas **evertidas**, habitualmente maior, **sem**
  orlas nem zonas, com maior sangramento.
- **Trajeto** = caminho dentro do corpo (transfixante ou com projétil retido).
  **Trajetória** = caminho fora do corpo.
- Exceções à regra do tamanho: tiro encostado, ricochete (projétil que perdeu energia) e dois
  projéteis no mesmo ponto.
- Pela **forma do orifício de saída** não se estima o ângulo do disparo.

---

## SALA VI · Estúdio e Bastidores — Publicidade médica e aborto legal
**Centro (40, 20) · sala 13 × 12, com divisória central · porta em (40, 7) · luz lilás `#e8b8ff`**

*Lema:* "No palco, o que o médico mostra; nos bastidores, o que a lei decide."

Uma **divisória de cortina** corta a sala ao meio. A metade da frente é o **palco**: iluminada,
com holofotes e plateia — publicidade médica, o que se mostra. A metade do fundo são os
**bastidores**: luz baixa, sem câmeras — aborto legal, objeção de consciência e lesões corporais,
o que a lei decide longe do público. A passagem é por uma fenda na cortina.

#### 42 · Palco · o crachá sem número
`cracha` · pos (−9 / −8) · `#e0d2a8` · legenda **nome + CRM** / *especialidade só com RQE*

**Escultura:** um **crachá gigante** (10 × 7 blocos) com o nome em letras grandes e, embaixo, um
**retângulo vazio recortado** onde deveria estar o número — um vão de blocos, literalmente oco.
Ao lado, um **diploma emoldurado** usado como se fosse título, e uma **etiqueta "RQE" caída no chão**.

**Imagem mental:** na entrada do palco, um crachá enorme: o nome do médico em letras garrafais e,
embaixo, um retângulo vazio onde deveria estar o número. Ao lado, um diploma de pós-graduação sendo
usado como se fosse título de especialista — e uma etiqueta "RQE" caída no chão.

**Âncoras:**
- retângulo vazio → falta o número de inscrição no CRM
- diploma usado como título → pós-graduação lato sensu não é especialidade
- etiqueta RQE no chão → sem RQE não se anuncia especialidade

**Fatos:**
- Toda peça de publicidade médica deve trazer **nome** e **número de inscrição no CRM**.
- Anunciar **especialidade** exige título reconhecido e **RQE** registrado no Conselho.
- A pós-graduação **lato sensu** concluída pode ser divulgada como tal — nunca como especialidade.
- Conteúdos temporários (stories) seguem as **mesmas** regras.

#### 43 · Palco · a etiqueta de preço
`etiqueta` · pos (−3 / −9) · `#7fd4a0` · legenda **preço: PODE** / *equipamentos também*

**Escultura:** uma **maca de consultório** com uma **etiqueta de preço de supermercado** pendurada
(retângulo amarelo com cifrão e números), e, ao lado, a **ficha técnica de um aparelho** afixada na
parede. Tudo **em verde** na moldura: esta é a parada do que **pode**, e a cor deve dizer isso.

**Imagem mental:** pendurada na maca, uma etiqueta de supermercado com o preço da consulta — e, ao
lado, a ficha técnica do aparelho. Ninguém vem arrancá-la: ali é permitido.

**Âncoras:**
- etiqueta de preço na maca → divulgar preços é permitido
- ficha técnica do aparelho → descrever equipamentos é permitido
- ninguém arranca → é a novidade da resolução de 2023

**Fatos:**
- **Resolução CFM nº 2.336/2023**, em vigor desde março de 2024; revogou a Resolução CFM nº 1.974/2011.
- **Passou a permitir:** anunciar preços de consultas e serviços, descrever equipamentos do
  consultório, repostar elogios, anunciar pós-graduações concluídas.
- Não há autorização prévia do CRM para publicar — a fiscalização é **posterior**.
- Permanecem vedados consórcios e mecanismos que desvirtuem a medicina como atividade-meio.

#### 44 · Palco · a moldura antes e depois
`moldura` · pos (3 / −9) · `#d0a0c0` · legenda **antes e depois** / *autorização não basta*

**Escultura:** uma **moldura dupla** (dois painéis lado a lado, "antes" e "depois") com um **rosto
inteiro, identificável** nos dois; por cima, as palavras **"AGENDE JÁ"**; no canto, um **papel de
autorização assinado** colado. Uma **tarja negra** desce sobre os olhos e há um **espaço vazio
retangular** onde falta o texto educativo. O papel colado e a tarja descendo precisam coexistir
na mesma figura: é isso que ensina que a autorização não basta.

**Imagem mental:** uma moldura dupla: "antes" à esquerda, "depois" à direita. O rosto aparece inteiro,
por cima piscam as palavras "agende já" — e o papel de autorização, assinado, está colado no canto
como se resolvesse tudo. Não resolve: uma tarja desce sozinha sobre os olhos e um pequeno texto
educativo tenta se encaixar no espaço vazio.

**Âncoras:**
- rosto inteiro → a imagem não pode identificar o paciente
- autorização colada no canto → a autorização existe, mas não basta sozinha
- tarja que desce → exigência de anonimato e pudor
- texto educativo faltando → a imagem precisa de finalidade educativa, com indicações e riscos
- "agende já" piscando → promessa de resultado e captação de clientela: vedadas

**Fatos:**
- A imagem do paciente é **permitida**, inclusive em "antes e depois", mas sob condições **cumulativas**:
- autorização; preservação do **pudor**; **anonimato** (a imagem não pode identificar o paciente);
- **finalidade educativa**, com texto explicativo de indicações e riscos;
- pertinência com a **especialidade registrada**.
- Ou seja: a autorização **não basta** — foi exatamente a observação feita na correção da prova.

#### 45 · Palco · o selo rachado
`selo` · pos (9 / −8) · `#dcb878` · legenda **resultado garantido** / *PROIBIDO*

**Escultura:** um **pote de suplemento** com um **selo dourado rachado ao meio** (a rachadura em
ziguezague tem de ser visível), ao lado de um **cartaz** com "RESULTADO GARANTIDO" e um **rabisco
pequeno** embaixo dizendo "opinião pessoal". O selo rachado é a figura; o resto é contexto.

**Imagem mental:** colado num pote de suplemento, um selo dourado de "qualidade garantida" — rachado
ao meio. Ao lado, um cartaz anuncia "técnica exclusiva, resultado garantido", e alguém rabisca
embaixo, em letra pequena, "opinião pessoal", como se isso salvasse.

**Âncoras:**
- selo rachado no pote → vedado dar selo de qualidade a produtos
- "resultado garantido" → vedado garantir, prometer ou insinuar bons resultados
- rabisco "opinião pessoal" → a ressalva não descaracteriza a infração

**Fatos:**
- Vedado **garantir, prometer ou insinuar** bons resultados.
- Vedado conferir **selo de qualidade** a produtos alimentícios, esportivos, de higiene pessoal ou
  de ambientes, induzindo garantia de resultado.
- Vedados **sensacionalismo, autopromoção e concorrência desleal** — inclusive comparações de
  superioridade sobre outros profissionais.
- Dizer que é "opinião pessoal" não afasta a responsabilidade: o peso vem da condição de médico.
- Conteúdo produzido por agência não transfere a responsabilidade: responde quem o divulga em seu nome.

#### 46 · Palco · o microfone sóbrio
`microfone` · pos (0 / −3) · `#9fb6c4` · legenda **boletim médico** / *sóbrio e sigiloso*

**Escultura:** um **microfone de rádio antigo** (corpo retangular cromado sobre pedestal), diante de
uma **fileira de câmeras e microfones de repórter**. Pendurada no microfone, uma **mordaça de tecido**.
Fora do palco, à margem, uma **mão segurando uma chave** — a única que abre o microfone.

**Imagem mental:** no centro do palco, um microfone de rádio antigo diante de uma plateia de
repórteres. Pendurada nele, uma mordaça; e na mão do paciente, fora de cena, a única chave que abre
o microfone.

**Âncoras:**
- microfone antigo e sóbrio → tom sóbrio, impessoal e verídico
- mordaça pendurada → preservação do sigilo
- a chave na mão do paciente → quem autoriza é o paciente ou o representante legal

**Fatos:**
- **Boletim médico:** dever de adotar tom **sóbrio, impessoal e verídico**, preservando o sigilo.
- Quem autoriza a divulgação é o **paciente ou seu representante legal** — não a instituição.
- Notoriedade do paciente **não** cria exceção ao sigilo.
- Na relação com a imprensa, o médico deve declarar conflito de interesse.

#### 47 · Bastidores · a balança de dois pratos
`balanca128` · pos (−8 / 8) · `#c9c2bb` · legenda **ART. 128** / *vida da mãe · estupro*

**Escultura:** uma **balança de dois pratos** bem legível (travessão horizontal, dois pratos
pendentes). No prato esquerdo, um **coração vermelho**; no direito, uma **porta arrombada**
(folha de madeira partida, dobradiça torta). Pendurado num prego ao lado, um **martelo de juiz com
teia de aranha** — e **nenhum papel** em nenhum dos pratos.

**Imagem mental:** atrás da cortina, longe das câmeras, uma balança com dois pratos: num deles um
coração batendo, no outro uma porta arrombada. Pendurado num prego, um martelo de juiz com uma teia
de aranha — ninguém o usa aqui.

**Âncoras:**
- coração batendo → inciso I: risco à vida da gestante
- porta arrombada → inciso II: gravidez resultante de estupro
- martelo com teia de aranha → não se exige autorização judicial
- nenhum boletim na balança → não se exige boletim de ocorrência

**Fatos:**
- **Art. 128 do Código Penal** — não se pune o aborto praticado por médico:
- **I — aborto necessário:** não há outro meio de salvar a vida da gestante.
- **II — gravidez resultante de estupro:** precedido de consentimento da gestante ou, sendo incapaz,
  de seu representante legal.
- Não se exigem boletim de ocorrência, inquérito, laudo do IML ou alvará judicial.
- A lei não fixa limite de idade gestacional nessas hipóteses.

#### 48 · Bastidores · a redoma do feto sem coroa
`redoma` · pos (0 / 10) · `#bfa8d8` · legenda **ADPF 54** / *atípico, sem alvará*

**Escultura:** uma **redoma de vidro** sobre pedestal, guardando uma figura de feto à qual **falta o
alto da cabeça** (topo do crânio aberto, vazio — a ausência é a figura). Ao lado, numa **vitrine de
museu**, um **martelo de juiz partido em dois** e uma placa com **2012**. Acima, uma **prateleira com
exatamente dois ganchos ocupados** e um **terceiro gancho caído no chão**.

**Imagem mental:** no fundo dos bastidores, uma redoma de vidro guarda um feto a que falta o alto da
cabeça. Ao lado, numa vitrine de museu, está o martelo de juiz quebrado e uma placa: "peça retirada
de uso em 2012". Numa prateleira acima, o art. 128 tem apenas dois ganchos — e alguém tentou pendurar
um terceiro, que caiu.

**Âncoras:**
- feto sem o alto da cabeça → anencefalia
- martelo quebrado, 2012 → ADPF 54: dispensa autorização judicial
- o terceiro gancho que caiu → não virou inciso III do art. 128

**Fatos:**
- **ADPF 54** (STF, Pleno, 2012): inconstitucional a interpretação que tipificava como aborto a
  interrupção da gravidez de feto **anencéfalo**.
- A conduta é **atípica** — por isso **não** depende de autorização judicial.
- A decisão **não** criou um inciso III do art. 128: é o erro clássico de prova.
- Também não se confunde com o aborto necessário do inciso I, que exige risco à vida demonstrado no
  caso concreto.

#### 49 · Bastidores · a porta da consciência
`portaC` · pos (8 / 8) · `#f0c27b` · legenda **objeção** / *trava em 3 casos*

**Escultura:** uma **porta lateral** com placa "OBJEÇÃO DE CONSCIÊNCIA", **entreaberta**, com uma
**tranca grossa de três linguetas** visível no batente. Ao lado, os três gatilhos da tranca,
desenhados em blocos: um **corredor vazio**, uma **campainha vermelha** e um **monitor com linha
caindo**. Na porta, uma **janelinha pequena permanentemente aberta**, com um papel passando por ela.

**Imagem mental:** uma porta lateral com a placa "objeção de consciência". Ela abre normalmente —
mas trava sozinha quando o corredor fica vazio, quando a campainha vermelha de emergência toca ou
quando a paciente piora. Mesmo travada, há uma janelinha por onde é obrigatório passar informação
e encaminhamento.

**Âncoras:**
- porta que abre → a objeção é assegurada
- trava com o corredor vazio → ausência de outro médico
- trava com a campainha → urgência ou emergência
- trava se a paciente piora → risco de dano
- a janelinha sempre aberta → deveres de informar e encaminhar permanecem

**Fatos:**
- O médico não é obrigado a praticar ato que contrarie sua consciência.
- A objeção **cede** em três situações: **ausência de outro médico**, **urgência ou emergência** e
  **risco de dano** ao paciente.
- A objeção é **pessoal**: a instituição de saúde não é titular dela.
- Jamais alcança os deveres de **informar, acolher** e encaminhar a profissional ou serviço habilitado.

#### 50 · Bastidores · a balança de quatro pratos
`balanca129` · pos (0 / 4) · `#dcb878` · legenda **ART. 129** / *leve/grave/gravíssima*

**Escultura:** uma **balança de quatro pratos** (travessão em cruz, quatro pratos pendentes — a mais
difícil do palácio; desenhe a cruz do travessão bem aberta para a contagem ser imediata).
Prato 1: uma **pilha de 30 folhas de calendário**. Prato 2: um **olho só** e um **ventre com um bebê
saindo**. Prato 3: um **rosto com uma cicatriz grande e visível** atravessando. Prato 4: uma **lápide**.

**Imagem mental:** a última peça: uma balança com quatro pratos. No primeiro, 30 folhas de calendário;
no segundo, um olho e um ventre com um bebê nascendo antes da hora; no terceiro, um rosto com cicatriz
grande e visível; no quarto, uma lápide.

**Âncoras:**
- 30 folhas de calendário → lesão grave: incapacidade por mais de 30 dias
- um olho (não os dois) → debilidade permanente de sentido = grave
- bebê nascendo antes da hora, vivo → aceleração do parto = grave
- cicatriz grande e visível → deformidade permanente = gravíssima
- a lápide → lesão corporal seguida de morte

**Fatos:**
- **Leve:** por exclusão (caput do art. 129).
- **Grave** (§1º): incapacidade para ocupações habituais por mais de **30 dias**; perigo de vida;
  **debilidade permanente** de membro, sentido ou função; **aceleração do parto**.
- **Gravíssima** (§2º): incapacidade permanente para o trabalho; enfermidade incurável;
  **perda ou inutilização** de membro, sentido ou função; **deformidade permanente**; **aborto**.
- **Seguida de morte** (§3º): dolo na lesão, culpa no resultado.
- Perder a visão de **um** olho é debilidade (grave); cegueira é perda (gravíssima).
  Deformidade exige **visibilidade, permanência e extensibilidade**.

---

## 13. Resumo do percurso (ordem canônica)

| # | Parada | # | Parada |
|---|---|---|---|
| 1 | queixo · 2–4 h | 26 | luvas · esganadura |
| 2 | bracos · 4–6 h | 27 | aquario · afogados |
| 3 | estatua · 8–16 h | 28 | garagem · monóxido |
| 4 | isqueiro · 16–24 h | 29 | frasco · cianeto |
| 5 | ventre · 24–48 h | 30 | prensa · sufoc. indireta |
| 6 | chama · 48–72 h | 31 | armario · direta/confinamento |
| 7 | poças · hipóstase × equimose | 32 | mural · sinais gerais |
| 8 | vitrine · 4 conservativos | 33 | bancada · 3 ações |
| 9 | esteira · 4 períodos | 34 | punhal · pérfuro-cortante |
| 10 | portao1 · pré-requisitos | 35 | machado · cortocontundente |
| 11 | ampulheta2 · 6 h / 24 h | 36 | semaforo · espectro equimótico |
| 12 | painel · 35·94·100 | 37 | distLonga · à distância |
| 13 | lanternas · 5 reflexos | 38 | distCurta · curta distância |
| 14 | marionete · medular × descerebração | 39 | encostado · Hofmann |
| 15 | cilindro55 · apneia | 40 | alvo · 3 orlas |
| 16 | monitores · complementar | 41 | saida · orifício de saída |
| 17 | crachas · 2 médicos / prazos | 42 | cracha · CRM e RQE |
| 18 | fila · mistanásia | 43 | etiqueta · o que PODE |
| 19 | maoAdianta · eutanásia | 44 | moldura · antes e depois |
| 20 | maquinaEstica · distanásia | 45 | selo · promessa de resultado |
| 21 | relogioCerto · ortotanásia | 46 | microfone · boletim médico |
| 22 | maoSegura · paliativos | 47 | balanca128 · art. 128 |
| 23 | envelope · DAV | 48 | redoma · ADPF 54 |
| 24 | forca · enforcamento | 49 | portaC · objeção |
| 25 | corda · estrangulamento | 50 | balanca129 · art. 129 |

---

## 14. O que não fazer (erros já cometidos nesta obra)

1. **Montar as figuras com primitivos grandes** (caixas, cilindros e cones de 1 m compostos).
   Foi a primeira tentativa: o resultado é irreconhecível e o palácio deixa de funcionar.
   Daí a escala de 0,10 m da seção 3.
2. **Usar emoji como figura 3D.** Depende de fonte do sistema; no celular pode virar quadrado vazio.
3. **Publicar sem olhar o render.** Rode o teste de silhueta da seção 10b e **abra a imagem**.
4. **Legenda na cor crua da parada.** Ilegível em cores escuras. Clareie 55%.
5. **Número da placa no canto.** Sai fora de moldura circular ou em escudo. Centro do topo.
6. **Mais de 8 luzes pontuais.** Tela preta em GPU de celular.
7. **Um `Mesh` por bloco.** Trava. `InstancedMesh`, sempre.
8. **Figuras girando.** Parecia bom, destrói a estabilidade espacial — e o palácio da memória
   depende de cada coisa estar sempre no mesmo lugar, na mesma orientação. Só a **placa** encara
   a câmera; a escultura fica parada.
9. **Duas paradas perto demais.** Loci a menos de 3 m se confundem na recuperação. O harness testa isso.
10. **Reescrever o conteúdo da Parte B.** É material conferido. Qualquer dúvida de mérito volta
    para o professor, não para o modelo.
