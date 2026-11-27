'use strict';
(() => {
  const canvas = document.createElement('canvas');
  canvas.className = 'ambient-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canStroke = typeof ctx.stroke === 'function';
  const palette = [
    { stroke: '#b35e41', fill: '#d9a48a' }, // Claude terracotta
    { stroke: '#8c7456', fill: '#cbb591' }, // Warm sand
    { stroke: '#6f8262', fill: '#b1bfa5' }, // Sage
    { stroke: '#a87d52', fill: '#d2b48c' }  // Ochre
  ];
  let width = 0, height = 0, motifs = [], frame = 0, last = 0;
  let pointerX = -9999, pointerY = -9999;

  function buildConstellation() {
    const count = width < 640 ? 12 : width < 1100 ? 18 : 22;
    const cols = width < 640 ? 3 : 6;
    const rows = Math.ceil(count / cols);
    motifs = Array.from({ length: count }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      // Alternate between subtle iOS squircle icon frames, Claude-style 6-ray sparks, and anchor dots
      const kind = i % 3 === 0 ? 'spark' : i % 4 === 1 ? 'dot' : 'squircle';
      return {
        kind,
        nx: (col + 0.2 + Math.random() * 0.6) / cols,
        ny: (row + 0.2 + Math.random() * 0.6) / rows,
        size: kind === 'spark' ? 14 + Math.random() * 10 : kind === 'dot' ? 6 + Math.random() * 4 : 22 + Math.random() * 20,
        tilt: (Math.random() - 0.5) * 0.45,
        spin: (Math.random() - 0.5) * 0.18,
        floatX: 6 + Math.random() * 10,
        floatY: 8 + Math.random() * 12,
        speed: 0.35 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        tone: palette[i % palette.length],
        boost: 0
      };
    });
  }

  function measure() {
    const nextWidth = window.innerWidth, nextHeight = window.innerHeight;
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!motifs.length) buildConstellation();
  }

  function drawSquircle(size, alphaFill, alphaStroke, tone) {
    const half = size / 2;
    const r = size * 0.28;
    ctx.globalAlpha = alphaFill;
    ctx.fillStyle = tone.fill;
    ctx.beginPath();
    ctx.roundRect(-half, -half, size, size, r);
    ctx.fill();
    if (canStroke) {
      ctx.globalAlpha = alphaStroke;
      ctx.strokeStyle = tone.stroke;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  function drawSpark(size, alpha, tone) {
    const thick = Math.max(1.8, size * 0.13);
    ctx.fillStyle = tone.stroke;
    ctx.globalAlpha = alpha;
    for (let k = 0; k < 3; k++) {
      ctx.save();
      ctx.rotate((Math.PI / 3) * k);
      ctx.beginPath();
      ctx.roundRect(-size / 2, -thick / 2, size, thick, thick / 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function draw(time, delta) {
    ctx.clearRect(0, 0, width, height);
    const t = time * 0.001;

    for (let i = 0; i < motifs.length; i++) {
      const m = motifs[i];
      const baseX = m.nx * width;
      const baseY = m.ny * height;

      // Gentle orbital buoyancy + sweeping diagonal light-wave across the paper
      const x = baseX + Math.sin(t * m.speed + m.phase) * m.floatX;
      const y = baseY + Math.cos(t * m.speed * 0.85 + m.phase) * m.floatY;
      const wave = Math.max(0, Math.sin(t * 0.55 - m.nx * 2.6 - m.ny * 1.4));

      const dist = Math.hypot(x - pointerX, y - pointerY);
      const targetBoost = dist < 170 ? Math.pow(1 - dist / 170, 1.4) : 0;
      m.boost += (targetBoost - m.boost) * Math.min(1, delta * 6);

      // Keep center reading lane calm so SVG icons & text stay razor-sharp
      const edgeWeight = 0.55 + 0.45 * Math.min(1, Math.abs(m.nx - 0.5) * 2.1);
      const scale = 1 + 0.08 * wave + 0.24 * m.boost;
      const angle = m.tilt + Math.sin(t * 0.4 + m.phase) * 0.14 + t * m.spin * (m.kind === 'spark' ? 0.6 : 0.15) + m.boost * 0.35;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      if (m.kind === 'squircle') {
        const fillAlpha = (0.07 + 0.06 * wave + 0.14 * m.boost) * edgeWeight;
        const strokeAlpha = (0.14 + 0.10 * wave + 0.24 * m.boost) * edgeWeight;
        drawSquircle(m.size * scale, fillAlpha, strokeAlpha, m.tone);
      } else if (m.kind === 'spark') {
        const sparkAlpha = (0.13 + 0.11 * wave + 0.26 * m.boost) * edgeWeight;
        drawSpark(m.size * scale, sparkAlpha, m.tone);
      } else {
        const r = m.size * scale;
        ctx.globalAlpha = (0.15 + 0.12 * wave + 0.25 * m.boost) * edgeWeight;
        ctx.fillStyle = m.tone.stroke;
        ctx.beginPath();
        ctx.roundRect(-r / 2, -r / 2, r, r, r / 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function tick(time) {
    frame = 0;
    if (document.hidden || motion.matches) return;
    draw(time, last ? Math.min((time - last) / 1000, 0.05) : 0);
    last = time;
    frame = requestAnimationFrame(tick);
  }

  function resume() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    if (motion.matches) {
      draw(0, 0);
      return;
    }
    if (!document.hidden) frame = requestAnimationFrame(tick);
  }

  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      measure();
      draw(0, 0);
    });
  }, { passive: true });
  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') {
      pointerX = event.clientX;
      pointerY = event.clientY;
    }
  }, { passive: true });
  window.addEventListener('pointerleave', () => {
    pointerX = -9999;
    pointerY = -9999;
  }, { passive: true });
  document.addEventListener('visibilitychange', resume);
  motion.addEventListener('change', resume);
  measure();
  draw(0, 0);
  resume();
})();
