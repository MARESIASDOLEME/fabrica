// Legendas ASS (queimadas no vídeo) — fonte Fredoka, contorno grosso, cor por personagem
import fs from 'node:fs';

const tc = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = (s % 60).toFixed(2).padStart(5, '0');
  return `${h}:${String(m).padStart(2, '0')}:${sec}`;
};
const assColor = (hex) => { const h = hex.replace('#', ''); return `&H00${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase(); };
const esc = (t) => t.replace(/[{}]/g, '').replace(/\n/g, ' ');

function pedacos(texto, max = 30) {
  const palavras = texto.split(/\s+/);
  const out = [];
  let cur = '';
  for (const p of palavras) {
    if ((cur + ' ' + p).trim().length > max && cur) { out.push(cur); cur = p; } else cur = (cur + ' ' + p).trim();
  }
  if (cur) out.push(cur);
  return out;
}

// linhas: [{start,end,text,color}], topo: {text, start, end}
const TEMAS = {
  // legenda de jogo de mundo aberto: fonte pesada, contorno preto grosso, sem caixa; cartão final em faixa escura
  gta: `Style: Fala,Inter Display Black,78,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,1,0,1,6,2,2,90,90,560,1
Style: Escolha,Inter Display Black,72,&H00FFFFFF,&H00FFFFFF,&H00000000,&HB4000000,-1,0,0,0,100,100,1,0,3,30,0,5,90,90,0,1
Style: Chamada,Inter Display Black,56,&H0000C8FF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,1,0,1,5,2,2,90,90,300,1
Style: Topo,Inter Display Black,62,&H0000C8FF,&H00FFFFFF,&H00000000,&HB4000000,-1,0,0,0,100,100,1,0,3,20,0,8,120,120,230,1`,
};
export function gerarASS({ linhas, topo, escolha, saida, tema, W = 1080, H = 1920 }) {
  const head = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${TEMAS[tema] || `Style: Fala,Fredoka,80,&H00FFFFFF,&H00FFFFFF,&H00141414,&H64000000,-1,0,0,0,100,100,0,0,1,7,0,2,90,90,560,1
Style: Escolha,Fredoka,74,&H00FFFFFF,&H00FFFFFF,&H00141414,&HC8000000,-1,0,0,0,100,100,0,0,3,26,0,5,90,90,0,1
Style: Chamada,Fredoka,58,&H004BB8F2,&H00FFFFFF,&H00141414,&H00000000,-1,0,0,0,100,100,0,0,1,6,0,2,90,90,300,1
Style: Topo,Fredoka,64,&H00141414,&H00FFFFFF,&H00FFFFFF,&H00FFFFFF,-1,0,0,0,100,100,0,0,3,18,0,8,120,120,230,1`}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const ev = [];
  if (topo && topo.text) ev.push(`Dialogue: 1,${tc(topo.start)},${tc(topo.end)},Topo,,0,0,0,,${esc(topo.text)}`);
  if (escolha && escolha.opcoes) {
    // cartão final A/B: tela escurece e as duas opções aparecem centralizadas
    ev.push(`Dialogue: 2,${tc(escolha.start)},${tc(escolha.end)},Escolha,,0,0,0,,{\\an5\\pos(${W / 2},${H / 2})\\p1\\bord0\\1c&H000000&\\1a&H40&\\fad(300,0)}m ${-W / 2} ${-H / 2} l ${W / 2} ${-H / 2} ${W / 2} ${H / 2} ${-W / 2} ${H / 2}{\\p0}`);
    const y0 = H / 2 - 170;
    escolha.opcoes.slice(0, 2).forEach((o, i) => {
      const cor = i === 0 ? '&H5A80FF&' : '&HC9DC7F&';
      ev.push(`Dialogue: 3,${tc(escolha.start + 0.3 + i * 0.35)},${tc(escolha.end)},Escolha,,0,0,0,,{\\an5\\pos(${W / 2},${y0 + i * 300})\\3c${cor}\\fad(200,0)}${esc(o.letra || 'AB'[i])} — ${esc(o.rotulo || '')}`);
    });
    ev.push(`Dialogue: 3,${tc(escolha.start + 1.0)},${tc(escolha.end)},Chamada,,0,0,0,,{\\fad(200,0)}${esc(escolha.chamada || 'COMENTA A OU B · A MAIS VOTADA DECIDE')}`);
    if (escolha.pergunta && escolha.mostrar_pergunta) ev.push(`Dialogue: 3,${tc(escolha.start + 0.1)},${tc(escolha.end)},Topo,,0,0,0,,{\\fad(200,0)}${esc(escolha.pergunta)}`);
  }
  for (const l of linhas) {
    const ps = pedacos(l.text);
    const total = ps.reduce((a, p) => a + p.length, 0);
    let t = l.start;
    for (const p of ps) {
      const d = (l.end - l.start) * (p.length / total);
      ev.push(`Dialogue: 0,${tc(t)},${tc(t + d)},Fala,,0,0,0,,{\\c${assColor(l.color || '#ffffff')}\\fad(60,0)}${esc(p)}`);
      t += d;
    }
  }
  fs.writeFileSync(saida, head + ev.join('\n') + '\n');
  return saida;
}
