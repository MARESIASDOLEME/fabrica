import * as THREE from 'three';
import { mat, box, cyl, sph, cap } from './toon.js';

// Personagem estilizado. Tudo paramétrico para o roteiro poder variar.
export const SKINS = { clara: '#f1c9a5', media: '#c98e62', morena: '#a0673f', escura: '#6b4226' };

export function makePerson(spec = {}) {
  const skin = SKINS[spec.skin] || spec.skin || SKINS.media;
  const shirt = spec.shirt || '#e4572e';
  const pants = spec.pants || '#2e4057';
  const hairC = spec.hairColor || '#2b1d14';
  const h = spec.height || 1.0; // escala
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);

  // pernas
  const legL = cap(0.085, 0.62, pants, [-0.11, 0.42, 0]);
  const legR = cap(0.085, 0.62, pants, [0.11, 0.42, 0]);
  body.add(legL, legR);
  body.add(box(0.16, 0.08, 0.26, '#222', [-0.11, 0.04, 0.05]), box(0.16, 0.08, 0.26, '#222', [0.11, 0.04, 0.05]));
  // tronco
  const torso = cap(0.21, 0.42, shirt, [0, 1.12, 0]);
  torso.scale.set(1, 1, 0.75);
  body.add(torso);
  if (spec.outfit === 'uniforme') {
    // emblema: bola colorida centralizada no peito (spec.emblema = cor hex); sem ele, o crachá branco de antes
    if (spec.emblema) body.add(cyl(0.075, 0.075, 0.02, spec.emblema, [0, 1.36, 0.2], [Math.PI / 2, 0, 0], 20));
    else body.add(box(0.2, 0.06, 0.02, '#fff', [0.1, 1.28, 0.16]));
  }
  if (spec.outfit === 'regata') { torso.material = mat(shirt); }
  // braços (pivô no ombro)
  const mkArm = (side) => {
    const piv = new THREE.Group();
    piv.position.set(side * 0.29, 1.42, 0);
    const sleeve = cap(0.075, 0.18, spec.outfit === 'regata' ? skin : shirt, [0, -0.14, 0]);
    const fore = cap(0.065, 0.32, skin, [0, -0.42, 0]);
    const hand = sph(0.075, skin, [0, -0.64, 0]);
    piv.add(sleeve, fore, hand);
    piv.rotation.z = side * 0.12;
    body.add(piv);
    return piv;
  };
  const armL = mkArm(-1), armR = mkArm(1);
  // cabeça
  const head = new THREE.Group();
  head.position.set(0, 1.78, 0);
  body.add(head);
  head.add(cyl(0.07, 0.08, 0.12, skin, [0, -0.17, 0]));
  head.add(sph(0.2, skin, [0, 0, 0], [1, 1.1, 1]));
  // olhos
  const eyeW = sph(0.045, '#ffffff', [-0.075, 0.03, 0.17]);
  const eyeW2 = sph(0.045, '#ffffff', [0.075, 0.03, 0.17]);
  const pup = sph(0.024, '#111', [-0.075, 0.03, 0.205]);
  const pup2 = sph(0.024, '#111', [0.075, 0.03, 0.205]);
  head.add(eyeW, eyeW2, pup, pup2);
  head.add(box(0.07, 0.015, 0.02, hairC, [-0.075, 0.1, 0.19], [0, 0, 0.1]));
  head.add(box(0.07, 0.015, 0.02, hairC, [0.075, 0.1, 0.19], [0, 0, -0.1]));
  // boca (abre conforme o volume da fala)
  const mouth = box(0.09, 0.022, 0.03, '#c0392b', [0, -0.09, 0.185]);
  head.add(mouth);
  // cabelo
  const hs = spec.hair || 'curto';
  if (hs === 'curto') head.add(sph(0.215, hairC, [0, 0.06, -0.02], [1, 0.85, 1.02]));
  if (hs === 'black' || hs === 'afro') head.add(sph(0.29, hairC, [0, 0.12, -0.05], [1, 0.9, 0.95]));
  if (hs === 'longo') {
    head.add(sph(0.22, hairC, [0, 0.06, -0.03], [1.02, 0.9, 1.02]));
    head.add(box(0.42, 0.5, 0.12, hairC, [0, -0.2, -0.13]));
  }
  if (hs === 'coque') { head.add(sph(0.215, hairC, [0, 0.06, -0.02], [1, 0.85, 1.02])); head.add(sph(0.1, hairC, [0, 0.26, -0.08])); }
  if (hs === 'careca') { /* nada */ }
  if (spec.hat === 'bone') {
    head.add(sph(0.22, spec.hatColor || '#c0392b', [0, 0.1, 0], [1, 0.6, 1]));
    head.add(box(0.24, 0.02, 0.18, spec.hatColor || '#c0392b', [0, 0.12, 0.2]));
  }
  if (spec.hat === 'chapeu') {
    head.add(cyl(0.38, 0.38, 0.02, spec.hatColor || '#e8d28a', [0, 0.16, 0]));
    head.add(cyl(0.17, 0.2, 0.16, spec.hatColor || '#e8d28a', [0, 0.25, 0]));
  }
  if (spec.glasses) {
    head.add(box(0.1, 0.06, 0.02, '#111', [-0.075, 0.03, 0.215]));
    head.add(box(0.1, 0.06, 0.02, '#111', [0.075, 0.03, 0.215]));
    head.add(box(0.06, 0.015, 0.02, '#111', [0, 0.04, 0.215]));
  }
  if (spec.prop === 'prancha') {
    const b = sph(0.5, '#f5e663', [0, 0, 0], [0.32, 1.6, 0.06]);
    b.position.set(0.15, -0.55, 0.1);
    armR.add(b);
  }
  if (spec.prop === 'bandeja') {
    armR.add(cyl(0.2, 0.2, 0.02, '#bbb', [0, -0.66, 0.06], [1.3, 0, 0]));
    armR.add(cyl(0.05, 0.04, 0.16, '#7cc576', [0.04, -0.6, 0.1], [1.3, 0, 0]));
  }

  g.scale.setScalar(h);
  const seed = Math.random() * 10;
  return {
    group: g,
    // t = tempo (s), amp = volume da fala (0..1), gesture = nome
    update(t, amp = 0, gesture = null, walking = 0) {
      mouth.scale.y = 1 + amp * 5;
      mouth.position.y = -0.09 - amp * 0.03;
      body.position.y = Math.abs(Math.sin(t * 7)) * 0.04 * walking + Math.sin(t * 1.6 + seed) * 0.008;
      body.rotation.z = Math.sin(t * 1.1 + seed) * 0.015;
      head.rotation.y = Math.sin(t * 0.7 + seed) * 0.08 + amp * Math.sin(t * 9) * 0.04;
      head.rotation.x = amp * Math.sin(t * 11) * 0.05;
      const sw = Math.sin(t * 7) * 0.5 * walking;
      legL.rotation.x = sw; legR.rotation.x = -sw;
      armL.rotation.set(-sw * 0.6, 0, -0.12);
      armR.rotation.set(sw * 0.6, 0, 0.12);
      if (spec.prop === 'bandeja') armR.rotation.set(-1.3, 0, 0.1);
      if (gesture === 'acenar') { armR.rotation.set(0, 0, 2.5 + Math.sin(t * 10) * 0.35); }
      if (gesture === 'apontar') { armR.rotation.set(-1.45, 0, 0.35); }
      if (gesture === 'bracos') { armL.rotation.set(0, 0, -2.3); armR.rotation.set(0, 0, 2.3); }
      if (gesture === 'falar' || (amp > 0.15 && !gesture)) {
        armR.rotation.x += -0.5 + Math.sin(t * 3 + seed) * 0.25;
        armL.rotation.x += Math.sin(t * 2.3 + seed) * 0.1;
      }
      if (gesture === 'pensar') { armR.rotation.set(-2.3, 0, -0.6); head.rotation.z = 0.15; }
    },
  };
}
