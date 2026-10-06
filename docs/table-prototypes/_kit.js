/*
 * 탁자 시안 공통: 그리기 도구, 좌석, 탭.
 *
 * 판에 넣을 때와 같은 조건으로 그린다.
 * - 탁자는 텍스처 한 장. 조명·그림자 계산 없이 미리 구워 둔다 (MeshBasicMaterial 그대로)
 * - 잡음은 작은 타일을 반복한다 (feltNoiseTexture 의 128² RepeatWrapping 과 같다)
 * - 한 번 그리고 끝. requestAnimationFrame 을 돌리지 않는다
 *
 * 쓰는 쪽은 DESIGNS 배열을 만들고 startPage(DESIGNS, 처음 키) 를 부른다.
 */

// ---------------------------------------------------------------------------
// 공통
// ---------------------------------------------------------------------------
const W = 1200, H = 780, CX = 600, CY = 390;
/** 바깥(림) 타원 */
const RX = 585, RY = 375;

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ell(c, rx, ry) { c.beginPath(); c.ellipse(CX, CY, rx, ry, 0, 0, Math.PI * 2); }

/** 잡음 타일. 회색 lo~hi. 판에서는 128² 데이터 텍스처를 반복한다 */
const tiles = {};
function noiseTile(seed, lo, hi, size = 128) {
  const key = `${seed}:${lo}:${hi}:${size}`;
  if (tiles[key]) return tiles[key];
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const x = cv.getContext('2d');
  const img = x.createImageData(size, size);
  const r = rng(seed);
  for (let i = 0; i < size * size; i++) {
    const v = lo + Math.round(r() * (hi - lo));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return (tiles[key] = cv);
}

/** 타일을 곱해서 깐다 (클립 안쪽만) */
function multiplyTile(c, tile, scale = 1, alpha = 1) {
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.globalAlpha = alpha;
  const p = c.createPattern(tile, 'repeat');
  p.setTransform(new DOMMatrix().scale(scale));
  c.fillStyle = p;
  c.fillRect(0, 0, W, H);
  c.restore();
}

/** 바깥 바닥: 가장자리로 어두워진다 */
function floor(c, color) {
  c.fillStyle = color;
  c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(CX, CY, 200, CX, CY, 760);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,.55)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

/** 나무 림. 결은 동심 타원, 위쪽 모서리에 빛, 안쪽에 그림자 */
function woodRail(c, { outer = [RX, RY], inner, base, dark, light, seed = 3, studs = 0, stud = '#d9a441' }) {
  const r = rng(seed);
  c.save();
  ell(c, outer[0], outer[1]);
  c.ellipse(CX, CY, inner[0], inner[1], 0, 0, Math.PI * 2, true);
  c.clip('evenodd');
  const g = c.createLinearGradient(0, CY - outer[1], 0, CY + outer[1]);
  g.addColorStop(0, light); g.addColorStop(.25, base); g.addColorStop(1, dark);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // 결
  for (let i = 0; i < 70; i++) {
    const t = r();
    const rx = inner[0] + (outer[0] - inner[0]) * t;
    const ry = inner[1] + (outer[1] - inner[1]) * t;
    const a0 = r() * Math.PI * 2;
    c.beginPath();
    c.ellipse(CX, CY, rx, ry, 0, a0, a0 + 0.6 + r() * 2.4);
    c.strokeStyle = r() < 0.6 ? `rgba(20,10,4,${0.12 + r() * 0.2})` : `rgba(255,220,170,${0.05 + r() * 0.08})`;
    c.lineWidth = 0.6 + r() * 1.6;
    c.stroke();
  }
  multiplyTile(c, noiseTile(seed, 205, 255), 1, 0.7);
  c.restore();
  // 바깥 모서리 둥글림
  ell(c, outer[0] - 2, outer[1] - 2);
  c.strokeStyle = 'rgba(255,225,180,.18)'; c.lineWidth = 3; c.stroke();
  ell(c, inner[0] + 3, inner[1] + 3);
  c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 5; c.stroke();
  // 놋쇠 징
  for (let i = 0; i < studs; i++) {
    const a = (i / studs) * Math.PI * 2;
    const mx = (outer[0] + inner[0]) / 2, my = (outer[1] + inner[1]) / 2;
    const x = CX + Math.cos(a) * mx, y = CY + Math.sin(a) * my;
    const sg = c.createRadialGradient(x - 2, y - 2, 0.5, x, y, 6);
    sg.addColorStop(0, '#fff1c4'); sg.addColorStop(.45, stud); sg.addColorStop(1, '#5b3a0e');
    c.fillStyle = sg;
    c.beginPath(); c.arc(x, y, 5.5, 0, Math.PI * 2); c.fill();
  }
}

/** 판 안쪽 가장자리 그림자 (림이 판 위로 드리운 것처럼) */
function innerShadow(c, rx, ry, strength = .6, blur = 30) {
  c.save();
  ell(c, rx, ry); c.clip();
  c.shadowColor = `rgba(0,0,0,${strength})`;
  c.shadowBlur = blur;
  ell(c, rx + 40, ry + 40);
  c.lineWidth = 80; c.strokeStyle = '#000'; c.stroke();
  c.restore();
}

function star(c, x, y, R, r, n = 5, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 ? r : R;
    const a = rot + (i * Math.PI) / n;
    c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  c.closePath();
}

/** 손으로 그은 잉크 선: 짧게 쪼개 흔든다 */
function inkLine(c, pts, r, wobble = 1.1, close = false) {
  const all = close ? [...pts, pts[0]] : pts;
  for (let pass = 0; pass < 2; pass++) {
    c.beginPath();
    for (let i = 0; i < all.length - 1; i++) {
      const [ax, ay] = all[i], [bx, by] = all[i + 1];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 6));
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n + (r() - .5) * wobble;
        const y = ay + ((by - ay) * k) / n + (r() - .5) * wobble;
        if (i === 0 && k === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
    }
    c.stroke();
  }
}

/** 수채 번짐: 다각형을 반씩 쪼개 흔들며 옅게 여러 겹 */
function wash(c, poly, color, r, layers = 10, alpha = .07, spread = 14) {
  const deform = (p, d) => {
    if (d === 0) return p;
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const [ax, ay] = p[i], [bx, by] = p[(i + 1) % p.length];
      out.push([ax, ay], [(ax + bx) / 2 + (r() - .5) * spread * d / 2, (ay + by) / 2 + (r() - .5) * spread * d / 2]);
    }
    return deform(out, d - 1);
  };
  c.save();
  c.fillStyle = color;
  c.globalAlpha = alpha;
  for (let l = 0; l < layers; l++) {
    const p = deform(poly, 4);
    c.beginPath(); p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
  }
  c.restore();
}


// ---------------------------------------------------------------------------
// 판 화면
// ---------------------------------------------------------------------------
const STAGE_HTML = `
  <div class="stage" id="stage">
    <div class="plane" id="plane">
      <canvas id="tex" width="1200" height="780"></canvas>
      <div class="slot" style="left:530px; top:385px"></div>
      <div class="slot" style="left:670px; top:385px"></div>
      <div class="pile deck" style="left:528px; top:382px"><img src="../../assets/cards/back.png" alt="" /></div>
      <div class="pile discard" style="left:670px; top:385px"><img src="../../assets/cards/card/bang.png" alt="" /></div>
    </div>
    <button class="peek" id="peek" type="button">카드 치우기 (H)</button>
  </div>
  <aside id="info"></aside>`;

/** fonts: 캔버스에만 쓰는 글꼴 ('80px Rye' 꼴). 그리기 전에 받아 둔다 */
function startPage(DESIGNS, first, fonts = []) {
  document.getElementById('main').innerHTML = STAGE_HTML;
  const tex = document.getElementById('tex');
  // ---------------------------------------------------------------------------
  // 좌석 (판 레이아웃과 비슷하게 5인)
  // ---------------------------------------------------------------------------
  const SEATS = [
    { x: 600, y: 640, w: 330, r: 0, ch: 'sidKetchum', eq: 'schofield', self: true },
    { x: 150, y: 390, w: 200, r: 90, ch: 'blackJack', eq: 'barrel' },
    { x: 440, y: 150, w: 200, r: 180, ch: 'bartCassidy' },
    { x: 760, y: 150, w: 200, r: 180, ch: 'calamityJanet', eq: 'mustang' },
    { x: 1050, y: 390, w: 200, r: -90, ch: 'belleStar', active: true },
  ];

  const plane = document.getElementById('plane');
  for (const s of SEATS) {
    const el = document.createElement('div');
    el.className = 'seat';
    el.style.cssText = `left:${s.x}px; top:${s.y}px; --r:${s.r}deg; --w:${s.w}px`;
    el.innerHTML = `
      ${s.self ? '' : '<div class="hand"><img src="../../assets/cards/back.png"><img src="../../assets/cards/back.png"><img src="../../assets/cards/back.png"></div>'}
      <div class="board${s.active ? ' active' : ''}">
        <img class="mat" src="../../assets/board/player-board.webp" alt="">
        <img class="ch" src="../../assets/cards/character/${s.ch}.png" alt="" onerror="this.remove()">
        ${s.eq ? `<img class="eq" src="../../assets/cards/card/${s.eq}.png" alt="">` : ''}
      </div>`;
    plane.appendChild(el);
  }

  // ---------------------------------------------------------------------------
  // 그리기 · 탭
  // ---------------------------------------------------------------------------

  const ctx = tex.getContext('2d');
  const info = document.getElementById('info');
  const tabs = document.getElementById('tabs');
  /** 한 번 그린 시안은 비트맵으로 들고 있다가 다시 붙인다 */
  const baked = {};

  function bake(d) {
    if (baked[d.key]) return baked[d.key];
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const t0 = performance.now();
    d.draw(cv.getContext('2d'));
    d.ms = performance.now() - t0;
    return (baked[d.key] = cv);
  }

  function show(key) {
    const d = DESIGNS.find((x) => x.key === key) ?? DESIGNS[0];
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bake(d), 0, 0);
    document.body.style.background = d.bg;
    for (const b of tabs.children) b.setAttribute('aria-selected', String(b.dataset.key === d.key));
    info.innerHTML = `
      <h2>${d.name}</h2>
      <div class="en">${d.key} · ${d.en}</div>
      <div class="sw">${d.swatch.map((c) => `<i style="background:${c}" title="${c}"></i>`).join('')}</div>
      <h3>어디서 왔나</h3><p>${d.why}</p>
      <h3>좋은 점</h3><ul>${d.good.map((x) => `<li>${x}</li>`).join('')}</ul>
      <h3>걸리는 점</h3><ul>${d.bad.map((x) => `<li>${x}</li>`).join('')}</ul>
      <h3>판에 넣으면</h3>
      <dl class="cost">${Object.entries(d.cost).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}
        <dt>이 시안</dt><dd>2D 캔버스 1200×780 한 번, ${d.ms.toFixed(0)}ms</dd></dl>`;
    history.replaceState(null, '', `?d=${d.key}`);
  }

  for (const d of DESIGNS) {
    const b = document.createElement('button');
    b.dataset.key = d.key; b.setAttribute('role', 'tab');
    const th = document.createElement('canvas'); th.width = 224; th.height = 146;
    b.append(th);
    const label = document.createElement('span'); label.innerHTML = `<b>${d.key}</b>${d.name}`;
    b.append(label);
    b.onclick = () => show(d.key);
    tabs.append(b);
  }

  function thumbs() {
    DESIGNS.forEach((d, i) => tabs.children[i].firstChild.getContext('2d').drawImage(bake(d), 0, 0, 224, 146));
  }

  function fit() {
    const w = document.getElementById('stage').clientWidth;
    plane.style.setProperty("--s", String(w / 1560));
  }
  addEventListener('resize', fit);
  const peek = () => {
    const bare = plane.classList.toggle('bare');
    document.getElementById('peek').textContent = bare ? '카드 놓기 (H)' : '카드 치우기 (H)';
  };
  document.getElementById('peek').onclick = peek;
  addEventListener('keydown', (e) => {
    if (/^[0-9]$/.test(e.key)) show(e.key);
    if (e.key === 'h' || e.key === 'H') peek();
  });

  fit();
  // Rye·Special Elite 를 캔버스에 쓰므로 글꼴을 기다린다
  Promise.all([document.fonts.ready, ...fonts.map((f) => document.fonts.load(f))]).then(() => {
    show(new URLSearchParams(location.search).get('d') ?? first);
    (window.requestIdleCallback ?? setTimeout)(thumbs);
  });
}
