"use strict";

(function () {
  const fmtMoney = (v) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  const fmtMoneyCents = (v) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
  const fmtPct = (v, digits = 1) => `${v.toFixed(digits)}%`;

  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const MONTH_SHORT = MONTH_NAMES.map((n) => n.slice(0, 3));

  function monthLabel(key) {
    const [y, mo] = key.split("-").map(Number);
    return `${MONTH_NAMES[mo - 1]} ${y}`;
  }
  function monthShort(key) {
    const [, mo] = key.split("-").map(Number);
    return MONTH_SHORT[mo - 1];
  }
  function fullDate(key, day) {
    const [y, mo] = key.split("-").map(Number);
    return new Date(y, mo - 1, day).toLocaleDateString("en-US",
      { weekday: "short", month: "short", day: "numeric" });
  }

  /* ---------- Aggregation ---------- */
  function totalsFor(key) {
    let income = 0, spending = 0;
    const byCategory = {};
    for (const t of TRANSACTIONS) {
      if (t.m !== key) continue;
      if (t.category === "Income") income += t.amount;
      else {
        spending += t.amount;
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      }
    }
    return { income, spending, byCategory, savingsRate: income > 0 ? ((income - spending) / income) * 100 : null };
  }

  /* Running balance: starting float plus every transaction up to the end of the month. */
  const STARTING_BALANCE = 8169.55;
  function balanceThrough(key) {
    let bal = STARTING_BALANCE;
    for (const t of TRANSACTIONS) {
      if (t.m > key) continue;
      bal += t.category === "Income" ? t.amount : -t.amount;
    }
    return bal;
  }

  /* ---------- Category icons (stroke SVG, inherits currentColor) ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.2V20h13V9.2"/><path d="M9.5 20v-5.5h5V20"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2.5 3.5h2.2l2.6 11.1a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L20.5 7H6"/>',
    car: '<path d="M4 16.5v-3l1.8-4.6A2 2 0 0 1 7.7 7.7h8.6a2 2 0 0 1 1.9 1.2L20 13.5v3"/><path d="M4 13.5h16"/><circle cx="7.5" cy="16.8" r="1.5"/><circle cx="16.5" cy="16.8" r="1.5"/>',
    play: '<rect x="3" y="4" width="18" height="13" rx="2.5"/><path d="M7 21h10"/><path d="m10.5 8 4 2.5-4 2.5z"/>',
    bag: '<path d="M6 8h12l1 12.5H5z"/><path d="M9 10.5V6.8a3 3 0 0 1 6 0v3.7"/>',
    heart: '<path d="M12 20.5S4 15.6 4 10.1C4 7 6.2 5 8.6 5c1.4 0 2.7.7 3.4 1.8A3.8 3.8 0 0 1 15.4 5C17.8 5 20 7 20 10.1c0 5.5-8 10.4-8 10.4z"/>',
    wallet: '<rect x="3" y="5.5" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="15.5" cy="14.7" r="1.3"/>',
    building: '<rect x="4.5" y="3.5" width="11" height="17" rx="1.5"/><path d="M15.5 9.5h3a1 1 0 0 1 1 1v10"/><path d="M8 7.5h4M8 11h4M8 14.5h4"/><path d="M3 20.5h18"/>',
  };
  const CATEGORY_ICON = {
    Housing: P.home, Food: P.cart, Transport: P.car,
    Entertainment: P.play, Shopping: P.bag, Health: P.heart, Income: P.wallet,
  };
  function iconSvg(path, size = 20) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
      `stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }

  /* ---------- Deltas ---------- */
  function deltaEl(node, curr, prev, opts) {
    const { invert = false, isPercentPoint = false, note } = opts || {};
    if (prev === null || prev === undefined) {
      node.dataset.dir = "flat";
      node.innerHTML = `<span class="delta-note">No prior month</span>`;
      return;
    }
    let pctText, good;
    if (isPercentPoint) {
      const diff = curr - prev;
      pctText = `${diff >= 0 ? "▲" : "▼"} ${fmtPct(Math.abs(diff), 1)} pts`;
      good = diff > 0 ? !invert : diff < 0 ? !invert : null;
    } else {
      if (prev === 0) {
        node.dataset.dir = "flat";
        node.innerHTML = `<span class="delta-note">No data last month</span>`;
        return;
      }
      const pct = ((curr - prev) / Math.abs(prev)) * 100;
      pctText = `${pct >= 0 ? "▲" : "▼"} ${fmtPct(Math.abs(pct), 1)}`;
      good = pct > 0 ? !invert : pct < 0 ? !invert : null;
    }
    node.dataset.dir = good === null ? "flat" : good ? "pos" : "neg";
    node.innerHTML = `<span>${pctText}</span><span class="delta-note">${note || "vs last month"}</span>`;
  }

  /* ---------- Rendering ---------- */
  const $ = (id) => document.getElementById(id);

  const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);

  function animateNumber(node, to, format, animate) {
    if (!animate || REDUCE_MOTION.matches) { node.textContent = format(to); return; }
    const from = Number(node.dataset.value || 0);
    const t0 = performance.now();
    (function frame(now) {
      const p = Math.min(1, (now - t0) / 500);
      node.textContent = format(from + (to - from) * easeOut(p));
      if (p < 1) requestAnimationFrame(frame);
      else node.dataset.value = String(to);
    })(t0);
  }

  function renderKpis(idx, animate) {
    const key = MONTH_KEYS[idx];
    const prevKey = idx > 0 ? MONTH_KEYS[idx - 1] : null;
    const t = totalsFor(key);
    const p = prevKey ? totalsFor(prevKey) : null;

    animateNumber($("kpiBalance"), balanceThrough(key), fmtMoney, animate);
    deltaEl($("kpiBalanceDelta"),
      balanceThrough(key), prevKey ? balanceThrough(prevKey) : null, {});

    animateNumber($("kpiIncome"), t.income, fmtMoney, animate);
    deltaEl($("kpiIncomeDelta"), t.income, p ? p.income : null, {});

    animateNumber($("kpiSpending"), t.spending, fmtMoney, animate);
    deltaEl($("kpiSpendingDelta"), t.spending, p ? p.spending : null, { invert: true });

    const srNode = $("kpiSavings");
    if (t.savingsRate === null) srNode.textContent = "—";
    else animateNumber(srNode, t.savingsRate, (v) => fmtPct(v, 0), animate);
    deltaEl($("kpiSavingsDelta"), t.savingsRate, p ? p.savingsRate : null,
      { isPercentPoint: true });
  }

  function renderCategoryChart(idx) {
    const key = MONTH_KEYS[idx];
    const t = totalsFor(key);
    const entries = Object.entries(t.byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value, color: CATEGORIES[label].color }));

    $("categorySub").textContent = `${monthLabel(key)} · ${fmtMoney(t.spending)} total`;
    Charts.categoryBars($("categoryChartHost"), {
      data: entries,
      valueFmt: fmtMoney,
      tooltipTitle: `Spending by category, ${monthLabel(key)}`,
      percentFmt: (v) => fmtPct(t.spending > 0 ? (v / t.spending) * 100 : 0, 1) + " of spend",
      ariaLabel: "",
    });
  }

  function renderTrendChart() {
    Charts.incomeVsSpending($("trendChartHost"), {
      months: MONTH_KEYS,
      series: [
        { name: "Income", color: "var(--series-income)", values: Object.fromEntries(MONTH_KEYS.map((k) => [k, totalsFor(k).income])) },
        { name: "Spending", color: "var(--series-spending)", values: Object.fromEntries(MONTH_KEYS.map((k) => [k, totalsFor(k).spending])) },
      ],
      valueFmt: fmtMoney,
      ariaLabel: "",
    });
  }

  function renderTransactions(idx) {
    const key = MONTH_KEYS[idx];
    const all = TRANSACTIONS
      .filter((t) => t.m === key)
      .slice()
      .sort((a, b) => (b.d - a.d) || (b.amount - a.amount));
    const monthTxCount = all.length;
    const list = all.slice(0, 8);

    $("txSub").textContent = `${monthLabel(key)} · ${list.length} of ${monthTxCount} latest`;
    const ul = $("txList");
    ul.replaceChildren();
    for (const t of list) {
      const li = document.createElement("li");
      li.className = "tx-item";
      const color = t.category === "Income" ? "var(--pos)" : CATEGORIES[t.category].color;
      li.innerHTML =
        `<span class="tx-icon" style="--txc:${color}" aria-hidden="true">${iconSvg(CATEGORY_ICON[t.category])}</span>` +
        `<div class="tx-main"><div class="tx-merchant">${t.merchant}</div>` +
        `<div class="tx-meta">${fullDate(t.m, t.d)} · ${t.category}</div></div>` +
        `<div class="tx-amount num ${t.category === "Income" ? "is-income" : ""}">${fmtMoneyCents(t.amount)}</div>`;
      li.setAttribute("aria-label",
        `${t.merchant}, ${t.category}, ${fullDate(t.m, t.d)}, ${t.category === "Income" ? "income" : "spending"} of ${fmtMoneyCents(t.amount)}`);
      ul.appendChild(li);
    }
  }

  function renderBudgets(idx) {
    const key = MONTH_KEYS[idx];
    const t = totalsFor(key);
    $("budgetSub").textContent = `${monthLabel(key)} · spend vs monthly budget`;

    const rows = Object.keys(BUDGETS).map((cat) => {
      const spent = t.byCategory[cat] || 0;
      const budget = BUDGETS[cat];
      const ratio = budget > 0 ? spent / budget : 0;
      const state = ratio > 1 ? "over" : ratio >= 0.8 ? "near" : "ok";
      return { cat, spent, budget, ratio, state };
    });

    const ul = $("budgetList");
    ul.replaceChildren();
    for (const r of rows) {
      const li = document.createElement("li");
      li.className = "budget-item";
      li.dataset.state = r.state;
      li.style.setProperty("--cat", CATEGORIES[r.cat].color);

      const stateText =
        r.state === "over" ? `Over by ${fmtMoney(r.spent - r.budget)}` :
        r.state === "near" ? `${fmtMoney(r.budget - r.spent)} left · nearing limit` :
        `${fmtMoney(r.budget - r.spent)} left`;
      const stateIcon =
        r.state === "ok" ? "" :
        iconSvg(r.state === "over"
          ? '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.3" r=".4" fill="currentColor"/>'
          : '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V13"/><circle cx="12" cy="16.3" r=".4" fill="currentColor"/>', 13);

      li.innerHTML =
        `<div class="budget-top"><span class="budget-name">${r.cat}</span>` +
        `<span class="budget-values"><strong>${fmtMoney(r.spent)}</strong> / ${fmtMoney(r.budget)}</span></div>` +
        `<div class="budget-track" role="progressbar" aria-valuenow="${Math.round(r.ratio * 100)}" ` +
        `aria-valuemin="0" aria-valuemax="100" aria-label="${r.cat} budget usage">` +
        `<div class="budget-bar" style="width:${Math.min(100, r.ratio * 100).toFixed(1)}%"></div></div>` +
        `<div class="budget-foot"><span class="num">${fmtPct(r.ratio * 100, 0)} of budget</span>` +
        `<span class="budget-state">${stateIcon}${stateText}</span></div>`;
      ul.appendChild(li);
    }
  }

  function render(idx, animate) {
    renderKpis(idx, animate);
    renderCategoryChart(idx);
    renderTrendChart();
    renderTransactions(idx);
    renderBudgets(idx);
    $("liveStatus").textContent = `Viewing ${monthLabel(MONTH_KEYS[idx])}.`;
  }

  /* ---------- Month selector ---------- */
  const select = $("monthSelect");
  MONTH_KEYS.forEach((k, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = monthLabel(k);
    select.appendChild(opt);
  });
  const initial = MONTH_KEYS.length - 1;
  select.value = String(initial);
  select.addEventListener("change", () => {
    const main = $("main");
    const reduced = REDUCE_MOTION.matches;
    if (!reduced) { main.classList.remove("fade-in"); void main.offsetWidth; main.classList.add("fade-in"); }
    render(Number(select.value), true);
  });

  /* ---------- Theme toggle (defaults to system setting) ---------- */
  const themeBtn = $("themeToggle");
  function isDark() {
    return document.documentElement.classList.contains("dark") ||
      (!document.documentElement.classList.contains("light") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function syncThemeBtn() {
    themeBtn.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
    themeBtn.setAttribute("title", isDark() ? "Switch to light theme" : "Switch to dark theme");
  }
  themeBtn.addEventListener("click", () => {
    const root = document.documentElement;
    root.classList.toggle("dark", !isDark());
    root.classList.toggle("light", isDark());
    try { localStorage.setItem("ledgerly-theme", isDark() ? "dark" : "light"); } catch (e) {}
    syncThemeBtn();
  });
  syncThemeBtn();

  render(initial, true);
})();
