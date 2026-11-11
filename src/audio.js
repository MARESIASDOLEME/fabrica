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

// Efeitos sonoros sintetizados pelo ffmpeg: [duração em s, fonte lavfi]. Sem arquivo externo, sem risco de direitos.
const SFX = {
  batida_coracao: [2.4, "aevalsrc='0.9*sin(2*PI*52*t)*(exp(-22*mod(t,0.8))+0.7*gte(mod(t,0.8),0.22)*exp(-22*(mod(t,0.8)-0.22)))':s=48000:d=2.4,lowpass=f=160"],
  porta_rangendo: [1.6, "aevalsrc='0.35*sin(2*PI*(220*t+40*sin(2*PI*2.3*t)))*sin(PI*t/1.6)':s=48000:d=1.6,bandpass=f=500:w=300,aecho=0.6:0.4:40:0.3"],
  passos: [2.0, "aevalsrc='0.8*sin(2*PI*85*t)*exp(-35*mod(t,0.5))':s=48000:d=2,lowpass=f=300"],
  estalo: [0.3, "anoisesrc=color=white:amplitude=0.9:d=0.3,highpass=f=1500,afade=t=out:st=0.02:d=0.25"],
  trovao: [3.0, "anoisesrc=color=brown:amplitude=1:d=3,lowpass=f=200,afade=t=in:d=0.05,afade=t=out:st=0.3:d=2.7"],
  respiracao: [3.0, "anoisesrc=color=pink:amplitude=0.5:d=3,bandpass=f=900:w=700,volume='0.6*pow(sin(PI*t/1.5),2)':eval=frame"],
  sussurro: [1.5, "anoisesrc=color=white:amplitude=0.25:d=1.5,bandpass=f=3200:w=1500,volume='0.5+0.5*sin(2*PI*5*t)':eval=frame,afade=t=out:st=1:d=0.5"],
  impacto_grave: [2.5, "aevalsrc='0.9*sin(2*PI*38*t)*exp(-2.2*t)+0.4*sin(2*PI*76*t)*exp(-6*t)':s=48000:d=2.5"],
  riser: [5.0, "aevalsrc='0.35*(t/5)*sin(2*PI*(90*t+45*t*t))+0.15*(t/5)*sin(2*PI*(93*t+46*t*t))':s=48000:d=5"],
  batidas_porta: [2.4, "aevalsrc='0.9*sin(2*PI*110*t)*exp(-45*mod(t,0.3))*lt(mod(t,1.2),0.9)':s=48000:d=2.4,lowpass=f=600"],
  relogio: [4.0, "aevalsrc='0.5*sin(2*PI*2200*t)*exp(-400*mod(t,1))':s=48000:d=4"],
  estatica: [1.0, "anoisesrc=color=white:amplitude=0.3:d=1,highpass=f=800"],
};
// Trilha por clima (drones sintetizados). D = duração da cena.
const TRILHA = {
  tensao_baixa: (D) => `aevalsrc='0.22*sin(2*PI*55*t)+0.12*sin(2*PI*82.4*t)*(0.6+0.4*sin(2*PI*0.2*t))':s=48000:d=${D}`,
  tensao_crescente: (D) => `aevalsrc='(0.15+0.25*t/${D})*(sin(2*PI*55*t)+0.6*sin(2*PI*58.3*t)+0.25*sin(2*PI*233*t))':s=48000:d=${D}`,
  perseguicao: (D) => `aevalsrc='0.5*sin(2*PI*48*t)*exp(-10*mod(t,0.42))+0.15*sin(2*PI*61.7*t)':s=48000:d=${D}`,
  revelacao: (D) => `aevalsrc='0.08*(sin(2*PI*880*t)+sin(2*PI*932.3*t))*(0.5+0.5*sin(2*PI*0.5*t))+0.15*sin(2*PI*55*t)':s=48000:d=${D}`,
  alivio: (D) => `aevalsrc='0.12*(sin(2*PI*110*t)+0.7*sin(2*PI*164.8*t))':s=48000:d=${D}`,
};
export function fontesDeSom(cenas) {
  const out = [];
  for (const c of cenas) {
    const D = Math.max(0.5, c.end - c.start);
    if (c.trilha && TRILHA[c.trilha]) out.push({ src: TRILHA[c.trilha](D.toFixed(3)), start: c.start, dur: D, vol: 0.5, fade: true });
    for (const s of c.sfx || []) {
      const def = SFX[s.tipo]; if (!def) continue;
      out.push({ src: def[1], start: c.start + s.t * D, dur: def[0], vol: 1 });
    }
  }
  return out;
}

// falas: [{wav, start}], cenas: [{start,end,ambiente,silencio}], sons: [{src,start,dur,vol,fade}], musica: caminho opcional
export function mixar({ falas, cenas, duracao, musica, saida, sons = [] }) {
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
    const src = (c.silencio ? 'anoisesrc=color=pink:amplitude=0.005' : AMBIENTE[c.ambiente] || AMBIENTE.interior);
    const d = (c.end - c.start).toFixed(3);
    fc.push(`${src},atrim=0:${d},afade=t=in:d=0.15,afade=t=out:st=${Math.max(0, d - 0.15)}:d=0.15,aresample=48000,aformat=channel_layouts=mono,adelay=${Math.round(c.start * 1000)}:all=1[a${i}]`);
    labels.push(`[a${i}]`);
  });
  sons.forEach((x, i) => {
    const d = Math.max(0.05, x.dur).toFixed(3);
    const fade = x.fade ? `,afade=t=in:d=0.6,afade=t=out:st=${Math.max(0, x.dur - 0.4).toFixed(3)}:d=0.4` : '';
    fc.push(`${x.src},atrim=0:${d}${fade},volume=${x.vol},aresample=48000,aformat=channel_layouts=mono,adelay=${Math.round(x.start * 1000)}:all=1[s${i}]`);
    labels.push(`[s${i}]`);
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
