const path = require("path");
const fs = require("fs");

function loadPlaywright() {
  try { return require("playwright"); } catch (e) { /* fall through */ }
  const { execSync } = require("child_process");
  const dir = execSync("find " + path.join(process.env.HOME, ".npm/_npx") + " -maxdepth 3 -name playwright -type d", { encoding: "utf8" })
    .trim().split("\n")[0];
  return require(path.join(dir, "index.js"));
}
const { chromium } = loadPlaywright();

const ROOT = __dirname;
const PAGE = "file://" + path.join(ROOT, "index.html");
const SHOTS = path.join(ROOT, ".artifacts");

const EXPECT_SPEND = { 0: 3448.16, 1: 3706.96, 2: 3809.48, 3: 3994.36, 4: 4011.32, 5: 3875.96 };
const EXPECT_INC = [5680, 6380, 6280, 5680, 5680, 6180];
const EXPECT_COUNTS = "38,41,41,42,43,43";
const EXPECT_NET = EXPECT_INC.map((v, i) => v - EXPECT_SPEND[i]);
const EXPECT_BAL = EXPECT_NET.reduce((a, v) => (a.push((a.length ? a[a.length - 1] : 0) + v), a), []);

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log("PASS:", name);
  else { failures++; console.log("FAIL:", name, extra !== undefined ? JSON.stringify(extra) : ""); }
}
const usd = v => "$" + Math.round(v).toLocaleString("en-US");

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(PAGE);
  await page.waitForSelector(".slice");

  const data = await page.evaluate(() => {
    const F = window.__FINANCE__;
    return {
      perMonth: F.MONTHS.map((_, i) => F.allTotals()[i]),
      months: F.MONTHS.map((m, i) => F.monthLabel(i)),
      counts: F.MONTHS.map((_, i) => F.TXNS.filter(t => t.month === i).length)
    };
  });

  data.perMonth.forEach((x, i) => {
    check("income " + data.months[i], Math.abs(x.total.income - EXPECT_INC[i]) < 0.01, x.total.income);
    check("spending " + data.months[i], Math.abs(x.total.spending - EXPECT_SPEND[i]) < 0.01, x.total.spending);
    check("net " + data.months[i], Math.abs(x.net - EXPECT_NET[i]) < 0.01, x.net);
  });
  check("no duplicate transactions", data.counts.join(",") === EXPECT_COUNTS, data.counts);

  const kpis = await page.$$eval(".kpi", els => els.map(e => ({
    label: e.querySelector(".kpi-label").textContent,
    value: e.querySelector(".kpi-value").textContent,
    delta: e.querySelector(".delta") ? e.querySelector(".delta").textContent.trim() : null,
    spark: !!e.querySelector(".spark polyline")
  })));
  check("4 KPI cards", kpis.length === 4, kpis.map(k => k.label));
  check("balance KPI", kpis[0].value === usd(EXPECT_BAL[5]), kpis[0].value);
  check("income KPI", kpis[1].value === "$6,180", kpis[1].value);
  check("spending KPI", kpis[2].value === "$3,876", kpis[2].value);
  check("savings rate KPI", kpis[3].value === "37.3%", kpis[3].value);
  check("all KPIs show MoM delta", kpis.every(k => k.delta && k.delta.includes("vs last month")), kpis.map(k => k.delta));
  check("all KPIs have sparklines", kpis.every(k => k.spark));

  check("month label Sep", (await page.textContent("#monthBtn")).includes("September 2026"));
  check("next disabled at Sep", await page.$eval("#next", b => b.disabled));
  await page.click("#prev");
  check("Aug after prev", (await page.textContent("#monthBtn")).includes("August 2026"));
  const augKpi = await page.$eval(".kpi:nth-child(1) .kpi-value", e => e.textContent);
  check("Aug balance", augKpi === usd(EXPECT_BAL[4]), augKpi);
  await page.click("#prev"); await page.click("#prev"); await page.click("#prev"); await page.click("#prev");
  check("prev disabled at Apr", await page.$eval("#prev", b => b.disabled));

  await page.click("#next"); await page.click("#next"); await page.click("#next"); await page.click("#next");
  const slices = await page.$$eval(".slice", els => els.map(e => e.getAttribute("data-cat")));
  check("donut has 7 categories", slices.length === 7, slices);
  const bars = await page.$$eval(".bar-group", els => els.length);
  check("bar chart has 6 months", bars === 6, bars);
  const ticks = await page.$$eval(".tick-label", els => els.map(e => e.textContent));
  check("bar y tick $0", ticks.includes("$0"), ticks);
  check("bar month labels", ["Apr", "May", "Jun", "Jul", "Aug", "Sep"].every(m => ticks.includes(m)), ticks);

  await page.$eval(".slice[data-cat='housing']", s => {
    s.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, cancelable: true, clientX: 300, clientY: 400 }));
  });
  await page.waitForTimeout(200);
  const ttShown = await page.$eval("#tip", e => e.classList.contains("show"));
  const tt = await page.textContent("#tip");
  check("donut tooltip shows value", ttShown && /\$\d/.test(tt), JSON.stringify(tt));

  await page.$eval(".bar-group .hit", h => {
    h.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, cancelable: true, clientX: 400, clientY: 400 }));
  });
  await page.waitForTimeout(200);
  const ttShown2 = await page.$eval("#tip", e => e.classList.contains("show"));
  const tt2 = await page.textContent("#tip");
  check("bar tooltip income+spending", ttShown2 && tt2.includes("Income") && tt2.includes("Spending"), tt2);

  const txns = await page.$$eval(".txn", els => els.map(e => ({
    icon: !!e.querySelector(".txn-ic svg path"),
    desc: e.querySelector(".txn-desc").textContent,
    amt: e.querySelector(".txn-amt").textContent,
    inc: e.querySelector(".txn-amt").classList.contains("inc")
  })));
  check("8 transactions", txns.length === 8, txns.length);
  check("txn icons rendered", txns.every(t => t.icon));
  check("income txn shows +", txns.some(t => t.inc && t.amt.startsWith("+")));
  check("spending txn shows minus glyph", txns.some(t => !t.inc && t.amt.startsWith("−") && !t.amt.includes("-")), txns.map(t => t.amt));

  const budgets = await page.$$eval(".budget-row", els => els.map(e => ({
    state: e.className.replace("budget-row ", "").trim(),
    vals: e.querySelector(".budget-vals").textContent,
    fill: e.querySelector(".bar-fill").getAttribute("style"),
    status: e.querySelector(".status").textContent
  })));
  check("6 budget rows", budgets.length === 6, budgets.length);
  check("ok/warn/over states present",
    budgets.some(b => b.state === "ok") && budgets.some(b => b.state === "warn") && budgets.some(b => b.state === "over"),
    budgets.map(b => b.state));
  check("over bars full width", budgets.filter(b => b.state === "over").every(b => b.fill.includes("width:100.0%")));
  check("over status text", budgets.filter(b => b.state === "over").every(b => b.status.startsWith("Over by")));

  check("no page errors", errors.length === 0, errors);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => {
    const t = document.getElementById("tip");
    t.classList.remove("show");
    t.style.left = "0px";
    t.style.top = "0px";
  });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("no horizontal scroll at 375px", overflow <= 0, overflow);
  const kpiCols = await page.$eval("#kpis", el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  check("KPIs single column at 375px", kpiCols === 1, kpiCols);
  await page.screenshot({ path: path.join(SHOTS, "mobile-light.png"), fullPage: true });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: path.join(SHOTS, "desktop-light.png"), fullPage: true });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(200);
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check("dark mode bg applied", darkBg === "rgb(11, 14, 20)", darkBg);
  await page.screenshot({ path: path.join(SHOTS, "desktop-dark.png"), fullPage: true });

  await browser.close();
  console.log(failures === 0 ? "ALL CHECKS PASS" : failures + " CHECK(S) FAILED");
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error("HARNESS ERROR:", e); process.exit(2); });
