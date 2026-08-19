/* Данные каркаса страниц. Машинерия — assets/shell.js. */
'use strict';
(function () {
  const me = document.currentScript;
  const root = (me && me.dataset.root) || './';
  buildSiteShell({
    root,
    page: (me && me.dataset.page) || '',
    brand: 'Теория систем и ТРИЗ',
    logo: `
  <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
    <rect x="1" y="1" width="28" height="28" rx="6" fill="#5b21b6"/>
    <text x="15" y="22" text-anchor="middle" font-size="16">🧩</text>
  </svg>`,
    nav: [
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
    ],
    footer: `<div>Учебный сайт по курсу «Теория систем и системный анализ» · системный подход, ТРИЗ и живые инструменты выбора</div>`,
    markers: `<marker id="arrE" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="#16161a"/></marker>
    <marker id="arrS" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M10,0 L0,4 L10,8 z" fill="#16161a"/></marker>`,
  });
})();
