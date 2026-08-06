(function () {
  const SIZE = 4;
  const KEY = 'nexus_2048_v1';
  const boardEl = document.getElementById('board');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const hintEl = document.getElementById('hint');
  const overlay = document.getElementById('overlay');
  const overTitle = document.getElementById('overTitle');
  const overScore = document.getElementById('overScore');

  let grid = [];
  let score = 0;
  let best = 0;
  let won = false;
  let over = false;

  function loadBest() {
    try {
      best = Number(localStorage.getItem(KEY) || 0) || 0;
    } catch (_) {
      best = 0;
    }
    bestEl.textContent = String(best);
  }

  function saveBest() {
    if (score > best) {
      best = score;
      bestEl.textContent = String(best);
      try {
        localStorage.setItem(KEY, String(best));
      } catch (_) {}
    }
  }

  function emptyCells() {
    const out = [];
    for (let i = 0; i < SIZE * SIZE; i++) if (!grid[i]) out.push(i);
    return out;
  }

  function spawn() {
    const empties = emptyCells();
    if (!empties.length) return;
    const i = empties[Math.floor(Math.random() * empties.length)];
    grid[i] = Math.random() < 0.9 ? 2 : 4;
  }

  function render(popIndex) {
    boardEl.innerHTML = '';
    for (let i = 0; i < SIZE * SIZE; i++) {
      const v = grid[i];
      const cell = document.createElement('div');
      cell.className = 'cell' + (v ? ' v' + Math.min(v, 2048) : '');
      if (v) cell.textContent = String(v);
      if (popIndex === i) cell.classList.add('pop');
      boardEl.appendChild(cell);
    }
    scoreEl.textContent = String(score);
  }

  function slideLine(line) {
    const filtered = line.filter((v) => v);
    const merged = [];
    let gained = 0;
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i] && filtered[i] === filtered[i + 1]) {
        const nv = filtered[i] * 2;
        merged.push(nv);
        gained += nv;
        if (nv === 2048) won = true;
        i++;
      } else {
        merged.push(filtered[i]);
      }
    }
    while (merged.length < SIZE) merged.push(0);
    return { line: merged, gained };
  }

  function move(dir) {
    if (over) return;
    const prev = grid.slice();
    let gained = 0;

    const get = (r, c) => grid[r * SIZE + c];
    const set = (r, c, v) => {
      grid[r * SIZE + c] = v;
    };

    if (dir === 'left' || dir === 'right') {
      for (let r = 0; r < SIZE; r++) {
        let line = [];
        for (let c = 0; c < SIZE; c++) line.push(get(r, c) || 0);
        if (dir === 'right') line.reverse();
        const res = slideLine(line);
        gained += res.gained;
        line = res.line;
        if (dir === 'right') line.reverse();
        for (let c = 0; c < SIZE; c++) set(r, c, line[c] || 0);
      }
    } else {
      for (let c = 0; c < SIZE; c++) {
        let line = [];
        for (let r = 0; r < SIZE; r++) line.push(get(r, c) || 0);
        if (dir === 'down') line.reverse();
        const res = slideLine(line);
        gained += res.gained;
        line = res.line;
        if (dir === 'down') line.reverse();
        for (let r = 0; r < SIZE; r++) set(r, c, line[r] || 0);
      }
    }

    const changed = grid.some((v, i) => v !== prev[i]);
    if (!changed) return;

    score += gained;
    saveBest();
    spawn();
    render();
    if (won) hintEl.textContent = 'You reached 2048 — keep going!';
    if (!canMove()) end(false);
  }

  function canMove() {
    if (emptyCells().length) return true;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r * SIZE + c];
        if (c + 1 < SIZE && grid[r * SIZE + c + 1] === v) return true;
        if (r + 1 < SIZE && grid[(r + 1) * SIZE + c] === v) return true;
      }
    }
    return false;
  }

  function end(isWin) {
    over = true;
    overlay.hidden = false;
    overTitle.textContent = isWin ? 'You win!' : 'Game over';
    overScore.textContent = 'Score ' + score;
  }

  function newGame() {
    grid = new Array(SIZE * SIZE).fill(0);
    score = 0;
    won = false;
    over = false;
    overlay.hidden = true;
    hintEl.textContent = 'Swipe or use arrow keys';
    spawn();
    spawn();
    render();
  }

  // input
  window.addEventListener('keydown', (e) => {
    const map = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
    };
    if (!map[e.key]) return;
    e.preventDefault();
    move(map[e.key]);
  });

  let sx = 0;
  let sy = 0;
  boardEl.addEventListener(
    'touchstart',
    (e) => {
      const t = e.changedTouches[0];
      sx = t.clientX;
      sy = t.clientY;
    },
    { passive: true }
  );
  boardEl.addEventListener(
    'touchend',
    (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
      else move(dy > 0 ? 'down' : 'up');
    },
    { passive: true }
  );

  document.getElementById('newBtn').addEventListener('click', newGame);
  document.getElementById('againBtn').addEventListener('click', newGame);

  loadBest();
  newGame();
})();
