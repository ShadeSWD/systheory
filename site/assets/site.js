/* Каркас страниц «Теория систем и ТРИЗ»: шапка с группированной навигацией,
   подвал и общие SVG-маркеры стрелок. */
'use strict';
(function () {
  const me = document.currentScript;
  const root = (me && me.dataset.root) || './';
  const page = (me && me.dataset.page) || '';
  const logoSvg = `
  <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
    <rect x="1" y="1" width="28" height="28" rx="6" fill="#5b21b6"/>
    <text x="15" y="22" text-anchor="middle" font-size="16">🧩</text>
  </svg>`;
  const nav = [
    { h: '', k: 'index', t: 'Обзор' },
    { t: 'Теория', h: 'theory', drop: [
      { h: 'theory', k: 'theory', t: 'Оглавление курса' },
      { h: 't-system', k: 't-system', t: '1. Что такое система' },
      { h: 't-analysis', k: 't-analysis', t: '2. Системный анализ' },
      { h: 't-models', k: 't-models', t: '3. Модели и моделирование' },
      { h: 't-decision', k: 't-decision', t: '4. Принятие решений' },
      { h: 't-triz-basics', k: 't-triz-basics', t: '5. ТРИЗ: основы' },
      { h: 't-triz-tools', k: 't-triz-tools', t: '6. Инструменты ТРИЗ' },
      { h: 't-morph', k: 't-morph', t: '7. Морфологический анализ' },
      { h: 't-creative', k: 't-creative', t: '8. Другие методы поиска решений' },
    ] },
    { t: 'Методы', h: 'p-morph', drop: [
      { h: 'p-morph', k: 'p-morph', t: 'Морфологический ящик' },
      { h: 'p-pareto', k: 'p-pareto', t: 'Многокритериальный выбор и Парето' },
      { h: 'p-contradiction', k: 'p-contradiction', t: 'Разбор противоречия' },
    ] },
    { h: 'sources', k: 'sources', t: 'Источники' },
  ];
  const navLink = (it) =>
    `<a href="${root}${it.h}" class="${page === it.k ? 'on' : ''}">${it.t}</a>`;
  const navHtml = nav.map((g) => {
    if (!g.drop) return navLink(g);
    const on = g.drop.some((it) => page === it.k) ? 'on' : '';
    return `<span class="nav-drop"><a href="${root}${g.h}" class="${on}">${g.t} ▾</a>`
      + `<span class="drop">${g.drop.map(navLink).join('')}</span></span>`;
  }).join('');
  const header = document.createElement('header');
  header.className = 'site';
  header.innerHTML = `<div class="wrap">
    <a class="logo" href="${root}">${logoSvg}<span>Теория систем и ТРИЗ</span></a>
    <nav class="top">${navHtml}</nav>
  </div>`;
  document.body.prepend(header);
  const onReady = (fn) => (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn) : fn());
  const footer = document.createElement('footer');
  footer.className = 'site';
  footer.innerHTML = `<div class="wrap">
    <div>Учебный сайт по курсу «Теория систем и системный анализ» · системный подход, ТРИЗ и живые инструменты выбора</div>
  </div>`;
  onReady(() => document.body.appendChild(footer));
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  defs.innerHTML = `<defs>
    <marker id="arrE" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="#16161a"/></marker>
    <marker id="arrS" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M10,0 L0,4 L10,8 z" fill="#16161a"/></marker>
  </defs>`;
  onReady(() => document.body.appendChild(defs));
})();
