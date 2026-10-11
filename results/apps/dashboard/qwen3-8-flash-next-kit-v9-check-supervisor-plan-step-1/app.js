'use strict';

/* ============================================================
   DATA  — one person (Ava), 6 months (May–Oct 2026).
   Transactions are the single source of truth; every number
   (KPIs, charts, budgets) is derived from these records.
   Income amounts are positive; expenses are negative.
   ============================================================ */

const MONTHS = [
  { id: '2026-05', label: 'May 2026',      short: 'May' },
  { id: '2026-06', label: 'June 2026',     short: 'Jun' },
  { id: '2026-07', label: 'July 2026',     short: 'Jul' },
  { id: '2026-08', label: 'August 2026',   short: 'Aug' },
  { id: '2026-09', label: 'September 2026',short: 'Sep' },
  { id: '2026-10', label: 'October 2026',  short: 'Oct' },
];

// name = category label, color = theme token, icon = glyph key, budget = monthly limit
const CATEGORIES = {
  housing:       { name: 'Housing',        color: 'var(--c-housing)',       icon: 'home',   budget: 1700 },
  groceries:     { name: 'Groceries',      color: 'var(--c-groceries)',     icon: 'cart',   budget: 460 },
  dining:        { name: 'Dining',         color: 'var(--c-dining)',        icon: 'dining', budget: 260 },
  transport:     { name: 'Transport',      color: 'var(--c-transport)',     icon: 'car',    budget: 200 },
  utilities:     { name: 'Utilities',      color: 'var(--c-utilities)',     icon: 'bolt',   budget: 175 },
  entertainment: { name: 'Entertainment',  color: 'var(--c-entertainment)', icon: 'film',   budget: 130 },
  shopping:      { name: 'Shopping',       color: 'var(--c-shopping)',      icon: 'bag',    budget: 300 },
  health:        { name: 'Health',         color: 'var(--c-health)',        icon: 'heart',  budget: 130 },
  subs:          { name: 'Subscriptions',  color: 'var(--c-subs)',          icon: 'repeat', budget: 70 },
  income:        { name: 'Income',         color: 'var(--pos)',             icon: 'dollar', budget: null },
};
const EXPENSE_CATS = ['housing','groceries','dining','transport','utilities','entertainment','shopping','health','subs'];

// [monthId, day, merchant, catId, amount]
const RAW = [
  // ---------------- May ----------------
  ['2026-05',1,'Acme Corp Salary','income',5200],
  ['2026-05',1,'Rent — Elm St Apartments','housing',-1600],
  ['2026-05',2,'Netflix','subs',-15.99],
  ['2026-05',2,'Spotify','subs',-10.99],
  ['2026-05',2,'iCloud Storage','subs',-2.99],
  ['2026-05',3,'PG&E Electric','utilities',-71.20],
  ['2026-05',3,'Comcast Internet','utilities',-55.00],
  ['2026-05',4,'Water Dept','utilities',-24.10],
  ['2026-05',5,'Whole Foods','groceries',-84.20],
  ['2026-05',9,'Trader Joe’s','groceries',-52.10],
  ['2026-05',16,'Costco','groceries',-121.40],
  ['2026-05',23,'Local Market','groceries',-38.75],
  ['2026-05',7,'Corner Cafe','dining',-14.50],
  ['2026-05',12,'Sweetgreen','dining',-18.90],
  ['2026-05',18,'Ramen Nagi','dining',-32.00],
  ['2026-05',26,'Blue Bottle','dining',-6.75],
  ['2026-05',6,'Uber','transport',-23.40],
  ['2026-05',13,'Shell Gas','transport',-48.10],
  ['2026-05',20,'Metro Card','transport',-30.00],
  ['2026-05',8,'AMC Theatres','entertainment',-28.00],
  ['2026-05',21,'Steam','entertainment',-19.99],
  ['2026-05',11,'Amazon','shopping',-61.20],
  ['2026-05',17,'Uniqlo','shopping',-84.50],
  ['2026-05',14,'CVS Pharmacy','health',-24.30],
  ['2026-05',10,'Gym — Equinox','health',-59.00],
  ['2026-05',28,'Interest — Savings','income',18.40],

  // ---------------- June ----------------
  ['2026-06',1,'Acme Corp Salary','income',5200],
  ['2026-06',1,'Rent — Elm St Apartments','housing',-1600],
  ['2026-06',2,'Netflix','subs',-15.99],
  ['2026-06',2,'Spotify','subs',-10.99],
  ['2026-06',2,'iCloud Storage','subs',-2.99],
  ['2026-06',3,'PG&E Electric','utilities',-78.60],
  ['2026-06',3,'Comcast Internet','utilities',-55.00],
  ['2026-06',4,'Water Dept','utilities',-26.30],
  ['2026-06',5,'Whole Foods','groceries',-91.10],
  ['2026-06',12,'Trader Joe’s','groceries',-47.80],
  ['2026-06',19,'Costco','groceries',-118.90],
  ['2026-06',25,'Local Market','groceries',-41.20],
  ['2026-06',7,'Olive & Vine','dining',-58.00],
  ['2026-06',9,'Corner Cafe','dining',-12.25],
  ['2026-06',15,'Sweetgreen','dining',-17.40],
  ['2026-06',22,'Ramen Nagi','dining',-30.50],
  ['2026-06',28,'Blue Bottle','dining',-8.10],
  ['2026-06',6,'Uber','transport',-19.80],
  ['2026-06',13,'Shell Gas','transport',-51.30],
  ['2026-06',20,'Metro Card','transport',-30.00],
  ['2026-06',27,'Parking','transport',-12.00],
  ['2026-06',11,'AMC Theatres','entertainment',-26.00],
  ['2026-06',18,'Concert — The Fillmore','entertainment',-65.00],
  ['2026-06',10,'Amazon','shopping',-72.40],
  ['2026-06',24,'Nike','shopping',-110.00],
  ['2026-06',14,'CVS Pharmacy','health',-18.90],
  ['2026-06',10,'Gym — Equinox','health',-59.00],
  ['2026-06',17,'Freelance — Logo Design','income',650],
  ['2026-06',28,'Interest — Savings','income',21.10],

  // ---------------- July ----------------
  ['2026-07',1,'Acme Corp Salary','income',5200],
  ['2026-07',1,'Rent — Elm St Apartments','housing',-1600],
  ['2026-07',2,'Netflix','subs',-15.99],
  ['2026-07',2,'Spotify','subs',-10.99],
  ['2026-07',2,'iCloud Storage','subs',-2.99],
  ['2026-07',3,'PG&E Electric','utilities',-96.40],
  ['2026-07',3,'Comcast Internet','utilities',-55.00],
  ['2026-07',4,'Water Dept','utilities',-31.80],
  ['2026-07',5,'Whole Foods','groceries',-88.30],
  ['2026-07',12,'Trader Joe’s','groceries',-55.60],
  ['2026-07',19,'Costco','groceries',-132.40],
  ['2026-07',26,'Local Market','groceries',-44.10],
  ['2026-07',8,'Corner Cafe','dining',-13.75],
  ['2026-07',14,'Sweetgreen','dining',-19.90],
  ['2026-07',20,'Ramen Nagi','dining',-34.00],
  ['2026-07',6,'Uber','transport',-28.60],
  ['2026-07',13,'Shell Gas','transport',-49.70],
  ['2026-07',20,'Metro Card','transport',-30.00],
  ['2026-07',7,'AMC Theatres','entertainment',-24.00],
  ['2026-07',16,'Bowling Night','entertainment',-22.00],
  ['2026-07',10,'Amazon','shopping',-58.30],
  ['2026-07',22,'IKEA','shopping',-143.90],
  ['2026-07',14,'CVS Pharmacy','health',-22.10],
  ['2026-07',10,'Gym — Equinox','health',-59.00],
  ['2026-07',21,'Freelance — Landing Page','income',900],
  ['2026-07',28,'Interest — Savings','income',19.60],

  // ---------------- August (dining over budget) ----------------
  ['2026-08',1,'Acme Corp Salary','income',5200],
  ['2026-08',1,'Rent — Elm St Apartments','housing',-1600],
  ['2026-08',2,'Netflix','subs',-15.99],
  ['2026-08',2,'Spotify','subs',-10.99],
  ['2026-08',2,'iCloud Storage','subs',-2.99],
  ['2026-08',3,'PG&E Electric','utilities',-101.20],
  ['2026-08',3,'Comcast Internet','utilities',-55.00],
  ['2026-08',4,'Water Dept','utilities',-33.50],
  ['2026-08',5,'Whole Foods','groceries',-79.90],
  ['2026-08',12,'Trader Joe’s','groceries',-49.20],
  ['2026-08',19,'Costco','groceries',-124.80],
  ['2026-08',26,'Local Market','groceries',-36.40],
  ['2026-08',4,'Olive & Vine','dining',-72.00],
  ['2026-08',9,'Corner Cafe','dining',-15.10],
  ['2026-08',11,'Sweetgreen','dining',-19.40],
  ['2026-08',15,'Ramen Nagi','dining',-38.00],
  ['2026-08',18,'Blue Bottle','dining',-9.20],
  ['2026-08',23,'Sushi Night','dining',-64.50],
  ['2026-08',6,'Uber','transport',-21.30],
  ['2026-08',13,'Shell Gas','transport',-53.80],
  ['2026-08',20,'Metro Card','transport',-30.00],
  ['2026-08',27,'Parking','transport',-14.00],
  ['2026-08',8,'AMC Theatres','entertainment',-27.00],
  ['2026-08',16,'Steam','entertainment',-34.99],
  ['2026-08',10,'Amazon','shopping',-66.70],
  ['2026-08',22,'Uniqlo','shopping',-78.00],
  ['2026-08',14,'CVS Pharmacy','health',-20.00],
  ['2026-08',10,'Gym — Equinox','health',-59.00],
  ['2026-08',19,'Freelance — Brand Kit','income',450],
  ['2026-08',28,'Interest — Savings','income',20.30],

  // ---------------- September (summer utilities near limit) ----------------
  ['2026-09',1,'Acme Corp Salary','income',5200],
  ['2026-09',1,'Rent — Elm St Apartments','housing',-1600],
  ['2026-09',2,'Netflix','subs',-15.99],
  ['2026-09',2,'Spotify','subs',-10.99],
  ['2026-09',2,'iCloud Storage','subs',-2.99],
  ['2026-09',3,'PG&E Electric','utilities',-112.60],
  ['2026-09',3,'Comcast Internet','utilities',-55.00],
  ['2026-09',4,'Water Dept','utilities',-29.40],
  ['2026-09',5,'Whole Foods','groceries',-86.40],
  ['2026-09',12,'Trader Joe’s','groceries',-51.30],
  ['2026-09',19,'Costco','groceries',-119.70],
  ['2026-09',26,'Local Market','groceries',-40.20],
  ['2026-09',7,'Corner Cafe','dining',-14.90],
  ['2026-09',14,'Sweetgreen','dining',-18.20],
  ['2026-09',20,'Ramen Nagi','dining',-31.50],
  ['2026-09',6,'Uber','transport',-24.90],
  ['2026-09',13,'Shell Gas','transport',-50.40],
  ['2026-09',20,'Metro Card','transport',-30.00],
  ['2026-09',27,'Parking','transport',-11.00],
  ['2026-09',9,'AMC Theatres','entertainment',-26.00],
  ['2026-09',16,'Steam','entertainment',-19.99],
  ['2026-09',10,'Amazon','shopping',-64.10],
  ['2026-09',21,'Best Buy','shopping',-132.90],
  ['2026-09',14,'Dentist','health',-90.00],
  ['2026-09',10,'Gym — Equinox','health',-59.00],
  ['2026-09',18,'Freelance — Consulting','income',780],
  ['2026-09',28,'Interest — Savings','income',22.70],

  // ---------------- October (default view: amber + red on purpose) ----------------
  ['2026-10',1,'Acme Corp Salary','income',5200],
  ['2026-10',1,'Rent — Elm St Apartments','housing',-1600],
  ['2026-10',2,'Netflix','subs',-15.99],
  ['2026-10',2,'Spotify','subs',-10.99],
  ['2026-10',2,'iCloud Storage','subs',-2.99],
  ['2026-10',2,'NYT','subs',-17.00],
  ['2026-10',3,'PG&E Electric','utilities',-63.80],
  ['2026-10',3,'Comcast Internet','utilities',-55.00],
  ['2026-10',5,'Whole Foods','groceries',-92.10],
  ['2026-10',8,'Trader Joe’s','groceries',-58.40],
  ['2026-10',11,'Costco','groceries',-129.60],
  ['2026-10',15,'Local Market','groceries',-46.80],
  ['2026-10',18,'Whole Foods','groceries',-71.20],
  ['2026-10',4,'Corner Cafe','dining',-15.60],
  ['2026-10',7,'Sweetgreen','dining',-19.10],
  ['2026-10',10,'Ramen Nagi','dining',-33.20],
  ['2026-10',13,'Blue Bottle','dining',-8.40],
  ['2026-10',16,'Olive & Vine','dining',-58.00],
  ['2026-10',19,'Sushi Night','dining',-61.50],
  ['2026-10',6,'Uber','transport',-22.10],
  ['2026-10',12,'Shell Gas','transport',-47.60],
  ['2026-10',20,'Metro Card','transport',-30.00],
  ['2026-10',9,'AMC Theatres','entertainment',-25.00],
  ['2026-10',21,'Steam','entertainment',-14.99],
  ['2026-10',11,'Amazon','shopping',-78.40],
  ['2026-10',14,'Uniqlo','shopping',-96.20],
  ['2026-10',17,'IKEA','shopping',-118.30],
  ['2026-10',20,'Best Buy','shopping',-89.90],
  ['2026-10',13,'CVS Pharmacy','health',-26.80],
  ['2026-10',10,'Gym — Equinox','health',-59.00],
  ['2026-10',22,'Freelance — App UI','income',520],
  ['2026-10',28,'Interest — Savings','income',23.90],
];

const TXNS = RAW.map(([m, day, merchant, cat, amt]) => ({ month: m, day, merchant, cat, amt }));
const START_BALANCE = 8450;

/* ============================================================
   Formatting helpers
   ============================================================ */
const nf0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = (n) => nf0.format(n);
const money2 = (n) => nf2.format(n);
function fmtAxis(v) {
  if (Math.abs(v) >= 1000) { const k = v / 1000; return '$' + (Number.isInteger(k) ? k : k.toFixed(1)) + 'k'; }
  return '$' + v;
}
function fmtDate(monthId, day) {
  const [y, mo] = monthId.split('-').map(Number);
  return new Date(y, mo - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ============================================================
   Derivations
   ============================================================ */
const monthTxns = (id) => TXNS.filter((t) => t.month === id);

function monthlyStats() {
  let running = START_BALANCE;
  const byId = {};
  for (const m of MONTHS) {
    const txns = monthTxns(m.id);
    let income = 0, expense = 0;
    const cat = {};
    for (const t of txns) {
      if (t.cat === 'income') { income += t.amt; }
      else { expense += -t.amt; cat[t.cat] = (cat[t.cat] || 0) + -t.amt; }
    }
    running += income - expense;
    byId[m.id] = { id: m.id, income, expense, cat, balance: running, savings: income > 0 ? (income - expense) / income : 0 };
  }
  return byId;
}
const STATS = monthlyStats();

/* ============================================================
   Icons (inline SVG, stroke = currentColor)
   ============================================================ */
function svg(paths, extra = '') {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}${extra}</svg>`;
}
const ICONS = {
  home: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>'),
  cart: svg('<circle cx="9" cy="20" r="1.1"/><circle cx="18" cy="20" r="1.1"/><path d="M2 3h2.2l2.3 12.2a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L20.5 7H5.6"/>'),
  dining: svg('<path d="M4 3v6a2 2 0 0 0 4 0V3"/><path d="M6 9v12"/><path d="M15 3c2 1 3 3.4 3 6 0 2-1 3-3 3v9"/>'),
  car: svg('<path d="M5 11l1.6-4A2 2 0 0 1 8.5 6h7a2 2 0 0 1 1.9 1.3L19 11"/><path d="M4 11h16v5H4z"/><circle cx="7.5" cy="16.5" r="1.2"/><circle cx="16.5" cy="16.5" r="1.2"/>'),
  bolt: svg('<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>'),
  film: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4"/>'),
  bag: svg('<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>'),
  heart: svg('<path d="M12 20s-7-4.6-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 15.4 12 20 12 20z"/>'),
  repeat: svg('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a2 2 0 0 1 2-2h16"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a2 2 0 0 1-2 2H3"/>'),
  dollar: svg('<path d="M12 1.5v21"/><path d="M17 6H9.6a3.5 3.5 0 0 0 0 7h4.8a3.5 3.5 0 0 1 0 7H6"/>'),
  arrowUp: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  arrowDown: svg('<path d="M12 5v14M6 13l6 6 6-6"/>'),
};
const ICONS_SM = {
  arrowUp: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  arrowDown: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
};
function catTileStyle(catId) {
  const c = CATEGORIES[catId].color;
  return `background:color-mix(in srgb, ${c} 15%, transparent);color:${c}`;
}

/* ============================================================
   Tooltip
   ============================================================ */
const tooltip = document.getElementById('tooltip');
function showTooltip(html, x, y) {
  tooltip.innerHTML = html;
  tooltip.hidden = false;
  const pad = 10;
  const r = tooltip.getBoundingClientRect();
  let left = x + 14, top = y + 14;
  if (left + r.width + pad > window.innerWidth) left = x - r.width - 14;
  if (top + r.height + pad > window.innerHeight) top = y - r.height - 14;
  tooltip.style.left = Math.max(pad, left) + 'px';
  tooltip.style.top = Math.max(pad, top) + 'px';
  tooltip.classList.add('is-visible');
}
function hideTooltip() { tooltip.classList.remove('is-visible'); tooltip.hidden = true; }
function ttRow(color, key, val) {
  return `<div class="tt-row"><span class="tt-key"><span class="tt-swatch" style="background:${color}"></span>${key}</span><span class="tt-val">${val}</span></div>`;
}

// Wire tooltip to elements with a data-tip attribute.
function bindTips(root) {
  root.querySelectorAll('[data-tip]').forEach((el) => {
    const html = decodeURIComponent(el.getAttribute('data-tip'));
    el.addEventListener('pointerenter', (e) => showTooltip(html, e.clientX, e.clientY));
    el.addEventListener('pointermove', (e) => showTooltip(html, e.clientX, e.clientY));
    el.addEventListener('pointerleave', hideTooltip);
    el.addEventListener('focus', () => { const b = el.getBoundingClientRect(); showTooltip(html, b.left + b.width / 2, b.top); });
    el.addEventListener('blur', hideTooltip);
  });
}

/* ============================================================
   KPI cards
   ============================================================ */
function deltaHtml(cur, prev, { goodWhenUp = true, unit = '$', digits = 0 } = {}) {
  if (prev === null || prev === undefined) return `<span class="kpi-delta delta-flat"><span class="vs">first month tracked</span></span>`;
  const diff = cur - prev;
  const flat = Math.abs(diff) < (unit === 'pp' ? 0.05 : 0.005);
  const up = diff > 0;
  const good = flat ? null : (up === goodWhenUp);
  const cls = flat ? 'delta-flat' : (good ? 'delta-good' : 'delta-bad');
  const arrow = flat ? '' : (up ? ICONS_SM.arrowUp : ICONS_SM.arrowDown);
  let text;
  if (unit === 'pp') text = `${Math.abs(diff).toFixed(1)} pts`;
  else text = (unit === '$' ? nf0.format(Math.abs(diff)) : Math.abs(diff).toFixed(digits));
  return `<span class="kpi-delta ${cls}">${arrow}<span>${text}</span><span class="vs">vs last month</span></span>`;
}

function renderKpis(idx) {
  const cur = STATS[MONTHS[idx].id];
  const prev = idx > 0 ? STATS[MONTHS[idx - 1].id] : null;
  const cards = [
    { label: 'Balance',        icon: 'home',   value: money0(cur.balance), accent: 'var(--accent)',
      delta: deltaHtml(cur.balance, prev && prev.balance, { goodWhenUp: true }) },
    { label: 'Income',         icon: 'dollar', value: money0(cur.income), accent: 'var(--pos)',
      delta: deltaHtml(cur.income, prev && prev.income, { goodWhenUp: true }) },
    { label: 'Spending',       icon: 'cart',   value: money0(cur.expense), accent: 'var(--neg)',
      delta: deltaHtml(cur.expense, prev && prev.expense, { goodWhenUp: false }) },
    { label: 'Savings rate',   icon: 'repeat', value: (cur.savings * 100).toFixed(1) + '%', accent: 'var(--c-transport)',
      delta: deltaHtml(cur.savings * 100, prev ? prev.savings * 100 : null, { goodWhenUp: true, unit: 'pp' }) },
  ];
  document.getElementById('kpi-grid').innerHTML = cards.map((c) => `
    <article class="kpi" style="--kpi-accent:${c.accent}">
      <div class="kpi-top">
        <span class="kpi-label">${c.label}</span>
        <span class="kpi-icon" style="color:${c.accent};background:color-mix(in srgb, ${c.accent} 14%, transparent)">${ICONS[c.icon]}</span>
      </div>
      <div class="kpi-value num">${c.value}</div>
      ${c.delta}
    </article>`).join('');
}

/* ============================================================
   Spending-by-category chart (horizontal SVG bars)
   ============================================================ */
function renderCategoryChart(id) {
  const host = document.getElementById('category-chart');
  const cat = STATS[id].cat;
  const rows = EXPENSE_CATS
    .map((cid) => ({ cid, val: cat[cid] || 0 }))
    .filter((r) => r.val > 0)
    .sort((a, b) => b.val - a.val);

  if (!rows.length) { host.innerHTML = `<p class="card-sub">No spending recorded this month.</p>`; return; }

  const max = Math.max(...rows.map((r) => r.val));
  const W = 340, labelW = 104, valW = 58, rowH = 30, top = 6;
  const barX = labelW, barRight = W - valW, H = top + rows.length * rowH + 4;
  const total = rows.reduce((s, r) => s + r.val, 0);
  document.getElementById('cat-sub').textContent = `${money0(total)} total`;

  let out = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Spending by category for the selected month. ${rows.map((r) => CATEGORIES[r.cid].name + ' ' + money0(r.val)).join(', ')}.">`;
  rows.forEach((r, i) => {
    const y = top + i * rowH + (rowH - 9) / 2;
    const bw = Math.max(3, (r.val / max) * (barRight - barX));
    const color = CATEGORIES[r.cid].color;
    const pct = total ? Math.round((r.val / total) * 100) : 0;
    const tip = encodeURIComponent(`<div class="tt-title">${CATEGORIES[r.cid].name}</div>${ttRow(color, 'Spent', money2(r.val))}${ttRow('var(--text-faint)', 'Share of spend', pct + '%')}`);
    out += `<g>
      <text class="chart-axis-text" x="0" y="${y + 8}" style="fill:var(--text);font-size:12px;font-weight:500">${CATEGORIES[r.cid].name}</text>
      <rect class="cat-track" x="${barX}" y="${y}" width="${barRight - barX}" height="9" rx="4.5"></rect>
      <rect class="bar bar-anim-x" data-tip="${tip}" tabindex="0" role="button" aria-label="${CATEGORIES[r.cid].name}, ${money0(r.val)}" x="${barX}" y="${y}" width="${bw}" height="9" rx="4.5" fill="${color}" style="animation-delay:${i * 45}ms"></rect>
      <text class="chart-axis-text" x="${W}" y="${y + 8}" text-anchor="end" style="fill:var(--text-muted);font-size:12px;font-weight:600">${money0(r.val)}</text>
    </g>`;
  });
  out += `</svg>`;
  host.innerHTML = out;
  bindTips(host);
}

/* ============================================================
   Income vs spending trend chart (grouped vertical bars)
   ============================================================ */
function renderTrendChart(selectedId) {
  const host = document.getElementById('trend-chart');
  const data = MONTHS.map((m) => ({ id: m.id, short: m.short, income: STATS[m.id].income, expense: STATS[m.id].expense }));
  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]));
  const niceMax = Math.ceil(maxVal / 2000) * 2000;
  const W = 372, H = 214, padL = 56, padR = 10, padT = 12, padB = 28;
  const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
  const plotW = x1 - x0, plotH = y1 - y0, n = data.length;
  const groupW = plotW / n;
  const barW = groupW * 0.26, gap = groupW * 0.10;
  const TICKS = 4;
  const INCOME_C = 'var(--accent)', SPEND_C = 'var(--neg)';

  let out = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Income versus spending per month for the last six months.">`;
  // grid + y labels
  for (let t = 0; t <= TICKS; t++) {
    const v = (niceMax / TICKS) * t;
    const y = y1 - (v / niceMax) * plotH;
    out += `<line class="chart-grid" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"></line>`;
    out += `<text class="chart-axis-text" x="${x0 - 10}" y="${y + 3.5}" text-anchor="end">${fmtAxis(v)}</text>`;
  }
  out += `<line class="chart-baseline" x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}"></line>`;

  data.forEach((d, i) => {
    const gx = x0 + i * groupW;
    const cx = gx + groupW / 2;
    if (d.id === selectedId) {
      out += `<rect x="${gx + 3}" y="${y0 - 4}" width="${groupW - 6}" height="${plotH + 8}" rx="8" fill="var(--accent-soft)"></rect>`;
    }
    const hInc = (d.income / niceMax) * plotH;
    const hSp = (d.expense / niceMax) * plotH;
    const incX = cx - gap / 2 - barW;
    const spX = cx + gap / 2;
    const delay = i * 60;
    const tip = encodeURIComponent(`<div class="tt-title">${MONTHS[i].label}</div>${ttRow(INCOME_C, 'Income', money2(d.income))}${ttRow(SPEND_C, 'Spending', money2(d.expense))}${ttRow('var(--text-faint)', 'Net', (d.income - d.expense >= 0 ? '+' : '') + money2(d.income - d.expense))}`);
    out += `<g class="bar" data-tip="${tip}" tabindex="0" role="button" aria-label="${MONTHS[i].label}: income ${money0(d.income)}, spending ${money0(d.expense)}">
      <rect x="${gx + 2}" y="${y0 - 4}" width="${groupW - 4}" height="${plotH + 8}" fill="transparent"></rect>
      <rect class="bar-anim-y" x="${incX}" y="${y1 - hInc}" width="${barW}" height="${hInc}" rx="3" fill="${INCOME_C}" style="animation-delay:${delay}ms"></rect>
      <rect class="bar-anim-y" x="${spX}" y="${y1 - hSp}" width="${barW}" height="${hSp}" rx="3" fill="${SPEND_C}" style="animation-delay:${delay + 40}ms"></rect>
    </g>`;
    out += `<text class="chart-axis-text" x="${cx}" y="${H - 9}" text-anchor="middle">${d.short}</text>`;
  });
  out += `</svg>`;
  host.innerHTML = out;

  document.getElementById('trend-legend').innerHTML = `
    <span class="legend-item"><span class="legend-swatch" style="background:${INCOME_C}"></span>Income</span>
    <span class="legend-item"><span class="legend-swatch" style="background:${SPEND_C}"></span>Spending</span>`;
  bindTips(host);
}

/* ============================================================
   Transactions
   ============================================================ */
function renderTransactions(id) {
  const list = document.getElementById('txn-list');
  const txns = monthTxns(id).slice().sort((a, b) => b.day - a.day || a.merchant.localeCompare(b.merchant));
  const shown = txns.slice(0, 14);
  document.getElementById('txns-sub').textContent = `${txns.length} transactions`;
  list.innerHTML = shown.map((t) => {
    const isIncome = t.cat === 'income';
    const color = CATEGORIES[t.cat].color;
    const amtCls = isIncome ? 'income' : 'expense';
    const amtTxt = (isIncome ? '+' : '−') + money2(Math.abs(t.amt));
    const date = fmtDate(id, t.day);
    return `<li class="txn-item">
      <span class="txn-ico" style="${catTileStyle(t.cat)}">${ICONS[CATEGORIES[t.cat].icon]}</span>
      <span class="txn-main">
        <span class="txn-merchant">${t.merchant}</span>
        <span class="txn-meta">${CATEGORIES[t.cat].name} · ${date}</span>
      </span>
      <span class="txn-amt num ${amtCls}">${amtTxt}</span>
    </li>`;
  }).join('');
}

/* ============================================================
   Budget progress
   ============================================================ */
function budgetStatus(ratio) {
  if (ratio >= 1) return { cls: 'status-over', label: 'Over budget', fill: 'var(--neg)' };
  if (ratio >= 0.8) return { cls: 'status-warn', label: 'Near limit', fill: 'var(--warn)' };
  return { cls: 'status-ok', label: 'On track', fill: 'var(--pos)' };
}
function renderBudget(id) {
  const list = document.getElementById('budget-list');
  const cat = STATS[id].cat;
  const totalSpent = EXPENSE_CATS.reduce((s, c) => s + (cat[c] || 0), 0);
  const totalBudget = EXPENSE_CATS.reduce((s, c) => s + CATEGORIES[c].budget, 0);
  document.getElementById('budget-sub').textContent = `${money0(totalSpent)} of ${money0(totalBudget)}`;

  list.innerHTML = EXPENSE_CATS.map((cid, idx) => {
    const spent = cat[cid] || 0;
    const budget = CATEGORIES[cid].budget;
    const ratio = budget ? spent / budget : 0;
    const st = budgetStatus(ratio);
    const width = Math.min(100, ratio * 100);
    return `<li class="budget-item">
      <div class="budget-top">
        <span class="budget-name"><span class="dot" style="background:${CATEGORIES[cid].color}"></span>${CATEGORIES[cid].name}</span>
        <span class="budget-nums"><span class="spent">${money0(spent)}</span> / ${money0(budget)}</span>
      </div>
      <div class="budget-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${budget}" aria-valuenow="${Math.round(spent)}" aria-label="${CATEGORIES[cid].name}: ${money0(spent)} of ${money0(budget)} budget">
        <div class="budget-bar-fill bar-anim-x" style="width:${width}%;background:${st.fill};animation-delay:${idx * 50}ms"></div>
      </div>
      <span class="budget-status ${st.cls}">
        ${st.cls === 'status-over' ? ICONS_SM.arrowUp : ''}${st.label} · ${Math.round(ratio * 100)}%
      </span>
    </li>`;
  }).join('');
}

/* ============================================================
   Render orchestration + events
   ============================================================ */
const monthSelect = document.getElementById('month-select');
let selectedId = MONTHS[MONTHS.length - 1].id;

function render() {
  const idx = MONTHS.findIndex((m) => m.id === selectedId);
  const m = MONTHS[idx];
  document.getElementById('header-sub').textContent = `${m.label} · ${money0(STATS[m.id].income - STATS[m.id].expense)} net this month`;
  renderKpis(idx);
  renderCategoryChart(m.id);
  renderTrendChart(m.id);
  renderTransactions(m.id);
  renderBudget(m.id);
}

function buildMonthSelect() {
  monthSelect.innerHTML = MONTHS.map((m) => `<option value="${m.id}">${m.label}</option>`).join('');
  monthSelect.value = selectedId;
  monthSelect.addEventListener('change', (e) => { selectedId = e.target.value; hideTooltip(); render(); });
}

/* ---- Theme: system default, manual override persists ---- */
const THEME_KEY = 'fin-dash-theme';
function applyTheme(choice) {
  if (choice === 'system' || !choice) document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', choice);
  document.querySelectorAll('.theme-btn').forEach((b) => {
    const on = b.getAttribute('data-theme-choice') === (choice || 'system');
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', String(on));
  });
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved || 'system');
  document.querySelectorAll('.theme-btn').forEach((b) => {
    b.addEventListener('click', () => {
      const choice = b.getAttribute('data-theme-choice');
      if (choice === 'system') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, choice);
      applyTheme(choice);
      // re-render charts so tooltip/binds stay consistent (colors come from CSS vars)
    });
  });
}

function init() {
  buildMonthSelect();
  initTheme();
  render();
  window.addEventListener('resize', () => { hideTooltip(); });
}
document.addEventListener('DOMContentLoaded', init);
