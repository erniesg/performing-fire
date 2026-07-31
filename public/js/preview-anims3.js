/* Round 3 — signal phenomena only. Same family as the six picked EXPERIMENTS
   tiles: fields, traces, particles, interference. No pictograms, no objects. */
(function () {
  const A = window.PF_ANIMS;
  if (!A) return;
  const reg = (ch, key, label, draw) => A.push({ ch, key, label, draw });
  const G = (a) => `rgba(55,255,139,${a})`;
  const M = (a) => `rgba(255,62,165,${a})`;
  function mkRnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

  /* ---------------- CH 01 ABOUT — round 3 ---------------- */
  reg(1, "g1", "buoyant field", (x, W, H, t) => {
    // streamlines of a heat field — fire as vector mathematics
    x.fillStyle = "#020703"; x.fillRect(0, 0, W, H);
    const rr = mkRnd(7);
    x.lineWidth = 1.8;
    for (let s = 0; s < 34; s++) {
      let px = W * (0.06 + rr() * 0.88), py = H * 1.02;
      const hue = rr();
      x.strokeStyle = hue > 0.75 ? "rgba(255,190,90,0.55)" : G(0.22 + hue * 0.4);
      x.shadowColor = G(0.8); x.shadowBlur = 6;
      x.beginPath(); x.moveTo(px, py);
      for (let i = 0; i < 46; i++) {
        const vx = Math.sin(py * 0.020 + t * 1.3 + s) * 2.6 + Math.sin(px * 0.013 - t * 0.8) * 2.0;
        const vy = -4.2 - Math.sin(px * 0.017 + t) * 1.2;
        px += vx; py += vy;
        x.lineTo(px, py);
        if (py < -8) break;
      }
      x.stroke();
    }
  });

  reg(1, "g2", "five-phase lock", (x, W, H, t) => {
    // five waves drift out of phase, periodically cohering into one — five channels, one fire
    x.fillStyle = "#020703"; x.fillRect(0, 0, W, H);
    const lock = Math.pow(0.5 + 0.5 * Math.cos(t * 0.55), 2.2);   // 1 = locked
    const spread = (1 - lock);
    for (let k = 0; k < 5; k++) {
      x.strokeStyle = G(0.30 + lock * 0.35); x.lineWidth = 2.2;
      x.shadowColor = G(0.8); x.shadowBlur = 7;
      x.beginPath();
      for (let i = 0; i <= 130; i++) {
        const u = i / 130;
        const ph = (k - 2) * spread * 2.2;
        const off = (k - 2) * spread * H * 0.085;
        const py = H / 2 + off + Math.sin(u * Math.PI * 4 + t * 2 + ph) * H * 0.16;
        i ? x.lineTo(u * W, py) : x.moveTo(0, py);
      }
      x.stroke();
    }
    if (lock > 0.8) {
      x.strokeStyle = "rgba(230,255,240,0.9)"; x.lineWidth = 3.5; x.shadowBlur = 16;
      x.beginPath();
      for (let i = 0; i <= 130; i++) {
        const u = i / 130;
        i ? x.lineTo(u * W, H / 2 + Math.sin(u * Math.PI * 4 + t * 2) * H * 0.16) : x.moveTo(0, H / 2);
      }
      x.stroke();
    }
  });

  reg(1, "g3", "harmonic build", (x, W, H, t) => {
    // partials stack one by one until the waveform is whole, then release
    x.fillStyle = "#020703"; x.fillRect(0, 0, W, H);
    const n = 1 + Math.floor((t * 0.5) % 8);
    for (let k = 1; k <= n; k++) {
      x.strokeStyle = G(0.14); x.lineWidth = 1.4;
      x.beginPath();
      for (let i = 0; i <= 120; i++) {
        const u = i / 120;
        const py = H / 2 + Math.sin(u * Math.PI * 2 * k + t * (1 + k * 0.3)) * H * 0.30 / k;
        i ? x.lineTo(u * W, py) : x.moveTo(0, py);
      }
      x.stroke();
    }
    x.strokeStyle = G(0.95); x.lineWidth = 2.8; x.shadowColor = G(0.9); x.shadowBlur = 12;
    x.beginPath();
    for (let i = 0; i <= 160; i++) {
      const u = i / 160;
      let sum = 0;
      for (let k = 1; k <= n; k++) sum += Math.sin(u * Math.PI * 2 * k + t * (1 + k * 0.3)) / k;
      i ? x.lineTo(u * W, H / 2 + sum * H * 0.19) : x.moveTo(0, H / 2);
    }
    x.stroke();
  });

  reg(1, "g4", "convection", (x, W, H, t) => {
    // two counter-rotating cells — the physics inside every flame
    x.fillStyle = "#020703"; x.fillRect(0, 0, W, H);
    const rr = mkRnd(19);
    for (let p = 0; p < 150; p++) {
      const ph = rr() * 40;
      const tt = t * 0.55 + ph;
      const cell = p % 2 ? 1 : -1;
      const cx = W * (0.5 + cell * 0.22);
      const a = tt * (0.6 + rr() * 0.25) * cell;
      const rx = W * (0.06 + rr() * 0.15), ry = H * (0.12 + rr() * 0.26);
      const px = cx + Math.cos(a) * rx, py = H * 0.52 + Math.sin(a) * ry;
      const rising = Math.sin(a) * cell < 0;
      x.fillStyle = rising ? "rgba(255,180,80,0.75)" : G(0.45);
      x.shadowColor = rising ? "rgba(255,150,50,0.9)" : G(0.7);
      x.shadowBlur = 6;
      x.fillRect(px, py, 2.6, 2.6);
    }
  });

  reg(1, "g5", "unstable orbit", (x, W, H, t) => {
    // a phase portrait that never settles — the relationship with technology, drawn
    x.fillStyle = "#020703"; x.fillRect(0, 0, W, H);
    let a = 1.4, b = -2.3, c = 2.4, d = -2.1;
    let px2 = 0.1, py2 = 0.1;
    const N = Math.min(2600, 300 + t * 260 % 2600);
    x.shadowColor = G(0.8);
    for (let i = 0; i < N; i++) {
      const nx = Math.sin(a * py2 + t * 0.05) - Math.cos(b * px2);
      const ny = Math.sin(c * px2) - Math.cos(d * py2 + t * 0.05);
      px2 = nx; py2 = ny;
      if (i < 40) continue;
      const v = i / N;
      x.fillStyle = G(0.10 + v * 0.5);
      x.shadowBlur = v > 0.97 ? 8 : 0;
      x.fillRect(W / 2 + nx * W * 0.225, H / 2 + ny * H * 0.225, 1.8, 1.8);
    }
  });

  reg(1, "g6", "shimmer rise", (x, W, H, t) => {
    // interference of two sources, drifting upward like heat above a fire
    x.fillStyle = "#020703"; x.fillRect(0, 0, W, H);
    const s1 = [W * 0.38, H * 1.05], s2 = [W * 0.62, H * 1.05];
    x.lineWidth = 1.6;
    for (let l = 0; l < 44; l++) {
      const y0 = l / 43 * H;
      x.strokeStyle = G(0.16 + 0.30 * (1 - y0 / H));
      x.shadowColor = G(0.6); x.shadowBlur = 4;
      x.beginPath();
      for (let i = 0; i <= 100; i++) {
        const px = i / 100 * W;
        const d1 = Math.hypot(px - s1[0], y0 - s1[1]);
        const d2 = Math.hypot(px - s2[0], y0 - s2[1]);
        const w = Math.sin(d1 * 0.055 - t * 2.4) + Math.sin(d2 * 0.055 - t * 2.4);
        const py = y0 + w * 7;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
    }
  });

  reg(1, "g7", "chromatic lock", (x, W, H, t) => {
    // the five CHANNELS, each in its own tint, cohering into one white signal
    x.fillStyle = "#030404"; x.fillRect(0, 0, W, H);
    const TINTS = ["55,255,139", "255,62,165", "255,179,0", "43,217,255", "232,233,238"];
    const lock = Math.pow(0.5 + 0.5 * Math.cos(t * 0.5), 2.4);
    const spread = 1 - lock;
    x.globalCompositeOperation = "lighter";
    for (let k = 0; k < 5; k++) {
      x.strokeStyle = `rgba(${TINTS[k]},${0.45 + lock * 0.3})`;
      x.lineWidth = 2.6; x.shadowColor = `rgb(${TINTS[k]})`; x.shadowBlur = 10;
      x.beginPath();
      for (let i = 0; i <= 140; i++) {
        const u = i / 140;
        const ph = (k - 2) * spread * 2.0;
        const off = (k - 2) * spread * H * 0.11;
        const py = H / 2 + off + Math.sin(u * Math.PI * 4 + t * 2 + ph) * H * 0.17;
        i ? x.lineTo(u * W, py) : x.moveTo(0, py);
      }
      x.stroke();
    }
    if (lock > 0.75) {
      const a = (lock - 0.75) * 4;
      x.strokeStyle = `rgba(255,255,255,${a})`; x.lineWidth = 4.5;
      x.shadowColor = "#FFF"; x.shadowBlur = 26 * a;
      x.beginPath();
      for (let i = 0; i <= 140; i++) {
        const u = i / 140;
        i ? x.lineTo(u * W, H / 2 + Math.sin(u * Math.PI * 4 + t * 2) * H * 0.17) : x.moveTo(0, H / 2);
      }
      x.stroke();
    }
    x.globalCompositeOperation = "source-over";
  });

  /* ---------------- CH 02 — chimera states, live ---------------- */
  function chimeraStep(st, t, N, R, alpha) {
    if (!st.th) {
      const rr = mkRnd(101);
      st.th = [];
      for (let i = 0; i < N; i++)
        st.th.push(i < N / 2 ? rr() * 0.3 : rr() * Math.PI * 2);   // half calm, half wild
      st.last = t; st.age = 0;
    }
    const dt = Math.max(0, Math.min(0.06, t - st.last)); st.last = t;
    st.age += dt;
    if (st.age > 45) {                                             // gentle reseed
      const rr = mkRnd(1 + Math.floor(t));
      for (let i = N / 2; i < N; i++) st.th[i] = rr() * Math.PI * 2;
      st.age = 0;
    }
    const next = new Array(N);
    for (let i = 0; i < N; i++) {
      let acc = 0;
      for (let d2 = -R; d2 <= R; d2++) {
        const j = (i + d2 + N) % N;
        acc += Math.sin(st.th[i] - st.th[j] + alpha);
      }
      next[i] = st.th[i] + (-acc / (2 * R + 1)) * dt * 3.4;
    }
    st.th = next;
  }

  reg(2, "hj", "chimera field", (x, W, H, t, rnd, st) => {
    // the space-time raster from the papers, live: smooth bands where the
    // ring is coherent, boiling speckle where it refuses — one system, both
    const N = 64, ROWS = 40;
    chimeraStep(st, t, N, 16, 1.45);
    if (!st.hist) { st.hist = []; st.skip = 0; }
    if (++st.skip >= 2) {
      st.skip = 0;
      st.hist.push(st.th.map(a => 0.5 + 0.5 * Math.cos(a)));
      if (st.hist.length > ROWS) st.hist.shift();
    }
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const cw = W / N, chh = H / ROWS;
    for (let r2 = 0; r2 < st.hist.length; r2++) {
      const row = st.hist[r2];
      for (let i = 0; i < N; i++) {
        x.fillStyle = M(0.06 + row[i] * 0.82);
        x.fillRect(i * cw, H - (st.hist.length - r2) * chh, cw + 0.5, chh + 0.5);
      }
    }
  });

  reg(2, "hk", "head & tail", (x, W, H, t, rnd, st) => {
    // the other canonical picture: phase vs index — the locked half draws a
    // smooth line, the wild half boils above it, the border wanders
    const N = 72;
    chimeraStep(st, t, N, 18, 1.46);
    if (!st.tr) st.tr = [];
    st.tr.push([...st.th]);
    if (st.tr.length > 4) st.tr.shift();
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    st.tr.forEach((row, e) => {
      const a = (e + 1) / st.tr.length;
      for (let i = 0; i < N; i++) {
        const px = (i + 0.5) / N * W;
        const ph = ((row[i] % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const py = H * 0.06 + ph / (Math.PI * 2) * H * 0.88;
        const isLast = e === st.tr.length - 1;
        x.fillStyle = M(a * a * (isLast ? 0.95 : 0.4));
        if (isLast) { x.shadowColor = M(1); x.shadowBlur = 7; }
        x.beginPath(); x.arc(px, py, isLast ? 3.6 : 2.2, 0, 7); x.fill();
        x.shadowBlur = 0;
      }
    });
  });

  /* ---------------- CH 02 — braided field (dense open braid) ---------------- */
  reg(2, "hi", "braided field", (x, W, H, t) => {
    // the open braid at full density: a field of lines; travelling cords of
    // braid gather neighbours, tighten, glow, and let them go again
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const N = 26;
    const envX = (d, w2) => Math.exp(-(d * d) / (2 * w2 * w2));
    // two travelling bundle-centres, each with its own drift and breath
    const bundles = [];
    for (let k = 0; k < 2; k++) {
      bundles.push({
        bx: W * (((t * 0.055 + k * 0.53) % 1.3) - 0.15),
        by: H * (0.5 + 0.27 * Math.sin(t * 0.21 + k * 2.7)),
        s: 0.55 + 0.45 * Math.sin(t * (0.33 + k * 0.09) + k * 4),
        w: W * 0.16,
      });
    }
    for (let i = 0; i < N; i++) {
      const base = H * (0.05 + i * 0.90 / (N - 1));
      const phase = (i % 3) * Math.PI * 2 / 3;
      x.beginPath();
      let glowSum = 0;
      for (let seg = 0; seg <= 120; seg++) {
        const u = seg / 120, px = u * W;
        let py = base + Math.sin(u * 7 + t * (1.1 + i * 0.05)) * 3.2;
        let pull = 0;
        for (const b2 of bundles) {
          const reach = envX(px - b2.bx, b2.w) * envX(base - b2.by, H * 0.20) * b2.s;
          const cord = b2.by + Math.sin(px * 0.10 + t * 2.4 + phase) * 5.5;
          py = py * (1 - reach) + cord * reach;
          pull = Math.max(pull, reach);
        }
        glowSum += pull;
        seg ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      const g = Math.min(1, glowSum / 26);
      x.strokeStyle = M(0.22 + g * 0.75);
      x.lineWidth = 1.7 + g * 1.2;
      x.shadowColor = M(1); x.shadowBlur = 3 + g * 13;
      x.stroke();
    }
    x.shadowBlur = 0;
  });

  /* ---------------- CH 02 — open braid (owner's spec) ---------------- */
  reg(2, "hh", "E · open braid", (x, W, H, t) => {
    // several thin strands enter independently from the edges; they cross and
    // form a temporary braid — but each keeps its own irregular rhythm and
    // occasionally separates again
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const N = 6;
    const smooth = (u) => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
    for (let i = 0; i < N; i++) {
      const home = H * (0.14 + i * 0.72 / (N - 1));            // own lane at the edge
      const w1 = 1.7 + i * 0.53, w2 = 2.9 - i * 0.31;          // own irregular rhythm
      // this strand's own clock for joining and leaving the weave
      const c = smooth(Math.sin(t * (0.16 + i * 0.037) + i * 2.1) * 1.6 + 0.5);
      const s0 = 0.16 + 0.10 * Math.sin(t * 0.21 + i);         // where it joins
      const e0 = 0.78 + 0.12 * Math.sin(t * 0.17 + i * 2);     // where it leaves
      const shade = 0.55 + (i % 3) * 0.15;
      x.lineWidth = 2.1;
      x.beginPath();
      let lastB = 0;
      for (let seg = 0; seg <= 150; seg++) {
        const u = seg / 150;
        const own = home
          + Math.sin(u * 9 + t * w1) * H * 0.045
          + Math.sin(u * 4.2 - t * w2 + i) * H * 0.03;
        const braid = H * 0.5
          + Math.sin(u * 16 + t * 2.1 + i * Math.PI / 3) * H * 0.052;
        const win = smooth((u - s0) / 0.16) * (1 - smooth((u - e0) / 0.16)) * c;
        const py = own * (1 - win) + braid * win;
        lastB = win;
        seg ? x.lineTo(u * W, py) : x.moveTo(0, py);
      }
      // over-under: brightness carries the weave
      const over = 0.5 + 0.5 * Math.sin(t * 2.1 + i * Math.PI / 3 + Math.PI / 2);
      x.strokeStyle = M((0.34 + 0.5 * over) * shade + 0.12);
      x.shadowColor = M(0.9); x.shadowBlur = 6 + over * 8;
      x.stroke();
    }
    x.shadowBlur = 0;
  });

  /* ---------------- CH 02 — entrainment, four stagings ---------------- */
  reg(2, "hd", "A · the influx", (x, W, H, t, rnd, st) => {
    // there is ALWAYS someone arriving: a stream of newcomers spirals onto
    // the ring and the pack visibly grows
    if (!st.mem) { st.mem = [0, 0.06, -0.06, 0.12, -0.12, 0.18, -0.18, 0.24]; st.P = 0; st.fly = []; st.next = 0.5; st.last = t; }
    const dt = Math.max(0, Math.min(0.08, t - st.last)); st.last = t;
    st.P += 0.9 * dt;
    st.next -= dt;
    const R = H * 0.33, cx = W / 2, cy = H / 2;
    if (st.next <= 0 && st.fly.length < 3) {
      const rr = mkRnd(1 + Math.floor(t * 7));
      const edge = rr() * Math.PI * 2;
      st.fly.push({ ex: cx + Math.cos(edge) * W * 0.75, ey: cy + Math.sin(edge) * W * 0.75, u: 0 });
      st.next = 1.6;
    }
    for (const f of st.fly) f.u = Math.min(1, f.u + dt / 2.4);
    // landed flyers join the rear of the pack
    st.fly = st.fly.filter(f => {
      if (f.u >= 1) { st.mem.push(Math.min(...st.mem) - 0.055); return false; }
      return true;
    });
    if (st.mem.length > 26) st.mem = st.mem.slice(-8);
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    x.strokeStyle = M(0.30); x.lineWidth = 2.5;
    x.shadowColor = M(0.5); x.shadowBlur = 4;
    x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
    const breathe = 0.72 + 0.28 * Math.sin(st.P * 2);
    for (const off of st.mem) {
      const a = st.P + off;
      x.fillStyle = M(0.45 + 0.45 * breathe);
      x.shadowColor = M(1); x.shadowBlur = 6 + 10 * breathe;
      x.beginPath(); x.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 5.2, 0, 7); x.fill();
    }
    for (const f of st.fly) {
      // curve from the edge to the pack's rear
      const rear = st.P + Math.min(...st.mem) - 0.1;
      const tx2 = cx + Math.cos(rear) * R, ty2 = cy + Math.sin(rear) * R;
      const u = f.u, mx2 = (f.ex + tx2) / 2 + (cy - f.ey) * 0.2, my2 = (f.ey + ty2) / 2 + (f.ex - cx) * 0.2;
      const px = (1 - u) * (1 - u) * f.ex + 2 * (1 - u) * u * mx2 + u * u * tx2;
      const py = (1 - u) * (1 - u) * f.ey + 2 * (1 - u) * u * my2 + u * u * ty2;
      x.fillStyle = "rgba(255,235,247," + (0.4 + u * 0.55) + ")";
      x.shadowColor = M(1); x.shadowBlur = 14;
      x.beginPath(); x.arc(px, py, 3.5 + u * 2, 0, 7); x.fill();
    }
    x.shadowBlur = 0;
  });

  reg(2, "he", "B · raster columns", (x, W, H, t) => {
    // rows of beats, each its own tempo; as coupling rises the beats align
    // into marching columns — sync you can read as stripes
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const cyc = t % 16;
    const k = cyc < 4 ? 0 : cyc < 9 ? (cyc - 4) / 5 : cyc < 13 ? 1 : 1 - (cyc - 13) / 3;
    const ROWS = 6 + Math.min(8, Math.floor(t / 3) % 9);
    const rr = mkRnd(59);
    for (let r2 = 0; r2 < ROWS; r2++) {
      const own = 40 + rr() * 34;
      const common = 56;
      const speed = own * (1 - k) + common * k;
      const y0 = H * (0.10 + r2 * 0.80 / 13);
      const born = r2 < 6 ? 1 : Math.min(1, Math.max(0, (t % 3) * 2));
      x.fillStyle = M((0.35 + k * 0.55) * born);
      x.shadowColor = M(1); x.shadowBlur = 4 + k * 8;
      for (let b2 = 0; b2 < 8; b2++) {
        const px = ((t * speed + b2 * W / 7) % (W * 1.08)) - W * 0.04;
        x.fillRect(px, y0, 3 + k * 2, H * 0.045);
      }
    }
    x.shadowBlur = 0;
  });

  reg(2, "hf", "C · the chase, staged", (x, W, H, t, rnd, st) => {
    // one newcomer, theatrical: big bodies, slow orbit, pronounced overshoot
    if (!st.mem) { st.mem = [0, 0.08, -0.08, 0.16, -0.16, 0.24, -0.24]; st.P = 0; st.mode = "spawn"; st.wait = 0.6; st.theta = 0; st.omN = 0; st.K = 0; st.tr = []; st.last = t; st.n = 0; }
    const dt = Math.max(0, Math.min(0.08, t - st.last)); st.last = t;
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    st.P += 0.7 * dt;
    if (st.mode === "spawn") { st.wait -= dt; if (st.wait <= 0) { st.n++; st.theta = st.P + Math.PI; st.omN = 0.7 * (st.n % 2 ? 1.9 : 0.42); st.K = 0; st.mode = "chase"; st.tr = []; } }
    else {
      st.K = Math.min(2.6, st.K + dt * 0.5);
      st.theta += (st.omN + st.K * Math.sin(wrap(st.P - st.theta))) * dt;
      st.P += 0.22 * st.K / 2.6 * Math.sin(wrap(st.theta - st.P)) * dt;
      st.tr.push(st.theta); if (st.tr.length > 22) st.tr.shift();
      if (Math.abs(wrap(st.theta - st.P)) < 0.10 && st.K > 2.0) { st.mem.push(wrap(st.theta - st.P)); st.mode = "spawn"; st.wait = 2.0; if (st.mem.length > 15) st.mem = st.mem.slice(-7); }
    }
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const R = H * 0.36, cx = W / 2, cy = H / 2;
    x.strokeStyle = M(0.35); x.lineWidth = 3.2;
    x.shadowColor = M(0.6); x.shadowBlur = 6;
    x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
    const breathe = 0.7 + 0.3 * Math.sin(st.P * 2.6);
    for (const off of st.mem) {
      const a = st.P + off;
      x.fillStyle = M(0.5 + 0.45 * breathe);
      x.shadowColor = M(1); x.shadowBlur = 10 + 14 * breathe;
      x.beginPath(); x.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 7.5, 0, 7); x.fill();
    }
    if (st.mode === "chase") {
      st.tr.forEach((ta, e) => {
        const u = (e + 1) / st.tr.length;
        x.fillStyle = M(u * u * 0.55);
        x.beginPath(); x.arc(cx + Math.cos(ta) * R * 1.10, cy + Math.sin(ta) * R * 1.10, 3.4, 0, 7); x.fill();
      });
      x.fillStyle = "rgba(255,238,248,0.97)";
      x.shadowColor = M(1); x.shadowBlur = 24;
      x.beginPath(); x.arc(cx + Math.cos(st.theta) * R * 1.10, cy + Math.sin(st.theta) * R * 1.10, 9, 0, 7); x.fill();
    }
    x.shadowBlur = 0;
  });

  reg(2, "hg", "D · the waveline", (x, W, H, t) => {
    // the collective as one thick wave; a thin bright line slides in
    // out of phase, wrestles into alignment, and thickens the band
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const T = 8, k = (t % T) / T;
    const joins = Math.floor(t / T) % 4;                 // band grows each cycle
    const bandW = 6 + joins * 3;
    const align = Math.min(1, Math.max(0, (k - 0.25) / 0.55));
    const wave = (u, ph, amp) => H * 0.55 + Math.sin(u * Math.PI * 3.5 + t * 2 + ph) * amp;
    x.strokeStyle = M(0.85); x.lineWidth = bandW;
    x.shadowColor = M(0.95); x.shadowBlur = 16;
    x.lineJoin = "round";
    x.beginPath();
    for (let i = 0; i <= 130; i++) { const u = i / 130; const py = wave(u, 0, H * 0.16); i ? x.lineTo(u * W, py) : x.moveTo(0, py); }
    x.stroke();
    if (k < 0.92) {
      const drop = (1 - Math.min(1, k / 0.25)) * H * 0.34;
      const ph = (1 - align) * Math.PI * 0.9;
      const amp = H * (0.06 + align * 0.10);
      x.strokeStyle = "rgba(255,238,248," + (0.9 - align * 0.35) + ")";
      x.lineWidth = 2.6 + align * 2;
      x.shadowColor = M(1); x.shadowBlur = 12;
      x.beginPath();
      for (let i = 0; i <= 130; i++) { const u = i / 130; const py = wave(u, ph, amp) - drop; i ? x.lineTo(u * W, py) : x.moveTo(0, py - drop); }
      x.stroke();
    }
  });

  /* ---------------- CH 02 CONTRIBUTE — joining the pulse ---------------- */
  reg(2, "hc", "joining the pulse", (x, W, H, t, rnd, st) => {
    // entrainment with a protagonist: the pack orbits as one; a newcomer
    // arrives off-tempo, chases, overshoots, is pulled in — and the pack's
    // own rhythm shifts slightly to meet it. contribution as mutual influence.
    if (!st.mem) {
      st.mem = [];
      for (let i = 0; i < 13; i++) st.mem.push((i - 6) * 0.055);
      st.P = 0; st.Om = 1.05;
      st.mode = "spawn"; st.wait = 0.8; st.theta = 0; st.omN = 0; st.K = 0;
      st.trail = []; st.joinAge = 9; st.last = t; st.nth = 0;
    }
    const dt = Math.max(0, Math.min(0.08, t - st.last)); st.last = t;
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    st.P += st.Om * dt;
    st.joinAge += dt;
    if (st.mode === "spawn") {
      st.wait -= dt;
      if (st.wait <= 0) {
        st.nth++;
        st.theta = st.P + Math.PI;
        st.omN = st.Om * (st.nth % 2 ? 1.55 : 0.62);   // too fast, then too slow
        st.K = 0; st.mode = "chase"; st.trail = [];
      }
    } else if (st.mode === "chase") {
      st.K = Math.min(3.0, st.K + dt * 0.55);
      st.theta += (st.omN + st.K * Math.sin(wrap(st.P - st.theta))) * dt;
      st.Om += 0.16 * st.K / 3 * Math.sin(wrap(st.theta - st.P)) * dt;   // the pack bends too
      st.trail.push(st.theta);
      if (st.trail.length > 14) st.trail.shift();
      if (Math.abs(wrap(st.theta - st.P)) < 0.09 && st.K > 2.2) {
        st.mem.push(wrap(st.theta - st.P));
        st.joinAge = 0;
        st.mode = "spawn"; st.wait = 2.6;
        if (st.mem.length > 19) { st.mem = st.mem.slice(-13); }
      }
    }
    // draw
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const R = H * 0.34;
    x.strokeStyle = M(0.28); x.lineWidth = 2;
    x.shadowColor = M(0.5); x.shadowBlur = 4;
    x.beginPath(); x.arc(W / 2, H / 2, R, 0, 7); x.stroke();
    // the pack: one body, many members, breathing in unison
    const breathe = 0.72 + 0.28 * Math.sin(st.P * 2);
    // join ripple: a swell that walks through the pack after a newcomer lands
    for (let i = 0; i < st.mem.length; i++) {
      const a = st.P + st.mem[i];
      const rip = Math.max(0, 1 - Math.abs(st.joinAge * 3 - (i / st.mem.length) * 2.2)) * Math.max(0, 1 - st.joinAge / 1.5);
      x.fillStyle = M(0.45 + 0.4 * breathe + rip * 0.15);
      x.shadowColor = M(1); x.shadowBlur = (5 + 9 * breathe + rip * 14);
      x.beginPath();
      x.arc(W / 2 + Math.cos(a) * R, H / 2 + Math.sin(a) * R, 4.2 + rip * 2, 0, 7);
      x.fill();
    }
    // the newcomer: bright core, comet tail, riding slightly outside until it joins
    if (st.mode === "chase") {
      st.trail.forEach((ta, e) => {
        const u = (e + 1) / st.trail.length;
        x.fillStyle = M(u * u * 0.5);
        x.beginPath();
        x.arc(W / 2 + Math.cos(ta) * R * 1.07, H / 2 + Math.sin(ta) * R * 1.07, 2.4, 0, 7);
        x.fill();
      });
      x.fillStyle = "rgba(255,235,247,0.95)";
      x.shadowColor = M(1); x.shadowBlur = 18;
      x.beginPath();
      x.arc(W / 2 + Math.cos(st.theta) * R * 1.07, H / 2 + Math.sin(st.theta) * R * 1.07, 5.2, 0, 7);
      x.fill();
    }
    x.shadowBlur = 0;
  });

  /* ---------------- CH 02 CONTRIBUTE — the gathering ---------------- */
  reg(2, "hb", "the gathering", (x, W, H, t) => {
    // no metaphor: the channel's content itself. every offering is its own
    // small flame; a new one ignites every few seconds and the gathering grows
    const MAX = 11, BIRTH = 3.2, T = MAX * BIRTH + 4;
    const k = t % T;
    const alive = Math.min(MAX, 1 + Math.floor(k / BIRTH));
    const fade = k > MAX * BIRTH ? 1 - (k - MAX * BIRTH) / 4 : 0;   // gentle reset
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const rr = mkRnd(91);
    const base = H * 0.80;
    // ember ground
    x.strokeStyle = M(0.35); x.lineWidth = 2.5;
    x.shadowColor = M(0.7); x.shadowBlur = 8;
    x.beginPath(); x.moveTo(W * 0.06, base); x.lineTo(W * 0.94, base); x.stroke();
    x.globalCompositeOperation = "lighter";
    for (let i = 0; i < MAX; i++) {
      // each flame: its own place, size, tempo — its own voice
      const fx0 = W * (0.10 + (i * 0.61803) % 1 * 0.80);
      const scale = 0.55 + rr() * 0.75;
      const tempo = 4.5 + rr() * 3.5;
      const phase = rr() * 7;
      if (i >= alive) { rr(); rr(); continue; }
      const born = i * BIRTH;
      const age = Math.min(1, (k - born) / 0.8);
      const flare = age < 1 ? (1 - age) : 0;         // ignition flash
      const a = (1 - fade) * (0.4 + 0.6 * age);
      const fh = H * 0.16 * scale * (0.65 + 0.35 * age);
      const fw = W * 0.055 * scale;
      const sway = Math.sin(t * tempo * 0.4 + phase) * fw * 0.35;
      for (const [ls, col, ca] of [[1.0, "255,62,165", 0.28], [0.62, "255,130,205", 0.5], [0.32, "255,230,246", 0.8]]) {
        const flick = 0.9 + 0.12 * Math.sin(t * tempo + phase + ls * 4);
        const fx = fx0 + sway * ls;
        const fy = base - fh * 0.45 * ls * flick;
        const rx2 = fw * ls * flick, ry2 = fh * 0.6 * ls * flick;
        const g2 = x.createRadialGradient(fx, fy + ry2 * 0.3, 0, fx, fy, Math.max(rx2, ry2) * 1.2);
        g2.addColorStop(0, `rgba(${col},${(ca + flare * 0.5) * a})`);
        g2.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = g2;
        x.beginPath(); x.ellipse(fx, fy, rx2 * (1 + flare), ry2 * 1.3 * (1 + flare * 0.5), 0, 0, 7); x.fill();
      }
      if (flare > 0.4) {                              // the birth spark
        x.fillStyle = `rgba(255,240,250,${flare * a})`;
        x.shadowColor = M(1); x.shadowBlur = 18;
        x.beginPath(); x.arc(fx0, base - fh * 0.3, 3.5, 0, 7); x.fill();
        x.shadowBlur = 0;
      }
      // one thin spark per flame
      const sp = (t * (0.3 + (i % 4) * 0.1) + phase) % 1;
      x.fillStyle = M((1 - sp) * 0.6 * a);
      x.fillRect(fx0 + Math.sin(sp * 8 + i) * 6, base - fh - sp * H * 0.16, 2.2, 2.2);
    }
    x.globalCompositeOperation = "source-over";
    x.shadowBlur = 0;
  });

  /* ---------------- CH 02 CONTRIBUTE — feed the fire ---------------- */
  reg(2, "ha", "feed the fire", (x, W, H, t) => {
    // the one wordless image of contribution: something arrives, the fire grows
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const T = 12, k = t % T;
    const FEEDS = [1.5, 3.5, 5.5, 7.5, 9.5];
    let level = 0, flare = 0, incoming = null;
    for (const f of FEEDS) {
      if (k >= f) {
        const since = k - f;
        level += Math.min(1, since / 0.45);          // each feed grows the fire
        if (since < 0.5) flare = Math.max(flare, 1 - since / 0.5);
      } else if (f - k < 0.6) {
        incoming = 1 - (f - k) / 0.6;                // a streak on its way in
      }
    }
    const ease = (T - k < 1.2) ? (T - k) / 1.2 : 1;  // settle before the loop restarts
    const fh = H * (0.24 + level * 0.105) * ease;    // flame height by feeds absorbed
    const fw = W * (0.15 + level * 0.042);
    const cx = W / 2, base = H * 0.86;
    // ground ember line
    x.strokeStyle = M(0.5 + flare * 0.4); x.lineWidth = 3;
    x.shadowColor = M(0.9); x.shadowBlur = 10 + flare * 14;
    x.beginPath(); x.moveTo(cx - fw * 1.6, base); x.lineTo(cx + fw * 1.6, base); x.stroke();
    // the fire: layered gradient blobs — the same construction as a real flame
    x.globalCompositeOperation = "lighter";
    for (const [ls, col, ca] of [[1.0, "255,62,165", 0.30], [0.66, "255,120,200", 0.55], [0.36, "255,225,245", 0.85]]) {
      const flick = 0.92 + 0.10 * Math.sin(t * (6 + ls * 4)) + flare * 0.12;
      const fx = cx + Math.sin(t * 3.2 + ls * 5) * fw * 0.06;
      const fy = base - fh * 0.42 * ls * flick;
      const rx2 = fw * 0.85 * ls * flick, ry2 = fh * 0.60 * ls * flick;
      const g2 = x.createRadialGradient(fx, fy + ry2 * 0.3, 0, fx, fy, Math.max(rx2, ry2) * 1.15);
      g2.addColorStop(0, `rgba(${col},${ca + flare * 0.15})`);
      g2.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g2;
      x.beginPath(); x.ellipse(fx, fy, rx2, ry2 * 1.25, 0, 0, 7); x.fill();
    }
    x.globalCompositeOperation = "source-over";
    // sparks above the fire, more when bigger
    const rr = mkRnd(83);
    for (let sp = 0; sp < 4 + level * 3; sp++) {
      const ph = (t * (0.35 + rr() * 0.25) + rr()) % 1;
      x.fillStyle = M((1 - ph) * (0.5 + flare * 0.5));
      x.fillRect(cx + (rr() - 0.5) * fw * 2.4, base - fh - ph * H * 0.18, 2.4, 2.4);
    }
    // the offering arriving: a bright streak rising from YOUR edge into the fire
    if (incoming !== null) {
      const sy = H * 1.02 - incoming * (H * 1.02 - base + fh * 0.3);
      x.strokeStyle = M(0.95); x.lineWidth = 3.4;
      x.shadowColor = M(1); x.shadowBlur = 16;
      x.beginPath(); x.moveTo(cx, sy + 22); x.lineTo(cx, sy); x.stroke();
    }
    // on impact: a burst
    if (flare > 0.6) {
      for (let b2 = 0; b2 < 7; b2++) {
        const a2 = rr() * Math.PI * 2;
        x.fillStyle = M(flare * 0.9);
        x.fillRect(cx + Math.cos(a2) * fw * rr() * 1.6, base - fh * 0.4 + Math.sin(a2) * fh * 0.3, 3, 3);
      }
    }
    x.shadowBlur = 0;
  });

  /* ---------------- CH 02 CONTRIBUTE — the medium itself ---------------- */
  reg(2, "h9", "ask & burn", (x, W, H, t) => {
    // the channel's own loop, demonstrated: the call, a waiting cursor,
    // a real offering typing itself, then burning into the fire
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const OFFERINGS = [
      "teach the machine to hesitate.",
      "i want a machine that forgets,",
      "every tool i've loved watched me back.",
      "fire was the first screen we shared.",
    ];
    const FS = H * 0.072;
    x.font = `700 ${FS | 0}px "Courier New",monospace`;
    x.textBaseline = "middle";
    // the standing call — the brief's own line
    x.textAlign = "center";
    x.fillStyle = M(0.55);
    x.shadowColor = M(0.6); x.shadowBlur = 6;
    x.font = `700 ${H * 0.058 | 0}px "Courier New",monospace`;
    x.fillText("WHAT WOULD YOU THROW", W / 2, H * 0.16);
    x.fillText("INTO THE FIRE?", W / 2, H * 0.25);
    // offering cycle
    x.font = `700 ${FS | 0}px "Courier New",monospace`;
    const oi = Math.floor(t / 9) % OFFERINGS.length;
    const msg = OFFERINGS[oi];
    const k = t % 9;
    const WAIT = 1.4, TYPE = msg.length * 0.075, HOLD = 1.6, BURN = 2.2;
    const y0 = H * 0.52;
    x.textAlign = "left";
    const x0 = W * 0.5 - x.measureText(msg).width / 2;
    const rr = mkRnd(oi * 31 + 7);
    if (k < WAIT) {
      // the empty line: your cursor, waiting
      if (Math.sin(t * 6) > -0.2) { x.fillStyle = M(0.95); x.shadowColor = M(1); x.shadowBlur = 12;
        x.fillRect(x0, y0 - FS * 0.55, FS * 0.62, FS * 1.1); }
    } else if (k < WAIT + TYPE) {
      const n = Math.floor((k - WAIT) / 0.075);
      x.fillStyle = M(0.95); x.shadowColor = M(0.9); x.shadowBlur = 8;
      x.fillText(msg.slice(0, n), x0, y0);
      x.fillRect(x0 + x.measureText(msg.slice(0, n)).width + 3, y0 - FS * 0.55, FS * 0.62, FS * 1.1);
    } else if (k < WAIT + TYPE + HOLD) {
      x.fillStyle = M(0.95); x.shadowColor = M(0.9); x.shadowBlur = 8;
      x.fillText(msg, x0, y0);
    } else {
      // the burn: characters ignite left to right, dissolve into rising embers
      const bu = (k - WAIT - TYPE - HOLD) / BURN;
      const front = bu * (msg.length + 6) - 3;
      let cx2 = x0;
      for (let ci = 0; ci < msg.length; ci++) {
        const cw = x.measureText(msg[ci]).width;
        const d = front - ci;
        if (d < 0) {                          // not yet burning
          x.fillStyle = M(0.95); x.shadowColor = M(0.8); x.shadowBlur = 8;
          x.fillText(msg[ci], cx2, y0);
        } else if (d < 2.2) {                 // igniting
          const e = d / 2.2;
          x.fillStyle = `rgba(255,${180 - e * 120 | 0},${60 - e * 40 | 0},${1 - e * 0.8})`;
          x.shadowColor = "rgba(255,140,40,1)"; x.shadowBlur = 16;
          x.fillText(msg[ci], cx2, y0 - e * 8);
          for (let sp = 0; sp < 2; sp++) {
            const su = (e + sp * 0.3) % 1;
            x.fillStyle = `rgba(255,${160 + rr() * 60 | 0},60,${(1 - su) * 0.9})`;
            x.fillRect(cx2 + rr() * cw, y0 - FS * 0.5 - su * H * 0.30, 2.5, 2.5);
          }
        }                                     // else: gone — ash
        cx2 += cw;
      }
    }
    x.shadowBlur = 0;
  });

  /* ---------------- CH 02 CONTRIBUTE — second person ---------------- */
  reg(2, "h7", "the empty seat", (x, W, H, t) => {
    // a wall of offerings already made — and one empty space, waiting for yours
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const rr = mkRnd(61);
    const COLS = 9, ROWS = 6, TOTAL = COLS * ROWS;
    const filled = 14 + Math.floor(t / 3.0) % (TOTAL - 16);
    const arriving = (t % 3.0) > 2.55;
    for (let i = 0; i < TOTAL; i++) {
      const c2 = i % COLS, r2 = (i / COLS) | 0;
      const px = W * (0.08 + c2 * 0.105), py = H * (0.10 + r2 * 0.15);
      const jx = (rr() - 0.5) * 6, jy = (rr() - 0.5) * 6;
      if (i < filled) {
        const b = 0.35 + 0.45 * Math.abs(Math.sin(t * (0.6 + rr() * 0.8) + i));
        x.fillStyle = M(b);
        x.shadowColor = M(1); x.shadowBlur = b * 10;
        x.beginPath(); x.arc(px + jx, py + jy, 4.5, 0, 7); x.fill();
      } else if (i === filled) {
        // YOUR seat: an empty outline, breathing
        const p = 0.5 + 0.5 * Math.sin(t * 2.4);
        if (arriving) {           // someone takes it — flash — the next seat opens
          x.fillStyle = "rgba(255,240,250,0.95)";
          x.shadowColor = "#FFF"; x.shadowBlur = 22;
          x.beginPath(); x.arc(px + jx, py + jy, 6, 0, 7); x.fill();
        } else {
          x.strokeStyle = M(0.45 + p * 0.55); x.lineWidth = 2.5;
          x.shadowColor = M(1); x.shadowBlur = 6 + p * 12;
          x.beginPath(); x.arc(px + jx, py + jy, 6.5 + p * 2, 0, 7); x.stroke();
        }
      }
    }
    x.shadowBlur = 0;
  });

  reg(2, "h8", "offerings rise", (x, W, H, t) => {
    // sparks are born at YOUR edge of the glass, rise, and feed the fire above
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const rr = mkRnd(67);
    // the collective mass at the top: brightens as offerings keep arriving
    const mass = 0.45 + 0.20 * Math.sin(t * 0.35);
    const g = x.createRadialGradient(W / 2, -H * 0.15, 0, W / 2, -H * 0.15, H * 0.75);
    g.addColorStop(0, `rgba(255,120,180,${mass})`);
    g.addColorStop(0.45, M(mass * 0.5));
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // offerings rising from the bottom edge — from where the viewer stands
    for (let i = 0; i < 26; i++) {
      const ph = (t * (0.09 + rr() * 0.07) + rr()) % 1;
      const bx = W * (0.06 + rr() * 0.88);
      const px = bx + Math.sin(ph * 9 + i) * W * 0.03;
      const py = H * 1.0 - ph * H * 1.05;
      const nearBirth = ph < 0.08;
      x.fillStyle = nearBirth ? "rgba(255,240,250,0.95)" : M(0.35 + (1 - ph) * 0.5);
      x.shadowColor = M(1); x.shadowBlur = nearBirth ? 16 : 7;
      x.beginPath(); x.arc(px, py, nearBirth ? 4.5 : 2.2 + (1 - ph) * 1.6, 0, 7); x.fill();
      if (nearBirth) {          // the birth spark at the bottom edge
        x.fillStyle = M(0.5);
        x.fillRect(px - 8, H - 3, 16, 3);
      }
    }
    x.shadowBlur = 0;
  });

  reg(2, "h1", "injection", (x, W, H, t) => {
    // a wall of light passes; the field is dragged, re-phased, and left glowing
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const pxp = ((t * 0.26) % 1.3) * W * 1.2 - W * 0.1;
    x.lineWidth = 2;
    for (let l = 0; l < 40; l++) {
      const y0 = (l + 0.5) / 40 * H;
      x.beginPath();
      for (let i = 0; i <= 110; i++) {
        const px = i / 110 * W;
        const passed = px < pxp;
        const dist = Math.abs(px - pxp);
        const bump = Math.exp(-(dist * dist) / (2 * 34 * 34)) * 30;
        const shift = passed ? Math.sin(l * 1.1) * 7 : 0;
        i ? x.lineTo(px, y0 + shift - bump * (l % 2 ? 1 : -1)) : x.moveTo(px, y0);
      }
      const behind = Math.max(0, Math.min(1, (pxp - 0) / W));
      const glow = 0.26 + (pxp > 0 ? 0.35 * Math.exp(-Math.abs(pxp) * 0) : 0);
      x.strokeStyle = M(0.28 + 0.30 * Math.abs(Math.sin(l * 0.7)));
      x.shadowColor = M(0.7); x.shadowBlur = 5;
      x.stroke();
    }
    // chromatic wall: r/g/b fringes around a white core
    x.globalCompositeOperation = "lighter";
    for (const [off, col] of [[-10, "rgba(255,60,60,0.5)"], [10, "rgba(70,120,255,0.5)"], [0, "rgba(255,255,255,0.85)"]]) {
      const g = x.createLinearGradient(pxp + off - 16, 0, pxp + off + 16, 0);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, col); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(pxp + off - 16, 0, 32, H);
    }
    // sparks at the front
    const rr = mkRnd(3 + Math.floor(t * 20));
    for (let sp = 0; sp < 10; sp++) {
      x.fillStyle = M(0.5 + rr() * 0.5);
      x.fillRect(pxp + (rr() - 0.3) * 30, rr() * H, 2.5, 6 + rr() * 14);
    }
    x.globalCompositeOperation = "source-over";
  });

  reg(2, "h2", "sync circle", (x, W, H, t, rnd, st) => {
    // the canonical picture: oscillators on a circle — scattered when free,
    // one bright packet when coupled, scattered again on release
    const N = 20;
    if (!st.ph) {
      const rr = mkRnd(77);
      st.ph = []; st.om = [];
      for (let i = 0; i < N; i++) { st.ph.push(rr() * Math.PI * 2); st.om.push(1.1 * (0.75 + rr() * 0.5)); }
      st.last = t;
    }
    const dt = Math.max(0, Math.min(0.08, t - st.last)); st.last = t;
    const cyc = t % 14;
    const K = cyc < 3 ? 0 : cyc < 7 ? (cyc - 3) / 4 * 2.6 : cyc < 11 ? 2.6 : 0;
    let mx = 0, my = 0;
    for (let i = 0; i < N; i++) { mx += Math.cos(st.ph[i]); my += Math.sin(st.ph[i]); }
    const meanPh = Math.atan2(my / N, mx / N), r = Math.hypot(mx / N, my / N);
    for (let i = 0; i < N; i++) st.ph[i] += (st.om[i] + K * r * Math.sin(meanPh - st.ph[i])) * dt * 2.0;
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const R = H * 0.34;
    x.strokeStyle = M(0.30 + r * 0.25); x.lineWidth = 2;
    x.shadowColor = M(0.6); x.shadowBlur = 4;
    x.beginPath(); x.arc(W / 2, H / 2, R, 0, 7); x.stroke();
    for (let i = 0; i < N; i++) {
      const px = W / 2 + Math.cos(st.ph[i]) * R, py = H / 2 + Math.sin(st.ph[i]) * R;
      x.fillStyle = M(0.5 + r * 0.5);
      x.shadowColor = M(1); x.shadowBlur = 6 + r * 14;
      x.beginPath(); x.arc(px, py, 4.5 + r * 1.5, 0, 7); x.fill();
    }
    // the packet's centre of mass, visible only as coherence grows
    if (r > 0.3) {
      x.fillStyle = M((r - 0.3) * 1.1);
      x.beginPath();
      x.arc(W / 2 + Math.cos(meanPh) * R, H / 2 + Math.sin(meanPh) * R, 8 + r * 5, 0, 7);
      x.fill();
    }
    x.shadowBlur = 0;
  });

  reg(2, "h3", "accumulating ring", (x, W, H, t) => {
    // each offering arrives as a comet and becomes a harmonic of the ring
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const cyc = 2.4, n = 1 + Math.floor((t / cyc) % 5), k2 = (t % cyc) / cyc;
    const rot = t * 0.22;
    const ringR = (a) => {
      let r2 = H * 0.26;
      for (let k = 1; k <= n; k++) r2 += Math.sin(a * (k * 2 + 1) + t * (0.5 + k * 0.18)) * H * 0.013;
      return r2;
    };
    x.globalCompositeOperation = "lighter";
    for (let e = 2; e >= 0; e--) {                       // phosphor ghosts
      x.strokeStyle = M(e ? 0.10 * (3 - e) : 0.9);
      x.lineWidth = e ? 5 : 2.8;
      x.shadowColor = M(0.9); x.shadowBlur = e ? 0 : 14;
      x.beginPath();
      for (let i = 0; i <= 300; i++) {
        const a = i / 300 * Math.PI * 2 + rot - e * 0.05;
        const r2 = ringR(a);
        const qx = W / 2 + Math.cos(a) * r2, qy = H / 2 + Math.sin(a) * r2;
        i ? x.lineTo(qx, qy) : x.moveTo(qx, qy);
      }
      x.closePath(); x.stroke();
    }
    // the comet: spirals in during the first 40% of each cycle, then a flash
    if (k2 < 0.4) {
      const u = k2 / 0.4;
      const a = -Math.PI / 2 + u * Math.PI * 2.2 + rot;
      const rr2 = H * (0.62 - u * 0.36);
      const cxp = W / 2 + Math.cos(a) * rr2, cyp = H / 2 + Math.sin(a) * rr2;
      for (let tr = 8; tr >= 0; tr--) {
        const ta = a - tr * 0.09;
        const trr = H * (0.62 - Math.max(0, u - tr * 0.02) * 0.36);
        x.fillStyle = M((1 - tr / 9) * 0.8);
        x.shadowColor = M(1); x.shadowBlur = tr ? 0 : 16;
        x.beginPath(); x.arc(W / 2 + Math.cos(ta) * trr, H / 2 + Math.sin(ta) * trr, tr ? 2.5 : 5, 0, 7); x.fill();
      }
    } else if (k2 < 0.5) {
      x.strokeStyle = `rgba(255,240,250,${(0.5 - k2) * 8})`;
      x.lineWidth = 3; x.shadowColor = "#FFF"; x.shadowBlur = 22;
      x.beginPath(); x.arc(W / 2, H / 2, H * 0.26 + (k2 - 0.4) * H * 1.4, 0, 7); x.stroke();
    }
    x.fillStyle = M(0.85); x.beginPath(); x.arc(W / 2, H / 2, 3.5, 0, 7); x.fill();
    x.globalCompositeOperation = "source-over";
  });

  reg(2, "h4", "raster drop", (x, W, H, t) => {
    // an input lands in the scan field; waves propagate through the raster
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const drops = [[W * 0.35, H * 0.4, (t * 0.5) % 2], [W * 0.68, H * 0.6, (t * 0.5 + 1.1) % 2]];
    x.lineWidth = 1.8;
    for (let l = 0; l < 34; l++) {
      const y0 = (l + 0.5) / 34 * H;
      x.strokeStyle = M(0.34); x.shadowColor = M(0.6); x.shadowBlur = 4;
      x.beginPath();
      let lx = null, ly = null;
      for (let i = 0; i <= 100; i++) {
        const px = i / 100 * W;
        let dy = 0;
        for (const [dx2, dz2, ph] of drops) {
          const d = Math.hypot(px - dx2, y0 - dz2);
          const rad = ph * H * 0.55;
          dy += Math.exp(-Math.pow(d - rad, 2) / (2 * 15 * 15)) * 12 * (1 - ph / 2);
        }
        const qy = y0 + dy;
        if (lx === null) x.moveTo(px, qy); else x.lineTo(px, qy);
        lx = px; ly = qy;
      }
      x.stroke();
    }
  });

  reg(2, "h5", "the braid", (x, W, H, t) => {
    // separate signals weave into one carrier — voices becoming a broadcast
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    for (let k = 0; k < 5; k++) {
      x.strokeStyle = M(0.38 + k * 0.06); x.lineWidth = 2.2;
      x.shadowColor = M(0.85); x.shadowBlur = 8;
      x.beginPath();
      for (let i = 0; i <= 130; i++) {
        const u = i / 130;
        const conv = Math.pow(u, 1.6);                      // amplitude collapses to the right
        const off = (k - 2) * (1 - conv) * H * 0.14;
        const py = H / 2 + off + Math.sin(u * 14 + t * 3 + k * 2.5) * H * 0.10 * (1 - conv);
        i ? x.lineTo(u * W, py) : x.moveTo(0, py);
      }
      x.stroke();
    }
    x.strokeStyle = "rgba(255,235,246,0.9)"; x.lineWidth = 3.4; x.shadowBlur = 16;
    x.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = 0.72 + (i / 40) * 0.28;
      const py = H / 2 + Math.sin(u * 14 + t * 3) * H * 0.012;
      i ? x.lineTo(u * W, py) : x.moveTo(0.72 * W, py);
    }
    x.stroke();
  });

  reg(2, "h6", "feedback bloom", (x, W, H, t) => {
    // one small input, echoed by the system into a tunnel — video feedback
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const pulse = 0.86 + 0.05 * Math.sin(t * 1.4);
    for (let i = 13; i >= 0; i--) {
      const s = Math.pow(pulse, i);
      const rot = i * 0.16 + t * 0.25;
      const a2 = 0.16 + (1 - i / 13) * 0.6;
      x.save();
      x.translate(W / 2, H / 2); x.rotate(rot); x.scale(s, s);
      x.strokeStyle = M(a2); x.lineWidth = 3 / s; x.shadowColor = M(0.9); x.shadowBlur = 8;
      x.strokeRect(-W * 0.30, -H * 0.30, W * 0.60, H * 0.60);
      x.restore();
    }
    x.fillStyle = "rgba(255,235,246,0.95)"; x.shadowColor = M(1); x.shadowBlur = 18;
    x.beginPath(); x.arc(W / 2, H / 2, 3.2, 0, 7); x.fill();
  });
})();
