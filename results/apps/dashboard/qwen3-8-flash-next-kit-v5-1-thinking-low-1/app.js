/* Personal finance dashboard — single person, sample data, no dependencies. */
(function () {
  "use strict";

  /* ---------------------------------------------------------
   * Categories, budgets, and icon references
   * --------------------------------------------------------- */
  const INCOME_CATS = { salary: "Income", freelance: "Freelance" };
  const SPEND_CATS = {
    housing:       { label: "Housing",       budget: 1600, icon: "housing" },
    groceries:     { label: "Groceries",     budget: 550,  icon: "groceries" },
    dining:        { label: "Dining",        budget: 300,  icon: "dining" },
    transport:     { label: "Transport",     budget: 200,  icon: "transport" },
    utilities:     { label: "Utilities",     budget: 220,  icon: "utilities" },
    entertainment: { label: "Entertainment", budget: 160,  icon: "entertainment" },
    shopping:      { label: "Shopping",      budget: 250,  icon: "shopping" },
  };
  const CAT_ORDER = Object.keys(SPEND_CATS);

  function catColor(id) {
    return `var(--c-${id})`;
  }
  function isIncome(cat) { return cat in INCOME_CATS; }
  function catLabel(cat) { return isIncome(cat) ? INCOME_CATS[cat] : (SPEND_CATS[cat] && SPEND_CATS[cat].label); }
  function catIcon(cat) { return isIncome(cat) ? cat : (SPEND_CATS[cat] && SPEND_CATS[cat].icon); }
  function catColorVar(cat) {
    if (cat === "salary") return "var(--series-income)";
    if (cat === "freelance") return "var(--series-income)";
    return `var(--c-${cat})`;
  }

  /* ---------------------------------------------------------
   * Hardcoded sample data — one person, 7 months (the first is
   * a baseline used only to compute month-over-month deltas).
   * Fields: m = month key, d = day, t = merchant/title,
   *         c = category, a = amount (positive).
   * --------------------------------------------------------- */
  const OPENING_BALANCE = 18500; // balance at the start of the baseline month
  const TX = [
    // ---- 2026-04 (baseline) ----
    { m: "2026-04", d: 1, t: "Acme Studio — Salary", c: "salary", a: 5200 },
    { m: "2026-04", d: 15, t: "Freelance — Logo refresh", c: "freelance", a: 400 },
    { m: "2026-04", d: 1, t: "Apartment — Rent", c: "housing", a: 1500 },
    { m: "2026-04", d: 6, t: "Whole Foods", c: "groceries", a: 210.00 },
    { m: "2026-04", d: 13, t: "Trader Joe’s", c: "groceries", a: 165.00 },
    { m: "2026-04", d: 24, t: "Corner Market", c: "groceries", a: 125.00 },
    { m: "2026-04", d: 5, t: "Blue Bottle Coffee", c: "dining", a: 92.50 },
    { m: "2026-04", d: 12, t: "Ramen Nagi", c: "dining", a: 78.00 },
    { m: "2026-04", d: 22, t: "Osteria Ferro", c: "dining", a: 64.50 },
    { m: "2026-04", d: 8, t: "Shell — Fuel", c: "transport", a: 92.00 },
    { m: "2026-04", d: 19, t: "Metro Card", c: "transport", a: 58.00 },
    { m: "2026-04", d: 3, t: "Comcast Internet", c: "utilities", a: 70.00 },
    { m: "2026-04", d: 9, t: "PG&E Electric", c: "utilities", a: 85.00 },
    { m: "2026-04", d: 17, t: "Verizon Wireless", c: "utilities", a: 45.00 },
    { m: "2026-04", d: 11, t: "Streaming bundle", c: "entertainment", a: 45.98 },
    { m: "2026-04", d: 20, t: "Concert tickets", c: "entertainment", a: 64.02 },
    { m: "2026-04", d: 26, t: "Amazon", c: "shopping", a: 210.00 },

    // ---- 2026-05 ----
    { m: "2026-05", d: 1, t: "Acme Studio — Salary", c: "salary", a: 5200 },
    { m: "2026-05", d: 18, t: "Freelance — Northwind logo", c: "freelance", a: 600 },
    { m: "2026-05", d: 1, t: "Apartment — Rent", c: "housing", a: 1500 },
    { m: "2026-05", d: 4, t: "Whole Foods", c: "groceries", a: 214.20 },
    { m: "2026-05", d: 12, t: "Trader Joe’s", c: "groceries", a: 176.50 },
    { m: "2026-05", d: 23, t: "Corner Market", c: "groceries", a: 89.30 },
    { m: "2026-05", d: 6, t: "Blue Bottle Coffee", c: "dining", a: 118.20 },
    { m: "2026-05", d: 14, t: "Ramen Nagi", c: "dining", a: 84.30 },
    { m: "2026-05", d: 21, t: "Sweetgreen", c: "dining", a: 62.50 },
    { m: "2026-05", d: 7, t: "Shell — Fuel", c: "transport", a: 88.50 },
    { m: "2026-05", d: 19, t: "Metro Card", c: "transport", a: 61.50 },
    { m: "2026-05", d: 3, t: "Comcast Internet", c: "utilities", a: 70.00 },
    { m: "2026-05", d: 9, t: "PG&E Electric", c: "utilities", a: 78.00 },
    { m: "2026-05", d: 17, t: "Verizon Wireless", c: "utilities", a: 42.00 },
    { m: "2026-05", d: 10, t: "Streaming bundle", c: "entertainment", a: 33.98 },
    { m: "2026-05", d: 20, t: "AMC Cinema", c: "entertainment", a: 56.02 },
    { m: "2026-05", d: 25, t: "Uniqlo", c: "shopping", a: 120.00 },

    // ---- 2026-06 ----
    { m: "2026-06", d: 1, t: "Acme Studio — Salary", c: "salary", a: 5200 },
    { m: "2026-06", d: 12, t: "Freelance — Podstack site", c: "freelance", a: 900 },
    { m: "2026-06", d: 1, t: "Apartment — Rent", c: "housing", a: 1500 },
    { m: "2026-06", d: 5, t: "Whole Foods", c: "groceries", a: 198.40 },
    { m: "2026-06", d: 14, t: "Trader Joe’s", c: "groceries", a: 165.20 },
    { m: "2026-06", d: 26, t: "Farmers Market", c: "groceries", a: 146.40 },
    { m: "2026-06", d: 7, t: "Osteria Ferro", c: "dining", a: 156.80 },
    { m: "2026-06", d: 15, t: "Sunday Brunch", c: "dining", a: 102.40 },
    { m: "2026-06", d: 22, t: "Ramen Nagi", c: "dining", a: 75.80 },
    { m: "2026-06", d: 6, t: "Shell — Fuel", c: "transport", a: 105.00 },
    { m: "2026-06", d: 18, t: "Rideshare", c: "transport", a: 60.00 },
    { m: "2026-06", d: 3, t: "Comcast Internet", c: "utilities", a: 70.00 },
    { m: "2026-06", d: 9, t: "PG&E Electric", c: "utilities", a: 63.00 },
    { m: "2026-06", d: 17, t: "Verizon Wireless", c: "utilities", a: 42.00 },
    { m: "2026-06", d: 11, t: "Spotify", c: "entertainment", a: 15.99 },
    { m: "2026-06", d: 21, t: "Summer festival", c: "entertainment", a: 104.01 },
    { m: "2026-06", d: 24, t: "Amazon", c: "shopping", a: 189.99 },
    { m: "2026-06", d: 27, t: "IKEA", c: "shopping", a: 90.01 },

    // ---- 2026-07 ----
    { m: "2026-07", d: 1, t: "Acme Studio — Salary", c: "salary", a: 5200 },
    { m: "2026-07", d: 1, t: "Apartment — Rent", c: "housing", a: 1500 },
    { m: "2026-07", d: 5, t: "Trader Joe’s", c: "groceries", a: 156.75 },
    { m: "2026-07", d: 13, t: "Whole Foods", c: "groceries", a: 142.10 },
    { m: "2026-07", d: 25, t: "Corner Market", c: "groceries", a: 131.15 },
    { m: "2026-07", d: 8, t: "Blue Bottle Coffee", c: "dining", a: 74.60 },
    { m: "2026-07", d: 16, t: "Sweetgreen", c: "dining", a: 68.90 },
    { m: "2026-07", d: 22, t: "Taco Stand", c: "dining", a: 66.50 },
    { m: "2026-07", d: 9, t: "Shell — Fuel", c: "transport", a: 80.00 },
    { m: "2026-07", d: 20, t: "Metro Card", c: "transport", a: 60.00 },
    { m: "2026-07", d: 3, t: "Comcast Internet", c: "utilities", a: 70.00 },
    { m: "2026-07", d: 9, t: "PG&E Electric", c: "utilities", a: 93.00 },
    { m: "2026-07", d: 17, t: "Verizon Wireless", c: "utilities", a: 42.00 },
    { m: "2026-07", d: 10, t: "Streaming bundle", c: "entertainment", a: 45.98 },
    { m: "2026-07", d: 19, t: "AMC Cinema", c: "entertainment", a: 104.02 },
    { m: "2026-07", d: 26, t: "Best Buy", c: "shopping", a: 160.00 },

    // ---- 2026-08 ----
    { m: "2026-08", d: 1, t: "Acme Studio — Salary", c: "salary", a: 5200 },
    { m: "2026-08", d: 9, t: "Freelance — Lumen app audit", c: "freelance", a: 1200 },
    { m: "2026-08", d: 1, t: "Apartment — Rent", c: "housing", a: 1500 },
    { m: "2026-08", d: 4, t: "Whole Foods", c: "groceries", a: 232.60 },
    { m: "2026-08", d: 13, t: "Trader Joe’s", c: "groceries", a: 188.90 },
    { m: "2026-08", d: 24, t: "Farmers Market", c: "groceries", a: 138.50 },
    { m: "2026-08", d: 6, t: "Osteria Ferro", c: "dining", a: 96.30 },
    { m: "2026-08", d: 15, t: "Ramen Nagi", c: "dining", a: 82.20 },
    { m: "2026-08", d: 23, t: "Sweetgreen", c: "dining", a: 66.50 },
    { m: "2026-08", d: 7, t: "Shell — Fuel", c: "transport", a: 95.50 },
    { m: "2026-08", d: 19, t: "Rideshare", c: "transport", a: 59.50 },
    { m: "2026-08", d: 3, t: "Comcast Internet", c: "utilities", a: 70.00 },
    { m: "2026-08", d: 9, t: "PG&E Electric", c: "utilities", a: 148.00 },
    { m: "2026-08", d: 17, t: "Verizon Wireless", c: "utilities", a: 42.00 },
    { m: "2026-08", d: 10, t: "Streaming bundle", c: "entertainment", a: 33.98 },
    { m: "2026-08", d: 21, t: "AMC Cinema", c: "entertainment", a: 51.02 },
    { m: "2026-08", d: 26, t: "Nike", c: "shopping", a: 210.00 },

    // ---- 2026-09 ----
    { m: "2026-09", d: 1, t: "Acme Studio — Salary", c: "salary", a: 5200 },
    { m: "2026-09", d: 21, t: "Freelance — Icon pack", c: "freelance", a: 350 },
    { m: "2026-09", d: 1, t: "Apartment — Rent", c: "housing", a: 1500 },
    { m: "2026-09", d: 5, t: "Whole Foods", c: "groceries", a: 205.30 },
    { m: "2026-09", d: 14, t: "Trader Joe’s", c: "groceries", a: 175.70 },
    { m: "2026-09", d: 25, t: "Corner Market", c: "groceries", a: 119.00 },
    { m: "2026-09", d: 6, t: "Osteria Ferro", c: "dining", a: 188.90 },
    { m: "2026-09", d: 15, t: "Sunday Brunch", c: "dining", a: 120.60 },
    { m: "2026-09", d: 22, t: "Ramen Nagi", c: "dining", a: 75.50 },
    { m: "2026-09", d: 8, t: "Shell — Fuel", c: "transport", a: 118.00 },
    { m: "2026-09", d: 19, t: "Metro Card", c: "transport", a: 57.00 },
    { m: "2026-09", d: 3, t: "Comcast Internet", c: "utilities", a: 70.00 },
    { m: "2026-09", d: 9, t: "PG&E Electric", c: "utilities", a: 96.00 },
    { m: "2026-09", d: 17, t: "Verizon Wireless", c: "utilities", a: 44.00 },
    { m: "2026-09", d: 11, t: "Streaming bundle", c: "entertainment", a: 45.98 },
    { m: "2026-09", d: 20, t: "Concert tickets", c: "entertainment", a: 84.02 },
    { m: "2026-09", d: 24, t: "Amazon", c: "shopping", a: 165.00 },
    { m: "2026-09", d: 28, t: "IKEA", c: "shopping", a: 80.00 },

    // ---- 2026-10 ----
    { m: "2026-10", d: 1, t: "Acme Studio — Salary", c: "salary", a: 5200 },
    { m: "2026-10", d: 7, t: "Freelance — Fintech prototype", c: "freelance", a: 800 },
    { m: "2026-10", d: 1, t: "Apartment — Rent", c: "housing", a: 1500 },
    { m: "2026-10", d: 3, t: "Whole Foods", c: "groceries", a: 188.45 },
    { m: "2026-10", d: 11, t: "Trader Joe’s", c: "groceries", a: 160.55 },
    { m: "2026-10", d: 20, t: "Corner Market", c: "groceries", a: 121.00 },
    { m: "2026-10", d: 5, t: "Osteria Ferro", c: "dining", a: 132.40 },
    { m: "2026-10", d: 14, t: "Blue Bottle Coffee", c: "dining", a: 88.60 },
    { m: "2026-10", d: 21, t: "Sweetgreen", c: "dining", a: 69.00 },
    { m: "2026-10", d: 6, t: "Shell — Fuel", c: "transport", a: 96.00 },
    { m: "2026-10", d: 18, t: "Metro Card", c: "transport", a: 64.00 },
    { m: "2026-10", d: 3, t: "Comcast Internet", c: "utilities", a: 70.00 },
    { m: "2026-10", d: 9, t: "PG&E Electric", c: "utilities", a: 83.00 },
    { m: "2026-10", d: 17, t: "Verizon Wireless", c: "utilities", a: 42.00 },
    { m: "2026-10", d: 10, t: "Spotify", c: "entertainment", a: 33.98 },
    { m: "2026-10", d: 16, t: "Steam sale", c: "entertainment", a: 66.02 },
    { m: "2026-10", d: 19, t: "Concert tickets", c: "entertainment", a: 75.00 },
    { m: "2026-10", d: 22, t: "Uniqlo", c: "shopping", a: 130.00 },
  ];

  /* ---------------------------------------------------------
   * Aggregation
   * --------------------------------------------------------- */
  const ALL_MONTHS = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
  const SELECTABLE = ALL_MONTHS.slice(1); // the visible "last 6 months"
  const MONTHS_ASC = SELECTABLE.slice(); // chronological ascending

  function aggregate(key) {
    let income = 0, spend = 0;
    const byCat = {};
    CAT_ORDER.forEach((c) => (byCat[c] = 0));
    const txs = [];
    for (const t of TX) {
      if (t.m !== key) continue;
      txs.push(t);
      if (isIncome(t.c)) income += t.a;
      else { spend += t.a; if (byCat[t.c] != null) byCat[t.c] += t.a; }
    }
    txs.sort((a, b) => b.d - a.d); // newest first within month
    return { key, income, spend, byCat, txs, net: income - spend };
  }

  const AGG = {};
  ALL_MONTHS.forEach((k) => (AGG[k] = aggregate(k)));

  // Running balance at the end of each month.
  const BALANCE = {};
  (function () {
    let bal = OPENING_BALANCE;
    for (const k of ALL_MONTHS) { bal += AGG[k].net; BALANCE[k] = bal; }
  })();

  /* ---------------------------------------------------------
   * Formatting helpers
   * --------------------------------------------------------- */
  const CUR = "$";
  function fmtMoney(v, cents) {
    const rounded = cents ? Math.round(v * 100) / 100 : Math.round(v);
    return CUR + rounded.toLocaleString("en-US", {
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: cents ? 2 : 0,
    });
  }
  function fmtSmart(v) {
    return Number.isInteger(v) ? fmtMoney(v, false) : fmtMoney(v, true);
  }
  function fmtCompact(v) {
    if (v >= 1000) {
      const k = v / 1000;
      return CUR + (Number.isInteger(k) ? k : k.toFixed(1)) + "k";
    }
    return CUR + Math.round(v);
  }
  const fmtMonthShort = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  const fmtMonthLong = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
  function keyToDate(k) { const [y, m] = k.split("-").map(Number); return new Date(Date.UTC(y, m - 1, 1)); }
  function monthShort(k) { return fmtMonthShort.format(keyToDate(k)); }
  function monthLong(k) { return fmtMonthLong.format(keyToDate(k)) + " " + k.slice(0, 4); }
  function dayLabel(k, d) {
    const [y, m] = k.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
      .format(new Date(Date.UTC(y, m - 1, d)));
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  /* ---------------------------------------------------------
   * Theme-aware token reading (charts read colors from CSS)
   * --------------------------------------------------------- */
  function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function resolveColor(c) {
    // Resolve a CSS var reference like "var(--c-dining)" to a literal color.
    const m = /^var\((--[\w-]+)\)$/.exec(c);
    if (m) return token(m[1]);
    return c;
  }

  /* ---------------------------------------------------------
   * Small icons used inside the app (inline SVG, no deps)
   * --------------------------------------------------------- */
  function sprite(id) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-${id}"></use></svg>`;
  }
  const KPI_ICONS = {
    balance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16.5 14.5h2"/></svg>',
    income: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 17 10 11l3 3 7-7"/><path d="M15 7h5v5"/></svg>',
    spending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h2l1.6 9.2a1 1 0 0 0 1 .8h7.6a1 1 0 0 0 1-.8L19 10H6.5"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="16.5" cy="20" r="1.3"/></svg>',
    savings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.5 8.5a5 5 0 1 0 0 7"/><path d="M15.5 5.5v3h-3M19.5 15 15.5 11"/><path d="M4 5 20 20"/></svg>',
    arrow: '<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7l6 10H6z" fill="currentColor"/></svg>',
  };

  /* ---------------------------------------------------------
   * Sparkline (stretches to container; no text so scaling is fine)
   * --------------------------------------------------------- */
  function sparkline(values, colorVar) {
    if (!values.length) return "";
    const w = 100, h = 30, pad = 3;
    const max = Math.max.apply(null, values), min = Math.min.apply(null, values);
    const span = max - min || 1;
    const stepX = values.length > 1 ? w / (values.length - 1) : w;
    const pts = values.map((v, i) => {
      const x = i * stepX;
      const y = pad + (h - pad * 2) * (1 - (v - min) / span);
      return [x, y];
    });
    const line = pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const area = `0,${h} ` + line + ` ${w},${h}`;
    const c = `var(${colorVar})`;
    const last = pts[pts.length - 1];
    return `<svg class="kpi-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <polygon points="${area}" fill="${c}" opacity="0.10"></polygon>
      <polyline points="${line}" fill="none" stroke="${c}" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"></polyline>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="1.8" fill="${c}" vector-effect="non-scaling-stroke"></circle>
    </svg>`;
  }

  /* ---------------------------------------------------------
   * KPI rendering
   * --------------------------------------------------------- */
  function deltaHTML(valueHTML, pct, up, good, flat) {
    const cls = flat ? "flat" : good ? "good" : "bad";
    const rot = up ? "" : "transform:rotate(180deg);";
    const arrow = flat ? "" : `<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true" style="${rot}"><path d="M12 7l6 10H6z" fill="currentColor"/></svg>`;
    const label = flat ? "no change" : valueHTML;
    return `<span class="kpi-delta ${cls}">${arrow}${label}<span class="vs">vs last month</span></span>`;
  }

  function renderKPIs(monthKey) {
    const prevKey = ALL_MONTHS[ALL_MONTHS.indexOf(monthKey) - 1];
    const cur = AGG[monthKey], prev = AGG[prevKey];
    const curRate = cur.income ? cur.net / cur.income : 0;
    const prevRate = prev.income ? prev.net / prev.income : 0;

    const series = {
      balance: MONTHS_ASC.map((k) => BALANCE[k]),
      income: MONTHS_ASC.map((k) => AGG[k].income),
      spending: MONTHS_ASC.map((k) => AGG[k].spend),
      savings: MONTHS_ASC.map((k) => (AGG[k].income ? AGG[k].net / AGG[k].income * 100 : 0)),
    };

    function pctChange(a, b) { return b === 0 ? null : (a - b) / Math.abs(b); }

    // Balance
    const bal = BALANCE[monthKey], balPrev = BALANCE[prevKey];
    const balDiff = bal - balPrev, balPct = pctChange(bal, balPrev);
    // Income
    const incDiff = cur.income - prev.income, incPct = pctChange(cur.income, prev.income);
    // Spending
    const spdDiff = cur.spend - prev.spend, spdPct = pctChange(cur.spend, prev.spend);
    // Savings rate (percentage points)
    const ratePP = (curRate - prevRate) * 100;

    function money(delta) { return fmtMoney(Math.abs(delta)); }
    function pctTxt(p) { return p == null ? "new" : Math.abs(p * 100).toFixed(1) + "%"; }

    const cards = [
      {
        key: "balance", label: "Balance", icon: KPI_ICONS.balance,
        value: `<span class="unit">${CUR}</span>${Math.round(bal).toLocaleString("en-US")}`,
        delta: deltaHTML(`${money(balDiff)} · ${pctTxt(balPct)}`, balPct, balDiff >= 0, balDiff >= 0, Math.abs(balDiff) < 0.5),
        spark: sparkline(series.balance, "--accent"),
      },
      {
        key: "income", label: "Income", icon: KPI_ICONS.income,
        value: `<span class="unit">${CUR}</span>${Math.round(cur.income).toLocaleString("en-US")}`,
        delta: deltaHTML(`${money(incDiff)} · ${pctTxt(incPct)}`, incPct, incDiff >= 0, incDiff >= 0, Math.abs(incDiff) < 0.5),
        spark: sparkline(series.income, "--series-income"),
      },
      {
        key: "spending", label: "Spending", icon: KPI_ICONS.spending,
        value: `<span class="unit">${CUR}</span>${Math.round(cur.spend).toLocaleString("en-US")}`,
        delta: deltaHTML(`${money(spdDiff)} · ${pctTxt(spdPct)}`, spdPct, spdDiff >= 0, spdDiff <= 0, Math.abs(spdDiff) < 0.5),
        spark: sparkline(series.spending, "--series-spend"),
      },
      {
        key: "savings", label: "Savings rate", icon: KPI_ICONS.savings,
        value: `${(curRate * 100).toFixed(1)}<span class="unit">%</span>`,
        delta: deltaHTML(`${Math.abs(ratePP).toFixed(1)} pp`, ratePP / 100, ratePP >= 0, ratePP >= 0, Math.abs(ratePP) < 0.05),
        spark: sparkline(series.savings, "--series-income"),
      },
    ];

    document.getElementById("kpis").innerHTML = cards.map((c) => `
      <article class="kpi">
        <div class="kpi-top">
          <span class="kpi-label">${esc(c.label)}</span>
          <span class="kpi-ico">${c.icon}</span>
        </div>
        <div class="kpi-value num">${c.value}</div>
        ${c.delta}
        ${c.spark}
      </article>`).join("");
  }

  /* ---------------------------------------------------------
   * Trend chart — income vs spending, grouped columns over 6 months
   * --------------------------------------------------------- */
  function niceCeil(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v || 1)));
    const n = v / p;
    let s;
    if (n <= 1) s = 1; else if (n <= 2) s = 2; else if (n <= 2.5) s = 2.5; else if (n <= 5) s = 5; else s = 10;
    return s * p;
  }

  const tip = document.getElementById("tooltip");
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.setAttribute("aria-hidden", "false");
    tip.classList.add("show");
    const pad = 10, r = tip.getBoundingClientRect();
    let left = x, top = y;
    left = Math.max(r.width / 2 + pad, Math.min(window.innerWidth - r.width / 2 - pad, left));
    top = Math.max(r.height + pad + 4, top);
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }
  function hideTip() { tip.classList.remove("show"); tip.setAttribute("aria-hidden", "true"); }

  function renderTrend(monthKey) {
    const host = document.getElementById("trendChart");
    const W = Math.max(300, host.clientWidth || 520);
    const H = 250;
    const mL = 44, mR = 12, mT = 14, mB = 34;
    const plotW = W - mL - mR, plotH = H - mT - mB;

    const data = MONTHS_ASC.map((k) => ({ key: k, income: AGG[k].income, spend: AGG[k].spend }));
    const maxV = niceCeil(Math.max(...data.map((d) => Math.max(d.income, d.spend))) || 1000);
    const ticks = 4;
    const y = (v) => mT + plotH * (1 - v / maxV);

    const cIncome = resolveColor("var(--series-income)");
    const cSpend = resolveColor("var(--series-spend)");

    let grid = "";
    for (let i = 0; i <= ticks; i++) {
      const v = (maxV / ticks) * i;
      const yy = y(v);
      grid += `<line class="grid-line" x1="${mL}" y1="${yy.toFixed(1)}" x2="${W - mR}" y2="${yy.toFixed(1)}"></line>`;
      grid += `<text class="axis-label num" x="${mL - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${fmtCompact(v)}</text>`;
    }

    const slot = plotW / data.length;
    const barW = Math.min(22, slot * 0.30);
    const gap = 6;

    let bars = "", labels = "", hits = "";
    data.forEach((d, i) => {
      const cx = mL + slot * (i + 0.5);
      const selected = d.key === monthKey;
      if (selected) {
        bars += `<rect class="sel-band" x="${(cx - slot * 0.44).toFixed(1)}" y="${mT - 4}" width="${(slot * 0.88).toFixed(1)}" height="${plotH + 8}" rx="10"></rect>`;
      }
      const ix = cx - barW - gap / 2, sx = cx + gap / 2;
      bars += `<rect class="bar" x="${ix.toFixed(1)}" y="${y(d.income).toFixed(1)}" width="${barW}" height="${(mT + plotH - y(d.income)).toFixed(1)}" rx="3" fill="${cIncome}"></rect>`;
      bars += `<rect class="bar" x="${sx.toFixed(1)}" y="${y(d.spend).toFixed(1)}" width="${barW}" height="${(mT + plotH - y(d.spend)).toFixed(1)}" rx="3" fill="${cSpend}"></rect>`;
      labels += `<text class="axis-label" x="${cx.toFixed(1)}" y="${H - 12}" text-anchor="middle">${monthShort(d.key)}</text>`;
      // full-height invisible hit area for tooltip + click-to-select
      hits += `<rect data-key="${d.key}" x="${(cx - slot / 2).toFixed(1)}" y="${mT}" width="${slot}" height="${plotH}" fill="transparent" style="cursor:pointer"></rect>`;
    });

    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
        aria-label="Grouped bar chart of income versus spending for ${MONTHS_ASC.map(monthShort).join(", ")}.">
        ${grid}${bars}${labels}${hits}
      </svg>
      <div class="chips">
        <span class="chip"><span class="dot" style="background:${cIncome}"></span>Income</span>
        <span class="chip"><span class="dot" style="background:${cSpend}"></span>Spending</span>
      </div>`;

    host.querySelectorAll("rect[data-key]").forEach((rect) => {
      const k = rect.getAttribute("data-key");
      const d = AGG[k];
      const rate = d.income ? Math.round((d.net / d.income) * 100) : 0;
      rect.addEventListener("pointermove", (e) => {
        showTip(
          `<div class="t-title">${monthLong(k)}</div>
           <div class="t-row"><span class="t-dot" style="background:${cIncome}"></span>Income<span class="t-val">${fmtMoney(d.income)}</span></div>
           <div class="t-row"><span class="t-dot" style="background:${cSpend}"></span>Spending<span class="t-val">${fmtMoney(d.spend)}</span></div>
           <div class="t-row" style="opacity:.85">Saved<span class="t-val">${fmtMoney(d.net)} · ${rate}%</span></div>`,
          e.clientX, e.clientY
        );
      });
      rect.addEventListener("pointerleave", hideTip);
      rect.addEventListener("click", () => { hideTip(); selectMonth(k); });
    });
  }

  /* ---------------------------------------------------------
   * Donut chart — spending by category for the selected month
   * --------------------------------------------------------- */
  function arcSegments() {}

  function renderDonut(monthKey) {
    const host = document.getElementById("catChart");
    const legend = document.getElementById("catLegend");
    const cur = AGG[monthKey];
    const items = CAT_ORDER
      .map((c) => ({ cat: c, label: SPEND_CATS[c].label, value: cur.byCat[c] }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
    const total = items.reduce((s, d) => s + d.value, 0);

    const size = 196, cx = size / 2, cy = size / 2, r = 74, thick = 26;
    const C = 2 * Math.PI * r;
    const gapLen = items.length > 1 ? 2 : 0;

    let acc = 0;
    const arcs = items.map((d, i) => {
      const frac = d.value / total;
      const dash = Math.max(frac * C - gapLen, 0.5);
      const off = -(acc * C) - gapLen / 2;
      acc += frac;
      const color = resolveColor(catColorVar(d.cat));
      return `<circle class="donut-arc" data-cat="${d.cat}" data-idx="${i}" cx="${cx}" cy="${cy}" r="${r}" fill="none"
          stroke="${color}" stroke-width="${thick}" stroke-linecap="butt"
          stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"
          transform="rotate(-90 ${cx} ${cy})"></circle>`;
    }).join("");

    host.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="margin:0 auto"
        role="img" aria-label="Donut chart of ${monthLong(monthKey)} spending by category. Total ${fmtMoney(total)}.">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${resolveColor("var(--track)")}" stroke-width="${thick}"></circle>
        ${arcs}
        <g class="donut-center">
          <text class="dc-total num" x="${cx}" y="${cy - 2}" text-anchor="middle">${fmtMoney(total)}</text>
          <text class="dc-cap" x="${cx}" y="${cy + 16}" text-anchor="middle">Total spent</text>
        </g>
      </svg>`;

    legend.innerHTML = items.map((d, i) => `
      <li data-idx="${i}" data-cat="${d.cat}" tabindex="0">
        <span class="swatch" style="background:${resolveColor(catColorVar(d.cat))}"></span>
        <span class="l-name">${esc(d.label)}</span>
        <span class="l-pct num">${((d.value / total) * 100).toFixed(0)}%</span>
        <span class="l-amt num">${fmtMoney(d.value)}</span>
      </li>`).join("");

    const arcEls = Array.from(host.querySelectorAll(".donut-arc"));
    const liEls = Array.from(legend.querySelectorAll("li"));

    function highlight(idx) {
      arcEls.forEach((a, i) => a.classList.toggle("dim", idx != null && i !== idx));
      liEls.forEach((l, i) => l.classList.toggle("active", idx === i));
    }
    function tipFor(i, x, y) {
      const d = items[i];
      showTip(
        `<div class="t-title">${esc(d.label)}</div>
         <div class="t-row"><span class="t-dot" style="background:${resolveColor(catColorVar(d.cat))}"></span>${monthShort(monthKey)}<span class="t-val">${fmtMoney(d.value)}</span></div>
         <div class="t-row" style="opacity:.85">Share<span class="t-val">${((d.value / total) * 100).toFixed(1)}%</span></div>`,
        x, y
      );
    }
    arcEls.forEach((a, i) => {
      a.addEventListener("pointerenter", (e) => { highlight(i); tipFor(i, e.clientX, e.clientY); });
      a.addEventListener("pointermove", (e) => tipFor(i, e.clientX, e.clientY));
      a.addEventListener("pointerleave", () => { highlight(null); hideTip(); });
    });
    liEls.forEach((l, i) => {
      const rect = () => { const b = l.getBoundingClientRect(); return [b.left + b.width / 2, b.top]; };
      l.addEventListener("pointerenter", () => { highlight(i); const [x, y] = rect(); tipFor(i, x, y); });
      l.addEventListener("pointerleave", () => { highlight(null); hideTip(); });
      l.addEventListener("focus", () => { highlight(i); const [x, y] = rect(); tipFor(i, x, y); });
      l.addEventListener("blur", () => { highlight(null); hideTip(); });
    });
  }

  /* ---------------------------------------------------------
   * Budget progress
   * --------------------------------------------------------- */
  function renderBudgets(monthKey) {
    const host = document.getElementById("budgets");
    const cur = AGG[monthKey];
    host.innerHTML = CAT_ORDER.map((c) => {
      const limit = SPEND_CATS[c].budget;
      const spent = cur.byCat[c];
      const ratio = spent / limit;
      const state = ratio >= 1 ? "over" : ratio >= 0.85 ? "warn" : "ok";
      const fill = Math.min(ratio, 1) * 100;
      let status;
      if (state === "over") {
        status = `<span class="b-status over">▲ ${fmtMoney(spent - limit)} over budget</span>`;
      } else if (state === "warn") {
        status = `<span class="b-status warn">▲ Near limit · ${fmtMoney(limit - spent)} left</span>`;
      } else {
        status = `<span class="b-status ok">${Math.round(ratio * 100)}% of budget · ${fmtMoney(limit - spent)} left</span>`;
      }
      return `
        <div class="budget">
          <span class="b-ico" style="color:${resolveColor(catColorVar(c))}">${sprite(SPEND_CATS[c].icon)}</span>
          <div>
            <div class="b-row">
              <span class="b-name">${esc(SPEND_CATS[c].label)}</span>
              <span class="b-fig num"><span class="spent">${fmtMoney(spent)}</span> / ${fmtMoney(limit)}</span>
            </div>
            <div class="b-track"><div class="b-fill ${state}" style="width:${fill.toFixed(1)}%"></div></div>
            ${status}
          </div>
        </div>`;
    }).join("");
  }

  /* ---------------------------------------------------------
   * Transactions list
   * --------------------------------------------------------- */
  function renderTransactions(monthKey) {
    const host = document.getElementById("txList");
    const cur = AGG[monthKey];
    if (!cur.txs.length) {
      host.innerHTML = `<li class="tx-empty">No transactions this month.</li>`;
      return;
    }
    host.innerHTML = cur.txs.map((t) => {
      const inc = isIncome(t.c);
      const color = resolveColor(catColorVar(t.c));
      const bg = inc ? "var(--pos-soft)" : "var(--surface-2)";
      const sign = inc ? "+" : "−";
      return `
        <li class="tx">
          <span class="tx-ico" style="background:${bg};color:${color}">${sprite(catIcon(t.c))}</span>
          <div class="tx-main">
            <div class="tx-title">${esc(t.t)}</div>
            <div class="tx-meta">${esc(catLabel(t.c))} · ${dayLabel(monthKey, t.d)}</div>
          </div>
          <div class="tx-amt num ${inc ? "income" : ""}">${sign}<span class="cur">${CUR}</span>${fmtSmart(t.a).slice(1)}</div>
        </li>`;
    }).join("");
  }

  /* ---------------------------------------------------------
   * Month selector + orchestration
   * --------------------------------------------------------- */
  let current = SELECTABLE[SELECTABLE.length - 1]; // latest month

  function renderAll() {
    document.getElementById("periodLine").textContent = `${monthLong(current)} · overview`;
    document.getElementById("catSub").textContent = `Share of spend · ${monthShort(current)}`;
    document.getElementById("txSub").textContent = `This month · ${monthShort(current)}`;
    renderKPIs(current);
    renderTrend(current);
    renderDonut(current);
    renderBudgets(current);
    renderTransactions(current);
  }

  function selectMonth(key) {
    current = key;
    const sel = document.getElementById("monthSelect");
    if (sel.value !== key) sel.value = key;
    renderAll();
  }

  function initSelector() {
    const sel = document.getElementById("monthSelect");
    sel.innerHTML = SELECTABLE.slice().reverse().map((k) =>
      `<option value="${k}">${monthLong(k)}</option>`).join("");
    sel.value = current;
    sel.addEventListener("change", (e) => selectMonth(e.target.value));
  }

  /* Re-render charts when the container resizes (responsive, true-px labels). */
  let rt;
  function onResize() { clearTimeout(rt); rt = setTimeout(() => { renderTrend(current); renderDonut(current); }, 120); }
  window.addEventListener("resize", onResize);

  /* Re-render on system theme change so chart colors stay in sync. */
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onTheme = () => renderAll();
    if (mq.addEventListener) mq.addEventListener("change", onTheme);
    else if (mq.addListener) mq.addListener(onTheme);
  }

  /* Tap anywhere outside a chart hides the tooltip (touch-friendly). */
  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("svg, .legend li")) hideTip();
  });

  initSelector();
  renderAll();
})();
