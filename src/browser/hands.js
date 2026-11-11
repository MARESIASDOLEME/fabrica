import * as THREE from 'three';
import { mat, box, cap, cyl, textTexture } from './toon.js';

// Mãos em primeira pessoa, presas à câmera.
// Espaço local da mão: dedos apontam +y, palma vira para -z.
const Q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
const P = (x, y, z) => new THREE.Vector3(x, y, z);

export const POSES = {
  escondidas: { L: [P(-0.3, -0.9, -0.3), Q(-1.2, 0, 0)], R: [P(0.3, -0.9, -0.3), Q(-1.2, 0, 0)] },
  repouso:    { L: [P(-0.2, -0.34, -0.46), Q(-1.45, 0, 0.1)], R: [P(0.2, -0.34, -0.46), Q(-1.45, 0, -0.1)] },
  empurrar:   { L: [P(-0.17, -0.14, -0.5), Q(0, 0, 0.15)], R: [P(0.17, -0.14, -0.5), Q(0, 0, -0.15)] },
  celular:    { L: [P(-0.3, -0.9, -0.3), Q(-1.2, 0, 0)], R: [P(0.04, -0.27, -0.44), Q(-0.35, Math.PI, 0.05)], phone: true },
  acenar:     { L: [P(-0.3, -0.9, -0.3), Q(-1.2, 0, 0)], R: [P(0.2, -0.02, -0.5), Q(0, 0, -0.1)], wave: true },
  mala:       { L: [P(-0.3, -0.9, -0.3), Q(-1.2, 0, 0)], R: [P(0.24, -0.42, -0.42), Q(-0.3, 0, -0.3)], bag: true },
  apontar:    { L: [P(-0.3, -0.9, -0.3), Q(-1.2, 0, 0)], R: [P(0.12, -0.2, -0.5), Q(-1.35, 0, -0.05)], point: true },
};

function makeHand(skin, sleeveC, side) {
  const g = new THREE.Group();
  const palm = box(0.085, 0.09, 0.032, skin, [0, 0.045, 0]);
  g.add(palm);
  const fingers = [];
  [-0.03, -0.01, 0.01, 0.03].forEach((x, i) => {
    const len = [0.05, 0.062, 0.058, 0.045][i];
    const f = cap(0.0105, len, skin, [x, 0.09 + len / 2 + 0.005, 0]);
    g.add(f); fingers.push(f);
  });
  const thumb = cap(0.012, 0.04, skin, [side * -0.05, 0.04, -0.008], [0, 0, side * 0.7]);
  g.add(thumb);
  // punho da manga
  g.add(cyl(0.05, 0.052, 0.04, sleeveC, [0, -0.025, 0]));
  return { g, fingers };
}

export function makeHands(camera, spec = {}) {
  const skin = spec.skin || '#c98e62';
  const sleeveC = spec.sleeve || '#2f5fa8';
  const root = new THREE.Group();
  camera.add(root);
  const L = makeHand(skin, sleeveC, -1), R = makeHand(skin, sleeveC, 1);
  root.add(L.g, R.g);
  const sleeveGeo = new THREE.CylinderGeometry(0.048, 0.07, 1, 14);
  sleeveGeo.translate(0, 0.5, 0);
  const sL = new THREE.Mesh(sleeveGeo, mat(sleeveC));
  const sR = new THREE.Mesh(sleeveGeo, mat(sleeveC));
  root.add(sL, sR);
  // celular
  const phone = new THREE.Group();
  phone.add(box(0.075, 0.15, 0.01, '#111', [0, 0, 0]));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.135),
    new THREE.MeshBasicMaterial({ map: textTexture(spec.phoneText || 'MAPA', { bg: '#cfe9ff', fg: '#1d4e89', w: 256, h: 512, font: 'bold 60px sans-serif' }) }));
  scr.position.z = 0.0065;
  phone.add(scr);
  phone.position.set(0, 0.08, -0.03);
  phone.scale.setScalar(1.25);
  phone.rotation.y = Math.PI;
  R.g.add(phone);
  // mala de rodinha (alça)
  const bag = new THREE.Group();
  bag.add(cyl(0.012, 0.012, 0.5, '#555', [0, -0.25, 0]));
  bag.add(box(0.35, 0.5, 0.22, spec.bagColor || '#d9483b', [0, -0.75, 0.05]));
  bag.position.set(0, 0.03, 0);
  R.g.add(bag);

  const shL = P(-0.32, -0.75, 0.05), shR = P(0.32, -0.75, 0.05);
  const up = P(0, 1, 0);
  const tmpQ = new THREE.Quaternion();

  function place(sleeve, hand, shoulder) {
    const wrist = hand.g.position.clone().add(P(0, -0.04, 0).applyQuaternion(hand.g.quaternion));
    const dir = wrist.clone().sub(shoulder);
    const len = dir.length();
    sleeve.position.copy(shoulder);
    sleeve.quaternion.copy(tmpQ.setFromUnitVectors(up, dir.normalize()));
    sleeve.scale.set(1, len, 1);
  }

  return {
    // a, b = poses; k = 0..1 entre elas
    update(a, b, k, t, bob = 0) {
      const pa = POSES[a] || POSES.repouso, pb = POSES[b] || pa;
      const s = k * k * (3 - 2 * k);
      for (const [side, hand] of [['L', L], ['R', R]]) {
        hand.g.position.lerpVectors(pa[side][0], pb[side][0], s);
        hand.g.quaternion.slerpQuaternions(pa[side][1], pb[side][1], s);
        hand.g.position.y += Math.sin(t * 7 + (side === 'L' ? 0 : Math.PI)) * 0.012 * bob;
      }
      const cur = s < 0.5 ? pa : pb;
      if (cur.wave) R.g.rotateZ(Math.sin(t * 10) * 0.35);
      const curl = (cur.point ? 1 : 0);
      R.fingers.forEach((f, i) => { f.scale.y = curl && i !== 0 ? 0.35 : 1; });
      phone.visible = !!cur.phone;
      bag.visible = !!cur.bag;
      place(sL, L, shL);
      place(sR, R, shR);
    },
  };
}
