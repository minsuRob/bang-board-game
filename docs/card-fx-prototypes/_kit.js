/*
  카드 연출 시안 공용 틀. 빌드 없이 <script src="_kit.js"> 로 붙인다.

  시안 페이지는 CONCEPTS 네 개만 쓰고 mount() 를 부른다.

    FxKit.mount({
      kind: 'beer', title: '맥주 연출 시안', lead: '한 줄 설명',
      concepts: [
        { id: 'A', name: 'A. …', desc: '…', cost: 1, dur: 1600, draw(g, t, q, f) { … } },
        …
      ],
    });

  draw(g, t, q, f)
    g  2D 컨텍스트. 300×210 논리 좌표 (내부 2배 해상도)
    t  진행도 0→1. 1 이면 "아무 효과 없음"이 되게 짠다
    q  화질 { level: 0|1|2, name: 'low'|'mid'|'high', n(count) 입자 수 줄이기, on(minLevel) }
    f  프레임 번호 (필름 입자 같은 떨림용)

  cost: 1 가벼움 · 2 보통 · 3 무거움 (그 시안을 '고' 화질로 돌릴 때의 대략 비용)

  화질 3단계 (상단 토글, ?q=low|mid|high)
    low   입자 25%, 그라데이션·합성(lighter)·블러 끄기 권장, 화면 흔들림 없음
    mid   입자 55%, 그라데이션 허용, 블러 없음
    high  전부
*/
(function () {
  const W = 300, H = 210;
  const card = { x: 104, y: 39, w: 92, h: 132 }; // 가운데 카드 (원본 250×389 비율에 가깝게)

  function rng(s) { return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = { out: (t) => 1 - Math.pow(1 - t, 3), in: (t) => t * t * t, inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, elastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1) };
  /** 원본 그림(250×389) 좌표 → 시안 캔버스 좌표 */
  const art = (px, py) => ({ x: card.x + (px / 250) * card.w, y: card.y + (py / 389) * card.h });

  function bg(g, c) { g.fillStyle = c || '#2e2013'; g.fillRect(0, 0, W, H); }
  /** 자리 표시 카드. 그림 대신 머리띠 + 제목. body(g) 로 안쪽에 단순 도형을 그린다 */
  function drawCard(g, title, body, opt) {
    opt = opt || {};
    g.save();
    g.fillStyle = opt.face || '#efe2c6'; g.strokeStyle = '#8b5a2b'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(card.x, card.y, card.w, card.h, 8); g.fill(); g.stroke();
    g.fillStyle = opt.band || '#1e140b'; g.fillRect(card.x + 1.5, card.y + 1.5, card.w - 3, 20);
    g.fillStyle = '#efe2c6'; g.font = '500 12px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText(title, card.x + card.w / 2, card.y + 15);
    if (body) { g.save(); g.beginPath(); g.rect(card.x + 2, card.y + 22, card.w - 4, card.h - 24); g.clip(); body(g); g.restore(); }
    g.restore();
  }
  function shake(g, amp, t) { if (amp > 0) g.translate(Math.sin(t * 300) * amp, Math.cos(t * 260) * amp); }

  const LEVELS = ['low', 'mid', 'high'];
  const SCALE = [0.25, 0.55, 1];
  function makeQ(level) {
    return { level, name: LEVELS[level], n: (c) => Math.max(1, Math.round(c * SCALE[level])), on: (min) => level >= min };
  }

  function mount(spec) {
    const css = `
      body{margin:0;padding:20px;background:#1b120b;color:#f3e7ce;font-family:system-ui,sans-serif}
      h1{font-size:18px;font-weight:500;margin:0 0 4px} p.lead{color:#b39b74;font-size:13px;margin:0 0 12px;line-height:1.5}
      .bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
      .bar .sp{flex:1} .seg{display:inline-flex;border:1px solid #5c452c;border-radius:8px;overflow:hidden}
      button{background:#3a2a1a;color:#f3e7ce;border:1px solid #5c452c;border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit;font-size:13px}
      .seg button{border:0;border-radius:0} .seg button.on{background:#c8902f;color:#1b120b}
      #fps{font:12px ui-monospace,monospace;color:#b39b74;min-width:120px;text-align:right}
      #grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
      .box{border:1px solid #5c452c;border-radius:12px;padding:10px;background:#2a1d12}
      canvas{width:100%;aspect-ratio:300/210;border-radius:8px;cursor:pointer;display:block}
      .name{font-size:14px;font-weight:500;margin-top:8px;display:flex;justify-content:space-between;gap:8px}
      .cost{font-size:11px;color:#1b120b;background:#b39b74;border-radius:6px;padding:1px 6px;white-space:nowrap;align-self:center}
      .cost.c3{background:#d0643a}.cost.c2{background:#c8902f}.cost.c1{background:#7fa36a}
      .desc{font-size:13px;color:#b39b74;line-height:1.5}
      .ms{font:11px ui-monospace,monospace;color:#8a7558;margin-top:4px}`;
    const st = document.createElement('style'); st.textContent = css; document.head.append(st);
    document.title = spec.title;
    const params = new URLSearchParams(location.search);
    let level = Math.max(0, LEVELS.indexOf(params.get('q') || 'high'));
    document.body.innerHTML = `<h1></h1><p class="lead"></p>
      <div class="bar"><span>화질</span><span class="seg" id="seg"></span><span class="sp"></span><span id="fps"></span><button id="all">모두 다시</button></div><div id="grid"></div>`;
    document.querySelector('h1').textContent = spec.title;
    document.querySelector('.lead').textContent = spec.lead || '';
    const seg = document.getElementById('seg');
    const btns = LEVELS.map((name, i) => { const b = document.createElement('button'); b.textContent = ['저', '중', '고'][i]; b.onclick = () => setLevel(i); seg.append(b); return b; });
    function setLevel(i) { level = i; btns.forEach((b, j) => b.classList.toggle('on', j === i)); }
    setLevel(level);
    const COST = ['', '가벼움', '보통', '무거움'];
    const views = spec.concepts.map((c) => {
      const box = document.createElement('div'); box.className = 'box';
      const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; cv.setAttribute('aria-label', c.name + ' 다시 보기');
      const h = document.createElement('div'); h.className = 'name';
      const nm = document.createElement('span'); nm.textContent = c.name;
      const cost = document.createElement('span'); cost.className = 'cost c' + (c.cost || 2); cost.textContent = COST[c.cost || 2];
      h.append(nm, cost);
      const p = document.createElement('div'); p.className = 'desc'; p.textContent = c.desc;
      const ms = document.createElement('div'); ms.className = 'ms';
      box.append(cv, h, p, ms); document.getElementById('grid').append(box);
      const v = { c, g: cv.getContext('2d'), start: performance.now() + 400, frame: 0, ms, acc: 0, cnt: 0 };
      cv.onclick = () => { v.start = performance.now(); };
      return v;
    });
    document.getElementById('all').onclick = () => { const n = performance.now(); views.forEach((v) => (v.start = n)); };
    let last = performance.now(), fpsAcc = 0, fpsN = 0;
    const fpsEl = document.getElementById('fps');
    function loop(n) {
      const q = makeQ(level);
      views.forEach((v) => {
        const d = v.c.dur || 1600;
        let t = (n - v.start) / d; if (t > 1.35) { v.start = n + 300; t = 0; }
        v.frame++;
        const g = v.g; const t0 = performance.now();
        g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, W, H);
        g.save();
        try { v.c.draw(g, clamp(t, 0, 1), q, v.frame); } catch (e) { g.restore(); g.save(); bg(g, '#400'); g.fillStyle = '#fff'; g.font = '12px monospace'; g.fillText(String(e.message).slice(0, 44), 8, 20); }
        g.restore();
        v.acc += performance.now() - t0; v.cnt++;
        if (v.cnt >= 30) { v.ms.textContent = `그리기 ${(v.acc / v.cnt).toFixed(2)} ms/프레임 · ${d}ms`; v.acc = 0; v.cnt = 0; }
      });
      fpsAcc += n - last; fpsN++; last = n;
      if (fpsN >= 30) { fpsEl.textContent = `${(1000 / (fpsAcc / fpsN)).toFixed(0)} fps (4칸 합계)`; fpsAcc = 0; fpsN = 0; }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  window.FxKit = { W, H, card, rng, clamp, seg, lerp, ease, art, bg, drawCard, shake, mount };
})();
