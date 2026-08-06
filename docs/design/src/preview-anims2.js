/* Round-2 signals for ABOUT (b1-b8) and CONTRIBUTE (d1-d8): concrete systems,
   fire-native, no abstract wellness, no stock broadcast furniture. */
(function () {
  const A = window.PF_ANIMS;
  if (!A) return;
  const reg = (ch, key, label, draw) => A.push({ ch, key, label, draw });
  const G = (a) => `rgba(55,255,139,${a})`;
  const M = (a) => `rgba(255,62,165,${a})`;
  function mkRnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  // flame body field: 1 inside flame silhouette at (cx, baseY), 0 outside
  function flameF(px, py, cx, baseY, w, h, t) {
    const yy = (baseY - py) / h;                     // 0 at base, 1 at tip
    if (yy < 0 || yy > 1) return 0;
    const sway = Math.sin(t * 2.2 + yy * 5) * w * 0.22 * yy;
    const half = w * (1 - yy) * (0.55 + 0.20 * Math.sin(t * 3.1 + yy * 9));
    const dx = Math.abs(px - cx - sway);
    return dx < half ? 1 - dx / half : 0;
  }

  /* ---------------- CH 01 ABOUT, round 2 ---------------- */
  reg(1, "b1", "fire as raster", (x, W, H, t) => {
    x.fillStyle = "#040302"; x.fillRect(0, 0, W, H);
    for (let l = 0; l < 52; l++) {
      const py = l / 51 * H;
      x.beginPath();
      let started = false;
      for (let i = 0; i <= 110; i++) {
        const px = i / 110 * W;
        const f = flameF(px, py, W / 2, H * 0.96, W * 0.34, H * 0.86, t);
        const off = f * Math.sin(t * 9 + l * 1.3) * 5;
        if (!started) { x.moveTo(px, py + off); started = true; } else x.lineTo(px, py + off);
      }
      // line brightness from flame field sampled at line center
      const fc = flameF(W / 2 + Math.sin(t + l) * 20, py, W / 2, H * 0.96, W * 0.34, H * 0.86, t);
      const warm = fc > 0.01;
      x.strokeStyle = warm
        ? `rgba(255,${110 + fc * 130 | 0},${30 + fc * 40 | 0},${0.25 + fc * 0.75})`
        : "rgba(70,90,80,0.20)";
      x.lineWidth = warm ? 2.5 : 1.2;
      x.shadowColor = "rgba(255,120,30,0.8)"; x.shadowBlur = warm ? 8 : 0;
      x.stroke();
    }
  });

  reg(1, "b2", "daljip catches", (x, W, H, t) => {
    x.fillStyle = "#040302"; x.fillRect(0, 0, W, H);
    const rr = mkRnd(17);
    const cx = W / 2, base = H * 0.88;
    // moon-house: teepee of sticks
    x.lineCap = "round";
    for (let s = 0; s < 9; s++) {
      const a = -Math.PI / 2 + (s / 8 - 0.5) * 1.15;
      x.strokeStyle = "rgba(150,110,70,0.85)"; x.lineWidth = 5;
      x.beginPath();
      x.moveTo(cx + Math.cos(a + Math.PI) * W * 0.02, base);
      x.lineTo(cx + Math.cos(a) * W * 0.20 * (0.9 + rr() * 0.2), base - H * 0.52 * (0.9 + rr() * 0.2));
      x.stroke();
    }
    // fire climbing: height cycles
    const climb = (Math.sin(t * 0.5) * 0.5 + 0.5);
    for (let f = 0; f < 40; f++) {
      const fy = base - rr() * H * 0.55 * climb;
      const fx = cx + (rr() - 0.5) * W * 0.30 * (1 - (base - fy) / (H * 0.6));
      const v = 1 - (base - fy) / (H * 0.55 * Math.max(climb, 0.01));
      if (v < 0) continue;
      x.fillStyle = `rgba(255,${90 + v * 140 | 0},30,${0.15 + v * 0.5})`;
      x.shadowColor = "rgba(255,130,40,0.9)"; x.shadowBlur = 12;
      x.beginPath(); x.arc(fx, fy, 3 + v * 9, 0, 7); x.fill();
    }
    x.shadowBlur = 0;
  });

  reg(1, "b3", "totem powers on", (x, W, H, t) => {
    x.fillStyle = "#050506"; x.fillRect(0, 0, W, H);
    const cyc = (t * 0.35) % 1.6;
    const shapes = 5;
    for (let s = 0; s < shapes; s++) {
      const on = Math.max(0, Math.min(1, (cyc * 6 - s)));
      const sw = W * (0.34 - s * 0.045), sh = H * 0.135;
      const px = W / 2 - sw / 2, py = H * 0.86 - (s + 1) * H * 0.155;
      x.strokeStyle = G(0.35 + on * 0.6); x.lineWidth = 2;
      x.strokeRect(px, py, sw, sh);
      if (on > 0) {
        // CRT power-on: bright line expands to fill
        const lh = sh * on;
        x.fillStyle = G(0.10 + on * 0.5);
        x.fillRect(px + 2, py + sh / 2 - lh / 2 + 1, sw - 4, Math.max(2, lh - 2));
        if (on < 0.25) {
          x.fillStyle = G(0.95); x.shadowColor = G(1); x.shadowBlur = 14;
          x.fillRect(px + 2, py + sh / 2 - 1.5, sw - 4, 3);
          x.shadowBlur = 0;
        }
      }
    }
  });

  reg(1, "b4", "test card burns", (x, W, H, t) => {
    // broadcast furniture subverted: the card burns away from the middle
    const cols = ["#FF5C0D", "#F2C76E", "#6B8CFF", "#EB1428", "#FF4894", "#E61E08", "#C8C8C0"];
    for (let i = 0; i < 7; i++) { x.fillStyle = cols[i]; x.globalAlpha = 0.8; x.fillRect(i * W / 7, 0, W / 7 + 1, H); }
    x.globalAlpha = 1;
    const ph = (t * 0.16) % 1;
    const R = ph * Math.hypot(W, H) * 0.62;
    const rr = mkRnd(29);
    x.save();
    x.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = i / 40 * Math.PI * 2;
      const rad = R * (0.75 + 0.35 * Math.sin(a * 5 + rr() * 7) * rr());
      const px = W / 2 + Math.cos(a) * rad, py = H / 2 + Math.sin(a) * rad;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.closePath();
    x.fillStyle = "#050302"; x.fill();
    // glowing char rim
    x.strokeStyle = `rgba(255,${120 + Math.sin(t * 7) * 40 | 0},30,0.95)`;
    x.lineWidth = 4; x.shadowColor = "rgba(255,120,30,1)"; x.shadowBlur = 18;
    x.stroke();
    x.restore(); x.shadowBlur = 0;
    // embers drifting inside the hole
    for (let e = 0; e < 14; e++) {
      const a = rr() * Math.PI * 2, rad = rr() * R * 0.7;
      x.fillStyle = `rgba(255,150,50,${rr() * 0.7})`;
      x.fillRect(W / 2 + Math.cos(a) * rad, H / 2 + Math.sin(a) * rad - ((t * 30 + e * 17) % 40), 2.5, 2.5);
    }
  });

  reg(1, "b5", "carrier to flame", (x, W, H, t) => {
    x.fillStyle = "#040302"; x.fillRect(0, 0, W, H);
    const k = 0.5 + 0.5 * Math.sin(t * 0.7);          // 0 = sine, 1 = flame outline
    x.lineWidth = 3.5; x.lineJoin = "round";
    x.strokeStyle = k > 0.5 ? `rgba(255,${170 - k * 60 | 0},40,0.95)` : G(0.95);
    x.shadowColor = x.strokeStyle; x.shadowBlur = 14;
    x.beginPath();
    const N = 160;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      // sine form
      const sx = u * W;
      const sy = H / 2 + Math.sin(u * Math.PI * 4 + t * 3) * H * 0.18;
      // flame outline form (closed teardrop, parametric by u around the outline)
      const th = u * Math.PI * 2;
      const rad = H * 0.30 * (1 + 0.45 * Math.sin(th * 0.5 + Math.PI / 2)) * (1 + 0.06 * Math.sin(th * 6 + t * 5));
      const fx = W / 2 + Math.sin(th) * rad * 0.55;
      const fy = H * 0.58 - Math.cos(th * 0.5) * rad * 0.8 + H * 0.1;
      const px = sx * (1 - k) + fx * k, py = sy * (1 - k) + fy * k;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
  });

  reg(1, "b6", "embers form the five", (x, W, H, t) => {
    x.fillStyle = "#040302"; x.fillRect(0, 0, W, H);
    const rr = mkRnd(31);
    const cyc = Math.floor(t * 0.28) % 5, k = Math.min(1, (t * 0.28 % 1) * 1.8);
    const target = (i, n) => {
      const u = i / n * Math.PI * 2, cx = W / 2, cy = H / 2, R = H * 0.30;
      if (cyc === 0) { const s = Math.floor(i / n * 4), f = (i / n * 4) % 1; // square
        return [[cx - R + f * 2 * R, cy - R], [cx + R, cy - R + f * 2 * R], [cx + R - f * 2 * R, cy + R], [cx - R, cy + R - f * 2 * R]][s]; }
      if (cyc === 1) return [cx + Math.cos(u) * R, cy + Math.sin(u) * R];   // circle
      if (cyc === 2) { const s = Math.floor(i / n * 3), f = (i / n * 3) % 1; // triangle
        const P = [[cx, cy - R], [cx + R, cy + R * 0.8], [cx - R, cy + R * 0.8]];
        const a2 = P[s], b2 = P[(s + 1) % 3]; return [a2[0] + (b2[0] - a2[0]) * f, a2[1] + (b2[1] - a2[1]) * f]; }
      if (cyc === 3) return [cx + Math.cos(Math.PI + u / 2) * R, cy + R * 0.3 + Math.sin(Math.PI + u / 2) * R * 0.9]; // crescent arc
      const rad = R * (0.55 + 0.45 * Math.cos(u / 2));  // hōju drop
      return [cx + Math.sin(u) * rad * 0.62, cy + R * 0.15 - Math.cos(u / 2) * rad];
    };
    const n = 90;
    for (let i = 0; i < n; i++) {
      const hx = W * rr(), hy = H * rr();
      const [tx2, ty2] = target(i, n);
      const px = hx * (1 - k) + tx2 * k, py = hy * (1 - k) + ty2 * k;
      const v = 0.25 + k * 0.7;
      x.fillStyle = `rgba(255,${120 + 100 * k | 0},50,${v})`;
      x.shadowColor = "rgba(255,140,50,0.9)"; x.shadowBlur = k * 9;
      x.beginPath(); x.arc(px + Math.sin(t * 3 + i) * 2, py + Math.cos(t * 2.4 + i) * 2, 2.4, 0, 7); x.fill();
    }
    x.shadowBlur = 0;
  });

  reg(1, "b7", "vector campfire", (x, W, H, t) => {
    x.fillStyle = "#020703"; x.fillRect(0, 0, W, H);
    x.lineCap = "round";
    // crossed logs, phosphor strokes
    x.strokeStyle = G(0.8); x.lineWidth = 5; x.shadowColor = G(0.9); x.shadowBlur = 8;
    const base = H * 0.78;
    x.beginPath(); x.moveTo(W * 0.28, base + 14); x.lineTo(W * 0.72, base - 10); x.stroke();
    x.beginPath(); x.moveTo(W * 0.30, base - 10); x.lineTo(W * 0.70, base + 14); x.stroke();
    // flame strokes: 5 flickering polylines
    for (let f = 0; f < 5; f++) {
      const fx = W / 2 + (f - 2) * W * 0.045;
      x.strokeStyle = G(0.55 + 0.4 * Math.sin(t * 6 + f * 2)); x.lineWidth = 3;
      x.beginPath();
      for (let i = 0; i <= 20; i++) {
        const u = i / 20;
        const px = fx + Math.sin(u * 6 + t * (4 + f)) * W * 0.035 * u * (f % 2 ? 1 : -1);
        const py = base - 6 - u * H * (0.30 + 0.10 * Math.sin(t * 2.6 + f));
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
    }
    // sparks
    const rr = mkRnd(13);
    for (let s = 0; s < 12; s++) {
      const ph = (t * (0.3 + rr() * 0.3) + rr()) % 1;
      x.fillStyle = G((1 - ph) * 0.9);
      x.fillRect(W / 2 + (rr() - 0.5) * W * 0.3 + Math.sin(t + s) * 6, base - 10 - ph * H * 0.6, 2.5, 2.5);
    }
    x.shadowBlur = 0;
  });

  reg(1, "b8", "burn-in ghost", (x, W, H, t) => {
    x.fillStyle = "#050506"; x.fillRect(0, 0, W, H);
    const cyc = (t * 0.3) % 2;
    const cardOn = cyc < 1;
    if (cardOn) {
      x.strokeStyle = G(0.5); x.lineWidth = 2;
      for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(i * W / 6, 0); x.lineTo(i * W / 6, H); x.stroke(); }
      for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(0, i * H / 5); x.lineTo(W, i * H / 5); x.stroke(); }
      x.beginPath(); x.arc(W / 2, H / 2, H * 0.28, 0, 7); x.stroke();
    }
    // the flame that was burned into the phosphor never fully leaves
    const gh = cardOn ? 0.28 + 0.08 * Math.sin(t * 2) : 0.75 - (cyc - 1) * 0.3;
    x.lineWidth = 4; x.strokeStyle = `rgba(255,150,60,${gh})`;
    x.shadowColor = "rgba(255,140,50,0.8)"; x.shadowBlur = 16;
    x.beginPath();
    for (let i = 0; i <= 60; i++) {
      const th = i / 60 * Math.PI * 2;
      const rad = H * 0.26 * (1 + 0.45 * Math.sin(th * 0.5 + Math.PI / 2));
      const px = W / 2 + Math.sin(th) * rad * 0.55;
      const py = H * 0.60 - Math.cos(th * 0.5) * rad * 0.8;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke(); x.shadowBlur = 0;
  });

  /* ---------------- CH 02 CONTRIBUTE, round 2 ---------------- */
  reg(2, "d1", "tape splice", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const y0 = H * 0.5, scroll = (t * W * 0.22) % (W * 0.5);
    // two reels
    for (const rx of [W * 0.14, W * 0.86]) {
      x.strokeStyle = M(0.6); x.lineWidth = 3;
      x.beginPath(); x.arc(rx, H * 0.22, H * 0.13, 0, 7); x.stroke();
      for (let k = 0; k < 3; k++) {
        const a = t * (rx < W / 2 ? 2 : 2.6) + k * Math.PI * 2 / 3;
        x.beginPath(); x.moveTo(rx, H * 0.22);
        x.lineTo(rx + Math.cos(a) * H * 0.11, H * 0.22 + Math.sin(a) * H * 0.11); x.stroke();
      }
    }
    // tape path with travelling splices — brighter segments = new voices
    x.lineWidth = 6;
    for (let seg = -1; seg < 4; seg++) {
      const sx = seg * W * 0.5 - scroll + W * 0.1;
      const bright = seg % 2 === 0;
      x.strokeStyle = bright ? M(0.95) : M(0.35);
      x.shadowColor = M(1); x.shadowBlur = bright ? 12 : 0;
      x.beginPath(); x.moveTo(sx, y0); x.lineTo(sx + W * 0.5 - 14, y0); x.stroke();
      if (bright) { // splice flash marks
        x.fillStyle = "rgba(255,255,255,0.9)";
        x.fillRect(sx - 3, y0 - 9, 4, 18);
      }
    }
    x.shadowBlur = 0;
    x.fillStyle = M(0.5);
    x.fillRect(W * 0.47, y0 + 22, W * 0.06, 4); // head marker
  });

  reg(2, "d2", "operator board", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const rr = mkRnd(23);
    const holes = [];
    for (let c = 0; c < 8; c++) for (let r = 0; r < 4; r++)
      holes.push([W * (0.14 + c * 0.105), H * (0.18 + r * 0.14)]);
    holes.forEach(([px, py], i) => {
      const lit = Math.sin(t * 0.7 + i * 1.7) > 0.55;
      x.strokeStyle = M(lit ? 0.9 : 0.35); x.lineWidth = 2.5;
      x.beginPath(); x.arc(px, py, 8, 0, 7); x.stroke();
      if (lit) { x.fillStyle = M(0.9); x.beginPath(); x.arc(px, py, 3, 0, 7); x.fill(); }
    });
    // the plugging cable: animates to a new hole each cycle
    const cyc = Math.floor(t * 0.5) % holes.length;
    const k = Math.min(1, (t * 0.5 % 1) * 1.6);
    const [hx, hy] = holes[(cyc * 7 + 3) % holes.length];
    const sx = W * 0.5, sy = H * 1.05;
    const mx = sx + (hx - sx) * k, my = sy + (hy - sy) * k - Math.sin(k * Math.PI) * H * 0.25;
    x.strokeStyle = M(0.95); x.lineWidth = 4; x.shadowColor = M(1); x.shadowBlur = 10;
    x.beginPath(); x.moveTo(sx, sy);
    x.quadraticCurveTo(sx, my, mx, my); x.stroke();
    x.fillStyle = "rgba(255,255,255,0.9)";
    x.beginPath(); x.arc(mx, my, 5, 0, 7); x.fill();
    if (k >= 1) { x.strokeStyle = "rgba(255,255,255,0.8)"; x.beginPath(); x.arc(hx, hy, 12 + Math.sin(t * 9) * 3, 0, 7); x.stroke(); }
    x.shadowBlur = 0;
  });

  reg(2, "d3", "dial pulses", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const y0 = H * 0.52;
    x.strokeStyle = M(0.4); x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, y0); x.lineTo(W, y0); x.stroke();
    // exchange node
    const nx = W * 0.84;
    const cyc = (t * 0.5) % 1;
    const connected = cyc > 0.75;
    x.strokeStyle = M(connected ? 1 : 0.55); x.lineWidth = 3;
    x.shadowColor = M(1); x.shadowBlur = connected ? 18 : 6;
    x.beginPath(); x.arc(nx, y0, 16 + (connected ? Math.sin(t * 10) * 3 : 0), 0, 7); x.stroke();
    // pulse trains travelling right (dial clicks)
    const digits = [3, 5, 2];
    let px0 = ((cyc) * W * 1.1) - W * 0.35;
    digits.forEach((d, di) => {
      for (let p = 0; p < d; p++) {
        const px = px0 + p * 16;
        if (px > 0 && px < nx - 20) {
          x.fillStyle = M(0.95); x.shadowBlur = 8;
          x.fillRect(px, y0 - 10, 5, 20);
        }
      }
      px0 += d * 16 + 40;
    });
    x.shadowBlur = 0;
  });

  reg(2, "d4", "one more match", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const period = 2.2, N = 6;
    const cyc = (t / period) % N, idx = Math.floor(cyc), k = cyc - idx;
    const mx = (i) => W * (0.14 + i * 0.145);
    const base = H * 0.72;
    // already-standing lit matches
    for (let i = 0; i < N; i++) {
      const standing = i < idx || (i === idx && k > 0.45);
      if (!standing && i > idx) continue;
      const px = mx(i);
      // stick
      x.strokeStyle = "rgba(220,190,150,0.85)"; x.lineWidth = 5; x.lineCap = "round";
      let tilt = 0;
      if (i === idx && k <= 0.45) tilt = (0.45 - k) * 1.6;  // striking sweep
      x.beginPath(); x.moveTo(px + Math.sin(tilt) * H * 0.3, base + (1 - Math.cos(tilt)) * H * 0.1);
      x.lineTo(px, base - H * 0.28); x.stroke();
      // head + flame
      const hy = base - H * 0.30;
      x.fillStyle = "#5A1A10"; x.beginPath(); x.arc(px, hy, 6, 0, 7); x.fill();
      const lit2 = i < idx || (i === idx && k > 0.40);
      if (lit2) {
        const g = 1 - Math.max(0, (idx - i) * 0.12);
        const fl = H * 0.10 * (0.7 + 0.3 * Math.sin(t * 8 + i * 3)) * g;
        const grd = x.createRadialGradient(px, hy - fl * 0.4, 0, px, hy - fl * 0.4, fl * 1.5);
        grd.addColorStop(0, "rgba(255,230,150,0.95)"); grd.addColorStop(0.5, "rgba(255,120,40,0.55)"); grd.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = grd;
        x.beginPath(); x.ellipse(px, hy - fl * 0.4, fl * 0.6, fl, 0, 0, 7); x.fill();
      }
      if (i === idx && k > 0.40 && k < 0.5) { // strike spark
        x.fillStyle = "rgba(255,255,255,0.95)";
        for (let s = 0; s < 6; s++) x.fillRect(px + (Math.random() - 0.5) * 26, hy + (Math.random() - 0.5) * 26, 3, 3);
      }
    }
  });

  reg(2, "d5", "burnt offering", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    // ember bed
    const rr = mkRnd(37);
    const bedY = H * 0.82;
    const g = x.createLinearGradient(0, bedY - 20, 0, H);
    g.addColorStop(0, "rgba(255,110,30,0.0)"); g.addColorStop(0.5, "rgba(255,110,30,0.35)"); g.addColorStop(1, "rgba(120,30,5,0.55)");
    x.fillStyle = g; x.fillRect(0, bedY - 20, W, H - bedY + 20);
    for (let e = 0; e < 20; e++) {
      x.fillStyle = `rgba(255,${100 + rr() * 100 | 0},40,${0.25 + 0.5 * Math.abs(Math.sin(t * 2 + e))})`;
      x.fillRect(rr() * W, bedY + rr() * (H - bedY) * 0.7, 3, 3);
    }
    // the note drifts down and ignites
    const period = 3.0, k = (t / period) % 1;
    const px = W * 0.5 + Math.sin(k * 5) * W * 0.06;
    const py = H * 0.06 + k * (bedY - H * 0.14);
    const burning = k > 0.72;
    if (k < 0.97) {
      x.save(); x.translate(px, py); x.rotate(Math.sin(k * 9) * 0.3);
      const shrink = burning ? 1 - (k - 0.72) / 0.26 : 1;
      x.fillStyle = `rgba(240,235,220,${0.9 * shrink})`;
      x.fillRect(-W * 0.055 * shrink, -H * 0.045 * shrink, W * 0.11 * shrink, H * 0.09 * shrink);
      if (burning) {
        x.strokeStyle = "rgba(255,140,40,0.95)"; x.lineWidth = 3;
        x.shadowColor = "rgba(255,130,40,1)"; x.shadowBlur = 14;
        x.strokeRect(-W * 0.055 * shrink, -H * 0.045 * shrink, W * 0.11 * shrink, H * 0.09 * shrink);
        x.shadowBlur = 0;
      }
      x.restore();
    }
    if (burning) { // sparks rise from the burn
      for (let s = 0; s < 10; s++) {
        const sp = ((k - 0.72) * 4 + s * 0.1) % 1;
        x.fillStyle = `rgba(255,170,60,${(1 - sp) * 0.85})`;
        x.fillRect(px + (rr() - 0.5) * 40, py - sp * H * 0.3, 2.5, 2.5);
      }
    }
  });

  reg(2, "d6", "small wave joins", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const k = (t * 0.30) % 1;
    // carrier
    x.strokeStyle = M(0.85); x.lineWidth = 3.5; x.shadowColor = M(0.9); x.shadowBlur = 10;
    x.beginPath();
    for (let i = 0; i <= 140; i++) {
      const u = i / 140, px = u * W;
      let py = H * 0.42 + Math.sin(u * Math.PI * 5 + t * 2.5) * H * 0.12;
      if (k > 0.6) py += Math.sin(u * Math.PI * 13 + t * 6) * H * 0.045 * ((k - 0.6) / 0.4); // your harmonic, absorbed
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
    // the small offered wave rising to meet it
    if (k <= 0.6) {
      const oy = H * 0.86 - k / 0.6 * H * 0.36;
      x.strokeStyle = M(0.5 + k); x.lineWidth = 2.5;
      x.beginPath();
      for (let i = 0; i <= 50; i++) {
        const u = i / 50, px = W * 0.32 + u * W * 0.36;
        const py = oy + Math.sin(u * Math.PI * 6 + t * 6) * H * 0.03;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
    }
    x.shadowBlur = 0;
  });

  reg(2, "d7", "fire swing", (x, W, H, t) => {
    // 쥐불놀이 — a can of fire swung in circles, trail persists
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.55, R = H * 0.33;
    const a = t * 3.4;
    // persistent trail ring
    for (let i = 0; i < 46; i++) {
      const ta = a - i * 0.12;
      const fade = 1 - i / 46;
      x.fillStyle = `rgba(255,${120 + fade * 110 | 0},40,${fade * 0.65})`;
      x.shadowColor = "rgba(255,130,40,0.9)"; x.shadowBlur = fade * 12;
      const wob = 1 + Math.sin(ta * 2.2) * 0.04;
      x.beginPath(); x.arc(cx + Math.cos(ta) * R * wob, cy + Math.sin(ta) * R * 0.72 * wob, 3 + fade * 6, 0, 7); x.fill();
    }
    // the swinger's arm pivot + cord
    x.shadowBlur = 0;
    x.strokeStyle = "rgba(200,190,180,0.35)"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(cx, cy);
    x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.72); x.stroke();
    // fire can head
    x.fillStyle = "rgba(255,235,170,0.98)"; x.shadowColor = "rgba(255,160,50,1)"; x.shadowBlur = 22;
    x.beginPath(); x.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.72, 8, 0, 7); x.fill();
    x.shadowBlur = 0;
    // flying sparks tangential
    const rr = mkRnd(43);
    for (let s = 0; s < 8; s++) {
      const sa = a - rr() * 0.8, sp = rr();
      x.fillStyle = `rgba(255,170,60,${(1 - sp) * 0.8})`;
      x.fillRect(cx + Math.cos(sa) * (R + sp * 40), cy + Math.sin(sa) * (R * 0.72 + sp * 30), 2.5, 2.5);
    }
  });

  reg(2, "d8", "voice into fire", (x, W, H, t) => {
    x.fillStyle = "#08020A"; x.fillRect(0, 0, W, H);
    // a live waveform column feeds a flame: speech at the bottom becomes fire at the top
    const feed = Math.abs(Math.sin(t * 2.7)) * 0.6 + Math.abs(Math.sin(t * 6.1)) * 0.4;
    // waveform (mic input) across the bottom
    x.strokeStyle = M(0.9); x.lineWidth = 3; x.shadowColor = M(0.9); x.shadowBlur = 8;
    x.beginPath();
    for (let i = 0; i <= 100; i++) {
      const u = i / 100;
      const py = H * 0.86 + Math.sin(u * 40 + t * 14) * H * 0.05 * feed * Math.sin(u * Math.PI);
      i ? x.lineTo(u * W, py) : x.moveTo(0, py);
    }
    x.stroke(); x.shadowBlur = 0;
    // flame in the middle, size follows the voice
    const fh = H * (0.24 + feed * 0.34);
    for (let l = 0; l < 26; l++) {
      const py = H * 0.78 - l / 25 * fh;
      const f = flameF(W / 2, py, W / 2, H * 0.80, W * 0.16 + feed * W * 0.08, fh, t);
      const half = (W * 0.16 + feed * W * 0.08) * (1 - (H * 0.80 - py) / fh) * 0.6;
      if (half <= 0) continue;
      x.strokeStyle = `rgba(255,${110 + feed * 120 | 0},40,${0.3 + feed * 0.5})`;
      x.lineWidth = 3; x.shadowColor = "rgba(255,130,40,0.9)"; x.shadowBlur = 10;
      x.beginPath();
      x.moveTo(W / 2 - half + Math.sin(t * 8 + l) * 4, py);
      x.lineTo(W / 2 + half + Math.sin(t * 7 + l * 1.3) * 4, py);
      x.stroke();
    }
    x.shadowBlur = 0;
  });
})();
