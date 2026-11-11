// Catálogo compartilhado: o que o roteirista (LLM) pode usar. Mantido em sincronia com src/browser/*.
export const CENARIOS = {
  calcadao: 'Orla de Copacabana: calçadão de ondas pretas e brancas (z de -1 a 4), areia com guarda-sóis (z<-1), mar (z<-19), morros ao fundo, quiosque em x=params.quiosqueX (padrão 6), z=-2.2, rua e prédios atrás (z>5). Câmera no calçadão (y=1.6, z≈1.5), olhando o mar (-z) ou andando no eixo x.',
  recepcao: 'Recepção de hostel: balcão em z=-2.6 (largura 4), placa acima (params.placa), quadro de chaves, mural (params.mural), sofá à direita, porta de entrada atrás (z=4.4). Recepcionista atrás do balcão em [0,-3.2]. Câmera entra em z≈3.5 e vai até z≈-1.5.',
  quarto: 'Quarto compartilhado: 3 beliches nas laterais (x=±2.4), armários ao fundo (z=-3.2), janela com vista à direita. Sala de 6x7 m. Câmera em x≈0, z≈2.5.',
  lapa: 'Rua da Lapa (noite por padrão): casarões coloridos nos dois lados (x=±10), varal de lâmpadas, arcos brancos ao fundo (z=-62). Câmera anda pelo meio da rua (x=0) no sentido -z.',
  desembarque: 'Saguão de desembarque: placa central em z=-6 (params.placa, padrão DESEMBARQUE), esteira de bagagem em x=-3, z=-3, cadeiras em z=2..5, janelões no fundo (z=-12) com vista do Rio, placa SAÍDA à direita. Câmera começa em z≈8.',
};
export const PARAMS = { horario: ['dia', 'tarde', 'noite', 'apagao'], placa: 'texto curto', mural: 'texto curto', parede: 'cor hex', balcao: 'cor hex', quiosqueX: 'número' };
export const POSES = ['repouso', 'escondidas', 'empurrar', 'celular', 'acenar', 'mala', 'apontar'];
export const GESTOS = ['acenar', 'apontar', 'bracos', 'falar', 'pensar'];
export const VISUAL = {
  skin: ['clara', 'media', 'morena', 'escura'],
  hair: ['curto', 'black', 'longo', 'coque', 'careca'],
  hat: ['bone', 'chapeu', null],
  prop: ['prancha', 'bandeja', null],
  outfit: ['uniforme', 'regata', null],
  campos: 'shirt, pants, hairColor, hatColor, emblema (hex; emblema = bola no peito do uniforme); glasses (bool); height (0.85-1.1)',
};
// Vozes pré-definidas do Gemini TTS (nome: característica)
export const VOZES = {
  Kore: 'feminina, firme', Aoede: 'feminina, leve', Leda: 'feminina, jovem', Callirrhoe: 'feminina, tranquila', Autonoe: 'feminina, clara',
  Puck: 'masculina, animada', Charon: 'masculina, informativa', Fenrir: 'masculina, empolgada', Orus: 'masculina, firme', Enceladus: 'masculina, sussurrada',
  Iapetus: 'masculina, clara', Umbriel: 'masculina, tranquila', Algieba: 'masculina, suave', Achird: 'masculina, amigável', Sadachbia: 'masculina, viva',
  Zephyr: 'feminina, brilhante', Despina: 'feminina, suave', Erinome: 'feminina, clara', Laomedeia: 'feminina, animada', Vindemiatrix: 'feminina, gentil', Sulafat: 'feminina, calorosa',
};

// Suspense: clima de trilha por cena e efeitos sonoros (sintetizados, sem arquivo e sem licença de terceiros)
export const TRILHAS = ['silencio', 'tensao_baixa', 'tensao_crescente', 'perseguicao', 'revelacao', 'alivio'];
export const SFX = ['batida_coracao', 'porta_rangendo', 'passos', 'estalo', 'trovao', 'respiracao', 'sussurro', 'impacto_grave', 'riser', 'batidas_porta', 'relogio', 'estatica'];
