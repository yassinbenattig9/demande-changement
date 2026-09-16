'use strict';

const pad = (n) => String(n).padStart(2, '0');

const isHash = (p) => typeof p === 'string' && p.startsWith('$2');
const normEmail = (e) => String(e || '').trim().toLowerCase();
const todayFr = () => {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const nowFr = () => {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

module.exports = { isHash, normEmail, todayFr, nowFr };