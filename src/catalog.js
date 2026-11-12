// Catálogo compartilhado: o que o roteirista (LLM) pode usar. Mantido em sincronia com src/browser/*.
export const CENARIOS = {
  calcadao: 'Orla de Copacabana: calçadão de ondas pretas e brancas (z de -1 a 4), areia com guarda-sóis (z<-1), mar (z<-19), morros ao fundo, quiosque em x=params.quiosqueX (padrão 6), z=-2.2, rua e prédios atrás (z>5). Câmera no calçadão (y=1.6, z≈1.5), olhando o mar (-z) ou andando no eixo x.',
  recepcao: 'Recepção de hostel: balcão em z=-2.6 (largura 4), placa acima (params.placa), quadro de chaves, mural (params.mural), sofá à direita, porta de entrada atrás (z=4.4). Recepcionista atrás do balcão em [0,-3.2]. Câmera entra em z≈3.5 e vai até z≈-1.5.',
  quarto: 'Quarto compartilhado: 3 beliches nas laterais (x=±2.4), armários ao fundo (z=-3.2), janela com vista à direita. Sala de 6x7 m. Câmera em x≈0, z≈2.5.',
  lapa: 'Rua da Lapa (noite por padrão): casarões coloridos nos dois lados (x=±10), varal de lâmpadas, arcos brancos ao fundo (z=-62). Câmera anda pelo meio da rua (x=0) no sentido -z.',
  desembarque: 'Saguão de desembarque: placa central em z=-6 (params.placa, padrão DESEMBARQUE), esteira de bagagem em x=-3, z=-3, cadeiras em z=2..5, janelões no fundo (z=-12) com vista do Rio, placa SAÍDA à direita. Câmera começa em z≈8.',
  terraco: 'Terraço numa torre no alto do hostel (fumódromo): piso 8x8 com mureta de 1,1 m nas bordas (x=±4, z=±4), casinha da escada com porta em x=-2.6, z=2.3 (a câmera chega por ela), bancos à esquerda (x≈-3.3), gato branco sentado na mureta em x=2.6, z=-3.85, varal de luzes, cidade lá embaixo e mar ao fundo (-z). Câmera em z≈1.5.',
  refeitorio: 'Sala de refeições do hostel: 4 mesas compridas com bancos (x=±1.6, z=-0.8 e z=2.0), bancada da cozinha ao fundo (z=-3.9), gaiola com papagaio em x=-3.2, z=-3.5, janela à direita, placa (params.placa) no fundo. Câmera em z≈3.5.',
  bar: 'Bar do hostel (noite por padrão): balcão à direita (x=3.2) com garrafas e banquetas em x=2.4, palquinho de karaokê ao fundo (z=-3.1) com telão de letras, microfone em x=-1.2, z=-2.6 e placa KARAOKÊ (params.placa), sofá à esquerda, luzes coloridas. Câmera em z≈3.',
  ladeira: 'Ladeira íngreme: o hostel fica no alto (z≈9) e a rua desce no sentido -z até a avenida, o calçadão e a praia (z<-45). Casas dos dois lados (x=±7). Alturas de câmera, olhar e personagens são RELATIVAS ao chão da ladeira (use y=1.6 sempre). Câmera começa em [0,1.6,8] olhando -z e pode descer até z≈-40.',
  praia: 'Praia ao pé do hostel: calçadão em ondas (z de -1 a 4), areia, mar (z<-19). À esquerda (x≈-34) um morro com a bandeira do Brasil no topo; na base dele o caminho dos pescadores (x de -19 a -31); antes do caminho, o quiosque em x=params.quiosqueX (padrão -12), z=-2.4; mais à direita (x 12 a 17, z≈-5) bandeiras da Jamaica com uma rodinha de gente (ponto de encontro). Câmera no calçadão (y=1.6, z≈1.5).',
  roda: 'Roda de samba embaixo da pedra (noite por padrão): chão de pedra; à esquerda a grande rocha escura com a multidão em degraus; mesa dos sambistas em [0,-4] cercada de gente; casario colonial à direita (x=8) com mural; luz âmbar; mais ao fundo (z de -12 a -28) o corredor de barracas de drinks com isopores de LED e fumaça de espetinho; no fim (z≈-36) a esquina do baile funk com luzes roxas, vermelhas e azuis. Câmera em [1.5,1.6,3] ou andando no sentido -z por x≈1.5.',
  eden: 'Jardim do Éden: gramado florido, rio à direita (x≈6), Árvore do Conhecimento no centro em [0,-5] com frutos vermelhos e a serpente enrolada no tronco (cabeça em ≈[0.2,2.6,-4]; params.serpente:false tira), Árvore da Vida ao fundo em [-6,-11] com frutos dourados que brilham, mata e palmeiras. params.presenca:true = luz da Presença (Deus) atrás das árvores em [3,3,-9] — Deus nunca aparece com corpo, só luz e voz. params.portao:true = portão leste em z≈9 com espada flamejante e duas formas de luz (querubins). Câmera em z≈3 olhando -z.',
  campo: 'Campo fora do Éden (tarde por padrão): terra lavrada com trigo à esquerda (x≈-8), rebanho de ovelhas à direita (x≈7..10), dois altares de pedra em z=-3: o de Caim em x=-1.6 e o de Abel em x=1.6 com fumaça subindo (params.fumaca:false tira). Ao longe (z≈-70) o morro brilhante do Éden. Câmera em z≈3.',
  gavea: 'Topo da trilha da Pedra da Gávea: laje de rocha (x de -9 a 9, z de -8 a 6), mato nas laterais, paredão de escalada à direita (x≈6.5) com chapeletas e corda vermelha, beirada em z≈-8 com o mar e a costa muito abaixo. Câmera em z≈4 olhando -z.',
};
export const PARAMS = { horario: ['dia', 'tarde', 'noite', 'apagao'], placa: 'texto curto', mural: 'texto curto', parede: 'cor hex', balcao: 'cor hex', quiosqueX: 'número', serpente: 'bool (eden)', presenca: 'bool (eden)', portao: 'bool (eden)', fumaca: 'bool (campo)' };
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
