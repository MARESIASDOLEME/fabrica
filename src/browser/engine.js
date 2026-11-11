import * as THREE from 'three';
import { SETS } from './sets.js';
import { makePerson } from './people.js';
import { makeHands } from './hands.js';
import { rng } from './toon.js';

const ease = (k) => k * k * (3 - 2 * k);

const POST_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const POST_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor; uniform sampler2D tNormal; uniform sampler2D tDepth;
uniform vec2 res; uniform float near; uniform float far; uniform float k; uniform float blink; uniform float ink; uniform float dark; uniform float flick;
float lin(float d){ float z = d*2.0-1.0; return (2.0*near*far)/(far+near - z*(far-near)); }
vec2 fish(vec2 uv){
  float aspect = res.x/res.y;
  vec2 p = uv-0.5; p.x *= aspect;
  float r2 = dot(p,p);
  float m2 = 0.25*aspect*aspect + 0.25;
  vec2 q = p*(1.0+k*r2)/(1.0+k*m2);
  q.x /= aspect;
  return q+0.5;
}
void main(){
  vec2 uv = fish(vUv);
  vec2 px = ink/res;
  float dc = lin(texture2D(tDepth, uv).x);
  float dl = lin(texture2D(tDepth, uv-vec2(px.x,0.)).x);
  float dr = lin(texture2D(tDepth, uv+vec2(px.x,0.)).x);
  float du = lin(texture2D(tDepth, uv+vec2(0.,px.y)).x);
  float dd = lin(texture2D(tDepth, uv-vec2(0.,px.y)).x);
  float ed = (abs(dl-dc)+abs(dr-dc)+abs(du-dc)+abs(dd-dc))/max(dc,0.05);
  vec3 nc = texture2D(tNormal, uv).xyz*2.-1.;
  vec3 nl = texture2D(tNormal, uv-vec2(px.x,0.)).xyz*2.-1.;
  vec3 nr = texture2D(tNormal, uv+vec2(px.x,0.)).xyz*2.-1.;
  vec3 nu = texture2D(tNormal, uv+vec2(0.,px.y)).xyz*2.-1.;
  vec3 nd = texture2D(tNormal, uv-vec2(0.,px.y)).xyz*2.-1.;
  float en = (1.0-dot(nc,nl)) + (1.0-dot(nc,nr)) + (1.0-dot(nc,nu)) + (1.0-dot(nc,nd));
  float line = max(smoothstep(0.12, 0.22, ed), smoothstep(0.35, 0.6, en));
  vec3 col = texture2D(tColor, uv).rgb;
  // leve realce de saturação
  float l = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(l), col, 1.12);
  col = mix(col, vec3(0.08,0.07,0.07), line);
  // vinheta suave
  vec2 v = vUv-0.5; col *= 1.0 - dot(v,v)*0.35;
  // apagão: tudo escuro e frio, luz só num cone central (lanterna do celular) que cai com a distância
  if (dark > 0.0) {
    vec2 c = v*vec2(0.9,1.0);
    float cone = smoothstep(0.45, 0.04, length(c - vec2(0.0,-0.02)));
    float tela = smoothstep(0.30, 0.0, length(c - vec2(0.0,-0.42)))*0.55; // brilho do celular nas mãos
    float dist = clamp(3.2/max(dc,0.6), 0.0, 1.0);
    float teto = 1.0 - 0.65*smoothstep(0.08, 0.42, v.y); // o teto fica no escuro
    float luz = (0.08 + 1.15*cone*dist + tela)*teto;
    float lum = dot(col, vec3(0.299,0.587,0.114));
    vec3 frio = mix(vec3(lum)*vec3(0.75,0.85,1.1), col, 0.55);
    col = mix(col, frio*luz*flick, dark);
  }
  // piscar (pálpebras)
  if (blink > 0.0) {
    vec2 e = vUv-0.5; e.x *= 0.7;
    float lid = abs(e.y) - (1.0-blink)*0.55*sqrt(max(0.0,1.0-e.x*e.x*3.0));
    col = mix(col, vec3(0.02), smoothstep(-0.01, 0.01, lid));
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export function createEngine(canvas, TL) {
  const W = TL.width, H = TL.height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const SS = TL.supersample || 1;
  const depthTex = new THREE.DepthTexture(W * SS, H * SS);
  const rtColor = new THREE.WebGLRenderTarget(W * SS, H * SS, { depthTexture: depthTex, samples: 0 });
  rtColor.texture.colorSpace = THREE.SRGBColorSpace;
  const rtNormal = new THREE.WebGLRenderTarget(W * SS, H * SS, { depthBuffer: true });
  const normalMat = new THREE.MeshNormalMaterial();

  const camera = new THREE.PerspectiveCamera(TL.fov || 92, W / H, 0.05, 600);
  camera.rotation.order = 'YXZ';
  const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: POST_VS, fragmentShader: POST_FS,
    uniforms: {
      tColor: { value: rtColor.texture }, tNormal: { value: rtNormal.texture }, tDepth: { value: depthTex },
      res: { value: new THREE.Vector2(W * SS, H * SS) }, near: { value: camera.near }, far: { value: camera.far },
      k: { value: TL.fisheye ?? 1.1 }, blink: { value: 0 }, dark: { value: 0 }, flick: { value: 1 }, ink: { value: 1.6 * SS * (W / 1080) },
    },
    depthTest: false, depthWrite: false,
  }));
  const postScene = new THREE.Scene();
  postScene.add(post);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const hands = makeHands(camera, TL.hands || {});
  const R = rng(TL.seed || 1);

  // monta cada cena
  const scenes = TL.scenes.map((sc, i) => {
    const builder = SETS[sc.set] || SETS.recepcao;
    const built = builder(sc.params || {}, rng((TL.seed || 1) * 31 + i));
    const chars = (sc.characters || []).map((c) => {
      const p = makePerson(c.spec || {});
      built.scene.add(p.group);
      return { ...c, p };
    });
    return { ...sc, ...built, chars };
  });

  function interp(keys, u, field) {
    if (!keys || !keys.length) return null;
    if (u <= keys[0].t) return keys[0][field];
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (u <= b.t) return { a: a[field], b: b[field], k: ease((u - a.t) / Math.max(1e-6, b.t - a.t)) };
    }
    return keys[keys.length - 1][field];
  }
  const lerpArr = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

  function charPos(sc, c, u) {
    const r = interp(c.walk && c.walk.length ? c.walk : [{ t: 0, at: c.at }], u, 'at');
    const at = Array.isArray(r) ? r : lerpArr(r.a, r.b, r.k);
    return new THREE.Vector3(at[0], c.y || 0, at[1]);
  }
  function resolveLook(sc, look, u) {
    if (typeof look === 'string') {
      const c = sc.chars.find((x) => x.id === look);
      if (c) { const p = charPos(sc, c, u); p.y += 1.72 * ((c.spec && c.spec.height) || 1); return p; }
      return new THREE.Vector3(0, 1.6, -5);
    }
    return new THREE.Vector3(...look);
  }
  function amplitude(id, time) {
    for (const ln of TL.lines) {
      if (ln.speaker === id && time >= ln.start && time < ln.end) {
        const i = Math.floor((time - ln.start) * TL.fps);
        return ln.env[Math.min(i, ln.env.length - 1)] || 0;
      }
    }
    return 0;
  }

  function frame(time) {
    let si = scenes.findIndex((s) => time >= s.start && time < s.end);
    if (si < 0) si = time < scenes[0].start ? 0 : scenes.length - 1;
    const sc = scenes[si];
    const dur = sc.end - sc.start;
    const u = Math.min(1, Math.max(0, (time - sc.start) / dur));
    const lt = time - sc.start;

    // câmera
    const cams = sc.camera && sc.camera.length ? sc.camera : [{ t: 0, pos: [0, 1.6, 3], look: [0, 1.6, -5] }];
    const rp = interp(cams, u, 'pos');
    const pos = Array.isArray(rp) ? new THREE.Vector3(...rp) : new THREE.Vector3(...lerpArr(rp.a, rp.b, rp.k));
    const rl = interp(cams, u, 'look');
    let look;
    if (rl && rl.a !== undefined) look = resolveLook(sc, rl.a, u).lerp(resolveLook(sc, rl.b, u), rl.k);
    else look = resolveLook(sc, rl, u);
    // velocidade → balanço da caminhada
    const u2 = Math.min(1, u + 0.02);
    const rp2 = interp(cams, u2, 'pos');
    const pos2 = Array.isArray(rp2) ? new THREE.Vector3(...rp2) : new THREE.Vector3(...lerpArr(rp2.a, rp2.b, rp2.k));
    const speed = pos2.distanceTo(pos) / Math.max(1e-3, (u2 - u) * dur);
    const walk = Math.min(1, speed / 1.2);
    pos.y += Math.abs(Math.sin(time * 6.5)) * 0.05 * walk;
    let shake = 0;
    for (const s of sc.shake || []) if (u >= s.t0 && u <= s.t1) shake = Math.max(shake, s.amp ?? 0.03);
    if (shake) pos.add(new THREE.Vector3(Math.sin(time * 41) * shake, Math.sin(time * 37 + 1) * shake, 0));
    camera.position.copy(pos);
    camera.lookAt(look);
    camera.rotation.z += Math.sin(time * 3.25) * 0.012 * walk;
    sc.scene.add(camera);

    // mãos
    const hk = sc.hands && sc.hands.length ? sc.hands : [{ t: 0, pose: 'repouso' }];
    let pa = hk[0].pose, pb = pa, kk = 0;
    for (let i = 0; i < hk.length; i++) {
      if (u >= hk[i].t) { pa = hk[i].pose; pb = pa; kk = 0; }
      if (i < hk.length - 1 && u >= hk[i].t && u < hk[i + 1].t) {
        const tr = 0.35 / dur; // transição de 0,35 s antes da próxima pose
        const st = hk[i + 1].t - tr;
        if (u > st) { pb = hk[i + 1].pose; kk = (u - st) / tr; }
      }
    }
    hands.update(pa, pb, Math.min(1, kk), time, walk);

    // personagens
    for (const c of sc.chars) {
      const p = charPos(sc, c, u);
      const pAhead = charPos(sc, c, Math.min(1, u + 0.02));
      const moving = pAhead.distanceTo(p) > 0.002;
      c.p.group.position.copy(p);
      if (moving) c.p.group.rotation.y = Math.atan2(pAhead.x - p.x, pAhead.z - p.z);
      else if (typeof c.face === 'number') c.p.group.rotation.y = c.face * Math.PI / 180;
      else c.p.group.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
      let gest = null;
      for (const g of c.gestures || []) if (u >= g.t0 && u <= g.t1) gest = g.type;
      c.p.update(time, amplitude(c.id, time), gest, moving ? 1 : 0);
    }
    sc.update(time);

    // piscar entre cenas
    let blink = 0;
    if (sc.transitionIn === 'piscar' && lt < 0.3) blink = 1 - lt / 0.3;
    const next = scenes[si + 1];
    if (next && next.transitionIn === 'piscar' && sc.end - time < 0.18) blink = Math.max(blink, 1 - (sc.end - time) / 0.18);
    post.material.uniforms.blink.value = blink;
    const apagao = (sc.params && sc.params.horario) === 'apagao';
    post.material.uniforms.dark.value = apagao ? 1 : 0;
    // tremida da lanterna: leve, com falhas raras e determinísticas
    const fl = Math.sin(time * 13.0) * Math.sin(time * 7.3 + 1.7);
    post.material.uniforms.flick.value = apagao ? (fl > 0.97 ? 0.35 : 0.94 + 0.06 * Math.sin(time * 9.1)) : 1;

    renderer.setRenderTarget(rtColor);
    renderer.render(sc.scene, camera);
    const bg = sc.scene.background;
    sc.scene.overrideMaterial = normalMat; sc.scene.background = new THREE.Color(0.5, 0.5, 1);
    renderer.setRenderTarget(rtNormal);
    renderer.render(sc.scene, camera);
    sc.scene.overrideMaterial = null; sc.scene.background = bg;
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  }

  return { frame, renderer };
}

window.Factory = {
  init(TL) {
    const canvas = document.getElementById('c');
    this.TL = TL;
    this.engine = createEngine(canvas, TL);
    return true;
  },
  frame(t, q = 0.9) {
    this.engine.frame(t);
    return this.engine.renderer.domElement.toDataURL('image/jpeg', q);
  },
};
