/* common.js — мелкие помощники, общие для страниц-инструментов (морфологический
 * ящик, Парето, разбор противоречия): доступ к элементу, экранирование текста,
 * сквозные ключи для строк таблиц и дорисовка формул KaTeX.
 * Подключается перед скриптом страницы. */
'use strict';

/* Элемент страницы по id. */
const $ = (id) => document.getElementById(id);

/* Экранирование пользовательского текста перед вставкой в HTML. */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Ключ для строки таблицы: k1, k2, … — переживает пересортировку и удаление. */
let uid = 0;
const nid = () => 'k' + (++uid);

/* Дорисовать формулы в динамически собранном фрагменте.
   Если KaTeX ещё не загружен — формула останется текстом. */
const mathify = (node) => {
  if (!node || !window.renderMathInElement) return;
  try {
    window.renderMathInElement(node, {
      delimiters: [{ left: '$$', right: '$$', display: true },
        { left: '\\(', right: '\\)', display: false }],
      throwOnError: false,
    });
  } catch (e) { /* KaTeX не готов — оставляем формулу текстом */ }
};

/* Запуск после готовности DOM. */
const onReady = (fn) => (document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', fn) : fn());
