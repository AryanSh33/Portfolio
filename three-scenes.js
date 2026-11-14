/*
 * Three.js components
 *  1. Hero: a 3D neural network. It tilts toward the cursor, nodes near the
 *     cursor light up red and signals travel along the connections.
 *  2. LeetCode skyline: the last 12 months of submissions as 3D towers.
 *     Drag to rotate, hover a tower for the day and count.
 * Both stop rendering when off screen, respect reduced motion, and leave the
 * 2D page untouched if WebGL is not available.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const reduceMotion = document.documentElement.classList.contains("reduce-motion");
const RED = new THREE.Color("#fc3a52");
const INK = new THREE.Color("#2a2622");
const DPR = Math.min(window.devicePixelRatio || 1, 2);

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

/** Run `frame` only while `el` is on screen. */
function whenVisible(el, frame) {
  let raf = 0, on = false;
  const loop = (now) => { frame(now); raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !on) { on = true; raf = requestAnimationFrame(loop); }
    else if (!e.isIntersecting && on) { on = false; cancelAnimationFrame(raf); }
  }).observe(el);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && on) { on = false; cancelAnimationFrame(raf); }
    else if (!document.hidden && !on && el.getBoundingClientRect().bottom > 0) { on = true; raf = requestAnimationFrame(loop); }
  });
}

/* =====================================================================
 * 1. Hero neural network
 * =================================================================== */
function heroNetwork() {
  const canvas = document.getElementById("hero-gl");
  if (!canvas) return;
  const hero = document.querySelector(".hero");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(DPR);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const group = new THREE.Group();
  scene.add(group);

  // Nodes on a fuzzy Fibonacci sphere
  const N = 150;
  const pos = [];
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * Math.PI * (3 - Math.sqrt(5));
    const rad = 2.6 + (rnd() - 0.5) * 0.9;
    pos.push(new THREE.Vector3(Math.cos(th) * r * rad, y * rad, Math.sin(th) * r * rad));
  }

  // Connections between near neighbours
  const pairs = [];
  for (let i = 0; i < N; i++) {
    const near = [];
    for (let j = 0; j < N; j++) if (i !== j) near.push([j, pos[i].distanceTo(pos[j])]);
    near.sort((a, b) => a[1] - b[1]);
    near.slice(0, 3).forEach(([j]) => { if (!pairs.some(([a, b]) => a === j && b === i)) pairs.push([i, j]); });
  }
  const lineGeo = new THREE.BufferGeometry();
  const lp = new Float32Array(pairs.length * 6);
  pairs.forEach(([a, b], k) => { pos[a].toArray(lp, k * 6); pos[b].toArray(lp, k * 6 + 3); });
  lineGeo.setAttribute("position", new THREE.BufferAttribute(lp, 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x2a2622, transparent: true, opacity: 0.13 }));
  group.add(lines);

  // Nodes as round sprites with per-node colour and size
  const sprite = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.8, "rgba(255,255,255,1)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd; g.beginPath(); g.arc(32, 32, 32, 0, Math.PI * 2); g.fill();
    return new THREE.CanvasTexture(c);
  })();
  const nodeGeo = new THREE.BufferGeometry();
  const np = new Float32Array(N * 3), nc = new Float32Array(N * 3), ns = new Float32Array(N);
  pos.forEach((p, i) => { p.toArray(np, i * 3); INK.toArray(nc, i * 3); ns[i] = 1; });
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(np, 3));
  nodeGeo.setAttribute("color", new THREE.BufferAttribute(nc, 3));
  nodeGeo.setAttribute("size", new THREE.BufferAttribute(ns, 1));
  const nodeMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: sprite }, scale: { value: 1 } },
    vertexShader: `
      attribute float size; attribute vec3 color; varying vec3 vColor; uniform float scale;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * scale * (34.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D map; varying vec3 vColor;
      void main() {
        vec4 t = texture2D(map, gl_PointCoord);
        if (t.a < 0.05) discard;
        gl_FragColor = vec4(vColor, t.a);
      }`,
    transparent: true, depthWrite: false,
  });
  const nodes = new THREE.Points(nodeGeo, nodeMat);
  group.add(nodes);

  // Signals: red pulses travelling along random connections
  const S = 26;
  const sigGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(S * 3), sc = new Float32Array(S * 3), ss = new Float32Array(S);
  const signals = Array.from({ length: S }, (_, i) => ({ edge: Math.floor(rnd() * pairs.length), t: rnd(), speed: 0.35 + rnd() * 0.5 }));
  for (let i = 0; i < S; i++) { RED.toArray(sc, i * 3); ss[i] = 1.6; }
  sigGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  sigGeo.setAttribute("color", new THREE.BufferAttribute(sc, 3));
  sigGeo.setAttribute("size", new THREE.BufferAttribute(ss, 1));
  group.add(new THREE.Points(sigGeo, nodeMat));

  // Cursor
  const mouse = new THREE.Vector2(9, 9);   // NDC; far away until the cursor arrives
  const target = new THREE.Vector2(0, 0);
  const toNdc = (e, v) => {
    const r = canvas.getBoundingClientRect();
    return v.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  let dragX = null, spinVel = 0, releaseTimer = 0, spin = 0;
  const wave = { at: new THREE.Vector2(), start: -1e9 };
  hero.addEventListener("pointermove", (e) => {
    toNdc(e, mouse);
    if (e.pointerType === "mouse") {
      const hr = hero.getBoundingClientRect();
      target.set((e.clientX - hr.left) / hr.width - 0.5, (e.clientY - hr.top) / hr.height - 0.5);
    } else if (dragX !== null) {
      // finger swipe spins the network
      spinVel = (e.clientX - dragX) * 0.012;
      spin += spinVel;
      dragX = e.clientX;
    }
  });
  // tap or click in the network sends a shock wave through the nodes
  canvas.parentElement.addEventListener("pointerdown", (e) => {
    toNdc(e, wave.at);
    wave.start = performance.now();
    if (e.pointerType !== "mouse") { toNdc(e, mouse); dragX = e.clientX; clearTimeout(releaseTimer); }
  });
  const lift = (e) => {
    if (e.pointerType === "mouse") return;
    dragX = null;
    releaseTimer = setTimeout(() => mouse.set(9, 9), 700);
  };
  hero.addEventListener("pointerup", lift);
  hero.addEventListener("pointercancel", lift);
  hero.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { mouse.set(9, 9); target.set(0, 0); } });

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    // about 7 CSS px per node at rest, scaled with the canvas height
    nodeMat.uniforms.scale.value = (r.height / 640) * 2.4 * DPR;
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  const tmp = new THREE.Vector3(), col = new THREE.Color();
  const heat = new Float32Array(N);
  let last = performance.now();

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!reduceMotion) spin += dt * 0.12;
    if (dragX === null && Math.abs(spinVel) > 0.0005) { spin += spinVel; spinVel *= 0.93; }   // fling inertia
    const wr = (now - wave.start) / 1000 * 2.2;          // shock-wave radius in NDC
    group.rotation.y += ((spin + target.x * 0.9) - group.rotation.y) * 0.06;
    group.rotation.x += ((target.y * 0.6) - group.rotation.x) * 0.06;
    group.updateMatrixWorld();

    // light up nodes near the cursor (screen-space distance)
    for (let i = 0; i < N; i++) {
      tmp.copy(pos[i]).applyMatrix4(group.matrixWorld).project(camera);
      const d = Math.hypot(tmp.x - mouse.x, (tmp.y - mouse.y) / camera.aspect);
      let want = d < 0.28 ? 1 - d / 0.28 : 0;
      if (wr < 2.4 && !reduceMotion) {
        const dw = Math.hypot(tmp.x - wave.at.x, (tmp.y - wave.at.y) / camera.aspect);
        want = Math.max(want, Math.exp(-((dw - wr) ** 2) / 0.006) * (1 - wr / 2.4));
      }
      heat[i] += (want - heat[i]) * (want > heat[i] ? 0.5 : 0.07);   // fast attack, slow glow-out
      col.copy(INK).lerp(RED, heat[i]);
      col.toArray(nc, i * 3);
      ns[i] = 1 + heat[i] * 1.4;
    }
    nodeGeo.attributes.color.needsUpdate = true;
    nodeGeo.attributes.size.needsUpdate = true;

    // move signals
    signals.forEach((s, i) => {
      if (!reduceMotion) s.t += dt * s.speed;
      if (s.t > 1) { s.t = 0; s.edge = Math.floor(Math.random() * pairs.length); }
      const [a, b] = pairs[s.edge];
      tmp.copy(pos[a]).lerp(pos[b], s.t).toArray(sp, i * 3);
    });
    sigGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  frame(performance.now());
  canvas.classList.add("is-ready");
  document.documentElement.classList.add("has-gl");
  whenVisible(canvas, frame);
}

/* =====================================================================
 * 2. LeetCode submission skyline (one per year tab)
 * =================================================================== */
const fmtDate = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function createSkyline() {
  const wrap = document.getElementById("lc-skyline");
  const stage = document.getElementById("lc-skyline-stage");
  if (!wrap || !stage) return null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(DPR);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf6ecdd, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-20, 40, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 20, bottom: -20 });
  scene.add(sun);

  const PALETTE = ["#e9e0d2", "#ffc2ca", "#ff8597", "#fc3a52", "#a8102a"].map((c) => new THREE.Color(c));
  const HOVER = new THREE.Color("#111111");
  const GAP = 1.15;
  const geo = new THREE.BoxGeometry(0.9, 1, 0.9);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });

  let mesh = null, base = null, cells = [], heights = [], weeks = 0, ox = 0, oz = 0, started = 0;
  const m4 = new THREE.Matrix4();

  function place(grow) {
    if (!mesh) return;
    cells.forEach((c, i) => {
      const delay = (c.w / weeks) * 0.6;
      const k = reduceMotion ? 1 : Math.min(1, Math.max(0, (grow - delay) / 0.4));
      const e = 1 - Math.pow(1 - k, 3);
      m4.makeScale(1, Math.max(0.001, heights[i] * e), 1);
      m4.setPosition(c.w * GAP - ox, 0, c.wd * GAP - oz);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  function setData(days, label) {
    if (mesh) { scene.remove(mesh); mesh.dispose(); }
    if (base) { scene.remove(base); base.geometry.dispose(); }
    mesh = base = null;
    hovered = -1;
    if (!days.length) { wrap.hidden = true; return; }
    wrap.hidden = false;

    const first = new Date(days[0].date + "T00:00:00").getDay();
    cells = days.map((d, i) => ({ ...d, w: Math.floor((i + first) / 7), wd: (i + first) % 7 }));
    weeks = cells[cells.length - 1].w + 1;
    const max = Math.max(1, ...cells.map((c) => c.count));
    ox = ((weeks - 1) * GAP) / 2; oz = (6 * GAP) / 2;

    base = new THREE.Mesh(new THREE.BoxGeometry(weeks * GAP + 1.6, 0.6, 7 * GAP + 1.6), baseMat);
    base.position.y = -0.3;
    base.receiveShadow = true;
    scene.add(base);

    mesh = new THREE.InstancedMesh(geo, mat, cells.length);
    mesh.castShadow = true; mesh.receiveShadow = true;
    heights = cells.map((c) => (c.count ? 0.4 + Math.sqrt(c.count / max) * 9 : 0.12));
    cells.forEach((c, i) => mesh.setColorAt(i, PALETTE[c.level]));
    scene.add(mesh);
    started = 0;                // replay the rise animation
    place(0);

    const total = cells.reduce((s, c) => s + c.count, 0);
    const best = cells.reduce((a, b) => (b.count > a.count ? b : a));
    stage.setAttribute("aria-label", `3D skyline of LeetCode submissions in ${label}: ${total} in total, tallest tower ${best.count} on ${fmtDate(best.date)}.`);
  }

  // Camera & controls
  camera.position.set(-20, 22, 40);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.5, 0);
  controls.enableDamping = true;
  controls.enableZoom = false;          // never hijack page scroll
  controls.enablePan = false;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.35;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.6;
  controls.update();
  renderer.domElement.style.touchAction = "pan-y";   // vertical swipes still scroll the page
  renderer.domElement.addEventListener("pointerdown", () => (controls.autoRotate = false));

  // Hover (mouse) or tap (touch) a tower
  const tip = document.createElement("div");
  tip.className = "heat-tip";
  tip.setAttribute("aria-hidden", "true");
  document.body.appendChild(tip);
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let hovered = -1, tipTimer = 0;
  function pick(e) {
    if (!mesh) return;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObject(mesh)[0];
    const id = hit ? hit.instanceId : -1;
    if (id !== hovered) {
      if (hovered >= 0) mesh.setColorAt(hovered, PALETTE[cells[hovered].level]);
      if (id >= 0) mesh.setColorAt(id, HOVER);
      mesh.instanceColor.needsUpdate = true;
      hovered = id;
    }
    if (id >= 0) {
      const c = cells[id];
      tip.textContent = `${c.count} submission${c.count === 1 ? "" : "s"} on ${fmtDate(c.date)}`;
      tip.style.left = `${e.clientX}px`;
      tip.style.top = `${e.clientY - (e.pointerType === "mouse" ? 8 : 40)}px`;
      tip.classList.add("is-on");
    } else tip.classList.remove("is-on");
  }
  const clearPick = () => {
    tip.classList.remove("is-on");
    if (hovered >= 0 && mesh) { mesh.setColorAt(hovered, PALETTE[cells[hovered].level]); mesh.instanceColor.needsUpdate = true; }
    hovered = -1;
  };
  renderer.domElement.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") pick(e); });
  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    pick(e);
    clearTimeout(tipTimer);
    tipTimer = setTimeout(clearPick, 2500);
  });
  renderer.domElement.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") clearPick(); });

  function resize() {
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = r.width < 600 ? 48 : 32;      // pull back on narrow screens so the year fits
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  whenVisible(stage, (now) => {
    if (!started) started = now;
    const g = (now - started) / 1000 / 1.6;
    if (g <= 1.05) place(g);
    controls.update();
    renderer.render(scene, camera);
  });

  return { setData };
}

/* =====================================================================
 * 3. Badge vault: a safe door swings open onto two rings of 3D badge coins
 * =================================================================== */
function createVault(badges) {
  const stage = document.getElementById("vault-stage");
  if (!stage || stage.dataset.ready) return;
  stage.dataset.ready = "1";

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.prepend(renderer.domElement);
  renderer.domElement.style.touchAction = "pan-y";

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0a09, 16, 34);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.4, 19);

  // Reflections for the metal (built in code, no download)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.SpotLight(0xfff1e0, 260, 40, 0.6, 0.5);
  key.position.set(0, 12, 10);
  scene.add(key);
  const rim = new THREE.PointLight(0xfc3a52, 60, 30);
  rim.position.set(-8, -2, 4);
  scene.add(rim);

  /* ---- vault room: a ribbed cylinder seen from inside ---- */
  const room = new THREE.Mesh(
    new THREE.CylinderGeometry(12, 12, 16, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1b1815, metalness: 0.6, roughness: 0.55, side: THREE.BackSide })
  );
  scene.add(room);
  for (let i = 0; i < 24; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.25, 16, 0.25), new THREE.MeshStandardMaterial({ color: 0x2a2520, metalness: 0.8, roughness: 0.4 }));
    const a = (i / 24) * Math.PI * 2;
    if (Math.sin(a) > -0.05) continue;        // only the back wall; front ribs would block the camera
    rib.position.set(Math.cos(a) * 11.8, 0, Math.sin(a) * 11.8);
    scene.add(rib);
  }

  /* ---- front wall with a round opening for the door ---- */
  const wall = new THREE.Mesh(new THREE.RingGeometry(6.5, 40, 96), new THREE.MeshStandardMaterial({ color: 0x24201c, metalness: 0.7, roughness: 0.5 }));
  wall.position.z = 8.45;
  scene.add(wall);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(6.55, 0.35, 20, 96), new THREE.MeshStandardMaterial({ color: 0x55504a, metalness: 0.95, roughness: 0.3 }));
  frame.position.z = 8.5;
  scene.add(frame);

  /* ---- the door ---- */
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a8580, metalness: 0.95, roughness: 0.28 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x3a3632, metalness: 0.9, roughness: 0.35 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd4a24c, metalness: 1, roughness: 0.25 });
  const R = 6.2;
  const hinge = new THREE.Group();               // pivots on the left edge
  hinge.position.set(-R, 0, 9);
  scene.add(hinge);
  const door = new THREE.Group();
  door.position.x = R;
  hinge.add(door);
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1.1, 96), steel);
  slab.rotation.x = Math.PI / 2;
  door.add(slab);
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(R - 0.5, 0.18, 16, 96), darkSteel);
  ringA.position.z = 0.6;
  door.add(ringA);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(R - 2.1, 0.12, 16, 96), darkSteel);
  ringB.position.z = 0.6;
  door.add(ringB);
  for (let i = 0; i < 16; i++) {                 // locking bolts
    const a = (i / 16) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 20), brass);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(Math.cos(a) * (R - 1.15), Math.sin(a) * (R - 1.15), 0.65);
    door.add(bolt);
  }
  const wheel = new THREE.Group();               // the spinning handle
  wheel.position.z = 0.9;
  door.add(wheel);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.16, 16, 64), brass));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.5, 32), brass);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 12), brass);
    spoke.rotation.z = (i / 3) * Math.PI;
    wheel.add(spoke);
  }
  // red "unlocked" indicator
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfc3a52 }));
  led.position.set(0, R - 0.55, 0.62);
  door.add(led);

  /* ---- badge coins ---- */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function coinFace(b) {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d");
    const monthly = b.kind === "monthly";
    const grd = g.createRadialGradient(200, 170, 30, 256, 256, 260);
    if (monthly) { grd.addColorStop(0, "#ff8597"); grd.addColorStop(0.55, "#fc3a52"); grd.addColorStop(1, "#7d0b1e"); }
    else { grd.addColorStop(0, "#ffe7a3"); grd.addColorStop(0.55, "#e8a317"); grd.addColorStop(1, "#7a4f05"); }
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 10;
    g.beginPath(); g.arc(256, 256, 226, 0, Math.PI * 2); g.stroke();
    g.setLineDash([4, 14]); g.lineWidth = 6;
    g.beginPath(); g.arc(256, 256, 196, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    const year = b.date.slice(0, 4);
    if (monthly) {
      const m = b.name.split(" ")[0];
      g.font = "700 150px 'DM Sans', sans-serif"; g.fillText(m.toUpperCase(), 256, 230);
      g.font = "600 64px 'JetBrains Mono', monospace"; g.fillText(year, 256, 345);
      g.font = "600 30px 'DM Sans', sans-serif"; g.fillText("DAILY CHALLENGE", 256, 130);
    } else {
      const n = (b.name.match(/\d+/) || [""])[0];
      const annual = /annual/i.test(b.name);
      g.font = `700 ${annual ? 120 : 170}px 'DM Sans', sans-serif`; g.fillText(annual ? year : n, 256, 236);
      g.font = "600 42px 'DM Sans', sans-serif"; g.fillText(annual ? "ANNUAL" : "DAYS", 256, 345);
      const y2 = (b.name.match(/20\d\d/) || [""])[0];
      if (y2 && !annual) { g.font = "600 30px 'JetBrains Mono', monospace"; g.fillText(y2, 256, 140); }
    }
    return uprightOnCap(new THREE.CanvasTexture(c));
  }
  // Cylinder caps map textures sideways; turn them upright for the camera
  function uprightOnCap(t) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
    return t;
  }
  const backTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#2a2520"; g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#fc3a52"; g.font = "700 120px 'DM Sans', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("A.", 128, 136);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;   // the back cap already reads upright
    return t;
  })();

  const carousel = new THREE.Group();
  carousel.position.z = 0;
  scene.add(carousel);
  const tiers = [
    { items: badges.map((b, i) => ({ b, i })).filter((x) => x.b.kind === "streak"), y: 1.85, r: 6.4 },
    { items: badges.map((b, i) => ({ b, i })).filter((x) => x.b.kind === "monthly"), y: -1.85, r: 6.4 },
  ].filter((t) => t.items.length);
  if (tiers.length === 1) tiers[0].y = 0;

  const coinGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.16, 64);
  const rimMat = (kind) => new THREE.MeshStandardMaterial({ color: kind === "monthly" ? 0xb8b2ac : 0xd4a24c, metalness: 1, roughness: 0.22 });
  const coins = [];
  tiers.forEach((tier, ti) => {
    const n = tier.items.length;
    tier.items.forEach(({ b, i }, k) => {
      const face = new THREE.MeshStandardMaterial({ map: coinFace(b), metalness: 0.35, roughness: 0.35 });
      const back = new THREE.MeshStandardMaterial({ map: backTex, metalness: 0.5, roughness: 0.4 });
      const coin = new THREE.Mesh(coinGeo, [rimMat(b.kind), face, back]);
      coin.rotation.x = Math.PI / 2;               // cap +y now faces +z
      const holder = new THREE.Group();            // positions the coin on the ring
      const pivot = new THREE.Group();             // lets the selected coin fly and flip
      pivot.add(coin);
      holder.add(pivot);
      const a = (k / n) * Math.PI * 2 + ti * 0.35;
      holder.userData = { a, r: tier.r, y: tier.y };
      carousel.add(holder);
      coins.push({ index: i, badge: b, coin, pivot, holder, face, out: 0, flip: 0, rise: 0, hover: 0 });
    });
  });

  // Real badge art where LeetCode allows it (assets.leetcode.com sends CORS headers)
  const saveData = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ""));
  function loadArt() {
    if (saveData) return;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const queue = coins.filter((c) => c.badge.icon && c.badge.icon.startsWith("https://assets.leetcode.com/"));
    let active = 0;
    const next = () => {
      while (active < 2 && queue.length) {
        const c = queue.shift();
        active++;
        loader.load(c.badge.icon, (tex) => {
          c.face.map = uprightOnCap(tex); c.face.color.set(0xffffff); c.face.needsUpdate = true;
          active--; next();
        }, undefined, () => { active--; next(); });
      }
    };
    next();
  }

  /* ---- interaction: drag/swipe to spin, click/tap a coin to pull it out ---- */
  let spin = 0, vel = reduceMotion ? 0 : 0.0025, dragging = false, lastX = 0, downX = 0, downY = 0, selected = -1, hovered = null;
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  const canvas = renderer.domElement;
  const hit = (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const h = ray.intersectObjects(coins.map((c) => c.coin))[0];
    return h ? coins.find((c) => c.coin === h.object) : null;
  };
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = downX = e.clientX; downY = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (dragging) {
      if (Math.abs(e.clientX - downX) > 8 && spinTarget !== null) { spinTarget = null; selected = -1; }
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      vel = dx * 0.0045;
      spin += vel;
    } else if (e.pointerType === "mouse") {
      hovered = hit(e);
    }
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    if (e.type === "pointerup" && Math.hypot(e.clientX - downX, e.clientY - downY) < 8) {
      const c = hit(e);
      if (c) select(c.index, true);
      else select(-1, true);
    }
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("pointerleave", () => { hovered = null; });

  function select(index, fromVault) {
    selected = selected === index && fromVault ? -1 : index;
    if (selected >= 0) {
      // turn the carousel so the chosen coin faces the camera
      const c = coins.find((x) => x.index === selected);
      const want = c.holder.userData.a - Math.PI / 2;
      const twoPi = Math.PI * 2;
      let diff = ((want - spin) % twoPi + twoPi * 1.5) % twoPi - Math.PI;
      spinTarget = spin + diff;
      vel = 0;
      try { navigator.vibrate?.(10); } catch { /* ignore */ }
      if (fromVault) document.dispatchEvent(new CustomEvent("vault:selected", { detail: { index: selected } }));
    } else spinTarget = null;
  }
  let spinTarget = null;
  document.addEventListener("vault:select", (e) => select(e.detail.index, false));

  function resize() {
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = r.width < 600 ? 52 : 38;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const easeIO = (x) => { x = Math.min(1, Math.max(0, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  let opened = 0, last = 0;

  whenVisible(stage, (now) => {
    if (!opened) { opened = now; loadArt(); }
    const t = reduceMotion ? 99 : (now - opened) / 1000;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;

    // opening sequence: wheel spins, bolts retract, door swings, camera walks in
    wheel.rotation.z = -easeIO(t / 1.3) * Math.PI * 2.5;
    led.material.color.set(t > 1.3 ? 0x1aa37a : 0xfc3a52);
    hinge.rotation.y = -easeIO((t - 1.3) / 1.4) * 1.62;
    camera.position.z = 19 - easeIO((t - 2.0) / 1.6) * 4;
    camera.position.y = 0.4 + Math.sin(now / 2400) * 0.15;
    camera.lookAt(0, 0, 0);

    // carousel spin with inertia, or ease to the selected coin
    if (spinTarget !== null && !dragging) {
      spin += (spinTarget - spin) * 0.12;
    } else if (!dragging) {
      spin += vel;
      vel += ((reduceMotion ? 0 : 0.0025) - vel) * 0.02;   // settle back to a slow idle spin
    }
    carousel.rotation.y = spin;

    coins.forEach((c, k) => {
      const { a, r, y } = c.holder.userData;
      const appear = ease((t - 2.4 - k * 0.03) / 0.8);
      c.holder.position.set(Math.cos(a) * r * appear, y, Math.sin(a) * r * appear);
      c.holder.rotation.y = -a + Math.PI / 2;          // face outward
      c.holder.scale.setScalar(Math.max(0.001, appear));
      const isSel = c.index === selected;
      c.out += ((isSel ? 1 : 0) - c.out) * 0.1;
      c.hover += ((hovered === c ? 1 : 0) - c.hover) * 0.15;
      if (isSel) c.flip += dt * 3.2; else c.flip += (Math.round(c.flip / (Math.PI * 2)) * Math.PI * 2 - c.flip) * 0.1;
      c.pivot.position.z = c.out * 3.2 + c.hover * 0.5;
      c.pivot.position.y = Math.sin(now / 700 + k) * 0.08 * appear - y * 0.7 * c.out;   // selected coin drifts to centre
      c.pivot.scale.setScalar(1 + c.out * 0.45 + c.hover * 0.1);
      c.pivot.rotation.y = isSel ? Math.sin(c.flip) * 0.35 : c.flip;
      c.face.emissive.setRGB(0.25 * c.hover, 0.06 * c.hover, 0.08 * c.hover);
    });

    renderer.render(scene, camera);
  });
}

/* ---------------- boot ---------------- */
if (webglOK()) {
  try { heroNetwork(); } catch (err) { console.warn("[three] hero scene off:", err); }

  let sky = null;
  const showSkyline = (detail) => {
    try {
      if (!sky) sky = createSkyline();
      sky?.setData(detail.days || [], detail.label || "the past 12 months");
    } catch (err) { console.warn("[three] skyline off:", err); }
  };
  if (window.__lcCal) showSkyline(window.__lcCal);
  document.addEventListener("lc:calendar", (e) => showSkyline(e.detail));

  const openVault = (badges) => { try { if (badges?.length) createVault(badges); } catch (err) { console.warn("[three] vault off:", err); } };
  if (window.__lcBadges) openVault(window.__lcBadges);
  document.addEventListener("lc:badges", (e) => openVault(e.detail));
} else {
  const v = document.getElementById("vault-stage");
  if (v) v.hidden = true;
}
