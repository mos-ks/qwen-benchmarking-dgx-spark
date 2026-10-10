'use strict';

const CATS = {
  housing:       { label: 'Housing',       kind: 'expense', color: 'var(--c-housing)',       budget: 1500 },
  groceries:     { label: 'Groceries',     kind: 'expense', color: 'var(--c-groceries)',     budget: 480 },
  dining:        { label: 'Dining out',    kind: 'expense', color: 'var(--c-dining)',        budget: 300 },
  transport:     { label: 'Transport',     kind: 'expense', color: 'var(--c-transport)',     budget: 180 },
  utilities:     { label: 'Utilities',     kind: 'expense', color: 'var(--c-utilities)',     budget: 240 },
  entertainment: { label: 'Entertainment', kind: 'expense', color: 'var(--c-entertainment)', budget: 150 },
  shopping:      { label: 'Shopping',      kind: 'expense', color: 'var(--c-shopping)',      budget: 300 },
  health:        { label: 'Health',        kind: 'expense', color: 'var(--c-health)',        budget: 100 },
  subscriptions: { label: 'Subscriptions', kind: 'expense', color: 'var(--c-subs)',          budget: 60 },
  salary:        { label: 'Salary',        kind: 'income',  color: 'var(--c-salary)' },
  freelance:     { label: 'Freelance',     kind: 'income',  color: 'var(--c-freelance)' }
};

const ICONS = {
  housing: '<path d="M3 9.5 12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20Z"/><path d="M9 21.5V12h6v9.5"/>',
  groceries: '<circle cx="9" cy="20.4" r="1.5"/><circle cx="17.6" cy="20.4" r="1.5"/><path d="M2.5 3.5h2.8l2.4 12a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L21 7H6"/>',
  dining: '<path d="M6.5 3v5.5a2.5 2.5 0 0 0 5 0V3"/><path d="M9 8.5V21"/><path d="M17.5 3c1.7 1.7 2.2 4.6 1.4 7-.4 1.3-1.3 2.1-2.3 2.4V21"/>',
  transport: '<path d="M4 16.5v-4l1.8-4.5A2 2 0 0 1 7.7 6.6h8.6a2 2 0 0 1 1.9 1.4L20 12.5v4"/><path d="M4 12.5h16"/><path d="M5.5 16.5h13"/><circle cx="7.2" cy="16.5" r="1.8"/><circle cx="16.8" cy="16.5" r="1.8"/>',
  utilities: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"/>',
  entertainment: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5 16 12l-6 3.5Z"/>',
  shopping: '<path d="M6 2.5 3.5 6.5V19a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V6.5L18 2.5Z"/><path d="M3.5 6.5h17"/><path d="M16 10.5a4 4 0 0 1-8 0"/>',
  health: '<path d="M20.3 5.7a5 5 0 0 0-7.1 0L12 6.9l-1.2-1.2a5 5 0 1 0-7.1 7.1L12 21.1l8.3-8.3a5 5 0 0 0 0-7.1Z"/>',
  subscriptions: '<path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11V9a3 3 0 0 1 3-3h14"/><path d="M7 21.5 3.5 18 7 14.5"/><path d="M20.5 13v2a3 3 0 0 1-3 3h-14"/>',
  salary: '<rect x="2.5" y="7.5" width="19" height="13" rx="2"/><path d="M16 7.5V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2.5"/>',
  freelance: '<path d="m4 17 6-5-6-5"/><path d="M12 19h8"/>'
};

const START_BALANCE = 6200;

const t = (date, name, cat, amt) => ({ date, name, cat, amt });

const SUBS = (d) => [
  t(d + '-01', 'Spotify Premium', 'subscriptions', 11.99),
  t(d + '-01', 'Netflix', 'subscriptions', 15.49),
  t(d + '-01', 'iCloud+ 200GB', 'subscriptions', 2.99),
  t(d + '-01', 'NYTimes', 'subscriptions', 17.00)
];

const UTILS = (d, electric) => [
  t(d + '-04', 'Con Edison electric', 'utilities', electric),
  t(d + '-04', 'Verizon Fios internet', 'utilities', 65.00),
  t(d + '-04', 'T-Mobile', 'utilities', 45.00)
];

const RENT = (d) => t(d + '-01', 'Rent — Maple St Apartments', 'housing', 1450);

const MONTHS = [
  {
    key: '2026-03', label: 'March 2026', short: 'Mar', baseline: true,
    tx: [
      t('2026-03-01', 'Acme Corp payroll', 'salary', 4200),
      RENT('2026-03'),
      t('2026-03-03', "Trader Joe's", 'groceries', 88.30),
      t('2026-03-10', 'Whole Foods', 'groceries', 74.60),
      t('2026-03-17', 'Costco', 'groceries', 118.20),
      t('2026-03-24', "Trader Joe's", 'groceries', 66.15),
      t('2026-03-31', 'Whole Foods', 'groceries', 96.40),
      t('2026-03-05', 'Blue Bottle Coffee', 'dining', 14.20),
      t('2026-03-12', 'Sweetgreen', 'dining', 38.90),
      t('2026-03-19', 'Chipotle', 'dining', 26.40),
      t('2026-03-26', 'Olive & Ivy', 'dining', 51.80),
      t('2026-03-04', 'Shell gas', 'transport', 49.90),
      t('2026-03-14', 'Lyft', 'transport', 15.60),
      t('2026-03-21', 'Metro card refill', 'transport', 33.00),
      t('2026-03-28', 'Shell gas', 'transport', 52.40),
      ...UTILS('2026-03', 128.40),
      t('2026-03-07', 'Museum of Natural History', 'entertainment', 28.50),
      t('2026-03-22', 'Jazz club cover', 'entertainment', 60.00),
      t('2026-03-09', 'Amazon', 'shopping', 41.20),
      t('2026-03-21', 'Strand Bookstore', 'shopping', 24.99),
      t('2026-03-16', 'Dr. Alvarez copay', 'health', 45.00),
      ...SUBS('2026-03')
    ]
  },
  {
    key: '2026-04', label: 'April 2026', short: 'Apr',
    tx: [
      t('2026-04-01', 'Acme Corp payroll', 'salary', 4200),
      RENT('2026-04'),
      t('2026-04-03', 'Whole Foods', 'groceries', 86.40),
      t('2026-04-09', "Trader Joe's", 'groceries', 54.20),
      t('2026-04-16', 'Whole Foods', 'groceries', 91.15),
      t('2026-04-23', 'Costco', 'groceries', 132.60),
      t('2026-04-30', "Trader Joe's", 'groceries', 48.75),
      t('2026-04-05', 'Blue Bottle Coffee', 'dining', 8.50),
      t('2026-04-11', 'Lunch with team', 'dining', 16.40),
      t('2026-04-12', 'Chipotle', 'dining', 23.10),
      t('2026-04-18', 'Ippudo ramen', 'dining', 19.75),
      t('2026-04-20', 'Sunday brunch', 'dining', 38.20),
      t('2026-04-25', 'Olive & Ivy', 'dining', 64.30),
      t('2026-04-02', 'Shell gas', 'transport', 48.20),
      t('2026-04-14', 'Lyft', 'transport', 14.80),
      t('2026-04-21', 'Metro card refill', 'transport', 33.00),
      ...UTILS('2026-04', 96.20),
      t('2026-04-07', 'AMC movie tickets', 'entertainment', 32.00),
      t('2026-04-19', 'Bombay Music Club concert', 'entertainment', 75.00),
      t('2026-04-10', 'Amazon — desk lamp', 'shopping', 45.99),
      t('2026-04-26', 'Uniqlo', 'shopping', 89.50),
      t('2026-04-15', 'Pharmacy — prescriptions', 'health', 24.80),
      ...SUBS('2026-04')
    ]
  },
  {
    key: '2026-05', label: 'May 2026', short: 'May',
    tx: [
      t('2026-05-01', 'Acme Corp payroll', 'salary', 4200),
      RENT('2026-05'),
      t('2026-05-02', "Trader Joe's", 'groceries', 61.20),
      t('2026-05-09', 'Whole Foods', 'groceries', 102.34),
      t('2026-05-17', 'Costco', 'groceries', 148.90),
      t('2026-05-24', "Trader Joe's", 'groceries', 57.80),
      t('2026-05-04', 'Blue Bottle Coffee', 'dining', 9.75),
      t('2026-05-10', 'Sushi Nakamura', 'dining', 58.40),
      t('2026-05-16', 'Shake Shack', 'dining', 21.50),
      t('2026-05-23', 'Joe’s Pizza', 'dining', 34.90),
      t('2026-05-30', 'Sunday brunch', 'dining', 42.00),
      t('2026-05-03', 'Shell gas', 'transport', 46.80),
      t('2026-05-12', 'Lyft', 'transport', 18.40),
      t('2026-05-19', 'Metro card refill', 'transport', 33.00),
      ...UTILS('2026-05', 62.50),
      t('2026-05-06', 'Whitney Museum', 'entertainment', 28.00),
      t('2026-05-24', 'Bowling night', 'entertainment', 24.50),
      t('2026-05-31', 'AMC movie tickets', 'entertainment', 16.50),
      t('2026-05-08', 'Amazon', 'shopping', 22.99),
      t('2026-05-20', 'Brooks running shoes', 'shopping', 120.00),
      t('2026-05-13', 'Gym — physio copay', 'health', 35.00),
      ...SUBS('2026-05')
    ]
  },
  {
    key: '2026-06', label: 'June 2026', short: 'Jun',
    tx: [
      t('2026-06-01', 'Acme Corp payroll', 'salary', 4200),
      t('2026-06-12', 'Freelance — logo project', 'freelance', 950),
      RENT('2026-06'),
      t('2026-06-02', 'Whole Foods', 'groceries', 95.60),
      t('2026-06-08', "Trader Joe's", 'groceries', 63.10),
      t('2026-06-15', 'Whole Foods', 'groceries', 110.25),
      t('2026-06-22', "Trader Joe's", 'groceries', 71.40),
      t('2026-06-03', 'Blue Bottle Coffee', 'dining', 18.60),
      t('2026-06-07', 'BaoHaus', 'dining', 42.80),
      t('2026-06-13', 'Los Tacos No. 1', 'dining', 65.20),
      t('2026-06-19', 'Chipotle', 'dining', 24.90),
      t('2026-06-25', 'Anniversary dinner — Le Coucou', 'dining', 88.40),
      t('2026-06-28', 'Corner pizza', 'dining', 31.20),
      t('2026-06-04', 'Shell gas', 'transport', 44.30),
      t('2026-06-11', 'Lyft', 'transport', 22.60),
      t('2026-06-18', 'Metro card refill', 'transport', 33.00),
      t('2026-06-25', 'Shell gas', 'transport', 52.10),
      t('2026-06-27', 'Amtrak — Hudson trip', 'transport', 78.00),
      ...UTILS('2026-06', 99.40),
      t('2026-06-09', 'SummerStage concert', 'entertainment', 95.00),
      t('2026-06-21', 'AMC movie tickets', 'entertainment', 16.50),
      t('2026-06-06', 'Amazon', 'shopping', 34.99),
      t('2026-06-14', 'Uniqlo summer gear', 'shopping', 64.90),
      t('2026-06-16', 'Pharmacy', 'health', 18.60),
      ...SUBS('2026-06')
    ]
  },
  {
    key: '2026-07', label: 'July 2026', short: 'Jul',
    tx: [
      t('2026-07-01', 'Acme Corp payroll', 'salary', 4200),
      t('2026-07-20', 'Freelance — landing page', 'freelance', 450),
      RENT('2026-07'),
      t('2026-07-02', "Trader Joe's", 'groceries', 78.40),
      t('2026-07-10', 'Whole Foods', 'groceries', 122.15),
      t('2026-07-17', "Trader Joe's", 'groceries', 66.80),
      t('2026-07-24', 'Costco — July 4th BBQ', 'groceries', 141.30),
      t('2026-07-31', 'Whole Foods', 'groceries', 90.55),
      t('2026-07-03', 'Ice cream truck + cafe', 'dining', 9.50),
      t('2026-07-04', 'BBQ sides to go', 'dining', 28.90),
      t('2026-07-11', 'Los Tacos No. 1', 'dining', 19.80),
      t('2026-07-18', 'Keens Steakhouse', 'dining', 96.40),
      t('2026-07-26', 'Blue Bottle Coffee', 'dining', 11.25),
      t('2026-07-05', 'Shell gas', 'transport', 54.20),
      t('2026-07-15', 'Lyft', 'transport', 16.80),
      t('2026-07-22', 'Metro card refill', 'transport', 33.00),
      t('2026-07-29', 'Shell gas', 'transport', 50.60),
      ...UTILS('2026-07', 142.10),
      t('2026-07-08', 'Fireworks festival tickets', 'entertainment', 45.00),
      t('2026-07-20', 'Mini golf', 'entertainment', 22.50),
      t('2026-07-27', 'AMC movie tickets', 'entertainment', 16.50),
      t('2026-07-07', 'Amazon', 'shopping', 28.40),
      t('2026-07-19', 'Swim & surf shop', 'shopping', 45.90),
      t('2026-07-14', 'Dentist — cleaning copay', 'health', 75.00),
      ...SUBS('2026-07')
    ]
  },
  {
    key: '2026-08', label: 'August 2026', short: 'Aug',
    tx: [
      t('2026-08-01', 'Acme Corp payroll', 'salary', 4200),
      RENT('2026-08'),
      t('2026-08-01', "Trader Joe's", 'groceries', 84.20),
      t('2026-08-08', 'Whole Foods', 'groceries', 59.90),
      t('2026-08-15', 'Costco', 'groceries', 128.70),
      t('2026-08-22', "Trader Joe's", 'groceries', 76.35),
      t('2026-08-29', 'Whole Foods', 'groceries', 119.80),
      t('2026-08-05', 'Chipotle', 'dining', 22.40),
      t('2026-08-12', 'BaoHaus', 'dining', 47.80),
      t('2026-08-18', 'Rooftop dinner — Westlight', 'dining', 98.40),
      t('2026-08-20', 'Los Tacos No. 1', 'dining', 36.50),
      t('2026-08-24', 'Sushi night', 'dining', 54.20),
      t('2026-08-27', 'Corner pizza', 'dining', 58.90),
      t('2026-08-04', 'Shell gas', 'transport', 44.30),
      t('2026-08-13', 'Lyft', 'transport', 19.20),
      t('2026-08-20', 'Metro card refill', 'transport', 33.00),
      t('2026-08-27', 'Shell gas', 'transport', 47.60),
      ...UTILS('2026-08', 178.30),
      t('2026-08-02', 'Luna Park — season pass', 'entertainment', 145.00),
      t('2026-08-16', 'Target — back-to-school', 'shopping', 165.20),
      t('2026-08-23', 'Amazon', 'shopping', 39.99),
      t('2026-08-11', 'Pharmacy', 'health', 29.40),
      ...SUBS('2026-08')
    ]
  },
  {
    key: '2026-09', label: 'September 2026', short: 'Sep',
    tx: [
      t('2026-09-01', 'Acme Corp payroll', 'salary', 4200),
      t('2026-09-18', 'Freelance — consulting', 'freelance', 700),
      RENT('2026-09'),
      t('2026-09-02', 'Whole Foods', 'groceries', 92.10),
      t('2026-09-09', "Trader Joe's", 'groceries', 68.45),
      t('2026-09-16', 'Whole Foods', 'groceries', 115.30),
      t('2026-09-23', "Trader Joe's", 'groceries', 82.60),
      t('2026-09-30', 'Costco', 'groceries', 56.30),
      t('2026-09-03', 'Blue Bottle Coffee', 'dining', 12.80),
      t('2026-09-09', 'Sweetgreen', 'dining', 35.20),
      t('2026-09-15', 'Chipotle', 'dining', 21.60),
      t('2026-09-22', 'Reunion dinner — The Smith', 'dining', 78.50),
      t('2026-09-26', 'Blue Bottle Coffee', 'dining', 14.95),
      t('2026-09-29', 'Sunday brunch', 'dining', 45.30),
      t('2026-09-04', 'Shell gas', 'transport', 55.40),
      t('2026-09-12', 'Lyft', 'transport', 21.30),
      t('2026-09-19', 'Metro card refill', 'transport', 33.00),
      t('2026-09-26', 'Shell gas', 'transport', 48.70),
      t('2026-09-28', 'Parking garage', 'transport', 12.00),
      ...UTILS('2026-09', 118.90),
      t('2026-09-06', 'Comedy Cellar', 'entertainment', 42.00),
      t('2026-09-25', 'AMC movie tickets', 'entertainment', 16.50),
      t('2026-09-08', 'Amazon — headphones', 'shopping', 129.99),
      t('2026-09-17', 'J.Crew — fall jacket', 'shopping', 186.40),
      t('2026-09-24', 'Amazon', 'shopping', 21.30),
      t('2026-09-11', 'Pharmacy', 'health', 22.10),
      ...SUBS('2026-09')
    ]
  }
];

const SELECTABLE = MONTHS.filter((m) => !m.baseline);

function aggregate(month) {
  const byCat = new Map();
  let income = 0;
  let spending = 0;
  for (const tx of month.tx) {
    if (CATS[tx.cat].kind === 'income') {
      income += tx.amt;
    } else {
      byCat.set(tx.cat, (byCat.get(tx.cat) || 0) + tx.amt);
      spending += tx.amt;
    }
  }
  return { income, spending, byCat };
}

function buildSeries() {
  let balance = START_BALANCE;
  return MONTHS.map((m) => {
    const agg = aggregate(m);
    balance += agg.income - agg.spending;
    return { ...m, income: agg.income, spending: agg.spending, byCat: agg.byCat, endBalance: balance };
  });
}

const SERIES = buildSeries();

function fmtMoney(v, cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0
  }).format(v);
}

function fmtK(v) {
  if (v === 0) return '$0';
  const k = v / 1000;
  return '$' + (Number.isInteger(k) ? k : k.toFixed(1)) + 'k';
}

function budgetStatus(ratio) {
  if (ratio > 1) return 'over';
  if (ratio >= 0.8) return 'warn';
  return 'ok';
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

function init() {
  const select = document.getElementById('monthSelect');
  SELECTABLE.slice().reverse().forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.key;
    opt.textContent = m.label;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => renderAll(select.value));
  renderTrendChart();
  renderAll(SELECTABLE[SELECTABLE.length - 1].key);
}

function monthIndex(key) {
  return SERIES.findIndex((m) => m.key === key);
}

function renderAll(key) {
  const i = monthIndex(key);
  renderKpis(i);
  renderCatChart(i);
  renderTransactions(i);
  renderBudgets(i);
}

/* ---------- tooltip ---------- */

const tipEl = () => document.getElementById('tooltip');

function showTip(html, x, y) {
  const tip = tipEl();
  tip.innerHTML = html;
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let left = x + 14;
  let top = y + 16;
  if (left + r.width > window.innerWidth - 8) left = x - r.width - 12;
  if (top + r.height > window.innerHeight - 8) top = y - r.height - 12;
  tip.style.left = Math.max(8, left) + 'px';
  tip.style.top = Math.max(8, top) + 'px';
}

function hideTip() {
  tipEl().hidden = true;
}

function bindTip(el, htmlFn) {
  el.addEventListener('mousemove', (e) => showTip(htmlFn(), e.clientX, e.clientY));
  el.addEventListener('mouseleave', hideTip);
  el.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    showTip(htmlFn(), touch.clientX, touch.clientY);
  }, { passive: true });
}

if (typeof document !== 'undefined') {
  document.addEventListener('touchstart', (e) => {
    if (!e.target.closest || !e.target.closest('[data-tip]')) hideTip();
  }, { passive: true });
}

function tipRows(title, rows) {
  return '<div class="tip-title">' + title + '</div>' + rows.map((r) =>
    '<div class="tip-row"><span class="dot" style="background:' + r.color + '"></span>' +
    r.label + '<span class="val">' + r.value + '</span></div>'
  ).join('');
}

/* ---------- icons ---------- */

function icon(cat) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[cat] + '</svg>';
}

const ARROW_UP = '<svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><path d="M5 1 9 8H1Z"/></svg>';
const ARROW_DOWN = '<svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><path d="M5 9 1 2h8Z"/></svg>';

/* ---------- KPI cards ---------- */

function sparkline(values, color) {
  const w = 84;
  const h = 26;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return x.toFixed(1) + ',' + y.toFixed(1);
  });
  const last = pts[pts.length - 1].split(',');
  return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' +
    '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color +
    '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>' +
    '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.2" fill="' + color + '"/></svg>';
}

function deltaChip(cur, prev, opts) {
  if (prev === 0 || prev == null) return '<span class="chip flat">no data</span>';
  const isRate = opts.rate;
  const delta = isRate ? cur - prev : (cur - prev) / Math.abs(prev) * 100;
  const goodDir = opts.goodDir;
  const rounded = Math.abs(delta) < 0.05;
  const up = delta > 0;
  const cls = rounded ? 'flat' : (delta * goodDir >= 0 ? 'good' : 'bad');
  const label = isRate
    ? Math.abs(delta).toFixed(1) + ' pts'
    : Math.abs(delta).toFixed(1) + '%';
  const arrow = rounded ? '' : (up ? ARROW_UP : ARROW_DOWN);
  return '<span class="chip ' + cls + '">' + arrow + label + '</span>';
}

function renderKpis(i) {
  const cur = SERIES[i];
  const prev = SERIES[i - 1];
  const rate = (m) => (m.income - m.spending) / m.income * 100;
  const six = SERIES.slice(1);
  const cards = [
    {
      label: 'Balance',
      value: fmtMoney(cur.endBalance),
      spark: six.map((m) => m.endBalance),
      sparkColor: 'var(--accent)',
      chip: deltaChip(cur.endBalance, prev.endBalance, { goodDir: 1 })
    },
    {
      label: 'Income',
      value: fmtMoney(cur.income),
      spark: six.map((m) => m.income),
      sparkColor: 'var(--income)',
      chip: deltaChip(cur.income, prev.income, { goodDir: 1 })
    },
    {
      label: 'Spending',
      value: fmtMoney(cur.spending),
      spark: six.map((m) => m.spending),
      sparkColor: 'var(--expense)',
      chip: deltaChip(cur.spending, prev.spending, { goodDir: -1 })
    },
    {
      label: 'Savings rate',
      value: rate(cur).toFixed(1) + '%',
      spark: six.map((m) => rate(m)),
      sparkColor: 'var(--accent)',
      chip: deltaChip(rate(cur), rate(prev), { goodDir: 1, rate: true })
    }
  ];
  document.getElementById('kpiGrid').innerHTML = cards.map((c) =>
    '<div class="kpi">' +
      '<div class="kpi-top"><span class="kpi-label">' + c.label + '</span>' +
      '<span class="kpi-spark">' + sparkline(c.spark, c.sparkColor) + '</span></div>' +
      '<div class="kpi-value">' + c.value + '</div>' +
      '<div class="kpi-foot">' + c.chip + '<span class="kpi-note">vs last month</span></div>' +
    '</div>'
  ).join('');
}

/* ---------- spending by category ---------- */

function renderCatChart(i) {
  const m = SERIES[i];
  document.getElementById('catSub').textContent = m.label + ' · ' + fmtMoney(m.spending) + ' total';
  const host = document.getElementById('catChart');
  const rows = [...m.byCat.entries()]
    .map(([cat, amt]) => ({ cat, amt, share: amt / m.spending }))
    .sort((a, b) => b.amt - a.amt);
  if (!rows.length) {
    host.innerHTML = '<p class="card-sub">No spending recorded this month.</p>';
    return;
  }
  const max = rows[0].amt;
  host.innerHTML = rows.map((r) =>
    '<div class="cat-row" data-tip>' +
      '<span class="cat-name"><span class="dot" style="background:' + CATS[r.cat].color + '"></span>' +
      '<span class="nm">' + CATS[r.cat].label + '</span></span>' +
      '<span class="cat-track"><span class="cat-fill" data-w="' + (r.amt / max * 100).toFixed(1) + '" style="background:' + CATS[r.cat].color + '"></span></span>' +
      '<span class="cat-val">' + fmtMoney(r.amt) + '<span class="pct">' + Math.round(r.share * 100) + '%</span></span>' +
    '</div>'
  ).join('');
  requestAnimationFrame(() => {
    [...host.querySelectorAll('.cat-fill')].forEach((f) => { f.style.width = f.dataset.w + '%'; });
  });
  [...host.querySelectorAll('.cat-row')].forEach((el, idx) => {
    const r = rows[idx];
    el.setAttribute('aria-label', CATS[r.cat].label + ': ' + fmtMoney(r.amt) + ', ' + Math.round(r.share * 100) + ' percent of spending');
    bindTip(el, () => tipRows(CATS[r.cat].label, [
      { color: CATS[r.cat].color, label: 'Spent', value: fmtMoney(r.amt, true) },
      { color: 'var(--muted)', label: 'Share of spending', value: (r.share * 100).toFixed(1) + '%' }
    ]));
  });
}

/* ---------- income vs spending columns ---------- */

function renderTrendChart() {
  const host = document.getElementById('trendChart');
  const months = SERIES.slice(1);
  const W = 620;
  const H = 280;
  const ML = 46;
  const MR = 10;
  const MT = 10;
  const MB = 30;
  const innerW = W - ML - MR;
  const innerH = H - MT - MB;
  const maxVal = Math.max(...months.map((m) => Math.max(m.income, m.spending)));
  const yMax = Math.ceil(maxVal / 1000) * 1000;
  const ticks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
  const groupW = innerW / months.length;
  const barW = 24;
  const gap = 8;

  const y = (v) => MT + innerH - (v / yMax) * innerH;

  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Grouped column chart comparing monthly income and spending from April to September 2026. Income exceeds spending every month.">';
  for (const tv of ticks) {
    const yy = y(tv).toFixed(1);
    svg += '<line x1="' + ML + '" y1="' + yy + '" x2="' + (W - MR) + '" y2="' + yy + '" stroke="var(--grid)" stroke-width="1"/>';
    svg += '<text x="' + (ML - 8) + '" y="' + (parseFloat(yy) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + fmtK(tv) + '</text>';
  }
  months.forEach((m, idx) => {
    const gx = ML + idx * groupW + groupW / 2;
    const x1 = gx - barW - gap / 2;
    const x2 = gx + gap / 2;
    const delay = 'style="animation-delay:' + (120 + idx * 70) + 'ms"';
    svg += '<rect class="bar-income" ' + delay + ' x="' + x1 + '" y="' + y(m.income).toFixed(1) + '" width="' + barW + '" height="' + (y(0) - y(m.income)).toFixed(1) + '" rx="3" fill="var(--income)"><title>' + m.short + ' income ' + fmtMoney(m.income) + '</title></rect>';
    svg += '<rect class="bar-spend" ' + delay + ' x="' + x2 + '" y="' + y(m.spending).toFixed(1) + '" width="' + barW + '" height="' + (y(0) - y(m.spending)).toFixed(1) + '" rx="3" fill="var(--expense)"><title>' + m.short + ' spending ' + fmtMoney(m.spending) + '</title></rect>';
    svg += '<text x="' + gx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + m.short + '</text>';
    svg += '<rect class="bar-hit" x="' + (gx - groupW / 2) + '" y="' + MT + '" width="' + groupW + '" height="' + innerH + '" data-tip data-month="' + m.key + '"/>';
  });
  svg += '</svg>';

  const table = '<table class="sr-only"><caption>Income and spending, April to September 2026</caption>' +
    '<tr><th>Month</th><th>Income</th><th>Spending</th></tr>' +
    months.map((m) => '<tr><td>' + m.label + '</td><td>' + fmtMoney(m.income) + '</td><td>' + fmtMoney(m.spending) + '</td></tr>').join('') +
    '</table>';

  host.innerHTML =
    '<div class="legend">' +
      '<span class="legend-item"><span class="dot" style="background:var(--income)"></span>Income</span>' +
      '<span class="legend-item"><span class="dot" style="background:var(--expense)"></span>Spending</span>' +
    '</div>' + svg + table;

  [...host.querySelectorAll('.bar-hit')].forEach((el) => {
    const m = SERIES[monthIndex(el.dataset.month)];
    bindTip(el, () => tipRows(m.label, [
      { color: 'var(--income)', label: 'Income', value: fmtMoney(m.income, true) },
      { color: 'var(--expense)', label: 'Spending', value: fmtMoney(m.spending, true) },
      { color: 'var(--muted)', label: 'Net', value: fmtMoney(m.income - m.spending, true) }
    ]));
  });
}

/* ---------- transactions ---------- */

function fmtDate(iso) {
  const [yy, mm, dd] = iso.split('-');
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(mm, 10) - 1];
  return month + ' ' + parseInt(dd, 10);
}

function renderTransactions(i) {
  const m = SERIES[i];
  const txs = m.tx.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 8);
  document.getElementById('txSub').textContent = 'Latest ' + txs.length + ' in ' + m.label;
  const list = document.getElementById('txList');
  if (!txs.length) {
    list.innerHTML = '<li class="card-sub">No transactions this month.</li>';
    return;
  }
  list.innerHTML = txs.map((tx) => {
    const c = CATS[tx.cat];
    const isIncome = c.kind === 'income';
    return '<li class="tx-row">' +
      '<span class="tx-ico" style="--txc:' + c.color + '">' + icon(tx.cat) + '</span>' +
      '<span class="tx-main"><span class="tx-name">' + tx.name + '</span><br>' +
      '<span class="tx-cat">' + c.label + '</span></span>' +
      '<span class="tx-date">' + fmtDate(tx.date) + '</span>' +
      '<span class="tx-amt' + (isIncome ? ' in' : '') + '">' + (isIncome ? '+' : '−') + fmtMoney(tx.amt, true) + '</span>' +
    '</li>';
  }).join('');
}

/* ---------- budgets ---------- */

function renderBudgets(i) {
  const m = SERIES[i];
  document.getElementById('budgetSub').textContent = 'Monthly limits · ' + m.label;
  const host = document.getElementById('budgetList');
  const rows = Object.keys(CATS)
    .filter((c) => CATS[c].kind === 'expense')
    .map((c) => {
      const spent = m.byCat.get(c) || 0;
      return { c, spent, ratio: spent / CATS[c].budget };
    })
    .sort((a, b) => b.ratio - a.ratio);
  host.innerHTML = rows.map((r) => {
    const status = budgetStatus(r.ratio);
    const overAmt = r.spent - CATS[r.c].budget;
    const right = status === 'over'
      ? '<b>' + fmtMoney(r.spent) + '</b> / ' + fmtMoney(CATS[r.c].budget) + ' · <span class="over-amt">over by ' + fmtMoney(overAmt) + '</span>'
      : '<b>' + fmtMoney(r.spent) + '</b> / ' + fmtMoney(CATS[r.c].budget);
    return '<div class="brow" data-tip>' +
      '<div class="brow-top">' +
        '<span class="bname"><span class="dot" style="background:' + CATS[r.c].color + '"></span>' + CATS[r.c].label + '</span>' +
        '<span class="bnums">' + right + '</span>' +
      '</div>' +
      '<div class="track" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(r.ratio * 100) + '" aria-label="' + CATS[r.c].label + ' budget used">' +
        '<div class="fill ' + status + '" data-w="' + Math.min(100, r.ratio * 100).toFixed(1) + '"></div>' +
      '</div>' +
    '</div>';
  }).join('');
  requestAnimationFrame(() => {
    [...host.querySelectorAll('.fill')].forEach((f) => { f.style.width = f.dataset.w + '%'; });
  });
  [...host.querySelectorAll('.brow')].forEach((el, idx) => {
    const r = rows[idx];
    bindTip(el, () => tipRows(CATS[r.c].label + ' budget', [
      { color: CATS[r.c].color, label: 'Spent', value: fmtMoney(r.spent, true) },
      { color: 'var(--muted)', label: 'Limit', value: fmtMoney(CATS[r.c].budget) },
      { color: 'var(--muted)', label: 'Used', value: (r.ratio * 100).toFixed(0) + '%' }
    ]));
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CATS, MONTHS, SELECTABLE, SERIES, aggregate, buildSeries, fmtMoney, fmtK, budgetStatus };
}
