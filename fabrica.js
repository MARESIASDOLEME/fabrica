#!/usr/bin/env node
// Fábrica de vídeos POV — linha de comando
//   node fabrica.js novo --canal rio-pov            gera roteiro com IA e produz o vídeo
//   node fabrica.js roteiro --canal rio-pov         só gera o roteiro (JSON) para revisar
//   node fabrica.js produzir --canal rio-pov --episodio arquivo.json
//   node fabrica.js agenda                          roda o que estiver programado para hoje (cron)
//   node fabrica.js canais                          lista canais e status
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
process.chdir(ROOT);
// .env simples
if (fs.existsSync('.env')) for (const l of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const { escreverEpisodio, validar } = await import('./src/roteiro.js');
const { produzir } = await import('./src/produzir.js');

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

function carregarCanal(id) {
  const f = path.join(ROOT, 'canais', id, 'canal.json');
  if (!fs.existsSync(f)) throw new Error(`Canal "${id}" não existe (crie canais/${id}/canal.json)`);
  const c = JSON.parse(fs.readFileSync(f, 'utf8'));
  c.id = id;
  if (c.musicas_dir) c.musicas_dir = path.resolve(path.dirname(f), c.musicas_dir);
  return c;
}
const histFile = (id) => path.join(ROOT, 'canais', id, 'historico.json');
const historico = (id) => (fs.existsSync(histFile(id)) ? JSON.parse(fs.readFileSync(histFile(id), 'utf8')) : []);

async function avisar(payload) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
  catch (e) { log('aviso: webhook falhou:', e.message); }
}

async function novo(id) {
  const canal = carregarCanal(id);
  const hist = historico(id);
  log(`[${id}] escrevendo roteiro (${hist.length} episódios anteriores)`);
  const { episodio, avisos } = await escreverEpisodio(canal, hist.slice(-15));
  avisos.forEach((a) => log('  aviso:', a));
  log(`[${id}] "${episodio.titulo}" (~${episodio.duracao_estimada} s)`);
  const r = await produzir(episodio, canal, { log });
  hist.push({ data: new Date().toISOString().slice(0, 10), titulo: episodio.titulo, resumo: episodio.resumo || '', gancho: typeof episodio.gancho === 'string' ? episodio.gancho.trim() : '', pasta: path.relative(ROOT, r.dir) });
  fs.writeFileSync(histFile(id), JSON.stringify(hist, null, 2));
  log(`[${id}] pronto: ${r.mp4}`);
  await avisar({ evento: 'video_pronto', canal: id, nome_canal: canal.nome, titulo: episodio.titulo, duracao_s: Math.round(r.duracao), pasta: r.dir, video: r.mp4, capa: path.join(r.dir, 'capa.jpg'), legenda: r.legenda, avisos });
  return r;
}

try {
  if (cmd === 'novo') {
    const n = Number(opt('quantidade', 1));
    for (let i = 0; i < n; i++) await novo(opt('canal'));
  } else if (cmd === 'roteiro') {
    const canal = carregarCanal(opt('canal'));
    const { episodio, avisos } = await escreverEpisodio(canal, historico(canal.id).slice(-15));
    avisos.forEach((a) => log('aviso:', a));
    const f = opt('saida', `roteiro_${canal.id}_${Date.now()}.json`);
    fs.writeFileSync(f, JSON.stringify(episodio, null, 2));
    log('roteiro salvo em', f);
  } else if (cmd === 'produzir') {
    const canal = carregarCanal(opt('canal'));
    const { episodio, avisos } = validar(JSON.parse(fs.readFileSync(opt('episodio'), 'utf8')), canal);
    avisos.forEach((a) => log('aviso:', a));
    const r = await produzir(episodio, canal, { log, pastaSaida: opt('saida') });
    log('pronto:', r.mp4);
  } else if (cmd === 'agenda') {
    const lock = path.join(ROOT, '.fabrica.lock');
    if (fs.existsSync(lock) && Date.now() - fs.statSync(lock).mtimeMs < 3 * 3600e3) { log('outra execução em andamento; saindo'); process.exit(0); }
    fs.writeFileSync(lock, String(process.pid));
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      for (const id of fs.readdirSync(path.join(ROOT, 'canais'))) {
        let canal; try { canal = carregarCanal(id); } catch { continue; }
        if (!canal.agenda?.ativo) continue;
        const feitos = historico(id).filter((h) => h.data === hoje).length;
        for (let i = feitos; i < (canal.agenda.por_dia || 1); i++) {
          try { await novo(id); } catch (e) { log(`[${id}] ERRO:`, e.message); await avisar({ evento: 'erro', canal: id, erro: e.message }); break; }
        }
      }
    } finally { fs.unlinkSync(lock); }
  } else if (cmd === 'canais') {
    for (const id of fs.readdirSync(path.join(ROOT, 'canais'))) {
      try { const c = carregarCanal(id); console.log(`${id}\t${c.nome}\t${c.agenda?.ativo ? `${c.agenda.por_dia}/dia` : 'pausado'}\t${historico(id).length} episódios`); } catch {}
    }
  } else {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 8).join('\n'));
  }
} catch (e) {
  log('ERRO:', e.message);
  await avisar({ evento: 'erro', comando: cmd, erro: e.message });
  process.exit(1);
}
