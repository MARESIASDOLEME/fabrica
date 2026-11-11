import * as THREE from 'three';

// Paleta "cartoon": sombreamento em 3 faixas, sem brilho especular.
const grad = (() => {
  const d = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const cache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!opts.map && cache.has(key)) return cache.get(key);
  const m = new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: grad, ...opts });
  if (!opts.map) cache.set(key, m);
  return m;
}
export function flat(color) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
}

export function mesh(geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale) {
  const m = new THREE.Mesh(geo, typeof material === 'string' ? mat(material) : material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  if (scale) m.scale.set(...(Array.isArray(scale) ? scale : [scale, scale, scale]));
  return m;
}
export const box = (w, h, d, c, pos, rot) => mesh(new THREE.BoxGeometry(w, h, d), c, pos, rot);
export const cyl = (rt, rb, h, c, pos, rot, seg = 16) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c, pos, rot);
export const sph = (r, c, pos, scale) => mesh(new THREE.SphereGeometry(r, 20, 14), c, pos, [0, 0, 0], scale);
export const cap = (r, len, c, pos, rot) => mesh(new THREE.CapsuleGeometry(r, len, 6, 12), c, pos, rot);

// Placa com texto (canvas → textura)
export function textTexture(text, { bg = '#f2c230', fg = '#1a1a1a', w = 1024, h = 256, font = 'bold 150px sans-serif', sub, subFont = 'bold 70px sans-serif' } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = font;
  let size = parseInt(font.match(/(\d+)px/)[1]);
  while (g.measureText(text).width > w * 0.9 && size > 20) { size -= 6; g.font = font.replace(/\d+px/, size + 'px'); }
  g.fillText(text, w / 2, sub ? h * 0.38 : h / 2);
  if (sub) { g.font = subFont; g.fillText(sub, w / 2, h * 0.78); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export function sign(text, w, h, opts = {}) {
  const tex = textTexture(text, { w: 1024, h: Math.round(1024 * h / w), ...opts });
  return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

export function canvasTexture(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

// Gerador pseudo-aleatório determinístico (mesmo episódio = mesmo vídeo)
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
