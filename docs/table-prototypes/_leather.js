/* 가죽 탁자 그리기 도구 (leather.html, emblem.html). _kit.js 다음에 읽는다 */

// ---------------------------------------------------------------------------
// 가죽 도구
// ---------------------------------------------------------------------------

/** 타원 위 점을 호 길이로 고르게 n 개. 각 점에 접선각·바깥 법선각을 붙인다 */
function along(bx, by, n, phase = 0) {
  const M = 720, acc = [0];
  const pt = (a) => [CX + Math.cos(a) * bx, CY + Math.sin(a) * by];
  for (let i = 1; i <= M; i++) {
    const [x0, y0] = pt(((i - 1) / M) * Math.PI * 2), [x1, y1] = pt((i / M) * Math.PI * 2);
    acc.push(acc[i - 1] + Math.hypot(x1 - x0, y1 - y0));
  }
  const total = acc[M], out = [];
  for (let k = 0, j = 0; k < n; k++) {
    const want = (((k + phase) / n) % 1) * total;
    while (j < M && acc[j + 1] < want) j++;
    const a = ((j + (want - acc[j]) / (acc[j + 1] - acc[j] || 1)) / M) * Math.PI * 2;
    const [x, y] = pt(a);
    out.push({ x, y, a, tan: Math.atan2(Math.cos(a) * by, -Math.sin(a) * bx), nor: Math.atan2(Math.sin(a) * bx, Math.cos(a) * by) });
  }
  return out;
}

/** 스웨이드 바탕: 색 + 큰 얼룩 + 잔 잡음. 클립 안쪽만 */
function suede(c, rx, ry, { base, dark = '70,35,12', light = '220,170,110', n = 60, seed = 17, grain = [220, 255] }) {
  const r = rng(seed);
  c.save(); ell(c, rx, ry); c.clip();
  c.fillStyle = base; c.fillRect(0, 0, W, H);
  for (let i = 0; i < n; i++) {
    const x = CX + (r() - .5) * rx * 2, y = CY + (r() - .5) * ry * 2, rad = 40 + r() * 140;
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    const tone = r() < .55 ? dark : light;
    g.addColorStop(0, `rgba(${tone},${.08 + r() * .1})`); g.addColorStop(1, `rgba(${tone},0)`);
    c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  multiplyTile(c, noiseTile(seed + 14, grain[0], grain[1], 64), 2);
  c.restore();
}

/** 박음질 한 줄. 실 밑에 눌린 그림자를 먼저 긋는다 */
function stitch(c, rx, ry, { color = '#e9d6a8', dash = [9, 7], width = 2.2 } = {}) {
  c.save();
  c.setLineDash(dash); c.lineCap = 'round';
  ell(c, rx, ry); c.strokeStyle = 'rgba(30,14,4,.5)'; c.lineWidth = width + 1.3; c.stroke();
  ell(c, rx, ry - 1); c.strokeStyle = color; c.lineWidth = width; c.stroke();
  c.restore();
}

const METAL = {
  silver: ['#ffffff', '#b9bcc0', '#4b4e52', 'rgba(60,62,66,.6)'],
  brass: ['#fff1c4', '#d9a441', '#5b3a0e', 'rgba(91,58,14,.6)'],
};
/** 콘초 (둥근 금속 장식) */
function concho(c, x, y, R, metal = 'silver') {
  const [hi, mid, lo, mark] = METAL[metal];
  const g = c.createRadialGradient(x - R * .28, y - R * .33, R * .1, x, y, R * 1.1);
  g.addColorStop(0, hi); g.addColorStop(.5, mid); g.addColorStop(1, lo);
  c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fillStyle = g; c.fill();
  c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1.5; c.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    c.beginPath(); c.arc(x + Math.cos(a) * R * .8, y + Math.sin(a) * R * .8, R * .07, 0, Math.PI * 2);
    c.fillStyle = mark; c.fill();
  }
  star(c, x, y, R * .55, R * .22, 6); c.fillStyle = mark; c.fill();
}

/** 눌러 찍은 자국: 어두운 홈 + 아래로 비낀 밝은 턱 */
function tooled(c, path, dark = 'rgba(40,18,6,.5)', light = 'rgba(255,220,170,.22)', fill = true) {
  c.save();
  path(); if (fill) { c.fillStyle = dark; c.fill(); } else { c.strokeStyle = dark; c.lineWidth = 2.4; c.stroke(); }
  c.translate(.9, 1.3);
  path(); c.strokeStyle = light; c.lineWidth = 1; c.stroke();
  c.restore();
}

/** 원판 띠를 칠한다 (outer ~ inner 사이) */
function band(c, o, i, color) {
  ell(c, o[0], o[1]); c.ellipse(CX, CY, i[0], i[1], 0, 0, Math.PI * 2, true);
  c.fillStyle = color; c.fill('evenodd');
}

/** 말아 접은 가장자리: 바깥 테를 둥근 막대처럼 */
function rolledEdge(c, rx, ry, w, base) {
  const g = c.createLinearGradient(0, CY - ry, 0, CY + ry);
  g.addColorStop(0, 'rgba(255,220,180,.25)'); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
  ell(c, rx - w / 2, ry - w / 2); c.strokeStyle = base; c.lineWidth = w; c.stroke();
  ell(c, rx - w / 2, ry - w / 2); c.strokeStyle = g; c.lineWidth = w; c.stroke();
  ell(c, rx - w * .3, ry - w * .3); c.strokeStyle = 'rgba(255,225,185,.18)'; c.lineWidth = 2; c.stroke();
}
