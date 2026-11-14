(() => {
  "use strict";

  const GH_USER = "AryanSh33";
  const LC_USER = "aryanmsharma";
  // Fallbacks from the résumé, shown if a live API is down.
  const LC_FALLBACK = { solvedProblem: 1200, easySolved: null, mediumSolved: null, hardSolved: null };

  const reduceMotion = document.documentElement.classList.contains("reduce-motion");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const fmt = new Intl.NumberFormat("en-IN");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------------- Motion switch ---------------- */
  // Every animation reads the setting once at start-up, so a change reloads the page in place.
  const motionBtn = $("#motion-toggle");
  motionBtn.setAttribute("aria-pressed", String(!reduceMotion));
  motionBtn.title = reduceMotion ? "Turn animations on" : "Turn animations off";
  motionBtn.addEventListener("click", () => {
    try { localStorage.setItem("motion", reduceMotion ? "on" : "off"); } catch { /* storage blocked */ }
    try { sessionStorage.setItem("scrollY", String(window.scrollY)); } catch { /* ignore */ }
    location.reload();
  });
  try {
    const y = sessionStorage.getItem("scrollY");
    if (y) { sessionStorage.removeItem("scrollY"); window.scrollTo(0, Number(y)); }
  } catch { /* ignore */ }

  /* ---------------- Nav: border on scroll + current section ---------------- */
  const nav = $(".nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const navLinks = $$('.nav__links a[href^="#"]');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === "#" + e.target.id ? "true" : "false"));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["work", "experience", "code", "about", "contact"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });

  /* ---------------- Reveal on scroll ---------------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("is-in");
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = reduceMotion ? "0ms" : `${(i % 3) * 80}ms`;
    revealObserver.observe(el);
  });
  // Tilt containers that are not .reveal still need is-in for the transform rule
  $$(".tilt:not(.reveal)").forEach((el) => el.classList.add("is-in"));

  /* ---------------- Hero role rotator ---------------- */
  (() => {
    const words = $$(".rotator__word");
    const roles = $$(".role");
    const rolesList = $(".roles");
    const title = $("#hero-title");
    if (!words.length) return;
    const STEP = 2600;
    const MAX_STEPS = words.length * 3;   // stop after three rounds (WCAG 2.2.2)
    let idx = 0, steps = 0, timer = null, paused = false;
    rolesList.style.setProperty("--role-ms", `${STEP}ms`);

    const show = (next) => {
      if (next === idx) return;
      const prev = words[idx];
      prev.classList.remove("is-on");
      prev.classList.add("is-out");
      setTimeout(() => prev.classList.remove("is-out"), 700);
      idx = next;
      words[idx].classList.add("is-on");
      const role = words[idx].dataset.role;
      roles.forEach((r) => {
        r.classList.remove("is-on");
        if (r.dataset.role === role) { void r.offsetWidth; r.classList.add("is-on"); }
      });
    };
    const tick = () => {
      if (paused) return;
      steps++;
      show((idx + 1) % words.length);
      if (steps >= MAX_STEPS - 1) { stop(); return; }
    };
    const start = () => { if (!timer) timer = setInterval(tick, STEP); };
    const stop = () => { clearInterval(timer); timer = null; rolesList.classList.add("is-paused"); };

    if (reduceMotion) { rolesList.classList.add("is-paused"); return; }
    start();

    // Pause while the visitor is reading the headline or the roles
    [title, rolesList].forEach((el) => {
      el.addEventListener("pointerenter", () => { paused = true; rolesList.classList.add("is-paused"); });
      el.addEventListener("pointerleave", () => { paused = false; if (timer) rolesList.classList.remove("is-paused"); });
    });
    // Hovering a role shows its word
    roles.forEach((r) => r.addEventListener("pointerenter", () => {
      const i = words.findIndex((w) => w.dataset.role === r.dataset.role);
      if (i >= 0) show(i);
    }));
    document.addEventListener("visibilitychange", () => (document.hidden ? (paused = true) : (paused = false)));
  })();

  /* ---------------- Motion: cursor, tilt, magnetic, parallax ---------------- */
  if (finePointer && !reduceMotion) {
    document.documentElement.classList.add("has-cursor");
    const cursor = $(".cursor");
    const dot = $(".cursor__dot");
    const ring = $(".cursor__ring");
    const label = $(".cursor__label");
    let mx = -100, my = -100, rx = -100, ry = -100;

    window.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      cursor.classList.remove("is-hidden");
    }, { passive: true });
    document.addEventListener("pointerleave", () => cursor.classList.add("is-hidden"));

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();

    // Hover states: links/buttons grow the ring; data-cursor shows a word
    document.addEventListener("pointerover", (e) => {
      const labelled = e.target.closest("[data-cursor]");
      const interactive = e.target.closest("a, button");
      cursor.classList.toggle("is-label", !!labelled);
      cursor.classList.toggle("is-hover", !labelled && !!interactive);
      label.textContent = labelled ? labelled.dataset.cursor : "";
    });

    // 3D tilt + spotlight for containers
    $$(".tilt").forEach((el) => {
      const max = el.classList.contains("tilt--soft") ? 3 : 7;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.classList.add("is-tilting");
        el.style.setProperty("--ry", `${(px - 0.5) * max * 2}deg`);
        el.style.setProperty("--rx", `${(0.5 - py) * max * 2}deg`);
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        el.style.setProperty("--glow", "1");
      });
      el.addEventListener("pointerleave", () => {
        el.classList.remove("is-tilting");
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--glow", "0");
      });
    });

    // Magnetic buttons and links
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transition = "transform 120ms linear";
        el.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform 500ms cubic-bezier(.2,.7,.2,1)";
        el.style.transform = "";
      });
    });

    // Hero chips drift against the cursor
    const field = $(".hero__field");
    const hero = $(".hero");
    const layers = $$("[data-depth]", field);
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach((l) => {
        const d = parseFloat(l.dataset.depth);
        l.style.setProperty("--px", `${-nx * 40 * d}px`);
        l.style.setProperty("--py", `${-ny * 40 * d}px`);
      });
    });
    hero.addEventListener("pointerleave", () => layers.forEach((l) => {
      l.style.setProperty("--px", "0px");
      l.style.setProperty("--py", "0px");
    }));
  }

  /* ---------------- Touch + press motion (all pointers, tuned for fingers) ---------------- */
  const buzz = (ms = 8) => { try { navigator.vibrate?.(ms); } catch { /* not supported */ } };
  const PRESSABLE = ".btn, .card, .role, .tab, .badge-chip, .socials a, .chip, .nav__cta, .repo, .job, .tile, .contact__mail, .panel__link";

  if (!reduceMotion) {
    // Ripple from the exact touch/click point + press-down scale
    document.addEventListener("pointerdown", (e) => {
      const el = e.target.closest(PRESSABLE);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.2;
      const rip = document.createElement("span");
      rip.className = "ripple";
      rip.setAttribute("aria-hidden", "true");
      rip.style.width = rip.style.height = `${size}px`;
      rip.style.left = `${e.clientX - r.left - size / 2}px`;
      rip.style.top = `${e.clientY - r.top - size / 2}px`;
      el.appendChild(rip);
      rip.addEventListener("animationend", () => rip.remove());
      el.classList.add("is-pressed");
      if (e.pointerType !== "mouse") buzz();
    });
    const release = () => $$(".is-pressed").forEach((el) => el.classList.remove("is-pressed"));
    ["pointerup", "pointercancel", "dragend"].forEach((t) => document.addEventListener(t, release));
    window.addEventListener("scroll", release, { passive: true });
  }

  if (!finePointer && !reduceMotion) {
    document.documentElement.classList.add("is-touch");

    // Finger-driven tilt + spotlight: press and slide across a container
    $$(".tilt").forEach((el) => {
      const max = el.classList.contains("tilt--soft") ? 4 : 9;
      let active = false;
      const apply = (e) => {
        const r = el.getBoundingClientRect();
        const px = clamp01((e.clientX - r.left) / r.width);
        const py = clamp01((e.clientY - r.top) / r.height);
        el.classList.add("is-tilting");
        el.style.setProperty("--ry", `${(px - 0.5) * max * 2}deg`);
        el.style.setProperty("--rx", `${(0.5 - py) * max * 2}deg`);
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        el.style.setProperty("--glow", "1");
      };
      const reset = () => {
        active = false;
        el.classList.remove("is-tilting");
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--glow", "0");
      };
      el.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") return; active = true; apply(e); });
      el.addEventListener("pointermove", (e) => { if (active) apply(e); });
      ["pointerup", "pointercancel", "pointerleave"].forEach((t) => el.addEventListener(t, reset));
    });

    // Hero: a tap pushes the stat chips away from the finger, then they spring back
    const field = $(".hero__field");
    const layers = $$(".chip", field);
    field.addEventListener("pointerdown", (e) => {
      layers.forEach((l) => {
        const r = l.getBoundingClientRect();
        const dx = r.left + r.width / 2 - e.clientX;
        const dy = r.top + r.height / 2 - e.clientY;
        const dist = Math.max(40, Math.hypot(dx, dy));
        const push = Math.min(60, 9000 / dist);
        l.style.setProperty("--px", `${(dx / dist) * push}px`);
        l.style.setProperty("--py", `${(dy / dist) * push}px`);
      });
      const hit = e.target.closest(".chip");
      if (hit) { hit.classList.remove("is-pop"); void hit.offsetWidth; hit.classList.add("is-pop"); }
      setTimeout(() => layers.forEach((l) => { l.style.setProperty("--px", "0px"); l.style.setProperty("--py", "0px"); }), 420);
    });
  }
  function clamp01(v) { return Math.min(1, Math.max(0, v)); }

  /* ---------------- Copy email ---------------- */
  const copyBtn = $("#copy-email");
  const copyStatus = $("#copy-status");
  copyBtn.addEventListener("click", async () => {
    const email = "aryanmsharma11@gmail.com";
    try {
      await navigator.clipboard.writeText(email);
      copyStatus.textContent = "Copied";
    } catch {
      copyStatus.textContent = "Select the address to copy it";
    }
    clearTimeout(copyBtn._t);
    copyBtn._t = setTimeout(() => (copyStatus.textContent = ""), 3000);
  });

  /* ---------------- Data helpers ---------------- */
  const CACHE_MS = 1000 * 60 * 60 * 6; // 6 h, spares the shared API rate limits
  async function getJSON(url, key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const { t, v } = JSON.parse(raw);
        if (Date.now() - t < CACHE_MS) return v;
      }
    } catch { /* storage blocked: just fetch */ }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const v = await res.json();
      try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v })); } catch { /* ignore */ }
      return v;
    } finally {
      clearTimeout(timer);
    }
  }

  const dateLabel = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const isoDay = (d) => d.toISOString().slice(0, 10);

  // Tooltip shared by both heatmaps
  const tip = document.createElement("div");
  tip.className = "heat-tip";
  tip.setAttribute("aria-hidden", "true");
  document.body.appendChild(tip);
  function bindTip(container) {
    if (container.dataset.tipBound) return;
    container.dataset.tipBound = "1";
    container.addEventListener("pointerover", (e) => {
      const c = e.target.closest("i[data-tip]");
      if (!c) return;
      const r = c.getBoundingClientRect();
      tip.textContent = c.dataset.tip;
      tip.style.left = `${r.left + r.width / 2}px`;
      tip.style.top = `${r.top}px`;
      tip.classList.add("is-on");
    });
    container.addEventListener("pointerout", () => tip.classList.remove("is-on"));
  }

  /** days: [{date: 'YYYY-MM-DD', count, level}] sorted ascending */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function renderMonths(el, days, pad) {
    let row = el.previousElementSibling;
    if (!row || !row.classList.contains("heat-months")) {
      row = document.createElement("div");
      row.className = "heat-months";
      row.setAttribute("aria-hidden", "true");
      el.before(row);
    }
    row.hidden = false;
    row.textContent = "";
    const weeks = Math.ceil((pad + days.length) / 7);
    row.style.gridTemplateColumns = `repeat(${weeks}, minmax(0, 1fr))`;
    let lastCol = -4;
    days.forEach((d, i) => {
      const dom = Number(d.date.slice(8, 10));
      const col = Math.floor((pad + i) / 7);
      if ((dom === 1 || i === 0) && col - lastCol >= 3 && col < weeks - 1) {
        const s = document.createElement("span");
        s.textContent = MONTHS[Number(d.date.slice(5, 7)) - 1];
        s.style.gridColumn = `${col + 1} / span 3`;
        row.appendChild(s);
        lastCol = col;
      }
    });
  }
  function hideMonths(el) {
    const row = el.previousElementSibling;
    if (row && row.classList.contains("heat-months")) row.hidden = true;
  }

  function renderHeat(el, days, noun) {
    el.classList.remove("skeleton");
    el.style.display = "";
    el.textContent = "";
    if (!days.length) return;
    const frag = document.createDocumentFragment();
    const first = new Date(days[0].date + "T00:00:00");
    renderMonths(el, days, first.getDay());
    for (let i = 0; i < first.getDay(); i++) {         // pad so weeks start on Sunday
      const pad = document.createElement("i");
      pad.className = "is-pad";
      frag.appendChild(pad);
    }
    days.forEach((d, i) => {
      const c = document.createElement("i");
      c.dataset.l = d.level;
      c.style.setProperty("--d", reduceMotion ? 0 : Math.floor(i / 7));
      const when = dateLabel(new Date(d.date + "T00:00:00"));
      c.dataset.tip = `${d.count} ${noun}${d.count === 1 ? "" : "s"} on ${when}`;
      frag.appendChild(c);
    });
    el.appendChild(frag);
    bindTip(el);
  }

  function retryButton(statusEl, fn) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = "Try again";
    b.addEventListener("click", fn);
    statusEl.append(" ", b);
  }

  /* ---------------- GitHub contributions ---------------- */
  async function loadGitHub() {
    const heat = $("#gh-heat");
    const summary = $("#gh-summary");
    summary.classList.remove("is-error");
    summary.textContent = "Loading contributions…";
    heat.classList.add("skeleton");
    try {
      const data = await getJSON(`https://github-contributions-api.jogruber.de/v4/${GH_USER}?y=last`, "gh-contrib");
      const days = data.contributions || [];
      const total = data.total?.lastYear ?? days.reduce((s, d) => s + d.count, 0);
      const active = days.filter((d) => d.count > 0).length;
      if (!days.length || total === 0) {
        heat.classList.remove("skeleton");
        heat.setAttribute("aria-label", "No public GitHub contributions in the last year");
        summary.textContent = "No public contributions in the last year yet.";
        return;
      }
      renderHeat(heat, days, "contribution");
      const best = days.reduce((a, b) => (b.count > a.count ? b : a));
      summary.textContent = `${fmt.format(total)} contributions in the last year, across ${active} active days.`;
      heat.setAttribute("aria-label",
        `GitHub contribution chart: ${total} contributions in the last year, busiest day ${dateLabel(new Date(best.date + "T00:00:00"))} with ${best.count}.`);
    } catch {
      heat.classList.remove("skeleton");
      heat.setAttribute("aria-label", "GitHub contribution chart could not load");
      summary.classList.add("is-error");
      summary.textContent = "Couldn't load the contribution chart right now. Your profile on GitHub has it.";
      retryButton(summary, () => { try { localStorage.removeItem("gh-contrib"); } catch {} loadGitHub(); });
    }
  }

  /* ---------------- LeetCode ---------------- */
  function paintLeetCode(s) {
    const total = s.solvedProblem;
    $("#lc-total").textContent = fmt.format(total);
    const parts = [
      ["easy", s.easySolved, "#lc-easy"],
      ["med", s.mediumSolved, "#lc-med"],
      ["hard", s.hardSolved, "#lc-hard"],
    ];
    const C = 2 * Math.PI * 52;
    let offset = 0;
    parts.forEach(([k, n, sel]) => {
      $(sel).textContent = n == null ? "–" : fmt.format(n);
      const frac = n == null ? 0 : n / total;
      $(`${sel}-bar`).style.width = `${frac * 100}%`;
      const seg = $(`.ring__seg--${k}`);
      const len = frac * C;
      seg.style.strokeDasharray = `${Math.max(len - 2, 0)} ${C}`;
      seg.style.strokeDashoffset = `${-offset}`;
      offset += len;
    });
    if (s.easySolved == null) {
      // Fallback: draw a full red ring
      const seg = $(".ring__seg--hard");
      seg.style.strokeDasharray = `${C} ${C}`;
    }
    $("#lc-ring").setAttribute("aria-label",
      s.easySolved == null
        ? `More than ${total} problems solved`
        : `${total} problems solved: ${s.easySolved} easy, ${s.mediumSolved} medium, ${s.hardSolved} hard`);
  }

  const LC_API = `https://alfa-leetcode-api.onrender.com/${LC_USER}`;
  // Snapshots shipped with the site, used when the free live API is rate-limited or down
  let lcSnap = null, badgeSnap = null;
  const snapshot = () => (lcSnap ??= fetch("data/leetcode.json").then((r) => (r.ok ? r.json() : null)).catch(() => null));
  const badgeSnapshot = () => (badgeSnap ??= fetch("data/badges.json").then((r) => (r.ok ? r.json() : null)).catch(() => null));

  async function loadLeetCode() {
    const status = $("#lc-status");
    status.classList.remove("is-error");
    status.textContent = "Loading LeetCode stats…";
    let solved = await getJSON(`${LC_API}/solved`, "lc-solved").catch(() => null);
    let fromSnap = false;
    if (!solved?.solvedProblem) { solved = (await snapshot())?.solved; fromSnap = !!solved; }
    if (solved?.solvedProblem) {
      paintLeetCode(solved);
      status.textContent = `${fmt.format(solved.solvedProblem)} problems solved, 2,200+ across all platforms.${fromSnap ? " Saved snapshot; live stats are busy." : ""}`;
    } else {
      paintLeetCode(LC_FALLBACK);
      $("#lc-total").textContent = "1,200+";
      status.classList.add("is-error");
      status.textContent = "Live stats are unavailable, so this shows the last known total.";
      retryButton(status, () => { try { localStorage.removeItem("lc-solved"); } catch {} loadLeetCode(); });
    }
  }

  /* ---------------- LeetCode calendar, one tab per year ---------------- */
  const calLevel = (n) => (n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : 4);
  function buildDays(raw, startMs, endMs) {
    let map = raw.submissionCalendar;
    if (typeof map === "string") map = JSON.parse(map);
    const byDay = new Map();
    Object.entries(map || {}).forEach(([ts, n]) => {
      const k = isoDay(new Date(Number(ts) * 1000));
      byDay.set(k, (byDay.get(k) || 0) + n);
    });
    const days = [];
    for (let t = startMs; t <= endMs; t += 86400000) {
      const k = isoDay(new Date(t));
      const count = byDay.get(k) || 0;
      days.push({ date: k, count, level: calLevel(count) });
    }
    return days;
  }

  let calReq = 0;
  async function showCalendar(year) {
    const req = ++calReq;
    const heat = $("#lc-heat");
    const stats = $("#lc-cal-stats");
    heat.style.display = "";
    heat.textContent = "";
    heat.classList.add("skeleton");
    heat.setAttribute("aria-label", "Loading LeetCode submission chart");
    stats.classList.remove("is-error");
    stats.textContent = year === "last" ? "Loading the past 12 months…" : `Loading ${year}…`;
    const key = year === "last" ? "lc-cal" : `lc-cal-${year}`;
    try {
      let raw = await getJSON(year === "last" ? `${LC_API}/calendar` : `${LC_API}/calendar?year=${year}`, key).catch(() => null);
      if (!raw?.submissionCalendar) raw = (await snapshot())?.calendars?.[String(year)] ?? null;
      if (req !== calReq) return;                      // another tab was picked meanwhile
      if (!raw || raw.submissionCalendar == null) throw new Error("no calendar");
      if (year === "last" && Array.isArray(raw.activeYears)) buildYearTabs(raw.activeYears);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const end = year === "last" ? today.getTime() : Math.min(Date.UTC(year, 11, 31), today.getTime());
      const start = year === "last" ? end - 364 * 86400000 : Date.UTC(year, 0, 1);
      const days = buildDays(raw, start, end);
      const total = days.reduce((s, d) => s + d.count, 0);
      const active = days.filter((d) => d.count > 0).length;
      const label = year === "last" ? "the past 12 months" : String(year);

      if (!total) {
        heat.classList.remove("skeleton");
        hideMonths(heat);
        heat.style.display = "none";
        stats.textContent = `No submissions in ${label}.`;
        document.dispatchEvent(new CustomEvent("lc:calendar", { detail: { days: [], label } }));
        return;
      }
      renderHeat(heat, days, "submission");
      const best = days.reduce((a, b) => (b.count > a.count ? b : a));
      let run = 0, longest = 0;
      days.forEach((d) => { run = d.count ? run + 1 : 0; longest = Math.max(longest, run); });
      stats.innerHTML = "";
      [[fmt.format(total), "submissions"], [String(active), "active days"], [String(longest), "day best streak"], [String(best.count), `on ${dateLabel(new Date(best.date + "T00:00:00"))}, busiest`]]
        .forEach(([n, t]) => {
          const s = document.createElement("span");
          const b = document.createElement("b");
          b.textContent = n;
          s.append(b, ` ${t}`);
          stats.appendChild(s);
        });
      if (year === "last") $("#lc-days").textContent = String(active);
      heat.setAttribute("aria-label", `LeetCode submissions in ${label}: ${total} over ${active} active days, best streak ${longest} days.`);
      window.__lcCal = { days, label };          // shared with the Three.js skyline
      document.dispatchEvent(new CustomEvent("lc:calendar", { detail: { days, label } }));
    } catch {
      if (req !== calReq) return;
      heat.classList.remove("skeleton");
      hideMonths(heat);
      heat.style.display = "none";
      if (year === "last") $("#lc-days").textContent = "–";
      stats.classList.add("is-error");
      stats.textContent = `The chart for ${year === "last" ? "the past 12 months" : year} couldn't load.`;
      retryButton(stats, () => { try { localStorage.removeItem(key); } catch {} showCalendar(year); });
    }
  }

  const tabList = $("#lc-tabs");
  const ink = document.createElement("span");
  ink.className = "tabs__ink";
  ink.setAttribute("aria-hidden", "true");
  tabList.appendChild(ink);
  const moveInk = (tab) => {
    ink.style.width = `${tab.offsetWidth}px`;
    ink.style.transform = `translateX(${tab.offsetLeft}px)`;
  };
  function buildYearTabs(years) {
    if (tabList.dataset.built) return;
    tabList.dataset.built = "1";
    [...new Set(years)].sort((a, b) => b - a).forEach((y) => {
      const b = document.createElement("button");
      b.className = "tab";
      b.type = "button";
      b.id = `lc-tab-${y}`;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", "false");
      b.setAttribute("aria-controls", "lc-cal-panel");
      b.tabIndex = -1;
      b.dataset.year = String(y);
      b.textContent = String(y);
      tabList.insertBefore(b, ink);
    });
    moveInk($('#lc-tabs [aria-selected="true"]'));
  }
  function selectTab(tab, focus) {
    $$('[role="tab"]', tabList).forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    $("#lc-cal-panel").setAttribute("aria-labelledby", tab.id);
    if (focus) tab.focus();
    moveInk(tab);
    showCalendar(tab.dataset.year === "last" ? "last" : Number(tab.dataset.year));
  }
  tabList.addEventListener("click", (e) => {
    const t = e.target.closest('[role="tab"]');
    if (t && t.getAttribute("aria-selected") !== "true") selectTab(t, false);
  });
  tabList.addEventListener("keydown", (e) => {
    const tabs = $$('[role="tab"]', tabList);
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    selectTab(tabs[(next + tabs.length) % tabs.length], true);
  });
  window.addEventListener("resize", () => moveInk($('#lc-tabs [aria-selected="true"]')));
  moveInk($("#lc-tab-last"));

  /* ---------------- LeetCode badges (list + detail; 3D vault in three-scenes.js) ---------------- */
  let badges = [];
  const monthYear = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  function selectBadge(i, fromVault) {
    const b = badges[i];
    if (!b) return;
    const img = $("#badge-img");
    img.hidden = true;
    img.onload = () => { img.hidden = false; img.classList.remove("is-in"); void img.offsetWidth; img.classList.add("is-in"); };
    img.onerror = () => { img.hidden = true; };
    img.alt = b.name;
    img.src = b.icon;
    $("#badge-name").textContent = b.name;
    $("#badge-date").textContent = `Earned ${dateLabel(new Date(b.date + "T00:00:00"))}`;
    $$(".badge-chip").forEach((c) => c.setAttribute("aria-pressed", String(Number(c.dataset.i) === i)));
    if (!fromVault) document.dispatchEvent(new CustomEvent("vault:select", { detail: { index: i } }));
  }
  document.addEventListener("vault:selected", (e) => selectBadge(e.detail.index, true));

  async function loadBadges() {
    const status = $("#vault-status");
    const list = $("#badge-list");
    status.classList.remove("is-error");
    status.textContent = "Loading badges…";
    try {
      let data = await getJSON(`${LC_API}/badges`, "lc-badges").catch(() => null);
      if (!data?.badges) data = await badgeSnapshot();
      if (!data?.badges) throw new Error("no badges");
      badges = (data.badges || [])
        .map((b) => ({
          id: b.id,
          name: b.displayName,
          date: b.creationDate,
          icon: b.icon && b.icon.startsWith("/") ? `https://leetcode.com${b.icon}` : b.icon,
          kind: /leetcoding challenge/i.test(b.displayName) ? "monthly" : "streak",
        }))
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      list.textContent = "";
      $(".vault").hidden = false;
      if (!badges.length) {
        status.textContent = "No badges yet. The vault is waiting.";
        return;
      }
      const streak = badges.filter((b) => b.kind === "streak").length;
      const since = badges[badges.length - 1].date.slice(0, 4);
      status.textContent = `${badges.length} badges since ${since}: ${streak} streak and annual, ${badges.length - streak} monthly challenges.`;
      badges.forEach((b, i) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `badge-chip badge-chip--${b.kind}`;
        btn.dataset.i = String(i);
        btn.setAttribute("aria-pressed", "false");
        const name = document.createElement("span");
        name.textContent = b.name;
        const when = document.createElement("small");
        when.textContent = monthYear(b.date);
        btn.append(name, when);
        btn.addEventListener("click", () => selectBadge(i, false));
        li.appendChild(btn);
        list.appendChild(li);
      });
      window.__lcBadges = badges;
      document.dispatchEvent(new CustomEvent("lc:badges", { detail: badges }));
      selectBadge(0, true);
    } catch {
      status.classList.add("is-error");
      status.textContent = "Couldn't open the vault right now.";
      $(".vault").hidden = true;
      retryButton(status, () => { try { localStorage.removeItem("lc-badges"); } catch {} loadBadges(); });
    }
  }

  /* ---------------- Repositories ---------------- */
  const LANG_COLORS = {
    Python: "#3572A5", "Jupyter Notebook": "#DA5B0B", TypeScript: "#3178c6", JavaScript: "#f1e05a",
    Java: "#b07219", HTML: "#e34c26", Dart: "#00B4AB", "C++": "#f34b7d", Kotlin: "#A97BFF",
  };
  async function loadRepos() {
    const list = $("#repo-list");
    const status = $("#repo-status");
    status.classList.remove("is-error");
    status.textContent = "Loading repositories…";
    list.innerHTML = Array.from({ length: 6 }, () => '<li class="repo repo--skel" aria-hidden="true"></li>').join("");
    try {
      const repos = await getJSON(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed`, "gh-repos");
      const own = repos.filter((r) => !r.fork && r.name.toLowerCase() !== GH_USER.toLowerCase()).slice(0, 9);
      list.textContent = "";
      if (!own.length) {
        status.textContent = "No public repositories yet.";
        return;
      }
      own.forEach((r) => {
        const li = document.createElement("li");
        li.className = "repo";
        const a = document.createElement("a");
        a.href = r.html_url;
        a.target = "_blank";
        a.rel = "noopener";
        a.dataset.cursor = "Code";
        a.textContent = r.name.replace(/[-_]+/g, " ").trim();
        const p = document.createElement("p");
        p.textContent = r.description || "No description yet.";
        const meta = document.createElement("div");
        meta.className = "repo__meta";
        if (r.language) {
          const lang = document.createElement("span");
          lang.className = "repo__lang";
          lang.style.setProperty("--dot", LANG_COLORS[r.language] || "#888");
          lang.textContent = r.language;
          meta.appendChild(lang);
        }
        const upd = document.createElement("span");
        upd.textContent = "Updated " + new Date(r.pushed_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
        meta.appendChild(upd);
        li.append(a, p, meta);
        list.appendChild(li);
      });
      status.textContent = `${own.length} most recently updated, forks left out.`;
    } catch {
      list.textContent = "";
      status.classList.add("is-error");
      status.textContent = "Couldn't load repositories right now.";
      retryButton(status, () => { try { localStorage.removeItem("gh-repos"); } catch {} loadRepos(); });
    }
  }

  // Load data when the Code section comes near the viewport
  const codeSection = document.getElementById("code");
  const dataObserver = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    dataObserver.disconnect();
    loadGitHub();
    loadLeetCode();
    showCalendar("last");
    loadBadges();
    loadRepos();
  }, { rootMargin: "600px 0px" });
  dataObserver.observe(codeSection);
})();
