/* Colores, sellos, fondos y libros para colorear */
(function () {
  /* ---------- paleta ---------- */
  const STRONG = ['#E53935', '#FF7043', '#FFB300', '#FDD835', '#C0CA33', '#43A047', '#00897B', '#00ACC1', '#1E88E5', '#3949AB', '#8E24AA', '#D81B60', '#8D6E63', '#546E7A', '#000000', '#FFFFFF', '#D9A066', '#8D5524'];
  const LIGHT = ['#FF8A80', '#FFAB91', '#FFE082', '#FFF59D', '#E6EE9C', '#A5D6A7', '#80CBC4', '#80DEEA', '#90CAF9', '#9FA8DA', '#CE93D8', '#F48FB1', '#BCAAA4', '#B0BEC5', '#757575', '#E0E0E0', '#F6D5B8', '#5D4037'];
  window.PALETTE = [STRONG, LIGHT];

  /* ---------- sellos (emojis compatibles con Mac y Windows 10+) ---------- */
  window.STAMPS = {
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦉', '🦋', '🐛', '🐝', '🐞', '🐢', '🐙', '🐠', '🐬', '🐳', '🦀'],
    food: ['🍎', '🍌', '🍇', '🍓', '🍉', '🍒', '🍑', '🍍', '🥕', '🌽', '🍕', '🍔', '🍟', '🍦', '🍩', '🍪', '🎂', '🍭'],
    nature: ['☀️', '🌙', '⭐', '🌈', '☁️', '🔥', '💧', '🌸', '🌻', '🌼', '🌷', '🌹', '🌲', '🌵', '🍀', '🍄', '❄️', '⚡'],
    fun: ['❤️', '💛', '💚', '💙', '💜', '🎈', '🎁', '🎉', '👑', '🎵', '⚽', '🏀', '🎨', '🎸', '🎹', '🏆', '💎', '🔔'],
    travel: ['🚀', '🛸', '🌍', '🚗', '🚌', '🚓', '🚒', '🚁', '✈️', '🚢', '🚲', '🏠', '🏰', '⛺', '🎡', '🗻'],
    faces: ['😀', '😍', '😎', '🤩', '😂', '🥳', '😴', '🤖', '👻', '👽', '😺', '😇']
  };

  /* ---------- fondos de papel ---------- */
  function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function vgrad(c, H, stops) {
    const g = c.createLinearGradient(0, 0, 0, H);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  }
  window.BACKGROUNDS = [
    { id: 'white', paint(c, W, H) { c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H); } },
    { id: 'cream', paint(c, W, H) { c.fillStyle = '#FFF6DC'; c.fillRect(0, 0, W, H); } },
    { id: 'sky', paint(c, W, H) { c.fillStyle = vgrad(c, H, [[0, '#4FC3F7'], [1, '#E1F5FE']]); c.fillRect(0, 0, W, H); } },
    {
      id: 'grass', paint(c, W, H) {
        c.fillStyle = vgrad(c, H, [[0, '#81D4FA'], [1, '#E1F5FE']]); c.fillRect(0, 0, W, H);
        c.fillStyle = '#9CCC65'; c.beginPath(); c.ellipse(W * 0.28, H * 1.02, W * 0.7, H * 0.28, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#7CB342'; c.beginPath(); c.ellipse(W * 0.82, H * 1.08, W * 0.65, H * 0.26, 0, 0, Math.PI * 2); c.fill();
      }
    },
    { id: 'sunset', paint(c, W, H) { c.fillStyle = vgrad(c, H, [[0, '#7E57C2'], [0.45, '#F06292'], [0.75, '#FF8A65'], [1, '#FFE082']]); c.fillRect(0, 0, W, H); } },
    {
      id: 'night', paint(c, W, H) {
        c.fillStyle = vgrad(c, H, [[0, '#0D1B4F'], [1, '#4527A0']]); c.fillRect(0, 0, W, H);
        const r = rng(42); c.fillStyle = '#FFFDE7';
        const n = Math.round((W * H) / 9000);
        for (let i = 0; i < n; i++) {
          const x = r() * W, y = r() * H, s = 0.8 + r() * 2.2;
          c.globalAlpha = 0.5 + r() * 0.5; c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;
      }
    },
    {
      id: 'sea', paint(c, W, H) {
        c.fillStyle = vgrad(c, H, [[0, '#E0F7FA'], [0.35, '#4DD0E1'], [1, '#0277BD']]); c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 4; c.lineCap = 'round';
        const r = rng(7);
        for (let i = 0; i < 26; i++) {
          const x = r() * W, y = H * (0.35 + r() * 0.62), w = 50 + r() * 70;
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w / 4, y - 12, x + w / 2, y); c.quadraticCurveTo(x + (3 * w) / 4, y + 12, x + w, y); c.stroke();
        }
      }
    },
    { id: 'pink', paint(c, W, H) { c.fillStyle = '#FCE4EC'; c.fillRect(0, 0, W, H); } },
    {
      id: 'grid', paint(c, W, H) {
        c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H);
        c.strokeStyle = '#BBDEFB'; c.lineWidth = 2; c.beginPath();
        for (let x = 0; x <= W; x += 40) { c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); }
        for (let y = 0; y <= H; y += 40) { c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); }
        c.stroke();
      }
    },
    {
      id: 'dots', paint(c, W, H) {
        c.fillStyle = '#FFF6DC'; c.fillRect(0, 0, W, H);
        c.fillStyle = '#FFCC80';
        for (let y = 20; y < H; y += 40) for (let x = 20; x < W; x += 40) { c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI * 2); c.fill(); }
      }
    }
  ];

  /* ---------- libros para colorear (SVG 1280x800) ---------- */
  const P = (r, a, cx, cy) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const f = (n) => Math.round(n * 10) / 10;
  const deg = (d) => (d * Math.PI) / 180;

  function wrap(inner) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"><style>*{vector-effect:non-scaling-stroke}</style><g fill="none" stroke="#222" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
  }
  function cloud(x, y, s) {
    // nube cerrada: base en (x,y), ancho aprox 200*s
    const k = s || 1;
    const p = (dx, dy) => `${f(x + dx * k)} ${f(y + dy * k)}`;
    return `<path d="M${p(0, 0)} A${40 * k} ${40 * k} 0 0 1 ${p(0, -70)} A${55 * k} ${55 * k} 0 0 1 ${p(100, -85)} A${60 * k} ${60 * k} 0 0 1 ${p(190, -55)} A${40 * k} ${40 * k} 0 0 1 ${p(180, 0)} Z"/>`;
  }
  function flower(cx, cy, n, r, len, color) {
    const w = (Math.sin(Math.PI / n) * (r + len * 0.5)) * 0.92;
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = (360 / n) * i;
      s += `<ellipse cx="${cx}" cy="${f(cy - r - len / 2)}" rx="${f(w)}" ry="${f(len / 2)}" transform="rotate(${a} ${cx} ${cy})"/>`;
    }
    s += `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
    return s;
  }
  function star5(cx, cy, R) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 === 0 ? R : R * 0.45;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push(`${f(cx + rr * Math.cos(a))} ${f(cy + rr * Math.sin(a))}`);
    }
    return `<path d="M${pts.join(' L')} Z"/>`;
  }
  function stem(x, y0, y1, w) { return `<path d="M${x - w / 2} ${y0} H${x + w / 2} V${y1} H${x - w / 2} Z"/>`; }

  const pages = {
    sun() {
      const cx = 640, cy = 340, R = 135;
      let rays = '';
      for (let i = 0; i < 12; i++) {
        const a = deg(i * 30);
        const [x1, y1] = P(R, a - deg(7), cx, cy), [x2, y2] = P(R, a + deg(7), cx, cy), [tx, ty] = P(R + 80, a, cx, cy);
        rays += `<path d="M${f(x1)} ${f(y1)} L${f(tx)} ${f(ty)} L${f(x2)} ${f(y2)} A${R} ${R} 0 0 0 ${f(x1)} ${f(y1)} Z"/>`;
      }
      return wrap(
        rays + `<circle cx="${cx}" cy="${cy}" r="${R}"/>` +
        `<circle cx="595" cy="315" r="13" fill="#222"/><circle cx="685" cy="315" r="13" fill="#222"/>` +
        `<path d="M565 375 Q640 440 715 375"/><circle cx="560" cy="360" r="20"/><circle cx="720" cy="360" r="20"/>` +
        cloud(70, 190, 0.9) + cloud(1010, 150, 0.8) +
        `<path d="M0 800 V650 Q240 560 470 630 T900 610 T1280 600 V800 Z"/><path d="M0 800 V730 Q330 670 640 725 T1280 705 V800 Z"/>` +
        flower(180, 640, 6, 18, 34) + stem(180, 700, 745, 14) + flower(1060, 640, 6, 18, 34) + stem(1060, 700, 740, 14) +
        flower(900, 750, 5, 12, 22)
      );
    },
    house() {
      let fence = '';
      for (let i = 0; i < 5; i++) { const x = 40 + i * 58; fence += `<path d="M${x} 650 V570 L${x + 22} 540 L${x + 44} 570 V650 Z"/>`; }
      return wrap(
        `<path d="M0 800 V650 H1280 V800 Z"/><path d="M560 650 L500 800 M640 650 L720 800"/>` +
        `<rect x="380" y="380" width="440" height="270"/>` +
        `<path d="M350 392 L600 200 L850 392 Z"/>` +
        `<path d="M715 287 V225 H775 V333"/>` +
        `<circle cx="600" cy="320" r="32"/><path d="M600 288 V352 M568 320 H632"/>` +
        `<rect x="560" y="510" width="80" height="140"/><circle cx="620" cy="585" r="7" fill="#222"/>` +
        `<rect x="420" y="440" width="90" height="90"/><path d="M465 440 V530 M420 485 H510"/>` +
        `<rect x="690" y="440" width="90" height="90"/><path d="M735 440 V530 M690 485 H780"/>` +
        `<rect x="950" y="470" width="55" height="180"/>` +
        `<path d="M890 470 A62 62 0 0 1 905 360 A72 72 0 0 1 1040 340 A64 64 0 0 1 1070 470 Z"/>` +
        `<circle cx="945" cy="415" r="14"/><circle cx="1010" cy="385" r="14"/><circle cx="1030" cy="440" r="14"/>` +
        fence + `<path d="M30 585 H280 M30 628 H280"/>` +
        `<circle cx="150" cy="140" r="58"/>` +
        `<path d="M150 50 V25 M150 230 V255 M60 140 H35 M240 140 H265 M86 76 L68 58 M214 76 L232 58 M86 204 L68 222 M214 204 L232 222"/>` +
        cloud(960, 150, 0.9)
      );
    },
    flowers() {
      const leaf = (x, y, d) => `<path d="M${x} ${y} Q${x + 70 * d} ${y - 60} ${x + 120 * d} ${y - 20} Q${x + 70 * d} ${y + 40} ${x} ${y} Z"/>`;
      return wrap(
        `<path d="M0 800 V735 Q320 690 640 735 T1280 722 V800 Z"/>` +
        stem(320, 470, 745, 18) + leaf(329, 620, 1) + leaf(311, 570, -1) + flower(320, 335, 8, 46, 84) +
        stem(640, 340, 735, 20) + leaf(650, 560, 1) + leaf(630, 480, -1) + flower(640, 235, 6, 36, 66) +
        stem(960, 470, 735, 18) + leaf(969, 640, 1) + leaf(951, 560, -1) + flower(960, 350, 10, 42, 76) +
        cloud(80, 140, 0.8) + cloud(1020, 110, 0.8) +
        `<circle cx="1160" cy="300" r="42"/>` +
        `<path d="M1160 235 V215 M1160 365 V385 M1095 300 H1075 M1225 300 H1245 M1114 254 L1100 240 M1206 254 L1220 240 M1114 346 L1100 360 M1206 346 L1220 360"/>`
      );
    },
    fish() {
      const body = 'M260 400 C330 250 620 230 800 340 L990 230 Q950 400 990 570 L800 460 C620 580 330 550 260 400 Z';
      let scales = '';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const x = 520 + c * 70 + (r % 2) * 35, y = 340 + r * 55; scales += `<path d="M${x} ${y} A30 30 0 0 1 ${x + 50} ${y + 0}"/>`; }
      const bub = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
      const weed = (x) => `<path d="M${x} 742 C${x - 55} 690 ${x + 35} 630 ${x - 8} 545 C${x + 75} 625 ${x + 30} 690 ${x + 50} 742 Z"/>`;
      return wrap(
        `<path d="${body}"/>` + `<path d="M520 275 Q600 170 710 300 Z"/>` + `<path d="M560 520 Q620 610 700 500 Z"/>` +
        `<circle cx="365" cy="375" r="24"/><circle cx="365" cy="375" r="10" fill="#222"/>` +
        `<path d="M470 300 Q430 400 470 500"/><path d="M262 425 Q300 445 335 425"/>` + scales +
        bub(200, 250, 26) + bub(150, 170, 16) + bub(235, 140, 12) + bub(1090, 330, 22) + bub(1140, 250, 14) +
        `<g transform="translate(930 40) scale(.34)"><path d="${body}"/><circle cx="365" cy="375" r="24"/></g>` +
        `<path d="M0 800 V730 Q200 690 400 735 T800 725 T1280 720 V800 Z"/>` +
        weed(130) + weed(1100) + weed(1180) +
        `<path d="M260 770 A28 28 0 0 1 316 770 Z"/><path d="M600 780 A22 22 0 0 1 644 780 Z"/>` +
        `<path d="M0 60 Q80 20 160 60 T320 60 T480 60 T640 60 T800 60 T960 60 T1120 60 T1280 60"/>`
      );
    },
    rocket() {
      let stars = star5(160, 560, 34) + star5(1120, 640, 28) + star5(1180, 420, 22) + star5(300, 130, 22) + star5(980, 90, 26) + star5(110, 360, 18);
      return wrap(
        `<path d="M640 80 C740 165 775 290 765 470 H515 C505 290 540 165 640 80 Z"/>` +
        `<path d="M518 380 H762"/>` +
        `<circle cx="640" cy="260" r="58"/><circle cx="640" cy="260" r="38"/>` +
        `<path d="M520 400 C465 430 435 500 425 590 L518 510 Z"/><path d="M760 400 C815 430 845 500 855 590 L762 510 Z"/>` +
        `<path d="M570 470 H710 L732 520 H548 Z"/>` +
        `<path d="M575 520 Q560 625 640 730 Q720 625 705 520 Z"/><path d="M612 535 Q602 595 640 645 Q678 595 668 535 Z"/>` +
        `<circle cx="1040" cy="200" r="85"/><path d="M965 170 Q1040 215 1115 170 M958 230 Q1040 275 1122 230"/><circle cx="1000" cy="130" r="0"/>` +
        `<path d="M250 110 A85 85 0 1 0 250 280 A120 120 0 0 1 250 110 Z"/>` +
        stars + cloud(380, 760, 0.8) + cloud(790, 780, 0.9)
      );
    },
    icecream() {
      const cone = (cx, scoopR, topY, deco) => {
        const x0 = cx - scoopR * 0.85, x1 = cx + scoopR * 0.85, tipY = topY + 310;
        let grid = '';
        for (let i = -8; i <= 8; i++) {
          grid += `<path d="M${cx + i * 40 - 400} ${topY} L${cx + i * 40 + 400} ${tipY + 400}"/><path d="M${cx + i * 40 + 400} ${topY} L${cx + i * 40 - 400} ${tipY + 400}"/>`;
        }
        const id = 'cl' + cx;
        const sc = scoopR;
        const s = `<path d="M${cx - sc} ${topY - 10} A${sc} ${sc} 0 0 1 ${cx + sc} ${topY - 10} Q${cx + sc * 0.78} ${topY + 28} ${cx + sc * 0.58} ${topY - 10} Q${cx + sc * 0.4} ${topY + 32} ${cx + sc * 0.2} ${topY - 10} Q${cx} ${topY + 32} ${cx - sc * 0.2} ${topY - 10} Q${cx - sc * 0.4} ${topY + 30} ${cx - sc * 0.58} ${topY - 10} Q${cx - sc * 0.78} ${topY + 26} ${cx - sc} ${topY - 10} Z"/>`;
        return `<clipPath id="${id}"><path d="M${x0} ${topY + 14} L${x1} ${topY + 14} L${cx} ${tipY} Z"/></clipPath><g clip-path="url(#${id})">${grid}</g>` +
          `<path d="M${x0} ${topY + 14} L${x1} ${topY + 14} L${cx} ${tipY} Z"/>` + s + deco;
      };
      const sprinkles = (cx, cy) => { let s = ''; [[-50, -20, 20], [10, -60, -30], [55, -10, 50], [-20, 20, -10], [30, 25, 70], [-65, 15, 80]].forEach(([dx, dy, a]) => { s += `<path d="M${cx + dx - 9} ${cy + dy} h18" transform="rotate(${a} ${cx + dx} ${cy + dy})"/>`; }); return s; };
      const cherry = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="26"/><path d="M${cx} ${cy - 26} Q${cx + 8} ${cy - 70} ${cx + 44} ${cy - 84}"/>`;
      return wrap(
        cone(380, 120, 430, cherry(380, 276)) + sprinkles(380, 360) +
        cone(900, 105, 440, cherry(900, 300)) +
        `<path d="M1010 260 L1100 150 L1130 180 L1040 290 Z"/>` +
        star5(160, 160, 40) + star5(640, 120, 28) + star5(1150, 560, 34) + star5(110, 520, 24) +
        `<path d="M620 560 C560 500 600 440 640 480 C680 440 720 500 660 560 L640 590 Z"/>`
      );
    },
    butterfly() {
      const wings =
        `<path d="M620 362 C520 120 250 120 200 270 C180 380 330 430 620 412 Z"/>` +
        `<path d="M620 432 C470 440 260 480 280 600 C300 700 520 690 620 480 Z"/>` +
        `<circle cx="400" cy="262" r="62"/><circle cx="400" cy="262" r="30"/><circle cx="305" cy="330" r="22"/><circle cx="480" cy="345" r="18"/>` +
        `<circle cx="440" cy="565" r="50"/><circle cx="520" cy="520" r="20"/><circle cx="350" cy="590" r="16"/>`;
      return wrap(
        wings + `<g transform="translate(1280 0) scale(-1 1)">${wings}</g>` +
        `<ellipse cx="640" cy="448" rx="22" ry="138"/><circle cx="640" cy="288" r="30"/>` +
        `<path d="M628 262 Q600 190 560 160 M652 262 Q680 190 720 160"/><circle cx="556" cy="156" r="11"/><circle cx="724" cy="156" r="11"/>` +
        flower(130, 690, 6, 16, 30) + stem(130, 740, 800, 12) + flower(1150, 690, 6, 16, 30) + stem(1150, 740, 800, 12) +
        cloud(60, 140, 0.55) + cloud(1090, 120, 0.55)
      );
    },
    car() {
      let dashes = '';
      for (let i = 0; i < 6; i++) dashes += `<rect x="${60 + i * 220}" y="740" width="120" height="24" rx="8"/>`;
      return wrap(
        `<path d="M180 580 V490 Q180 440 230 440 H950 Q1000 440 1000 490 V580 H885 A85 85 0 0 0 715 580 H435 A85 85 0 0 0 265 580 Z"/>` +
        `<path d="M330 440 L405 330 H640 L745 440"/>` +
        `<path d="M372 430 L420 352 H500 V430 Z"/><path d="M522 430 V352 H622 L690 430 Z"/>` +
        `<path d="M510 450 V575"/><path d="M530 505 h40"/>` +
        `<circle cx="350" cy="580" r="68"/><circle cx="350" cy="580" r="36"/><circle cx="350" cy="580" r="10" fill="#222"/>` +
        `<circle cx="800" cy="580" r="68"/><circle cx="800" cy="580" r="36"/><circle cx="800" cy="580" r="10" fill="#222"/>` +
        `<circle cx="955" cy="495" r="22"/><path d="M200 500 h40"/>` +
        `<path d="M0 665 H1280"/><path d="M0 720 H1280"/>` + dashes +
        `<circle cx="1100" cy="150" r="62"/><path d="M1100 55 V30 M1100 245 V270 M1005 150 H980 M1195 150 H1220 M1033 83 L1015 65 M1167 83 L1185 65 M1033 217 L1015 235 M1167 217 L1185 235"/>` +
        cloud(120, 190, 0.9) + cloud(560, 150, 0.7)
      );
    },
    cat() {
      return wrap(
        `<path d="M300 300 L330 120 L470 250 Q640 215 810 250 L950 120 L980 300 Q1020 400 990 500 Q930 660 640 680 Q350 660 290 500 Q260 400 300 300 Z"/>` +
        `<path d="M340 238 L340 172 L420 235 Z"/><path d="M940 238 L940 172 L860 235 Z"/>` +
        `<ellipse cx="500" cy="400" rx="55" ry="65"/><ellipse cx="780" cy="400" rx="55" ry="65"/>` +
        `<ellipse cx="505" cy="410" rx="22" ry="42" fill="#222"/><ellipse cx="775" cy="410" rx="22" ry="42" fill="#222"/>` +
        `<path d="M610 478 H670 L640 515 Z"/><path d="M640 515 V548 M640 548 Q610 588 570 562 M640 548 Q670 588 710 562"/>` +
        `<path d="M430 520 L270 490 M430 545 L260 555 M435 572 L285 622 M850 520 L1010 490 M850 545 L1020 555 M845 572 L995 622"/>` +
        `<path d="M640 262 V322 M582 272 L592 322 M698 272 L688 322"/>` +
        `<circle cx="1120" cy="650" r="85"/><path d="M1060 600 Q1120 650 1065 705 M1090 575 Q1160 650 1100 730 M1140 568 Q1195 640 1160 722 M1035 640 Q1120 660 1200 630"/>` +
        `<path d="M110 700 C150 640 250 640 290 700 L360 640 L360 760 L290 700 C250 760 150 760 110 700 Z"/><circle cx="160" cy="690" r="9" fill="#222"/>`
      );
    },
    robot() {
      let teeth = '';
      for (let i = 1; i < 5; i++) teeth += `<path d="M${540 + i * 40} 260 V305"/>`;
      return wrap(
        `<path d="M640 90 V35"/><circle cx="640" cy="22" r="18"/>` +
        `<rect x="450" y="90" width="380" height="250" rx="34"/>` +
        `<rect x="500" y="150" width="100" height="80" rx="18"/><rect x="680" y="150" width="100" height="80" rx="18"/>` +
        `<circle cx="550" cy="190" r="20" fill="#222"/><circle cx="730" cy="190" r="20" fill="#222"/>` +
        `<rect x="540" y="260" width="200" height="45" rx="12"/>` + teeth +
        `<rect x="414" y="170" width="36" height="100" rx="10"/><rect x="830" y="170" width="36" height="100" rx="10"/>` +
        `<rect x="600" y="340" width="80" height="40"/>` +
        `<rect x="400" y="380" width="480" height="270" rx="34"/>` +
        `<rect x="470" y="430" width="340" height="130" rx="16"/>` +
        `<circle cx="540" cy="495" r="30"/><circle cx="640" cy="495" r="30"/><circle cx="740" cy="495" r="30"/>` +
        `<path d="M470 600 H810"/><rect x="590" y="585" width="100" height="0"/>` +
        `<rect x="290" y="395" width="90" height="230" rx="42"/><rect x="900" y="395" width="90" height="230" rx="42"/>` +
        `<circle cx="335" cy="665" r="38"/><circle cx="945" cy="665" r="38"/>` +
        `<rect x="470" y="650" width="90" height="90" rx="12"/><rect x="720" y="650" width="90" height="90" rx="12"/>` +
        `<rect x="430" y="740" width="150" height="50" rx="22"/><rect x="700" y="740" width="150" height="50" rx="22"/>` +
        star5(160, 160, 40) + star5(1130, 150, 34) + star5(140, 420, 22) + star5(1150, 360, 26)
      );
    },
    mandala() {
      const cx = 640, cy = 400;
      let s = '';
      [38, 95, 165, 235, 300, 365].forEach((r) => { s += `<circle cx="${cx}" cy="${cy}" r="${r}"/>`; });
      const radial = (r0, r1, n, off) => {
        let t = '';
        for (let i = 0; i < n; i++) { const a = ((i + (off || 0)) * 2 * Math.PI) / n; const [x1, y1] = P(r0, a, cx, cy), [x2, y2] = P(r1, a, cx, cy); t += `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}"/>`; }
        return t;
      };
      s += radial(38, 95, 8) + radial(95, 165, 16) + radial(165, 235, 16, 0.5) + radial(235, 300, 16) + radial(300, 365, 32);
      for (let i = 0; i < 16; i++) { const a = ((i + 0.5) * 2 * Math.PI) / 16; const [x, y] = P(130, a, cx, cy); s += `<circle cx="${f(x)}" cy="${f(y)}" r="16"/>`; }
      for (let i = 0; i < 16; i++) {
        const a = ((i + 0.5) * 2 * Math.PI) / 16, w = deg(7);
        const [x1, y1] = P(245, a - w, cx, cy), [x2, y2] = P(245, a + w, cx, cy), [x3, y3] = P(292, a, cx, cy);
        s += `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)} Z"/>`;
      }
      for (let i = 0; i < 8; i++) { const a = ((i + 0.5) * 2 * Math.PI) / 8; const [x, y] = P(66, a, cx, cy); s += `<circle cx="${f(x)}" cy="${f(y)}" r="9"/>`; }
      for (let i = 0; i < 16; i++) { const a = (i * 2 * Math.PI) / 16; const [x, y] = P(332, a + deg(11.25), cx, cy); s += `<circle cx="${f(x)}" cy="${f(y)}" r="12"/>`; }
      return wrap(s);
    }
  };

  window.PAGES = Object.keys(pages).map((id) => ({ id, svg: pages[id] }));
})();
