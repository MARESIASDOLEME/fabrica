import * as THREE from 'three';
import { mat, flat, mesh, box, cyl, sph, cap, sign, canvasTexture, textTexture, rng } from './toon.js';

// Paletas por horário
export const TIMES = {
  dia:    { skyTop: '#5fb4ff', skyBot: '#cdeeff', sun: 1.15, amb: 0.95, sea: '#1f8fb3', fog: '#cdeeff' },
  tarde:  { skyTop: '#ff8a5c', skyBot: '#ffd59a', sun: 1.0, amb: 0.85, sea: '#2f7f9a', fog: '#ffd59a' },
  noite:  { skyTop: '#0e1640', skyBot: '#33416e', sun: 0.35, amb: 0.55, sea: '#13314a', fog: '#33416e' },
  // apagão: cidade sem luz; o escurecimento e a lanterna ficam no pós-processamento (engine.js)
  apagao: { skyTop: '#05070d', skyBot: '#10141f', sun: 0.12, amb: 0.3, sea: '#070b12', fog: '#10141f', apagao: true },
};

function skyTexture(p) {
  return canvasTexture(16, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, p.skyTop); gr.addColorStop(1, p.skyBot);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

// Vista do Rio (para janelas e fundo)
export function rioView(p, w = 1024, h = 512) {
  return canvasTexture(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, p.skyTop); gr.addColorStop(1, p.skyBot);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3e7a4f';
    g.beginPath(); g.moveTo(0, h * 0.75);
    // morros + Pão de Açúcar
    const pts = [[0.05, 0.55], [0.18, 0.45], [0.3, 0.62], [0.55, 0.7], [0.68, 0.3], [0.74, 0.25], [0.8, 0.45], [0.84, 0.55], [0.9, 0.42], [0.95, 0.4], [1, 0.6]];
    pts.forEach(([x, y]) => g.lineTo(x * w, y * h));
    g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 4; g.stroke();
    g.fillStyle = p.sea; g.fillRect(0, h * 0.78, w, h * 0.22);
    const r = rng(7);
    for (let i = 0; i < 22; i++) {
      const bw = 30 + r() * 40, bh = 40 + r() * 120, x = r() * w;
      g.fillStyle = ['#f3e9d2', '#e8c07a', '#d98e6b', '#c7d6e0', '#ffffff'][i % 5];
      g.fillRect(x, h * 0.8 - bh, bw, bh + h * 0.2);
      g.strokeRect(x, h * 0.8 - bh, bw, bh + h * 0.2);
      if (p.sun < 0.5 && !p.apagao) { g.fillStyle = '#ffd86b'; for (let k = 0; k < 6; k++) g.fillRect(x + 6 + (k % 2) * 14, h * 0.8 - bh + 10 + Math.floor(k / 2) * 22, 8, 10); }
    }
  });
}

function base(p) {
  const scene = new THREE.Scene();
  scene.background = skyTexture(p);
  scene.add(new THREE.HemisphereLight('#ffffff', '#887766', p.amb));
  const sun = new THREE.DirectionalLight('#ffffff', p.sun * 1.6);
  sun.position.set(5, 10, 6);
  scene.add(sun);
  scene.add(new THREE.AmbientLight('#ffffff', 0.25));
  return scene;
}

function room(scene, { w, d, h, wall, wall2, floor, ceiling = '#f4f1ea' }) {
  scene.add(box(w, 0.1, d, floor, [0, -0.05, 0]));
  scene.add(mesh(new THREE.BoxGeometry(w, 0.1, d), flat(ceiling), [0, h + 0.05, 0]));
  scene.add(box(w, h, 0.1, wall, [0, h / 2, -d / 2]));
  scene.add(box(w, h, 0.1, wall2 || wall, [0, h / 2, d / 2]));
  scene.add(box(0.1, h, d, wall2 || wall, [-w / 2, h / 2, 0]));
  scene.add(box(0.1, h, d, wall, [w / 2, h / 2, 0]));
  // rodapé
  scene.add(box(w, 0.12, 0.04, '#5b4636', [0, 0.06, -d / 2 + 0.07]));
  // luminárias
  for (let z = -d / 2 + 1.5; z < d / 2; z += 3) {
    scene.add(mesh(new THREE.BoxGeometry(0.5, 0.05, 1.2), flat('#ffffff'), [0, h - 0.03, z]));
  }
}

function windowView(p, w, h, pos, rotY = 0) {
  const g = new THREE.Group();
  const view = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: rioView(p) }));
  g.add(view);
  g.add(box(w + 0.16, 0.08, 0.12, '#fafafa', [0, h / 2, 0.02]));
  g.add(box(w + 0.16, 0.08, 0.12, '#fafafa', [0, -h / 2, 0.02]));
  g.add(box(0.08, h, 0.12, '#fafafa', [-w / 2, 0, 0.02]));
  g.add(box(0.08, h, 0.12, '#fafafa', [w / 2, 0, 0.02]));
  g.add(box(0.05, h, 0.06, '#fafafa', [0, 0, 0.02]));
  g.position.set(...pos); g.rotation.y = rotY;
  return g;
}

function plant(pos, s = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.18, 0.14, 0.35, '#b5653a', [0, 0.175, 0]));
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const l = sph(0.2, '#3f9b4f', [Math.cos(a) * 0.12, 0.6 + (i % 2) * 0.15, Math.sin(a) * 0.12], [0.5, 1.4, 0.5]);
    l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    g.add(l);
  }
  g.position.set(...pos); g.scale.setScalar(s);
  return g;
}

function palm(pos, s = 1, r = Math.random) {
  const g = new THREE.Group();
  const h = 5 + r() * 2;
  for (let i = 0; i < 6; i++) g.add(cyl(0.16 - i * 0.012, 0.18 - i * 0.012, h / 6 + 0.02, '#8a6a45', [Math.sin(i * 0.4) * 0.15 * i / 3, h / 12 + i * h / 6, 0]));
  const top = new THREE.Group(); top.position.set(0.3, h, 0); g.add(top);
  for (let i = 0; i < 7; i++) {
    const leaf = sph(1, '#2f8f4a', [0, 0, 0], [1.4, 0.08, 0.32]);
    leaf.position.set(Math.cos(i / 7 * 6.28) * 1.1, -0.3, Math.sin(i / 7 * 6.28) * 1.1);
    leaf.rotation.set(0, -i / 7 * 6.28, -0.35);
    top.add(leaf);
  }
  top.add(sph(0.25, '#5d7a2f', [0, 0, 0]));
  g.position.set(...pos); g.scale.setScalar(s);
  return { g, top };
}

function umbrella(pos, color, r) {
  const g = new THREE.Group();
  g.add(cyl(0.03, 0.03, 2.2, '#eee', [0, 1.1, 0]));
  g.add(mesh(new THREE.ConeGeometry(1.2, 0.5, 8), color, [0, 2.3, 0]));
  g.add(box(0.6, 0.1, 1.6, '#f2f2f2', [0.8, 0.25, 0.3], [0, 0.4, 0])); // cadeira/canga
  g.position.set(...pos); g.rotation.y = r() * 3;
  return g;
}

function building(x, z, w, d, h, color, p, r) {
  const g = new THREE.Group();
  g.add(box(w, h, d, color, [0, h / 2, 0]));
  const lit = p.sun < 0.5;
  for (let y = 1.5; y < h - 1; y += 2.2) {
    for (let k = -w / 2 + 0.8; k < w / 2 - 0.4; k += 1.6) {
      const on = lit && r() > 0.45;
      g.add(box(0.8, 1.1, 0.05, on ? '#ffd86b' : '#3a5a7a', [k + 0.2, y, d / 2 + 0.03]));
      if (r() > 0.6) g.add(box(1.0, 0.08, 0.5, '#e8e8e8', [k + 0.2, y - 0.6, d / 2 + 0.25]));
    }
  }
  g.position.set(x, 0, z);
  return g;
}

function sea(scene, p, z0, width = 600) {
  const waves = [];
  scene.add(box(width, 0.2, 400, p.sea, [0, -0.2, z0 - 200]));
  for (let i = 0; i < 4; i++) {
    const w = box(width, 0.06, 0.25 + i * 0.05, '#ffffff', [0, -0.05, z0 - 1 - i * 4]);
    scene.add(w); waves.push(w);
  }
  return (t) => waves.forEach((w, i) => {
    const ph = (t * 0.25 + i * 0.25) % 1;
    w.position.z = z0 - 0.5 - ph * 14;
    w.scale.z = 1 - ph * 0.6;
  });
}

// Pão de Açúcar estilizado ao fundo
function mountains(scene, p, zFar = -140) {
  const green = p.sun < 0.5 ? '#1f3b2e' : '#3e7a4f';
  const m = (x, z, r, h, sx = 1) => {
    const s = sph(r, green, [x, 0, z], [sx, h / r, 1]);
    scene.add(s);
  };
  m(-70, zFar, 18, 45, 0.9);
  m(-48, zFar + 10, 10, 22, 1.2);
  m(60, zFar - 20, 40, 30, 1.6);
  m(110, zFar, 25, 38, 1);
  m(-130, zFar - 10, 35, 30, 1.6);
}

function calcadaoTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b1b1b';
    for (let band = 0; band < 2; band++) {
      g.beginPath();
      const y0 = band * h / 2;
      g.moveTo(0, y0);
      for (let x = 0; x <= w; x += 4) g.lineTo(x, y0 + h / 4 + Math.sin(x / w * Math.PI * 2) * h / 8);
      for (let x = w; x >= 0; x -= 4) g.lineTo(x, y0 + h / 8 + Math.sin(x / w * Math.PI * 2) * h / 8 - h / 16);
      g.closePath(); g.fill();
    }
  }, [1, 1]);
}

// ---------------- CENÁRIOS ----------------
export const SETS = {
  // Orla de Copacabana: calçadão em ondas, areia, mar, morros
  calcadao(params, r) {
    const p = TIMES[params.horario] || TIMES.dia;
    const scene = base(p);
    const tex = calcadaoTexture();
    tex.repeat.set(30, 1.2);
    // calçadão (z de -1 a 4), ciclovia, rua, prédios atrás
    scene.add(mesh(new THREE.BoxGeometry(120, 0.1, 5), mat('#ffffff', { map: tex }), [0, -0.05, 1.5]));
    scene.add(box(120, 0.1, 1.5, '#c0392b', [0, -0.04, 4.75]));
    scene.add(box(120, 0.1, 6, '#3b3b3b', [0, -0.06, 8.5]));
    for (let x = -60; x < 60; x += 4) scene.add(box(1.8, 0.02, 0.15, '#f5f5f5', [x, 0.0, 8.5]));
    const colors = ['#f3e9d2', '#e8c07a', '#d98e6b', '#c7d6e0', '#ffffff', '#f2b5a0'];
    for (let x = -60; x < 60; x += 9) scene.add(building(x, 16, 8.5, 6, 12 + r() * 22, colors[Math.floor(r() * colors.length)], p, r));
    // areia
    scene.add(box(160, 0.1, 18, '#f1d79a', [0, -0.1, -9.9]));
    const tick = sea(scene, p, -19);
    mountains(scene, p);
    const palms = [];
    for (let x = -50; x < 50; x += 9) { const pl = palm([x, 0, -0.6], 1, r); scene.add(pl.g); palms.push(pl); }
    const uc = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#ff7f50', '#9b59b6'];
    for (let i = 0; i < 26; i++) scene.add(umbrella([(r() - 0.5) * 80, 0, -4 - r() * 11], uc[i % uc.length], r));
    // quiosque
    const k = new THREE.Group();
    k.add(cyl(1.6, 1.6, 2.4, '#ffffff', [0, 1.2, 0], [0, 0, 0], 8));
    k.add(mesh(new THREE.ConeGeometry(2.6, 0.9, 8), '#2e86de', [0, 2.9, 0]));
    const ks = sign(params.placa || 'QUIOSQUE', 2.4, 0.5, { bg: '#2e86de', fg: '#ffffff' });
    ks.position.set(0, 2.1, 1.62); k.add(ks);
    for (let i = 0; i < 4; i++) k.add(box(0.5, 0.05, 0.5, '#f39c12', [-2.5 + i * 1.6, 0.75, 2.6]), cyl(0.04, 0.04, 0.75, '#888', [-2.5 + i * 1.6, 0.37, 2.6]));
    k.position.set(params.quiosqueX ?? 6, 0, -2.2);
    scene.add(k);
    // sol/lua
    scene.add(mesh(new THREE.SphereGeometry(6, 20, 12), flat(p.sun < 0.5 ? '#f5f3ce' : '#fff4c2'), [40, 45, -180]));
    return { scene, update: (t) => { tick(t); palms.forEach((pl, i) => { pl.top.rotation.z = Math.sin(t * 1.3 + i) * 0.04; }); } };
  },

  // Recepção de hostel
  recepcao(params, r) {
    const p = TIMES[params.horario] || TIMES.dia;
    const scene = base(p);
    room(scene, { w: 8, d: 9, h: 3, wall: params.parede || '#f6d7a7', wall2: '#e9e2d0', floor: '#b98b5e' });
    // balcão
    scene.add(box(4.2, 1.1, 0.7, params.balcao || '#2a9d8f', [0, 0.55, -2.6]));
    scene.add(box(4.4, 0.08, 0.85, '#f5efe0', [0, 1.14, -2.6]));
    scene.add(box(0.5, 0.35, 0.05, '#222', [-1.2, 1.36, -2.75], [-0.2, 0, 0]));
    scene.add(cyl(0.09, 0.11, 0.08, '#d4af37', [1.1, 1.22, -2.4]));
    scene.add(sph(0.03, '#d4af37', [1.1, 1.28, -2.4]));
    // placa
    const s = sign(params.placa || 'HOSTEL', 3.2, 0.7, { bg: '#e76f51', fg: '#fff' });
    s.position.set(0, 2.45, -4.43); scene.add(s);
    // quadro de chaves
    scene.add(box(1.2, 0.7, 0.05, '#7a5230', [2.5, 1.7, -4.42]));
    for (let i = 0; i < 8; i++) scene.add(sph(0.035, '#d4af37', [2.1 + (i % 4) * 0.26, 1.85 - Math.floor(i / 4) * 0.3, -4.37]));
    // mural / mapa
    const mapa = sign(params.mural || 'RIO', 1.4, 1.0, { bg: '#fdf6e3', fg: '#e76f51', font: 'bold 200px sans-serif' });
    mapa.position.set(-2.6, 1.7, -4.43); scene.add(mapa);
    scene.add(windowView(p, 2.2, 1.5, [-3.94, 1.6, 0], Math.PI / 2));
    scene.add(plant([3.4, 0, -3.8], 1.2), plant([-3.4, 0, -3.8], 1));
    // sofá
    scene.add(box(2, 0.45, 0.8, '#e9c46a', [2.6, 0.22, 1.5], [0, -Math.PI / 2, 0]));
    scene.add(box(2, 0.6, 0.2, '#e9c46a', [3.55, 0.6, 1.5], [0, -Math.PI / 2, 0]));
    // porta de entrada atrás
    scene.add(box(1.2, 2.2, 0.08, '#264653', [0, 1.1, 4.45]));
    return { scene, update: () => {} };
  },

  // Quarto compartilhado com beliches
  quarto(params, r) {
    const p = TIMES[params.horario] || TIMES.dia;
    const scene = base(p);
    room(scene, { w: 6, d: 7, h: 2.9, wall: params.parede || '#cde7e3', wall2: '#f0ede4', floor: '#a9784f' });
    const bunk = (x, z, rot, c) => {
      const g = new THREE.Group();
      for (const [bx, bz] of [[-0.95, -0.45], [0.95, -0.45], [-0.95, 0.45], [0.95, 0.45]]) g.add(box(0.08, 2.1, 0.08, '#4a4e69', [bx, 1.05, bz]));
      for (const y of [0.45, 1.5]) {
        g.add(box(2, 0.1, 1, '#4a4e69', [0, y, 0]));
        g.add(box(1.9, 0.18, 0.9, '#ffffff', [0, y + 0.14, 0]));
        g.add(box(0.5, 0.12, 0.6, '#f8f8f8', [-0.65, y + 0.29, 0]));
        g.add(box(1.2, 0.06, 0.92, c, [0.3, y + 0.25, 0]));
      }
      g.add(box(1.9, 0.06, 0.04, '#4a4e69', [0, 1.85, 0.46]));
      g.position.set(x, 0, z); g.rotation.y = rot;
      return g;
    };
    scene.add(bunk(-2.4, -1.5, Math.PI / 2, '#e76f51'), bunk(-2.4, 1.2, Math.PI / 2, '#2a9d8f'), bunk(2.4, -1.5, -Math.PI / 2, '#e9c46a'));
    for (let i = 0; i < 4; i++) scene.add(box(0.5, 1.8, 0.5, '#8d99ae', [-0.75 + i * 0.52, 0.9, -3.2]), sph(0.03, '#333', [-0.6 + i * 0.52, 1.0, -2.94]));
    scene.add(windowView(p, 1.6, 1.2, [2.94, 1.6, 1.4], -Math.PI / 2));
    scene.add(box(0.5, 0.6, 0.3, '#f4a261', [1.6, 0.3, 0.4]), box(0.5, 0.6, 0.3, '#3d5a80', [0.4, 0.3, 1.8], [0, 0.6, 0]));
    return { scene, update: () => {} };
  },

  // Rua da Lapa: casarões coloridos, arcos ao fundo, varal de luzes
  lapa(params, r) {
    const p = TIMES[params.horario] || TIMES.noite;
    const scene = base(p);
    scene.add(box(14, 0.1, 80, '#6b6b6b', [0, -0.05, -20]));
    scene.add(box(3, 0.16, 80, '#bdb6a8', [-6.5, 0.02, -20]));
    scene.add(box(3, 0.16, 80, '#bdb6a8', [6.5, 0.02, -20]));
    const cols = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#8ecae6', '#ffb4a2', '#b5e48c'];
    for (let z = 10; z > -55; z -= 6) {
      for (const side of [-1, 1]) {
        const h = 7 + r() * 4;
        const g = new THREE.Group();
        g.add(box(6, h, 4, cols[Math.floor(r() * cols.length)], [0, h / 2, 0]));
        for (let i = 0; i < 2; i++) {
          g.add(box(0.9, 2, 0.1, p.sun < 0.5 && r() > 0.4 ? '#ffd86b' : '#3a3a55', [-side * 3.03, 1.3 + i * 3.2, -1 + i * 2], [0, side * Math.PI / 2, 0]));
          g.add(box(0.9, 2, 0.1, '#3a3a55', [-side * 3.03, 4.5, 1], [0, side * Math.PI / 2, 0]));
        }
        g.position.set(side * 10, 0, z);
        scene.add(g);
      }
    }
    // arcos
    const arches = new THREE.Group();
    for (let i = -6; i <= 6; i++) {
      arches.add(box(1.4, 14, 2, '#f5f5f5', [i * 5, 7, 0]));
    }
    arches.add(box(70, 3, 2, '#f5f5f5', [0, 15, 0]));
    for (let i = -6; i < 6; i++) {
      const a = mesh(new THREE.TorusGeometry(1.8, 0.7, 6, 16, Math.PI), '#f5f5f5', [i * 5 + 2.5, 12.2, 0]);
      arches.add(a);
    }
    arches.position.set(0, 0, -62);
    scene.add(arches);
    // varal de lâmpadas
    const bulbs = [];
    for (let z = 5; z > -40; z -= 5) {
      for (let i = 0; i <= 10; i++) {
        const x = -8 + i * 1.6;
        const b = mesh(new THREE.SphereGeometry(0.12, 8, 6), flat('#ffe08a'), [x, 5.5 - Math.sin(i / 10 * Math.PI) * 0.8, z]);
        scene.add(b); bulbs.push(b);
      }
    }
    return { scene, update: (t) => bulbs.forEach((b, i) => b.material.color.set(Math.sin(t * 3 + i) > 0.85 ? '#fff6d0' : '#ffd166')) };
  },

  // Desembarque (aeroporto / rodoviária)
  desembarque(params, r) {
    const p = TIMES[params.horario] || TIMES.dia;
    const scene = base(p);
    room(scene, { w: 16, d: 24, h: 5, wall: '#e8edf2', wall2: '#dfe6ec', floor: '#cfd8dc', ceiling: '#f7f9fa' });
    for (let x = -6; x <= 6; x += 3) scene.add(windowView(p, 2.8, 3, [x, 2.4, -11.93]));
    const s1 = sign(params.placa || 'DESEMBARQUE', 4, 0.8, { bg: '#1d3557', fg: '#ffd166' });
    s1.position.set(0, 4.2, -6); scene.add(s1);
    scene.add(box(0.06, 0.8, 0.06, '#888', [-1.5, 4.7, -6]), box(0.06, 0.8, 0.06, '#888', [1.5, 4.7, -6]));
    const s2 = sign('SAÍDA  →', 2.2, 0.5, { bg: '#2a9d8f', fg: '#fff' });
    s2.position.set(5, 3.2, -11.9); scene.add(s2);
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 4; k++) { g.add(box(0.55, 0.08, 0.55, '#457b9d', [k * 0.6, 0.48, 0]), box(0.55, 0.55, 0.08, '#457b9d', [k * 0.6, 0.75, -0.27])); }
      g.add(box(2.4, 0.05, 0.1, '#aaa', [0.9, 0.3, 0]));
      g.position.set(i % 2 ? 3.5 : -6, 0, 2 + Math.floor(i / 2) * 3);
      scene.add(g);
    }
    // esteira de bagagem
    scene.add(box(6, 0.5, 1.6, '#555', [-3, 0.25, -3]));
    const bags = [];
    for (let i = 0; i < 5; i++) { const b = box(0.6, 0.4, 0.4, ['#e63946', '#ffb703', '#219ebc', '#8338ec', '#2a9d8f'][i], [-5 + i * 1.2, 0.7, -3]); scene.add(b); bags.push(b); }
    return { scene, update: (t) => bags.forEach((b, i) => { b.position.x = -5.7 + ((i * 1.2 + t * 0.6) % 6); }) };
  },
};

export const SET_CATALOG = {
  calcadao: 'Orla de Copacabana: calçadão de ondas pretas e brancas, areia com guarda-sóis, mar, morros e quiosque. Câmera no calçadão (y≈1.6, z≈1.5) olhando para o mar (-z) ou para os lados (±x). Quiosque em x=quiosqueX (padrão 6), z=-2.2.',
  recepcao: 'Recepção de hostel: balcão em z=-2.6, placa acima (param "placa"), quadro de chaves, mural, sofá, porta de entrada atrás (z=4.4). Recepcionista fica atrás do balcão em z≈-3.2. Câmera entra pela porta (z≈3.5) e vai até o balcão (z≈-1.6).',
  quarto: 'Quarto compartilhado: 3 beliches nas laterais (x=±2.4), armários ao fundo (z=-3.2), janela com vista. Câmera no centro (x≈0, z≈2.5).',
  lapa: 'Rua da Lapa (noite por padrão): casarões coloridos dos dois lados, varal de lâmpadas, arcos brancos ao fundo (z=-62). Câmera caminha pelo meio da rua no eixo -z.',
  desembarque: 'Saguão de desembarque (aeroporto/rodoviária): placa central (param "placa"), esteira de bagagem em z=-3, cadeiras, janelões ao fundo com vista do Rio, placa SAÍDA. Câmera começa em z≈8.',
};

// ================= CENÁRIOS DA SÉRIE (hostel genérico + Rio) =================
// Figura simples de figurante (multidão), barata de renderizar
function fig(pos, { shirt = '#e76f51', skin = '#c98e62', up = false, rot = 0, s = 1 } = {}) {
  const g = new THREE.Group();
  g.add(box(0.14, 0.8, 0.14, '#2b2d42', [-0.1, 0.4, 0]), box(0.14, 0.8, 0.14, '#2b2d42', [0.1, 0.4, 0]));
  g.add(cap(0.2, 0.4, shirt, [0, 1.1, 0]));
  g.add(sph(0.17, skin, [0, 1.6, 0]));
  const arm = (side) => cap(0.06, 0.45, shirt, up ? [side * 0.28, 1.55, 0] : [side * 0.26, 1.05, 0], up ? [0, 0, -side * 0.25] : [0, 0, side * 0.1]);
  g.add(arm(-1), arm(1));
  g.position.set(...pos); g.rotation.y = rot; g.scale.setScalar(s);
  return g;
}
const SKINS = ['#f1cfb1', '#c98e62', '#8a5a3c', '#5a3a28', '#e0b08a'];
const SHIRTS = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#8ecae6', '#ffffff', '#b5e48c', '#9b5de5', '#264653'];
function crowd(scene, n, area, r, { up = 0.2, ground = () => 0, face } = {}) {
  for (let i = 0; i < n; i++) {
    const x = area[0] + r() * (area[1] - area[0]), z = area[2] + r() * (area[3] - area[2]);
    const rot = face ? Math.atan2(face[0] - x, face[1] - z) : r() * 6.28;
    scene.add(fig([x, ground(x, z), z], { shirt: SHIRTS[Math.floor(r() * SHIRTS.length)], skin: SKINS[Math.floor(r() * SKINS.length)], up: r() < up, rot, s: 0.92 + r() * 0.15 }));
  }
}
function flagTexture(kind) {
  return canvasTexture(300, 200, (g, w, h) => {
    if (kind === 'brasil') {
      g.fillStyle = '#009c3b'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffdf00'; g.beginPath(); g.moveTo(w / 2, 18); g.lineTo(w - 22, h / 2); g.lineTo(w / 2, h - 18); g.lineTo(22, h / 2); g.fill();
      g.fillStyle = '#002776'; g.beginPath(); g.arc(w / 2, h / 2, 50, 0, 6.29); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.beginPath(); g.arc(w / 2 + 40, h / 2 + 140, 160, 3.75, 4.6); g.stroke();
    } else { // jamaica
      g.fillStyle = '#009b3a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#000000';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, h / 2); g.lineTo(0, h); g.fill();
      g.beginPath(); g.moveTo(w, 0); g.lineTo(w / 2, h / 2); g.lineTo(w, h); g.fill();
      g.strokeStyle = '#fed100'; g.lineWidth = 34; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
    }
  });
}
function flag(pos, kind, { pole = 3, w = 1.5 } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.04, 0.05, pole, '#dddddd', [0, pole / 2, 0]));
  const f = mesh(new THREE.PlaneGeometry(w, w * 0.66, 8, 1), new THREE.MeshBasicMaterial({ map: flagTexture(kind), side: THREE.DoubleSide }), [w / 2, pole - w * 0.33, 0]);
  g.add(f);
  g.position.set(...pos);
  const base0 = f.geometry.attributes.position.array.slice();
  return { g, tick: (t) => { const a = f.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const x = base0[i * 3]; a.setZ(i, Math.sin(t * 4 + x * 3) * 0.08 * (x + w / 2) / w); } a.needsUpdate = true; } };
}
function cat(pos, rotY = 0) {
  const g = new THREE.Group();
  g.add(sph(0.16, '#f7f7f2', [0, 0.16, 0], [1, 1, 1.5]));
  g.add(sph(0.11, '#f7f7f2', [0, 0.36, 0.17]));
  g.add(mesh(new THREE.ConeGeometry(0.04, 0.08, 4), '#f7f7f2', [-0.06, 0.47, 0.17]), mesh(new THREE.ConeGeometry(0.04, 0.08, 4), '#f7f7f2', [0.06, 0.47, 0.17]));
  g.add(sph(0.018, '#2a9d8f', [-0.04, 0.38, 0.27]), sph(0.018, '#2a9d8f', [0.04, 0.38, 0.27]));
  const tail = new THREE.Group(); tail.position.set(0, 0.1, -0.2);
  tail.add(cyl(0.025, 0.025, 0.32, '#f7f7f2', [0, 0.14, -0.04], [-0.3, 0, 0]));
  g.add(tail);
  g.position.set(...pos); g.rotation.y = rotY;
  return { g, tick: (t) => { tail.rotation.z = Math.sin(t * 1.7) * 0.5; } };
}
function parrotCage(pos) {
  const g = new THREE.Group();
  g.add(cyl(0.03, 0.03, 1.3, '#555', [0, 0.65, 0]), cyl(0.3, 0.3, 0.04, '#555', [0, 0.02, 0]));
  g.add(cyl(0.32, 0.32, 0.04, '#c9a227', [0, 1.3, 0]), mesh(new THREE.ConeGeometry(0.34, 0.3, 16), '#c9a227', [0, 2.05, 0]));
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; g.add(cyl(0.008, 0.008, 0.6, '#c9a227', [Math.cos(a) * 0.32, 1.6, Math.sin(a) * 0.32])); }
  g.add(cyl(0.32, 0.32, 0.03, '#c9a227', [0, 1.9, 0]));
  g.add(cyl(0.012, 0.012, 0.5, '#7a5230', [0, 1.5, 0], [0, 0, Math.PI / 2]));
  const bird = new THREE.Group(); bird.position.set(0, 1.52, 0);
  bird.add(sph(0.08, '#2bb24c', [0, 0.1, 0], [1, 1.4, 1]));
  bird.add(sph(0.06, '#2bb24c', [0, 0.25, 0.02]));
  bird.add(mesh(new THREE.ConeGeometry(0.025, 0.06, 6), '#f2c230', [0, 0.23, 0.08], [Math.PI / 2, 0, 0]));
  bird.add(sph(0.03, '#e63946', [0, 0.22, 0.05]));
  bird.add(box(0.05, 0.16, 0.02, '#1f6fb2', [0, 0.0, -0.07], [0.4, 0, 0]));
  g.add(bird);
  g.position.set(...pos);
  return { g, tick: (t) => { bird.rotation.y = Math.sin(t * 0.9) * 0.6; bird.position.y = 1.52 + Math.abs(Math.sin(t * 2.3)) * 0.02; } };
}
function uniformedTable(scene, x, z, len = 3) {
  scene.add(box(len, 0.06, 0.9, '#a47148', [x, 0.76, z]));
  for (const dx of [-len / 2 + 0.15, len / 2 - 0.15]) for (const dz of [-0.35, 0.35]) scene.add(box(0.07, 0.76, 0.07, '#6b4a2f', [x + dx, 0.38, z + dz]));
  scene.add(box(len, 0.06, 0.3, '#8b5e3c', [x, 0.45, z - 0.75]), box(len, 0.06, 0.3, '#8b5e3c', [x, 0.45, z + 0.75]));
}
function stringLights(scene, from, to, n, colors = ['#ffe08a']) {
  const bulbs = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const p = from.map((v, j) => v + (to[j] - v) * k);
    p[1] -= Math.sin(k * Math.PI) * 0.4;
    const b = mesh(new THREE.SphereGeometry(0.07, 8, 6), flat(colors[i % colors.length]), p);
    scene.add(b); bulbs.push(b);
  }
  return bulbs;
}

Object.assign(SETS, {
  // Terraço numa torre no topo do hostel: fumódromo, gato branco morando na mureta
  terraco(params, r) {
    const p = TIMES[params.horario] || TIMES.noite;
    const scene = base(p);
    scene.add(box(8, 0.2, 8, '#9c8f80', [0, -0.1, 0]));
    for (const [x, z, w, d] of [[0, -4, 8, 0.25], [0, 4, 8, 0.25], [-4, 0, 0.25, 8], [4, 0, 0.25, 8]]) scene.add(box(w, 1.1, d, '#e9e2d0', [x, 0.55, z]));
    // casinha da escada (a câmera chega por ela)
    scene.add(box(2.2, 2.6, 1.6, '#e9e2d0', [-2.6, 1.3, 3.1]), box(0.9, 2.0, 0.06, '#264653', [-2.6, 1.0, 2.28]));
    scene.add(box(1.6, 0.45, 0.5, '#7a5230', [-3.3, 0.22, -1]), box(1.6, 0.45, 0.5, '#7a5230', [-3.3, 0.22, 1]));
    scene.add(cyl(0.18, 0.16, 0.12, '#888', [-2.9, 0.06, 0]), cyl(0.12, 0.12, 0.08, '#cfcfcf', [3.6, 1.14, 2]));
    scene.add(plant([3.5, 0, 3.4], 1.1), plant([3.5, 0, -3.4], 0.9));
    const bulbs = stringLights(scene, [-3.8, 2.6, -3.8], [3.8, 2.6, -3.8], 12);
    scene.add(cyl(0.04, 0.04, 2.7, '#555', [-3.8, 1.35, -3.8]), cyl(0.04, 0.04, 2.7, '#555', [3.8, 1.35, -3.8]));
    const gato = cat([2.6, 1.1, -3.85], Math.PI * 0.15); scene.add(gato.g);
    // cidade lá embaixo, mar e morros ao fundo
    const colors = ['#f3e9d2', '#e8c07a', '#d98e6b', '#c7d6e0', '#ffffff'];
    for (let i = 0; i < 40; i++) {
      const x = (r() - 0.5) * 120, z = -10 - r() * 50;
      const b = building(x, z, 6, 6, 8 + r() * 14, colors[i % 5], p, r); b.position.y = -24; scene.add(b);
    }
    const mar = new THREE.Group(); scene.add(mar); const tick = sea(mar, p, -70); mar.position.y = -24;
    mountains(scene, p);
    return { scene, update: (t) => { gato.tick(t); tick(t); bulbs.forEach((b, i) => b.material.color.set(Math.sin(t * 2 + i) > 0.9 ? '#fff6d0' : '#ffd166')); } };
  },

  // Sala de refeições do hostel: mesas compridas, cozinha ao fundo, gaiola com papagaio
  refeitorio(params, r) {
    const p = TIMES[params.horario] || TIMES.dia;
    const scene = base(p);
    room(scene, { w: 8, d: 9, h: 3, wall: params.parede || '#fbe3b8', wall2: '#efe6d2', floor: '#9e7451' });
    uniformedTable(scene, -1.6, -0.8, 3.2); uniformedTable(scene, 1.6, -0.8, 3.2); uniformedTable(scene, -1.6, 2.0, 3.2); uniformedTable(scene, 1.6, 2.0, 3.2);
    // bancada da cozinha
    scene.add(box(5, 0.95, 0.7, '#2a9d8f', [0.6, 0.47, -3.9]), box(5.2, 0.06, 0.8, '#f5efe0', [0.6, 0.98, -3.9]));
    scene.add(sph(0.22, '#e9c46a', [-0.8, 1.15, -3.9], [1, 0.5, 1]), sph(0.08, '#f4a261', [-0.85, 1.25, -3.85]), sph(0.08, '#e63946', [-0.7, 1.25, -3.95]), sph(0.08, '#b5e48c', [-0.9, 1.25, -4.0]));
    scene.add(box(0.4, 0.5, 0.35, '#333', [1.6, 1.25, -3.9]), cyl(0.12, 0.12, 0.6, '#c0c0c0', [2.4, 1.3, -3.9]));
    scene.add(box(4, 0.06, 0.3, '#7a5230', [0.6, 2.0, -4.3]));
    for (let i = 0; i < 8; i++) scene.add(cyl(0.05, 0.05, 0.12, SHIRTS[i % SHIRTS.length], [-1.2 + i * 0.5, 2.09, -4.3]));
    const louro = parrotCage([-3.2, 0, -3.5]); scene.add(louro.g);
    scene.add(windowView(p, 2.2, 1.5, [3.94, 1.6, 0.5], -Math.PI / 2));
    const s = sign(params.placa || 'CAFÉ DA MANHÃ 7h–10h', 2.4, 0.5, { bg: '#264653', fg: '#ffd166' }); s.position.set(-1.2, 2.45, -4.43); scene.add(s);
    return { scene, update: (t) => louro.tick(t) };
  },

  // Bar do hostel com karaokê
  bar(params, r) {
    const p = TIMES[params.horario] || TIMES.noite;
    const scene = base(p);
    room(scene, { w: 9, d: 8, h: 3, wall: params.parede || '#4b2e5c', wall2: '#3a2448', floor: '#5a3d2b', ceiling: '#2a1d33' });
    // balcão do bar à direita
    scene.add(box(0.8, 1.1, 4.5, '#7a3e2b', [3.2, 0.55, 0.3]), box(1.0, 0.06, 4.7, '#d9a066', [3.2, 1.13, 0.3]));
    scene.add(box(0.3, 1.6, 4.5, '#3a2a20', [4.3, 1.6, 0.3]));
    for (let i = 0; i < 18; i++) scene.add(cyl(0.05, 0.06, 0.3, ['#2a9d8f', '#e9c46a', '#e63946', '#8ecae6', '#ffffff'][i % 5], [4.2, 1.1 + Math.floor(i / 9) * 0.6 + 0.15, -1.6 + (i % 9) * 0.48]));
    for (let i = 0; i < 4; i++) scene.add(cyl(0.2, 0.2, 0.06, '#d9a066', [2.4, 0.75, -1.2 + i * 1.1]), cyl(0.03, 0.03, 0.75, '#333', [2.4, 0.37, -1.2 + i * 1.1]));
    // palquinho de karaokê ao fundo
    scene.add(box(4, 0.25, 1.6, '#222', [-1.2, 0.12, -3.1]));
    const lyr = canvasTexture(512, 288, (g, w, h) => {
      g.fillStyle = '#0b1f4a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff'; for (let k = 0; k < 3; k++) g.fillRect(60, 80 + k * 60, 300 + (k % 2) * 90, 26);
    });
    const tela = mesh(new THREE.PlaneGeometry(2.0, 1.12), new THREE.MeshBasicMaterial({ map: lyr }), [-1.2, 1.85, -3.93]);
    scene.add(box(2.15, 1.27, 0.08, '#111', [-1.2, 1.85, -3.97]), tela);
    const barra = mesh(new THREE.PlaneGeometry(0.1, 0.1), flat('#f72585'), [-1.6, 1.98, -3.92]); scene.add(barra);
    scene.add(cyl(0.02, 0.02, 1.4, '#999', [-1.2, 0.95, -2.6]), cyl(0.04, 0.03, 0.18, '#222', [-1.2, 1.7, -2.55], [0.6, 0, 0]));
    scene.add(box(0.5, 0.9, 0.45, '#1a1a1a', [-3.0, 0.7, -3.4]), box(0.5, 0.9, 0.45, '#1a1a1a', [0.6, 0.7, -3.4]));
    const neon = sign(params.placa || 'KARAOKÊ', 2.0, 0.5, { bg: '#1a0f24', fg: '#f72585' }); neon.position.set(-1.2, 2.72, -3.94); scene.add(neon);
    scene.add(box(2, 0.45, 0.8, '#9d4edd', [-3.4, 0.22, 1.2], [0, Math.PI / 2, 0]), box(2, 0.6, 0.2, '#9d4edd', [-4.3, 0.6, 1.2], [0, Math.PI / 2, 0]));
    const bulbs = stringLights(scene, [-4.3, 2.8, -1], [4.3, 2.8, -1], 14, ['#f72585', '#4cc9f0', '#ffd166', '#b5e48c']);
    return { scene, update: (t) => {
      const k = (t * 0.35) % 1; barra.scale.x = 1 + k * 30; barra.position.x = -1.85 + k * 1.5;
      bulbs.forEach((b, i) => { b.visible = Math.sin(t * 4 + i * 1.3) > -0.6; });
    } };
  },

  // Ladeira: o hostel fica no alto; desceu, já é a praia (câmera desce no sentido -z)
  ladeira(params, r) {
    const p = TIMES[params.horario] || TIMES.dia;
    const scene = base(p);
    const ground = (x, z) => (z > 0 ? 0 : z > -40 ? z * 0.22 : -8.8);
    const seg = 2;
    for (let z = 12; z > -40; z -= seg) {
      const y0 = ground(0, z), y1 = ground(0, z - seg);
      const len = Math.hypot(seg, y1 - y0), ang = Math.atan2(y0 - y1, seg);
      scene.add(box(6, 0.1, len, '#6b6b6b', [0, (y0 + y1) / 2 - 0.05, z - seg / 2], [ang, 0, 0]));
      for (const sx of [-1, 1]) scene.add(box(1.6, 0.16, len, '#bdb6a8', [sx * 3.8, (y0 + y1) / 2 + 0.02, z - seg / 2], [ang, 0, 0]));
      if (Math.abs(z % 4) < 0.01) scene.add(box(0.15, 0.02, 1.2, '#f5f5f5', [0, (y0 + y1) / 2 + 0.01, z - seg / 2], [ang, 0, 0]));
    }
    const cols = ['#f3e9d2', '#e9c46a', '#8ecae6', '#ffb4a2', '#b5e48c', '#f4a261', '#ffffff'];
    for (let z = 8; z > -38; z -= 5) for (const side of [-1, 1]) {
      const h = 4 + r() * 5, y = ground(0, z);
      const g = new THREE.Group();
      g.add(box(5, h + 3, 4.6, cols[Math.floor(r() * cols.length)], [0, (h - 3) / 2, 0]));
      for (let i = 0; i < 2; i++) g.add(box(0.1, 1.2, 0.9, p.sun < 0.5 && r() > 0.4 ? '#ffd86b' : '#3a5a7a', [-side * 2.52, 1.4 + i * 2.2, 0], [0, 0, 0]));
      g.add(box(0.1, 2.0, 1.0, '#7a5230', [-side * 2.52, 1.0, 1.4]));
      g.position.set(side * 7.2, y, z);
      scene.add(g);
    }
    // o hostel no alto (genérico, sem nome)
    const s = sign('HOSTEL', 2.4, 0.6, { bg: '#1f8a3c', fg: '#ffd400' }); s.position.set(-4.65, 3.2, 9); s.rotation.y = Math.PI / 2; scene.add(s);
    // lá embaixo: avenida, calçadão, areia e mar
    const tex = calcadaoTexture(); tex.repeat.set(30, 1.2);
    scene.add(box(120, 0.1, 8, '#3b3b3b', [0, -8.85, -44]));
    scene.add(mesh(new THREE.BoxGeometry(120, 0.1, 5), mat('#ffffff', { map: tex }), [0, -8.85, -50.5]));
    scene.add(box(160, 0.1, 18, '#f1d79a', [0, -8.9, -62]));
    for (let i = 0; i < 14; i++) scene.add(umbrella([(r() - 0.5) * 60, -8.85, -56 - r() * 10], ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'][i % 4], r));
    const g2 = new THREE.Group(); scene.add(g2);
    const tick = sea(g2, p, -71); g2.position.y = -8.8;
    mountains(scene, p, -180);
    return { scene, ground, update: (t) => tick(t) };
  },

  // Praia ao pé do hostel: morro à esquerda com a bandeira do Brasil no topo, caminho dos pescadores embaixo,
  // quiosque antes do caminho, bandeiras da Jamaica mais à direita (ponto de encontro), calçadão em ondas
  praia(params, r) {
    const p = TIMES[params.horario] || TIMES.dia;
    const scene = base(p);
    const tex = calcadaoTexture(); tex.repeat.set(30, 1.2);
    scene.add(mesh(new THREE.BoxGeometry(120, 0.1, 5), mat('#ffffff', { map: tex }), [0, -0.05, 1.5]));
    scene.add(box(120, 0.1, 6, '#3b3b3b', [0, -0.06, 7]));
    const colors = ['#f3e9d2', '#e8c07a', '#d98e6b', '#c7d6e0', '#ffffff'];
    for (let x = -14; x < 60; x += 9) scene.add(building(x, 14, 8.5, 6, 12 + r() * 20, colors[Math.floor(r() * 5)], p, r));
    scene.add(box(160, 0.1, 18, '#f1d79a', [0, -0.1, -9.9]));
    const tick = sea(scene, p, -19);
    // morro à esquerda
    const rock = p.sun < 0.5 ? '#2c3a2c' : '#4f6b45';
    scene.add(sph(16, rock, [-34, 0, -14], [1.1, 1.6, 1.3]));
    scene.add(sph(9, '#6b6b6b', [-24, 0, -20], [1, 0.8, 1.2]));
    const br = flag([-34, 24.5, -14], 'brasil', { pole: 4, w: 3 }); scene.add(br.g);
    // caminho dos pescadores: passarela estreita com guarda-corpo na base do morro, entrando no mar
    for (let i = 0; i < 14; i++) {
      const x = -19 - i * 0.9, z = -6 - i * 1.3;
      scene.add(box(1.4, 0.3, 1.6, '#a8a29a', [x, 0.3, z], [0, 0.6, 0]));
      if (i % 2 === 0) scene.add(cyl(0.04, 0.04, 1, '#e9e2d0', [x + 0.6, 0.9, z + 0.3]));
    }
    // quiosque antes do caminho
    const k = new THREE.Group();
    k.add(cyl(1.6, 1.6, 2.4, '#ffffff', [0, 1.2, 0], [0, 0, 0], 8));
    k.add(mesh(new THREE.ConeGeometry(2.6, 0.9, 8), '#1f8a3c', [0, 2.9, 0]));
    const ks = sign(params.placa || 'QUIOSQUE', 2.4, 0.5, { bg: '#1f8a3c', fg: '#ffd400' }); ks.position.set(0, 2.1, 1.62); k.add(ks);
    for (let i = 0; i < 3; i++) k.add(box(0.5, 0.05, 0.5, '#f39c12', [-1.6 + i * 1.6, 0.75, 2.6]), cyl(0.04, 0.04, 0.75, '#888', [-1.6 + i * 1.6, 0.37, 2.6]));
    k.position.set(params.quiosqueX ?? -12, 0, -2.4); scene.add(k);
    // bandeiras da Jamaica: ponto de encontro mais à direita
    const jam = [];
    for (let i = 0; i < 3; i++) { const f = flag([12 + i * 2.2, 0, -5 - (i % 2)], 'jamaica', { pole: 3.4, w: 1.4 }); scene.add(f.g); jam.push(f); }
    crowd(scene, 7, [10, 18, -8, -4], r, { face: [14, -6] });
    for (let i = 0; i < 16; i++) scene.add(umbrella([(r() - 0.5) * 50 + 5, 0, -5 - r() * 9], ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#ff7f50'][i % 5], r));
    const palms = [];
    for (let x = -8; x < 40; x += 9) { const pl = palm([x, 0, -0.6], 1, r); scene.add(pl.g); palms.push(pl); }
    mountains(scene, p);
    return { scene, update: (t) => { tick(t); br.tick(t); jam.forEach((f) => f.tick(t)); palms.forEach((pl, i) => { pl.top.rotation.z = Math.sin(t * 1.3 + i) * 0.04; }); } };
  },

  // Roda de samba embaixo da pedra: arquibancada viva na rocha, mesa com sambistas, corredor de barracas, esquina do funk
  roda(params, r) {
    const p = TIMES[params.horario] || TIMES.noite;
    const scene = base(p);
    const pedra = canvasTexture(256, 256, (g, w, h) => { g.fillStyle = '#c9c2b6'; g.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { g.strokeStyle = '#8f877b'; g.lineWidth = 3; g.strokeRect((i * 37) % w, (Math.floor(i / 7) * 23) % h, 32, 20); } }, [20, 30]);
    scene.add(mesh(new THREE.BoxGeometry(30, 0.1, 60), mat('#ffffff', { map: pedra }), [0, -0.05, -20]));
    // a grande rocha escura à esquerda, com gente empilhada em desnível
    const rocha = '#3b3633';
    for (let i = 0; i < 6; i++) scene.add(box(4, 0.6 + i * 0.6, 22, rocha, [-5 - i * 1.6, (0.6 + i * 0.6) / 2, -6]));
    scene.add(sph(14, rocha, [-22, 2, -6], [0.8, 1.3, 1.4]));
    for (let i = 0; i < 6; i++) crowd(scene, 7, [-6.5 - i * 1.6, -3.5 - i * 1.6, -15, 3], r, { up: 0.5, ground: () => 0.6 + i * 0.6, face: [0, -4] });
    // mesa central com sambistas e a multidão colada
    scene.add(box(1.6, 0.06, 0.9, '#d9c7a3', [0, 0.76, -4]), cyl(0.05, 0.05, 0.76, '#555', [0, 0.38, -4]));
    for (let i = 0; i < 4; i++) { scene.add(cyl(0.05, 0.05, 0.3, '#f4f4f4', [-0.5 + i * 0.33, 0.94, -4])); }
    const mus = [[-1.2, -4], [1.2, -4], [0, -5.1], [-0.8, -3.0], [0.8, -3.0]];
    mus.forEach(([x, z], i) => { const f = fig([x, -0.25, z], { shirt: ['#ffffff', '#e9c46a', '#e63946', '#264653', '#ffffff'][i], skin: SKINS[(i + 2) % 5], rot: Math.atan2(-x, -4 - z) }); scene.add(f); scene.add(box(0.12, 0.08, 0.45, '#8b5e3c', [x * 0.85, 1.0, z + (z < -4 ? 0.2 : -0.2)])); });
    crowd(scene, 26, [-3, 4, -8, 0.5], r, { up: 0.45, face: [0, -4] });
    // casario colonial à direita, janelões de madeira e mural
    const casas = ['#f2e2c4', '#f4a261', '#e9c46a', '#8ecae6', '#ffb4a2'];
    for (let z = 4; z > -40; z -= 6) {
      const g = new THREE.Group(); const h = 7 + r() * 2;
      g.add(box(4, h, 6, casas[Math.floor(r() * 5)], [0, h / 2, 0]));
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.add(box(0.1, 1.8, 0.9, '#6b3e26', [-2.02, 1.4 + j * 3.2, -1.4 + i * 2.8]));
      g.position.set(8, 0, z); scene.add(g);
    }
    const mural = canvasTexture(512, 256, (g, w, h) => { g.fillStyle = '#e76f51'; g.fillRect(0, 0, w, h); const c = ['#264653', '#e9c46a', '#2a9d8f', '#f4f1de']; for (let i = 0; i < 9; i++) { g.fillStyle = c[i % 4]; g.beginPath(); g.arc(40 + i * 55, 130 + Math.sin(i) * 50, 30 + (i % 3) * 12, 0, 6.29); g.fill(); } g.strokeStyle = '#1a1a1a'; g.lineWidth = 6; g.strokeRect(0, 0, w, h); });
    const mm = mesh(new THREE.PlaneGeometry(5, 2.5), new THREE.MeshBasicMaterial({ map: mural }), [5.95, 2.4, -1]); mm.rotation.y = -Math.PI / 2; scene.add(mm);
    // lâmpadas âmbar e postes antigos
    const bulbs = [];
    for (let z = 2; z > -12; z -= 3) bulbs.push(...stringLights(scene, [-4, 4.2, z], [6, 4.2, z], 8, ['#ffb347']));
    for (const z of [2, -10, -22]) { scene.add(cyl(0.08, 0.1, 4, '#222', [5.3, 2, z])); scene.add(mesh(new THREE.SphereGeometry(0.25, 10, 8), flat('#ffcf7a'), [5.3, 4.1, z])); }
    // corredor de barracas de drinks (mais ao fundo), isopores com LED e fumaça de espetinho
    const leds = [];
    for (let i = 0; i < 6; i++) {
      const z = -12 - i * 3;
      scene.add(box(1.8, 0.05, 0.8, '#eeeeee', [4.6, 0.8, z]), cyl(0.03, 0.03, 0.8, '#999', [4.6, 0.4, z]));
      for (let k = 0; k < 5; k++) scene.add(cyl(0.05, 0.06, 0.3, ['#2a9d8f', '#e9c46a', '#e63946', '#8ecae6', '#ffffff'][k], [4.0 + k * 0.28, 0.98, z - 0.2]));
      scene.add(sph(0.09, '#f4a261', [4.3, 0.9, z + 0.25]), sph(0.09, '#e9c46a', [4.6, 0.9, z + 0.25]), sph(0.09, '#e63946', [4.9, 0.9, z + 0.25]));
      const led = mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), flat(['#3a86ff', '#2ec4b6', '#f8f9fa'][i % 3]), [3.4, 0.25, z]); scene.add(led); leds.push(led);
    }
    crowd(scene, 30, [-2, 3.2, -30, -10], r, { up: 0.3 });
    const fumaca = [];
    for (let i = 0; i < 10; i++) { const s = mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: '#9a9a9a', transparent: true, opacity: 0.35, depthWrite: false }), [4.4, 1.2, -14 - (i % 3) * 6]); scene.add(s); fumaca.push(s); }
    // esquina lateral do baile: LEDs roxos, vermelhos e azuis piscando e caixas de som
    const strobe = [];
    for (let i = 0; i < 6; i++) { const l = mesh(new THREE.BoxGeometry(0.3, 2.5, 0.1), flat('#7b2cbf'), [-2 + i * 1.2, 2.2, -36.9]); scene.add(l); strobe.push(l); }
    scene.add(box(1, 1.6, 0.8, '#111', [-3, 0.8, -35.5]), box(1, 1.6, 0.8, '#111', [4, 0.8, -35.5]));
    scene.add(box(14, 6, 0.3, '#2b2233', [1, 3, -37.2]));
    crowd(scene, 14, [-3, 4, -36, -31], r, { up: 0.6 });
    return { scene, update: (t) => {
      bulbs.forEach((b, i) => b.material.color.set(Math.sin(t * 2.5 + i) > 0.9 ? '#ffe2a8' : '#ffb347'));
      leds.forEach((l, i) => l.material.color.set(['#3a86ff', '#2ec4b6', '#f8f9fa'][(i + Math.floor(t * 1.5)) % 3]));
      fumaca.forEach((s, i) => { const k = (t * 0.25 + i * 0.13) % 1; s.position.y = 1.2 + k * 3.5; s.scale.setScalar(0.6 + k * 1.6); s.material.opacity = 0.35 * (1 - k); });
      strobe.forEach((l, i) => { const c = ['#7b2cbf', '#e63946', '#3a86ff']; l.material.color.set(c[(i + Math.floor(t * 6)) % 3]); l.visible = Math.sin(t * 17 + i * 2.1) > -0.3; });
    } };
  },

  // Pedra da Gávea: topo da trilha, laje de rocha, beirada com vista do mar e paredão de escalada à direita
  gavea(params, r) {
    const p = TIMES[params.horario] || TIMES.dia;
    const scene = base(p);
    const pedra = p.sun < 0.5 ? '#4a4846' : '#8d8a84';
    scene.add(box(18, 1, 14, pedra, [0, -0.5, -1]));
    for (let i = 0; i < 18; i++) scene.add(sph(0.4 + r() * 0.8, pedra, [(r() - 0.5) * 16, -0.1, -6 + r() * 12], [1, 0.4, 1]));
    for (let i = 0; i < 14; i++) scene.add(sph(0.5 + r() * 0.6, '#3f7d4a', [(r() > 0.5 ? 1 : -1) * (6 + r() * 2.5), 0.2, -4 + r() * 9]));
    // paredão de escalada à direita: costura de chapeletas e uma corda
    scene.add(box(4, 9, 4, pedra, [8.5, 4, -3]));
    for (let i = 0; i < 6; i++) scene.add(cyl(0.05, 0.05, 0.1, '#d9d9d9', [6.49, 1 + i * 1.3, -2.2 + Math.sin(i) * 0.3], [0, 0, Math.PI / 2]));
    scene.add(cyl(0.02, 0.02, 8, '#e63946', [6.45, 4, -2.2]));
    // vista: mar lá embaixo, costa e morros
    const g2 = new THREE.Group(); scene.add(g2); const tick = sea(g2, p, -30, 900); g2.position.y = -120;
    const colors = ['#f3e9d2', '#e8c07a', '#c7d6e0', '#ffffff'];
    for (let i = 0; i < 30; i++) { const b = building(-80 + i * 5.5, -40, 4, 4, 4 + r() * 10, colors[i % 4], p, r); b.position.y = -120; b.position.z = -25 - (i % 3) * 6; scene.add(b); }
    scene.add(sph(40, '#3e6b4a', [-140, -120, -60], [1, 1.5, 1]), sph(30, '#3e6b4a', [120, -120, -50], [1.4, 1.2, 1]));
    mountains(scene, p, -300);
    return { scene, update: (t) => tick(t) };
  },
});

Object.assign(SET_CATALOG, {
  terraco: 'Terraço numa torre no alto do hostel (fumódromo): piso 8x8 com mureta de 1,1 m nas bordas (x=±4, z=±4), casinha da escada com porta em [-2.6, 2.3] (a câmera chega por ela), bancos à esquerda, gato branco sentado na mureta em [2.6, -3.85], varal de luzes, cidade lá embaixo e mar ao fundo (-z).',
  refeitorio: 'Sala de refeições do hostel: 4 mesas compridas com bancos (x=±1.6, z=-0.8 e 2.0), bancada da cozinha ao fundo (z=-3.9), gaiola com papagaio em [-3.2, -3.5], janela à direita. Câmera em z≈3.5.',
  bar: 'Bar do hostel à noite: balcão à direita (x=3.2) com garrafas, palquinho de karaokê ao fundo (z=-3.1) com telão de letras, microfone em [-1.2, -2.6] e placa KARAOKÊ, sofá à esquerda, luzes coloridas. Câmera em z≈3.',
  ladeira: 'Ladeira íngreme: o hostel fica no alto (z≈9), a rua desce no sentido -z até a avenida, o calçadão e a praia (z<-45). Casas dos dois lados. As alturas de câmera e personagens são relativas ao chão da ladeira. Câmera começa em [0, 1.6, 8] olhando -z.',
  praia: 'Praia ao pé do hostel: calçadão em ondas (z de -1 a 4), areia, mar (-z). À esquerda (x≈-34) um morro com a bandeira do Brasil no topo; na base dele o caminho dos pescadores (x de -19 a -31); antes do caminho, quiosque em x=quiosqueX (padrão -12), z=-2.4; mais à direita (x 12–17, z≈-5) bandeiras da Jamaica com uma rodinha de gente (ponto de encontro).',
  roda: 'Roda de samba embaixo da pedra (noite): chão de pedra; à esquerda a grande rocha escura com a multidão em degraus; mesa dos sambistas em [0, -4] cercada de gente; casario colonial à direita (x=8) com mural; luz âmbar; ao fundo (z -12 a -28) o corredor de barracas de drinks com isopores de LED e fumaça; no fim (z≈-36) a esquina do baile funk com luzes roxas, vermelhas e azuis. Câmera em [0, 1.6, 3] ou andando no sentido -z por x≈1.5.',
  gavea: 'Topo da trilha da Pedra da Gávea: laje de rocha (x de -9 a 9, z de -8 a 6), mato nas laterais, paredão de escalada à direita (x≈6.5) com chapeletas e corda vermelha, beirada em z≈-8 com o mar e a costa muito abaixo. Câmera em z≈4 olhando -z.',
});
