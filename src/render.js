// Renderiza uma timeline (JSON) em quadros JPEG via Chrome headless + Three.js
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));

async function bundle() {
  const out = path.join(ROOT, 'dist', 'engine.js');
  await esbuild.build({ entryPoints: [path.join(ROOT, 'src/browser/engine.js')], bundle: true, format: 'iife', outfile: out, logLevel: 'error' });
  const html = path.join(ROOT, 'dist', 'index.html');
  fs.writeFileSync(html, `<!doctype html><html><body style="margin:0;background:#000"><canvas id="c"></canvas><script src="engine.js"></script></body></html>`);
  return html;
}

export async function openEngine(TL) {
  const html = await bundle();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewport({ width: 400, height: 400 });
  await page.goto('file://' + html);
  await page.evaluate((tl) => window.Factory.init(tl), TL);
  if (errors.length) throw new Error('Erro no motor: ' + errors.join(' | '));
  return {
    async frame(t, q = 0.9) {
      const url = await page.evaluate((t, q) => window.Factory.frame(t, q), t, q);
      return Buffer.from(url.split(',')[1], 'base64');
    },
    close: () => browser.close(),
  };
}

// Renderiza todos os quadros e codifica um MP4 sem áudio (ou com áudio + legendas, se informado)
export async function renderVideo(TL, outFile, { audio, ass, fontsDir, onProgress } = {}) {
  const eng = await openEngine(TL);
  const total = Math.ceil(TL.duration * TL.fps);
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'mjpeg', '-i', 'pipe:0'];
  if (audio) args.push('-i', audio);
  const vf = [];
  if (TL.outWidth && TL.outWidth !== TL.width) vf.push(`scale=${TL.outWidth}:${TL.outHeight}:flags=lanczos`);
  // Grade de cor do canal (antes das legendas, para não tingir o texto)
  const GRADES = {
    // "jogo de mundo aberto": cores saturadas, sombras azuladas, altas luzes quentes, contraste alto, vinheta e grão leve
    gta: 'eq=contrast=1.12:saturation=1.45:gamma=1.08:brightness=0.03,colorbalance=bs=0.05:rh=0.08:gh=0.03:bh=-0.07,curves=all=0/0 0.25/0.22 0.75/0.82 1/1,unsharp=5:5:0.6,vignette=angle=PI/7,noise=alls=4:allf=t',
  };
  if (TL.grade && GRADES[TL.grade]) vf.push(GRADES[TL.grade]);
  if (ass) vf.push(`subtitles=${ass.replace(/:/g, '\\:')}${fontsDir ? `:fontsdir=${fontsDir}` : ''}`);
  if (vf.length) args.push('-vf', vf.join(','));
  args.push('-c:v', 'libx264', '-preset', process.env.X264_PRESET || 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(TL.fps));
  if (audio) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push('-movflags', '+faststart', outFile);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg saiu com código ' + c)))));
  const t0 = Date.now();
  try {
    for (let i = 0; i < total; i++) {
      const buf = await eng.frame(i / TL.fps);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (onProgress && i % 30 === 0) onProgress(i, total, (Date.now() - t0) / 1000);
    }
  } finally {
    ff.stdin.end();
    await eng.close();
  }
  await done;
  return outFile;
}

// Uso: node src/render.js timeline.json out.mp4  |  node src/render.js timeline.json --stills dir 0,2.5,5
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const TL = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  if (process.argv[3] === '--stills') {
    const dir = process.argv[4];
    fs.mkdirSync(dir, { recursive: true });
    const eng = await openEngine(TL);
    for (const t of process.argv[5].split(',').map(Number)) {
      const s = Date.now();
      fs.writeFileSync(path.join(dir, `t${t}.jpg`), await eng.frame(t));
      console.log('quadro', t, (Date.now() - s) + 'ms');
    }
    await eng.close();
  } else {
    await renderVideo(TL, process.argv[3], { onProgress: (i, n, s) => console.log(`${i}/${n} ${s.toFixed(0)}s`) });
  }
}
