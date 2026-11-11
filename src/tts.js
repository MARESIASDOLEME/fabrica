// Vozes: Gemini TTS (Google AI Studio), com cache em disco. Provedor "nenhum" gera silêncio (prévia sem custo).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const CACHE = path.resolve(process.env.FABRICA_CACHE || 'cache', 'tts');

function pcmToWav(pcm, out, rate = 24000) {
  const raw = out + '.pcm';
  fs.writeFileSync(raw, pcm);
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', out]);
  fs.unlinkSync(raw);
}

async function gemini(text, voice, estilo) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY não definida no .env');
  const model = process.env.TTS_MODEL || 'gemini-2.5-flash-preview-tts';
  const prompt = `${estilo ? `Fale em português do Brasil, ${estilo}:` : 'Fale em português do Brasil:'} ${text}`;
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      }),
    });
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 4000 * tentativa)); continue; }
    if (!r.ok) throw new Error(`Gemini TTS ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = await r.json();
    const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part) throw new Error('Gemini TTS sem áudio: ' + JSON.stringify(j).slice(0, 300));
    const rate = Number((part.inlineData.mimeType.match(/rate=(\d+)/) || [])[1] || 24000);
    return { pcm: Buffer.from(part.inlineData.data, 'base64'), rate };
  }
  throw new Error('Gemini TTS: limite de requisições, tente mais tarde');
}

// Retorna caminho de um .wav para a fala
export async function falar(text, voice, estilo, provider = process.env.TTS_PROVIDER || 'gemini') {
  fs.mkdirSync(CACHE, { recursive: true });
  const h = crypto.createHash('sha1').update([provider === 'nenhum' ? 'nenhum' : 'gemini', voice, estilo || '', text].join('|')).digest('hex').slice(0, 16);
  const out = path.join(CACHE, h + '.wav');
  if (fs.existsSync(out)) return out;
  if (provider === 'nenhum') {
    const dur = Math.max(1.2, text.length / 14);
    execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `sine=frequency=180:duration=${dur}`, '-af', 'volume=0.02', '-ar', '24000', '-ac', '1', out]);
    return out;
  }
  const { pcm, rate } = await gemini(text, voice, estilo);
  pcmToWav(pcm, out, rate);
  return out;
}
export const cacheKeyDir = CACHE;
