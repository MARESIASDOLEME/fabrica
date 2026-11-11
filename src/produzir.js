// Episódio (JSON) → vozes → timeline → render → mixagem → MP4 na fila de aprovação
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { falar } from './tts.js';
import { analisar, mixar, fontesDeSom, AMBIENTE_POR_CENARIO } from './audio.js';
import { gerarASS } from './subs.js';
import { renderVideo } from './render.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export async function montarTimeline(ep, canal, { log = console.log } = {}) {
  const fps = Number(process.env.FPS || 30);
  const vozDe = (quem) => (quem === 'voce'
    ? { voz: canal.protagonista.voz, estilo: canal.protagonista.estilo_voz, cor: canal.protagonista.cor_legenda || '#ffffff' }
    : { voz: ep.personagens[quem].voz, estilo: ep.personagens[quem].estilo_voz, cor: ep.personagens[quem].cor_legenda });

  let t = 0;
  const scenes = [], lines = [];
  for (let i = 0; i < ep.cenas.length; i++) {
    const c = ep.cenas[i];
    const start = t;
    t += i === 0 ? 0.25 : 0.5;
    for (const f of c.falas) {
      const v = vozDe(f.quem);
      log(`  voz: ${f.quem} → "${f.texto.slice(0, 50)}"`);
      const wav = await falar(f.texto, v.voz, v.estilo);
      const { dur, env } = analisar(wav, fps);
      lines.push({ start: t, end: t + dur, speaker: f.quem, text: f.texto, color: v.cor, env, wav });
      t += dur + 0.22;
    }
    const ultima = i === ep.cenas.length - 1;
    t += c.pausa_final ?? (ultima ? (ep.escolha ? 4.5 : 0.9) : 0.4);
    if (t - start < 2.5) t = start + 2.5;
    scenes.push({
      start, end: t, set: c.cenario, params: c.params, transitionIn: c.transicao,
      characters: c.elenco.map((e) => ({
        id: e.id, at: e.em, walk: e.caminho.map((k) => ({ t: k.t, at: k.em })),
        face: typeof e.olhar === 'number' ? e.olhar : undefined,
        gestures: e.gestos.map((g) => ({ t0: g.t0, t1: g.t1, type: g.tipo })),
        spec: ep.personagens[e.id].visual,
      })),
      camera: c.camera.map((k) => ({ t: k.t, pos: k.pos, look: k.olhar })),
      hands: c.maos, shake: c.tremor, trilha: c.trilha, sfx: c.sfx || [],
    });
  }
  const res = (process.env.RENDER_RES || '720x1280').split('x').map(Number);
  return {
    width: res[0], height: res[1], outWidth: 1080, outHeight: 1920, fps, duration: t,
    seed: [...(ep.titulo || 'x')].reduce((a, ch) => a + ch.charCodeAt(0), 0),
    fisheye: canal.estilo?.fisheye ?? 1.1, fov: canal.estilo?.fov ?? 92,
    hands: canal.protagonista.maos || {},
    scenes, lines,
  };
}

export async function produzir(ep, canal, { pastaSaida, log = console.log } = {}) {
  const data = new Date();
  const iso = data.toISOString();
  const stamp = `${iso.slice(0, 10)}_${iso.slice(11, 16).replace(':', '')}`;
  const dir = pastaSaida || path.join(ROOT, 'saida', canal.id, `${stamp}_${slug(ep.titulo || 'episodio')}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'episodio.json'), JSON.stringify(ep, null, 2));

  log('1/4 vozes e tempos');
  const TL = await montarTimeline(ep, canal, { log });
  fs.writeFileSync(path.join(dir, 'timeline.json'), JSON.stringify({ ...TL, lines: TL.lines.map(({ env, ...l }) => l) }, null, 1));

  log('2/4 mixagem de áudio');
  const wavMix = path.join(dir, 'audio.wav');
  const musicas = canal.musicas_dir && fs.existsSync(canal.musicas_dir) ? fs.readdirSync(canal.musicas_dir).filter((f) => /\.(mp3|wav|m4a)$/i.test(f)) : [];
  const musica = musicas.length ? path.join(canal.musicas_dir, musicas[TL.seed % musicas.length]) : null;
  mixar({
    falas: TL.lines.map((l) => ({ wav: l.wav, start: l.start })),
    cenas: TL.scenes.map((s) => ({ start: s.start, end: s.end, ambiente: AMBIENTE_POR_CENARIO[s.set], silencio: s.trilha === 'silencio' })),
    sons: fontesDeSom(TL.scenes),
    duracao: TL.duration, musica, saida: wavMix,
  });

  log('3/4 legendas');
  const ass = gerarASS({
    linhas: TL.lines, saida: path.join(dir, 'legendas.ass'),
    topo: ep.texto_topo ? { text: ep.texto_topo, start: 0, end: TL.scenes[0].end } : null,
    escolha: ep.escolha ? { ...ep.escolha, start: Math.max(0, TL.duration - 4.3), end: TL.duration } : null,
  });

  log(`4/4 render (${TL.duration.toFixed(1)} s, ${Math.ceil(TL.duration * TL.fps)} quadros)`);
  const mp4 = path.join(dir, 'video.mp4');
  await renderVideo(TL, mp4, {
    audio: wavMix, ass, fontsDir: path.join(ROOT, 'assets', 'fonts'),
    onProgress: (i, n, s) => { if (i % 300 === 0) log(`   quadro ${i}/${n} (${s.toFixed(0)} s)`); },
  });
  const capaT = Math.min(TL.duration - 0.1, (TL.lines[0]?.start || 0) + 0.8);
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(capaT), '-i', mp4, '-frames:v', '1', '-q:v', '2', path.join(dir, 'capa.jpg')]);
  const legenda = [ep.legenda_post, (ep.hashtags || []).join(' '), canal.rodape_legenda || ''].filter(Boolean).join('\n\n');
  fs.writeFileSync(path.join(dir, 'legenda.txt'), legenda);
  fs.unlinkSync(wavMix);
  return { dir, mp4, duracao: TL.duration, legenda };
}
