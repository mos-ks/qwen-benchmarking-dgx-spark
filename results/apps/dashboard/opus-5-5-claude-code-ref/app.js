'use strict';

(() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* ================================================================
   * Icons (24px grid, stroked with currentColor)
   * ================================================================ */
  const ICON_PATHS = {
    housing: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-5.5h4V20"/>',
    groceries: '<path d="M3 4h2.2l2.3 10.6a1.2 1.2 0 0 0 1.2 1h8.6a1.2 1.2 0 0 0 1.2-.9L20.5 8H6.1"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
    dining: '<path d="M6.5 3v18"/><path d="M4 3v5a2.5 2.5 0 0 0 5 0V3"/><path d="M17.5 21V3c-2.3 1.2-3.5 3.6-3.5 6.5V14h3.5"/>',
    transport: '<path d="M5 17H3.5v-4.5L5.8 7a1.5 1.5 0 0 1 1.4-1h9.6a1.5 1.5 0 0 1 1.4 1l2.3 5.5V17H19"/><path d="M3.5 12.5h17"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5"/>',
    utilities: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
    shopping: '<path d="M5 8h14l-1.1 12.1a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
    entertainment: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m10 9 5 3-5 3z"/>',
    health: '<path d="M19.6 12.7 12 20.2l-7.6-7.5a4.7 4.7 0 0 1 6.6-6.6l1 1 1-1a4.7 4.7 0 0 1 6.6 6.6z"/><path d="M6.8 12.2h2.6l1.3-2.2 2.2 4.4 1.3-2.2h3"/>',
    salary: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M3 12.5h18"/>',
    freelance: '<rect x="4.5" y="5" width="15" height="10.5" rx="1.5"/><path d="M2.5 19h19"/>',
    interest: '<path d="M18.5 5.5 5.5 18.5"/><circle cx="7.5" cy="7.5" r="2.3"/><circle cx="16.5" cy="16.5" r="2.3"/>',
    wallet: '<path d="M17 7.5V5.8A1.8 1.8 0 0 0 15.2 4H6a2 2 0 0 0-2 2"/><rect x="4" y="7.5" width="16" height="12.5" rx="2"/><path d="M15.5 13.75h1.5"/>',
    incomeArrow: '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4.5 20h15"/>',
    spendArrow: '<path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M4.5 20h15"/>',
    savings: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5A8.5 8.5 0 0 1 20.5 12H12z"/>',
    up: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
    down: '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
    flat: '<path d="M5 12h14"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.7L16 9.8"/>',
    warn: '<path d="M10.3 4.2 2.8 17.5a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 10v4"/><path d="M12 17.3v.1"/>',
    over: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.4v.1"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronUp: '<path d="m6 15 6-6 6 6"/>',
  };

  function icon(name, strokeWidth = 1.8) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', String(strokeWidth));
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICON_PATHS[name];
    return svg;
  }

  /* ================================================================
   * Sample data: Maya Chen, product designer, April to September 2026
   * ================================================================ */
  const CATEGORIES = [
    { id: 'housing', name: 'Housing', color: 'var(--cat-1)', budget: 1700, avgTicket: 0, merchants: [] },
    { id: 'groceries', name: 'Groceries', color: 'var(--cat-2)', budget: 650, avgTicket: 72,
      merchants: ["Trader Joe's", 'Whole Foods Market', 'Safeway', 'Rainbow Grocery', 'Costco Wholesale', 'Ferry Plaza Farmers Market'] },
    { id: 'dining', name: 'Dining out', color: 'var(--cat-3)', budget: 350, avgTicket: 34,
      merchants: ['Blue Bottle Coffee', 'Sweetgreen', 'Tartine Bakery', 'DoorDash', 'Souvla', 'Philz Coffee', 'Burma Superstar', 'Chipotle'] },
    { id: 'transport', name: 'Transport', color: 'var(--cat-4)', budget: 300, avgTicket: 42,
      merchants: ['Chevron', 'Shell', 'Uber', 'Lyft', 'Clipper Card', 'SFMTA Parking'] },
    { id: 'utilities', name: 'Utilities', color: 'var(--cat-5)', budget: 250, avgTicket: 60,
      merchants: ['PG&E', 'SF Water Power Sewer'] },
    { id: 'shopping', name: 'Shopping', color: 'var(--cat-6)', budget: 400, avgTicket: 68,
      merchants: ['Amazon', 'Target', 'Uniqlo', 'REI', 'Muji', 'Etsy'] },
    { id: 'entertainment', name: 'Entertainment', color: 'var(--cat-7)', budget: 200, avgTicket: 32,
      merchants: ['AMC Theatres', 'Steam', 'Ticketmaster', 'Books Inc.', 'Roxie Theater'] },
    { id: 'health', name: 'Health & fitness', color: 'var(--cat-8)', budget: 150, avgTicket: 26,
      merchants: ['CVS Pharmacy', 'Walgreens', 'Lululemon'] },
  ];
  const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  const INCOME_COLOR = 'var(--good)';
  const NEAR_LIMIT = 0.85;

  const SALARY_PER_PAYCHECK = 2385.6;

  const RECURRING_BILLS = [
    { cat: 'housing', name: 'Maple Court Apartments', note: 'Rent', amount: 1650.0, day: 1 },
    { cat: 'health', name: 'ClassPass', note: 'Membership', amount: 49.0, day: 2 },
    { cat: 'housing', name: 'Lemonade', note: 'Renters insurance', amount: 18.0, day: 3 },
    { cat: 'entertainment', name: 'Netflix', note: 'Subscription', amount: 15.49, day: 5 },
    { cat: 'utilities', name: 'Sonic Fiber', note: 'Internet', amount: 60.0, day: 8 },
    { cat: 'entertainment', name: 'Spotify', note: 'Subscription', amount: 11.99, day: 11 },
    { cat: 'utilities', name: 'Mint Mobile', note: 'Phone plan', amount: 30.0, day: 12 },
  ];

  // Category totals are the month's real spend; recurring bills and one-offs are
  // carved out of them and the rest is spread over everyday merchants.
  const MONTH_SPECS = [
    { key: '2026-04', freelance: 0, interest: 12.84,
      spend: { housing: 1668, groceries: 512.36, dining: 286.14, transport: 214.8, utilities: 196.42, shopping: 324.17, entertainment: 142.38, health: 85.2 },
      oneOffs: [] },
    { key: '2026-05', freelance: 650, interest: 13.1,
      spend: { housing: 1668, groceries: 563.08, dining: 342.55, transport: 236.12, utilities: 178.3, shopping: 186.44, entertainment: 168.21, health: 120.0 },
      oneOffs: [{ cat: 'health', name: 'Bay Dental', note: 'Cleaning copay', amount: 45.0, day: 19 }] },
    { key: '2026-06', freelance: 0, interest: 13.52,
      spend: { housing: 1668, groceries: 486.71, dining: 298.4, transport: 198.65, utilities: 204.18, shopping: 452.93, entertainment: 156.47, health: 64.35 },
      oneOffs: [{ cat: 'shopping', name: 'IKEA', note: 'Desk and chair', amount: 249.0, day: 14 }] },
    { key: '2026-07', freelance: 1200, interest: 14.07,
      spend: { housing: 1668, groceries: 571.22, dining: 412.86, transport: 618.4, utilities: 238.09, shopping: 278.15, entertainment: 224.73, health: 145.6 },
      oneOffs: [
        { cat: 'transport', name: 'United Airlines', note: 'SFO to Seattle', amount: 342.18, day: 3 },
        { cat: 'entertainment', name: 'Climate Pledge Arena', note: 'Concert tickets', amount: 96.0, day: 18 },
      ] },
    { key: '2026-08', freelance: 400, interest: 14.66,
      spend: { housing: 1668, groceries: 534.49, dining: 365.12, transport: 245.33, utilities: 251.76, shopping: 512.68, entertainment: 138.92, health: 92.4 },
      oneOffs: [{ cat: 'shopping', name: 'Apple Store', note: 'AirPods Pro', amount: 249.0, day: 23 }] },
    { key: '2026-09', freelance: 850, interest: 15.31,
      spend: { housing: 1668, groceries: 548.37, dining: 438.26, transport: 228.51, utilities: 204.63, shopping: 296.84, entertainment: 176.45, health: 168.3 },
      oneOffs: [
        { cat: 'health', name: 'Bay Dental', note: 'Filling copay', amount: 85.0, day: 16 },
        { cat: 'dining', name: 'Nopa', note: 'Birthday dinner', amount: 112.4, day: 26 },
      ] },
  ];

  // March 2026, used only as the comparison point for April.
  const MARCH_SUMMARY = {
    label: 'March 2026', short: 'Mar',
    income: 5083.61, spending: 3612.48, balance: 12846.2,
    byCat: { housing: 1668, groceries: 541.2, dining: 318.75, transport: 226.4, utilities: 214.95, shopping: 298.1, entertainment: 151.33, health: 193.75 },
  };
  MARCH_SUMMARY.net = MARCH_SUMMARY.income - MARCH_SUMMARY.spending;
  MARCH_SUMMARY.rate = MARCH_SUMMARY.net / MARCH_SUMMARY.income;

  /* ---------- deterministic generator for everyday purchases ---------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function splitCents(totalCents, parts, rand) {
    const weights = Array.from({ length: parts }, () => 0.45 + rand());
    const sum = weights.reduce((a, b) => a + b, 0);
    const out = weights.map((w) => Math.max(1, Math.floor((totalCents * w) / sum)));
    const assigned = out.slice(0, -1).reduce((a, b) => a + b, 0);
    out[out.length - 1] = totalCents - assigned;
    return out;
  }
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  function lastWeekdayOnOrBefore(y, m, day) {
    const d = new Date(y, m, day);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    return d;
  }

  function buildMonth(spec) {
    const [year, month1] = spec.key.split('-').map(Number);
    const m = month1 - 1;
    const dim = daysInMonth(year, m);
    const tx = [];
    let seq = 0;
    const push = (t) => tx.push({ id: `${spec.key}-${seq++}`, ...t });

    push({ kind: 'income', icon: 'salary', name: 'Northwind Labs', note: 'Salary', amount: SALARY_PER_PAYCHECK, date: lastWeekdayOnOrBefore(year, m, 15) });
    push({ kind: 'income', icon: 'salary', name: 'Northwind Labs', note: 'Salary', amount: SALARY_PER_PAYCHECK, date: lastWeekdayOnOrBefore(year, m, dim) });
    if (spec.freelance > 0) {
      push({ kind: 'income', icon: 'freelance', name: 'Brightline Studio', note: 'Freelance invoice', amount: spec.freelance, date: lastWeekdayOnOrBefore(year, m, 21) });
    }
    push({ kind: 'income', icon: 'interest', name: 'Ally Bank', note: 'Savings interest', amount: spec.interest, date: new Date(year, m, dim) });

    for (const cat of CATEGORIES) {
      const planned = [...RECURRING_BILLS, ...spec.oneOffs].filter((b) => b.cat === cat.id);
      planned.forEach((b) => push({ kind: 'expense', cat: cat.id, icon: cat.id, name: b.name, note: b.note, amount: b.amount, date: new Date(year, m, b.day) }));

      const plannedCents = planned.reduce((a, b) => a + Math.round(b.amount * 100), 0);
      const restCents = Math.round(spec.spend[cat.id] * 100) - plannedCents;
      if (restCents <= 0 || cat.merchants.length === 0) continue;

      const rand = mulberry32(hashString(spec.key + cat.id));
      const count = Math.min(11, Math.max(1, Math.round(restCents / 100 / cat.avgTicket)));
      splitCents(restCents, count, rand).forEach((cents) => {
        const merchant = cat.merchants[Math.floor(rand() * cat.merchants.length)];
        const day = 1 + Math.floor(rand() * dim);
        push({ kind: 'expense', cat: cat.id, icon: cat.id, name: merchant, note: '', amount: cents / 100, date: new Date(year, m, day) });
      });
    }

    tx.sort((a, b) => b.date - a.date || a.id.localeCompare(b.id, undefined, { numeric: true }));
    const date = new Date(year, m, 1);
    return {
      key: spec.key,
      label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      long: date.toLocaleDateString('en-US', { month: 'long' }),
      short: date.toLocaleDateString('en-US', { month: 'short' }),
      transactions: tx,
    };
  }

  function summarize(months) {
    let balance = MARCH_SUMMARY.balance;
    return months.map((mo) => {
      const sumCents = (list) => list.reduce((a, t) => a + Math.round(t.amount * 100), 0) / 100;
      const income = sumCents(mo.transactions.filter((t) => t.kind === 'income'));
      const expenses = mo.transactions.filter((t) => t.kind === 'expense');
      const spending = sumCents(expenses);
      const byCat = Object.fromEntries(CATEGORIES.map((c) => [c.id, sumCents(expenses.filter((t) => t.cat === c.id))]));
      balance += income - spending;
      const net = income - spending;
      return { ...mo, income, spending, net, rate: net / income, balance, byCat };
    });
  }

  const MONTHS = summarize(MONTH_SPECS.map(buildMonth));

  /* ================================================================
   * Formatting
   * ================================================================ */
  const fmtMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const fmtMoney0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmtPct1 = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtPct0 = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });
  const fmtDay = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const MINUS = '−';

  const money = (v) => fmtMoney.format(Math.abs(v));
  const money0 = (v) => fmtMoney0.format(Math.abs(v));
  const signed = (v, f) => (v > 0 ? '+' : v < 0 ? MINUS : '') + f(Math.abs(v));
  function compactMoney(v) {
    if (v === 0) return '$0';
    if (v >= 1000) return `$${+(v / 1000).toFixed(1)}k`;
    return `$${Math.round(v)}`;
  }

  /* ================================================================
   * DOM helpers
   * ================================================================ */
  const $ = (sel) => document.querySelector(sel);

  function h(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'style') node.style.cssText = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    appendChildren(node, children);
    return node;
  }
  function s(tag, attrs = {}, ...children) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    appendChildren(node, children);
    return node;
  }
  function appendChildren(node, children) {
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
  }

  function catIcon(iconName, color, small = false) {
    return h('span', { class: `cat-icon${small ? ' cat-icon--sm' : ''}`, style: `--c: ${color}` }, icon(iconName));
  }

  /* ================================================================
   * Tooltip (one instance, pointer + keyboard)
   * ================================================================ */
  const tip = $('#tooltip');

  function tipContent({ title, rows = [], footer = [], note }) {
    const row = (r) => h('div', { class: 'tooltip__row' },
      h('span', { class: 'tooltip__key', style: r.color ? `--k: ${r.color}` : 'opacity: 0' }),
      h('span', { class: 'tooltip__label' }, r.label),
      h('span', { class: 'tooltip__value' }, r.value));
    return [
      h('div', { class: 'tooltip__title' }, title),
      ...rows.map(row),
      footer.length ? h('div', { class: 'tooltip__divider' }) : null,
      ...footer.map(row),
      note ? h('div', { class: 'tooltip__note' }, note) : null,
    ];
  }

  function showTip(content, x, y) {
    tip.replaceChildren(...content.filter(Boolean));
    tip.classList.add('is-visible');
    tip.setAttribute('aria-hidden', 'false');
    moveTip(x, y);
  }
  function moveTip(x, y) {
    const pad = 8;
    const { width, height } = tip.getBoundingClientRect();
    let left = x + 14;
    if (left + width > window.innerWidth - pad) left = x - width - 14;
    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
    let top = y - height - 12;
    if (top < pad) top = y + 18;
    top = Math.min(top, window.innerHeight - height - pad);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }
  function hideTip() {
    tip.classList.remove('is-visible');
    tip.setAttribute('aria-hidden', 'true');
  }
  function tipAtElement(el, content) {
    const r = el.getBoundingClientRect();
    showTip(content, r.left + r.width / 2, r.top);
  }

  /** Wires hover, touch and keyboard focus to the shared tooltip. */
  function bindTooltip(el, getContent, { onEnter, onLeave } = {}) {
    el.addEventListener('pointerenter', (e) => { onEnter?.(); showTip(getContent(), e.clientX, e.clientY); });
    el.addEventListener('pointermove', (e) => moveTip(e.clientX, e.clientY));
    el.addEventListener('pointerleave', () => { onLeave?.(); hideTip(); });
    el.addEventListener('focus', () => { onEnter?.(); tipAtElement(el, getContent()); });
    el.addEventListener('blur', () => { onLeave?.(); hideTip(); });
  }
  window.addEventListener('scroll', hideTip, { passive: true });

  /* ================================================================
   * State
   * ================================================================ */
  const state = {
    monthIndex: MONTHS.length - 1,
    categoryFilter: null,
    showAllTx: false,
    flowView: 'chart',
  };
  const current = () => MONTHS[state.monthIndex];
  const previous = () => (state.monthIndex > 0 ? MONTHS[state.monthIndex - 1] : MARCH_SUMMARY);

  function setMonth(index) {
    const next = Math.max(0, Math.min(MONTHS.length - 1, index));
    if (next === state.monthIndex) return;
    state.monthIndex = next;
    state.showAllTx = false;
    renderAll();
  }

  function setCategoryFilter(catId) {
    state.categoryFilter = state.categoryFilter === catId ? null : catId;
    state.showAllTx = false;
    renderAll();
  }

  /** Re-renders and keeps keyboard focus on the equivalent control. */
  function renderAll() {
    const focusKey = document.activeElement?.dataset?.focusKey;
    hideTip();
    renderHeader();
    renderKpis();
    renderFlow();
    renderCategories();
    renderTransactions();
    renderBudgets();
    if (focusKey) document.querySelector(`[data-focus-key="${focusKey}"]`)?.focus({ preventScroll: true });
  }

  /* ================================================================
   * Header & month picker
   * ================================================================ */
  const monthSelect = $('#monthSelect');
  MONTHS.forEach((mo, i) => monthSelect.append(h('option', { value: i }, mo.label)));
  monthSelect.addEventListener('change', () => setMonth(Number(monthSelect.value)));
  $('#prevMonth').addEventListener('click', () => setMonth(state.monthIndex - 1));
  $('#nextMonth').addEventListener('click', () => setMonth(state.monthIndex + 1));

  function renderHeader() {
    const mo = current();
    monthSelect.value = String(state.monthIndex);
    $('#prevMonth').disabled = state.monthIndex === 0;
    $('#nextMonth').disabled = state.monthIndex === MONTHS.length - 1;
    const hour = new Date().getHours();
    const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    $('#greeting').textContent = `Good ${part}, Maya`;
    $('#pageSub').textContent = `Here is where your money went in ${mo.label}.`;
  }

  /* ================================================================
   * KPI cards
   * ================================================================ */
  function sparkline(values, activeIndex) {
    const w = 84, hgt = 32, pad = 4;
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const px = (i) => pad + (i * (w - pad * 2)) / (values.length - 1);
    const py = (v) => hgt - pad - ((v - min) / span) * (hgt - pad * 2);
    const d = values.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
    return s('svg', { class: 'kpi__spark', viewBox: `0 0 ${w} ${hgt}`, 'aria-hidden': 'true' },
      s('path', { d, fill: 'none', stroke: 'var(--axis)', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      s('circle', { cx: px(activeIndex), cy: py(values[activeIndex]), r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', 'stroke-width': 2 }));
  }

  function deltaPill(change, { goodWhenUp, text }) {
    const flat = Math.abs(change) < 0.0005;
    const up = change > 0;
    const good = up === goodWhenUp;
    const cls = flat ? 'delta--flat' : good ? 'delta--good' : 'delta--bad';
    return h('span', { class: `delta ${cls}` }, icon(flat ? 'flat' : up ? 'up' : 'down', 2.4), text);
  }

  function renderKpis() {
    const mo = current();
    const prev = previous();
    const vs = `vs ${prev.short}`;
    const pctChange = (a, b) => (a - b) / Math.abs(b);
    const fmtPctDelta = (v) => signed(v, (x) => fmtPct1.format(x));

    const cards = [
      {
        label: 'Balance', iconName: 'wallet', value: money0(mo.balance),
        change: pctChange(mo.balance, prev.balance), goodWhenUp: true,
        pill: fmtPctDelta(pctChange(mo.balance, prev.balance)),
        context: `${signed(mo.balance - prev.balance, money0)} ${vs}`,
        series: MONTHS.map((x) => x.balance),
        aria: `Balance at end of ${mo.long}`,
      },
      {
        label: 'Income', iconName: 'incomeArrow', value: money0(mo.income),
        change: pctChange(mo.income, prev.income), goodWhenUp: true,
        pill: fmtPctDelta(pctChange(mo.income, prev.income)),
        context: `${signed(mo.income - prev.income, money0)} ${vs}`,
        series: MONTHS.map((x) => x.income),
      },
      {
        label: 'Spending', iconName: 'spendArrow', value: money0(mo.spending),
        change: pctChange(mo.spending, prev.spending), goodWhenUp: false,
        pill: fmtPctDelta(pctChange(mo.spending, prev.spending)),
        context: `${signed(mo.spending - prev.spending, money0)} ${vs}`,
        series: MONTHS.map((x) => x.spending),
      },
      {
        label: 'Savings rate', iconName: 'savings', value: fmtPct1.format(mo.rate),
        change: mo.rate - prev.rate, goodWhenUp: true,
        pill: `${signed((mo.rate - prev.rate) * 100, (x) => x.toFixed(1))} pts`,
        context: `${vs} (${fmtPct1.format(prev.rate)})`,
        series: MONTHS.map((x) => x.rate),
      },
    ];

    $('#kpis').replaceChildren(...cards.map((c) =>
      h('article', { class: 'card kpi', 'aria-label': c.label },
        h('div', { class: 'kpi__top' }, h('span', { class: 'kpi__icon' }, icon(c.iconName)), c.label),
        h('div', { class: 'kpi__value' }, c.value),
        h('div', { class: 'kpi__foot' },
          h('div', { class: 'kpi__delta' }, deltaPill(c.change, { goodWhenUp: c.goodWhenUp, text: c.pill }), h('span', {}, c.context)),
          sparkline(c.series, state.monthIndex)))));
  }

  /* ================================================================
   * Income vs spending (grouped columns, one $ axis)
   * ================================================================ */
  function niceScale(max, targetTicks) {
    const rough = max / targetTicks;
    const mag = 10 ** Math.floor(Math.log10(rough));
    const norm = rough / mag;
    const stepN = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    const step = stepN * mag;
    return { step, top: Math.ceil(max / step) * step };
  }
  function topRoundedBar(x, y, w, hgt, r) {
    const rr = Math.min(r, w / 2, hgt);
    return `M${x},${y + hgt}V${y + rr}A${rr},${rr} 0 0 1 ${x + rr},${y}H${x + w - rr}A${rr},${rr} 0 0 1 ${x + w},${y + rr}V${y + hgt}Z`;
  }

  function flowTooltip(mo, i) {
    const prev = i > 0 ? MONTHS[i - 1] : MARCH_SUMMARY;
    return tipContent({
      title: mo.label,
      rows: [
        { label: 'Income', value: money(mo.income), color: 'var(--series-income)' },
        { label: 'Spending', value: money(mo.spending), color: 'var(--series-spend)' },
      ],
      footer: [
        { label: 'Net saved', value: signed(mo.net, money) },
        { label: 'Savings rate', value: fmtPct1.format(mo.rate) },
      ],
      note: `Spending ${signed((mo.spending - prev.spending) / prev.spending, (x) => fmtPct1.format(x))} vs ${prev.short}`
        + (i === state.monthIndex ? '' : ' · click to view'),
    });
  }

  function renderFlow() {
    const host = $('#flowChart');
    const table = $('#flowTable');
    const showTable = state.flowView === 'table';
    host.hidden = showTable;
    table.hidden = !showTable;
    $('#flowLegend').hidden = showTable;
    document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.flowView)));

    renderFlowSummary();
    if (showTable) {
      renderFlowTable(table);
      return;
    }

    const W = Math.max(260, Math.round(host.clientWidth || host.parentElement.clientWidth - 48));
    const H = W < 480 ? 220 : 260;
    const m = { t: 18, r: 4, b: 30, l: 44 };
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;
    const maxV = Math.max(...MONTHS.flatMap((x) => [x.income, x.spending]));
    const { step, top } = niceScale(maxV, 4);
    const y = (v) => m.t + ih - (v / top) * ih;
    const band = iw / MONTHS.length;
    const bw = Math.min(24, Math.max(10, band * 0.24));
    const gap = 2;

    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'group', 'aria-label': 'Income and spending by month, April to September 2026' });

    for (let v = 0; v <= top + 1e-6; v += step) {
      const yy = Math.round(y(v)) + 0.5;
      svg.append(
        s('line', { class: v === 0 ? 'baseline' : 'gridline', x1: m.l, x2: W - m.r, y1: yy, y2: yy }),
        s('text', { class: 'axis-label', x: m.l - 10, y: yy + 4, 'text-anchor': 'end' }, compactMoney(v)));
    }

    MONTHS.forEach((mo, i) => {
      const cx = m.l + band * i + band / 2;
      const selected = i === state.monthIndex;
      const g = s('g', {
        class: 'hit-group', tabindex: 0, role: 'button', 'data-focus-key': `flow-${i}`,
        'aria-pressed': String(selected),
        'aria-label': `${mo.label}: income ${money(mo.income)}, spending ${money(mo.spending)}, net ${signed(mo.net, money)}`,
      });
      const bandX = cx - band / 2 + 3;
      const bandW = band - 6;
      if (selected) g.append(s('rect', { class: 'band-selected', x: bandX, y: m.t - 10, width: bandW, height: ih + 10 + m.b - 2, rx: 10 }));
      const hoverBand = s('rect', { class: 'band-hover', x: bandX, y: m.t - 10, width: bandW, height: ih + 10 + m.b - 2, rx: 10 });
      if (!selected) g.append(hoverBand);

      const incomeY = y(mo.income);
      const spendY = y(mo.spending);
      g.append(
        s('path', { class: 'bar', d: topRoundedBar(cx - gap / 2 - bw, incomeY, bw, y(0) - incomeY, 4), fill: 'var(--series-income)' }),
        s('path', { class: 'bar', d: topRoundedBar(cx + gap / 2, spendY, bw, y(0) - spendY, 4), fill: 'var(--series-spend)' }),
        s('text', { class: `axis-label${selected ? ' axis-label--active' : ''}`, x: cx, y: H - 9, 'text-anchor': 'middle' }, mo.short),
        s('rect', { class: 'hit', x: cx - band / 2, y: 0, width: band, height: H }),
        s('rect', { class: 'focus-ring', x: bandX, y: m.t - 10, width: bandW, height: ih + 10 + m.b - 2, rx: 10 }));

      bindTooltip(g, () => flowTooltip(mo, i), {
        onEnter: () => hoverBand.style.setProperty('opacity', '1'),
        onLeave: () => hoverBand.style.removeProperty('opacity'),
      });
      g.addEventListener('click', () => setMonth(i));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMonth(i); }
      });
      svg.append(g);
    });

    host.replaceChildren(svg);
  }

  function renderFlowSummary() {
    const mo = current();
    const avgRate = MONTHS.reduce((a, x) => a + x.rate, 0) / MONTHS.length;
    const totalSaved = MONTHS.reduce((a, x) => a + x.net, 0);
    const item = (label, value) => h('div', { class: 'stat-mini' }, h('span', { class: 'stat-mini__label' }, label), h('span', { class: 'stat-mini__value' }, value));
    $('#flowSummary').replaceChildren(
      item(`Net saved in ${mo.short}`, signed(mo.net, money)),
      item('Saved over 6 months', signed(totalSaved, money0)),
      item('Avg. savings rate', fmtPct1.format(avgRate)),
      item('Best month', [...MONTHS].sort((a, b) => b.rate - a.rate)[0].long));
  }

  function renderFlowTable(container) {
    const rows = MONTHS.map((mo, i) => h('tr', { class: i === state.monthIndex ? 'is-selected' : '' },
      h('td', {}, mo.label),
      h('td', {}, money(mo.income)),
      h('td', {}, money(mo.spending)),
      h('td', {}, signed(mo.net, money)),
      h('td', {}, fmtPct1.format(mo.rate))));
    container.replaceChildren(h('table', { class: 'data-table' },
      h('caption', { class: 'visually-hidden' }, 'Income and spending by month'),
      h('thead', {}, h('tr', {}, ['Month', 'Income', 'Spending', 'Net', 'Rate'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, rows)));
  }

  document.querySelectorAll('[data-view]').forEach((btn) => btn.addEventListener('click', () => {
    state.flowView = btn.dataset.view;
    renderFlow();
  }));

  /* ================================================================
   * Spending by category (donut, fixed category order)
   * ================================================================ */
  function polar(r, a) { return [100 + r * Math.cos(a), 100 + r * Math.sin(a)]; }
  function arcPath(a0, a1, r0, r1) {
    const gapPx = 1; // half of the 2px surface gap on each side
    const po = gapPx / r1, pi = gapPx / r0;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const [x0, y0] = polar(r1, a0 + po);
    const [x1, y1] = polar(r1, a1 - po);
    const [x2, y2] = polar(r0, a1 - pi);
    const [x3, y3] = polar(r0, a0 + pi);
    return `M${x0},${y0}A${r1},${r1} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 ${large} 0 ${x3},${y3}Z`;
  }

  function categoryTooltip(cat) {
    const mo = current();
    const prev = previous();
    const amt = mo.byCat[cat.id];
    const diff = amt - prev.byCat[cat.id];
    return tipContent({
      title: cat.name,
      rows: [
        { label: 'Spent', value: money(amt), color: cat.color },
        { label: 'Share of spending', value: fmtPct1.format(amt / mo.spending) },
        { label: 'Budget used', value: `${fmtPct0.format(amt / cat.budget)} of ${money0(cat.budget)}` },
      ],
      note: `${signed(diff, money)} vs ${prev.short} · click to filter transactions`,
    });
  }

  function renderCategories() {
    const mo = current();
    const host = $('#donut');
    const legend = $('#catLegend');
    const filter = state.categoryFilter;
    $('#catSub').textContent = `${mo.label} · ${money(mo.spending)} total`;

    const r1 = 96, r0 = 66;
    const svg = s('svg', { viewBox: '0 0 200 200', role: 'group', 'aria-label': `Spending by category, ${mo.label}` });
    const segs = new Map();
    const rows = new Map();
    const setHover = (id) => {
      host.classList.toggle('has-hover', id != null);
      segs.forEach((el, k) => el.classList.toggle('is-hover', k === id));
      rows.forEach((el, k) => el.classList.toggle('is-hover', k === id));
    };

    let a = -Math.PI / 2;
    for (const cat of CATEGORIES) {
      const amt = mo.byCat[cat.id];
      if (amt <= 0) continue;
      const sweep = (amt / mo.spending) * Math.PI * 2;
      const path = s('path', {
        class: `donut__seg${filter === cat.id ? ' is-active' : ''}`,
        d: arcPath(a, a + sweep, r0, r1), fill: cat.color,
        tabindex: 0, role: 'button', 'data-focus-key': `seg-${cat.id}`,
        'aria-pressed': String(filter === cat.id),
        'aria-label': `${cat.name}: ${money(amt)}, ${fmtPct1.format(amt / mo.spending)} of spending`,
      });
      bindTooltip(path, () => categoryTooltip(cat), { onEnter: () => setHover(cat.id), onLeave: () => setHover(null) });
      path.addEventListener('click', () => setCategoryFilter(cat.id));
      path.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCategoryFilter(cat.id); }
      });
      segs.set(cat.id, path);
      svg.append(path);
      a += sweep;
    }

    const focusCat = filter ? CATEGORY_BY_ID[filter] : null;
    svg.append(
      s('text', { class: 'donut-center__value', x: 100, y: 102, 'text-anchor': 'middle' }, money0(focusCat ? mo.byCat[focusCat.id] : mo.spending)),
      s('text', { class: 'donut-center__label', x: 100, y: 122, 'text-anchor': 'middle' }, focusCat ? focusCat.name : `spent in ${mo.short}`));

    host.classList.toggle('has-filter', !!filter);
    host.classList.remove('has-hover');
    host.replaceChildren(svg);

    legend.classList.toggle('has-filter', !!filter);
    legend.replaceChildren(...CATEGORIES.map((cat) => {
      const amt = mo.byCat[cat.id];
      const btn = h('button', {
        type: 'button', 'aria-pressed': String(filter === cat.id), 'data-focus-key': `leg-${cat.id}`,
        onclick: () => setCategoryFilter(cat.id),
        onpointerenter: () => setHover(cat.id),
        onpointerleave: () => setHover(null),
        onfocus: () => setHover(cat.id),
        onblur: () => setHover(null),
      },
      h('span', { class: 'swatch', style: `--swatch: ${cat.color}` }),
      h('span', { class: 'cat-legend__name' }, cat.name),
      h('span', { class: 'cat-legend__amt' }, money0(amt)),
      h('span', { class: 'cat-legend__pct' }, fmtPct0.format(amt / mo.spending)));
      rows.set(cat.id, btn);
      return h('li', {}, btn);
    }));

    renderCategoryInsights(mo, previous());
  }

  function renderCategoryInsights(mo, prev) {
    const changes = CATEGORIES.map((cat) => ({ cat, diff: mo.byCat[cat.id] - prev.byCat[cat.id] }))
      .sort((x, y) => y.diff - x.diff);
    const rise = changes[0];
    const drop = changes[changes.length - 1];
    const discretionary = CATEGORIES.filter((c) => c.id !== 'housing' && c.id !== 'utilities')
      .reduce((acc, c) => acc + mo.byCat[c.id], 0);
    const item = (label, value) => h('div', { class: 'stat-mini' }, h('span', { class: 'stat-mini__label' }, label), h('span', { class: 'stat-mini__value' }, value));
    $('#catInsights').replaceChildren(
      item(`Top rise vs ${prev.short}`, rise.diff > 0 ? `${rise.cat.name} ${signed(rise.diff, money0)}` : 'None'),
      item(`Top drop vs ${prev.short}`, drop.diff < 0 ? `${drop.cat.name} ${signed(drop.diff, money0)}` : 'None'),
      item('Discretionary', fmtPct0.format(discretionary / mo.spending)));
  }

  /* ================================================================
   * Transactions
   * ================================================================ */
  const TX_PREVIEW_COUNT = 8;

  function renderTransactions() {
    const mo = current();
    const filter = state.categoryFilter;
    const cat = filter ? CATEGORY_BY_ID[filter] : null;
    const all = mo.transactions.filter((t) => !filter || t.cat === filter);
    const visible = state.showAllTx ? all : all.slice(0, TX_PREVIEW_COUNT);

    $('#txSub').textContent = cat
      ? `${all.length} ${cat.name.toLowerCase()} transactions in ${mo.long}`
      : `${all.length} transactions in ${mo.long}`;

    $('#txTools').replaceChildren(cat
      ? h('button', { class: 'chip', type: 'button', 'data-focus-key': 'tx-clear', onclick: () => setCategoryFilter(cat.id), 'aria-label': `Clear ${cat.name} filter` },
        h('span', { class: 'swatch', style: `--swatch: ${cat.color}` }), cat.name, icon('close', 2.2))
      : '');

    if (all.length === 0) {
      $('#txList').replaceChildren(h('p', { class: 'empty' }, 'No transactions in this category this month.'));
      return;
    }

    const list = h('div', { class: 'tx-list', role: 'list' });
    let lastDay = '';
    for (const t of visible) {
      const dayLabel = fmtDay.format(t.date);
      if (dayLabel !== lastDay) {
        list.append(h('div', { class: 'tx-day', role: 'presentation' }, dayLabel));
        lastDay = dayLabel;
      }
      const isIncome = t.kind === 'income';
      const color = isIncome ? INCOME_COLOR : CATEGORY_BY_ID[t.cat].color;
      const catName = isIncome ? 'Income' : CATEGORY_BY_ID[t.cat].name;
      const meta = t.note ? `${t.note} · ${catName}` : catName;
      list.append(h('div', { class: 'tx', role: 'listitem' },
        catIcon(t.icon, color),
        h('div', { class: 'tx__main' }, h('div', { class: 'tx__name' }, t.name), h('div', { class: 'tx__meta' }, meta)),
        h('div', { class: `tx__amt${isIncome ? ' tx__amt--in' : ''}` },
          h('span', { class: 'visually-hidden' }, isIncome ? 'Received ' : 'Spent '),
          isIncome ? `+${money(t.amount)}` : `${MINUS}${money(t.amount)}`)));
    }

    const nodes = [list];
    if (all.length > TX_PREVIEW_COUNT) {
      nodes.push(h('button', {
        class: 'btn-ghost', type: 'button', 'data-focus-key': 'tx-more', 'aria-expanded': String(state.showAllTx),
        onclick: () => { state.showAllTx = !state.showAllTx; renderTransactions(); $('[data-focus-key="tx-more"]')?.focus({ preventScroll: true }); },
      }, state.showAllTx ? 'Show fewer' : `Show all ${all.length} transactions`, icon(state.showAllTx ? 'chevronUp' : 'chevronDown', 2)));
    }
    $('#txList').replaceChildren(...nodes);
  }

  /* ================================================================
   * Budgets
   * ================================================================ */
  function budgetStatus(spent, budget) {
    const ratio = spent / budget;
    if (ratio > 1) return { key: 'over', ratio, iconName: 'over', text: `Over by ${money0(spent - budget)}` };
    if (ratio >= NEAR_LIMIT) return { key: 'warn', ratio, iconName: 'warn', text: `${money0(budget - spent)} left` };
    return { key: 'ok', ratio, iconName: 'ok', text: `${money0(budget - spent)} left` };
  }

  function meter(ratio, statusKey, label) {
    const pct = Math.min(1, ratio) * 100;
    return h('div', {
      class: `meter${statusKey === 'ok' ? '' : ` meter--${statusKey}`}`,
      role: 'progressbar', 'aria-label': label,
      'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(ratio * 100),
      'aria-valuetext': `${fmtPct0.format(ratio)} of budget used`,
    }, h('div', { class: 'meter__fill', style: `width: ${pct.toFixed(1)}%` }));
  }

  function renderBudgets() {
    const mo = current();
    const totalBudget = CATEGORIES.reduce((acc, c) => acc + c.budget, 0);
    const statuses = CATEGORIES.map((c) => ({ cat: c, spent: mo.byCat[c.id], st: budgetStatus(mo.byCat[c.id], c.budget) }));
    const overCount = statuses.filter((x) => x.st.key === 'over').length;
    const warnCount = statuses.filter((x) => x.st.key === 'warn').length;
    const parts = [];
    if (overCount) parts.push(`${overCount} over`);
    if (warnCount) parts.push(`${warnCount} near limit`);
    $('#budgetSub').textContent = `${mo.long} · ${parts.length ? parts.join(', ') : 'all on track'}`;

    const total = budgetStatus(mo.spending, totalBudget);
    const totalBlock = h('div', { class: 'budget-total' },
      h('div', { class: 'budget-total__row' },
        h('div', {},
          h('span', { class: 'budget-total__value' }, money0(mo.spending)),
          h('span', { class: 'budget-total__of' }, ` of ${money0(totalBudget)} monthly budget`)),
        h('span', { class: `budget__status budget__status--${total.key}` }, icon(total.iconName, 2), total.text)),
      meter(total.ratio, total.key, 'Total budget'));

    const list = h('ul', { class: 'budget-list' }, statuses.map(({ cat, spent, st }) =>
      h('li', {},
        h('div', { class: 'budget__head' },
          catIcon(cat.id, cat.color, true),
          h('div', {},
            h('div', { class: 'budget__name' }, cat.name),
            h('div', { class: 'budget__amounts' }, `${money0(spent)} of ${money0(cat.budget)} · ${fmtPct0.format(st.ratio)}`)),
          h('span', { class: `budget__status budget__status--${st.key}` }, icon(st.iconName, 2), st.text)),
        meter(st.ratio, st.key, `${cat.name} budget`))));

    $('#budgets').replaceChildren(totalBlock, list);
  }

  /* ================================================================
   * Boot
   * ================================================================ */
  renderAll();

  let lastFlowWidth = $('#flowChart').clientWidth;
  let resizeFrame = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const w = $('#flowChart').clientWidth;
      if (w && w !== lastFlowWidth) {
        lastFlowWidth = w;
        renderFlow();
      }
    });
  }).observe($('#flowChart').parentElement);

  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.hit-group, .donut__seg')) hideTip();
  });
})();
