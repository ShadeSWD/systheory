/* Многокритериальный выбор: редактируемая таблица альтернатив, отсев по
   доминированию (множество Парето), нормировка критериев, линейная свёртка с
   весами и ранжирование; SVG-график на плоскости двух выбранных критериев с
   парето-фронтом и линией уровня свёртки.
   Исходный пример — выбор типа транспортного судна. */
'use strict';
(function () {

let uid = 0;
const nid = () => 'k' + (++uid);

/* ——— исходные данные ——— */

function demoState() {
  const c = (name, dir, w) => ({ id: nid(), name, dir, w });
  const a = (name, v) => ({ id: nid(), name, v: v.slice() });
  const s = {
    crit: [
      c('Скорость, уз', 1, 15),
      c('Дедвейт, т', 1, 35),
      c('Стоимость постройки, млн руб.', -1, 30),
      c('Расход топлива, т/сут', -1, 20),
    ],
    alts: [
      a('Балкер-хендисайз', [14, 32000, 3600, 24]),
      a('Универсал', [15.5, 26000, 3200, 26]),
      a('Многоцелевой', [17, 19000, 2950, 30]),
      a('Фидер', [19, 13000, 3050, 38]),
      a('Ро-ро', [21, 9000, 3800, 48]),
      a('Балкер-лайт', [15, 24000, 3350, 28]),
      a('Каботажник', [14.5, 17000, 3100, 32]),
    ],
    px: '', py: '',
  };
  s.px = s.crit[0].id;
  s.py = s.crit[1].id;
  return s;
}

let st = demoState();

/* ——— мелкие помощники ——— */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const code = (i) => 'A' + (i + 1);
const num = (x) => (Number.isFinite(+x) ? +x : 0);

function fmt(x) {
  if (!Number.isFinite(x)) return '—';
  return x.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
}
function fmt3(x) {
  if (!Number.isFinite(x)) return '—';
  return x.toFixed(3).replace('.', ',');
}
function fmt2(x) {
  if (!Number.isFinite(x)) return '—';
  return x.toFixed(2).replace('.', ',');
}
const cIndex = (id) => {
  const i = st.crit.findIndex((c) => c.id === id);
  return i < 0 ? 0 : i;
};

/* ——— расчёты ——— */

// нормированные веса: сумма приводится к 1
function weights() {
  const raw = st.crit.map((c) => Math.max(0, num(c.w)));
  const s = raw.reduce((p, x) => p + x, 0);
  if (s <= 0) return raw.map(() => (st.crit.length ? 1 / st.crit.length : 0));
  return raw.map((x) => x / s);
}

// диапазоны критериев по рассматриваемому набору вариантов
function ranges() {
  return st.crit.map((c, j) => {
    const col = st.alts.map((a) => num(a.v[j]));
    const lo = col.length ? Math.min.apply(null, col) : 0;
    const hi = col.length ? Math.max.apply(null, col) : 0;
    return { lo, hi, span: hi - lo };
  });
}

// нормировка к [0;1]: 1 — лучшее из имеющихся, 0 — худшее
function normMatrix() {
  const r = ranges();
  return st.alts.map((a) => st.crit.map((c, j) => {
    if (r[j].span === 0) return 1;
    const k = num(a.v[j]);
    return c.dir > 0 ? (k - r[j].lo) / r[j].span : (r[j].hi - k) / r[j].span;
  }));
}

// доминирование: для каждой альтернативы — список индексов доминирующих её
function domination() {
  const m = st.crit.length;
  // приводим все критерии к «больше — лучше», домножая на направление
  const val = st.alts.map((a) => st.crit.map((c, j) => num(a.v[j]) * (c.dir > 0 ? 1 : -1)));
  return st.alts.map((_a, i) => {
    const res = [];
    for (let q = 0; q < st.alts.length; q++) {
      if (q === i) continue;
      let ge = true, gt = false;
      for (let j = 0; j < m; j++) {
        if (val[q][j] < val[i][j]) { ge = false; break; }
        if (val[q][j] > val[i][j]) gt = true;
      }
      if (ge && gt) res.push(q);
    }
    return res;
  });
}

// сводка: нормированные оценки, свёртка, ранг, статус
function analysis() {
  const w = weights();
  const N = normMatrix();
  const dom = domination();
  const rows = st.alts.map((a, i) => ({
    i, name: a.name, code: code(i), n: N[i], dom: dom[i],
    pareto: dom[i].length === 0,
    s: N[i].reduce((p, x, j) => p + x * w[j], 0),
  }));
  const order = rows.slice().sort((p, q) => q.s - p.s);
  order.forEach((r, k) => { r.rank = k + 1; });
  return { w, rows, order, best: order[0] || null };
}

/* ——— отрисовка: критерии и веса ——— */

function renderCrit() {
  const w = weights();
  const html = st.crit.map((c, j) => `
    <div class="pa-crit">
      <input type="text" data-act="cname" data-c="${c.id}" value="${esc(c.name)}"
             size="24" aria-label="название критерия">
      <select data-act="cdir" data-c="${c.id}" aria-label="направление">
        <option value="1"${c.dir > 0 ? ' selected' : ''}>максимизировать</option>
        <option value="-1"${c.dir > 0 ? '' : ' selected'}>минимизировать</option>
      </select>
      <input type="range" min="0" max="100" step="1" data-act="cw" data-c="${c.id}"
             value="${num(c.w)}" aria-label="вес критерия">
      <input type="number" min="0" max="100" step="1" data-act="cwn" data-c="${c.id}"
             value="${num(c.w)}" style="width:70px" aria-label="вес критерия числом">
      <span class="muted">вес</span>
      <span class="readout" id="wn-${c.id}">${fmt3(w[j])}</span>
      <button class="btn small" type="button" data-act="cdel" data-c="${c.id}"
              title="удалить критерий">&times;</button>
    </div>`).join('');
  $('crits').innerHTML = html
    + `<div class="pa-crit"><span class="muted">сумма весов после автонормировки:</span>
       <span class="readout" id="wsum">${fmt3(w.reduce((p, x) => p + x, 0))}</span></div>`;
}

function refreshWeights() {
  const w = weights();
  st.crit.forEach((c, j) => {
    const el = $('wn-' + c.id);
    if (el) el.textContent = fmt3(w[j]);
  });
  const s = $('wsum');
  if (s) s.textContent = fmt3(w.reduce((p, x) => p + x, 0));
}

/* ——— отрисовка: таблица альтернатив ——— */

function renderTable() {
  const head = '<tr><th>№</th><th>Вариант</th>'
    + st.crit.map((c) => `<th class="num">${esc(c.name)}<br>`
      + `<span class="muted">${c.dir > 0 ? 'max' : 'min'}</span></th>`).join('')
    + '<th></th></tr>';
  const rows = st.alts.map((a, i) => `<tr>
      <td class="num">${code(i)}</td>
      <td><input type="text" data-act="aname" data-a="${a.id}" value="${esc(a.name)}"
                 size="18" aria-label="название варианта"></td>
      ${st.crit.map((c, j) => `<td class="num"><input type="number" step="any"
          data-act="aval" data-a="${a.id}" data-j="${j}" value="${num(a.v[j])}"
          style="width:96px" aria-label="значение критерия"></td>`).join('')}
      <td><button class="btn small" type="button" data-act="adel" data-a="${a.id}"
                  title="удалить вариант">&times;</button></td>
    </tr>`).join('');
  $('tbl').innerHTML = `<table class="el"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

/* ——— отрисовка: множество Парето ——— */

function renderPareto(an) {
  const head = '<tr><th>№</th><th>Вариант</th>'
    + st.crit.map((c) => `<th class="num">${esc(c.name)}</th>`).join('')
    + '<th>Статус</th></tr>';
  const rows = an.rows.map((r) => {
    const status = r.pareto
      ? '<b>множество Парето</b>'
      : 'доминируется ' + r.dom.map((q) => code(q)).join(', ');
    return `<tr class="${r.pareto ? '' : 'drop'}">
      <td class="num">${r.code}</td><td>${esc(r.name)}</td>
      ${st.crit.map((_c, j) => `<td class="num">${fmt(num(st.alts[r.i].v[j]))}</td>`).join('')}
      <td>${status}</td></tr>`;
  }).join('');
  const nP = an.rows.filter((r) => r.pareto).length;
  let h = `<table class="el"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
  h += `<div class="calc-row">множество Парето: <span style="color:#6b6b74">`
    + `${st.alts.length} вариантов − ${st.alts.length - nP} доминируемых</span> = `
    + `<b>${nP}</b> недоминируемых — `
    + (nP ? '{' + an.rows.filter((r) => r.pareto).map((r) => r.code).join(', ') + '}' : '—')
    + '</div>';
  // разбор одной проверки доминирования — для первой отброшенной альтернативы
  const bad = an.rows.find((r) => !r.pareto);
  if (bad) {
    const q = bad.dom[0];
    const parts = st.crit.map((c, j) => {
      const x = num(st.alts[q].v[j]), y = num(st.alts[bad.i].v[j]);
      const sign = x === y ? '=' : (x > y ? '&gt;' : '&lt;');
      return `${fmt(x)} ${sign} ${fmt(y)}`;
    }).join('; ');
    h += `<div class="calc-row">${code(q)} против ${bad.code}: `
      + `<span style="color:#6b6b74">${parts} — не хуже по всем критериям и строго `
      + `лучше хотя бы по одному</span> → <b>${bad.code} отбрасывается</b></div>`;
  } else {
    h += '<div class="calc-row muted">Ни один вариант не доминируется: '
      + 'отсев по доминированию здесь ничего не даёт.</div>';
  }
  $('pareto').innerHTML = h;
}

/* ——— отрисовка: нормировка, свёртка, ранжирование ——— */

function renderConv(an) {
  const r = ranges();
  const head = '<tr><th>Ранг</th><th>№</th><th>Вариант</th>'
    + st.crit.map((c) => `<th class="num">${esc(c.name)}<br>`
      + '<span class="muted">нормировано</span></th>').join('')
    + '<th class="num">Свёртка S</th></tr>';
  const rows = an.order.map((row) => `<tr class="${row.rank === 1 ? 'pick' : (row.pareto ? '' : 'drop')}">
      <td class="num">${row.rank}</td><td class="num">${row.code}</td>
      <td>${esc(row.name)}</td>
      ${row.n.map((x) => `<td class="num">${fmt3(x)}</td>`).join('')}
      <td class="num">${fmt3(row.s)}</td></tr>`).join('');
  let h = `<table class="el"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
  // диапазоны нормировки
  h += '<div class="calc-row muted">диапазоны нормировки: '
    + st.crit.map((c, j) => `${esc(c.name)} — от ${fmt(r[j].lo)} до ${fmt(r[j].hi)}`).join('; ')
    + '</div>';
  const b = an.best;
  if (b) {
    h += '<div class="calc-row">\\(S = \\sum\\limits_{j} w_j \\tilde k_j\\) для '
      + `победителя ${b.code} «${esc(b.name)}» = <span style="color:#6b6b74">`
      + b.n.map((x, j) => `${fmt2(an.w[j])} · ${fmt3(x)}`).join(' + ')
      + `</span> = <b>${fmt3(b.s)}</b></div>`;
    const second = an.order[1];
    if (second) {
      h += `<div class="calc-row">отрыв от второго места (${second.code}): `
        + `<span style="color:#6b6b74">${fmt3(b.s)} − ${fmt3(second.s)}</span> = `
        + `<b>${fmt3(b.s - second.s)}</b></div>`;
    }
    if (!b.pareto) {
      h += '<div class="calc-row"><span class="badge bad">победитель доминируется — '
        + 'проверьте направления критериев</span></div>';
    }
  }
  $('conv').innerHTML = h;
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement($('conv'), {
        delimiters: [{ left: '$$', right: '$$', display: true },
          { left: '\\(', right: '\\)', display: false }],
        throwOnError: false,
      });
    } catch (e) { /* KaTeX ещё не подгружен — формула останется текстом */ }
  }
}

/* ——— отрисовка: график ——— */

function tickList(lo, hi) {
  const span = (hi - lo) || Math.abs(hi) || 1;
  const raw = span / 5;
  const mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
  const k = raw / mag;
  const step = (k > 5 ? 10 : k > 2.5 ? 5 : k > 2 ? 2.5 : k > 1 ? 2 : 1) * mag;
  const out = [];
  for (let t = Math.ceil(lo / step - 1e-9) * step; t <= hi + 1e-9; t += step) {
    out.push(+t.toPrecision(12));
  }
  return out;
}

// отсечение прямой A·x + B·y = C прямоугольником
function clipLine(A, B, C, x0, x1, y0, y1) {
  const pts = [];
  const push = (x, y) => {
    if (x >= x0 - 0.01 && x <= x1 + 0.01 && y >= y0 - 0.01 && y <= y1 + 0.01) {
      if (!pts.some((p) => Math.abs(p[0] - x) < 0.01 && Math.abs(p[1] - y) < 0.01)) {
        pts.push([x, y]);
      }
    }
  };
  if (Math.abs(B) > 1e-12) {
    push(x0, (C - A * x0) / B);
    push(x1, (C - A * x1) / B);
  }
  if (Math.abs(A) > 1e-12) {
    push((C - B * y0) / A, y0);
    push((C - B * y1) / A, y1);
  }
  return pts.length >= 2 ? [pts[0], pts[1]] : null;
}

// sx, sy — направление улучшения в пикселях: подпись ставится в ту сторону,
// где по смыслу задачи «лучше», — там свободно, потому что фронт с другой стороны
function placeLabels(items, W, H, sx, sy) {
  // items: {x, y, full, short, fill}
  const boxes = items.map((it) => ({ x0: it.x - 6, x1: it.x + 6, y0: it.y - 6, y1: it.y + 6 }));
  const placed = [];
  const out = [];
  const hit = (b) => boxes.concat(placed).some((p) =>
    !(b.x1 < p.x0 || b.x0 > p.x1 || b.y1 < p.y0 || b.y0 > p.y1));
  const up = sy < 0 ? -8 : 14, down = sy < 0 ? 14 : -8;
  const anc = sx > 0 ? 'start' : 'end', ancB = sx > 0 ? 'end' : 'start';
  const order = [[9 * sx, up, anc], [0, sy < 0 ? -13 : 19, 'middle'],
    [9 * sx, down, anc], [-9 * sx, up, ancB],
    [0, sy < 0 ? 19 : -13, 'middle'], [-9 * sx, down, ancB]];
  items.forEach((it) => {
    const variants = [];
    [it.full, it.short].forEach((txt) => {
      const w = txt.length * 6.0 + 2;
      order.forEach((v) => {
        const tx = it.x + v[0], ty = it.y + v[1];
        const x0 = v[2] === 'start' ? tx : (v[2] === 'end' ? tx - w : tx - w / 2);
        const box = { x0, x1: x0 + w, y0: ty - 8, y1: ty + 3 };
        if (box.x0 < 9 || box.x1 > W - 9 || box.y0 < 10 || box.y1 > H - 10) return;
        variants.push({ tx, ty, anchor: v[2], txt, box });
      });
    });
    const ok = variants.find((v) => !hit(v.box));
    const use = ok || null;
    if (use) { placed.push(use.box); out.push({ it, use }); }
  });
  return out;
}

function renderChart(an) {
  const W = 640, H = 392;
  const X0 = 92, X1 = 596, Y0 = 48, Y1 = 312;
  const box = $('chart');
  if (!st.crit.length || !st.alts.length) {
    box.innerHTML = '<div class="muted">Нужен хотя бы один критерий и один вариант.</div>';
    $('chart-note').innerHTML = '';
    return;
  }
  const jx = cIndex(st.px), jy = cIndex(st.py);
  const cx = st.crit[jx], cy = st.crit[jy];
  const xs = st.alts.map((a) => num(a.v[jx]));
  const ys = st.alts.map((a) => num(a.v[jy]));
  const pad = (arr) => {
    let lo = Math.min.apply(null, arr), hi = Math.max.apply(null, arr);
    const sp = hi - lo || Math.abs(hi) * 0.2 || 1;
    return { lo: lo - sp * 0.12, hi: hi + sp * 0.12 };
  };
  const rx = pad(xs), ry = pad(ys);
  const PX = (v) => X0 + (v - rx.lo) / (rx.hi - rx.lo) * (X1 - X0);
  const PY = (v) => Y1 - (v - ry.lo) / (ry.hi - ry.lo) * (Y1 - Y0);

  let s = '';
  // оси
  s += `<path d="M ${X0 - 8} ${Y1} H ${X1 + 14}" fill="none" stroke="#16161a" stroke-width="1.2" marker-end="url(#arrE)"/>`;
  s += `<path d="M ${X0} ${Y1 + 10} V ${Y0 - 14}" fill="none" stroke="#16161a" stroke-width="1.2" marker-end="url(#arrE)"/>`;
  tickList(rx.lo, rx.hi).forEach((t) => {
    const x = PX(t);
    if (x < X0 - 1 || x > X1 + 1) return;
    s += `<path d="M ${x.toFixed(1)} ${Y1} V ${Y1 + 5}" fill="none" stroke="#16161a" stroke-width="1"/>`;
    s += `<text x="${x.toFixed(1)}" y="${Y1 + 20}" text-anchor="middle" style="font:10.5px system-ui;fill:#6b6b74">${fmt(t)}</text>`;
  });
  tickList(ry.lo, ry.hi).forEach((t) => {
    const y = PY(t);
    if (y < Y0 - 1 || y > Y1 + 1) return;
    s += `<path d="M ${X0 - 5} ${y.toFixed(1)} H ${X0}" fill="none" stroke="#16161a" stroke-width="1"/>`;
    s += `<text x="${X0 - 9}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" style="font:10.5px system-ui;fill:#6b6b74">${fmt(t)}</text>`;
  });
  s += `<text x="${X0}" y="30" style="font:11px system-ui;fill:#16161a">${esc(cy.name)}`
    + ` (${cy.dir > 0 ? 'максимизируется' : 'минимизируется'})</text>`;
  s += `<text x="${((X0 + X1) / 2).toFixed(0)}" y="${Y1 + 40}" text-anchor="middle" style="font:11px system-ui;fill:#16161a">${esc(cx.name)}`
    + ` (${cx.dir > 0 ? 'максимизируется' : 'минимизируется'})</text>`;

  // фронт Парето на показанной паре критериев
  const better2 = (p, q) => {
    // p не хуже q по обоим показанным критериям и строго лучше хотя бы по одному
    const d1 = (xs[p] - xs[q]) * cx.dir, d2 = (ys[p] - ys[q]) * cy.dir;
    return d1 >= 0 && d2 >= 0 && (d1 > 0 || d2 > 0);
  };
  const front = [];
  for (let i = 0; i < st.alts.length; i++) {
    let dominated = false;
    for (let q = 0; q < st.alts.length && !dominated; q++) {
      if (q !== i && better2(q, i)) dominated = true;
    }
    if (!dominated) front.push(i);
  }
  front.sort((p, q) => xs[p] - xs[q]);
  if (front.length > 1) {
    s += '<path d="M ' + front.map((i) => `${PX(xs[i]).toFixed(1)} ${PY(ys[i]).toFixed(1)}`).join(' L ')
      + '" fill="none" stroke="#5b21b6" stroke-width="1.8" stroke-dasharray="6 4"/>';
  }

  // линия уровня свёртки через победителя: w_x·ñ_x + w_y·ñ_y = const
  const r = ranges();
  const nx = (v) => (r[jx].span === 0 ? 1
    : (cx.dir > 0 ? (v - r[jx].lo) : (r[jx].hi - v)) / r[jx].span);
  const ny = (v) => (r[jy].span === 0 ? 1
    : (cy.dir > 0 ? (v - r[jy].lo) : (r[jy].hi - v)) / r[jy].span);
  const best = an.best;
  let lineDrawn = false;
  if (best) {
    const bx = PX(xs[best.i]), by = PY(ys[best.i]);
    // ñ как линейная функция пикселя
    const invX = (p) => rx.lo + (p - X0) / (X1 - X0) * (rx.hi - rx.lo);
    const invY = (p) => ry.lo + (Y1 - p) / (Y1 - Y0) * (ry.hi - ry.lo);
    const ax0 = nx(invX(0)), axb = nx(invX(1)) - ax0;
    const ay0 = ny(invY(0)), ayb = ny(invY(1)) - ay0;
    const A = an.w[jx] * axb, B = an.w[jy] * ayb;
    const C = A * bx + B * by;
    const seg = (Math.abs(A) > 1e-12 || Math.abs(B) > 1e-12)
      ? clipLine(A, B, C, X0, X1, Y0, Y1) : null;
    if (seg) {
      s += `<path d="M ${seg[0][0].toFixed(1)} ${seg[0][1].toFixed(1)} L ${seg[1][0].toFixed(1)} ${seg[1][1].toFixed(1)}"`
        + ' fill="none" stroke="#1a7f37" stroke-width="1.6" stroke-dasharray="4 3"/>';
      lineDrawn = true;
    }
    s += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="9" fill="none" stroke="#1a7f37" stroke-width="1.8"/>`;
  }

  // точки
  const items = [];
  an.rows.forEach((row) => {
    const x = PX(xs[row.i]), y = PY(ys[row.i]);
    if (row.pareto) {
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#5b21b6"/>`;
    } else {
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#ffffff" stroke="#6b6b74" stroke-width="1.6"/>`;
    }
    items.push({ x, y, full: row.code + ' ' + row.name, short: row.code,
      fill: row.pareto ? '#16161a' : '#6b6b74' });
  });
  placeLabels(items, W, H, cx.dir > 0 ? 1 : -1, cy.dir > 0 ? -1 : 1).forEach((p) => {
    s += `<text x="${p.use.tx.toFixed(1)}" y="${p.use.ty.toFixed(1)}" text-anchor="${p.use.anchor}"`
      + ` style="font:10.5px system-ui;fill:${p.it.fill}">${esc(p.use.txt)}</text>`;
  });

  // легенда
  const LY = 372;
  s += `<circle cx="20" cy="${LY - 4}" r="5" fill="#5b21b6"/>`;
  s += `<text x="30" y="${LY}" style="font:10.5px system-ui;fill:#16161a">Парето</text>`;
  s += `<circle cx="96" cy="${LY - 4}" r="4.5" fill="#ffffff" stroke="#6b6b74" stroke-width="1.6"/>`;
  s += `<text x="106" y="${LY}" style="font:10.5px system-ui;fill:#6b6b74">доминируется</text>`;
  s += `<path d="M 218 ${LY - 4} H 248" fill="none" stroke="#5b21b6" stroke-width="1.8" stroke-dasharray="6 4"/>`;
  s += `<text x="254" y="${LY}" style="font:10.5px system-ui;fill:#16161a">фронт на этой паре</text>`;
  s += `<path d="M 390 ${LY - 4} H 420" fill="none" stroke="#1a7f37" stroke-width="1.6" stroke-dasharray="4 3"/>`;
  s += `<text x="426" y="${LY}" style="font:10.5px system-ui;fill:#1a7f37">линия уровня свёртки</text>`;

  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="geo-board" style="max-width:640px">${s}</svg>`;

  // пояснение под графиком
  let note = '';
  if (best) {
    note += `Зелёным кружком обведён победитель свёртки — ${best.code} «${esc(best.name)}», `
      + `S = ${fmt3(best.s)}. `;
    if (lineDrawn) {
      note += 'Через него проведена линия уровня свёртки; её нормаль — вектор весов '
        + `(${fmt2(an.w[jx])}; ${fmt2(an.w[jy])}) показанных критериев. `
        + 'Меняйте веса — линия поворачивается, и победителем становится другая точка. ';
    }
  }
  const hidden = an.rows.filter((row) => row.pareto && front.indexOf(row.i) < 0);
  if (hidden.length) {
    note += 'Внимание, это проекция: '
      + hidden.map((row) => row.code).join(', ')
      + (hidden.length > 1 ? ' недоминируемы' : ' недоминируем')
      + ' по всему набору критериев, но на показанной паре лежат ниже фронта — '
      + 'их преимущество проявляется по критериям, которых на этих осях нет.';
  }
  $('chart-note').innerHTML = note;
}

/* ——— общая перерисовка ——— */

function renderOut() {
  const an = analysis();
  renderPareto(an);
  renderConv(an);
  renderChart(an);
}

function renderSelects() {
  const opts = (sel) => st.crit.map((c) =>
    `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
  if (!st.crit.some((c) => c.id === st.px)) st.px = st.crit.length ? st.crit[0].id : '';
  if (!st.crit.some((c) => c.id === st.py)) {
    st.py = st.crit.length > 1 ? st.crit[1].id : st.px;
  }
  $('sel-x').innerHTML = opts(st.px);
  $('sel-y').innerHTML = opts(st.py);
}

function render() {
  renderSelects();
  renderCrit();
  renderTable();
  renderOut();
}

/* ——— события ——— */

const critById = (id) => st.crit.find((c) => c.id === id);
const altById = (id) => st.alts.find((a) => a.id === id);

function onClick(ev) {
  const t = ev.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  if (act === 'cdel') {
    if (st.crit.length <= 2) return;
    const j = cIndex(t.dataset.c);
    st.crit.splice(j, 1);
    st.alts.forEach((a) => a.v.splice(j, 1));
  } else if (act === 'adel') {
    if (st.alts.length <= 2) return;
    st.alts = st.alts.filter((a) => a.id !== t.dataset.a);
  } else { return; }
  render();
}

function onInput(ev) {
  const t = ev.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  if (act === 'cname') {
    const c = critById(t.dataset.c);
    if (!c) return;
    c.name = t.value;
    renderSelects();
    // заголовки таблицы обновляем на месте, чтобы не терять фокус
    const ths = document.querySelectorAll('#tbl thead th');
    const j = cIndex(c.id);
    if (ths[j + 2]) {
      ths[j + 2].innerHTML = esc(c.name) + '<br><span class="muted">'
        + (c.dir > 0 ? 'max' : 'min') + '</span>';
    }
    renderOut();
    return;
  }
  if (act === 'aname') {
    const a = altById(t.dataset.a);
    if (a) { a.name = t.value; renderOut(); }
    return;
  }
  if (act === 'aval') {
    const a = altById(t.dataset.a);
    if (a) { a.v[+t.dataset.j] = t.value === '' ? 0 : num(t.value); renderOut(); }
    return;
  }
  if (act === 'cw' || act === 'cwn') {
    const c = critById(t.dataset.c);
    if (!c) return;
    c.w = Math.max(0, Math.min(100, num(t.value)));
    document.querySelectorAll('[data-c="' + c.id + '"]').forEach((el) => {
      if (el !== t && (el.dataset.act === 'cw' || el.dataset.act === 'cwn')) el.value = c.w;
    });
    refreshWeights();
    renderOut();
  }
}

function onChange(ev) {
  const t = ev.target.closest('[data-act]');
  if (!t || t.dataset.act !== 'cdir') return;
  const c = critById(t.dataset.c);
  if (!c) return;
  c.dir = +t.value > 0 ? 1 : -1;
  render();
}

function init() {
  render();
  $('crits').addEventListener('click', onClick);
  $('crits').addEventListener('input', onInput);
  $('crits').addEventListener('change', onChange);
  $('tbl').addEventListener('click', onClick);
  $('tbl').addEventListener('input', onInput);
  $('btn-cadd').addEventListener('click', () => {
    st.crit.push({ id: nid(), name: 'новый критерий', dir: 1, w: 10 });
    st.alts.forEach((a) => a.v.push(0));
    render();
  });
  $('btn-aadd').addEventListener('click', () => {
    st.alts.push({ id: nid(), name: 'новый вариант', v: st.crit.map(() => 0) });
    render();
  });
  $('btn-reset').addEventListener('click', () => { st = demoState(); render(); });
  $('sel-x').addEventListener('change', () => { st.px = $('sel-x').value; renderOut(); });
  $('sel-y').addEventListener('change', () => { st.py = $('sel-y').value; renderOut(); });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }
})();
