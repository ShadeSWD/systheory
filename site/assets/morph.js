/* Морфологический ящик: признаки (оси), варианты исполнения, число сочетаний,
   отсев по условиям совместимости, ранжирование по сумме баллов.
   Исходный пример — морфологическая таблица «Корабль» из лекции 3 курса. */
'use strict';
(function () {

const ENUM_LIMIT = 400000;   // до этого числа сочетаний перебираем явно

function lectureState() {
  const ax = (name, opts) => ({
    id: nid(), name,
    opts: opts.map((o) => ({ id: nid(), name: o[0], score: o[1] })),
  });
  const s = {
    axes: [
      ax('Корпус', [['подводный', 5], ['водоизмещающий', 9], ['полупогружённый', 6],
        ['глиссирующий', 5], ['с подводным крылом', 5], ['с воздушной подушкой', 4]]),
      ax('Энергетика', [['дизель-генератор', 9], ['турбогенератор', 7], ['валогенератор', 8],
        ['ветрогенератор', 4], ['аккумуляторы', 5], ['атомный реактор', 4]]),
      ax('Двигатель', [['паровая машина', 2], ['паровая турбина', 5], ['газовая турбина', 7],
        ['электромотор', 8], ['реактивный двигатель', 3], ['роторный двигатель', 4]]),
      ax('Движитель', [['парус', 3], ['роторный', 3], ['крыльчатый', 5],
        ['водомётный', 6], ['гребное колесо', 2], ['гребной винт', 9]]),
      ax('Стабилизация', [['гироскоп', 5], ['пассивные цистерны', 7], ['активные цистерны', 6],
        ['скуловые кили', 8], ['бортовые рули', 6]]),
      ax('Управление', [['простой руль', 8], ['руль с закрылком', 7], ['управляющая насадка', 6],
        ['активный руль', 6], ['подруливающее устройство', 5]]),
    ],
    bans: [],
    show: 20,
  };
  const find = (an, on) => {
    const a = s.axes.find((x) => x.name === an);
    return { a: a.id, o: a.opts.find((x) => x.name === on).id };
  };
  const p1 = find('Стабилизация', 'скуловые кили');
  const p2 = find('Корпус', 'с воздушной подушкой');
  const p3 = find('Движитель', 'гребное колесо');
  s.bans.push({ id: nid(), a1: p1.a, o1: p1.o, a2: p2.a, o2: p2.o });
  s.bans.push({ id: nid(), a1: p3.a, o1: p3.o, a2: p2.a, o2: p2.o });
  return s;
}

let st = lectureState();

/* число сочетаний: целое с разделителями разрядов */
const fmtCount = (n) => n.toLocaleString('ru-RU');
const axById = (id) => st.axes.find((a) => a.id === id);
const optById = (a, id) => a && a.opts.find((o) => o.id === id);

/* ——— расчёты ——— */

function total() {
  return st.axes.reduce((p, a) => p * Math.max(a.opts.length, 0), 1);
}

// нормализованные запреты: только те, чьи оси и варианты ещё существуют,
// и чьи оси различны
function liveBans() {
  return st.bans.filter((b) => {
    const a1 = axById(b.a1), a2 = axById(b.a2);
    return a1 && a2 && a1 !== a2 && optById(a1, b.o1) && optById(a2, b.o2);
  });
}

// точный подсчёт допустимых сочетаний по формуле включений-исключений
function allowedCountIE() {
  const bans = liveBans();
  const N = total();
  if (!N) return 0;
  if (bans.length > 20) return null;
  let sum = 0;
  const m = bans.length;
  for (let mask = 0; mask < (1 << m); mask++) {
    const fixed = new Map();
    let ok = true, bits = 0;
    for (let i = 0; i < m && ok; i++) {
      if (!(mask & (1 << i))) continue;
      bits++;
      const b = bans[i];
      for (const [ai, oi] of [[b.a1, b.o1], [b.a2, b.o2]]) {
        if (fixed.has(ai) && fixed.get(ai) !== oi) { ok = false; break; }
        fixed.set(ai, oi);
      }
    }
    if (!ok) continue;
    let cnt = N;
    fixed.forEach((_o, ai) => { cnt /= axById(ai).opts.length; });
    sum += (bits % 2 ? -1 : 1) * cnt;
  }
  return sum;
}

// перебор допустимых сочетаний (для списка и ранжирования)
function enumerate() {
  const N = total();
  if (!N || N > ENUM_LIMIT) return null;
  const bans = liveBans().map((b) => {
    const i1 = st.axes.indexOf(axById(b.a1));
    const i2 = st.axes.indexOf(axById(b.a2));
    return {
      i1, j1: axById(b.a1).opts.findIndex((o) => o.id === b.o1),
      i2, j2: axById(b.a2).opts.findIndex((o) => o.id === b.o2),
    };
  });
  const n = st.axes.length;
  const res = [];
  const cur = new Array(n).fill(-1);
  const conflicts = (level) => bans.some((b) => {
    if (b.i1 > level || b.i2 > level) return false;
    return cur[b.i1] === b.j1 && cur[b.i2] === b.j2;
  });
  (function rec(level) {
    if (level === n) {
      let s = 0;
      for (let i = 0; i < n; i++) s += (+st.axes[i].opts[cur[i]].score) || 0;
      res.push({ idx: cur.slice(), score: s });
      return;
    }
    const opts = st.axes[level].opts;
    for (let j = 0; j < opts.length; j++) {
      cur[level] = j;
      if (!conflicts(level)) rec(level + 1);
    }
    cur[level] = -1;
  })(0);
  return res;
}

/* ——— отрисовка ——— */

function renderAxes() {
  const html = st.axes.map((a, ai) => {
    const opts = a.opts.map((o) => `
      <div class="mo-opt">
        <input type="text" data-act="oname" data-a="${a.id}" data-o="${o.id}"
               value="${esc(o.name)}" size="20" aria-label="название варианта">
        <input type="number" data-act="oscore" data-a="${a.id}" data-o="${o.id}"
               value="${o.score}" min="0" max="10" step="1" style="width:64px"
               aria-label="балл варианта">
        <button class="btn small" type="button" data-act="odel" data-a="${a.id}"
                data-o="${o.id}" title="удалить вариант">×</button>
      </div>`).join('');
    return `<div class="mo-axis">
      <div class="mo-axis-h">
        <input type="text" data-act="aname" data-a="${a.id}" value="${esc(a.name)}"
               size="18" aria-label="название признака">
        <span class="muted">вариантов: ${a.opts.length}</span>
        <button class="btn small" type="button" data-act="oadd" data-a="${a.id}">+ вариант</button>
        <button class="btn small" type="button" data-act="adel" data-a="${a.id}">удалить признак ${ai + 1}</button>
      </div>
      <div class="mo-opts">${opts}</div>
    </div>`;
  }).join('');
  $('axes').innerHTML = html;
}

function renderBanControls() {
  const opts = st.axes.map((a) => a.opts.map((o) =>
    `<option value="${a.id}|${o.id}">${esc(a.name)}: ${esc(o.name)}</option>`).join('')).join('');
  $('ban-a').innerHTML = opts;
  $('ban-b').innerHTML = opts;
  const bans = liveBans();
  $('bans').innerHTML = bans.length === 0
    ? '<div class="muted">запретов нет — считаются все сочетания</div>'
    : bans.map((b) => {
      const a1 = axById(b.a1), a2 = axById(b.a2);
      return `<div class="mo-ban">
        <span>${esc(a1.name)}: <b>${esc(optById(a1, b.o1).name)}</b>
        &nbsp;&times;&nbsp; ${esc(a2.name)}: <b>${esc(optById(a2, b.o2).name)}</b></span>
        <button class="btn small" type="button" data-act="bdel" data-b="${b.id}">убрать</button>
      </div>`;
    }).join('');
}

function renderStats(list) {
  const N = total();
  const factors = st.axes.map((a) => a.opts.length);
  const allowed = allowedCountIE();
  const cut = allowed === null ? null : N - allowed;
  let h = `<div class="calc-row">\\(N = n_1 n_2 \\ldots n_k\\) = `
    + `<span style="color:#6b6b74">${factors.join(' · ')}</span> = <b>${fmtCount(N)}</b> сочетаний</div>`;
  if (allowed === null) {
    h += '<div class="calc-row">Запретов слишком много для точного подсчёта — уберите часть.</div>';
  } else {
    h += `<div class="calc-row">Запреты вычёркивают <b>${fmtCount(cut)}</b> сочетаний `
      + `(${(N ? 100 * cut / N : 0).toFixed(2).replace('.', ',')} % от общего числа)</div>`
      + `<div class="calc-row">Допустимых сочетаний: <span class="readout">${fmtCount(allowed)}</span></div>`;
    if (list) {
      const check = list.length === allowed ? 'ok' : 'bad';
      h += `<div class="calc-row"><span class="badge ${check}">`
        + `перебор даёт ${fmtCount(list.length)} — ${check === 'ok' ? 'совпадает с формулой' : 'расхождение!'}`
        + '</span></div>';
    } else {
      h += '<div class="calc-row muted">Сочетаний слишком много для перечисления — '
        + 'показаны только числа. Уберите варианты или признаки, чтобы увидеть список.</div>';
    }
  }
  $('stats').innerHTML = h;
}

function comboRow(c) {
  return '<td>' + c.idx.map((j, i) => esc(st.axes[i].opts[j].name)).join('</td><td>') + '</td>';
}

function renderList(list) {
  if (!list) { $('list').innerHTML = ''; $('top').innerHTML = ''; return; }
  const head = '<tr><th class="num">№</th><th>'
    + st.axes.map((a) => esc(a.name)).join('</th><th>')
    + '</th><th class="num">сумма баллов</th></tr>';
  const shown = list.slice(0, st.show);
  const rows = shown.map((c, i) =>
    `<tr><td class="num">${i + 1}</td>${comboRow(c)}<td class="num">${c.score}</td></tr>`).join('');
  $('list').innerHTML = `<table class="el"><thead>${head}</thead><tbody>${rows}</tbody></table>`
    + `<div class="controls"><span class="muted">показано ${fmtCount(shown.length)} из `
    + `${fmtCount(list.length)} допустимых</span>`
    + (st.show < list.length
      ? '<button class="btn small" type="button" data-act="more">показать ещё 20</button>' : '')
    + (st.show > 20
      ? '<button class="btn small" type="button" data-act="less">свернуть</button>' : '')
    + '</div>';

  const best = list.slice().sort((a, b) => b.score - a.score).slice(0, 10);
  const brows = best.map((c, i) =>
    `<tr${i === 0 ? ' class="pick"' : ''}><td class="num">${i + 1}</td>${comboRow(c)}`
    + `<td class="num">${c.score}</td></tr>`).join('');
  $('top').innerHTML = `<table class="el"><thead>${head}</thead><tbody>${brows}</tbody></table>`;
}

function render() {
  renderAxes();
  renderBanControls();
  const list = enumerate();
  renderStats(list);
  renderList(list);
  mathify($('stats'));
}

/* ——— события ——— */

function onClick(ev) {
  const t = ev.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  const a = t.dataset.a ? axById(t.dataset.a) : null;
  if (act === 'oadd' && a) {
    a.opts.push({ id: nid(), name: 'новый вариант', score: 5 });
  } else if (act === 'odel' && a) {
    if (a.opts.length <= 1) { return; }
    a.opts = a.opts.filter((o) => o.id !== t.dataset.o);
  } else if (act === 'adel' && a) {
    if (st.axes.length <= 2) { return; }
    st.axes = st.axes.filter((x) => x.id !== a.id);
  } else if (act === 'bdel') {
    st.bans = st.bans.filter((b) => b.id !== t.dataset.b);
  } else if (act === 'more') {
    st.show += 20;
  } else if (act === 'less') {
    st.show = 20;
  } else { return; }
  render();
}

function onInput(ev) {
  const t = ev.target.closest('[data-act]');
  if (!t) return;
  const a = t.dataset.a ? axById(t.dataset.a) : null;
  if (t.dataset.act === 'aname' && a) { a.name = t.value; renderBanControls(); return; }
  if (t.dataset.act === 'oname' && a) {
    const o = optById(a, t.dataset.o); if (o) { o.name = t.value; }
    renderBanControls(); renderList(enumerate()); return;
  }
  if (t.dataset.act === 'oscore' && a) {
    const o = optById(a, t.dataset.o);
    if (o) { o.score = Math.max(0, Math.min(10, +t.value || 0)); }
    renderList(enumerate()); return;
  }
}

function init() {
  render();
  $('axes').addEventListener('click', onClick);
  $('bans').addEventListener('click', onClick);
  $('list').addEventListener('click', onClick);
  $('axes').addEventListener('input', onInput);
  $('axes').addEventListener('change', (ev) => {
    // изменение числа вариантов влияет на общее число сочетаний
    if (ev.target.dataset && ev.target.dataset.act === 'oscore') render();
  });
  $('btn-axadd').addEventListener('click', () => {
    st.axes.push({ id: nid(), name: 'новый признак',
      opts: [{ id: nid(), name: 'вариант 1', score: 5 },
        { id: nid(), name: 'вариант 2', score: 5 }] });
    render();
  });
  $('btn-banadd').addEventListener('click', () => {
    const [a1, o1] = $('ban-a').value.split('|');
    const [a2, o2] = $('ban-b').value.split('|');
    if (a1 === a2) {
      $('banmsg').textContent = 'Запрет связывает варианты РАЗНЫХ признаков.';
      return;
    }
    if (st.bans.some((b) =>
      (b.a1 === a1 && b.o1 === o1 && b.a2 === a2 && b.o2 === o2)
      || (b.a1 === a2 && b.o1 === o2 && b.a2 === a1 && b.o2 === o1))) {
      $('banmsg').textContent = 'Такой запрет уже есть.';
      return;
    }
    $('banmsg').textContent = '';
    st.bans.push({ id: nid(), a1, o1, a2, o2 });
    render();
  });
  $('btn-reset').addEventListener('click', () => { st = lectureState(); render(); });
}

onReady(init);
})();
