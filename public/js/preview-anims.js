/* Live channel-preview signals. Each entry: {ch, label, draw(ctx,W,H,t,rnd)}.
   One shared 30fps ticker drives only on-screen tiles; prefers-reduced-motion
   renders a single frame at t=1.7s. */
(function () {
  const TINT = {
    1: [55, 255, 139], 2: [255, 62, 165], 3: [255, 179, 0],
    4: [43, 217, 255], 5: [232, 233, 238],
  };
  const tn = (ch, a) => `rgba(${TINT[ch][0]},${TINT[ch][1]},${TINT[ch][2]},${a})`;

  function mkRnd(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }

  const A = window.PF_ANIMS = [];
  const reg = (ch, key, label, draw) => A.push({ ch, key, label, draw });

  /* ---------------- CH 01 ABOUT (green) ---------------- */
  reg(1, "a1", "breathing ember", (x, W, H, t) => {
    x.fillStyle = "#050302"; x.fillRect(0, 0, W, H);
    const p = 0.5 + 0.5 * Math.sin(t * 1.4);
    const g = x.createRadialGradient(W / 2, H * 0.9, 0, W / 2, H * 0.9, H * (0.55 + p * 0.25));
    g.addColorStop(0, `rgba(255,${140 + p * 60 | 0},50,${0.75 + p * 0.2})`);
    g.addColorStop(0.5, "rgba(200,60,10,0.25)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const rr = mkRnd(7);
    for (let i = 0; i < 22; i++) {
      const ph = (t * (0.12 + rr() * 0.10) + rr()) % 1;
      const px = W * (0.2 + rr() * 0.6) + Math.sin(t + i) * 8;
      x.fillStyle = tn(1, (1 - ph) * 0.8);
      x.beginPath(); x.arc(px, H * 0.9 - ph * H * 0.85, 1.6 + rr() * 1.6, 0, 7); x.fill();
    }
  });

  reg(1, "a2", "gorintō draw-on", (x, W, H, t) => {
    x.fillStyle = "#020703"; x.fillRect(0, 0, W, H);
    x.strokeStyle = tn(1, 0.9); x.lineWidth = 3; x.shadowColor = tn(1, 0.8); x.shadowBlur = 10;
    x.lineCap = "round";
    const cx = W / 2, u = H / 6.4, base = H * 0.9;
    const phase = (t * 0.22) % 1.3;
    const seg = (frac, fn) => {
      const k = Math.max(0, Math.min(1, (phase * 5 - frac)));
      if (k > 0) { x.setLineDash([1000 * k, 1000]); fn(); x.setLineDash([]); }
    };
    seg(0, () => { x.strokeRect(cx - u * 0.85, base - u * 1.7, u * 1.7, u * 1.7); });
    seg(1, () => { x.beginPath(); x.arc(cx, base - u * 2.55, u * 0.85, 0, 7); x.stroke(); });
    seg(2, () => { x.beginPath(); x.moveTo(cx - u * 0.8, base - u * 3.4); x.lineTo(cx + u * 0.8, base - u * 3.4); x.lineTo(cx, base - u * 4.6); x.closePath(); x.stroke(); });
    seg(3, () => { x.beginPath(); x.arc(cx, base - u * 4.75, u * 0.62, Math.PI, 0); x.stroke(); x.beginPath(); x.moveTo(cx - u * 0.62, base - u * 4.75); x.lineTo(cx + u * 0.62, base - u * 4.75); x.stroke(); });
    seg(4, () => { x.beginPath(); x.arc(cx, base - u * 5.75, u * 0.42, Math.PI * 0.85, Math.PI * 0.15); x.quadraticCurveTo(cx + u * 0.1, base - u * 6.4, cx, base - u * 6.5); x.quadraticCurveTo(cx - u * 0.1, base - u * 6.4, cx - u * 0.40, base - u * 5.95); x.stroke(); });
  });

  reg(1, "a3", "signal handshake", (x, W, H, t) => {
    x.fillStyle = "#020703"; x.fillRect(0, 0, W, H);
    const meet = 0.5 + 0.5 * Math.sin(t * 0.9);          // 0 apart, 1 merged
    x.lineWidth = 3; x.shadowBlur = 12; x.shadowColor = tn(1, 0.8);
    for (const s of [-1, 1]) {
      x.strokeStyle = tn(1, 0.9);
      x.beginPath();
      for (let i = 0; i <= 120; i++) {
        const px = i / 120 * W;
        const off = s * (1 - meet) * H * 0.16;
        const amp = H * 0.05 * (1 + meet * Math.sin(i / 120 * Math.PI));
        const py = H / 2 + off + Math.sin(i * 0.24 + t * 3 * s) * amp;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
    }
  });

  reg(1, "a4", "countdown leader", (x, W, H, t) => {
    x.fillStyle = "#0A0A0C"; x.fillRect(0, 0, W, H);
    const n = 5 - Math.floor(t % 5);
    const f = (t % 1);
    x.strokeStyle = tn(1, 0.45); x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke();
    x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.stroke();
    x.beginPath(); x.arc(W / 2, H / 2, H * 0.38, 0, 7); x.stroke();
    x.fillStyle = tn(1, 0.14);
    x.beginPath(); x.moveTo(W / 2, H / 2);
    x.arc(W / 2, H / 2, H * 0.38, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
    x.closePath(); x.fill();
    x.fillStyle = tn(1, 0.95); x.font = `700 ${H * 0.42 | 0}px "Courier New",monospace`;
    x.textAlign = "center"; x.textBaseline = "middle"; x.shadowColor = tn(1, 0.8); x.shadowBlur = 16;
    x.fillText(String(n), W / 2, H * 0.53);
  });

  reg(1, "a5", "five orbits align", (x, W, H, t) => {
    x.fillStyle = "#020703"; x.fillRect(0, 0, W, H);
    x.strokeStyle = tn(1, 0.22); x.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const rr = H * (0.10 + i * 0.075);
      x.beginPath(); x.arc(W / 2, H / 2, rr, 0, 7); x.stroke();
      const sp = 0.6 - i * 0.09;
      const a = -Math.PI / 2 + Math.sin(t * sp) * Math.PI * 1.2;
      x.fillStyle = tn(1, 0.95); x.shadowColor = tn(1, 0.9); x.shadowBlur = 12;
      x.beginPath(); x.arc(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr, 5, 0, 7); x.fill();
      x.shadowBlur = 0;
    }
  });

  reg(1, "a6", "persona spectrum", (x, W, H, t) => {
    const cols = ["#FF5C0D", "#F2C76E", "#6B8CFF", "#EB1428", "#FF4894", "#E61E08"];
    const off = (t * 0.06) % 1;
    for (let i = 0; i < 8; i++) {
      const k = (i + off * 6) % 6;
      x.fillStyle = cols[Math.floor(k) % 6];
      x.globalAlpha = 0.85;
      x.fillRect(((i - off * 6 / 8 * 8) / 7) * W - W / 7, 0, W / 7 + 2, H);
    }
    x.globalAlpha = 1;
    x.fillStyle = "rgba(4,4,6,0.55)"; x.fillRect(0, H * 0.72, W, H * 0.28);
  });

  reg(1, "a7", "phosphor smoke", (x, W, H, t) => {
    x.fillStyle = "#020703"; x.fillRect(0, 0, W, H);
    x.lineWidth = 5; x.shadowBlur = 13;
    for (let b = 0; b < 14; b++) {
      x.strokeStyle = tn(1, 0.10 + (b / 14) * 0.28); x.shadowColor = tn(1, 0.8);
      const xb = W * (0.12 + 0.76 * ((b * 71) % 14) / 14);
      x.beginPath();
      for (let i = 0; i <= 60; i++) {
        const yy = H - i / 60 * H;
        const sway = Math.sin(i * 0.11 + t * 1.1 + b * 2.0) * W * 0.05 * (i / 60);
        i ? x.lineTo(xb + sway, yy) : x.moveTo(xb, yy);
      }
      x.stroke();
    }
  });

  reg(1, "a8", "tuning sweep", (x, W, H, t) => {
    x.fillStyle = "#020703"; x.fillRect(0, 0, W, H);
    const rr = mkRnd(1 + Math.floor(t * 30));
    for (let i = 0; i < 700; i++) {
      x.fillStyle = tn(1, rr() * 0.14);
      x.fillRect(rr() * W, rr() * H, 2, 2);
    }
    const px = ((t * 0.35) % 1.2 - 0.1) * W;
    const g = x.createLinearGradient(px - W * 0.12, 0, px + W * 0.12, 0);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, tn(1, 0.85)); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(px - W * 0.12, 0, W * 0.24, H);
  });

  /* ---------------- CH 02 CONTRIBUTE (magenta) ---------------- */
  reg(2, "c1", "vu needle", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.92;
    x.strokeStyle = tn(2, 0.5); x.lineWidth = 3;
    x.beginPath(); x.arc(cx, cy, H * 0.62, Math.PI * 1.16, Math.PI * 1.84); x.stroke();
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * (1.16 + 0.68 * i / 10);
      x.lineWidth = i % 5 ? 2 : 4;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * H * 0.62, cy + Math.sin(a) * H * 0.62);
      x.lineTo(cx + Math.cos(a) * (H * 0.62 + (i % 5 ? 10 : 20)), cy + Math.sin(a) * (H * 0.62 + (i % 5 ? 10 : 20)));
      x.stroke();
    }
    const sig = Math.max(0, Math.sin(t * 3.1) * 0.5 + Math.sin(t * 7.7) * 0.3 + Math.sin(t * 1.3) * 0.2);
    const na = Math.PI * (1.20 + 0.60 * Math.min(1, 0.15 + sig));
    x.strokeStyle = tn(2, 0.95); x.lineWidth = 4; x.shadowColor = tn(2, 0.9); x.shadowBlur = 10;
    x.beginPath(); x.moveTo(cx, cy);
    x.lineTo(cx + Math.cos(na) * H * 0.70, cy + Math.sin(na) * H * 0.70); x.stroke();
  });

  reg(2, "c2", "ripple pool", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const rr = mkRnd(11);
    for (let k = 0; k < 7; k++) {
      const bx = W * (0.15 + rr() * 0.7), by = H * (0.2 + rr() * 0.6);
      const ph = (t * (0.22 + rr() * 0.12) + rr()) % 1;
      x.strokeStyle = tn(2, (1 - ph) * 0.85); x.lineWidth = 2.5;
      x.shadowColor = tn(2, 0.7); x.shadowBlur = 8;
      x.beginPath(); x.arc(bx, by, ph * H * 0.42, 0, 7); x.stroke();
      x.beginPath(); x.arc(bx, by, Math.max(0, ph - 0.18) * H * 0.42, 0, 7); x.stroke();
    }
  });

  reg(2, "c3", "rotary return", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const cy2 = H * 0.52, rr = H * 0.34;
    const cyc = t % 3;
    const wind = cyc < 1.2 ? (cyc / 1.2) : Math.max(0, 1 - (cyc - 1.2) / 0.7);
    const a0 = wind * Math.PI * 1.4;
    x.strokeStyle = tn(2, 0.4); x.lineWidth = 2;
    x.beginPath(); x.arc(W / 2, cy2, rr, 0, 7); x.stroke();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + a0 + k / 10 * Math.PI * 2;
      x.fillStyle = tn(2, k === 0 ? 0.95 : 0.55);
      x.shadowColor = tn(2, 0.8); x.shadowBlur = k === 0 ? 12 : 0;
      x.beginPath(); x.arc(W / 2 + Math.cos(a) * rr * 0.78, cy2 + Math.sin(a) * rr * 0.78, k === 0 ? 9 : 7, 0, 7); x.fill();
      x.shadowBlur = 0;
    }
    x.fillStyle = tn(2, 0.9);
    x.beginPath(); x.arc(W / 2, cy2, rr * 0.30, 0, 7); x.fill();
  });

  reg(2, "c4", "spectrogram fall", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const cols2 = 26, rows = 16;
    for (let ci = 0; ci < cols2; ci++) {
      for (let ri = 0; ri < rows; ri++) {
        const v = Math.max(0, Math.sin(ci * 0.7 + t * 2 + ri * 0.3) * Math.sin(ri * 0.9 - t * 3.1));
        if (v > 0.25) {
          x.fillStyle = tn(2, v * 0.85);
          x.fillRect(ci / cols2 * W + 2, ((ri + (t * 4 % 1)) % rows) / rows * H + 2, W / cols2 - 4, H / rows - 4);
        }
      }
    }
  });

  reg(2, "c5", "morse line", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const pat = [3, 1, 1, 1, 3, 3, 1, 1, 1, 1, 3, 1];   // widths in units
    x.fillStyle = tn(2, 0.9); x.shadowColor = tn(2, 0.9); x.shadowBlur = 12;
    let px = -((t * W * 0.25) % (W * 1.4));
    for (let rep = 0; rep < 4; rep++) {
      for (const u of pat) {
        const w2 = u * W * 0.022;
        x.fillRect(px, H / 2 - 4, w2, 8);
        px += w2 + W * 0.022;
      }
      px += W * 0.10;
    }
  });

  reg(2, "c6", "breath ring", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const b = 0.5 + 0.5 * Math.sin(t * 0.8);           // slow breath
    x.strokeStyle = tn(2, 0.3 + b * 0.65); x.lineWidth = 5 + b * 6;
    x.shadowColor = tn(2, 0.9); x.shadowBlur = 16 + b * 18;
    x.beginPath(); x.arc(W / 2, H / 2, H * (0.16 + b * 0.22), 0, 7); x.stroke();
    x.fillStyle = tn(2, 0.25 + b * 0.5);
    x.beginPath(); x.arc(W / 2, H / 2, 4 + b * 3, 0, 7); x.fill();
  });

  reg(2, "c7", "the queue", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const base = 11 + Math.floor(t / 2.4);
    const slide = (t % 2.4) < 0.4 ? 1 - (t % 2.4) / 0.4 : 0;
    for (let k = 0; k < 4; k++) {
      const n = base + k;
      const px = W * (0.09 + (k + slide) * 0.22), py = H * 0.42;
      const hot = k === 0;
      x.strokeStyle = tn(2, hot ? 0.95 : 0.4); x.lineWidth = hot ? 3 : 2;
      x.strokeRect(px, py, W * 0.17, H * 0.20);
      x.fillStyle = tn(2, hot ? 0.95 : 0.45);
      x.font = `700 ${H * 0.11 | 0}px "Courier New",monospace`;
      x.textAlign = "center"; x.textBaseline = "middle";
      x.shadowColor = tn(2, 0.7); x.shadowBlur = hot ? 10 : 0;
      x.fillText(String(n).padStart(3, "0"), px + W * 0.085, py + H * 0.105);
      x.shadowBlur = 0;
    }
    x.fillStyle = tn(2, 0.5); x.fillRect(W * 0.09, H * 0.70, W * 0.82, 2);
  });

  reg(2, "c8", "cursor field", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const rr = mkRnd(41);
    for (let k = 0; k < 24; k++) {
      const px = W * (0.06 + rr() * 0.84), py = H * (0.08 + rr() * 0.8);
      const ph = rr() * 7;
      const on = Math.sin(t * (2 + rr() * 3) + ph) > 0;
      const typing = Math.sin(t * 0.5 + ph) > 0.85;
      x.fillStyle = tn(2, on ? 0.9 : 0.12);
      x.fillRect(px, py, 9, 16);
      if (typing) {
        for (let j = 1; j <= 3; j++) x.fillRect(px - j * 13, py, 9, 16);
      }
    }
  });

  /* ---------------- CH 03 EXPERIMENTS (amber) ---------------- */
  reg(3, "x1", "scope sweep", (x, W, H, t) => {
    x.fillStyle = "#070402"; x.fillRect(0, 0, W, H);
    x.strokeStyle = tn(3, 0.2); x.lineWidth = 1;
    for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(0, i * H / 6); x.lineTo(W, i * H / 6); x.stroke(); }
    for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(i * W / 8, 0); x.lineTo(i * W / 8, H); x.stroke(); }
    const sweep = (t * 0.55) % 1;
    for (let e = 4; e >= 0; e--) {
      x.strokeStyle = tn(3, e ? 0.14 * e : 0.95); x.lineWidth = e ? 2 : 3;
      x.shadowColor = tn(3, 0.8); x.shadowBlur = e ? 0 : 10;
      x.beginPath();
      const tt = t - e * 0.12;
      for (let i = 0; i <= 140; i++) {
        const px = i / 140 * W;
        const py = H / 2 + Math.sin(i * 0.09 + tt * 4) * H * 0.22 * Math.sin(tt * 0.7 + i * 0.01);
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
    }
    x.fillStyle = tn(3, 0.5); x.fillRect(sweep * W, 0, 2, H);
  });

  reg(3, "x2", "vertical roll", (x, W, H, t) => {
    x.fillStyle = "#070402"; x.fillRect(0, 0, W, H);
    const roll = (t * 0.9) % 1;
    for (let b = 0; b < 7; b++) {
      const py = ((b / 7 + roll) % 1) * H * 1.15 - H * 0.075;
      x.fillStyle = tn(3, 0.14 + (b % 3) * 0.16);
      x.fillRect(0, py, W, H * 0.09);
    }
    x.fillStyle = "rgba(0,0,0,0.75)";
    x.fillRect(0, ((roll * H * 1.15) - H * 0.075) - 6, W, 12);
  });

  reg(3, "x3", "magnet breathe", (x, W, H, t) => {
    x.fillStyle = "#070402"; x.fillRect(0, 0, W, H);
    const F = W * (0.12 + 0.14 * (0.5 + 0.5 * Math.sin(t * 1.1)));
    const PX = W * 0.62, PY = H * 0.32;
    x.strokeStyle = tn(3, 0.75); x.lineWidth = 2; x.shadowColor = tn(3, 0.6); x.shadowBlur = 5;
    for (let l = 0; l < 30; l++) {
      const y0 = l / 29 * H;
      x.beginPath();
      let lx = null, ly = null;
      for (let i = 0; i <= 80; i++) {
        const px = i / 80 * W;
        const dx = px - PX, dy = y0 - PY, d = Math.hypot(dx, dy) || 1;
        const f = Math.exp(-(d * d) / (2 * F * F)) * F * 0.9;
        const ang = Math.atan2(dy, dx);
        const qx = px + Math.cos(ang + Math.PI / 2) * f;
        const qy = y0 + Math.sin(ang + Math.PI / 2) * f;
        // lift the pen across violent jumps — no chords through the pole
        if (lx === null || Math.hypot(qx - lx, qy - ly) > 34) x.moveTo(qx, qy);
        else x.lineTo(qx, qy);
        lx = qx; ly = qy;
      }
      x.stroke();
    }
  });

  reg(3, "x4", "lissajous morph", (x, W, H, t) => {
    x.fillStyle = "#070402"; x.fillRect(0, 0, W, H);
    const k = (t * 0.25) % 4;
    const pairs = [[1, 2], [2, 3], [3, 4], [3, 2], [1, 2]];
    const i0 = Math.floor(k), f = k - i0;
    const a = pairs[i0][0] * (1 - f) + pairs[i0 + 1][0] * f;
    const b = pairs[i0][1] * (1 - f) + pairs[i0 + 1][1] * f;
    x.strokeStyle = tn(3, 0.9); x.lineWidth = 3; x.shadowColor = tn(3, 0.85); x.shadowBlur = 12;
    x.beginPath();
    for (let i = 0; i <= 700; i++) {
      const tt = i / 700 * Math.PI * 2;
      const px = W / 2 + Math.sin(tt * a + t) * W * 0.33;
      const py = H / 2 + Math.sin(tt * b) * H * 0.33;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
  });

  reg(3, "x5", "noise to order", (x, W, H, t) => {
    x.fillStyle = "#070402"; x.fillRect(0, 0, W, H);
    const order = 0.5 + 0.5 * Math.sin(t * 0.7);
    const rr = mkRnd(3 + Math.floor(t * (1 - order) * 20));
    x.fillStyle = tn(3, 0.85);
    for (let i = 0; i < 260; i++) {
      const ix = i / 260;
      const nx = rr() * W, ny = rr() * H;
      const sx = ix * W, sy = H / 2 + Math.sin(ix * Math.PI * 4 + t) * H * 0.25;
      const px = nx * (1 - order) + sx * order;
      const py = ny * (1 - order) + sy * order;
      x.fillRect(px, py, 3, 3);
    }
  });

  reg(3, "x6", "grid pulse", (x, W, H, t) => {
    x.fillStyle = "#070402"; x.fillRect(0, 0, W, H);
    const k = 0.35 * Math.sin(t * 1.6);
    x.strokeStyle = tn(3, 0.65); x.lineWidth = 1.6;
    const warp = (px, py) => {
      const nx = (px / W - 0.5) * 2, ny = (py / H - 0.5) * 2;
      const r2 = nx * nx + ny * ny;
      const s = 1 + k * r2;
      return [W / 2 + nx * s * W / 2, H / 2 + ny * s * H / 2];
    };
    for (let gi = 0; gi <= 12; gi++) {
      x.beginPath();
      for (let j = 0; j <= 40; j++) {
        const [px, py] = warp(gi / 12 * W, j / 40 * H);
        j ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
      x.beginPath();
      for (let j = 0; j <= 40; j++) {
        const [px, py] = warp(j / 40 * W, gi / 12 * H);
        j ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
    }
  });

  reg(3, "x7", "rgb drift", (x, W, H, t) => {
    x.fillStyle = "#070402"; x.fillRect(0, 0, W, H);
    const d = Math.max(0, Math.sin(t * 1.2)) * W * 0.05;
    x.globalCompositeOperation = "lighter";
    const shape = (ox, col) => {
      x.strokeStyle = col; x.lineWidth = 5;
      x.beginPath(); x.arc(W / 2 + ox, H / 2, H * 0.28, 0, 7); x.stroke();
      x.beginPath(); x.moveTo(W / 2 + ox - H * 0.28, H / 2); x.lineTo(W / 2 + ox + H * 0.28, H / 2); x.stroke();
    };
    shape(-d, "rgba(255,60,60,0.8)");
    shape(0, "rgba(80,255,120,0.8)");
    shape(d, "rgba(80,120,255,0.8)");
    x.globalCompositeOperation = "source-over";
  });

  reg(3, "x8", "phosphor ghost", (x, W, H, t) => {
    x.fillStyle = "#070402"; x.fillRect(0, 0, W, H);
    for (let e = 9; e >= 0; e--) {
      const tt = t - e * 0.10;
      const px = W / 2 + Math.cos(tt * 1.5) * W * 0.30;
      const py = H / 2 + Math.sin(tt * 2.3) * H * 0.28;
      x.fillStyle = tn(3, e ? 0.05 * (10 - e) : 0.95);
      x.shadowColor = tn(3, 0.8); x.shadowBlur = e ? 0 : 14;
      x.fillRect(px - 16, py - 16, 32, 32);
      x.shadowBlur = 0;
    }
  });

  /* ---------------- winners, animated ---------------- */
  reg(4, "r1", "punch data (live)", (x, W, H, t) => {
    x.fillStyle = "#020608"; x.fillRect(0, 0, W, H);
    const rr = mkRnd(97);
    const scan = ((t * 0.35) % 1.3 - 0.15) * W;
    for (let ci = 0; ci < 24; ci++) for (let ri = 0; ri < 14; ri++) {
      const base = rr() > 0.62;
      const flick = Math.sin(t * (0.4 + rr() * 0.6) + ci + ri) > 0.92;
      const on = flick ? !base : base;
      const px = W * 0.05 + ci * W * 0.039, py = H * 0.07 + ri * H * 0.064;
      const near = Math.abs(px - scan) < W * 0.05;
      x.fillStyle = tn(4, on ? (near ? 1.0 : 0.75) : 0.12);
      x.shadowColor = tn(4, 0.8); x.shadowBlur = on && near ? 10 : 0;
      x.beginPath(); x.arc(px, py, on ? 4.5 : 2.5, 0, 7); x.fill();
      x.shadowBlur = 0;
    }
  });

  reg(5, "l1", "moon phases (live)", (x, W, H, t) => {
    x.fillStyle = "#0A0A0C"; x.fillRect(0, 0, W, H);
    const R = H * 0.30, ph = (t * 0.06) % 1;    // slow full cycle
    x.fillStyle = "#222329";
    x.beginPath(); x.arc(W / 2, H / 2, R, 0, 7); x.fill();
    x.fillStyle = "rgba(240,240,244,0.95)"; x.shadowColor = "rgba(240,240,244,0.5)"; x.shadowBlur = 18;
    x.beginPath();
    const k = ph < 0.5 ? ph * 2 : (1 - ph) * 2;   // waxing then waning
    const dir = ph < 0.5 ? 1 : -1;
    x.arc(W / 2, H / 2, R, -Math.PI / 2 * dir, Math.PI / 2 * dir, false);
    x.ellipse(W / 2, H / 2, R * Math.abs(1 - k * 2), R, 0, Math.PI / 2 * dir, -Math.PI / 2 * dir, k < 0.5);
    x.fill(); x.shadowBlur = 0;
    for (let i = 0; i < 8; i++) {
      x.fillStyle = Math.floor(ph * 8) === i ? tn(5, 0.9) : tn(5, 0.22);
      x.beginPath(); x.arc(W * (0.30 + i * 0.057), H * 0.88, 4, 0, 7); x.fill();
    }
  });

  /* ---------------- runtime: call PF_INIT() after ALL batches registered ---------------- */
  window.PF_INIT = function () {
  if (window.__pfInited) return;
  window.__pfInited = true;
  const CHN = { 1: "ABOUT", 2: "CONTRIBUTE", 3: "EXPERIMENTS", 4: "RESEARCH", 5: "LOG" };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const live = new Set();
  document.querySelectorAll("canvas[data-anim]").forEach(cv => {
    const spec = A.find(a => a.key === cv.dataset.anim);
    if (!spec) return;
    cv.width = 440; cv.height = 330;
    cv._spec = spec; cv._ctx = cv.getContext("2d");
    if (reduced) { spec.draw(cv._ctx, 440, 330, 1.7, mkRnd(1), (cv._st = cv._st || {})); osd(cv); }
  });
  function osd(cv) {
    const x = cv._ctx, W = cv.width, H = cv.height, spec = cv._spec;
    x.fillStyle = "rgba(0,0,0,0.24)";
    for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
    const label = `CH 0${spec.ch} · ${CHN[spec.ch]}`;
    x.font = `700 ${H * 0.065 | 0}px "Courier New",monospace`;
    x.textAlign = "left"; x.textBaseline = "middle";
    const tw = x.measureText(label).width;
    x.fillStyle = "rgba(4,4,7,0.78)"; x.fillRect(W * 0.045, H * 0.80, tw + 26, H * 0.11);
    x.fillStyle = tn(spec.ch, 0.97);
    x.fillText(label, W * 0.045 + 13, H * 0.857);
  }
  if (!reduced) {
    const io = new IntersectionObserver(es => {
      es.forEach(e => { e.isIntersecting ? live.add(e.target) : live.delete(e.target); });
    }, { rootMargin: "80px" });
    document.querySelectorAll("canvas[data-anim]").forEach(cv => io.observe(cv));
    let last = 0;
    const tick = (ms) => {
      requestAnimationFrame(tick);
      if (ms - last < 33) return;         // ~30fps
      last = ms;
      const t = ms / 1000;
      live.forEach(cv => { cv._spec.draw(cv._ctx, cv.width, cv.height, t, mkRnd(1), (cv._st = cv._st || {})); osd(cv); });
    };
    requestAnimationFrame(tick);
  }
  };
})();
