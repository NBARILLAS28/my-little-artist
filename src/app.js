/* My Little Artist - motor de dibujo y interfaz */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const api = window.api || null;
  const IS_WEB = !api;
  const DEBUG = /[?&]debug/.test(location.search);

  /* =====================================================================
     Utilidades
     ===================================================================== */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('mla.' + k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem('mla.' + k, JSON.stringify(v)); } catch (_) { /* nada */ } }
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const rand = (a, b) => a + Math.random() * (b - a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function hexToRgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) { return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
  function lighten(hex, amt) { const [r, g, b] = hexToRgb(hex); return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt); }
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* =====================================================================
     Idioma
     ===================================================================== */
  let lang = store.get('lang', null) || ((navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es');
  const t = (k) => { const d = window.I18N[lang]; return d && d[k] !== undefined ? d[k] : (window.I18N.es[k] !== undefined ? window.I18N.es[k] : k); };

  /* =====================================================================
     Estado
     ===================================================================== */
  const FONTS = [
    { id: 'comic', label: 'Comic', css: '"Comic Sans MS","Chalkboard SE","Comic Neue",cursive' },
    { id: 'round', label: 'Redonda', css: '"Trebuchet MS","Verdana","Segoe UI",sans-serif' },
    { id: 'heavy', label: 'Gruesa', css: '"Arial Black","Impact","Helvetica Neue",sans-serif' },
    { id: 'hand', label: 'Manuscrita', css: '"Segoe Script","Bradley Hand","Brush Script MT",cursive' },
    { id: 'serif', label: 'Clásica', css: 'Georgia,"Times New Roman",serif' },
    { id: 'mono', label: 'Máquina', css: '"Courier New",Courier,monospace' }
  ];
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  const S = {
    tool: 'pencil', prevTool: 'pencil',
    color: store.get('color', '#E53935'), color2: store.get('color2', '#FFFFFF'),
    size: store.get('size', 10), opacity: 100,
    fill: 'outline', sym: 'off',
    stamp: '⭐', stampCat: 'animals',
    font: store.get('font', 'comic'), bold: true, italic: false,
    W: 1280, H: 800, zoom: 1, fitMode: true,
    bgId: 'white', linesId: null,
    dirty: false, galleryId: null, galleryName: null,
    sound: store.get('sound', true)
  };
  let recent = store.get('recent', []);

  /* =====================================================================
     Capas (canvas)
     ===================================================================== */
  const paper = $('#paper');
  const cvBg = $('#cv-bg'), cvDraw = $('#cv-draw'), cvStroke = $('#cv-stroke'), cvLines = $('#cv-lines'), cvOver = $('#cv-over');
  const bctx = cvBg.getContext('2d');
  const dctx = cvDraw.getContext('2d');
  const sctx = cvStroke.getContext('2d');
  const lctx = cvLines.getContext('2d', { willReadFrequently: true });
  const octx = cvOver.getContext('2d');
  const compCanvas = document.createElement('canvas');
  const cctx = compCanvas.getContext('2d', { willReadFrequently: true });

  function setSize(W, H) {
    S.W = W; S.H = H;
    [cvBg, cvDraw, cvStroke, cvLines, cvOver, compCanvas].forEach((c) => { c.width = W; c.height = H; });
    $('#st-size').textContent = W + ' × ' + H;
    applyZoom();
  }

  function paintBg() {
    const bg = window.BACKGROUNDS.find((b) => b.id === S.bgId) || window.BACKGROUNDS[0];
    bctx.clearRect(0, 0, S.W, S.H);
    bg.paint(bctx, S.W, S.H);
    $$('.bg-btn').forEach((b) => b.classList.toggle('active', b.dataset.id === S.bgId));
  }

  const pageImgCache = {};
  function loadPageImage(id) {
    if (pageImgCache[id]) return pageImgCache[id];
    const page = window.PAGES.find((p) => p.id === id);
    const p = new Promise((resolve, reject) => {
      if (!page) { reject(new Error('page')); return; }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('svg'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(page.svg());
    });
    pageImgCache[id] = p;
    return p;
  }
  let linesToken = 0;
  async function setLines(id) {
    const token = ++linesToken;
    S.linesId = id || null;
    lctx.clearRect(0, 0, S.W, S.H);
    if (!id) return;
    try {
      const img = await loadPageImage(id);
      if (token !== linesToken) return;
      lctx.clearRect(0, 0, S.W, S.H);
      const k = Math.min(S.W / 1280, S.H / 800);
      const w = 1280 * k, h = 800 * k;
      lctx.drawImage(img, (S.W - w) / 2, (S.H - h) / 2, w, h);
    } catch (_) { S.linesId = null; }
  }

  /** Imagen final: papel + dibujo + líneas */
  function composite() {
    cctx.clearRect(0, 0, S.W, S.H);
    cctx.drawImage(cvBg, 0, 0);
    cctx.drawImage(cvDraw, 0, 0);
    cctx.drawImage(cvLines, 0, 0);
    return compCanvas;
  }

  /* =====================================================================
     Zoom
     ===================================================================== */
  function applyZoom() {
    paper.style.width = Math.round(S.W * S.zoom) + 'px';
    paper.style.height = Math.round(S.H * S.zoom) + 'px';
    const zl = $('#zoom-label'); if (zl) zl.textContent = Math.round(S.zoom * 100) + '%';
    positionSelbox();
    positionTextbox();
  }
  function setZoom(z, manual) {
    S.zoom = clamp(Math.round(z * 100) / 100, 0.2, 4);
    if (manual) S.fitMode = false;
    applyZoom();
  }
  function fit() {
    const vp = $('#viewport');
    const aw = vp.clientWidth - 56, ah = vp.clientHeight - 56;
    S.fitMode = true;
    setZoom(Math.max(0.2, Math.min(aw / S.W, ah / S.H, 1.5)));
  }

  /* =====================================================================
     Historial (deshacer / rehacer)
     ===================================================================== */
  const undoStack = [], redoStack = [];
  const maxUndo = () => clamp(Math.floor(120e6 / (S.W * S.H * 4)), 6, 30);
  function snapshot() {
    const c = canvasOf(S.W, S.H);
    c.getContext('2d').drawImage(cvDraw, 0, 0);
    return { draw: c, bgId: S.bgId, linesId: S.linesId, W: S.W, H: S.H };
  }
  function restore(st) {
    if (st.W !== S.W || st.H !== S.H) setSize(st.W, st.H);
    dctx.clearRect(0, 0, S.W, S.H);
    dctx.drawImage(st.draw, 0, 0);
    S.bgId = st.bgId; paintBg();
    setLines(st.linesId);
  }
  function pushUndo() {
    undoStack.push(snapshot());
    while (undoStack.length > maxUndo()) undoStack.shift();
    redoStack.length = 0;
    markDirty();
    updateHistoryButtons();
  }
  function doUndo() {
    commitFloating();
    if (!undoStack.length) { toast(t('nothingUndo')); SFX.play('oops'); return; }
    redoStack.push(snapshot());
    restore(undoStack.pop());
    markDirty(); updateHistoryButtons(); SFX.play('undo');
  }
  function doRedo() {
    commitFloating();
    if (!redoStack.length) { toast(t('nothingRedo')); SFX.play('oops'); return; }
    undoStack.push(snapshot());
    restore(redoStack.pop());
    markDirty(); updateHistoryButtons(); SFX.play('redo');
  }
  function updateHistoryButtons() {
    const u = $('#btn-undo'), r = $('#btn-redo');
    if (u) u.disabled = !undoStack.length;
    if (r) r.disabled = !redoStack.length;
  }
  function resetHistory() { undoStack.length = 0; redoStack.length = 0; updateHistoryButtons(); }

  /* =====================================================================
     Simetría
     ===================================================================== */
  function copiesOf(pt) {
    const W = S.W, H = S.H, cx = W / 2, cy = H / 2;
    const mk = (x, y) => ({ x, y, p: pt.p, pen: pt.pen });
    const out = [pt];
    const rot = (x, y, a) => { const dx = x - cx, dy = y - cy; return mk(cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)); };
    switch (S.sym) {
      case 'mirror': out.push(mk(W - pt.x, pt.y)); break;
      case 'quad': out.push(mk(W - pt.x, pt.y), mk(pt.x, H - pt.y), mk(W - pt.x, H - pt.y)); break;
      case 'mandala': for (let k = 1; k < 8; k++) out.push(rot(pt.x, pt.y, (k * Math.PI) / 4)); break;
      case 'kaleido':
        for (let k = 1; k < 6; k++) out.push(rot(pt.x, pt.y, (k * Math.PI) / 3));
        for (let k = 0; k < 6; k++) out.push(rot(W - pt.x, pt.y, (k * Math.PI) / 3));
        break;
      default: break;
    }
    return out;
  }

  /* =====================================================================
     Pinceles
     ===================================================================== */
  const FREEHAND = new Set(['pencil', 'brush', 'marker', 'crayon', 'spray', 'rainbow', 'glitter', 'neon', 'eraser']);
  const SHAPES = new Set(['line', 'rect', 'ellipse', 'triangle', 'star', 'heart', 'diamond', 'arrow']);

  function line(tc, a, b, w, col) {
    tc.strokeStyle = col; tc.lineWidth = w; tc.lineCap = 'round'; tc.lineJoin = 'round';
    tc.beginPath(); tc.moveTo(a.x, a.y); tc.lineTo(b.x + 0.01, b.y); tc.stroke();
  }
  function along(a, b, sp, st, fn) {
    const d = dist(a, b);
    if (d === 0) return;
    let t0 = st.acc;
    while (t0 <= d) { const k = t0 / d; fn(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k); t0 += sp; }
    st.acc = t0 - d;
  }
  function crayonDab(tc, x, y, r, col) {
    tc.fillStyle = col;
    tc.globalAlpha = 0.3; tc.beginPath(); tc.arc(x, y, r * 0.8, 0, 6.2832); tc.fill();
    const n = Math.ceil(r * r * 0.9);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.2832, d = Math.sqrt(Math.random()) * r, s = 1 + Math.random() * 1.6;
      tc.globalAlpha = 0.45 + Math.random() * 0.55;
      tc.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, s, s);
    }
    tc.globalAlpha = 1;
  }
  function sprayDab(tc, x, y, r, col) {
    tc.fillStyle = col;
    const n = Math.ceil(r * 1.1) + 4;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.2832, d = Math.sqrt(Math.random()) * r, s = 1 + Math.random() * 0.9;
      tc.globalAlpha = 0.55 + Math.random() * 0.45;
      tc.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, s, s);
    }
    tc.globalAlpha = 1;
  }
  function sparkle(tc, x, y, r) {
    tc.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 === 0 ? r : r * 0.28;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) tc.moveTo(px, py); else tc.lineTo(px, py);
    }
    tc.closePath(); tc.fill();
  }
  function glitterDab(tc, x, y, size, col) {
    const cols = [col, '#FFD700', '#FFFFFF', lighten(col, 0.5), '#FF80AB', '#80D8FF'];
    for (let k = 0; k < 2; k++) {
      const px = x + (Math.random() - 0.5) * size * 1.8, py = y + (Math.random() - 0.5) * size * 1.8;
      const r = size * (0.15 + Math.random() * 0.4) + 2;
      tc.fillStyle = cols[Math.floor(Math.random() * cols.length)];
      if (Math.random() < 0.62) sparkle(tc, px, py, r * 1.5);
      else { tc.beginPath(); tc.arc(px, py, r * 0.45, 0, 6.2832); tc.fill(); }
    }
  }
  function pf(pt) { return pt.pen ? 0.3 + pt.p * 1.4 : 1; }

  function brushRadius() {
    const s = S.size;
    switch (S.tool) {
      case 'pencil': return Math.max(1.5, s * 0.45) / 2;
      case 'brush': return (s * 1.3) / 2;
      case 'marker': return s * 0.9;
      case 'crayon': return s * 0.9;
      case 'spray': return s * 1.8;
      case 'rainbow': return (s * 1.4) / 2;
      case 'glitter': return s * 0.9;
      case 'neon': return s * 0.5;
      case 'eraser': return s;
      default: return 0;
    }
  }

  function paintSeg(a, b, st) {
    const s = S.size, tool = cur.tool, col = cur.col;
    if (tool === 'eraser') {
      dctx.save(); dctx.globalCompositeOperation = 'destination-out'; dctx.globalAlpha = S.opacity / 100;
      line(dctx, a, b, s * 2, '#000'); dctx.restore();
      return;
    }
    const tc = sctx;
    switch (tool) {
      case 'pencil': line(tc, a, b, Math.max(1.5, s * 0.45 * pf(b)), col); break;
      case 'brush': line(tc, a, b, Math.max(1.5, s * 1.3 * pf(b)), col); break;
      case 'marker': line(tc, a, b, s * 1.8, col); break;
      case 'rainbow': cur.hue = (cur.hue + dist(a, b) * 0.9) % 360; line(tc, a, b, Math.max(1.5, s * 1.4 * pf(b)), 'hsl(' + Math.round(cur.hue) + ',95%,55%)'); break;
      case 'neon':
        // el resplandor va DEBAJO de lo ya pintado y el centro brillante ENCIMA: así el centro queda continuo
        tc.save(); tc.globalCompositeOperation = 'destination-over'; tc.shadowColor = col; tc.shadowBlur = s * 1.2 + 4;
        line(tc, a, b, s * 0.8 + 1, col); tc.restore();
        line(tc, a, b, Math.max(1.5, s * 0.28), lighten(col, 0.78));
        break;
      case 'crayon': along(a, b, Math.max(2, s * 0.28), st, (x, y) => crayonDab(tc, x, y, s * 0.9, col)); break;
      case 'spray': along(a, b, Math.max(2, s * 0.35), st, (x, y) => sprayDab(tc, x, y, s * 1.8, col)); break;
      case 'glitter': along(a, b, Math.max(4, s * 0.9), st, (x, y) => glitterDab(tc, x, y, s, col)); break;
      default: break;
    }
  }

  function strokeAlpha() { return (S.opacity / 100) * (cur && cur.tool === 'marker' ? 0.62 : 1); }

  function beginStroke(pt) {
    pushUndo();
    cur.hue = Math.random() * 360;
    cur.alpha = strokeAlpha();
    cur.copies = copiesOf(pt);
    cur.st = cur.copies.map(() => ({ acc: 0 }));
    if (cur.tool !== 'eraser') { cvStroke.style.opacity = String(cur.alpha); }
    // punto inicial
    cur.copies.forEach((c, i) => {
      if (cur.tool === 'spray' || cur.tool === 'crayon' || cur.tool === 'glitter') {
        paintSeg(c, { x: c.x + 0.01, y: c.y, p: c.p, pen: c.pen }, cur.st[i]);
      } else paintSeg(c, c, cur.st[i]);
    });
    if (cur.tool === 'spray') {
      cur.timer = setInterval(() => {
        if (!cur) return;
        cur.copies.forEach((c) => sprayDab(sctx, c.x, c.y, S.size * 1.8, cur.col));
      }, 40);
    }
  }
  function moveStroke(pt) {
    const nc = copiesOf(pt);
    nc.forEach((c, i) => paintSeg(cur.copies[i], c, cur.st[i]));
    cur.copies = nc;
  }
  function endStroke() {
    if (cur.timer) clearInterval(cur.timer);
    if (cur.tool !== 'eraser') {
      dctx.save(); dctx.globalAlpha = cur.alpha; dctx.drawImage(cvStroke, 0, 0); dctx.restore();
      sctx.clearRect(0, 0, S.W, S.H);
      cvStroke.style.opacity = '1';
    }
    afterEdit();
  }

  /* ---------- formas ---------- */
  function shapeBox(type, x0, y0, x1, y1, shift) {
    let x = Math.min(x0, x1), y = Math.min(y0, y1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
    if (shift && type !== 'line' && type !== 'arrow') {
      const m = Math.max(w, h); w = h = m; x = x1 < x0 ? x0 - m : x0; y = y1 < y0 ? y0 - m : y0;
    }
    return { x, y, w, h };
  }
  function shapePath(c, type, bx) {
    const { x, y, w, h } = bx;
    c.beginPath();
    switch (type) {
      case 'rect': {
        const r = Math.min(w, h) * 0.1;
        c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); break;
      }
      case 'ellipse': c.ellipse(x + w / 2, y + h / 2, Math.max(0.5, w / 2), Math.max(0.5, h / 2), 0, 0, 6.2832); break;
      case 'triangle': c.moveTo(x + w / 2, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); break;
      case 'diamond': c.moveTo(x + w / 2, y); c.lineTo(x + w, y + h / 2); c.lineTo(x + w / 2, y + h); c.lineTo(x, y + h / 2); c.closePath(); break;
      case 'star': {
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 === 0 ? 1 : 0.42, a = -Math.PI / 2 + (i * Math.PI) / 5;
          const px = x + ((rr * Math.cos(a) + 0.951) / 1.902) * w, py = y + ((rr * Math.sin(a) + 1) / 1.809) * h;
          if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.closePath(); break;
      }
      case 'heart': {
        const X = (u) => x + u * w, Y = (v) => y + v * h;
        c.moveTo(X(0.5), Y(0.95));
        c.bezierCurveTo(X(0.15), Y(0.65), X(0), Y(0.45), X(0), Y(0.28));
        c.bezierCurveTo(X(0), Y(0.1), X(0.12), Y(0), X(0.27), Y(0));
        c.bezierCurveTo(X(0.38), Y(0), X(0.46), Y(0.06), X(0.5), Y(0.15));
        c.bezierCurveTo(X(0.54), Y(0.06), X(0.62), Y(0), X(0.73), Y(0));
        c.bezierCurveTo(X(0.88), Y(0), X(1), Y(0.1), X(1), Y(0.28));
        c.bezierCurveTo(X(1), Y(0.45), X(0.85), Y(0.65), X(0.5), Y(0.95));
        c.closePath(); break;
      }
      default: break;
    }
  }
  function drawShape(c, type, x0, y0, x1, y1, shift, col, col2, fillMode, size) {
    c.save();
    c.lineWidth = size; c.lineJoin = 'round'; c.lineCap = 'round';
    if (type === 'line' || type === 'arrow') {
      if (shift) { const ang = Math.round(Math.atan2(y1 - y0, x1 - x0) / (Math.PI / 4)) * (Math.PI / 4), d = Math.hypot(x1 - x0, y1 - y0); x1 = x0 + Math.cos(ang) * d; y1 = y0 + Math.sin(ang) * d; }
      c.strokeStyle = col; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 + 0.01, y1); c.stroke();
      if (type === 'arrow') {
        const ang = Math.atan2(y1 - y0, x1 - x0), L = Math.max(22, size * 3.4);
        c.beginPath();
        c.moveTo(x1 - L * Math.cos(ang - 0.5), y1 - L * Math.sin(ang - 0.5)); c.lineTo(x1, y1); c.lineTo(x1 - L * Math.cos(ang + 0.5), y1 - L * Math.sin(ang + 0.5));
        c.stroke();
      }
    } else {
      const bx = shapeBox(type, x0, y0, x1, y1, shift);
      if (bx.w < 1 && bx.h < 1) { c.restore(); return; }
      shapePath(c, type, bx);
      if (fillMode === 'solid') { c.fillStyle = col; c.fill(); }
      else if (fillMode === 'both') { c.fillStyle = col2; c.fill(); c.strokeStyle = col; c.stroke(); }
      else { c.strokeStyle = col; c.stroke(); }
    }
    c.restore();
  }

  /* ---------- relleno (cubeta) ---------- */
  function floodFill(px, py, hex) {
    px = Math.floor(px); py = Math.floor(py);
    const W = S.W, H = S.H;
    if (px < 0 || py < 0 || px >= W || py >= H) return false;
    composite();
    const src = cctx.getImageData(0, 0, W, H).data;
    let linesA = null;
    if (S.linesId) {
      linesA = lctx.getImageData(0, 0, W, H).data;
      if (linesA[(py * W + px) * 4 + 3] > 140) return false; // clic sobre una línea negra
    }
    const i0 = (py * W + px) * 4;
    const sr = src[i0], sg = src[i0 + 1], sb = src[i0 + 2];
    const [fr, fg, fb] = hexToRgb(hex);
    if (!S.linesId && Math.abs(sr - fr) + Math.abs(sg - fg) + Math.abs(sb - fb) < 6 && S.opacity >= 100) return false;
    const TOL = 80;
    const mask = new Uint8Array(W * H);
    const match = (idx) => { const j = idx * 4; return Math.abs(src[j] - sr) + Math.abs(src[j + 1] - sg) + Math.abs(src[j + 2] - sb) <= TOL; };
    const stack = [px, py];
    while (stack.length) {
      const y = stack.pop(), x = stack.pop();
      if (mask[y * W + x]) continue;
      let xl = x; while (xl >= 0 && !mask[y * W + xl] && match(y * W + xl)) xl--; xl++;
      let xr = x; while (xr < W && !mask[y * W + xr] && match(y * W + xr)) xr++; xr--;
      if (xr < xl) continue;
      for (let i = xl; i <= xr; i++) mask[y * W + i] = 1;
      for (const dy of [-1, 1]) {
        const ny = y + dy; if (ny < 0 || ny >= H) continue;
        let inSpan = false;
        for (let i = xl; i <= xr; i++) {
          const ok = !mask[ny * W + i] && match(ny * W + i);
          if (ok && !inSpan) { stack.push(i, ny); inSpan = true; } else if (!ok) inSpan = false;
        }
      }
    }
    pushUndo();
    const img = dctx.getImageData(0, 0, W, H), d = img.data, a = S.opacity / 100;
    // anillo de 1px (o 3px con líneas): el color se mete DEBAJO de los bordes suaves para que no queden halos blancos
    const ring = new Uint8Array(W * H);
    const grow = (iters) => {
      for (let it = 0; it < iters; it++) {
        const add = [];
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          if (mask[i] || ring[i]) continue;
          if (!(mask[i - 1] || mask[i + 1] || mask[i - W] || mask[i + W] || ring[i - 1] || ring[i + 1] || ring[i - W] || ring[i + W])) continue;
          const da = d[i * 4 + 3];
          const edgeOfInk = da > 0 && da < 255 && it === 0;
          const underLine = linesA && linesA[i * 4 + 3] > 0;
          if (edgeOfInk || underLine) add.push(i);
        }
        for (const i of add) ring[i] = 1;
      }
    };
    grow(linesA ? 3 : 1);
    for (let i = 0; i < mask.length; i++) {
      const j = i * 4;
      if (mask[i]) {
        if (a >= 1) { d[j] = fr; d[j + 1] = fg; d[j + 2] = fb; d[j + 3] = 255; }
        else {
          const da = d[j + 3] / 255, oa = a + da * (1 - a);
          d[j] = (fr * a + d[j] * da * (1 - a)) / oa; d[j + 1] = (fg * a + d[j + 1] * da * (1 - a)) / oa; d[j + 2] = (fb * a + d[j + 2] * da * (1 - a)) / oa; d[j + 3] = oa * 255;
        }
      } else if (ring[i]) { // relleno por debajo
        const da = d[j + 3] / 255, oa = da + a * (1 - da);
        d[j] = (d[j] * da + fr * a * (1 - da)) / oa; d[j + 1] = (d[j + 1] * da + fg * a * (1 - da)) / oa; d[j + 2] = (d[j + 2] * da + fb * a * (1 - da)) / oa; d[j + 3] = oa * 255;
      }
    }
    dctx.putImageData(img, 0, 0);
    return true;
  }

  function samplePoint(x, y) {
    composite();
    const p = cctx.getImageData(clamp(Math.floor(x), 0, S.W - 1), clamp(Math.floor(y), 0, S.H - 1), 1, 1).data;
    return rgbToHex(p[0], p[1], p[2]);
  }

  /* ---------- sellos ---------- */
  function stampSize() { return S.size * 3 + 26; }
  function stampAt(c, x, y, alpha) {
    c.save();
    c.globalAlpha = alpha;
    c.font = Math.round(stampSize()) + 'px ' + EMOJI_FONT;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(S.stamp, x, y + stampSize() * 0.05);
    c.restore();
  }

  /* ---------- texto ---------- */
  const textbox = $('#textbox');
  let textState = null; // {x,y}
  function fontCss() { return FONTS.find((f) => f.id === S.font) || FONTS[0]; }
  function textPx() { return Math.round(22 + S.size * 2.6); }
  function textFontString(px) { return (S.italic ? 'italic ' : '') + (S.bold ? 'bold ' : '') + px + 'px ' + fontCss().css; }
  function positionTextbox() {
    if (!textState) return;
    textbox.style.left = textState.x * S.zoom + 'px';
    textbox.style.top = textState.y * S.zoom + 'px';
    textbox.style.font = textFontString(textPx() * S.zoom);
    textbox.style.lineHeight = '1.15';
    textbox.style.color = textState.col;
    autosizeText();
  }
  function autosizeText() {
    textbox.style.height = 'auto'; textbox.style.width = '1px';
    textbox.style.width = Math.max(90, textbox.scrollWidth + 10) + 'px';
    textbox.style.height = textbox.scrollHeight + 'px';
  }
  function startText(pt, col) {
    commitText();
    textState = { x: pt.x, y: pt.y, col };
    textbox.hidden = false; textbox.value = '';
    textbox.placeholder = t('textPlaceholder');
    positionTextbox();
    setTimeout(() => textbox.focus(), 0);
  }
  function commitText() {
    if (!textState) return;
    const val = textbox.value;
    const st = textState;
    textState = null;
    textbox.hidden = true; textbox.value = '';
    if (!val.trim()) return;
    pushUndo();
    const px = textPx();
    dctx.save();
    dctx.globalAlpha = S.opacity / 100;
    dctx.fillStyle = st.col; dctx.font = textFontString(px); dctx.textBaseline = 'top'; dctx.textAlign = 'left';
    val.split('\n').forEach((ln, i) => dctx.fillText(ln, st.x + 2 / S.zoom, st.y + i * px * 1.15 + (px * 0.07)));
    dctx.restore();
    afterEdit();
  }
  function cancelText() { textState = null; textbox.hidden = true; textbox.value = ''; }
  textbox.addEventListener('input', autosizeText);
  textbox.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); SFX.play('stamp'); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelText(); }
  });
  textbox.addEventListener('blur', () => { setTimeout(() => { if (textState && document.activeElement !== textbox) commitText(); }, 120); });

  /* ---------- selección / tijeras ---------- */
  let SEL = null;       // {canvas, x, y, w, h, moved}
  let INTERNAL_CLIP = null;
  const selbox = $('#selbox');
  function positionSelbox() {
    if (!SEL) { selbox.hidden = true; return; }
    selbox.hidden = false;
    selbox.style.left = SEL.x * S.zoom - 3 + 'px'; selbox.style.top = SEL.y * S.zoom - 3 + 'px';
    selbox.style.width = SEL.w * S.zoom + 6 + 'px'; selbox.style.height = SEL.h * S.zoom + 6 + 'px';
  }
  function liftSelection(r) {
    const x = Math.round(r.x), y = Math.round(r.y), w = Math.round(r.w), h = Math.round(r.h);
    if (w < 3 || h < 3) return;
    pushUndo();
    const c = canvasOf(w, h);
    c.getContext('2d').drawImage(cvDraw, x, y, w, h, 0, 0, w, h);
    dctx.clearRect(x, y, w, h);
    SEL = { canvas: c, x, y, w, h, moved: false };
    positionSelbox(); updatePanels(); renderOverlay();
  }
  function commitSelection() {
    if (!SEL) return;
    const s = SEL; SEL = null;
    dctx.drawImage(s.canvas, s.x, s.y, s.w, s.h);
    if (!s.moved && undoStack.length) { undoStack.pop(); updateHistoryButtons(); } // no cambió nada
    positionSelbox(); updatePanels(); renderOverlay();
    if (s.moved) afterEdit();
  }
  function deleteSelection() {
    if (!SEL) return;
    SEL = null; positionSelbox(); updatePanels(); renderOverlay(); afterEdit();
  }
  function commitFloating() { commitText(); commitSelection(); }
  function selTransform(kind) {
    if (!SEL) return;
    const s = SEL; const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    let nw = s.w, nh = s.h, nc;
    if (kind === 'flipH' || kind === 'flipV') {
      nc = canvasOf(s.w, s.h); const c = nc.getContext('2d');
      if (kind === 'flipH') { c.translate(s.w, 0); c.scale(-1, 1); } else { c.translate(0, s.h); c.scale(1, -1); }
      c.drawImage(s.canvas, 0, 0, s.w, s.h);
    } else if (kind === 'rotate') {
      nw = s.h; nh = s.w; nc = canvasOf(nw, nh); const c = nc.getContext('2d');
      c.translate(nw / 2, nh / 2); c.rotate(Math.PI / 2); c.drawImage(s.canvas, -s.w / 2, -s.h / 2, s.w, s.h);
    } else {
      const k = kind === 'bigger' ? 1.25 : 0.8;
      nw = Math.max(8, Math.round(s.w * k)); nh = Math.max(8, Math.round(s.h * k));
      nc = canvasOf(nw, nh); const c = nc.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(s.canvas, 0, 0, nw, nh);
    }
    SEL = { canvas: nc, x: Math.round(cx - nw / 2), y: Math.round(cy - nh / 2), w: nw, h: nh, moved: true };
    positionSelbox(); renderOverlay(); SFX.play('pop');
  }
  function insertFloating(source) {
    setTool('select');
    commitFloating();
    let w = source.width, h = source.height;
    const k = Math.min(1, (S.W * 0.9) / w, (S.H * 0.9) / h);
    w = Math.max(8, Math.round(w * k)); h = Math.max(8, Math.round(h * k));
    pushUndo();
    const c = canvasOf(w, h); c.getContext('2d').drawImage(source, 0, 0, w, h);
    SEL = { canvas: c, x: Math.round((S.W - w) / 2), y: Math.round((S.H - h) / 2), w, h, moved: true };
    positionSelbox(); updatePanels(); renderOverlay();
    say(t('pasted'));
  }
  async function copySelection(cut) {
    let src = null;
    if (SEL) src = SEL.canvas;
    if (!src) return false;
    INTERNAL_CLIP = canvasOf(src.width, src.height); INTERNAL_CLIP.getContext('2d').drawImage(src, 0, 0);
    const url = src.toDataURL('image/png');
    try {
      if (api) await api.writeClipboardImage(url);
      else if (navigator.clipboard && window.ClipboardItem) {
        const blob = await new Promise((r) => src.toBlob(r, 'image/png'));
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      }
    } catch (_) { /* usamos el portapapeles interno */ }
    if (cut) deleteSelection();
    return true;
  }
  function loadImage(url) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }); }
  async function pasteImage() {
    try {
      let url = null;
      if (api) url = await api.readClipboardImage();
      else if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const it of items) { const ty = it.types.find((x) => x.startsWith('image/')); if (ty) { const b = await it.getType(ty); url = URL.createObjectURL(b); break; } }
      }
      if (url) { const img = await loadImage(url); insertFloating(img); return; }
    } catch (_) { /* seguimos con el interno */ }
    if (INTERNAL_CLIP) insertFloating(INTERNAL_CLIP);
  }
  function selectAll() {
    setTool('select'); commitFloating();
    liftSelection({ x: 0, y: 0, w: S.W, h: S.H });
  }

  /* =====================================================================
     Overlay (vista previa, cursor, selección)
     ===================================================================== */
  const hover = { x: 0, y: 0, show: false };
  function renderOverlay() {
    octx.clearRect(0, 0, S.W, S.H);
    if (SEL) octx.drawImage(SEL.canvas, SEL.x, SEL.y, SEL.w, SEL.h);
    if (cur && cur.shape) {
      octx.save(); octx.globalAlpha = S.opacity / 100;
      drawShape(octx, cur.tool, cur.start.x, cur.start.y, cur.last.x, cur.last.y, cur.shift, cur.col, cur.col2, S.fill, S.size);
      octx.restore();
    }
    if (cur && cur.tool === 'select' && cur.mode === 'new') {
      const r = shapeBox('rect', cur.start.x, cur.start.y, cur.last.x, cur.last.y, false);
      octx.save(); octx.lineWidth = 2 / S.zoom * 1.5; octx.setLineDash([8 / S.zoom * 1.5, 6 / S.zoom * 1.5]);
      octx.strokeStyle = '#fff'; octx.strokeRect(r.x, r.y, r.w, r.h);
      octx.lineDashOffset = 7 / S.zoom * 1.5; octx.strokeStyle = '#7C4DFF'; octx.strokeRect(r.x, r.y, r.w, r.h); octx.restore();
    }
    if (hover.show && !panning && !textState) {
      const lw = 1.6 / S.zoom;
      if (FREEHAND.has(S.tool)) {
        const r = brushRadius();
        copiesOf({ x: hover.x, y: hover.y, p: 0.5, pen: false }).forEach((c) => {
          octx.beginPath(); octx.arc(c.x, c.y, Math.max(r, 2), 0, 6.2832);
          octx.lineWidth = lw * 2.2; octx.strokeStyle = 'rgba(255,255,255,.9)'; octx.stroke();
          octx.lineWidth = lw; octx.strokeStyle = 'rgba(30,20,60,.85)'; octx.stroke();
        });
      } else if (S.tool === 'stamp') {
        copiesOf({ x: hover.x, y: hover.y, p: 0.5, pen: false }).forEach((c) => stampAt(octx, c.x, c.y, 0.5));
      }
    }
  }

  /* =====================================================================
     Interacción con el puntero
     ===================================================================== */
  let cur = null;
  let spaceDown = false, panning = null;

  function toCanvas(e) {
    const r = cvOver.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (S.W / r.width), y: (e.clientY - r.top) * (S.H / r.height), p: e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.5, pen: e.pointerType === 'pen' };
  }
  function inSel(pt) { return SEL && pt.x >= SEL.x && pt.x <= SEL.x + SEL.w && pt.y >= SEL.y && pt.y <= SEL.y + SEL.h; }

  cvOver.addEventListener('contextmenu', (e) => e.preventDefault());
  cvOver.addEventListener('pointerdown', (e) => {
    if (document.querySelector('.overlay')) return;
    if (e.button === 1 || (spaceDown && e.button === 0)) {
      const vp = $('#viewport');
      panning = { x: e.clientX, y: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop };
      paper.classList.add('panning'); cvOver.setPointerCapture(e.pointerId); e.preventDefault(); return;
    }
    if (e.button !== 0 && e.button !== 2) return;
    if (cur) return;
    const pt = toCanvas(e);
    const right = e.button === 2;
    cur = { tool: S.tool, id: e.pointerId, col: right ? S.color2 : S.color, col2: right ? S.color : S.color2, start: pt, last: pt, shift: e.shiftKey };
    cvOver.setPointerCapture(e.pointerId);
    const tool = S.tool;
    if (S.tool !== 'text') commitText();
    if (S.tool !== 'select' && SEL) commitSelection();

    if (FREEHAND.has(tool)) { beginStroke(pt); }
    else if (SHAPES.has(tool)) { cur.shape = true; }
    else if (tool === 'fill') {
      const ok = floodFill(pt.x, pt.y, cur.col);
      if (ok) { SFX.play('fill'); afterEdit(); cheerSometimes(); } else SFX.play('oops');
      cur = null;
    } else if (tool === 'picker') {
      pickColor(pt, right); cur.picking = true;
    } else if (tool === 'text') {
      startText(pt, cur.col); cur = null;
    } else if (tool === 'stamp') {
      pushUndo(); cur.st = copiesOf(pt).map(() => ({ acc: stampSize() * 1.1 }));
      cur.copies = copiesOf(pt);
      cur.copies.forEach((c) => stampAt(dctx, c.x, c.y, S.opacity / 100));
      SFX.play('stamp');
    } else if (tool === 'select') {
      if (inSel(pt)) { cur.mode = 'move'; cur.off = { dx: pt.x - SEL.x, dy: pt.y - SEL.y }; }
      else { if (SEL) commitSelection(); cur.mode = 'new'; }
    }
    renderOverlay();
  });

  cvOver.addEventListener('pointermove', (e) => {
    const pt = toCanvas(e);
    hover.x = pt.x; hover.y = pt.y; hover.show = true;
    $('#st-pos').textContent = Math.round(pt.x) + ', ' + Math.round(pt.y);
    if (panning) {
      const vp = $('#viewport'); vp.scrollLeft = panning.sl - (e.clientX - panning.x); vp.scrollTop = panning.st - (e.clientY - panning.y); return;
    }
    if (!cur || e.pointerId !== cur.id) { renderOverlay(); return; }
    cur.shift = e.shiftKey;
    const evs = (e.getCoalescedEvents && e.getCoalescedEvents().length) ? e.getCoalescedEvents() : [e];
    for (const ev of evs) {
      const p = toCanvas(ev);
      if (FREEHAND.has(cur.tool)) moveStroke(p);
      else if (cur.tool === 'stamp') {
        const nc = copiesOf(p);
        nc.forEach((c, i) => along(cur.copies[i], c, stampSize() * 1.1, cur.st[i], (x, y) => stampAt(dctx, x, y, S.opacity / 100)));
        cur.copies = nc;
      } else if (cur.tool === 'picker') pickColor(p, cur.col === S.color2 && cur.col !== S.color);
      else if (cur.tool === 'select' && cur.mode === 'move' && SEL) {
        SEL.x = Math.round(p.x - cur.off.dx); SEL.y = Math.round(p.y - cur.off.dy); SEL.moved = true; positionSelbox();
      }
      cur.last = p;
    }
    renderOverlay();
  });

  function finishPointer(e) {
    if (panning) { panning = null; paper.classList.remove('panning'); return; }
    if (!cur || (e && e.pointerId !== cur.id)) return;
    const c = cur;
    try { cvOver.releasePointerCapture(c.id); } catch (_) { /* ok */ }
    if (FREEHAND.has(c.tool)) endStroke();
    else if (c.shape) {
      if (dist(c.start, c.last) > 2) {
        pushUndo();
        dctx.save(); dctx.globalAlpha = S.opacity / 100;
        drawShape(dctx, c.tool, c.start.x, c.start.y, c.last.x, c.last.y, c.shift, c.col, c.col2, S.fill, S.size);
        dctx.restore(); SFX.play('pop'); afterEdit();
      }
    } else if (c.tool === 'stamp') afterEdit();
    else if (c.tool === 'picker') { returnFromPicker(); }
    else if (c.tool === 'select' && c.mode === 'new') {
      const r = shapeBox('rect', c.start.x, c.start.y, c.last.x, c.last.y, false);
      cur = null;
      if (r.w >= 4 && r.h >= 4) liftSelection(r);
    }
    cur = null;
    renderOverlay();
  }
  cvOver.addEventListener('pointerup', finishPointer);
  cvOver.addEventListener('pointercancel', finishPointer);
  cvOver.addEventListener('pointerleave', () => { hover.show = false; if (!cur) renderOverlay(); });
  cvOver.addEventListener('lostpointercapture', (e) => { if (cur && e.pointerId === cur.id) finishPointer(e); });

  function pickColor(pt, secondary) {
    const hex = samplePoint(pt.x, pt.y);
    setColor(hex, secondary ? 'secondary' : 'primary', true);
  }
  function returnFromPicker() {
    if (S.tool === 'picker') setTool(S.prevTool && S.prevTool !== 'picker' ? S.prevTool : 'brush');
  }

  /* wheel zoom */
  $('#viewport').addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(S.zoom * (e.deltaY < 0 ? 1.1 : 0.9), true); }
  }, { passive: false });

  /* =====================================================================
     Cambios y autoguardado
     ===================================================================== */
  let autosaveTimer = null;
  function markDirty() { S.dirty = true; scheduleAutosave(); }
  function afterEdit() { markDirty(); updateHistoryButtons(); }
  function scheduleAutosave() { clearTimeout(autosaveTimer); autosaveTimer = setTimeout(autosave, 2500); }

  /* =====================================================================
     Base de datos local (galería + autoguardado)
     ===================================================================== */
  const DB = (function () {
    let dbp = null;
    const mem = new Map();
    function open() {
      if (dbp) return dbp;
      dbp = new Promise((resolve) => {
        try {
          const req = indexedDB.open('my-little-artist', 1);
          req.onupgradeneeded = () => { req.result.createObjectStore('drawings', { keyPath: 'id' }); };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (_) { resolve(null); }
      });
      return dbp;
    }
    function tx(mode, fn) {
      return open().then((db) => new Promise((resolve) => {
        if (!db) { resolve(fn(null)); return; }
        try {
          const t0 = db.transaction('drawings', mode); const os = t0.objectStore('drawings');
          const r = fn(os);
          if (r && r.onsuccess !== undefined) { r.onsuccess = () => resolve(r.result); r.onerror = () => resolve(null); }
          else t0.oncomplete = () => resolve(true);
          t0.onerror = () => resolve(null);
        } catch (_) { resolve(null); }
      }));
    }
    return {
      put(rec) { return tx('readwrite', (os) => { if (!os) { mem.set(rec.id, rec); return null; } os.put(rec); return null; }); },
      get(id) { return tx('readonly', (os) => { if (!os) return null; return os.get(id); }).then((r) => r || mem.get(id) || null); },
      all() { return tx('readonly', (os) => { if (!os) return null; return os.getAll(); }).then((r) => (r || Array.from(mem.values()))); },
      del(id) { return tx('readwrite', (os) => { if (!os) { mem.delete(id); return null; } os.delete(id); return null; }); }
    };
  })();

  const toBlob = (c, type, q) => new Promise((r) => c.toBlob(r, type || 'image/png', q));

  async function buildRecord(id, name) {
    const draw = await toBlob(cvDraw, 'image/png');
    const tc = canvasOf(320, Math.round((320 * S.H) / S.W));
    composite(); tc.getContext('2d').drawImage(compCanvas, 0, 0, tc.width, tc.height);
    return { id, name, created: Date.now(), updated: Date.now(), W: S.W, H: S.H, draw, bgId: S.bgId, linesId: S.linesId, thumb: tc.toDataURL('image/png') };
  }
  async function autosave() {
    if (!S.dirty && !undoStack.length) return;
    try {
      if (textState || SEL) { /* se guarda al terminar la acción */ }
      const rec = await buildRecord('autosave', 'autosave');
      await DB.put(rec);
    } catch (_) { /* sin autoguardado */ }
  }
  async function saveToGallery() {
    commitFloating();
    const all = (await DB.all()).filter((r) => r.id !== 'autosave');
    if (!S.galleryId) { S.galleryId = 'd' + Date.now(); S.galleryName = t('untitled') + ' ' + (all.length + 1); }
    const rec = await buildRecord(S.galleryId, S.galleryName);
    const old = all.find((r) => r.id === S.galleryId); if (old) rec.created = old.created;
    await DB.put(rec);
    S.dirty = false;
    SFX.play('save'); celebrate(); toast(t('savedGallery'));
    say(randomCheer());
  }
  async function loadRecord(rec) {
    commitFloating(); cancelText();
    const img = await loadImage(URL.createObjectURL(rec.draw));
    setSize(rec.W, rec.H); resetHistory();
    S.bgId = rec.bgId || 'white'; paintBg();
    dctx.clearRect(0, 0, S.W, S.H); dctx.drawImage(img, 0, 0);
    await setLines(rec.linesId || null);
    if (S.fitMode) fit();
    S.dirty = false;
  }

  /* =====================================================================
     Nuevo dibujo / abrir
     ===================================================================== */
  async function newDrawing(W, H, bgId, linesId) {
    commitFloating(); cancelText();
    await autosave();
    setSize(W, H); resetHistory();
    dctx.clearRect(0, 0, W, H); sctx.clearRect(0, 0, W, H);
    S.bgId = bgId || 'white'; paintBg();
    await setLines(linesId || null);
    S.galleryId = null; S.galleryName = null; S.dirty = false; SEL = null; positionSelbox();
    fit(); renderOverlay(); updatePanels();
    SFX.play('whoosh');
  }
  async function openImageAsCanvas(dataUrl) {
    try {
      const img = await loadImage(dataUrl);
      let w = img.naturalWidth, h = img.naturalHeight;
      const k = Math.min(1, 2400 / Math.max(w, h)); w = Math.max(200, Math.round(w * k)); h = Math.max(200, Math.round(h * k));
      await newDrawing(w, h, 'white', null);
      const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
      const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
      dctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
      markDirty();
    } catch (_) { toast(t('openError'), true); }
  }
  async function doOpen() {
    if (api) {
      const r = await api.openImage();
      if (r && r.ok) await openImageAsCanvas(r.dataUrl);
      else if (r && r.error) toast(t('openError'), true);
    } else $('#file-input').click();
  }
  $('#file-input').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    const fr = new FileReader(); fr.onload = () => openImageAsCanvas(fr.result); fr.readAsDataURL(f);
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && /^image\//.test(f.type)) {
      const fr = new FileReader();
      fr.onload = async () => { try { insertFloating(await loadImage(fr.result)); } catch (_) { toast(t('openError'), true); } };
      fr.readAsDataURL(f);
    }
  });

  /* =====================================================================
     Exportar / imprimir
     ===================================================================== */
  function safeName(n) { return String(n || '').replace(/[\\/:*?"<>|]+/g, '-').trim() || t('untitled'); }
  function dataUrlFor(format, quality) {
    composite();
    if (format === 'jpg') {
      const c = canvasOf(S.W, S.H), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, S.W, S.H); x.drawImage(compCanvas, 0, 0);
      return c.toDataURL('image/jpeg', quality);
    }
    return compCanvas.toDataURL('image/png');
  }
  async function exportFile(format, name, quality) {
    commitFloating();
    const url = dataUrlFor(format, quality);
    if (api) {
      const r = await api.saveImage(url, format, safeName(name));
      if (r && r.ok) { SFX.play('save'); celebrate(); toast(t('savedFile')); say(randomCheer()); return true; }
      if (r && r.canceled) return false;
      toast(t('exportError'), true); return false;
    }
    const a = document.createElement('a'); a.href = url; a.download = safeName(name) + '.' + format; document.body.appendChild(a); a.click(); a.remove();
    SFX.play('save'); celebrate(); toast(t('savedFile')); say(randomCheer());
    return true;
  }
  async function copyImage() {
    commitFloating();
    const url = dataUrlFor('png');
    try {
      if (api) await api.writeClipboardImage(url);
      else { const blob = await toBlob(compCanvas, 'image/png'); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); }
      toast(t('copied')); SFX.play('pop');
    } catch (_) { toast(t('exportError'), true); }
  }
  async function doPrint() {
    commitFloating();
    const url = dataUrlFor('png');
    if (api) { const r = await api.printImage(url); if (r && r.ok) toast(t('printOk')); return; }
    const w = window.open('', '_blank');
    if (w) { w.document.write('<img src="' + url + '" style="max-width:100%">'); w.document.close(); setTimeout(() => w.print(), 300); }
  }

  /* =====================================================================
     Ventanas
     ===================================================================== */
  const modalRoot = $('#modal-root');
  let modalEl = null, modalOnClose = null;
  function closeModal() {
    if (!modalEl) return;
    const cb = modalOnClose; modalEl.remove(); modalEl = null; modalOnClose = null;
    if (cb) cb();
  }
  function openModal(html, opts) {
    closeModal();
    const ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = html;
    modalRoot.appendChild(ov); modalEl = ov; modalOnClose = opts && opts.onClose;
    if (!(opts && opts.sticky)) ov.addEventListener('pointerdown', (e) => { if (e.target === ov) closeModal(); });
    $$('[data-close]', ov).forEach((b) => b.addEventListener('click', () => { SFX.play('click'); closeModal(); }));
    SFX.play('pop');
    return ov;
  }
  function xBtn() { return `<button class="x-btn" data-close aria-label="${esc(t('close'))}">${ICONS.close}</button>`; }
  function confirmDialog(o) {
    return new Promise((resolve) => {
      let answered = false;
      const ov = openModal(`<div class="dialog small"><h2>${esc(o.title)}</h2><p class="sub">${esc(o.text)}</p><div class="btn-row"><button class="btn" data-no>${esc(o.noLabel || t('no'))}</button><button class="btn ${o.cls || 'primary'}" data-yes>${esc(o.yesLabel || t('yes'))}</button></div></div>`, { onClose: () => { if (!answered) resolve(false); } });
      $('[data-no]', ov).addEventListener('click', () => { answered = true; closeModal(); resolve(false); });
      $('[data-yes]', ov).addEventListener('click', () => { answered = true; closeModal(); resolve(true); });
    });
  }

  const NEW_SIZES = [
    { id: 'medium', w: 1280, h: 800 }, { id: 'large', w: 1920, h: 1080 }, { id: 'square', w: 1000, h: 1000 },
    { id: 'tall', w: 800, h: 1100 }, { id: 'small', w: 800, h: 600 }, { id: 'wide', w: 1800, h: 700 }
  ];
  function showNewDialog() {
    commitFloating();
    const cards = NEW_SIZES.map((s) => {
      const k = 56 / Math.max(s.w, s.h);
      return `<button class="card" data-size="${s.id}"><div class="shape" style="width:${Math.round(s.w * k)}px;height:${Math.round(s.h * k)}px"></div>${esc(t('size.' + s.id))}<small>${s.w} × ${s.h}</small></button>`;
    }).join('');
    const ov = openModal(`<div class="dialog">${xBtn()}<h2>${esc(t('newTitle'))}</h2><p class="sub">${esc(t('newSub'))}</p><div class="cards">${cards}</div></div>`);
    $$('.card', ov).forEach((b) => b.addEventListener('click', async () => {
      const s = NEW_SIZES.find((x) => x.id === b.dataset.size);
      if (S.dirty) { const ok = await confirmDialog({ title: t('confirmNewTitle'), text: t('confirmNewText') }); if (!ok) return; }
      closeModal(); await newDrawing(s.w, s.h, 'white', null);
    }));
  }

  async function showGallery() {
    commitFloating();
    const all = (await DB.all()).filter((r) => r.id !== 'autosave').sort((a, b) => b.updated - a.updated);
    const body = all.length ? `<div class="thumbs">${all.map((r) => `<div class="thumb" data-id="${esc(r.id)}"><div class="img"><img alt="" src="${r.thumb}"></div><b>${esc(r.name)}</b><div class="acts"><button data-open>${esc(t('galleryOpen'))}</button><button data-exp>${esc(t('galleryExport'))}</button><button class="del" data-del title="${esc(t('galleryDelete'))}">🗑</button></div></div>`).join('')}</div>` : `<div class="empty">🎨<br>${esc(t('galleryEmpty'))}</div>`;
    const ov = openModal(`<div class="dialog">${xBtn()}<h2>${esc(t('galleryTitle'))}</h2><p class="sub">&nbsp;</p>${body}</div>`);
    $$('.thumb', ov).forEach((el) => {
      const id = el.dataset.id; const rec = all.find((r) => r.id === id);
      $('[data-open]', el).addEventListener('click', async () => {
        if (S.dirty) { const ok = await confirmDialog({ title: t('confirmNewTitle'), text: t('confirmNewText') }); if (!ok) return; }
        closeModal(); await autosave(); await loadRecord(rec); S.galleryId = rec.id; S.galleryName = rec.name; S.dirty = false; renderOverlay(); SFX.play('whoosh');
      });
      $('[data-exp]', el).addEventListener('click', async () => {
        closeModal(); await autosave(); await loadRecord(rec); S.galleryId = rec.id; S.galleryName = rec.name; showExportDialog();
      });
      $('[data-del]', el).addEventListener('click', async () => {
        const ok = await confirmDialog({ title: t('confirmDeleteTitle'), text: t('confirmDeleteText'), cls: 'red' });
        if (ok) { await DB.del(id); if (S.galleryId === id) S.galleryId = null; showGallery(); }
      });
    });
  }

  function pageThumb(p) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(p.svg().replace('<style>*{vector-effect:non-scaling-stroke}</style>', '')); }
  function showColoringDialog() {
    commitFloating();
    const items = window.PAGES.map((p) => `<button class="thumb page" data-id="${p.id}"><div class="img"><img alt="" src="${pageThumb(p)}"></div><b>${esc(t('page.' + p.id))}</b></button>`).join('');
    const ov = openModal(`<div class="dialog">${xBtn()}<h2>${esc(t('coloringTitle'))}</h2><p class="sub">${esc(t('coloringSub'))}</p><div class="thumbs">${items}</div></div>`);
    $$('.thumb', ov).forEach((b) => b.addEventListener('click', async () => {
      if (S.dirty) { const ok = await confirmDialog({ title: t('confirmNewTitle'), text: t('confirmNewText') }); if (!ok) return; }
      closeModal(); await newDrawing(1280, 800, 'white', b.dataset.id); say(t('tip.fill'));
    }));
  }

  let exportFmt = 'png';
  function showExportDialog() {
    commitFloating();
    const name = S.galleryName || t('untitled');
    const ov = openModal(`<div class="dialog">${xBtn()}<h2>${esc(t('exportTitle'))}</h2><p class="sub">&nbsp;</p>
      <div class="export-grid"><div class="export-preview"><img alt="" id="exp-img"></div>
      <div>
        <div class="field"><label>${esc(t('exportName'))}</label><input type="text" id="exp-name" value="${esc(name)}" maxlength="60"></div>
        <div class="field"><label>${esc(t('exportFormat'))}</label><div class="seg"><button class="seg-btn" data-f="png">PNG</button><button class="seg-btn" data-f="jpg">JPG</button></div><p class="hint" id="exp-hint"></p></div>
      </div></div>
      <div class="btn-row"><button class="btn" id="exp-copy">${esc(t('exportCopy'))}</button><button class="btn green" id="exp-save">${esc(t('exportSave'))}</button></div></div>`);
    const img = $('#exp-img', ov);
    img.src = dataUrlFor('png');
    const setF = (f) => {
      exportFmt = f;
      $$('[data-f]', ov).forEach((b) => b.classList.toggle('active', b.dataset.f === f));
      $('#exp-hint', ov).textContent = t(f === 'png' ? 'exportHintPng' : 'exportHintJpg');
    };
    setF(exportFmt);
    $$('[data-f]', ov).forEach((b) => b.addEventListener('click', () => { SFX.play('click'); setF(b.dataset.f); }));
    $('#exp-copy', ov).addEventListener('click', copyImage);
    $('#exp-save', ov).addEventListener('click', async () => {
      const ok = await exportFile(exportFmt, $('#exp-name', ov).value, 0.92);
      if (ok) closeModal();
    });
    $('#exp-name', ov).addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('#exp-save', ov).click(); });
  }

  function showHelp() {
    const items = t('helpBody').map(([h, p]) => `<div class="help-item"><b>${esc(h)}</b><span>${esc(p)}</span></div>`).join('');
    openModal(`<div class="dialog">${xBtn()}<h2>${esc(t('helpTitle'))}</h2><p class="sub">&nbsp;</p><div class="help-list">${items}</div></div>`);
  }

  async function showSplash() {
    const auto = await DB.get('autosave');
    const word = 'My Little Artist'.split('').map((ch, i) => ch === ' ' ? ' ' : `<span style="color:${WORD_COLORS[i % WORD_COLORS.length]};animation-delay:${i * 0.09}s">${ch}</span>`).join('');
    const floats = [['#FFEB3B', 46, '6%', '14%', 0], ['#FF5252', 30, '88%', '10%', 1.2], ['#29B6F6', 54, '92%', '60%', .6], ['#69F0AE', 34, '4%', '70%', 2], ['#E040FB', 24, '14%', '40%', 1.6], ['#FFAB40', 28, '80%', '86%', .3]]
      .map(([c, s, l, tp, d]) => `<i class="float" style="background:${c};width:${s}px;height:${s}px;left:${l};top:${tp};animation-delay:${d}s"></i>`).join('');
    const ov = openModal(`<div class="dialog splash">${floats}
      <button class="tb lang-switch" id="splash-lang" style="min-width:64px;height:48px">${ICONS.globe}<span>${esc(t('lang_name'))}</span></button>
      <div class="logo"><img src="assets/logo.png" alt="My Little Artist"></div>
      <h1>${word}</h1>
      <h2>${esc(t('welcomeTitle'))}</h2><p class="sub">${esc(t('welcomeSub'))}</p>
      <div class="splash-actions">
        <button class="big-choice bc1" data-go="new">${ICONS.palette}${esc(t('startNew'))}</button>
        <button class="big-choice bc2" data-go="color">${ICONS.book}${esc(t('startColoring'))}</button>
        <button class="big-choice bc3" data-go="gallery">${ICONS.gallery}${esc(t('startGallery'))}</button>
      </div>
      ${auto ? `<button class="btn continue-btn" data-go="continue">↩ ${esc(t('startContinue'))}</button>` : ''}
    </div>`, { sticky: true });
    $('#splash-lang', ov).addEventListener('click', () => { toggleLang(); showSplash(); });
    $$('[data-go]', ov).forEach((b) => b.addEventListener('click', async () => {
      const g = b.dataset.go; SFX.play('pop');
      if (g === 'new') { closeModal(); await newDrawingFromSplash(); }
      else if (g === 'color') { closeModal(); showColoringDialog(); }
      else if (g === 'gallery') { closeModal(); showGallery(); }
      else if (g === 'continue') { closeModal(); await loadRecord(auto); S.dirty = true; renderOverlay(); fit(); }
      jumpMascot();
    }));
  }
  async function newDrawingFromSplash() { await newDrawing(1280, 800, 'white', null); say(t('welcomeBack')); }

  /* =====================================================================
     Mascota, avisos y confeti
     ===================================================================== */
  let bubbleTimer = null;
  function say(text, ms) {
    const b = $('#bubble'); b.textContent = text; b.classList.add('show');
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => b.classList.remove('show'), ms || 4200);
  }
  function randomCheer() { const a = t('cheers'); return a[Math.floor(Math.random() * a.length)]; }
  let lastCheer = 0;
  function cheerSometimes() { if (Date.now() - lastCheer > 25000 && Math.random() < 0.5) { lastCheer = Date.now(); say(randomCheer(), 2600); } }
  function jumpMascot() { const m = $('#mascot'); m.classList.remove('jump'); void m.offsetWidth; m.classList.add('jump'); }
  $('#brand').addEventListener('click', () => { jumpMascot(); say(randomCheer()); SFX.play('pop'); });

  let toastTimer = null;
  function toast(msg, err) {
    let el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.toggle('err', !!err);
    void el.offsetWidth; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  const confettiCv = $('#confetti'); const cfx = confettiCv.getContext('2d');
  let parts = [], cfRunning = false;
  function celebrate() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    confettiCv.width = window.innerWidth; confettiCv.height = window.innerHeight;
    const cols = ['#FF5252', '#FFEB3B', '#69F0AE', '#40C4FF', '#E040FB', '#FFAB40'];
    for (let i = 0; i < 130; i++) {
      parts.push({ x: window.innerWidth / 2 + rand(-80, 80), y: window.innerHeight * 0.45, vx: rand(-9, 9), vy: rand(-17, -4), g: 0.38, r: rand(5, 10), rot: rand(0, 6.28), vr: rand(-0.3, 0.3), c: cols[i % cols.length], life: rand(70, 120), shape: i % 3 });
    }
    if (!cfRunning) { cfRunning = true; requestAnimationFrame(cfStep); }
    jumpMascot();
  }
  function cfStep() {
    cfx.clearRect(0, 0, confettiCv.width, confettiCv.height);
    parts = parts.filter((p) => p.life > 0 && p.y < confettiCv.height + 20);
    for (const p of parts) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr; p.life--;
      cfx.save(); cfx.translate(p.x, p.y); cfx.rotate(p.rot); cfx.fillStyle = p.c; cfx.globalAlpha = Math.min(1, p.life / 30);
      if (p.shape === 0) cfx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); else if (p.shape === 1) { cfx.beginPath(); cfx.arc(0, 0, p.r / 1.5, 0, 6.28); cfx.fill(); } else { cfx.beginPath(); cfx.moveTo(0, -p.r); cfx.lineTo(p.r, p.r); cfx.lineTo(-p.r, p.r); cfx.closePath(); cfx.fill(); }
      cfx.restore();
    }
    if (parts.length) requestAnimationFrame(cfStep); else { cfRunning = false; cfx.clearRect(0, 0, confettiCv.width, confettiCv.height); }
  }

  /* =====================================================================
     Interfaz: construcción
     ===================================================================== */
  const WORD_COLORS = ['#FFEB3B', '#FF80AB', '#B9F6CA', '#FFD180', '#80D8FF', '#EA80FC'];
  const TOOL_GROUPS = [
    { title: 'grpBrushes', tools: ['pencil', 'brush', 'marker', 'crayon', 'spray', 'rainbow', 'glitter', 'neon', 'eraser', 'fill'] },
    { title: 'grpShapes', cls: 'shapes', tools: ['line', 'rect', 'ellipse', 'triangle', 'star', 'heart', 'diamond', 'arrow'] },
    { title: 'grpMore', tools: ['text', 'stamp', 'picker', 'select'] }
  ];

  function buildWordmark() {
    $('#wordmark').innerHTML = 'My Little Artist'.split('').map((ch, i) => ch === ' ' ? '<span class="sp"></span>' : `<span style="color:${WORD_COLORS[i % WORD_COLORS.length]};animation-delay:${i * 0.08}s">${ch}</span>`).join('');
  }
  function tbBtn(id, icon, key, extra) {
    return `<button class="tb ${extra || ''}" id="btn-${id}" data-act="${id}" title="${esc(t(key))}">${icon}<span>${esc(t(key))}</span></button>`;
  }
  function buildTopbar() {
    $('#bar-file').innerHTML = tbBtn('new', ICONS.new, 'new') + tbBtn('open', ICONS.open, 'open') + tbBtn('gallery', ICONS.gallery, 'gallery') + tbBtn('save', ICONS.save, 'save', 'accent') + tbBtn('export', ICONS.export, 'export', 'good') + tbBtn('print', ICONS.print, 'print');
    $('#bar-edit').innerHTML = tbBtn('undo', ICONS.undo, 'undo') + tbBtn('redo', ICONS.redo, 'redo') + tbBtn('clear', ICONS.trash, 'clear', 'danger');
    $('#bar-view').innerHTML = tbBtn('zoomout', ICONS.zoomout, 'zoomOut') + `<div class="zoom-label" id="zoom-label">${Math.round(S.zoom * 100)}%</div>` + tbBtn('zoomin', ICONS.zoomin, 'zoomIn') + tbBtn('zoomfit', ICONS.fit, 'zoomFit');
    $('#bar-system').innerHTML = tbBtn('sound', S.sound ? ICONS.soundOn : ICONS.soundOff, 'sound') + tbBtn('lang', ICONS.globe, 'lang') + tbBtn('help', ICONS.help, 'help') + tbBtn('full', ICONS.full, 'fullscreen');
    $$('#topbar [data-act]').forEach((b) => b.addEventListener('click', () => { SFX.play('click'); handleAction(b.dataset.act); }));
    updateHistoryButtons();
  }
  function buildTools() {
    const host = $('#tools'); host.innerHTML = '';
    TOOL_GROUPS.forEach((g) => {
      host.insertAdjacentHTML('beforeend', `<div class="tgroup-title">${esc(t(g.title))}</div>`);
      const grid = document.createElement('div'); grid.className = 'tgrid ' + (g.cls || '');
      g.tools.forEach((id) => {
        const b = document.createElement('button');
        b.className = 'tool' + (g.cls === 'shapes' ? ' shape' : ''); b.dataset.tool = id; b.title = t('tool.' + id);
        b.innerHTML = ICONS[id] + (g.cls === 'shapes' ? '' : `<span>${esc(t('tool.' + id))}</span>`);
        b.addEventListener('click', () => { setTool(id); SFX.play('pop'); });
        grid.appendChild(b);
      });
      host.appendChild(grid);
    });
    $$('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === S.tool));
  }
  function buildPalette() {
    const pal = $('#palette'); pal.innerHTML = '';
    for (let i = 0; i < window.PALETTE[0].length; i++) {
      [window.PALETTE[0][i], window.PALETTE[1][i]].forEach((hex) => {
        const b = document.createElement('button'); b.className = 'sw'; b.style.background = hex; b.dataset.color = hex; b.title = hex;
        b.addEventListener('click', () => { setColor(hex, 'primary', true); b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle'); SFX.play('color'); });
        b.addEventListener('contextmenu', (e) => { e.preventDefault(); setColor(hex, 'secondary', true); SFX.play('color'); });
        pal.appendChild(b);
      });
    }
    $('#current-colors').title = t('fillSecond');
  }
  function buildOptions() {
    const q = $('#size-quick'); q.innerHTML = '';
    [4, 10, 22, 40].forEach((v) => {
      const b = document.createElement('button'); b.title = String(v);
      b.innerHTML = `<i style="width:${4 + v * 0.45}px;height:${4 + v * 0.45}px"></i>`;
      b.addEventListener('click', () => { setSize2(v); SFX.play('click'); });
      q.appendChild(b);
    });
    const fs = $('#fill-seg'); fs.innerHTML = [['outline', 'fillOutline'], ['solid', 'fillSolid'], ['both', 'fillBoth']].map(([id, k]) => `<button class="seg-btn" data-fill="${id}"><span class="fs fs-${id}"></span>${esc(t(k))}</button>`).join('');
    $$('[data-fill]', fs).forEach((b) => b.addEventListener('click', () => { S.fill = b.dataset.fill; SFX.play('click'); updateOptionStates(); }));
    const sg = $('#sym-grid'); sg.innerHTML = ['off', 'mirror', 'quad', 'mandala', 'kaleido'].map((id) => `<button class="sym-btn" data-sym="${id}">${esc(t('sym.' + id))}</button>`).join('');
    $$('[data-sym]', sg).forEach((b) => b.addEventListener('click', () => { S.sym = b.dataset.sym; SFX.play('pop'); if (S.sym !== 'off') say(t('optSym') + ': ' + t('sym.' + S.sym) + ' ✨', 2500); updateOptionStates(); renderOverlay(); }));
    // texto
    const fsel = $('#font-sel'); fsel.innerHTML = FONTS.map((f) => `<option value="${f.id}" style="font-family:${f.css.replace(/"/g, "'")}">${esc(f.label)}</option>`).join('');
    fsel.value = S.font;
    fsel.onchange = () => { S.font = fsel.value; store.set('font', S.font); positionTextbox(); };
    $('#btn-bold').onclick = () => { S.bold = !S.bold; updateOptionStates(); positionTextbox(); };
    $('#btn-italic').onclick = () => { S.italic = !S.italic; updateOptionStates(); positionTextbox(); };
    // sellos
    const tabs = $('#stamp-tabs'); tabs.innerHTML = Object.keys(window.STAMPS).map((c) => `<button class="stamp-tab" data-cat="${c}">${esc(t('stamp.' + c))}</button>`).join('');
    $$('[data-cat]', tabs).forEach((b) => b.addEventListener('click', () => { S.stampCat = b.dataset.cat; SFX.play('click'); buildStampGrid(); updateOptionStates(); }));
    buildStampGrid();
    // selección
    const sel = $('#sel-grid');
    sel.innerHTML = [['flipH', 'selFlipH'], ['flipV', 'selFlipV'], ['rotate', 'selRotate'], ['bigger', 'selBigger'], ['smaller', 'selSmaller']].map(([id, k]) => `<button class="sel-btn" data-sel="${id}">${ICONS[id]}<span>${esc(t(k))}</span></button>`).join('') +
      `<button class="sel-btn del" data-sel="delete">${ICONS.trash}<span>${esc(t('selDelete'))}</span></button><button class="sel-btn done" data-sel="done">${ICONS.check}<span>${esc(t('selDone'))}</span></button>`;
    $$('[data-sel]', sel).forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.sel;
      if (k === 'delete') deleteSelection(); else if (k === 'done') { commitSelection(); SFX.play('stamp'); } else selTransform(k);
    }));
    // fondos
    const bg = $('#bg-grid'); bg.innerHTML = '';
    window.BACKGROUNDS.forEach((b) => {
      const btn = document.createElement('button'); btn.className = 'bg-btn'; btn.dataset.id = b.id; btn.title = t('bg.' + b.id);
      const c = canvasOf(80, 80); b.paint(c.getContext('2d'), 80, 80); btn.appendChild(c);
      btn.addEventListener('click', () => { if (S.bgId === b.id) return; commitFloating(); pushUndo(); S.bgId = b.id; paintBg(); SFX.play('whoosh'); });
      bg.appendChild(btn);
    });
    $('#btn-coloring').textContent = '📖 ' + t('optColoring');
    $('#btn-coloring').onclick = () => { SFX.play('pop'); showColoringDialog(); };
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    updateOptionStates();
    paintBg();
  }
  function buildStampGrid() {
    const g = $('#stamp-grid'); g.innerHTML = '';
    (window.STAMPS[S.stampCat] || []).forEach((em) => {
      const b = document.createElement('button'); b.className = 'stamp-btn'; b.textContent = em; b.dataset.em = em;
      b.addEventListener('click', () => { S.stamp = em; SFX.play('pop'); updateOptionStates(); renderOverlay(); });
      g.appendChild(b);
    });
    updateOptionStates();
  }
  function updateOptionStates() {
    $$('[data-fill]').forEach((b) => b.classList.toggle('active', b.dataset.fill === S.fill));
    $$('[data-sym]').forEach((b) => b.classList.toggle('active', b.dataset.sym === S.sym));
    $$('[data-cat]').forEach((b) => b.classList.toggle('active', b.dataset.cat === S.stampCat));
    $$('.stamp-btn').forEach((b) => b.classList.toggle('active', b.dataset.em === S.stamp));
    $('#btn-bold').classList.toggle('active', S.bold); $('#btn-italic').classList.toggle('active', S.italic);
    $('#size').value = S.size; $('#size-out').textContent = S.size;
    $('#opacity').value = S.opacity; $('#opacity-out').textContent = S.opacity + '%';
    const d = Math.min(44, 4 + S.size * 0.5); const dot = $('#size-dot'); dot.style.width = d + 'px'; dot.style.height = d + 'px'; dot.style.background = S.color;
    dot.style.opacity = String(S.opacity / 100);
  }
  function updatePanels() {
    const tool = S.tool;
    $('#p-shape').hidden = !SHAPES.has(tool) || tool === 'line' || tool === 'arrow';
    $('#p-text').hidden = tool !== 'text';
    $('#p-stamp').hidden = tool !== 'stamp';
    $('#p-select').hidden = !(tool === 'select' && SEL);
    $('#p-size').hidden = tool === 'fill' || tool === 'picker' || tool === 'select';
    $('#p-sym').hidden = !(FREEHAND.has(tool) || tool === 'stamp');
  }

  function setTool(id) {
    if (id === S.tool) { updatePanels(); return; }
    commitText();
    if (id !== 'select') commitSelection();
    if (id === 'picker') S.prevTool = S.tool; else S.prevTool = S.tool;
    S.tool = id;
    $$('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === id));
    cvOver.style.cursor = id === 'text' ? 'text' : 'crosshair';
    updatePanels(); renderOverlay();
    const tip = t('tip.' + id); if (tip && tip !== 'tip.' + id) say(tip, 3800);
  }
  function setSize2(v) { S.size = clamp(Math.round(v), 1, 80); store.set('size', S.size); updateOptionStates(); positionTextbox(); renderOverlay(); }
  function setColor(hex, which, addRecent) {
    hex = hex.toUpperCase();
    if (which === 'secondary') { S.color2 = hex; store.set('color2', hex); }
    else { S.color = hex; store.set('color', hex); }
    $('#cur-1').style.background = S.color; $('#cur-2').style.background = S.color2;
    $$('.sw').forEach((b) => b.classList.toggle('sel', b.dataset.color && b.dataset.color.toUpperCase() === S.color));
    if (addRecent) { recent = [hex].concat(recent.filter((c) => c !== hex)).slice(0, 8); store.set('recent', recent); buildRecent(); }
    updateOptionStates();
    if (textState) { textState.col = S.color; positionTextbox(); }
  }
  function buildRecent() {
    const r = $('#recent'); r.innerHTML = '';
    recent.forEach((hex) => {
      const b = document.createElement('button'); b.className = 'sw'; b.style.background = hex; b.title = hex;
      b.addEventListener('click', () => { setColor(hex, 'primary', false); SFX.play('color'); });
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); setColor(hex, 'secondary', false); });
      r.appendChild(b);
    });
  }

  /* ---------- acciones ---------- */
  async function handleAction(a) {
    const typing = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
    switch (a) {
      case 'new': showNewDialog(); break;
      case 'open': doOpen(); break;
      case 'gallery': showGallery(); break;
      case 'save': saveToGallery(); break;
      case 'export': showExportDialog(); break;
      case 'print': doPrint(); break;
      case 'undo': if (typing) document.execCommand('undo'); else doUndo(); break;
      case 'redo': if (typing) document.execCommand('redo'); else doRedo(); break;
      case 'clear': {
        commitFloating();
        const ok = await confirmDialog({ title: t('confirmClearTitle'), text: t('confirmClearText'), cls: 'red' });
        if (ok) { pushUndo(); dctx.clearRect(0, 0, S.W, S.H); SFX.play('whoosh'); toast(t('cleared')); }
        break;
      }
      case 'zoomin': setZoom(S.zoom * 1.2, true); break;
      case 'zoomout': setZoom(S.zoom / 1.2, true); break;
      case 'zoomfit': fit(); break;
      case 'sound': S.sound = !S.sound; SFX.set(S.sound); store.set('sound', S.sound); $('#btn-sound').innerHTML = (S.sound ? ICONS.soundOn : ICONS.soundOff) + `<span>${esc(t('sound'))}</span>`; if (S.sound) SFX.play('pop'); break;
      case 'lang': toggleLang(); break;
      case 'help': showHelp(); break;
      case 'full': toggleFullscreen(); break;
      case 'copy': if (typing) document.execCommand('copy'); else if (SEL) { await copySelection(false); toast(t('copied')); } break;
      case 'cut': if (typing) document.execCommand('cut'); else if (SEL) { await copySelection(true); } break;
      case 'paste': if (typing) document.execCommand('paste'); else await pasteImage(); break;
      case 'selectall': if (typing) document.execCommand('selectAll'); else selectAll(); break;
      default: break;
    }
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
  }
  function toggleLang() {
    lang = lang === 'es' ? 'en' : 'es'; store.set('lang', lang);
    rebuildUI();
  }
  function rebuildUI() {
    document.documentElement.lang = lang;
    buildTopbar(); buildTools(); buildOptions(); buildPalette(); buildRecent();
    setColor(S.color, 'primary', false); updatePanels();
    $('#btn-sound').innerHTML = (S.sound ? ICONS.soundOn : ICONS.soundOff) + `<span>${esc(t('sound'))}</span>`;
    applyZoom();
  }

  /* ---------- sliders ---------- */
  $('#size').addEventListener('input', (e) => setSize2(+e.target.value));
  $('#opacity').addEventListener('input', (e) => { S.opacity = +e.target.value; updateOptionStates(); renderOverlay(); });
  const customInput = $('#custom-color');
  let customTarget = 'primary';
  customInput.addEventListener('input', (e) => setColor(e.target.value, customTarget, false));
  customInput.addEventListener('change', (e) => { setColor(e.target.value, customTarget, true); customTarget = 'primary'; });
  $('#cur-1').addEventListener('click', () => { customTarget = 'primary'; customInput.value = S.color.toLowerCase(); customInput.click(); });
  $('#cur-2').addEventListener('click', () => { customTarget = 'secondary'; customInput.value = S.color2.toLowerCase(); customInput.click(); });
  $('#btn-swap').addEventListener('click', () => { const a = S.color, b = S.color2; setColor(b, 'primary', false); setColor(a, 'secondary', false); SFX.play('pop'); });

  /* ---------- teclado ---------- */
  const KEYS = { p: 'pencil', b: 'brush', m: 'marker', c: 'crayon', e: 'eraser', g: 'fill', t: 'text', l: 'line', r: 'rect', o: 'ellipse', i: 'picker', s: 'stamp', x: 'select' };
  window.addEventListener('keydown', (e) => {
    const typing = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT');
    if (e.key === 'Escape' && modalEl && !modalEl.querySelector('.splash')) { closeModal(); return; }
    if (modalEl) return;
    if (typing) return;
    const mod = e.ctrlKey || e.metaKey;
    if (e.code === 'Space') { if (!spaceDown) { spaceDown = true; paper.classList.add('pan'); } e.preventDefault(); return; }
    if (mod) {
      if (!IS_WEB) return; // en la app de escritorio lo maneja el menú
      const k = e.key.toLowerCase(); let a = null;
      if (k === 'z') a = e.shiftKey ? 'redo' : 'undo'; else if (k === 'y') a = 'redo'; else if (k === 's') a = 'save'; else if (k === 'e') a = 'export';
      else if (k === 'n') a = 'new'; else if (k === 'o') a = 'open'; else if (k === 'p') a = 'print'; else if (k === 'c') a = 'copy'; else if (k === 'x') a = 'cut'; else if (k === 'v') a = 'paste'; else if (k === 'a') a = 'selectall';
      else if (k === '=' || k === '+') a = 'zoomin'; else if (k === '-') a = 'zoomout'; else if (k === '0') a = 'zoomfit';
      if (a) { e.preventDefault(); handleAction(a); }
      return;
    }
    if (e.key === '[') { setSize2(S.size - (S.size > 20 ? 4 : 2)); return; }
    if (e.key === ']') { setSize2(S.size + (S.size >= 20 ? 4 : 2)); return; }
    if (e.key === 'F1') { showHelp(); return; }
    if (SEL) {
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); return; }
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); commitSelection(); return; }
      const step = e.shiftKey ? 10 : 1; let moved = true;
      if (e.key === 'ArrowLeft') SEL.x -= step; else if (e.key === 'ArrowRight') SEL.x += step; else if (e.key === 'ArrowUp') SEL.y -= step; else if (e.key === 'ArrowDown') SEL.y += step; else moved = false;
      if (moved) { e.preventDefault(); SEL.moved = true; positionSelbox(); renderOverlay(); return; }
    }
    const tool = KEYS[e.key.toLowerCase()];
    if (tool) setTool(tool);
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') { spaceDown = false; paper.classList.remove('pan'); } });
  window.addEventListener('blur', () => { spaceDown = false; paper.classList.remove('pan'); });
  window.addEventListener('resize', () => { if (S.fitMode) fit(); });
  window.addEventListener('pagehide', () => { try { autosave(); } catch (_) { /* nada */ } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) autosave(); });

  if (api && api.onMenu) api.onMenu((a) => handleAction(a));

  /* =====================================================================
     Inicio
     ===================================================================== */
  async function init() {
    SFX.set(S.sound);
    setSize(1280, 800);
    buildWordmark();
    buildPalette();
    rebuildUI();
    setColor(S.color, 'primary', false);
    setColor(S.color2, 'secondary', false);
    updateOptionStates();
    // el primer toque activa el audio
    window.addEventListener('pointerdown', () => { SFX.play('click'); }, { once: true });
    setTimeout(fit, 30);
    setTimeout(fit, 300);
    showSplash();
  }

  if (DEBUG) {
    window.MLA = { S, setTool, setColor, setSize: setSize2, undoStack, redoStack, doUndo, doRedo, composite, cvDraw, newDrawing, floodFill, saveToGallery, DB, showSplash, closeModal, handleAction, getSel: () => SEL, setLines, loadRecord, exportFile, dataUrlFor, t, setLang: (l) => { lang = l; rebuildUI(); } };
  }
  init();
})();
