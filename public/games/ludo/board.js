/**
 * Classic 15×15 Ludo board geometry (cell centers).
 * Path index 0 = red start, 13 = green, 26 = yellow, 39 = blue.
 */
(function (global) {
  const PATH = [
    [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [6, 8],
    [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    [0, 7],
    [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
    [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
    [7, 0],
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
    [14, 7],
    [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
    [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
    [7, 14],
  ];

  const HOME = {
    red:    [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
    green:  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    yellow: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    blue:   [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  };

  const YARD = {
    red:    [[1.5, 10.5], [3.5, 10.5], [1.5, 12.5], [3.5, 12.5]],
    green:  [[1.5, 1.5], [3.5, 1.5], [1.5, 3.5], [3.5, 3.5]],
    yellow: [[10.5, 1.5], [12.5, 1.5], [10.5, 3.5], [12.5, 3.5]],
    blue:   [[10.5, 10.5], [12.5, 10.5], [10.5, 12.5], [12.5, 12.5]],
  };

  const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  const START = { red: 0, green: 13, yellow: 26, blue: 39 };
  const MAIN_LEN = 51;

  const FILL = {
    red: '#d62828',
    green: '#2a9d3f',
    yellow: '#e9c46a',
    blue: '#1d6fd8',
  };

  function cellCenter(col, row) {
    return { x: col + 0.5, y: row + 0.5 };
  }

  function tokenXY(color, pos, tokenId) {
    if (pos < 0) {
      const y = YARD[color][tokenId];
      return { x: y[0], y: y[1] };
    }
    if (pos >= 56) return { x: 7.5, y: 7.5 };
    if (pos >= MAIN_LEN) {
      const h = HOME[color][pos - MAIN_LEN];
      return cellCenter(h[0], h[1]);
    }
    const abs = (START[color] + pos) % 52;
    const p = PATH[abs];
    return cellCenter(p[0], p[1]);
  }

  function star(cx, cy, r) {
    let d = '';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const b = a + Math.PI / 5;
      const x1 = cx + Math.cos(a) * r;
      const y1 = cy + Math.sin(a) * r;
      const x2 = cx + Math.cos(b) * (r * 0.4);
      const y2 = cy + Math.sin(b) * (r * 0.4);
      d += (i ? 'L' : 'M') + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + ' ';
    }
    return d + 'Z';
  }

  function drawStaticBoard() {
    let s = '';
    // wood frame
    s += `<rect x="0" y="0" width="15" height="15" fill="#5c3d2e"/>`;
    s += `<rect x="0.15" y="0.15" width="14.7" height="14.7" fill="#f3e9d7"/>`;

    // corner yards
    s += `<rect x="0.15" y="0.15" width="5.7" height="5.7" fill="${FILL.green}"/>`;
    s += `<rect x="9.15" y="0.15" width="5.7" height="5.7" fill="${FILL.yellow}"/>`;
    s += `<rect x="0.15" y="9.15" width="5.7" height="5.7" fill="${FILL.red}"/>`;
    s += `<rect x="9.15" y="9.15" width="5.7" height="5.7" fill="${FILL.blue}"/>`;

    // inner yard pads
    const pads = [
      [0.85, 0.85, FILL.green],
      [9.85, 0.85, FILL.yellow],
      [0.85, 9.85, FILL.red],
      [9.85, 9.85, FILL.blue],
    ];
    pads.forEach(([x, y, c]) => {
      s += `<rect x="${x}" y="${y}" width="4.3" height="4.3" rx="0.35" fill="#fff" opacity="0.92"/>`;
      s += `<circle cx="${x + 1.15}" cy="${y + 1.15}" r="0.72" fill="none" stroke="${c}" stroke-width="0.12"/>`;
      s += `<circle cx="${x + 3.15}" cy="${y + 1.15}" r="0.72" fill="none" stroke="${c}" stroke-width="0.12"/>`;
      s += `<circle cx="${x + 1.15}" cy="${y + 3.15}" r="0.72" fill="none" stroke="${c}" stroke-width="0.12"/>`;
      s += `<circle cx="${x + 3.15}" cy="${y + 3.15}" r="0.72" fill="none" stroke="${c}" stroke-width="0.12"/>`;
    });

    // white cross path background
    s += `<rect x="6" y="0.15" width="3" height="14.7" fill="#fff"/>`;
    s += `<rect x="0.15" y="6" width="14.7" height="3" fill="#fff"/>`;

    // draw all path cells
    PATH.forEach((p, i) => {
      const [c, r] = p;
      const isStart = i === 0 || i === 13 || i === 26 || i === 39;
      let fill = '#ffffff';
      if (i === 0) fill = FILL.red;
      if (i === 13) fill = FILL.green;
      if (i === 26) fill = FILL.yellow;
      if (i === 39) fill = FILL.blue;
      s += `<rect x="${c}" y="${r}" width="1" height="1" fill="${fill}" stroke="#1f1f1f" stroke-width="0.04"/>`;
      if (SAFE.has(i) && !isStart) {
        const cx = c + 0.5;
        const cy = r + 0.5;
        s += `<path d="${star(cx, cy, 0.32)}" fill="#333" opacity="0.55"/>`;
      }
    });

    // home columns
    HOME.red.forEach(([c, r]) => {
      s += `<rect x="${c}" y="${r}" width="1" height="1" fill="${FILL.red}" stroke="#1f1f1f" stroke-width="0.04"/>`;
    });
    HOME.green.forEach(([c, r]) => {
      s += `<rect x="${c}" y="${r}" width="1" height="1" fill="${FILL.green}" stroke="#1f1f1f" stroke-width="0.04"/>`;
    });
    HOME.yellow.forEach(([c, r]) => {
      s += `<rect x="${c}" y="${r}" width="1" height="1" fill="${FILL.yellow}" stroke="#1f1f1f" stroke-width="0.04"/>`;
    });
    HOME.blue.forEach(([c, r]) => {
      s += `<rect x="${c}" y="${r}" width="1" height="1" fill="${FILL.blue}" stroke="#1f1f1f" stroke-width="0.04"/>`;
    });

    // center home triangles
    s += `<polygon points="6,6 9,6 7.5,7.5" fill="${FILL.yellow}" stroke="#111" stroke-width="0.05"/>`;
    s += `<polygon points="6,6 6,9 7.5,7.5" fill="${FILL.green}" stroke="#111" stroke-width="0.05"/>`;
    s += `<polygon points="9,6 9,9 7.5,7.5" fill="${FILL.blue}" stroke="#111" stroke-width="0.05"/>`;
    s += `<polygon points="6,9 9,9 7.5,7.5" fill="${FILL.red}" stroke="#111" stroke-width="0.05"/>`;

    return s;
  }

  function pawn(x, y, color, legal, tokenId) {
    const fill = FILL[color];
    const cls = legal ? 'token legal' : 'token';
    return (
      `<g class="${cls}" data-token="${tokenId}" transform="translate(${x},${y})" style="cursor:pointer">` +
      `<ellipse cx="0" cy="0.28" rx="0.38" ry="0.14" fill="rgba(0,0,0,0.28)"/>` +
      `<circle cx="0" cy="-0.08" r="0.36" fill="${fill}" stroke="#111" stroke-width="0.06"/>` +
      `<circle cx="-0.1" cy="-0.18" r="0.1" fill="rgba(255,255,255,0.35)"/>` +
      `</g>`
    );
  }

  function dicePips(n) {
    const map = {
      1: [[50, 50]],
      2: [[28, 28], [72, 72]],
      3: [[28, 28], [50, 50], [72, 72]],
      4: [[28, 28], [28, 72], [72, 28], [72, 72]],
      5: [[28, 28], [28, 72], [50, 50], [72, 28], [72, 72]],
      6: [[28, 28], [28, 50], [28, 72], [72, 28], [72, 50], [72, 72]],
    };
    if (!n || n < 1 || n > 6) {
      return `<div class="die blank">?</div>`;
    }
    const dots = (map[n] || [])
      .map(([x, y]) => `<span class="pip" style="left:${x}%;top:${y}%"></span>`)
      .join('');
    return `<div class="die">${dots}</div>`;
  }

  global.LudoBoard = {
    tokenXY,
    drawStaticBoard,
    pawn,
    dicePips,
    FILL,
  };
})(typeof window !== 'undefined' ? window : global);
