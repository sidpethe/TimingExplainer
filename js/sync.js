/* ==========================================================================
   The Science of Tick-Tock — Loss of Sync & 5G Telecom Simulations
   Interactive labs for TDD Frame Alignment, 7-Tower Network, & Holdover Race
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Physical & standard constants
  const LIMIT_US = 1.5;            // ±1.5 µs 3GPP absolute time alignment budget
  const CELL_BUDGET_US = 3.0;      // 3.0 µs relative guard allowance between adjacent cells

  // Format helpers
  function fmtNum(n, max = 0) {
    return n.toLocaleString('en-US', { maximumFractionDigits: max });
  }

  function fmtDuration(seconds) {
    if (seconds < 60) return `${Math.round(seconds)} s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(0)} min`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hrs`;
    const days = seconds / 86400;
    if (days < 30) return `${days.toFixed(1)} days`;
    if (days < 365) return `${(days / 30.4).toFixed(1)} months`;
    const yrs = days / 365.25;
    return `${yrs.toFixed(1)} years`;
  }

  function fmtTimeOffset(us) {
    if (us < 0.001) return `${(us * 1000).toFixed(1)} ns`;
    if (us < 1) return `${(us * 1000).toFixed(0)} ns`;
    if (us < 1000) return `${us.toFixed(2)} µs`;
    if (us < 1000000) return `${(us / 1000).toFixed(2)} ms`;
    return `${(us / 1000000).toFixed(2)} s`;
  }

  function fitCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 300);
    const height = Math.max(rect.height, 180);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: width, h: height };
  }

  function setRangeFill(input) {
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const val = Number(input.value);
    const pct = ((val - min) / (max - min)) * 100;
    input.style.setProperty('--fill', `${pct}%`);
  }

  /* ==========================================================================
     LAB 5: TDD Frame Alignment
     ========================================================================== */
  (() => {
    const canvas = $('#frame-canvas');
    const slider = $('#frame-slider');
    const out = $('#frame-out');
    const status = $('#frame-status');
    const overlapEl = $('#frame-overlap');
    const marginEl = $('#frame-margin');
    const overlapCard = $('#frame-overlap-card');
    if (!canvas || !slider) return;

    let size = fitCanvas(canvas);
    let colors = {};

    function readColors() {
      colors = {
        primary: css('--primary'),
        primarySoft: css('--primary-soft'),
        laser: css('--laser'),
        laserSoft: css('--laser-soft'),
        teal: css('--teal'),
        text: css('--text'),
        muted: css('--text-muted'),
        border: css('--border'),
        surface: css('--surface'),
        surface2: css('--surface-2')
      };
    }
    readColors();

    function draw() {
      const { ctx, w, h } = size;
      const errorUs = Number(slider.value); // 0 to 8 µs late
      ctx.clearRect(0, 0, w, h);

      const marginX = 28;
      const topY = 24;
      const plotW = w - marginX * 2;
      const rowH = 46;
      const gapY = 32;

      // Coordinate mapping: 0 to 45 microseconds across width
      const maxUs = 40;
      const usToPx = (us) => marginX + (us / maxUs) * plotW;

      // Frame schedule:
      // Transmit: 0 to 20 µs
      // Guard Period: 20 to 23 µs (3 µs)
      // Listen: 23 to 38 µs
      const txEndRef = 20.0;
      const gpEndRef = 23.0;
      const rxEndRef = 38.0;

      // Tower B (Reference, on time)
      const yB = topY + 20;
      // Tower A (Drifted by errorUs)
      const yA = yB + rowH + gapY;

      // Background grid ticks
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.fillStyle = colors.muted;
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'center';

      for (let u = 0; u <= maxUs; u += 5) {
        const x = usToPx(u);
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, yA + rowH + 18);
        ctx.stroke();
        ctx.fillText(`${u} µs`, x, yA + rowH + 16);
      }

      // Draw Row Helper
      function drawTowerRow(label, y, offsetUs, isRef) {
        const txStart = usToPx(0 + offsetUs);
        const txEnd = usToPx(txEndRef + offsetUs);
        const gpEnd = usToPx(gpEndRef + offsetUs);
        const rxEnd = usToPx(rxEndRef + offsetUs);

        // Label
        ctx.fillStyle = colors.text;
        ctx.font = '600 12px Outfit, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, marginX, y - 6);

        // Transmit block (Downlink)
        ctx.fillStyle = isRef ? colors.primary : (offsetUs > CELL_BUDGET_US ? colors.laser : colors.primary);
        ctx.beginPath();
        ctx.roundRect(txStart, y, Math.max(txEnd - txStart, 2), rowH, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        if (txEnd - txStart > 70) {
          ctx.fillText('Transmit (Downlink)', (txStart + txEnd) / 2, y + rowH / 2 + 4);
        } else {
          ctx.fillText('TX', (txStart + txEnd) / 2, y + rowH / 2 + 4);
        }

        // Guard Period (GP)
        ctx.fillStyle = colors.surface2;
        ctx.beginPath();
        ctx.rect(txEnd, y, Math.max(gpEnd - txEnd, 2), rowH);
        ctx.fill();
        ctx.strokeStyle = colors.border;
        ctx.stroke();

        ctx.fillStyle = colors.muted;
        ctx.font = '500 10px JetBrains Mono, monospace';
        if (gpEnd - txEnd > 30) {
          ctx.fillText('GP 3µs', (txEnd + gpEnd) / 2, y + rowH / 2 + 3);
        }

        // Listen block (Uplink)
        ctx.fillStyle = colors.teal;
        ctx.beginPath();
        ctx.roundRect(gpEnd, y, Math.max(rxEnd - gpEnd, 2), rowH, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        if (rxEnd - gpEnd > 70) {
          ctx.fillText('Listen (Uplink)', (gpEnd + rxEnd) / 2, y + rowH / 2 + 4);
        } else {
          ctx.fillText('RX', (gpEnd + rxEnd) / 2, y + rowH / 2 + 4);
        }
      }

      // Draw Tower B (On time)
      drawTowerRow('Tower B (On-time reference cell)', yB, 0, true);

      // Draw Tower A (Delayed)
      drawTowerRow(`Tower A (Clock delayed by +${errorUs.toFixed(2)} µs)`, yA, errorUs, false);

      // Interference collision zone check
      // Tower B starts listening at gpEndRef = 23.0 µs.
      // Tower A stops transmitting at (txEndRef + errorUs) = 20.0 + errorUs.
      // If 20.0 + errorUs > 23.0 => errorUs > 3.0 µs, A is transmitting while B is listening!
      if (errorUs > CELL_BUDGET_US) {
        const collisionStartUs = 23.0;
        const collisionEndUs = 20.0 + errorUs;
        const x1 = usToPx(collisionStartUs);
        const x2 = usToPx(collisionEndUs);

        // Highlight zone across both towers
        ctx.save();
        ctx.fillStyle = colors.laser;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x1, yB, x2 - x1, (yA + rowH) - yB);
        ctx.globalAlpha = 1.0;

        // Striped hazard pattern
        ctx.strokeStyle = colors.laser;
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, yB, x2 - x1, (yA + rowH) - yB);

        // Arrow / Callout
        ctx.fillStyle = colors.laser;
        ctx.font = '700 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        const midX = (x1 + x2) / 2;
        ctx.fillText(`COLLISION (${(errorUs - CELL_BUDGET_US).toFixed(2)} µs overlap)`, midX, yB - 6);
        ctx.fillText('A transmits while B tries to hear weak phones!', midX, (yB + yA + rowH) / 2);
        ctx.restore();
      } else {
        // Safe guard margin indicator
        const remainingGuard = CELL_BUDGET_US - errorUs;
        const xA_txEnd = usToPx(txEndRef + errorUs);
        const xB_rxStart = usToPx(gpEndRef);
        ctx.save();
        ctx.strokeStyle = colors.teal;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(xA_txEnd, yA - 6);
        ctx.lineTo(xA_txEnd, yB + rowH + 6);
        ctx.moveTo(xB_rxStart, yA - 6);
        ctx.lineTo(xB_rxStart, yB + rowH + 6);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    function update() {
      const errorUs = Number(slider.value);
      out.textContent = `${errorUs.toFixed(2)} µs late`;
      setRangeFill(slider);

      if (errorUs <= CELL_BUDGET_US) {
        const margin = CELL_BUDGET_US - errorUs;
        status.className = 'status-pill ok';
        status.textContent = 'Within budget';
        overlapEl.textContent = 'None';
        overlapCard.className = 'readout highlight';
        marginEl.textContent = `${margin.toFixed(2)} µs`;
      } else {
        const overlap = errorUs - CELL_BUDGET_US;
        status.className = 'status-pill bad';
        status.textContent = 'Interference active!';
        overlapEl.textContent = `+${overlap.toFixed(2)} µs`;
        overlapCard.className = 'readout danger';
        marginEl.textContent = '0.00 µs (exceeded)';
      }

      draw();
    }

    slider.addEventListener('input', update);
    document.addEventListener('themechange', () => { readColors(); draw(); });
    new ResizeObserver(() => { size = fitCanvas(canvas); draw(); }).observe(canvas);
    update();
  })();

  /* ==========================================================================
     LAB 6: 7-Tower 5G Network Simulation
     ========================================================================== */
  (() => {
    const canvas = $('#net-canvas');
    if (!canvas) return;

    const jamBtn = $('#jam-btn');
    const resetBtn = $('#net-reset');
    const clockChips = $$('.chips button[data-clock]');
    const speedChips = $$('.chips button[data-speed]');
    const timeOut = $('#net-time');
    const worstOut = $('#net-worst');
    const badOut = $('#net-bad');
    const capOut = $('#net-cap');
    const dropsOut = $('#net-drops');
    const statusPill = $('#net-status');
    const clockLabel = $('#net-clock-label');
    const eventLog = $('#net-log');

    let size = fitCanvas(canvas);
    let colors = {};

    function readColors() {
      colors = {
        primary: css('--primary'),
        primarySoft: css('--primary-soft'),
        laser: css('--laser'),
        laserSoft: css('--laser-soft'),
        amber: css('--amber'),
        teal: css('--teal'),
        text: css('--text'),
        muted: css('--text-muted'),
        border: css('--border'),
        borderStrong: css('--border-strong'),
        surface: css('--surface'),
        surface2: css('--surface-2')
      };
    }
    readColors();

    // Tower clock models:
    // Drift rates in µs per second of real time
    // - OCXO: ~3 µs in ~6 hours = 3 / 21600 = 1.38e-4 µs/s (~12 µs/day)
    // - Rubidium: ~1.5 µs in 7 days = 1.5 / 604800 = 2.48e-6 µs/s (~0.21 µs/day)
    // - Portable optical: ~0.001 µs (1 ns) per day = 1e-3 / 86400 = 1.15e-8 µs/s
    const CLOCK_SPECS = {
      ocxo: {
        name: 'Quartz (OCXO)',
        label: 'holdover clock: quartz (OCXO) · drifts ~12 µs/day',
        baseRate: 1.4e-4, // µs per simulated second
        noise: 0.35
      },
      rb: {
        name: 'Rubidium Atomic',
        label: 'holdover clock: rubidium vapor · drifts ~0.2 µs/day',
        baseRate: 2.5e-6,
        noise: 0.25
      },
      optical: {
        name: 'Portable Optical Clock',
        label: 'holdover clock: portable optical (Tiqker/iodine) · drifts ~1 ns/day',
        baseRate: 1.15e-8,
        noise: 0.15
      }
    };

    // Default time scales for each clock type:
    // - Quartz (OCXO): 1 s = 1 hour (fails in ~4-6 hours)
    // - Rubidium: 1 s = 1 day (fails in ~7 days)
    // - Portable Optical: 1 s = 15 days (drifts ~1 ns/day, holds for years)
    const CLOCK_DEFAULT_SPEEDS = {
      ocxo: 3600,       // 1 s = 1 hour
      rb: 86400,        // 1 s = 1 day
      optical: 1296000  // 1 s = 15 days
    };

    let selectedClock = 'ocxo';
    let simSpeed = 3600; // default for Quartz (OCXO): 1 s = 1 hour
    let isJammed = false;
    let simElapsed = 0; // simulated seconds
    let droppedCalls = 0;
    let loggedEvents = new Set();

    // 7 Towers in hexagonal arrangement: center (0) + 6 ring towers (1..6)
    // Adjacency pairs for 5G inter-cell interference
    const ADJACENCY = [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
      [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1]
    ];

    // Seeded drift multipliers for 7 towers so they drift in different directions
    const DRIFT_SIGNS = [0.2, 1.1, -0.9, 1.4, -1.2, 0.8, -1.3];

    // Mobile user dots (UEs) roaming across cells
    const NUM_PHONES = 28;
    const phones = Array.from({ length: NUM_PHONES }, () => ({
      x: 0,
      y: 0,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      cell: 0
    }));

    function logMessage(text, type = 'bad') {
      if (loggedEvents.has(text)) return;
      loggedEvents.add(text);
      const li = document.createElement('li');
      li.className = type;
      const timeStr = fmtDuration(simElapsed);
      li.innerHTML = `<time>+${timeStr}</time><span>${text}</span>`;
      eventLog.prepend(li);
      // Keep max 15 log items
      while (eventLog.children.length > 15) {
        eventLog.removeChild(eventLog.lastChild);
      }
    }

    function restartSim() {
      simElapsed = 0;
    }

    function resetSim() {
      simElapsed = 0;
      droppedCalls = 0;
      loggedEvents.clear();
      eventLog.innerHTML = '';
      updateMetrics(0, 0, 0, 100);
      logMessage(`System initialized. Clock standard: ${CLOCK_SPECS[selectedClock].name}. GPS healthy.`, 'good');
    }

    // Tower geometry calculation
    function getTowerPositions(w, h) {
      const cx = w * 0.5;
      const cy = h * 0.52;
      const radius = Math.min(w, h) * 0.32;
      const towers = [{ x: cx, y: cy, label: 'T1' }];

      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        towers.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          label: `T${i + 2}`
        });
      }
      return { cx, cy, radius, towers };
    }

    // Main animation & simulation tick
    let lastAnimTime = performance.now();

    function stepSim(now) {
      const dtMs = Math.min(now - lastAnimTime, 100);
      lastAnimTime = now;

      if (isJammed) {
        simElapsed += (dtMs / 1000) * simSpeed;
      }

      // Compute clock offsets for each tower
      const spec = CLOCK_SPECS[selectedClock];
      const offsets = DRIFT_SIGNS.map((sign) => {
        if (!isJammed) return (Math.random() - 0.5) * 0.005; // tiny jitter < 5 ns under GPS
        return sign * spec.baseRate * simElapsed;
      });

      // Check interference pairs
      const interferingPairs = [];
      const interferingTowers = new Set();
      let maxDisagreement = 0;

      ADJACENCY.forEach(([a, b]) => {
        const diff = Math.abs(offsets[a] - offsets[b]);
        if (diff > maxDisagreement) maxDisagreement = diff;
        if (diff > CELL_BUDGET_US) {
          interferingPairs.push([a, b, diff]);
          interferingTowers.add(a);
          interferingTowers.add(b);
        }
      });

      // Log milestones
      if (isJammed) {
        if (maxDisagreement >= 1.0 && !loggedEvents.has('m1')) {
          logMessage('Towers drifting: timing difference exceeded 1.0 µs. Massive MIMO capacity reduced.', 'warn');
          loggedEvents.add('m1');
        }
        if (interferingPairs.length > 0 && !loggedEvents.has('m2')) {
          logMessage(`CRITICAL: Towers reached >${CELL_BUDGET_US} µs disagreement. TDD collision active on adjacent cells!`, 'bad');
          loggedEvents.add('m2');
        }
        if (interferingTowers.size >= 5 && !loggedEvents.has('m3')) {
          logMessage('Regional disruption: cascade failure across 5+ cell sectors. Handover failure rate > 60%.', 'bad');
          loggedEvents.add('m3');
        }
        if (interferingPairs.length > 0) {
          // Increment dropped calls proportionally
          droppedCalls += Math.floor(interferingPairs.length * 3.5 * (dtMs / 1000) * Math.min(simSpeed / 60, 5));
        }
      }

      // Capacity calculation
      const towerCount = 7;
      const badCount = interferingTowers.size;
      const penalty = (badCount / towerCount) * 75 + Math.min(maxDisagreement / 10, 1) * 15;
      const capacityPct = isJammed ? Math.max(100 - Math.round(penalty), 10) : 100;

      updateMetrics(maxDisagreement, badCount, droppedCalls, capacityPct);
      drawNetwork(offsets, interferingPairs, interferingTowers, now);

      requestAnimationFrame(stepSim);
    }

    function updateMetrics(maxDiff, badCount, drops, capacity) {
      if (!isJammed) {
        timeOut.textContent = 'GPS locked';
        statusPill.className = 'status-pill ok';
        statusPill.textContent = 'GPS locked · towers in step';
      } else {
        timeOut.textContent = fmtDuration(simElapsed);
        if (badCount === 0) {
          statusPill.className = 'status-pill ok';
          statusPill.textContent = `Holdover active (${specName(selectedClock)}) · in budget`;
        } else if (badCount < 4) {
          statusPill.className = 'status-pill warn';
          statusPill.textContent = `Timing budget exceeded (${badCount} sectors affected)`;
        } else {
          statusPill.className = 'status-pill bad';
          statusPill.textContent = `Severe interference · ${badCount}/7 towers out of sync`;
        }
      }

      worstOut.textContent = fmtTimeOffset(maxDiff);
      badOut.textContent = `${badCount} / 7`;
      capOut.textContent = `${capacity}%`;
      dropsOut.textContent = fmtNum(drops);

      // Card highlighting
      const worstCard = $('#net-worst-card');
      const badCard = $('#net-bad-card');
      const capCard = $('#net-cap-card');
      const dropsCard = $('#net-drops-card');

      if (worstCard) worstCard.className = maxDiff > CELL_BUDGET_US ? 'readout danger' : 'readout';
      if (badCard) badCard.className = badCount > 0 ? 'readout danger' : 'readout';
      if (capCard) capCard.className = capacity < 70 ? 'readout danger' : 'readout';
      if (dropsCard) dropsCard.className = drops > 500 ? 'readout danger' : 'readout';
    }

    function specName(clockKey) {
      return CLOCK_SPECS[clockKey].name;
    }

    function drawNetwork(offsets, pairs, badTowers, now) {
      const { ctx, w, h } = size;
      ctx.clearRect(0, 0, w, h);

      const { cx, cy, radius, towers } = getTowerPositions(w, h);
      const cellHexR = radius * 0.58;

      // Hexagon drawer helper
      function drawHex(tx, ty, r, fillStyle, strokeStyle, lineWidth = 1) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const x = tx + r * Math.cos(a);
          const y = ty + r * Math.sin(a);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        if (fillStyle) {
          ctx.fillStyle = fillStyle;
          ctx.fill();
        }
        if (strokeStyle) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      }

      // Draw Cell coverage polygons
      towers.forEach((tow, i) => {
        const isBad = badTowers.has(i);
        const hasWarning = Math.abs(offsets[i]) > LIMIT_US && !isBad;

        let fill = colors.surface2;
        let stroke = colors.border;

        if (isBad) {
          fill = colors.laserSoft;
          stroke = colors.laser;
        } else if (hasWarning) {
          fill = colors.surface2;
          stroke = colors.amber;
        }

        drawHex(tow.x, tow.y, cellHexR, fill, stroke, isBad ? 2 : 1.2);
      });

      // Draw interference collision lightning lines between bad pairs
      pairs.forEach(([a, b]) => {
        const ta = towers[a];
        const tb = towers[b];
        ctx.save();
        ctx.strokeStyle = colors.laser;
        ctx.lineWidth = 3;
        ctx.shadowColor = colors.laser;
        ctx.shadowBlur = 8;

        // Jagged lightning line
        const midX = (ta.x + tb.x) / 2;
        const midY = (ta.y + tb.y) / 2;
        const perpX = -(tb.y - ta.y) * 0.12;
        const perpY = (tb.x - ta.x) * 0.12;
        const jitter = Math.sin(now * 0.02) * 8;

        ctx.beginPath();
        ctx.moveTo(ta.x, ta.y);
        ctx.lineTo(midX + perpX + jitter, midY + perpY);
        ctx.lineTo(tb.x, tb.y);
        ctx.stroke();

        // Draw collision badge
        ctx.fillStyle = colors.laser;
        ctx.beginPath();
        ctx.arc(midX, midY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', midX, midY);
        ctx.restore();
      });

      // Draw mobile phone users
      phones.forEach((p, idx) => {
        if (p.x === 0 && p.y === 0) {
          // Initialize around center
          p.x = cx + (Math.random() - 0.5) * radius * 1.5;
          p.y = cy + (Math.random() - 0.5) * radius * 1.5;
        }
        // Move slowly
        p.x += p.vx * 0.04;
        p.y += p.vy * 0.04;

        // Bounce within arena
        const dist = Math.hypot(p.x - cx, p.y - cy);
        if (dist > radius * 1.35) {
          p.vx *= -1;
          p.vy *= -1;
        }

        // Find nearest tower
        let nearestDist = 999999;
        let nearestIdx = 0;
        towers.forEach((tow, ti) => {
          const d = Math.hypot(p.x - tow.x, p.y - tow.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearestIdx = ti;
          }
        });

        const isUserAffected = badTowers.has(nearestIdx);

        ctx.fillStyle = isUserAffected ? colors.laser : colors.teal;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isUserAffected ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw towers and transmission phase
      towers.forEach((tow, i) => {
        // TDD phase cycle (e.g. 10 ms period slowed down for human eye)
        // Each tower has a phase shifted by its clock error:
        const tSec = now / 1000;
        // visual cycle period: 1.6s. Phase shift proportional to offset:
        const phaseShift = isJammed ? (offsets[i] / 5.0) * Math.PI : 0;
        const cycle = Math.sin(tSec * 3.5 + phaseShift);
        const isTx = cycle > 0; // Transmitting (purple) vs Listening (teal)

        const isBad = badTowers.has(i);

        // Tower pulse circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(tow.x, tow.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = isBad ? colors.laser : (isTx ? colors.primary : colors.teal);
        ctx.globalAlpha = 0.16;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Mast structure
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tow.x, tow.y - 14);
        ctx.lineTo(tow.x - 7, tow.y + 12);
        ctx.lineTo(tow.x + 7, tow.y + 12);
        ctx.closePath();
        ctx.moveTo(tow.x - 4, tow.y + 2);
        ctx.lineTo(tow.x + 4, tow.y + 2);
        ctx.stroke();

        // Tower head beacon
        ctx.fillStyle = isBad ? colors.laser : (isTx ? colors.primary : colors.teal);
        ctx.beginPath();
        ctx.arc(tow.x, tow.y - 15, 5, 0, Math.PI * 2);
        ctx.fill();

        // Label & drift readout below tower
        ctx.fillStyle = colors.text;
        ctx.font = '600 11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tow.label, tow.x, tow.y + 24);

        // Drift value pill
        const off = offsets[i];
        ctx.font = '500 10px JetBrains Mono, monospace';
        ctx.fillStyle = isBad ? colors.laser : (Math.abs(off) > LIMIT_US ? colors.amber : colors.muted);
        const offStr = `${off >= 0 ? '+' : ''}${off.toFixed(2)} µs`;
        ctx.fillText(offStr, tow.x, tow.y + 36);

        ctx.restore();
      });
    }

    // Controls listeners
    jamBtn.addEventListener('click', () => {
      isJammed = !isJammed;
      jamBtn.setAttribute('aria-pressed', String(isJammed));
      if (isJammed) {
        jamBtn.className = 'btn btn-teal';
        jamBtn.textContent = 'Restore GPS';
        logMessage(`⚠️ GPS signals jammed across region! Towers running on local ${specName(selectedClock)} holdover clocks.`, 'bad');
      } else {
        jamBtn.className = 'btn btn-danger';
        jamBtn.textContent = 'Jam GPS';
        logMessage('✅ GPS reference restored. Network re-synchronizing...', 'good');
        restartSim();
      }
    });

    resetBtn.addEventListener('click', () => {
      isJammed = false;
      jamBtn.className = 'btn btn-danger';
      jamBtn.textContent = 'Jam GPS';
      jamBtn.setAttribute('aria-pressed', 'false');
      resetSim();
    });

    function setSimSpeed(speed) {
      simSpeed = speed;
      speedChips.forEach((b) => {
        const isCurrent = Number(b.dataset.speed) === speed;
        b.setAttribute('aria-pressed', String(isCurrent));
      });
    }

    clockChips.forEach((btn) => {
      btn.addEventListener('click', () => {
        clockChips.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        selectedClock = btn.dataset.clock;
        clockLabel.textContent = CLOCK_SPECS[selectedClock].label;

        // Auto-switch to optimal default time scale for the selected clock
        const defSpeed = CLOCK_DEFAULT_SPEEDS[selectedClock] || 3600;
        setSimSpeed(defSpeed);

        logMessage(`Switched backup clock to: ${CLOCK_SPECS[selectedClock].name} · default scale set to 1s = ${fmtDuration(defSpeed)}.`, 'warn');
      });
    });

    speedChips.forEach((btn) => {
      btn.addEventListener('click', () => {
        speedChips.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        simSpeed = Number(btn.dataset.speed);
      });
    });

    document.addEventListener('themechange', () => { readColors(); });
    new ResizeObserver(() => { size = fitCanvas(canvas); }).observe(canvas);

    resetSim();
    requestAnimationFrame(stepSim);
  })();

  /* ==========================================================================
     LAB 7: The Holdover Race — 3 Side-by-Side 5G Networks
     ========================================================================== */
  (() => {
    const slider = $('#outage-slider');
    const out = $('#outage-out');
    const tableBody = $('#holdover-body');
    const chips = $$('#holdover-lab .chips button[data-outage]');

    const canvasOcxo = $('#ho-canvas-ocxo');
    const canvasRb = $('#ho-canvas-rb');
    const canvasOptical = $('#ho-canvas-optical');

    if (!slider || !canvasOcxo || !canvasRb || !canvasOptical) return;

    let sizeOcxo = fitCanvas(canvasOcxo);
    let sizeRb = fitCanvas(canvasRb);
    let sizeOptical = fitCanvas(canvasOptical);

    let colors = {};
    function readColors() {
      colors = {
        primary: css('--primary'),
        primarySoft: css('--primary-soft'),
        laser: css('--laser'),
        laserSoft: css('--laser-soft'),
        teal: css('--teal'),
        amber: css('--amber'),
        text: css('--text'),
        muted: css('--text-muted'),
        border: css('--border'),
        borderStrong: css('--border-strong'),
        surface: css('--surface'),
        surface2: css('--surface-2')
      };
    }
    readColors();

    // 5 Clock types for comparison table
    const CLOCKS = [
      {
        id: 'tcxo',
        name: 'Standard Quartz (TCXO)',
        size: '1 cm² PCB chip',
        color: '#94a3b8',
        timeToLimit: 15 * 60, // 15 minutes
        errAt: (t) => 0.0017 * t,
        note: 'Low-cost phone/radio oscillator'
      },
      {
        id: 'ocxo',
        name: 'Ovenized Quartz (OCXO)',
        size: 'Small modular can',
        color: '#f59e0b',
        timeToLimit: 4.5 * 3600, // 4.5 hours
        errAt: (t) => 0.000095 * t,
        note: 'Standard telecom base-station clock'
      },
      {
        id: 'rb',
        name: 'Miniature Rubidium Vapor',
        size: 'Compact box (half-brick)',
        color: '#8b5cf6',
        timeToLimit: 7.5 * 86400, // 7.5 days
        errAt: (t) => 2.3e-6 * t,
        note: 'High-end telecom PRTC backup'
      },
      {
        id: 'cs',
        name: 'Caesium Beam Tube (Microwave)',
        size: '3U rack chassis',
        color: '#06b6d4',
        timeToLimit: 60 * 86400, // ~60 days
        errAt: (t) => 2.9e-7 * t,
        note: 'National metrology lab & master hub'
      },
      {
        id: 'optical',
        name: 'Portable Optical Atomic Clock',
        size: '3U rack unit (deployable)',
        color: '#ef4f5a',
        timeToLimit: 1500 * 86400, // ~4.1 years
        errAt: (t) => 1.15e-8 * t,
        note: 'Next-gen quantum optical standard (Infleqtion/Vector)',
        optical: true
      }
    ];

    // Log-mapped slider from 300s (5 min) to 63,072,000s (2 years)
    const MIN_T = 300;
    const MAX_T = 63072000;
    const sliderToT = (v) => MIN_T * Math.pow(MAX_T / MIN_T, v / 1000);
    const tToSlider = (t) => Math.max(0, Math.min(1000, (Math.log(t / MIN_T) / Math.log(MAX_T / MIN_T)) * 1000));

    // Shared drift multipliers and adjacency pairs (matches Lab 6)
    const DRIFT_SIGNS = [0.2, 1.1, -0.9, 1.4, -1.2, 0.8, -1.3];
    const ADJACENCY = [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
      [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1]
    ];

    // Mobile user phone dots for each sub-canvas
    function makePhones(count) {
      return Array.from({ length: count }, () => ({
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8
      }));
    }
    const phonesOcxo = makePhones(14);
    const phonesRb = makePhones(14);
    const phonesOptical = makePhones(14);

    function computeDriftData(baseRate, tSec) {
      const offsets = DRIFT_SIGNS.map((s) => s * baseRate * tSec);
      const badPairs = [];
      const badTowers = new Set();
      let maxDiff = 0;

      ADJACENCY.forEach(([a, b]) => {
        const diff = Math.abs(offsets[a] - offsets[b]);
        if (diff > maxDiff) maxDiff = diff;
        if (diff > CELL_BUDGET_US) {
          badPairs.push([a, b, diff]);
          badTowers.add(a);
          badTowers.add(b);
        }
      });
      return { offsets, badPairs, badTowers, maxDiff };
    }

    function renderMiniNetwork(canvasInfo, offsets, pairs, badTowers, phones, now, isOptical) {
      const { ctx, w, h } = canvasInfo;
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.48;
      const radius = Math.min(w, h) * 0.32;
      const cellHexR = radius * 0.58;

      const towers = [{ x: cx, y: cy, label: 'T1' }];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        towers.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          label: `T${i + 2}`
        });
      }

      // Draw hexagons
      towers.forEach((tow, i) => {
        const isBad = badTowers.has(i);
        const hasWarning = Math.abs(offsets[i]) > LIMIT_US && !isBad;
        let fill = colors.surface2;
        let stroke = colors.border;
        if (isBad) {
          fill = colors.laserSoft;
          stroke = colors.laser;
        } else if (hasWarning) {
          stroke = colors.amber;
        }

        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const a = (j * Math.PI) / 3;
          const x = tow.x + cellHexR * Math.cos(a);
          const y = tow.y + cellHexR * Math.sin(a);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = isBad ? 2 : 1;
        ctx.stroke();
      });

      // Draw collision lightning arcs
      pairs.forEach(([a, b]) => {
        const ta = towers[a];
        const tb = towers[b];
        ctx.save();
        ctx.strokeStyle = colors.laser;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = colors.laser;
        ctx.shadowBlur = 6;

        const midX = (ta.x + tb.x) / 2;
        const midY = (ta.y + tb.y) / 2;
        const perpX = -(tb.y - ta.y) * 0.12;
        const perpY = (tb.x - ta.x) * 0.12;
        const jitter = Math.sin(now * 0.02) * 6;

        ctx.beginPath();
        ctx.moveTo(ta.x, ta.y);
        ctx.lineTo(midX + perpX + jitter, midY + perpY);
        ctx.lineTo(tb.x, tb.y);
        ctx.stroke();

        ctx.fillStyle = colors.laser;
        ctx.beginPath();
        ctx.arc(midX, midY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', midX, midY);
        ctx.restore();
      });

      // Phones
      phones.forEach((p) => {
        if (p.x === 0 && p.y === 0) {
          p.x = cx + (Math.random() - 0.5) * radius * 1.4;
          p.y = cy + (Math.random() - 0.5) * radius * 1.4;
        }
        p.x += p.vx * 0.03;
        p.y += p.vy * 0.03;
        if (Math.hypot(p.x - cx, p.y - cy) > radius * 1.35) {
          p.vx *= -1;
          p.vy *= -1;
        }
        // Check nearest tower
        let nearDist = 999999;
        let nearIdx = 0;
        towers.forEach((tow, ti) => {
          const d = Math.hypot(p.x - tow.x, p.y - tow.y);
          if (d < nearDist) { nearDist = d; nearIdx = ti; }
        });
        const isUserBad = badTowers.has(nearIdx);
        ctx.fillStyle = isUserBad ? colors.laser : colors.teal;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isUserBad ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Towers
      towers.forEach((tow, i) => {
        const tSec = now / 1000;
        const phaseShift = (offsets[i] / 5.0) * Math.PI;
        const cycle = Math.sin(tSec * 3.5 + phaseShift);
        const isTx = cycle > 0;
        const isBad = badTowers.has(i);

        ctx.save();
        ctx.beginPath();
        ctx.arc(tow.x, tow.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = isBad ? colors.laser : (isTx ? colors.primary : colors.teal);
        ctx.globalAlpha = 0.16;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Mast
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tow.x, tow.y - 10);
        ctx.lineTo(tow.x - 5, tow.y + 9);
        ctx.lineTo(tow.x + 5, tow.y + 9);
        ctx.closePath();
        ctx.stroke();

        // Beacon
        ctx.fillStyle = isBad ? colors.laser : (isTx ? colors.primary : colors.teal);
        ctx.beginPath();
        ctx.arc(tow.x, tow.y - 11, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Drift pill
        const off = offsets[i];
        ctx.font = '500 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = isBad ? colors.laser : (Math.abs(off) > LIMIT_US ? colors.amber : colors.muted);
        const offStr = `${off >= 0 ? '+' : ''}${fmtTimeOffset(Math.abs(off))}`;
        ctx.fillText(offStr, tow.x, tow.y + 20);

        ctx.restore();
      });
    }

    // Animation loop & state
    let currOutageSec = sliderToT(Number(slider.value));

    function stepHoldover(now) {
      // 1. Compute for OCXO
      const ocxoData = computeDriftData(1.4e-4, currOutageSec);
      renderMiniNetwork(sizeOcxo, ocxoData.offsets, ocxoData.badPairs, ocxoData.badTowers, phonesOcxo, now, false);

      // 2. Compute for Rubidium
      const rbData = computeDriftData(2.5e-6, currOutageSec);
      renderMiniNetwork(sizeRb, rbData.offsets, rbData.badPairs, rbData.badTowers, phonesRb, now, false);

      // 3. Compute for Optical
      const opticalData = computeDriftData(1.15e-8, currOutageSec);
      renderMiniNetwork(sizeOptical, opticalData.offsets, opticalData.badPairs, opticalData.badTowers, phonesOptical, now, true);

      requestAnimationFrame(stepHoldover);
    }

    function updateCardStats(cardPrefix, data) {
      const statusEl = $(`#ho-status-${cardPrefix}`);
      const errEl = $(`#ho-err-${cardPrefix}`);
      const badEl = $(`#ho-bad-${cardPrefix}`);
      const marginEl = $(`#ho-margin-${cardPrefix}`);

      const badCount = data.badTowers.size;
      const maxDiff = data.maxDiff;
      const budgetLeft = Math.max(0, CELL_BUDGET_US - maxDiff);

      if (statusEl) {
        if (badCount === 0) {
          statusEl.className = 'status-pill ok';
          statusEl.textContent = 'In step · Safe';
        } else if (badCount <= 3) {
          statusEl.className = 'status-pill warn';
          statusEl.textContent = `Degraded (${badCount} sectors)`;
        } else {
          statusEl.className = 'status-pill bad';
          statusEl.textContent = `Collision (${badCount}/7 towers)`;
        }
      }

      if (errEl) {
        errEl.textContent = fmtTimeOffset(maxDiff);
        errEl.className = maxDiff > CELL_BUDGET_US ? 'ho-stat-val bad' : (maxDiff > LIMIT_US ? 'ho-stat-val warn' : 'ho-stat-val ok');
      }
      if (badEl) {
        badEl.textContent = `${badCount} / 7`;
        badEl.className = badCount > 0 ? 'ho-stat-val bad' : 'ho-stat-val ok';
      }
      if (marginEl) {
        marginEl.textContent = fmtTimeOffset(budgetLeft);
        marginEl.className = budgetLeft === 0 ? 'ho-stat-val bad' : 'ho-stat-val ok';
      }
    }

    function update() {
      const v = Number(slider.value);
      currOutageSec = sliderToT(v);
      out.textContent = fmtDuration(currOutageSec);
      setRangeFill(slider);

      const ocxoData = computeDriftData(1.4e-4, currOutageSec);
      const rbData = computeDriftData(2.5e-6, currOutageSec);
      const opticalData = computeDriftData(1.15e-8, currOutageSec);

      updateCardStats('ocxo', ocxoData);
      updateCardStats('rb', rbData);
      updateCardStats('optical', opticalData);

      // Populate comparison table
      if (tableBody) {
        tableBody.innerHTML = CLOCKS.map((clk) => {
          const err = clk.errAt(currOutageSec);
          const passed = err <= LIMIT_US;
          const errStr = fmtTimeOffset(err);
          const limitStr = fmtDuration(clk.timeToLimit);

          return `
            <tr class="${clk.optical ? 'is-optical' : ''}">
              <td>
                <span class="ho-swatch" style="background:${clk.color}"></span>
                <strong>${clk.name}</strong>
                <small>${clk.note}</small>
              </td>
              <td>${clk.size}</td>
              <td class="num">${errStr}</td>
              <td class="num">${limitStr}</td>
              <td>
                <span class="pill ${passed ? 'yes' : 'bad'}">
                  ${passed ? '✓ Within spec' : '✗ Out of sync'}
                </span>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    slider.addEventListener('input', () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      update();
    });

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
        chip.setAttribute('aria-pressed', 'true');
        const outageSec = Number(chip.dataset.outage);
        slider.value = tToSlider(outageSec);
        update();
      });
    });

    document.addEventListener('themechange', () => {
      readColors();
    });

    function handleResize() {
      sizeOcxo = fitCanvas(canvasOcxo);
      sizeRb = fitCanvas(canvasRb);
      sizeOptical = fitCanvas(canvasOptical);
    }

    new ResizeObserver(handleResize).observe(canvasOcxo);
    new ResizeObserver(handleResize).observe(canvasRb);
    new ResizeObserver(handleResize).observe(canvasOptical);

    update();
    requestAnimationFrame(stepHoldover);
  })();
})();
