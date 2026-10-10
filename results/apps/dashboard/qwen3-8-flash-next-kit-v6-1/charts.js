"use strict";

/* Tiny SVG chart helpers: no dependencies, hover + keyboard tooltips. */
window.Charts = (function () {
  const SVGNS = "http://www.w3.org/2000/svg";
  const tooltip = document.getElementById("chartTooltip");
  let activeHost = null;
  let hideTimer = null;

  function el(name, attrs, parent) {
    const node = document.createElementNS(SVGNS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function text(parent, x, y, str, opts = {}) {
    const t = el("text", {
      x, y,
      "text-anchor": opts.anchor || "start",
      "font-size": opts.size || 11,
      "font-weight": opts.weight || 500,
      fill: opts.fill || "var(--text-muted)",
    }, parent);
    if (opts.num) t.setAttribute("class", "num");
    t.textContent = str;
    return t;
  }

  function showTooltip(host, html, clientX, clientY) {
    activeHost = host;
    clearTimeout(hideTimer);
    tooltip.innerHTML = html;
    tooltip.hidden = false;
    const pad = 14;
    const r = tooltip.getBoundingClientRect();
    let x = clientX + pad;
    let y = clientY + pad;
    if (x + r.width > window.innerWidth - 8) x = clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = clientY - r.height - pad;
    tooltip.style.left = Math.max(8, x) + "px";
    tooltip.style.top = Math.max(8, y) + "px";
  }

  function hideTooltip() {
    activeHost = null;
    tooltip.hidden = true;
  }

  function hideSoon() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideTooltip, 60);
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function animateBar(rect, finalW, delay) {
    if (reduceMotion.matches) { rect.setAttribute("width", finalW); return; }
    rect.setAttribute("width", 0);
    const t0 = performance.now() + delay;
    const ease = (p) => 1 - Math.pow(1 - p, 3);
    (function frame(now) {
      const p = Math.min(1, Math.max(0, (now - t0) / 500));
      rect.setAttribute("width", (finalW * ease(p)).toFixed(2));
      if (p < 1) requestAnimationFrame(frame);
    })(performance.now());
  }

  function animateColumn(rect, finalY, finalH, delay) {
    const base = finalY + finalH;
    if (reduceMotion.matches) { rect.setAttribute("y", finalY); rect.setAttribute("height", finalH); return; }
    rect.setAttribute("y", base);
    rect.setAttribute("height", 0);
    const t0 = performance.now() + delay;
    const ease = (p) => 1 - Math.pow(1 - p, 3);
    (function frame(now) {
      const p = Math.min(1, Math.max(0, (now - t0) / 500));
      const e = ease(p);
      rect.setAttribute("height", (finalH * e).toFixed(2));
      rect.setAttribute("y", (base - finalH * e).toFixed(2));
      if (p < 1) requestAnimationFrame(frame);
    })(performance.now());
  }

  document.addEventListener("pointerdown", hideTooltip);
  window.addEventListener("scroll", hideTooltip, { passive: true });
  tooltip.addEventListener("pointerenter", () => clearTimeout(hideTimer));
  tooltip.addEventListener("pointerleave", hideSoon);

  function hitArea(svg, x, y, w, h, target, handlers) {
    const rect = el("rect", {
      x, y, width: Math.max(1, w), height: Math.max(1, h),
      fill: "var(--text)", "fill-opacity": "0", tabindex: "0", role: "button",
      "aria-label": target.getAttribute("aria-label") || "",
    }, svg);
    rect.style.cursor = "pointer";
    rect.style.outline = "none";
    const on = () => { keep(); rect.setAttribute("fill-opacity", "0.04"); };
    const off = () => rect.setAttribute("fill-opacity", "0");
    const keep = () => clearTimeout(hideTimer);
    const fire = (evt) => { on(); handlers.show(evt.clientX, evt.clientY); };
    rect.addEventListener("pointerenter", fire);
    rect.addEventListener("pointermove", fire);
    rect.addEventListener("pointerleave", () => { off(); hideSoon(); });
    rect.addEventListener("focus", () => {
      on();
      const r = target.getBoundingClientRect();
      handlers.show(r.left + r.width / 2, r.top);
    });
    rect.addEventListener("blur", () => { off(); hideTooltip(); });
    return rect;
  }

  function tooltipRow(swatchVar, label, value) {
    return `<div class="tt-row"><span class="tt-label">` +
      `<span class="tt-swatch" style="background:${swatchVar}"></span>${label}</span>` +
      `<span class="tt-value">${value}</span></div>`;
  }

  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  function monthFull(key) {
    const [y, mo] = key.split("-").map(Number);
    return `${MONTH_NAMES[mo - 1]} ${y}`;
  }

  const compactFmt = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    notation: "compact", maximumFractionDigits: 1,
  }).format;

  /* ---------- Horizontal bar chart ---------- */
  function categoryBars(host, config) {
    const { data, valueFmt, tooltipTitle, percentFmt } = config;
    host.replaceChildren();
    const W = 480;
    const labelW = 104;
    const valueW = 64;
    const rowH = 40;
    const chartX = labelW;
    const chartW = W - labelW - valueW - 8;
    const H = data.length * rowH + 4;

    const svg = el("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": config.ariaLabel,
      preserveAspectRatio: "xMidYMid meet",
    });
    host.appendChild(svg);

    const max = Math.max(...data.map((d) => d.value), 1);

    data.forEach((d, i) => {
      const y = i * rowH + 10;
      const barH = 14;
      const cy = y + barH / 2;

      text(svg, 0, cy + 4, d.label, { size: 12, weight: 600, fill: "var(--text)" });

      el("rect", {
        x: chartX, y: cy - barH / 2, width: chartW, height: barH,
        rx: barH / 2, fill: "var(--surface-2)",
      }, svg);

      const w = Math.max(3, (d.value / max) * chartW);
      const bar = el("rect", {
        x: chartX, y: cy - barH / 2, width: w, height: barH,
        rx: barH / 2, fill: d.color, "aria-hidden": "true",
      }, svg);
      animateBar(bar, w, i * 45);

      text(svg, chartX + chartW + 8, cy + 4, valueFmt(d.value),
        { size: 12, weight: 600, fill: "var(--text)", num: true });

      const label = `${d.label}: ${valueFmt(d.value)}`;
      bar.setAttribute("aria-label", label);
      const ttPct = percentFmt ? ` · ${percentFmt(d.value)}` : "";
      hitArea(svg, 0, y - 4, W, rowH - 4, bar, {
        show: (cx, cyy) => showTooltip(host, tooltipRow(d.color, d.label, valueFmt(d.value) + ttPct), cx, cyy),
      });
    });

    const total = data.reduce((s, d) => s + d.value, 0);
    svg.setAttribute("aria-label",
      `${tooltipTitle}. Total ${valueFmt(total)}. ` +
      data.map((d) => `${d.label} ${valueFmt(d.value)}`).join(", "));
  }

  /* ---------- Grouped column chart ---------- */
  function incomeVsSpending(host, config) {
    const { months, series, valueFmt } = config;
    host.replaceChildren();
    const W = 680;
    const H = 300;
    const m = { top: 18, right: 14, bottom: 40, left: 64 };
    const innerW = W - m.left - m.right;
    const innerH = H - m.top - m.bottom;

    const svg = el("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": config.ariaLabel,
      preserveAspectRatio: "xMidYMid meet",
    });
    host.appendChild(svg);

    const maxVal = Math.max(...months.flatMap((mo) => series.map((s) => s.values[mo])));
    const step = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const niceStep = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((f) => f * step >= maxVal / 5) * step;
    const yMax = Math.ceil(maxVal / niceStep) * niceStep;
    const y = (v) => m.top + innerH - (v / yMax) * innerH;

    for (let v = 0; v <= yMax; v += niceStep) {
      const gy = y(v);
      el("line", {
        x1: m.left, x2: W - m.right, y1: gy, y2: gy,
        stroke: "var(--grid)", "stroke-width": 1,
        "stroke-dasharray": v === 0 ? "none" : "3 4",
      }, svg);
      text(svg, m.left - 10, gy + 4, compactFmt(v), { anchor: "end", size: 11, num: true });
    }

    const groupW = innerW / months.length;
    const barW = Math.min(22, groupW * 0.28);
    const gap = 6;

    months.forEach((mo, i) => {
      const cx = m.left + groupW * i + groupW / 2;
      series.forEach((s, j) => {
        const offset = (j - (series.length - 1) / 2) * (barW + gap);
        const bx = cx + offset - barW / 2;
        const v = s.values[mo];
        const by = y(v);
        const rect = el("rect", {
          x: bx, y: by, width: barW, height: m.top + innerH - by,
          rx: 5, fill: s.color, "aria-hidden": "true",
        }, svg);
        animateColumn(rect, by, m.top + innerH - by, i * 45 + j * 45);
      });
      text(svg, cx, H - m.bottom + 22, months[i], { anchor: "middle", size: 12, num: true });
    });

    months.forEach((mo, i) => {
      const x0 = m.left + groupW * i;
      const title = monthFull(mo);
      const rows = series
        .map((s) => tooltipRow(s.color, s.name, valueFmt(s.values[mo])))
        .join("");
      hitArea(svg, x0, m.top, groupW, innerH, svg, {
        show: (cx, cy) => showTooltip(host, `<div class="tt-title">${title}</div>${rows}`, cx, cy),
      });
    });
  }

  return { categoryBars, incomeVsSpending };
})();
