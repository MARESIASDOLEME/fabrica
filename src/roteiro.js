// Roteirista: gera o episódio (JSON) com um LLM e valida contra o catálogo
import { CENARIOS, PARAMS, POSES, GESTOS, VISUAL, VOZES } from './catalog.js';

const EXEMPLO = {
  titulo: 'Primeira noite no hostel',
  texto_topo: 'POV: você chegou no Rio sem reserva',
  legenda_post: 'Quem nunca? 😅 #rio #pov',
  hashtags: ['#pov', '#riodejaneiro', '#hostel'],
  personagens: {
    bia: { nome: 'Bia', voz: 'Laomedeia', estilo_voz: 'carioca, animada e rápida', cor_legenda: '#ffd166', visual: { skin: 'morena', shirt: '#e76f51', hair: 'black', hairColor: '#2b1d14', outfit: 'uniforme' } },
  },
  cenas: [
    {
      cenario: 'recepcao', params: { horario: 'noite', placa: 'HOSTEL' }, transicao: 'corte',
      elenco: [{ id: 'bia', em: [0, -3.2], gestos: [{ t0: 0.05, t1: 0.25, tipo: 'acenar' }] }],
      camera: [{ t: 0, pos: [0, 1.6, 3.5], olhar: 'bia' }, { t: 0.4, pos: [0, 1.6, -1.4], olhar: 'bia' }],
      maos: [{ t: 0, pose: 'mala' }, { t: 0.45, pose: 'repouso' }],
      tremor: [],
      falas: [{ quem: 'bia', texto: 'Boa noite! Chegou agora? Deixa eu adivinhar: sem reserva.' }, { quem: 'voce', texto: 'Como você sabe?' }],
    },
  ],
};

export function montarPrompt(canal, historico = []) {
  return `Você é o roteirista do canal de TikTok "${canal.nome}". Escreva UM episódio novo em formato POV: o espectador é o protagonista ("voce"), vê tudo em primeira pessoa e os outros personagens falam diretamente com ele.

# Bíblia do canal
${canal.biblia}

# Protagonista ("voce")
${canal.protagonista.descricao}. A voz dele já está definida; use "quem": "voce" para as falas dele. Ele fala pouco: no máximo 30% das falas.

# Personagens fixos (reutilize quando fizer sentido, com o mesmo id, nome, voz e visual)
${JSON.stringify(canal.personagens_fixos || {}, null, 1)}

# Regras de formato (obrigatórias)
- Duração alvo: ${canal.duracao_alvo || '40 a 65'} segundos de fala no total (≈ 14 caracteres por segundo). Entre 6 e 14 falas.
- Gancho nos primeiros 2 segundos: a primeira fala já cria tensão, curiosidade ou humor.
- 2 a 4 cenas. Última fala termina com uma virada ou um gancho para o próximo episódio (pergunta, ameaça, surpresa). Nada de moral da história.
- Falas curtas e naturais, português do Brasil coloquial e carioca quando couber. Sem palavrão, sem conteúdo sexual, sem violência gráfica, sem marcas registradas, sem pessoas reais, sem o Cristo Redentor.
- Informações práticas sobre o Rio só se forem verdadeiras e atemporais; na dúvida, deixe genérico.
- "texto_topo": frase curta começando com "POV:" que aparece no topo do vídeo na primeira cena.
${(canal.regras_extras || []).map((r) => '- ' + r).join('\n')}

# Recursos visuais disponíveis (use SOMENTE estes)
Cenários (coordenadas em metros; y é a altura; a câmera fica a 1.6 de altura):
${Object.entries(CENARIOS).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
Params de cenário: ${JSON.stringify(PARAMS)}
Poses das mãos do protagonista ("maos"): ${POSES.join(', ')} (mala = puxando mala de rodinha; celular = segurando o celular)
Gestos do elenco: ${GESTOS.join(', ')}
Visual do elenco: ${JSON.stringify(VISUAL)}
Vozes disponíveis: ${JSON.stringify(VOZES)}
Transições: "corte" ou "piscar" (o protagonista pisca; bom para passagem de tempo).

# Como animar
- "t" vai de 0 a 1 dentro de cada cena (0 = início da cena, 1 = fim). A cena dura o tempo das falas dela.
- camera: lista de {t, pos:[x,y,z], olhar:[x,y,z] ou id de personagem}. Movimentos suaves; andar ≈ 1 m/s. Mantenha a câmera dentro do cenário e longe das paredes (>0.5 m).
- elenco: {id, em:[x,z]} posição fixa, ou "caminho":[{t, em:[x,z]}] para andar. "olhar": "camera" (padrão) ou ângulo em graus. "gestos": [{t0,t1,tipo}].
- Personagens de frente para a câmera a 2–3,5 m de distância ficam bem enquadrados (a lente olho de peixe aumenta o centro; mais perto que 1,8 m o rosto ocupa a tela toda — use só para close dramático).
- tremor: [{t0,t1,amp}] com amp 0.01–0.05 para susto ou correria.

# Episódios anteriores (não repita; dê continuidade se a bíblia pedir)
${historico.length ? historico.map((h) => `- ${h.data}: ${h.titulo} — ${h.resumo || ''}`).join('\n') : '(nenhum ainda: este é o episódio 1)'}

# Saída
Responda SOMENTE com um JSON válido, sem comentários e sem markdown, neste formato (exemplo curto):
${JSON.stringify(EXEMPLO)}
Inclua também "resumo": uma frase descrevendo o que aconteceu (para continuidade).`;
}

async function chamarGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY não definida');
  const model = process.env.SCRIPT_MODEL || 'gemini-3.5-flash';
  let r;
  for (let t = 1; t <= 5; t++) {
  r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 1.0 } }),
  });
    if (r.status !== 429 && r.status < 500) break;
    await new Promise((s) => setTimeout(s, 15000 * t));
  }
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  return j.candidates[0].content.parts.map((p) => p.text || '').join('');
}

async function chamarClaude(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY não definida');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.SCRIPT_MODEL || 'claude-sonnet-5-5', max_tokens: 8000, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  return j.content.map((c) => c.text || '').join('');
}

function extrairJSON(txt) {
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
  return JSON.parse(txt.slice(a, b + 1));
}

export async function escreverEpisodio(canal, historico) {
  const prompt = montarPrompt(canal, historico);
  const prov = process.env.SCRIPT_PROVIDER || 'gemini';
  let ultimoErro;
  for (let i = 0; i < 3; i++) {
    try {
      const txt = prov === 'claude' ? await chamarClaude(prompt) : await chamarGemini(prompt);
      const ep = extrairJSON(txt);
      const { episodio, avisos } = validar(ep, canal);
      return { episodio, avisos, prompt };
    } catch (e) { ultimoErro = e; }
  }
  throw ultimoErro;
}

// Valida e corrige o episódio. Erros graves lançam exceção; o resto vira aviso.
export function validar(ep, canal) {
  const avisos = [];
  const clamp01 = (x) => Math.min(1, Math.max(0, Number(x) || 0));
  const num3 = (v, d) => (Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(+n)) ? v.map(Number) : d);
  const num2 = (v, d) => (Array.isArray(v) && v.length === 2 && v.every((n) => Number.isFinite(+n)) ? v.map(Number) : d);
  if (!Array.isArray(ep.cenas) || !ep.cenas.length) throw new Error('episódio sem cenas');
  ep.personagens = ep.personagens || {};
  for (const [id, p] of Object.entries(canal.personagens_fixos || {})) if (!ep.personagens[id] && JSON.stringify(ep).includes(`"${id}"`)) ep.personagens[id] = p;
  for (const [id, p] of Object.entries(ep.personagens)) {
    if (!VOZES[p.voz]) { avisos.push(`voz inválida para ${id}: ${p.voz} → Puck`); p.voz = 'Puck'; }
    p.visual = p.visual || {};
    if (!/^#[0-9a-f]{6}$/i.test(p.cor_legenda || '')) p.cor_legenda = '#ffffff';
  }
  let totalChars = 0;
  ep.cenas.forEach((c, i) => {
    if (!CENARIOS[c.cenario]) { avisos.push(`cena ${i + 1}: cenário "${c.cenario}" não existe → recepcao`); c.cenario = 'recepcao'; }
    c.params = c.params || {};
    if (c.params.horario && !PARAMS.horario.includes(c.params.horario)) delete c.params.horario;
    c.transicao = c.transicao === 'piscar' ? 'piscar' : 'corte';
    c.elenco = (c.elenco || []).filter((e) => {
      if (!ep.personagens[e.id]) { avisos.push(`cena ${i + 1}: elenco "${e.id}" sem ficha → removido`); return false; }
      e.em = num2(e.em, [0, -2]);
      e.caminho = (e.caminho || []).map((k) => ({ t: clamp01(k.t), em: num2(k.em, e.em) })).sort((a, b) => a.t - b.t);
      e.gestos = (e.gestos || []).filter((g) => GESTOS.includes(g.tipo)).map((g) => ({ t0: clamp01(g.t0), t1: clamp01(g.t1), tipo: g.tipo }));
      return true;
    });
    c.camera = (c.camera || []).map((k) => ({ t: clamp01(k.t), pos: num3(k.pos, [0, 1.6, 2]), olhar: typeof k.olhar === 'string' ? k.olhar : num3(k.olhar, [0, 1.6, -5]) })).sort((a, b) => a.t - b.t);
    if (!c.camera.length) { avisos.push(`cena ${i + 1}: sem câmera → padrão`); c.camera = [{ t: 0, pos: [0, 1.6, 2], olhar: c.elenco[0]?.id || [0, 1.6, -5] }]; }
    c.camera.forEach((k) => { if (typeof k.olhar === 'string' && !c.elenco.find((e) => e.id === k.olhar)) k.olhar = [0, 1.6, -5]; });
    c.maos = (c.maos || [{ t: 0, pose: 'repouso' }]).map((m) => ({ t: clamp01(m.t), pose: POSES.includes(m.pose) ? m.pose : 'repouso' })).sort((a, b) => a.t - b.t);
    c.tremor = (c.tremor || []).map((s) => ({ t0: clamp01(s.t0), t1: clamp01(s.t1), amp: Math.min(0.06, Math.max(0, +s.amp || 0.02)) }));
    c.falas = (c.falas || []).filter((f) => {
      if (!f.texto || !f.texto.trim()) return false;
      if (f.quem !== 'voce' && !ep.personagens[f.quem]) { avisos.push(`cena ${i + 1}: fala de "${f.quem}" sem ficha → removida`); return false; }
      totalChars += f.texto.length;
      return true;
    });
  });
  if (!ep.cenas.some((c) => c.falas.length)) throw new Error('episódio sem falas');
  const est = totalChars / 14;
  if (est > 95) throw new Error(`episódio longo demais (~${est.toFixed(0)} s)`);
  if (est < 15) throw new Error(`episódio curto demais (~${est.toFixed(0)} s)`);
  ep.duracao_estimada = Math.round(est);
  return { episodio: ep, avisos };
}
