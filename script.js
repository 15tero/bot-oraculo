/* ==========================================================
   RAP EXQUISITE — script.js  (JavaScript vanilla, sin dependencias)
   1. Configuración y datos   4. Audio
   2. Utilidades              5. Mezcla (tragamonedas)
   3. Precarga de imágenes    6. Arranque
   ========================================================== */
(() => {
  'use strict';

  /* ---------- 1. CONFIGURACIÓN Y DATOS ---------- */
  const CONFIG = {
    stops: [1500, 2400, 3300],      // ms en que se detiene cada franja
    stopsReduced: [200, 350, 500],  // idem con prefers-reduced-motion
    flickerMs: 70,                  // velocidad del cambio de foto mientras gira
    scratchAt: [0, 700, 1500, 2300, 2900], // momentos del scratch durante la mezcla
    perfectMaxMs: 0,                // 0 = audio completo; p. ej. 15000 lo corta a 15 s
    loadTimeoutMs: 10000,           // espera máxima por imagen antes de dar la carga por buena
    // Efectos cortos OPCIONALES. Si faltan, se sintetizan con Web Audio.
    sfx: { scratch: 'assets/audio/sfx-scratch.mp3', stop: 'assets/audio/sfx-stop.mp3' }
  };

  // Rutas RELATIVAS (sin "/" inicial) para que funcionen en GitHub Pages de proyecto.
  // Para usar .webp o .png, cambia la extensión aquí.
  const R = (id, name, color) => ({
    id, name, color,
    image: `assets/images/${id}.jpg`,
    audio: `assets/audio/${id}.mp3`
  });
  const RAPPERS = [
    R('2pac', '2Pac', '#ffe14a'),
    R('biggie', 'The Notorious B.I.G.', '#19b5d9'),
    R('snoop', 'Snoop Dogg', '#e8262b'),
    R('eminem', 'Eminem', '#8bd450'),
    R('kendrick', 'Kendrick Lamar', '#ff8a3d'),
    R('50cent', '50 Cent', '#c78bff'),
    R('nas', 'Nas', '#ff7aa8'),
    R('icecube', 'Ice Cube', '#3ddcb0'),
    R('tyler', 'Tyler, the Creator', '#9ab0ff'),
    R('mfdoom', 'MF DOOM', '#e6e6df')
  ];
  const N = RAPPERS.length;

  /* ---------- 2. UTILIDADES ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const prefersReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Entero uniforme en [0, n) sin sesgo (rechazo + crypto). Es lo que mantiene el 1 % real.
  function randomInt(n) {
    if (window.crypto && crypto.getRandomValues) {
      const max = Math.floor(0x100000000 / n) * n, buf = new Uint32Array(1);
      let x;
      do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= max);
      return x % n;
    }
    return Math.floor(Math.random() * n);
  }

  // Marcador temporal (SVG en data URI, sin recursos externos). Muestra el nombre y la ruta esperada.
  function placeholder(r) {
    const fs = Math.min(64, 280 / (r.name.length * 0.5));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900">
<rect width="600" height="900" fill="${r.color}"/>
<g fill="#000"><circle cx="300" cy="150" r="82"/><path d="M150 330Q150 255 235 250H365Q450 255 450 330V600H150Z"/><rect x="165" y="600" width="120" height="270"/><rect x="315" y="600" width="120" height="270"/></g>
<text x="300" y="440" font-family="Impact,sans-serif" font-size="${fs}" text-anchor="middle" fill="${r.color}">${r.name}</text>
<path d="M0 300H600M0 600H600" stroke="#fff" stroke-width="4" stroke-dasharray="14 10"/>
<rect x="40" y="700" width="520" height="110" fill="#fff"/>
<text x="300" y="745" font-family="monospace" font-size="30" font-weight="700" text-anchor="middle">FOTO PENDIENTE</text>
<text x="300" y="785" font-family="monospace" font-size="24" text-anchor="middle">${r.image}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------- 3. PRECARGA DE IMÁGENES ---------- */
  // Si una imagen falla, se usa el marcador y se avisa por consola. Nunca se rompe la página.
  const loadImage = (r) => new Promise((done) => {
    const img = new Image();
    let ended = false;
    const end = (ok) => {
      if (ended) return;
      ended = true;
      r.src = ok ? r.image : placeholder(r);
      r.noImage = !ok;
      if (!ok) console.warn(`[Rap Exquisite] Falta la imagen ${r.image}; se usa un marcador.`);
      r.img = img; // mantener la referencia evita que el navegador la descarte de caché
      done();
    };
    img.onload = () => end(true);
    img.onerror = () => end(false);
    setTimeout(() => end(true), CONFIG.loadTimeoutMs);
    img.src = r.image;
  });

  /* ---------- 4. AUDIO ---------- */
  const Sound = (() => {
    let muted = false, ctx = null, capTimer = 0;
    const live = new Set(), bad = new Set();

    const ac = () => {
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
      } catch (e) { /* sin Web Audio: silencio */ }
      return ctx;
    };

    // Efectos de reserva sintetizados (originales, sin derechos de autor)
    function synth(kind, i = 0) {
      const c = ac(); if (!c) return;
      const t = c.currentTime, g = c.createGain();
      g.connect(c.destination);
      if (kind === 'scratch') {
        const d = 0.22, buf = c.createBuffer(1, c.sampleRate * d, c.sampleRate), x = buf.getChannelData(0);
        for (let k = 0; k < x.length; k++) x[k] = (Math.random() * 2 - 1) * (1 - k / x.length);
        const s = c.createBufferSource(), f = c.createBiquadFilter();
        s.buffer = buf; f.type = 'bandpass'; f.Q.value = 6;
        f.frequency.setValueAtTime(400, t);
        f.frequency.exponentialRampToValueAtTime(3500, t + d / 2);
        f.frequency.exponentialRampToValueAtTime(600, t + d);
        g.gain.value = 0.5; s.connect(f).connect(g); s.start(t);
      } else { // bombo
        const o = c.createOscillator();
        o.frequency.setValueAtTime(170 - i * 30, t);
        o.frequency.exponentialRampToValueAtTime(45, t + 0.2);
        g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.connect(g); o.start(t); o.stop(t + 0.3);
      }
    }

    function sfx(name, i) {
      if (muted) return;
      if (bad.has(name)) return synth(name, i);
      const a = new Audio(CONFIG.sfx[name]);
      a.volume = 0.8; live.add(a);
      a.onended = () => live.delete(a);
      a.onerror = () => { bad.add(name); live.delete(a); synth(name, i); };
      a.play().catch(() => {});
    }

    function prepare() {
      Object.keys(CONFIG.sfx).forEach((n) => {          // detecta efectos ausentes
        const a = new Audio(); a.preload = 'metadata';
        a.onerror = () => bad.add(n); a.src = CONFIG.sfx[n];
      });
      RAPPERS.forEach((r) => {                           // un <audio> por rapero
        const a = new Audio(); a.preload = 'metadata';
        a.onerror = () => { r.noAudio = true; console.warn(`[Rap Exquisite] Falta el audio ${r.audio}.`); };
        a.src = r.audio; r.audioEl = a;
      });
    }

    // iOS/Safari solo permite sonar a un <audio> "desbloqueado" por un gesto. Como el resultado
    // se decide al pulsar, desbloqueamos desde el clic el audio del PERFECT MATCH (en silencio).
    function prime(r) {
      const a = r.audioEl;
      if (muted || !a || r.noAudio) return;
      a.muted = true;
      const p = a.play();
      if (p && p.then) p.then(() => { if (a.muted) { a.pause(); a.currentTime = 0; a.muted = false; } }).catch(() => { a.muted = false; });
    }

    function play(r) {                                   // devuelve false si no pudo sonar
      const a = r.audioEl;
      if (muted || !a || r.noAudio) return false;
      a.muted = false; a.currentTime = 0; a.volume = 1;
      a.play().catch(() => {});
      if (CONFIG.perfectMaxMs) capTimer = setTimeout(() => a.pause(), CONFIG.perfectMaxMs);
      return true;
    }

    function stopAll() {                                 // evita solapes con intentos anteriores
      clearTimeout(capTimer);
      live.forEach((a) => a.pause()); live.clear();
      RAPPERS.forEach((r) => {
        const a = r.audioEl; if (!a) return;
        a.pause(); a.muted = false;
        try { a.currentTime = 0; } catch (e) { /* aún sin metadatos */ }
      });
    }

    return {
      prepare, prime, play, stopAll, unlock: ac,
      scratch: () => sfx('scratch'),
      hit: (i) => sfx('stop', i),
      isMuted: () => muted,
      toggle() { muted = !muted; if (muted) stopAll(); return muted; }
    };
  })();

  /* ---------- 5. MEZCLA (TRAGAMONEDAS) ---------- */
  const el = {
    figure: $('#figure'), wrap: $('#wrap'), stamp: $('#stamp'), stampName: $('#stampName'),
    btn: $('#mix'), title: $('#tagTitle'), note: $('#tagNote'), stats: $('#stats'), sound: $('#soundBtn'),
    parts: [$('#pHead'), $('#pTorso'), $('#pLegs')]
  };
  const strips = [...document.querySelectorAll('.strip')].map((s) => ({ el: s, reel: $('.reel', s), shown: -1, timer: 0 }));
  const st = { ready: false, busy: false, tries: 0, perfects: 0, timers: [] };
  const later = (fn, ms) => st.timers.push(setTimeout(fn, ms));

  function show(i, k) {
    strips[i].reel.style.backgroundImage = `url("${RAPPERS[k].src}")`;
    strips[i].shown = k;
  }

  function describe(idx) {
    const [a, b, c] = idx.map((k) => RAPPERS[k].name);
    el.parts.forEach((p, i) => { p.textContent = RAPPERS[idx[i]].name; });
    el.figure.setAttribute('aria-label', `Figura: cabeza de ${a}, torso de ${b}, piernas de ${c}`);
  }

  function setBusy(b) {
    st.busy = b;
    el.btn.disabled = b || !st.ready;
    el.btn.setAttribute('aria-busy', String(b));
    document.body.classList.toggle('is-mixing', b);
  }

  function flicker(i) { // solo cosmético: NO decide el resultado
    let k;
    do { k = Math.floor(Math.random() * N); } while (k === strips[i].shown);
    show(i, k);
  }

  function land(i, k) {
    clearInterval(strips[i].timer);
    show(i, k);
    strips[i].el.classList.replace('is-spinning', 'is-landed');
    Sound.hit(i);
  }

  function mix() {
    if (st.busy || !st.ready) return;
    setBusy(true);
    Sound.unlock(); Sound.stopAll();
    st.timers.forEach(clearTimeout); st.timers = [];
    el.stamp.classList.remove('is-on'); el.wrap.classList.remove('is-perfect');
    el.note.hidden = true; el.title.textContent = 'Mezclando…';

    // Tres sorteos independientes y uniformes. No hay ningún ajuste de probabilidad.
    const result = [randomInt(N), randomInt(N), randomInt(N)];
    const perfect = result[0] === result[1] && result[1] === result[2];
    if (perfect) Sound.prime(RAPPERS[result[0]]);

    const reduced = prefersReduced();
    const stops = reduced ? CONFIG.stopsReduced : CONFIG.stops;
    strips.forEach((s, i) => {
      s.el.classList.remove('is-landed');
      if (!reduced) {
        s.el.classList.add('is-spinning');
        s.timer = setInterval(() => flicker(i), CONFIG.flickerMs + i * 8);
      }
      later(() => land(i, result[i]), stops[i]);
    });
    CONFIG.scratchAt.filter((t) => t < stops[2]).forEach((t) => later(() => Sound.scratch(), t));
    later(() => finish(result, perfect), stops[2] + 350);
  }

  function finish(result, perfect) {
    st.tries++;
    describe(result);
    if (perfect) {
      st.perfects++;
      const r = RAPPERS[result[0]];
      el.title.textContent = `PERFECT MATCH: ${r.name}`;
      el.stampName.textContent = r.name;
      void el.stamp.offsetWidth;                 // reinicia la animación
      el.stamp.classList.add('is-on'); el.wrap.classList.add('is-perfect');
      if (!Sound.play(r) && !Sound.isMuted()) {
        el.note.textContent = `Falta el audio ${r.audio}. Añádelo para oír la recompensa.`;
        el.note.hidden = false;
      }
    } else {
      el.title.textContent = 'Criatura híbrida';  // se mantiene visible, sin sonido de recompensa
    }
    el.stats.textContent = `Mezclas: ${st.tries}. Perfect match: ${st.perfects}.`;
    setBusy(false);
    el.btn.focus({ preventScroll: true });
  }

  /* ---------- 6. ARRANQUE ---------- */
  Sound.prepare();
  el.btn.addEventListener('click', mix);
  el.sound.addEventListener('click', () => {
    el.sound.textContent = Sound.toggle() ? 'Sonido: no' : 'Sonido: sí';
  });

  Promise.all(RAPPERS.map(loadImage)).then(() => {
    // Figura inicial híbrida (no cuenta como intento)
    let init;
    do { init = [0, 1, 2].map(() => Math.floor(Math.random() * N)); }
    while (init[0] === init[1] && init[1] === init[2]);
    init.forEach((k, i) => show(i, k));
    describe(init);
    el.title.textContent = 'Aún sin mezclar';
    const missing = RAPPERS.filter((r) => r.noImage).length;
    if (missing) {
      el.note.textContent = `Modo montaje: faltan ${missing} de ${N} fotos y se usan marcadores.`;
      el.note.hidden = false;
    }
    st.ready = true;
    setBusy(false);
  });
})();
