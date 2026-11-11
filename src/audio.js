// Duração, envelope (para mexer a boca) e mixagem final
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function analisar(wav, fps = 30) {
  const pcm = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', wav, '-f', 's16le', '-ac', '1', '-ar', '16000', 'pipe:1'], { maxBuffer: 1 << 28 });
  const n = pcm.length / 2;
  const dur = n / 16000;
  const win = Math.floor(16000 / fps);
  const env = [];
  let max = 1e-6;
  for (let i = 0; i < n; i += win) {
    let s = 0, c = 0;
    for (let k = i; k < Math.min(n, i + win); k++) { const v = pcm.readInt16LE(k * 2) / 32768; s += v * v; c++; }
    const rms = Math.sqrt(s / Math.max(1, c));
    env.push(rms); if (rms > max) max = rms;
  }
  return { dur, env: env.map((v) => { const x = v / max; return x < 0.12 ? 0 : Math.round(Math.min(1, x * 1.2) * 100) / 100; }) };
}

const AMBIENTE = {
  praia: 'anoisesrc=color=brown:amplitude=0.5,lowpass=f=900,volume=\'0.35+0.25*sin(2*PI*t/7)\':eval=frame',
  rua: 'anoisesrc=color=pink:amplitude=0.12,lowpass=f=2500',
  interior: 'anoisesrc=color=pink:amplitude=0.04,lowpass=f=1200',
  saguao: 'anoisesrc=color=pink:amplitude=0.08,lowpass=f=3000,aecho=0.8:0.6:120:0.3',
};
export const AMBIENTE_POR_CENARIO = { calcadao: 'praia', lapa: 'rua', recepcao: 'interior', quarto: 'interior', desembarque: 'saguao' };

// falas: [{wav, start}], cenas: [{start,end,ambiente}], musica: caminho opcional
export function mixar({ falas, cenas, duracao, musica, saida }) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  const fc = [];
  const labels = [];
  falas.forEach((f, i) => {
    args.push('-i', f.wav);
    const ms = Math.round(f.start * 1000);
    fc.push(`[${i}:a]aresample=48000,aformat=channel_layouts=mono,adelay=${ms}:all=1[f${i}]`);
    labels.push(`[f${i}]`);
  });
  cenas.forEach((c, i) => {
    const src = AMBIENTE[c.ambiente] || AMBIENTE.interior;
    const d = (c.end - c.start).toFixed(3);
    fc.push(`${src},atrim=0:${d},afade=t=in:d=0.15,afade=t=out:st=${Math.max(0, d - 0.15)}:d=0.15,aresample=48000,aformat=channel_layouts=mono,adelay=${Math.round(c.start * 1000)}:all=1[a${i}]`);
    labels.push(`[a${i}]`);
  });
  let n = labels.length;
  if (musica && fs.existsSync(musica)) {
    args.push('-stream_loop', '-1', '-i', musica);
    fc.push(`[${falas.length}:a]aresample=48000,aformat=channel_layouts=mono,volume=0.12,atrim=0:${duracao}[m]`);
    labels.push('[m]'); n++;
  }
  fc.push(`${labels.join('')}amix=inputs=${n}:normalize=0:duration=longest,atrim=0:${duracao.toFixed(3)},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[out]`);
  args.push('-filter_complex', fc.join(';'), '-map', '[out]', '-ac', '2', '-c:a', 'pcm_s16le', saida);
  execFileSync('ffmpeg', args);
  return saida;
}
