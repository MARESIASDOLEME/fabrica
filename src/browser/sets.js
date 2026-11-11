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
