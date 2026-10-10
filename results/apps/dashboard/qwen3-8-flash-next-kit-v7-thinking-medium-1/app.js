"use strict";

/* ---------- helpers ---------- */

const $ = (sel, root) => (root || document).querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const MINUS = "\u2212";

const signed = (v, opts) => {
  const o = opts || {};
  const abs = Math.abs(v);
  const body = o.pp ? `${abs.toFixed(1)} pp` : (o.whole ? usd0.format(abs) : usd.format(abs));
  if (abs < (o.eps != null ? o.eps : 0.004)) return { text: o.pp ? "0 pp" : "$0.00", dir: 0 };
  return { text: (v > 0 ? "+" : MINUS) + body, dir: v > 0 ? 1 : -1 };
};

const compactMoney = (v) =>
  v >= 1000 ? "$" + (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : "$" + Math.round(v);

const pct1 = (v) => (v * 100).toFixed(v >= 0.1 ? 0 : 1) + "%";

const darkQ = window.matchMedia("(prefers-color-scheme: dark)");
const isDark = () => darkQ.matches;
const catColor = (key) => CATEGORIES[key][isDark() ? "dark" : "light"];

const ICONS = {
  home: '<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.8 10.2V20h12.4v-9.8"/><path d="M10 20v-5h4v5"/>',
  basket: '<path d="M4 5h2l2.1 10.4h9.3L19.5 8H6.6"/><circle cx="9.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/>',
  cup: '<path d="M4.5 9h11v5.5a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4V9z"/><path d="M15.5 10.5h1.8a2.4 2.4 0 0 1 0 4.8h-1.8"/><path d="M8 3.2v2.4M12 3.2v2.4"/>',
  tram: '<rect x="5.5" y="4" width="13" height="12.5" rx="2.5"/><path d="M5.5 10.5h13"/><path d="M9.5 20.5 8 16.5M14.5 20.5 16 16.5"/><circle cx="9.2" cy="13.6" r=".9"/><circle cx="14.8" cy="13.6" r=".9"/>',
  bolt: '<path d="M13 2.5 5.5 13H10l-1 8.5L17.5 11H13l1-8.5z"/>',
  ticket: '<rect x="3" y="6.5" width="18" height="11" rx="2"/><path d="M14.5 6.5v11" stroke-dasharray="2 2.4"/><path d="M6 10.5h4M6 13.5h4"/>',
  banknote: '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.2 9.8h.01M17.8 14.2h.01"/>',
  brush: '<path d="M4 20l.9-3.6L15.8 5.5a2.1 2.1 0 0 1 3 3L7.9 19.4 4 20z"/><path d="M13.6 7.6l2.8 2.8"/>',
  coin: '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.3v9.4"/><path d="M14.4 9.6c-.4-.9-1.3-1.4-2.4-1.4-1.4 0-2.4.8-2.4 1.8 0 2.3 4.8 1.2 4.8 3.9 0 1.1-1 1.9-2.4 1.9-1.1 0-2-.5-2.4-1.4"/>',
  warn: '<path d="M12 3.5 22 20H2L12 3.5z"/><path d="M12 10v4.5M12 17.2h.01"/>',
  arrowUp: '<path d="M12 19V5M12 5l-6 6M12 5l6 6"/>',
  arrowDown: '<path d="M12 5v14M12 19l-6-6M12 19l6-6"/>',
};

const icon = (name, size) =>
  `<svg viewBox="0 0 24 24" width="${size || 18}" height="${size || 18}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

const svgNS = "http://www.w3.org/2000/svg";
const sEl = (tag, attrs) => {
  const n = document.createElementNS(svgNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};

/* ---------- model ---------- */

const MONTHS_IDX = {};
MONTHS.forEach((m, i) => (MONTHS_IDX[m.key] = i));

function monthStats(m) {
  let income = 0, spend = 0, txCount = 0, incomeCount = 0;
  const byCat = {};
  for (const t of m.tx) {
    if (t.a >= 0) { income += t.a; incomeCount++; }
    else {
      spend += -t.a; txCount++;
      byCat[t.c] = (byCat[t.c] || 0) + -t.a;
    }
  }
  return { income, spend, byCat, txCount, incomeCount, net: income - spend };
}

const STATS = MONTHS.map(monthStats);

function balanceAt(idx) {
  let b = PERSON.openingBalance;
  for (let i = 0; i <= idx; i++) b += STATS[i].net;
  return b;
}

const state = { month: "2026-09" };

/* ---------- tooltip ---------- */

const tip = $("#tooltip");
function showTip(html, x, y) {
  tip.innerHTML = html;
  tip.classList.add("show");
  const r = tip.getBoundingClientRect();
  let left = x + 14, top = y - r.height - 10;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (left < 8) left = 8;
  if (top < 8) top = y + 18;
  tip.style.left = left + "px";
  tip.style.top = top + "px";
}
function hideTip() { tip.classList.remove("show"); }
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest("[data-tip]")) hideTip();
}, true);

function bindTip(node, htmlFn) {
  node.setAttribute("data-tip", "1");
  node.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") showTip(htmlFn(), e.clientX, e.clientY); });
  node.addEventListener("pointermove", (e) => { if (e.pointerType !== "touch") showTip(htmlFn(), e.clientX, e.clientY); });
  node.addEventListener("pointerleave", hideTip);
  node.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") showTip(htmlFn(), e.clientX, e.clientY);
  });
  node.setAttribute("tabindex", "0");
  node.addEventListener("focus", () => {
    const r = node.getBoundingClientRect();
    showTip(htmlFn(), r.left + r.width / 2, r.top + 4);
  });
  node.addEventListener("blur", hideTip);
}

/* ---------- charts ---------- */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function tween(dur, delay, step) {
  if (reducedMotion.matches) { step(1); return; }
  const start = () => {
    const t0 = performance.now();
    const frame = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      step(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  if (delay) setTimeout(start, delay); else start();
}

function countUp(node, target, fmt, animate, delay) {
  if (!animate || reducedMotion.matches) { node.textContent = fmt(target); return; }
  node.textContent = fmt(0);
  tween(1100, delay || 0, (e) => { node.textContent = fmt(target * e); });
}

function niceTicks(max) {
  if (max <= 0) return { max: 10, step: 10, ticks: [0, 10] };
  const rough = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  return { max: top, step, ticks };
}

const css = getComputedStyle(document.documentElement);
const tok = (v) => css.getPropertyValue(v).trim();

function chartFont(svg) {
  svg.setAttribute("font-family", "-apple-system, system-ui, sans-serif");
}

function renderCategoryChart() {
  const box = $("#chart-category");
  const mi = MONTHS_IDX[state.month];
  const m = MONTHS[mi];
  const byCat = STATS[mi].byCat;
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  box.innerHTML = "";

  if (!entries.length) {
    box.appendChild(el("div", "chart-empty", "No spending recorded in " + m.full + "."));
    $("#chart-category-note").textContent = "";
    return;
  }

  const W = Math.max(300, box.clientWidth);
  const labelW = W < 460 ? 84 : 104;
  const valW = 64;
  const barH = 20, gap = 16, top = 6;
  const H = top + entries.length * (barH + gap) - gap + 26;
  const plotW = W - labelW - valW - 8;
  const total = entries.reduce((s, e) => s + e[1], 0);
  const { max, ticks } = niceTicks(entries[0][1]);

  const svg = sEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label":
    `Spending by category, ${m.full}. ` + entries.map((e) => `${CATEGORIES[e[0]].label} ${usd.format(e[1])}`).join(", ") + "." });
  chartFont(svg);

  ticks.forEach((t) => {
    const x = labelW + (t / max) * plotW;
    svg.appendChild(sEl("line", { x1: x, x2: x, y1: top, y2: H - 24, stroke: tok("--line"), "stroke-width": 1 }));
    const lab = sEl("text", { x: x, y: H - 8, "text-anchor": "middle", "font-size": 11, fill: tok("--muted") });
    lab.textContent = t === 0 ? "0" : compactMoney(t);
    svg.appendChild(lab);
  });

  entries.forEach(([cat, val], i) => {
    const y = top + i * (barH + gap);
    const g = sEl("g", {});

    const hit = sEl("rect", { x: 0, y: y - 6, width: W, height: barH + 12, fill: "transparent" });
    g.appendChild(hit);

    const name = sEl("text", { x: labelW - 10, y: y + barH - 5, "text-anchor": "end", "font-size": 12.5, "font-weight": 600, fill: tok("--ink") });
    name.textContent = CATEGORIES[cat].label;
    g.appendChild(name);

    const w = Math.max(2, (val / max) * plotW);
    g.appendChild(sEl("rect", { x: labelW, y: y, width: w, height: barH, rx: 5, fill: catColor(cat) }));

    const val2 = sEl("text", { x: labelW + w + 8, y: y + barH - 5, "font-size": 12, "font-weight": 650, fill: tok("--ink") });
    val2.textContent = usd0.format(val);
    g.appendChild(val2);

    bindTip(g, () =>
      `<div class="t-title">${CATEGORIES[cat].label}</div>` +
      `<div class="t-row"><span class="t-dot" style="background:${catColor(cat)}"></span>${usd.format(val)} · ${pct1(val / total)} of spending</div>`);
    svg.appendChild(g);
  });

  box.appendChild(svg);
  $("#chart-category-note").textContent = `${m.full} · ${usd.format(total)} total`;

  const tbl = $("#table-category");
  tbl.innerHTML = `<caption>Spending by category, ${m.full}</caption><tr><th>Category</th><th>Amount</th></tr>` +
    entries.map((e) => `<tr><td>${CATEGORIES[e[0]].label}</td><td>${usd.format(e[1])}</td></tr>`).join("");
}

function renderTrendChart() {
  const box = $("#chart-trend");
  const W = Math.max(300, box.clientWidth);
  const H = 260;
  box.innerHTML = "";
  const padL = 46, padR = 10, padT = 10, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxVal = Math.max(...STATS.map((s) => Math.max(s.income, s.spend)));
  const { max, ticks } = niceTicks(maxVal);

  const svg = sEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label":
    "Income versus spending per month over the last six months. " +
    MONTHS.map((m, i) => `${m.full}: income ${usd0.format(STATS[i].income)}, spending ${usd0.format(STATS[i].spend)}`).join("; ") + "." });
  chartFont(svg);

  ticks.forEach((t) => {
    const y = padT + plotH - (t / max) * plotH;
    svg.appendChild(sEl("line", { x1: padL, x2: W - padR, y1: y, y2: y, stroke: tok("--line"), "stroke-width": 1 }));
    const lab = sEl("text", { x: padL - 8, y: y + 4, "text-anchor": "end", "font-size": 11, fill: tok("--muted") });
    lab.textContent = compactMoney(t);
    svg.appendChild(lab);
  });
  svg.appendChild(sEl("line", { x1: padL, x2: W - padR, y1: padT + plotH, y2: padT + plotH, stroke: tok("--dash"), "stroke-width": 1.4 }));

  const n = MONTHS.length;
  const groupW = plotW / n;
  const barW = Math.min(20, groupW / 3.2);
  const incomeC = tok("--s-income"), spendC = tok("--s-spend");

  MONTHS.forEach((m, i) => {
    const cx = padL + groupW * i + groupW / 2;
    const selected = m.key === state.month;
    const g = sEl("g", { opacity: selected ? 1 : 0.55 });

    const pairs = [[-barW - 1.5, STATS[i].income, incomeC], [1.5, STATS[i].spend, spendC]];
    pairs.forEach(([off, v, color]) => {
      const h = Math.max(1, (v / max) * plotH);
      g.appendChild(sEl("rect", {
        x: cx + off, y: padT + plotH - h, width: barW, height: h,
        rx: 3, fill: color,
        stroke: selected ? tok("--ink") : "none", "stroke-opacity": selected ? 0.35 : 0, "stroke-width": 1,
      }));
    });

    if (selected) {
      g.appendChild(sEl("rect", { x: cx - groupW / 2 + 6, y: padT + plotH + 4, width: groupW - 12, height: 3, rx: 1.5, fill: tok("--accent") }));
    }

    const lab = sEl("text", { x: cx, y: H - 8, "text-anchor": "middle", "font-size": 11.5,
      "font-weight": selected ? 700 : 500, fill: selected ? tok("--ink") : tok("--muted") });
    lab.textContent = m.label + (m.partial ? "*" : "");
    g.appendChild(lab);

    const hit = sEl("rect", { x: cx - groupW / 2, y: padT, width: groupW, height: plotH + 12, fill: "transparent" });
    g.appendChild(hit);
    bindTip(g, () =>
      `<div class="t-title">${m.full}${m.partial ? " (through day " + m.partialThrough + ")" : ""}</div>` +
      `<div class="t-row"><span class="t-dot" style="background:${incomeC}"></span>Income ${usd.format(STATS[i].income)}</div>` +
      `<div class="t-row"><span class="t-dot" style="background:${spendC}"></span>Spending ${usd.format(STATS[i].spend)}</div>` +
      `<div class="t-row">Net ${STATS[i].net >= 0 ? "+" : MINUS}${usd.format(Math.abs(STATS[i].net))}</div>`);
    svg.appendChild(g);
  });

  box.appendChild(svg);
  $("#trend-legend .sw-income").style.background = incomeC;
  $("#trend-legend .sw-spend").style.background = spendC;

  const tbl = $("#table-trend");
  tbl.innerHTML = `<caption>Income versus spending, May to October 2026</caption><tr><th>Month</th><th>Income</th><th>Spending</th></tr>` +
    MONTHS.map((m, i) => `<tr><td>${m.full}</td><td>${usd.format(STATS[i].income)}</td><td>${usd.format(STATS[i].spend)}</td></tr>`).join("");
}

/* ---------- KPIs ---------- */

function deltaHTML(s, goodWhenUp) {
  if (s.dir === 0) return `<span class="delta flat">${s.text}</span>`;
  const good = goodWhenUp ? s.dir > 0 : s.dir < 0;
  const cls = good ? "good" : "bad";
  const arrow = s.dir > 0 ? icon("arrowUp", 13) : icon("arrowDown", 13);
  return `<span class="delta ${cls}">${arrow}${s.text}</span>`;
}

function renderKPIs(flash) {
  const mi = MONTHS_IDX[state.month];
  const m = MONTHS[mi];
  const s = STATS[mi];
  const prev = mi > 0 ? STATS[mi - 1] : null;
  const prevLabel = mi > 0 ? MONTHS[mi - 1].label : null;
  const rate = s.income > 0 ? (s.income - s.spend) / s.income : null;
  const prevRate = prev && prev.income > 0 ? (prev.income - prev.spend) / prev.income : null;

  const cards = [
    { cls: "balance", label: "Balance",
      value: usd.format(balanceAt(mi)),
      sub: `${PERSON.account} · ${m.partial ? "as of Oct " + m.partialThrough : "as of " + m.label + " " + m.days}`,
      delta: prev ? signed(balanceAt(mi) - balanceAt(mi - 1)) : null, goodUp: true },
    { cls: "income", label: "Income",
      value: usd.format(s.income),
      sub: `${s.incomeCount} deposit${s.incomeCount === 1 ? "" : "s"}`,
      delta: prev ? signed(s.income - prev.income) : null, goodUp: true },
    { cls: "spending", label: "Spending",
      value: usd.format(s.spend),
      sub: `${s.txCount} payments`,
      delta: prev ? signed(s.spend - prev.spend) : null, goodUp: false },
    { cls: "savings", label: "Savings rate",
      value: rate == null ? "—" : pct1(rate),
      sub: rate == null ? "no income this month" : "of income kept",
      delta: prev && prevRate != null && rate != null ? signed((rate - prevRate) * 100, { pp: true, eps: 0.05 }) : null, goodUp: true },
  ];

  const wrap = $("#kpis");
  wrap.innerHTML = "";
  for (const c of cards) {
    const stub = el("article", "stub " + c.cls);
    const body = el("div", "body");
    body.appendChild(el("div", "kpi-label", c.label));
    body.appendChild(el("div", "kpi-value", c.value));
    body.appendChild(el("div", "kpi-sub", c.sub));
    const tear = el("div", "tear");
    if (mi === 0) {
      tear.innerHTML = `<span class="vs">First month on record</span>`;
    } else {
      tear.innerHTML = `${deltaHTML(c.delta, c.goodUp)} <span class="vs">vs ${prevLabel}</span>`;
    }
    stub.appendChild(body);
    stub.appendChild(tear);
    if (flash) { stub.classList.add("flash"); stub.addEventListener("animationend", () => stub.classList.remove("flash"), { once: true }); }
    wrap.appendChild(stub);
  }

  $("#kpi-month").textContent = m.full;
  $("#kpi-partial").hidden = !m.partial;
}

/* ---------- transactions ---------- */

function renderTransactions() {
  const mi = MONTHS_IDX[state.month];
  const m = MONTHS[mi];
  const list = $("#tx-list");
  list.innerHTML = "";
  $("#tx-month").textContent = m.full;

  const rows = m.tx.slice().sort((a, b) => b.d - a.d);
  if (!rows.length) {
    list.appendChild(el("li", "", `<span class="chart-empty" style="grid-column:1/-1">No transactions in ${m.full}.</span>`));
    return;
  }
  for (const t of rows) {
    const cat = CATEGORIES[t.c];
    const li = el("li");
    const d = new Date(2026, mi, t.d);
    const wd = d.toLocaleDateString("en-US", { weekday: "short" });
    li.innerHTML =
      `<span class="tx-day">${wd}<b>${t.d}</b></span>` +
      `<span class="tx-ico" style="--cat:${catColor(t.c)}" aria-hidden="true">${icon(cat.icon, 17)}</span>` +
      `<span class="tx-name"><span class="m">${t.name}</span><span class="c">${cat.label}</span></span>` +
      `<span class="tx-amt ${t.a >= 0 ? "in" : "out"}">${t.a >= 0 ? "+" : MINUS}${usd.format(Math.abs(t.a))}</span>`;
    list.appendChild(li);
  }
}

/* ---------- budgets ---------- */

function renderBudgets() {
  const mi = MONTHS_IDX[state.month];
  const m = MONTHS[mi];
  $("#budget-month").textContent = m.full;
  const wrap = $("#budgets");
  wrap.innerHTML = "";

  const entries = Object.entries(BUDGETS).map(([cat, limit]) =>
    ({ cat, limit, spent: STATS[mi].byCat[cat] || 0 }));
  const barMax = Math.max(1, ...entries.map((e) => Math.max(e.spent, e.limit)));

  for (const e of entries) {
    const ratio = e.spent / e.limit;
    const stateCls = ratio > 1 ? "over" : ratio >= 0.8 ? "near" : "ok";
    const d = el("div", "bud " + stateCls);
    d.style.setProperty("--cat", catColor(e.cat));

    const fillPct = Math.min(1, ratio) * 100;
    const tickPct = (e.limit / barMax) * 100;
    const pctTxt = pct1(ratio);
    let status;
    if (ratio > 1) {
      status = `<span class="status over">${icon("warn", 13)} Over budget — ${pctTxt} · ${usd.format(e.spent - e.limit)} over</span>`;
    } else if (ratio >= 0.8) {
      status = `<span class="status near">${icon("warn", 13)} Near limit — ${pctTxt} · ${usd.format(e.limit - e.spent)} left</span>`;
    } else {
      status = `<span class="status ok">${pctTxt} used · ${usd.format(e.limit - e.spent)} left</span>`;
    }

    d.innerHTML =
      `<div class="row1"><span class="dot"></span><span class="cname">${CATEGORIES[e.cat].label}</span>` +
      `<span class="amounts">${usd0.format(e.spent)} of ${usd0.format(e.limit)}</span></div>` +
      `<div class="bar"><span class="fill" style="width:0%"></span>` +
      (barMax > e.limit * 1.15 ? `<span class="tick" style="left:${tickPct}%"></span>` : "") +
      `</div>${status}`;
    wrap.appendChild(d);
    requestAnimationFrame(() => { d.querySelector(".fill").style.width = fillPct + "%"; });

    bindTip(d.querySelector(".bar"), () =>
      `<div class="t-title">${CATEGORIES[e.cat].label} budget</div>` +
      `<div class="t-row"><span class="t-dot" style="background:${catColor(e.cat)}"></span>${usd.format(e.spent)} spent of ${usd.format(e.limit)}</div>`);
  }
}

/* ---------- month pass ---------- */

function setStamp() {
  const m = MONTHS[MONTHS_IDX[state.month]];
  const stamp = $("#stamp");
  stamp.textContent = "VALIDATED — " + m.label.toUpperCase() + " " + m.key.slice(0, 4);
}

/* ---------- render all ---------- */

function renderCharts() { renderCategoryChart(); renderTrendChart(); }

function renderAll(flash) {
  renderKPIs(flash);
  renderCharts();
  renderTransactions();
  renderBudgets();
  $("#sample-note").textContent = SAMPLE_NOTE;
}

function init() {
  const sel = $("#month-select");
  for (const m of MONTHS) sel.appendChild(new Option(m.full, m.key));
  sel.value = state.month;

  sel.addEventListener("change", () => {
    state.month = sel.value;
    setStamp();
    const stamp = $("#stamp");
    stamp.classList.remove("revalidate");
    void stamp.offsetWidth;
    stamp.classList.add("revalidate");
    hideTip();
    renderAll(true);
  });

  let raf = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(renderCharts);
  });
  ro.observe($("#chart-category"));
  ro.observe($("#chart-trend"));

  darkQ.addEventListener("change", () => { renderAll(false); });

  setStamp();
  renderAll(false);
}

document.addEventListener("DOMContentLoaded", init);
