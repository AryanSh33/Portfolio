/*
 * Project hover previews: a 5-second looping motion graphic per project,
 * drawn on a <canvas> so it plays like a GIF but stays sharp and tiny.
 * Mouse: plays on hover. Keyboard: plays on focus. Touch: plays while the
 * card is in the middle of the screen. Reduced motion: shows a still frame.
 */
(() => {
  "use strict";

  const LOOP = 5;                // seconds
  const W = 1600, H = 900;       // logical drawing space (16:9)
  const C = {
    red: "#fc3a52", redDeep: "#a8102a", cream: "#f6ecdd", ink: "#111111",
    ink2: "#555049", line: "#e7ddcd", white: "#ffffff", green: "#1aa37a", amber: "#e8a317",
  };
  const FONT = '"DM Sans", system-ui, sans-serif';
  const MONO = '"JetBrains Mono", ui-monospace, monospace';

  const reduceMotion = document.documentElement.classList.contains("reduce-motion");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- helpers ---------- */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));           // 0→1 between a and b
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const lerp = (a, b, x) => a + (b - a) * x;
  const typed = (s, x) => s.slice(0, Math.round(s.length * clamp(x)));
  function rand(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function pill(ctx, x, y, text, { bg = C.white, fg = C.ink, size = 30, font = FONT, pad = 22, stroke = null, a = 1, scale = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.font = `600 ${size}px ${font}`;
    const w = ctx.measureText(text).width + pad * 2, h = size * 1.9;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    rr(ctx, -w / 2, -h / 2, w, h, h / 2);
    ctx.fillStyle = bg; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 2);
    ctx.restore();
    return w;
  }
  function text(ctx, s, x, y, { size = 32, color = C.ink, weight = 600, font = FONT, align = "left", a = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "middle";
    ctx.fillText(s, x, y);
    ctx.restore();
  }
  function caret(ctx, x, y, h, t, color) {
    if (Math.floor(t * 2.5) % 2) return;
    ctx.fillStyle = color; ctx.fillRect(x + 4, y - h / 2, 4, h);
  }
  function dotAlong(ctx, x1, y1, x2, y2, p, r, color) {
    ctx.beginPath();
    ctx.arc(lerp(x1, x2, p), lerp(y1, y2, p), r, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
  }
  function counter(v, digits) { return v.toFixed(digits); }

  /* ======================================================================
   * Scenes. Each draws one frame for time t ∈ [0, 5).
   * ==================================================================== */

  // 1. LLM-powered data extraction: question → LLM → SQL/Mongo/Neo4j → JSON
  function sceneLLM(ctx, t) {
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);

    // question box
    const q = "Top 5 customers by revenue in 2026?";
    const qa = easeOut(seg(t, 0, 0.35));
    ctx.save();
    ctx.globalAlpha = qa;
    rr(ctx, 260, 70, 1080, 120, 30); ctx.fillStyle = C.white; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.stroke();
    text(ctx, "Ask", 310, 130, { size: 28, color: C.red, font: MONO, weight: 500 });
    const shown = typed(q, seg(t, 0.2, 1.3));
    text(ctx, shown, 400, 130, { size: 42 });
    ctx.font = `600 42px ${FONT}`;
    if (t < 1.6) caret(ctx, 400 + ctx.measureText(shown).width, 130, 46, t, C.red);
    ctx.restore();

    // RAG docs on the left
    const da = easeOut(seg(t, 0.8, 1.3));
    for (let i = 0; i < 3; i++) {
      const off = (1 - da) * 60;
      ctx.save();
      ctx.globalAlpha = da;
      ctx.translate(150 + i * 22 - off, 300 + i * 22);
      rr(ctx, 0, 0, 220, 170, 16); ctx.fillStyle = C.white; ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = C.line;
      for (let l = 0; l < 4; l++) ctx.fillRect(26, 34 + l * 30, l === 3 ? 100 : 168, 12);
      ctx.restore();
    }
    text(ctx, "RAG · docs", 260, 560, { size: 26, color: C.ink2, font: MONO, weight: 500, align: "center", a: da });

    // LLM core
    const cx = 800, cy = 390;
    const la = back(seg(t, 1.1, 1.6));
    const pulse = 1 + 0.06 * Math.sin(t * 8) * seg(t, 1.6, 2.4) * (1 - seg(t, 3.2, 3.6));
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(la * pulse, la * pulse);
    ctx.beginPath(); ctx.arc(0, 0, 96, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(252,58,82,${0.25 + 0.25 * Math.sin(t * 6)})`; ctx.lineWidth = 6; ctx.stroke();
    ctx.restore();
    if (la > 0.05) text(ctx, "LLM", cx, cy + 2, { size: 46, color: C.white, weight: 700, align: "center", a: clamp(la) });

    // docs → LLM particles
    for (let i = 0; i < 5; i++) {
      const p = seg(t, 1.2 + i * 0.12, 1.7 + i * 0.12);
      if (p > 0 && p < 1) dotAlong(ctx, 400, 400, cx - 100, cy, easeInOut(p), 9, C.red);
    }

    // DB nodes
    const dbs = [
      { x: 360, label: "SQL", q: "SELECT … GROUP BY", fill: C.white, fg: C.ink },
      { x: 800, label: "MongoDB", q: "db.orders.aggregate()", fill: C.red, fg: C.white },
      { x: 1240, label: "Neo4j", q: "MATCH (c)-[:BOUGHT]->()", fill: C.ink, fg: C.white },
    ];
    dbs.forEach((d, i) => {
      const a = seg(t, 1.6 + i * 0.12, 2.0 + i * 0.12);
      if (a <= 0) return;
      // connector
      ctx.save();
      ctx.globalAlpha = a;
      ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 60;
      ctx.strokeStyle = C.ink2; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy + 120); ctx.lineTo(d.x, 700); ctx.stroke();
      ctx.restore();
      // generated query
      text(ctx, typed(d.q, seg(t, 2.0 + i * 0.15, 2.7 + i * 0.15)), d.x, 640, { size: 24, color: C.ink2, font: MONO, weight: 500, align: "center" });
      pill(ctx, d.x, 740, d.label, { bg: d.fill, fg: d.fg, size: 34, stroke: d.fill === C.white ? C.line : null, scale: back(a) });
      // query out, results back
      const out = seg(t, 2.2 + i * 0.1, 2.7 + i * 0.1);
      if (out > 0 && out < 1) dotAlong(ctx, cx, cy + 120, d.x, 700, easeInOut(out), 10, C.red);
      const ret = seg(t, 3.0 + i * 0.1, 3.5 + i * 0.1);
      if (ret > 0 && ret < 1) dotAlong(ctx, d.x, 700, cx, cy + 120, easeInOut(ret), 10, C.green);
    });

    // structured JSON result
    const ja = easeOut(seg(t, 3.5, 3.9));
    if (ja > 0) {
      ctx.save();
      ctx.globalAlpha = ja;
      ctx.translate(1020 + (1 - ja) * 60, 250);
      rr(ctx, 0, 0, 440, 300, 22); ctx.fillStyle = C.ink; ctx.fill();
      text(ctx, "{ result }", 30, 44, { size: 26, color: C.red, font: MONO, weight: 500 });
      const vals = [0.95, 0.8, 0.66, 0.52, 0.4];
      vals.forEach((v, i) => {
        const g = easeOut(seg(t, 3.7 + i * 0.1, 4.2 + i * 0.1));
        text(ctx, `#${i + 1}`, 30, 96 + i * 42, { size: 22, color: "#cfc8bd", font: MONO, weight: 500 });
        ctx.fillStyle = i === 0 ? C.red : "#3a3632";
        rr(ctx, 90, 84 + i * 42, 310 * v * g, 22, 11); ctx.fill();
      });
      ctx.restore();
    }
  }

  // 2. QGNN cyber threat: live graph → anomaly → spreading attack → LLM explanation
  const qg = (() => {
    const r = rand(42);
    const nodes = [];
    for (let i = 0; i < 16; i++) nodes.push({ x: 160 + r() * 1280, y: 120 + r() * 560 });
    const d = (i, j) => Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
    const has = (i, j) => edges.some(([p, q]) => (p === i && q === j) || (p === j && q === i));
    const edges = [];
    // Minimum spanning tree keeps the network in one piece…
    const inTree = [0];
    while (inTree.length < nodes.length) {
      let best = null;
      inTree.forEach((i) => nodes.forEach((_, j) => {
        if (inTree.includes(j)) return;
        if (!best || d(i, j) < best[2]) best = [i, j, d(i, j)];
      }));
      edges.push([best[0], best[1]]);
      inTree.push(best[1]);
    }
    // …plus a few short extra links so it looks like a mesh
    nodes.forEach((_, i) => {
      const j = nodes.map((__, k) => k).filter((k) => k !== i && !has(i, k)).sort((a, b) => d(i, a) - d(i, b))[0];
      if (j !== undefined && d(i, j) < 330 && i % 2 === 0) edges.push([i, j]);
    });
    // Compromised node: the one closest to the centre
    const src = nodes.map((n, i) => [i, Math.hypot(n.x - 800, n.y - 400)]).sort((a, b) => a[1] - b[1])[0][0];
    const dist = Array(nodes.length).fill(Infinity); dist[src] = 0;
    const queue = [src];
    while (queue.length) {
      const u = queue.shift();
      edges.forEach(([a, b]) => {
        const v = a === u ? b : b === u ? a : -1;
        if (v >= 0 && dist[v] === Infinity) { dist[v] = dist[u] + 1; queue.push(v); }
      });
    }
    return { nodes, edges, src, dist };
  })();
  function sceneQGNN(ctx, t) {
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
    // faint grid
    ctx.strokeStyle = "rgba(255,255,255,.04)"; ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const { nodes, edges, src, dist } = qg;
    const maxHop = Math.max(...dist.filter(Number.isFinite));
    const spread = seg(t, 1.8, 3.4) * Math.min(maxHop, 5);   // hops reached
    const infected = (i) => dist[i] <= spread;

    edges.forEach(([a, b], k) => {
      const ea = seg(t, 0.2 + k * 0.02, 0.7 + k * 0.02);
      if (!ea) return;
      const A = nodes[a], B = nodes[b];
      const hot = infected(a) && infected(b) && t > 1.8;
      ctx.globalAlpha = ea;
      ctx.strokeStyle = hot ? C.red : "rgba(255,255,255,.22)";
      ctx.lineWidth = hot ? 5 : 3;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(lerp(A.x, B.x, ea), lerp(A.y, B.y, ea)); ctx.stroke();
      // packets
      if (ea === 1) {
        const p = ((t * 0.6 + k * 0.137) % 1);
        dotAlong(ctx, A.x, A.y, B.x, B.y, p, hot ? 8 : 6, hot ? C.red : "#9be3c6");
      }
      ctx.globalAlpha = 1;
    });

    nodes.forEach((n, i) => {
      const s = back(seg(t, 0.05 * i, 0.05 * i + 0.4));
      if (s <= 0) return;
      const hot = infected(i) && t > 1.8;
      ctx.beginPath(); ctx.arc(n.x, n.y, 20 * s, 0, Math.PI * 2);
      ctx.fillStyle = hot ? C.red : "#f6ecdd"; ctx.fill();
      if (i === src && t > 1.6) {
        for (let k = 0; k < 2; k++) {
          const p = ((t - 1.6) * 0.9 + k * 0.5) % 1;
          ctx.beginPath(); ctx.arc(n.x, n.y, 20 + p * 90, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(252,58,82,${(1 - p) * 0.8})`; ctx.lineWidth = 4; ctx.stroke();
        }
      }
    });

    // status chip
    const live = t < 1.8;
    pill(ctx, 230, 70, live ? "● monitoring" : "● anomaly", { bg: live ? "rgba(26,163,122,.18)" : "rgba(252,58,82,.2)", fg: live ? "#9be3c6" : C.red, size: 26, font: MONO });

    // LLM explanation card
    const ca = easeOut(seg(t, 3.0, 3.4));
    if (ca > 0) {
      ctx.save();
      ctx.globalAlpha = ca;
      ctx.translate(820, 640 + (1 - ca) * 40);
      rr(ctx, 0, 0, 720, 210, 22); ctx.fillStyle = C.white; ctx.fill();
      text(ctx, "LLM · threat summary", 32, 46, { size: 24, color: C.red, font: MONO, weight: 500 });
      text(ctx, typed("Lateral movement from 10.0.4.17 via SMB.", seg(t, 3.2, 3.9)), 32, 102, { size: 30 });
      text(ctx, typed("Isolate host · rotate credentials.", seg(t, 3.9, 4.5)), 32, 154, { size: 30, color: C.ink2, weight: 500 });
      ctx.restore();
    }
  }

  // 3. Deepfake: face → ViT patches + CNN features → cross-attention → verdict
  function sceneDeepfake(ctx, t) {
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
    const fx = 470, fy = 450, fw = 520, fh = 640;

    // face
    const fa = easeOut(seg(t, 0, 0.5));
    ctx.save();
    ctx.globalAlpha = fa;
    rr(ctx, fx - fw / 2, fy - fh / 2, fw, fh, 30); ctx.fillStyle = "#2a2724"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(fx, fy + 10, 170, 220, 0, 0, Math.PI * 2); ctx.fillStyle = "#e9d6bd"; ctx.fill();
    ctx.fillStyle = C.ink;
    const blink = Math.abs(Math.sin(t * 1.3)) < 0.05 ? 0.15 : 1;
    ctx.beginPath(); ctx.ellipse(fx - 62, fy - 30, 18, 18 * blink, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fx + 62, fy - 30, 18, 18 * blink, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(fx, fy + 70, 60, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.restore();

    // MTCNN box
    const ba = seg(t, 0.4, 0.8);
    if (ba > 0) {
      ctx.strokeStyle = "#9be3c6"; ctx.lineWidth = 5; ctx.globalAlpha = ba;
      const bw = lerp(fw, 380, easeOut(ba)), bh = lerp(fh, 480, easeOut(ba));
      ctx.strokeRect(fx - bw / 2, fy + 10 - bh / 2, bw, bh);
      text(ctx, "MTCNN face", fx - bw / 2, fy + 10 - bh / 2 - 26, { size: 22, color: "#9be3c6", font: MONO, weight: 500 });
      ctx.globalAlpha = 1;
    }

    // ViT patch grid + attention
    const N = 8, px0 = fx - 190, py0 = fy + 10 - 240, ps = 380 / N, psy = 480 / N;
    const ga = seg(t, 0.8, 1.3);
    const r = rand(7);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const w = r();
      const order = (i + j) / (2 * N);
      const h = seg(t, 1.3 + order * 1.2, 1.6 + order * 1.2) * (1 - seg(t, 4.5, 5));
      if (h > 0) {
        ctx.fillStyle = `rgba(252,58,82,${0.08 + 0.55 * w * w * h})`;
        ctx.fillRect(px0 + j * ps, py0 + i * psy, ps, psy);
      }
    }
    if (ga > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.35 * ga})`; ctx.lineWidth = 2;
      for (let k = 0; k <= N; k++) {
        ctx.beginPath(); ctx.moveTo(px0 + k * ps, py0); ctx.lineTo(px0 + k * ps, py0 + 480 * easeOut(ga)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px0, py0 + k * psy); ctx.lineTo(px0 + 380 * easeOut(ga), py0 + k * psy); ctx.stroke();
      }
    }
    // scan line
    const sl = seg(t, 1.3, 2.8);
    if (sl > 0 && sl < 1) {
      const y = py0 + 480 * sl;
      const g = ctx.createLinearGradient(0, y - 40, 0, y);
      g.addColorStop(0, "rgba(252,58,82,0)"); g.addColorStop(1, "rgba(252,58,82,.7)");
      ctx.fillStyle = g; ctx.fillRect(px0, y - 40, 380, 40);
    }

    // branches
    const bx = 860;
    [["ViT", 300, C.red], ["ResNet50", 440, C.cream]].forEach(([label, y, col], i) => {
      const a = seg(t, 1.2 + i * 0.15, 1.5 + i * 0.15);
      if (!a) return;
      text(ctx, label, bx, y - 44, { size: 30, color: C.white, a });
      ctx.globalAlpha = a;
      rr(ctx, bx, y - 16, 300, 32, 16); ctx.fillStyle = "#2a2724"; ctx.fill();
      rr(ctx, bx, y - 16, 300 * easeInOut(seg(t, 1.4 + i * 0.2, 2.8)), 32, 16); ctx.fillStyle = col; ctx.fill();
      ctx.globalAlpha = 1;
      // merge lines
      const m = seg(t, 2.8, 3.2);
      if (m > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * m})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(bx + 300, y); ctx.quadraticCurveTo(bx + 380, y, bx + 380, 370); ctx.stroke();
      }
    });
    const ma = back(seg(t, 3.0, 3.35));
    if (ma > 0) pill(ctx, bx + 380 + 10, 370, "cross-attention", { bg: C.white, fg: C.ink, size: 26, font: MONO, scale: ma });

    // verdict
    const va = easeOut(seg(t, 3.4, 3.8));
    if (va > 0) {
      ctx.save();
      ctx.globalAlpha = va;
      ctx.translate(bx, 560 + (1 - va) * 40);
      rr(ctx, 0, 0, 620, 230, 24); ctx.fillStyle = C.red; ctx.fill();
      text(ctx, "FAKE", 36, 90, { size: 96, color: C.white, weight: 700 });
      const conf = 50 + 49.33 * easeOut(seg(t, 3.5, 4.4));
      text(ctx, `${counter(conf, 2)}%`, 590, 90, { size: 64, color: C.white, weight: 700, align: "right" });
      text(ctx, "confidence · ROC-AUC 0.9997", 36, 180, { size: 26, color: "rgba(255,255,255,.85)", font: MONO, weight: 500 });
      ctx.restore();
    }
  }

  // 4. Brain tumor: MRI → slice sweep → Swin-UNet mask → Grad-CAM → metrics
  function brainPath(ctx, cx, cy) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, 300, 360, 0, 0, Math.PI * 2);
  }
  function tumorPath(ctx, cx, cy, wobble) {
    ctx.beginPath();
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 78 + 16 * Math.sin(a * 3 + 0.6) + 10 * Math.cos(a * 5) + wobble * Math.sin(a * 2);
      const x = cx + Math.cos(a) * r * 1.15, y = cy + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  function sceneBrain(ctx, t) {
    ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, W, H);
    const cx = 520, cy = 450, tx = 600, ty = 360;

    // MRI slice
    const ma = easeOut(seg(t, 0, 0.6));
    ctx.save();
    ctx.globalAlpha = ma;
    brainPath(ctx, cx, cy);
    const g = ctx.createRadialGradient(cx - 40, cy - 60, 40, cx, cy, 380);
    g.addColorStop(0, "#9a948c"); g.addColorStop(0.6, "#5d5953"); g.addColorStop(1, "#1d1b19");
    ctx.fillStyle = g; ctx.fill();
    ctx.clip();
    // gyri
    ctx.strokeStyle = "rgba(20,18,16,.55)"; ctx.lineWidth = 6;
    for (let k = -6; k <= 6; k++) {
      ctx.beginPath();
      for (let y = cy - 360; y <= cy + 360; y += 12) {
        const x = cx + k * 46 + 14 * Math.sin(y / 26 + k);
        y === cy - 360 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(10,10,10,.55)";
    ctx.beginPath(); ctx.ellipse(cx - 60, cy + 40, 40, 90, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 60, cy + 40, 40, 90, -0.2, 0, Math.PI * 2); ctx.fill();
    // tumor tissue (brighter)
    tumorPath(ctx, tx, ty, 0); ctx.fillStyle = "rgba(230,224,214,.55)"; ctx.fill();
    ctx.restore();

    // slice sweep
    const sw = seg(t, 0.6, 1.6);
    if (sw > 0 && sw < 1) {
      const y = cy - 360 + 720 * easeInOut(sw);
      ctx.fillStyle = "rgba(155,227,198,.25)"; ctx.fillRect(cx - 330, y - 6, 660, 12);
      ctx.fillStyle = "#9be3c6"; ctx.fillRect(cx - 330, y - 1, 660, 2);
    }

    // Grad-CAM heat
    const ha = seg(t, 3.0, 3.6) * (1 - seg(t, 4.6, 5));
    if (ha > 0) {
      const hg = ctx.createRadialGradient(tx, ty, 10, tx, ty, 230);
      hg.addColorStop(0, `rgba(255,230,80,${0.75 * ha})`);
      hg.addColorStop(0.35, `rgba(252,58,82,${0.6 * ha})`);
      hg.addColorStop(0.7, `rgba(60,90,255,${0.35 * ha})`);
      hg.addColorStop(1, "rgba(60,90,255,0)");
      ctx.save(); brainPath(ctx, cx, cy); ctx.clip();
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // segmentation contour
    const cp = seg(t, 1.6, 2.7);
    if (cp > 0) {
      ctx.save();
      tumorPath(ctx, tx, ty, 6 * Math.sin(t * 3) * (1 - seg(t, 2.7, 3)));
      const len = 620;
      ctx.setLineDash([len * easeInOut(cp), len]);
      ctx.strokeStyle = C.red; ctx.lineWidth = 7; ctx.stroke();
      ctx.setLineDash([]);
      const fill = seg(t, 2.6, 3.0);
      if (fill > 0) { ctx.fillStyle = `rgba(252,58,82,${0.4 * fill})`; ctx.fill(); }
      ctx.restore();
    }

    // labels + metrics
    text(ctx, "MRI · axial slice", 230, 60, { size: 24, color: "#cfc8bd", font: MONO, weight: 500, a: ma });
    const la = seg(t, 1.8, 2.2);
    if (la > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * la})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tx + 100, ty - 40); ctx.lineTo(950, 200); ctx.stroke();
      text(ctx, "Swin-UNet mask", 960, 200, { size: 30, color: C.white, a: la });
    }
    const mx = 1000;
    const metrics = [
      ["Dice", 0.94, 2, ""], ["Accuracy", 97, 0, "%"], ["HD95", 1, 0, ""],
    ];
    metrics.forEach(([k, v, d, suf], i) => {
      const a = easeOut(seg(t, 3.0 + i * 0.2, 3.4 + i * 0.2));
      if (!a) return;
      const y = 380 + i * 150;
      ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - a) * 40, 0);
      text(ctx, k, mx, y, { size: 30, color: "#cfc8bd", weight: 500 });
      const val = (k === "HD95" ? lerp(9, v, easeOut(seg(t, 3.2, 4.4))) : v * easeOut(seg(t, 3.2 + i * 0.2, 4.4)));
      text(ctx, counter(val, d) + suf, mx + 470, y, { size: 72, color: i === 0 ? C.red : C.white, weight: 700, align: "right" });
      ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(mx, y + 52, 470, 2);
      ctx.restore();
    });
  }

  // 5. ResearchLM: query → papers → BERT keyphrases → LLM summary
  function sceneResearch(ctx, t) {
    ctx.fillStyle = C.white; ctx.fillRect(0, 0, W, H);
    // search bar
    const sa = easeOut(seg(t, 0, 0.3));
    ctx.save(); ctx.globalAlpha = sa;
    rr(ctx, 120, 60, 1360, 110, 55); ctx.fillStyle = C.cream; ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(190, 113, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(204, 127); ctx.lineTo(222, 145); ctx.stroke();
    const q = typed("graph neural networks for intrusion detection", seg(t, 0.15, 1.3));
    text(ctx, q, 250, 115, { size: 40, weight: 500 });
    ctx.font = `500 40px ${FONT}`;
    if (t < 1.5) caret(ctx, 250 + ctx.measureText(q).width, 115, 44, t, C.red);
    ctx.restore();

    // papers
    const papers = [
      ["Quantized GNNs for real-time IDS", ["GNN", "anomaly", "quantization"]],
      ["Attack graphs from network flows", ["attack graph", "NetFlow"]],
      ["Explaining alerts with LLMs", ["LLM", "explainability"]],
    ];
    papers.forEach(([title, keys], i) => {
      const a = easeOut(seg(t, 1.3 + i * 0.18, 1.7 + i * 0.18));
      if (!a) return;
      const y = 230 + i * 210;
      ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - a) * -80, 0);
      rr(ctx, 120, y, 780, 180, 22); ctx.fillStyle = C.white; ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = C.red; ctx.fillRect(120, y + 30, 6, 120);
      text(ctx, title, 156, y + 50, { size: 32 });
      ctx.fillStyle = C.line; ctx.fillRect(156, y + 84, 560, 10);
      let x = 156;
      keys.forEach((k, j) => {
        const ka = back(seg(t, 2.1 + i * 0.15 + j * 0.1, 2.4 + i * 0.15 + j * 0.1));
        if (ka <= 0) return;
        ctx.font = `600 22px ${MONO}`;
        const w = ctx.measureText(k).width + 30;
        pill(ctx, x + w / 2, y + 138, k, { bg: j === 0 ? C.red : C.ink, fg: C.white, size: 22, font: MONO, pad: 15, scale: ka });
        x += w + 12;
      });
      ctx.restore();
    });
    const ka = seg(t, 2.1, 2.4);
    text(ctx, "BERT keyphrases", 900, 200, { size: 22, color: C.ink2, font: MONO, weight: 500, align: "right", a: ka });

    // summary panel
    const pa = easeOut(seg(t, 3.0, 3.35));
    if (pa > 0) {
      ctx.save(); ctx.globalAlpha = pa; ctx.translate(960 + (1 - pa) * 80, 230);
      rr(ctx, 0, 0, 520, 600, 26); ctx.fillStyle = C.ink; ctx.fill();
      pill(ctx, 120, 60, "✦ LLM summary", { bg: C.red, fg: C.white, size: 24, font: MONO, pad: 16 });
      const widths = [430, 400, 440, 300, 420, 380, 220];
      widths.forEach((w, i) => {
        const g = easeOut(seg(t, 3.3 + i * 0.13, 3.7 + i * 0.13));
        ctx.fillStyle = i === 3 || i === 6 ? "#5d5953" : "#cfc8bd";
        rr(ctx, 40, 140 + i * 58, w * g, 18, 9); ctx.fill();
      });
      ctx.restore();
    }
  }

  const SCENES = { llm: sceneLLM, qgnn: sceneQGNN, deepfake: sceneDeepfake, brain: sceneBrain, research: sceneResearch };
  const STILL_AT = 4.4; // frame shown when motion is reduced

  /* ---------- player ---------- */
  class Preview {
    constructor(media, draw) {
      this.media = media;
      this.card = media.closest(".card");
      this.draw = draw;
      this.canvas = document.createElement("canvas");
      this.canvas.className = "preview";
      this.canvas.setAttribute("aria-hidden", "true");
      media.appendChild(this.canvas);
      const badge = document.createElement("span");
      badge.className = "preview-badge";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = finePointer ? "Hover · 5s preview" : "5s preview";
      media.appendChild(badge);
      this.ctx = this.canvas.getContext("2d");
      this.raf = 0; this.start = 0; this.playing = false;
      new ResizeObserver(() => this.resize()).observe(media);
    }
    resize() {
      const r = this.media.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.max(1, Math.round(r.width * dpr));
      this.canvas.height = Math.max(1, Math.round(r.height * dpr));
      this.scale = this.canvas.width / W;
      this.offsetY = (this.canvas.height - H * this.scale) / 2;
      if (!this.playing && this.card.classList.contains("is-playing")) this.frame(STILL_AT);
    }
    frame(t) {
      const { ctx } = this;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = C.ink; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(this.scale, 0, 0, this.scale, 0, this.offsetY);
      ctx.save();
      this.draw(ctx, t);
      ctx.restore();
      // loop fade and progress bar, like a short video
      const fade = Math.max(1 - seg(t, 0, 0.25), seg(t, LOOP - 0.35, LOOP));
      if (fade > 0) { ctx.fillStyle = `rgba(17,17,17,${fade * 0.9})`; ctx.fillRect(0, 0, W, H); }
      ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(0, H - 10, W, 10);
      ctx.fillStyle = C.red; ctx.fillRect(0, H - 10, W * (t / LOOP), 10);
    }
    play() {
      this.card.classList.add("is-playing");
      if (reduceMotion) { this.frame(STILL_AT); return; }
      if (this.playing) return;
      this.playing = true;
      this.start = performance.now();
      const step = (now) => {
        if (!this.playing) return;
        this.frame(((now - this.start) / 1000) % LOOP);
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }
    stop() {
      this.card.classList.remove("is-playing");
      this.playing = false;
      cancelAnimationFrame(this.raf);
    }
  }

  const players = [];
  document.querySelectorAll("[data-preview]").forEach((media) => {
    const draw = SCENES[media.dataset.preview];
    if (!draw) return;
    const p = new Preview(media, draw);
    players.push(p);
    const card = p.card;
    if (finePointer) {
      card.addEventListener("pointerenter", () => p.play());
      card.addEventListener("pointerleave", () => p.stop());
    }
    card.addEventListener("focusin", () => p.play());
    card.addEventListener("focusout", () => p.stop());
  });

  // Touch screens: play the card that sits in the middle of the viewport
  if (!finePointer && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const p = players.find((x) => x.card === e.target);
        if (!p) return;
        e.isIntersecting ? p.play() : p.stop();
      });
    }, { rootMargin: "-35% 0px -35% 0px" });
    players.forEach((p) => io.observe(p.card));
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) players.forEach((p) => p.playing && p.stop());
  });
})();
