/* ==========================================================================
   The Science of Now — interactions
   Shared by every page; each module exits early if its markup is absent.
   ========================================================================== */
(() => {
  'use strict';

  const SR_HZ = 429228004229873n;           // Strontium-87 clock transition (Hz)
  const C = 299792458;                       // speed of light (m/s)
  const G = 9.80665;                         // standard gravity (m/s^2)
  const YEAR_S = 365.25 * 86400;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* ---------- Shared helpers ---------- */
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function sci(x, digits = 1) {
    if (x === 0) return '0';
    const exp = Math.floor(Math.log10(x));
    const mant = x / 10 ** exp;
    const sup = String(exp).split('').map((ch) => SUP[ch]).join('');
    return `${mant.toFixed(digits)} × 10${sup}`;
  }

  function fmtNum(n, max = 0) {
    return n.toLocaleString('en-US', { maximumFractionDigits: max });
  }

  function fmtDuration(seconds) {
    const min = 60, hr = 3600, day = 86400;
    if (seconds < hr) return `${fmtNum(seconds / min, 1)} minutes`;
    if (seconds < 2 * day) return `${fmtNum(seconds / hr, 1)} hours`;
    if (seconds < YEAR_S) return `${fmtNum(seconds / day)} days`;
    const yrs = seconds / YEAR_S;
    if (yrs < 1000) return `${fmtNum(yrs)} year${yrs >= 1.5 ? 's' : ''}`;
    if (yrs < 1e6) return `${fmtNum(yrs / 1e3)} thousand years`;
    if (yrs < 1e9) return `${fmtNum(yrs / 1e6)} million years`;
    return `${fmtNum(yrs / 1e9)} billion years`;
  }

  function fmtTime(seconds) {
    if (seconds < 1e-6) return `${fmtNum(seconds * 1e9, seconds < 1e-8 ? 2 : 0)} ns`;
    if (seconds < 1e-3) return `${fmtNum(seconds * 1e6, 1)} µs`;
    if (seconds < 1) return `${fmtNum(seconds * 1e3, 1)} ms`;
    return `${fmtNum(seconds, 2)} s`;
  }

  function fmtDistance(m) {
    if (m < 1) return `${fmtNum(m * 100)} cm`;
    if (m < 1000) return `${fmtNum(m, m < 10 ? 1 : 0)} m`;
    return `${fmtNum(m / 1000, m < 10000 ? 1 : 0)} km`;
  }

  function setRangeFill(input) {
    const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--fill', `${pct}%`);
  }

  /** Size a canvas for crisp rendering; returns 2D context scaled to CSS pixels. */
  function fitCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: width, h: height };
  }

  /** Run a callback per frame only while an element is on screen. */
  function animateWhileVisible(el, frame) {
    let raf = 0;
    let running = false;
    const loop = (t) => { frame(t); raf = requestAnimationFrame(loop); };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running && !reduceMotion.matches) {
        running = true; raf = requestAnimationFrame(loop);
      } else if (!entry.isIntersecting && running) {
        running = false; cancelAnimationFrame(raf);
      }
    });
    io.observe(el);
    frame(0); // initial static render
  }

  /* ---------- Theme toggle ---------- */
  const themeListeners = [];
  $('#theme-toggle').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.getAttribute('data-theme') !== 'dark';
    if (dark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    themeListeners.forEach((fn) => fn());
    // Let page-specific scripts (e.g. sync.js) redraw with the new palette.
    document.dispatchEvent(new CustomEvent('themechange'));
  });

  /* ---------- Header state + active nav ---------- */
  const header = $('#site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Fallback progress bar for browsers without scroll-driven animations.
  if (!CSS.supports('animation-timeline: scroll()')) {
    const bar = $('.progress');
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // The current page is marked in the nav with aria-current="page" in each HTML file.

  /* ---------- Reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => revealObserver.observe(el));

  /* ---------- Hero: tick counter ---------- */
  (() => {
    const out = $('#tick-counter');
    if (!out) return;
    const start = performance.now();
    let last = 0;
    const update = (now) => {
      const interval = reduceMotion.matches ? 1000 : 50;
      if (now - last >= interval) {
        last = now;
        const micros = BigInt(Math.floor((now - start) * 1000));
        out.textContent = ((micros * SR_HZ) / 1000000n).toLocaleString('en-US');
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  })();

  /* ---------- Lab 1: GPS error ---------- */
  (() => {
    const slider = $('#gps-slider');
    if (!slider) return;
    const errOut = $('#gps-error-out');
    const distOut = $('#gps-dist');
    const cmpOut = $('#gps-compare');
    const ring = $('#gps-ring');
    const scale = $('#gps-scale');

    const comparisons = [
      [0.5, 'a school ruler'],
      [2.5, 'a person\'s height'],
      [12, 'the wrong lane'],
      [120, 'the wrong street'],
      [1200, 'a few city blocks'],
      [12000, 'across a town'],
      [120000, 'a different city'],
      [Infinity, 'another region entirely'],
    ];

    const update = () => {
      const v = Number(slider.value);
      const seconds = 10 ** (-9 + (v / 100) * 6); // 1 ns → 1 ms
      const metres = seconds * C;
      errOut.textContent = fmtTime(seconds);
      distOut.textContent = fmtDistance(metres);
      cmpOut.textContent = comparisons.find(([lim]) => metres < lim)[1];
      const d = 24 + (v / 100) * 150;
      ring.style.width = ring.style.height = `${d}px`;
      scale.textContent = `error radius: ${fmtDistance(metres)}`;
      setRangeFill(slider);
    };
    slider.addEventListener('input', update);
    update();
  })();

  /* ---------- Oscillator comparison ---------- */
  (() => {
    const list = $('#osc-list');
    if (!list) return;
    const rows = $$('.osc-row', list);
    let colors = {};
    const readColors = () => {
      colors = { primary: css('--primary'), laser: css('--laser'), grid: css('--border') };
    };
    readColors();
    themeListeners.push(readColors);

    const items = rows.map((row) => ({
      row,
      canvas: $('canvas', row),
      cycles: Number(row.dataset.cycles),
      optical: row.dataset.tone === 'optical',
      size: null,
    }));

    const resize = () => items.forEach((it) => { it.size = fitCanvas(it.canvas); });
    resize();
    new ResizeObserver(resize).observe(list);

    animateWhileVisible(list, (t) => {
      items.forEach((it) => {
        const { ctx, w, h } = it.size;
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

        const phase = (t / 1000) * 1.2;
        ctx.strokeStyle = it.optical ? colors.laser : colors.primary;
        ctx.lineWidth = it.cycles > 20 ? 1.4 : 2.2;
        ctx.beginPath();
        const amp = h * 0.36;
        for (let x = 0; x <= w; x += 1) {
          const y = h / 2 - amp * Math.sin((x / w) * it.cycles * Math.PI * 2 - phase * Math.PI * 2);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
    });
  })();

  /* ---------- Lab 2: resonance tuner ---------- */
  (() => {
    const canvas = $('#resonance-canvas');
    if (!canvas) return;
    const slider = $('#detune-slider');
    const out = $('#detune-out');
    const excitedOut = $('#excited-out');
    const freqOut = $('#laser-freq-out');
    const status = $('#lock-status');
    const autoBtn = $('#auto-lock-btn');

    const RABI = 4;        // Hz — sets resonance width
    const RANGE = 60;      // ±Hz shown
    const N_ATOMS = 36;
    let thresholds = Array.from({ length: N_ATOMS }, Math.random);
    let size = fitCanvas(canvas);
    let colors = {};
    let autoTimer = 0;

    const readColors = () => {
      colors = {
        primary: css('--primary'), laser: css('--laser'), grid: css('--border'),
        muted: css('--text-muted'), surface: css('--surface'), teal: css('--teal'),
      };
    };
    readColors();

    // Rabi lineshape for a π-pulse: realistic central peak with small side lobes.
    const excitation = (d) => {
      const r = 1 + (d / RABI) ** 2;
      return Math.sin((Math.PI / 2) * Math.sqrt(r)) ** 2 / r;
    };

    const draw = () => {
      const { ctx, w, h } = size;
      const d = Number(slider.value);
      const p = excitation(d);
      const padX = 16, top = 46, plotBottom = h - 58;
      const plotH = plotBottom - top;
      const xOf = (det) => padX + ((det + RANGE) / (2 * RANGE)) * (w - padX * 2);
      const yOf = (prob) => plotBottom - prob * plotH;

      ctx.clearRect(0, 0, w, h);

      // baseline
      ctx.strokeStyle = colors.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padX, plotBottom); ctx.lineTo(w - padX, plotBottom); ctx.stroke();

      // curve fill + stroke
      ctx.beginPath();
      ctx.moveTo(xOf(-RANGE), plotBottom);
      for (let det = -RANGE; det <= RANGE; det += 0.25) ctx.lineTo(xOf(det), yOf(excitation(det)));
      ctx.lineTo(xOf(RANGE), plotBottom);
      ctx.closePath();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = colors.primary; ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      for (let det = -RANGE; det <= RANGE; det += 0.25) {
        const x = xOf(det), y = yOf(excitation(det));
        det === -RANGE ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = colors.primary; ctx.lineWidth = 2.2; ctx.stroke();

      // laser marker
      const lx = xOf(d);
      ctx.strokeStyle = colors.laser; ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(lx, top - 10); ctx.lineTo(lx, plotBottom); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(lx, yOf(p), 6, 0, Math.PI * 2);
      ctx.fillStyle = colors.laser; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = colors.surface; ctx.stroke();

      // axis labels
      ctx.fillStyle = colors.muted;
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('resonance', xOf(0), plotBottom + 14);
      ctx.textAlign = 'left'; ctx.fillText('lower', padX, plotBottom + 14);
      ctx.textAlign = 'right'; ctx.fillText('higher', w - padX, plotBottom + 14);

      // atoms
      const rowY = h - 22;
      const gap = (w - padX * 2) / N_ATOMS;
      for (let i = 0; i < N_ATOMS; i++) {
        const x = padX + gap * (i + 0.5);
        const excited = thresholds[i] < p;
        ctx.beginPath();
        ctx.arc(x, rowY, Math.min(5, gap * 0.32), 0, Math.PI * 2);
        if (excited) {
          ctx.fillStyle = colors.primary; ctx.fill();
        } else {
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = colors.muted; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    };

    const update = () => {
      const d = Number(slider.value);
      const p = excitation(d);
      out.textContent = `${d > 0 ? '+' : ''}${d.toFixed(1)} Hz`;
      excitedOut.textContent = `${Math.round(p * 100)}%`;
      const f = Number(SR_HZ) + d;
      freqOut.textContent = `${fmtNum(f, 1)} Hz`;
      const locked = p > 0.97;
      status.classList.toggle('locked', locked);
      status.textContent = locked ? 'Locked on resonance' : p > 0.5 ? 'Getting warmer…' : 'Searching…';
      setRangeFill(slider);
      draw();
    };

    slider.addEventListener('input', () => { stopAuto(); update(); });

    // Quantum measurements are probabilistic: re-sample which atoms jump.
    setInterval(() => {
      if (reduceMotion.matches) return;
      thresholds = thresholds.map(Math.random);
      draw();
    }, 900);

    function stopAuto() {
      clearInterval(autoTimer);
      autoTimer = 0;
      autoBtn.textContent = 'Auto-lock';
    }

    // Simulated servo: repeatedly nudges the laser toward the peak, like a real clock's feedback loop.
    autoBtn.addEventListener('click', () => {
      if (autoTimer) { stopAuto(); return; }
      autoBtn.textContent = 'Stop';
      autoTimer = setInterval(() => {
        let d = Number(slider.value);
        d = d * 0.82 + (Math.random() - 0.5) * 0.6;
        if (Math.abs(d) < 0.3) d = 0;
        slider.value = d.toFixed(1);
        update();
        if (d === 0) stopAuto();
      }, 90);
    });

    new ResizeObserver(() => { size = fitCanvas(canvas); draw(); }).observe(canvas);
    themeListeners.push(() => { readColors(); draw(); });
    update();
  })();

  /* ---------- Optical wave + rulers ---------- */
  (() => {
    const path = $('#optical-wave-path');
    if (!path) return;
    const cycles = 40, w = 400, mid = 30, amp = 26;
    let d = `M0 ${mid}`;
    for (let x = 0; x <= w; x += 1) d += ` L${x} ${(mid - amp * Math.sin((x / w) * cycles * Math.PI * 2)).toFixed(2)}`;
    path.setAttribute('d', d);

    const build = (el, count, major) => {
      const frag = document.createDocumentFragment();
      for (let i = 0; i <= count; i++) {
        const t = document.createElement('span');
        t.className = 'tick';
        t.style.left = `${(i / count) * 100}%`;
        t.style.height = i % major === 0 ? '100%' : i % (major / 2) === 0 ? '60%' : '32%';
        frag.appendChild(t);
      }
      el.appendChild(frag);
    };
    build($('#ruler-coarse'), 10, 10);
    build($('#ruler-fine'), 100, 10);
  })();

  /* ---------- Lab 3: precision chart ---------- */
  (() => {
    const data = [
      { name: 'Medieval tower clock', note: 'c. 1300 · ~15 min/day', u: 1e-2 },
      { name: 'Huygens pendulum', note: '1656 · ~15 s/day', u: 1.7e-4 },
      { name: 'Quartz wristwatch', note: 'today · ~15 s/month', u: 5.8e-6 },
      { name: 'Shortt free-pendulum', note: '1921 · best mechanical', u: 3e-8 },
      { name: 'First caesium clock', note: '1955 · NPL, UK', u: 1e-10 },
      { name: 'Caesium fountain', note: '2010s · national standards', u: 1e-16 },
      { name: 'Optical lattice clock', note: '2024 · strontium, JILA', u: 8e-19, optical: true },
    ];
    const chart = $('#precision-chart');
    if (!chart) return;
    const minLog = 1.5, maxLog = 18.4;

    data.forEach((item) => {
      const secs = 1 / item.u;
      const pct = ((Math.log10(secs) - minLog) / (maxLog - minLog)) * 100;
      const row = document.createElement('div');
      row.className = `bar-row${item.optical ? ' is-optical' : ''}`;
      row.innerHTML = `
        <div class="bar-name">${item.name}<small>${item.note}</small></div>
        <div class="bar-track" role="img" aria-label="${item.name}: drifts one second in about ${fmtDuration(secs)}">
          <div class="bar-fill" data-w="${pct.toFixed(1)}%"></div>
          <span class="bar-value">${fmtDuration(secs)}</span>
        </div>`;
      chart.appendChild(row);
    });

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      $$('.bar-fill', chart).forEach((bar, i) => {
        setTimeout(() => { bar.style.width = bar.dataset.w; }, reduceMotion.matches ? 0 : i * 120);
      });
      io.disconnect();
    }, { threshold: 0.3 });
    io.observe(chart);
  })();

  /* ---------- Lab 4: gravity ---------- */
  (() => {
    const lab = $('#gravity-lab');
    if (!lab) return;
    const slider = $('#height-slider');
    const out = $('#height-out');
    const fracOut = $('#g-frac');
    const lifeOut = $('#g-life');
    const detCs = $('#det-cs');
    const detOpt = $('#det-opt');
    const high = $('#g-high');
    const line = $('#g-line');
    const label = $('#g-label');
    const chips = $$('.chips .chip', lab);

    const sliderToH = (v) => 10 ** (-2 + v / 100);
    const hToSlider = (h) => (Math.log10(h) + 2) * 100;

    const setPill = (el, yes) => {
      el.className = `pill ${yes ? 'yes' : 'no'}`;
      el.textContent = yes ? 'Yes' : 'Too small';
    };

    const render = (h) => {
      const frac = (G * h) / (C * C);
      const life = frac * 80 * YEAR_S;
      out.textContent = label.textContent = h < 1000 ? fmtDistance(h) : `${fmtNum(h)} m`;
      fracOut.textContent = sci(frac);
      lifeOut.textContent = fmtTime(life);
      setPill(detCs, frac >= 1e-16);
      setPill(detOpt, frac >= 1e-18);

      const v = hToSlider(h);
      const bottom = 44 + (v / 600) * 160;
      high.style.bottom = `${bottom}px`;
      line.style.height = `${bottom - 36}px`;
      label.style.bottom = `${bottom - 10}px`;
      setRangeFill(slider);
    };

    slider.addEventListener('input', () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      render(sliderToH(Number(slider.value)));
    });

    chips.forEach((chip) => chip.addEventListener('click', () => {
      const h = Number(chip.dataset.h);
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      slider.value = hToSlider(h);
      render(h);
    }));

    render(1);
  })();

  /* ---------- Quiz ---------- */
  (() => {
    const questions = [
      {
        q: 'What sets the "tick" rate of an atomic clock?',
        options: [
          'The size of the atoms used',
          'The exact frequency of light that makes an atom\'s electron jump between two energy levels',
          'The temperature of the laboratory',
          'A very precise quartz crystal inside the atom',
        ],
        a: 1,
        why: 'Atoms only respond to light of a very specific frequency, fixed by nature. Locking a laser (or microwave source) to that frequency gives an extraordinarily stable tick.',
      },
      {
        q: 'Roughly how far does light (and a GPS signal) travel in one nanosecond?',
        options: ['3 millimetres', '30 centimetres', '30 metres', '300 kilometres'],
        a: 1,
        why: 'Light covers about 30 cm per nanosecond. That\'s why a one-nanosecond clock error in GPS turns into roughly 30 cm of position error.',
      },
      {
        q: 'Why are optical clocks more precise than microwave caesium clocks?',
        options: [
          'They use more expensive atoms',
          'Visible light oscillates tens of thousands of times faster, dividing time into much finer ticks',
          'They run at room temperature',
          'They are not affected by gravity',
        ],
        a: 1,
        why: 'Strontium\'s optical transition ticks ~429 trillion times per second versus ~9.2 billion for caesium. Like a ruler with finer markings, more ticks means finer measurement.',
      },
      {
        q: 'Why are the atoms cooled to near absolute zero?',
        options: [
          'To make them glow brighter',
          'To stop them from evaporating',
          'So that their motion doesn\'t smear out or shift the frequency they respond to',
          'Because strontium is only stable when frozen',
        ],
        a: 2,
        why: 'Fast-moving atoms experience Doppler shifts and are hard to hold still. Laser cooling slows them so they can be trapped and measured very precisely.',
      },
      {
        q: 'What job does a frequency comb do in an optical clock?',
        options: [
          'It traps the atoms in place',
          'It cools the atoms',
          'It acts as a "gearbox", converting impossibly fast optical ticks into countable electronic signals',
          'It filters out unwanted colours of light',
        ],
        a: 2,
        why: 'No electronics can directly count 429 trillion cycles per second. The comb links optical frequencies to radio frequencies that electronics can count — work honoured with the 2005 Nobel Prize.',
      },
      {
        q: 'If you lift an optical clock up by one metre, what happens?',
        options: [
          'Nothing measurable',
          'It ticks slightly faster, by about one part in 10¹⁶',
          'It ticks slightly slower',
          'It stops working because the lattice collapses',
        ],
        a: 1,
        why: 'General relativity says time runs faster farther from a mass. The effect is tiny, around 10⁻¹⁶ per metre, but optical clocks can detect height differences of a centimetre.',
      },
      {
        q: 'GPS is jammed near a cluster of 5G towers. What decides how long the network keeps working normally?',
        options: [
          'How tall the towers are',
          'How many phones are connected',
          'How slowly each tower\'s backup ("holdover") clock drifts away from true time',
          'Nothing: 5G towers don\'t need to agree on the time',
        ],
        a: 2,
        why: 'Neighbouring 5G towers must stay within about 3 µs of each other. Quartz backups drift past that in hours; a portable optical clock drifting ~1 ns a day could hold the line for years.',
      },
    ];

    const card = $('#quiz-card');
    if (!card) return;
    let index = 0;
    let score = 0;

    const renderQuestion = () => {
      const item = questions[index];
      card.innerHTML = `
        <div class="quiz-top">
          <div class="quiz-progress" aria-hidden="true"><span style="width:${(index / questions.length) * 100}%"></span></div>
          <span class="quiz-count">${index + 1} / ${questions.length}</span>
        </div>
        <h3 class="quiz-q">${item.q}</h3>
        <div class="quiz-options">
          ${item.options.map((opt, i) => `
            <button class="quiz-opt" type="button" id="quiz-opt-${i}" data-i="${i}">
              <span class="letter">${String.fromCharCode(65 + i)}</span><span>${opt}</span>
            </button>`).join('')}
        </div>
        <div class="quiz-slot"></div>`;

      $$('.quiz-opt', card).forEach((btn) => btn.addEventListener('click', () => choose(Number(btn.dataset.i))));
    };

    const choose = (i) => {
      const item = questions[index];
      const correct = i === item.a;
      if (correct) score++;
      $$('.quiz-opt', card).forEach((btn) => {
        const bi = Number(btn.dataset.i);
        btn.disabled = true;
        if (bi === item.a) btn.classList.add('correct');
        else if (bi === i) btn.classList.add('wrong');
      });
      $('.quiz-progress span', card).style.width = `${((index + 1) / questions.length) * 100}%`;
      const last = index === questions.length - 1;
      $('.quiz-slot', card).innerHTML = `
        <div class="quiz-feedback"><strong>${correct ? 'Correct!' : 'Not quite.'}</strong> ${item.why}</div>
        <div class="quiz-foot">
          <button class="btn btn-primary btn-sm" type="button" id="quiz-next">${last ? 'See results' : 'Next question'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>`;
      const next = $('#quiz-next');
      next.focus({ preventScroll: true });
      next.addEventListener('click', () => {
        index++;
        index < questions.length ? renderQuestion() : renderResult();
      });
    };

    const renderResult = () => {
      const msg = score === questions.length
        ? 'Perfect score. You could explain optical clocks at a dinner party.'
        : score >= questions.length - 2
          ? 'Great work. You\'ve got a solid grasp of precision timing.'
          : 'Good start! Skim back through the chapters and try again.';
      card.innerHTML = `
        <div class="quiz-result">
          <div class="score">${score}/${questions.length}</div>
          <h3>${msg}</h3>
          <p style="color:var(--text-muted)">Every correct answer is a step closer to understanding how we define the second itself.</p>
          <button class="btn btn-primary" type="button" id="quiz-restart">Try again</button>
        </div>`;
      $('#quiz-restart').addEventListener('click', () => { index = 0; score = 0; renderQuestion(); });
    };

    renderQuestion();
  })();
})();
