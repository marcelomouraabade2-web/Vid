# Palácio da Memória — Medicina Legal, Bioética e Tanatologia

Mundo 3D em primeira pessoa, em blocos, com 6 salas e 50 paradas na ordem do percurso.
Tudo está em um único arquivo: [`index.html`](index.html) (Three.js r128 via cdnjs, sem nenhum arquivo externo).
A especificação completa está em [`PALACIO_MINECRAFT_SPEC.md`](PALACIO_MINECRAFT_SPEC.md).

## Controles

| | Desktop | Celular |
|---|---|---|
| Andar | `W A S D` / setas, `Shift` corre | arrastar na metade esquerda (joystick) |
| Olhar | mouse (clique para capturar, `Esc` solta) | arrastar na metade direita |
| Fixar cartão | `E` | botão **Fixar** |
| Percurso guiado (seta, halo, fita dourada, números no piso) | `R` | botão **R · Percurso** |
| Teste (esconde legenda, âncoras e fatos) | `T`, e `F` revela | botões **T · Teste** e **Revelar** |

O progresso (paradas vistas e a próxima do percurso) fica salvo no navegador.

## Conteúdo dos cartões

O texto dos cartões **não é digitado à mão**: `ferramentas/gerar-conteudo.js` lê a Parte B da
especificação e grava o bloco `SALAS` dentro do `index.html`. Para corrigir um fato, edite a
especificação e rode:

```bash
node ferramentas/gerar-conteudo.js
```

## Verificação (seção 10)

```bash
node testes/harness.js                                   # 10a + 10c: planta, colisão, travessia completa
node testes/capturas.js capturas/                        # 10b: silhuetas, amostra de materiais, vistas do mundo
```

`testes/silhuetas.html` abre a grade de silhuetas (256 px colorido + 64 px preto sobre branco)
direto no navegador. `index.html?modo=amostra` mostra os 14 materiais.

## Desvios em relação à especificação

- **Esculturas sem `InstancedMesh`.** Cada escultura vira uma única malha fundida, com as faces internas
  eliminadas e cor por vértice. O objetivo da regra (nunca um `Mesh` por bloco) é mantido e melhorado:
  ~73 mil blocos viram 1 a 3 draw calls por escultura e muito menos triângulos do que instâncias de cubos inteiros.
- **`VOX` em comandos, não em camadas de texto.** Os mapas de voxel são gerados por funções de desenho
  (caixa, linha, disco, texto em fonte 3×5, pixel-art) na mesma resolução de 0,10 m.
- **Dimensões das salas.** As coordenadas da Parte B só cabem se "13 × 12" e "7 × 21" forem lidos como
  meias-medidas; a planta foi ajustada para conter todas as posições sem alterar nenhuma delas.
  As portas das salas II e V ficam em z = ∓6 (e não ∓7), para dar folga às paradas 10 e 33.
