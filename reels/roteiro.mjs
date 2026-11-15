// Reels — O Parque de Diversões do Sistema Endócrino (embriologia)
// Cada cena = uma página de quadrinhos. Segmento: { p: painel em foco, txt: narração }
export const SCENES = [
  {
    id: 'entrada', set: 'entrada', titulo: 'A Entrada do Parque',
    segs: [
      { p: -1, txt: 'Imagine entrar em um parque de diversões onde cada brinquedo representa uma glândula do nosso sistema endócrino.' },
      { p: 0, txt: 'Guarde esse caminho, porque ele vai ajudar você a nunca mais esquecer a embriologia!' },
      { p: 0, txt: 'Na entrada, encontramos dois elevadores que se encontram no mesmo destino: a hipófise.' },
      { p: 1, txt: 'Um sobe a partir do teto da boca primitiva, através da bolsa de Rathke, formando a adeno-hipófise.' },
      { p: 2, txt: 'O outro desce do cérebro, a partir do neuroectoderma do diencéfalo, formando a neuro-hipófise.' },
      { p: 3, txt: 'Lembre: a adeno vem da boca; a neuro vem do cérebro!' },
    ],
  },
  {
    id: 'montanha', set: 'montanha', titulo: 'A Montanha-Russa',
    segs: [
      { p: 0, txt: 'Agora, vamos à montanha-russa da tireoide!' },
      { p: 0, txt: 'Ela começa sua história na quarta semana, no endoderma do assoalho da faringe primitiva, próximo ao futuro forame cego da língua.' },
      { p: 1, txt: 'Imagine um carrinho descendo da língua até a região anterior da traqueia. Esse caminho representa o ducto tireoglosso, que normalmente desaparece.' },
      { p: 2, txt: 'Se a tireoide parar na língua, temos tireoide lingual. Se o ducto persistir, pode surgir um cisto tireoglosso.' },
      { p: 3, txt: 'E atenção: células foliculares produzem T3 e T4; células C produzem calcitonina.' },
    ],
  },
  {
    id: 'espelhos', set: 'espelhos', titulo: 'A Casa dos Espelhos',
    segs: [
      { p: 0, txt: 'Na casa dos espelhos existem duas portas: a terceira e a quarta bolsas faríngeas.' },
      { p: 1, txt: 'Na terceira bolsa, a parte ventral forma o timo, que desce até o mediastino. A parte dorsal forma as paratireoides inferiores, que acompanham essa descida.' },
      { p: 2, txt: 'Na quarta bolsa, a parte dorsal forma as paratireoides superiores.' },
      { p: 3, txt: 'É por isso que as inferiores ficam geralmente mais baixas!' },
      { p: 3, txt: 'E não esqueça: as paratireoides produzem PTH, que aumenta o cálcio no sangue.' },
    ],
  },
  {
    id: 'queda', set: 'queda', titulo: 'A Queda Livre',
    segs: [
      { p: 0, txt: 'Chegamos à queda livre: a suprarrenal! Imagine um brinquedo com duas partes completamente diferentes.' },
      { p: 1, txt: 'A camada externa, o córtex, vem do mesoderma e produz hormônios esteroides.' },
      { p: 1, txt: 'A parte interna, a medula, vem da crista neural e forma células cromafins, produtoras de adrenalina e noradrenalina.' },
      { p: 2, txt: 'Para memorizar as zonas do córtex: G, F, R. Glomerulosa, aldosterona; fasciculada, cortisol; reticulada, androgênios.' },
    ],
  },
  {
    id: 'batebate', set: 'batebate', titulo: 'Os Carrinhos de Bate-Bate',
    segs: [
      { p: 0, txt: 'Por último, os carrinhos de bate-bate representam o pâncreas! Ele começa com dois brotos de origem endodérmica: um dorsal e outro ventral.' },
      { p: 1, txt: 'Quando o duodeno gira, aproximadamente 90 graus, os dois brotos se aproximam e se fundem.' },
      { p: 2, txt: 'O dorsal forma a maior parte do pâncreas. O ventral contribui para a parte inferior da cabeça e o processo uncinado.' },
      { p: 2, txt: 'Seus ductos formam o sistema de Wirsung, principal, e Santorini, acessório.' },
      { p: 3, txt: 'Nas ilhotas pancreáticas: células beta produzem insulina; alfa, glucagon; delta, somatostatina.' },
    ],
  },
  {
    id: 'saida', set: 'saida', titulo: 'Saída do Parque', hold: 3,
    segs: [
      { p: 0, txt: 'Pronto! Você acabou de percorrer a embriologia do sistema endócrino.' },
      { p: 0, txt: 'Agora, quando lembrar desse parque, vai conseguir reconstruir a origem de cada glândula. Estudar é criar caminhos para a memória!' },
    ],
  },
];

const PRON = [
  [/\bPTH\b/g, 'pê tê agá'], [/\bT3\b/g, 'tê três'], [/\bT4\b/g, 'tê quatro'], [/\bG, F, R\b/g, 'gê, éfe, érre'],
  [/Rathke/g, 'Rátque'], [/Wirsung/g, 'Vírsung'], [/Santorini/g, 'Santoríni'], [/\b90\b/g, 'noventa'],
];
export function pronounce(txt) { let s = txt; for (const [re, r] of PRON) s = s.replace(re, r); return s; }
