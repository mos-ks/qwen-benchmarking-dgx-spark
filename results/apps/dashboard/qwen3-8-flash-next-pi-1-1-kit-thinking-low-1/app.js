/* Ledgerline — personal finance dashboard.
   All figures are synthetic sample data for one person (last six months).
   Swap TX (and BUDGETS / SAVINGS) for your own exports. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ data */

  var OPENING = { checking: 5812.44, savings: 9200 };

  var MONTHS = [
    { id: '2026-05', label: 'May',   long: 'May 2026',      days: 31, through: null, savings: 9610 },
    { id: '2026-06', label: 'Jun',   long: 'June 2026',     days: 30, through: null, savings: 10340 },
    { id: '2026-07', label: 'Jul',   long: 'July 2026',     days: 31, through: null, savings: 10362 },
    { id: '2026-08', label: 'Aug',   long: 'August 2026',   days: 31, through: null, savings: 11420 },
    { id: '2026-09', label: 'Sep',   long: 'September 2026',days: 30, through: null, savings: 11860 },
    { id: '2026-10', label: 'Oct',   long: 'October 2026',  days: 31, through: 10,   savings: 12480 }
  ];

  var CATS = {
    housing:       { name: 'Housing',       icon: 'ic-home',     color: '--c1', kind: 'out' },
    groceries:     { name: 'Groceries',     icon: 'ic-basket',   color: '--c2', kind: 'out' },
    dining:        { name: 'Dining',        icon: 'ic-dining',   color: '--c3', kind: 'out' },
    transport:     { name: 'Transport',     icon: 'ic-car',      color: '--c4', kind: 'out' },
    utilities:     { name: 'Utilities',     icon: 'ic-bolt',     color: '--c5', kind: 'out' },
    subscriptions: { name: 'Subscriptions', icon: 'ic-ticket',   color: '--c6', kind: 'out' },
    health:        { name: 'Health',        icon: 'ic-heart',    color: '--c7', kind: 'out' },
    shopping:      { name: 'Shopping',      icon: 'ic-bag',      color: '--c8', kind: 'out' },
    travel:        { name: 'Travel',        icon: 'ic-plane',    color: '--c9', kind: 'out' },
    salary:        { name: 'Salary',        icon: 'ic-payroll',  color: '--income', kind: 'in' },
    freelance:     { name: 'Freelance',     icon: 'ic-laptop',   color: '--income', kind: 'in' },
    interest:      { name: 'Interest',      icon: 'ic-percent',  color: '--income', kind: 'in' }
  };

  var BUDGETS = {
    housing: 1450, groceries: 460, dining: 260, transport: 210,
    utilities: 175, subscriptions: 65, health: 150, shopping: 180
  };
  var BUDGET_ORDER = ['housing', 'groceries', 'dining', 'transport', 'utilities', 'subscriptions', 'health', 'shopping'];

  var CHECKING = 'Everyday Checking';
  var SAVINGS = 'High-Yield Savings';
  var CARD = 'Visa \u00b7 4821';

  function t(date, merchant, cat, amount, account) {
    return { date: date, merchant: merchant, cat: cat, amount: amount, account: account || CHECKING };
  }

  var TX = [
    /* ---- May 2026 ---- */
    t('2026-05-01', 'Payroll \u2014 Northwind Studio', 'salary', 3850, CHECKING),
    t('2026-05-01', 'Rent \u2014 Maple St, Unit 4B', 'housing', -1450, CHECKING),
    t('2026-05-02', "Trader Joe's", 'groceries', -86.40, CARD),
    t('2026-05-04', 'Spotify Premium', 'subscriptions', -11.99, CARD),
    t('2026-05-05', 'Xcel Energy \u2014 electric', 'utilities', -118.60, CHECKING),
    t('2026-05-07', 'Metro Transit \u2014 monthly pass', 'transport', -78, CHECKING),
    t('2026-05-08', 'Blue Bottle Coffee', 'dining', -6.85, CARD),
    t('2026-05-09', 'Corner Grocer', 'groceries', -124.15, CARD),
    t('2026-05-11', 'Netflix', 'subscriptions', -17.99, CARD),
    t('2026-05-12', 'Limoncello \u2014 dinner', 'dining', -78.40, CHECKING),
    t('2026-05-14', 'Shell \u2014 fuel', 'transport', -52.30, CARD),
    t('2026-05-16', 'Riverside Gym', 'health', -39, CHECKING),
    t('2026-05-17', 'The Times \u2014 subscription', 'subscriptions', -8, CARD),
    t('2026-05-18', 'Brooks \u2014 running shoes', 'shopping', -138, CARD),
    t('2026-05-19', 'Corner Grocer', 'groceries', -61.20, CARD),
    t('2026-05-21', 'Clearview Dental \u2014 cleaning', 'health', -185, CHECKING),
    t('2026-05-24', 'Halden Books', 'shopping', -42.60, CARD),
    t('2026-05-26', 'Corner Grocer', 'groceries', -98.75, CARD),
    t('2026-05-28', 'Versa Network \u2014 internet', 'utilities', -58, CHECKING),
    t('2026-05-30', 'Dinner with Sam \u2014 Willow Caf\u00e9', 'dining', -46.20, CHECKING),
    t('2026-05-30', 'Fairweather \u2014 rain jacket', 'shopping', -164, CARD),
    t('2026-05-31', 'Bellwether Auto \u2014 brake service', 'transport', -236, CHECKING),
    t('2026-05-31', 'Savings interest', 'interest', 11.20, SAVINGS),

    /* ---- June 2026 ---- */
    t('2026-06-01', 'Payroll \u2014 Northwind Studio', 'salary', 3850, CHECKING),
    t('2026-06-01', 'Rent \u2014 Maple St, Unit 4B', 'housing', -1450, CHECKING),
    t('2026-06-02', 'Corner Grocer', 'groceries', -92.30, CARD),
    t('2026-06-03', 'Vermut \u2014 tapas', 'dining', -64.80, CARD),
    t('2026-06-05', 'Xcel Energy \u2014 electric', 'utilities', -104.20, CHECKING),
    t('2026-06-07', 'Metro Transit \u2014 monthly pass', 'transport', -78, CHECKING),
    t('2026-06-08', 'Shell \u2014 fuel', 'transport', -48.90, CARD),
    t('2026-06-09', 'Spotify Premium', 'subscriptions', -11.99, CARD),
    t('2026-06-10', "Trader Joe's", 'groceries', -73.45, CARD),
    t('2026-06-12', 'Netflix', 'subscriptions', -17.99, CARD),
    t('2026-06-15', 'Cloudworks \u2014 dashboard project', 'freelance', 900, CHECKING),
    t('2026-06-16', 'Riverside Gym', 'health', -39, CHECKING),
    t('2026-06-18', 'Cadence Cycles \u2014 tune-up', 'transport', -95, CHECKING),
    t('2026-06-19', 'Corner Grocer', 'groceries', -110.20, CARD),
    t('2026-06-20', 'Air Lisbon \u2014 round trip', 'travel', -498, CARD),
    t('2026-06-21', 'The Times \u2014 subscription', 'subscriptions', -8, CARD),
    t('2026-06-22', 'GreenLeaf Pharmacy', 'health', -58, CARD),
    t('2026-06-24', 'Halden Home \u2014 desk lamp', 'shopping', -74.90, CARD),
    t('2026-06-24', "Trader Joe's", 'groceries', -58.05, CARD),
    t('2026-06-26', 'Salt & Ember \u2014 dinner', 'dining', -92.60, CARD),
    t('2026-06-27', 'Corner Grocer', 'groceries', -68.80, CARD),
    t('2026-06-28', 'Versa Network \u2014 internet', 'utilities', -58, CHECKING),
    t('2026-06-29', 'Field Notes Coffee', 'dining', -14.20, CARD),
    t('2026-06-30', 'Savings interest', 'interest', 12.10, SAVINGS),

    /* ---- July 2026 ---- */
    t('2026-07-01', 'Payroll \u2014 Northwind Studio', 'salary', 3850, CHECKING),
    t('2026-07-01', 'Rent \u2014 Maple St, Unit 4B', 'housing', -1450, CHECKING),
    t('2026-07-02', 'Corner Grocer', 'groceries', -104.60, CARD),
    t('2026-07-03', 'Casa Tejo \u2014 three nights', 'travel', -612, CARD),
    t('2026-07-05', 'Xcel Energy \u2014 electric', 'utilities', -132.40, CHECKING),
    t('2026-07-05', 'Metro Transit \u2014 monthly pass', 'transport', -78, CHECKING),
    t('2026-07-07', 'Time Out Market \u2014 Lisbon', 'dining', -128.40, CARD),
    t('2026-07-08', 'Alfa Pendular \u2014 Porto train', 'travel', -46, CARD),
    t('2026-07-10', 'Spotify Premium', 'subscriptions', -11.99, CARD),
    t('2026-07-12', 'Meridian \u2014 travel insurance', 'travel', -34, CARD),
    t('2026-07-14', 'Corner Grocer', 'groceries', -88.30, CARD),
    t('2026-07-15', 'Riverside Gym', 'health', -39, CHECKING),
    t('2026-07-16', 'Shell \u2014 fuel', 'transport', -55.80, CARD),
    t('2026-07-18', 'Netflix', 'subscriptions', -17.99, CARD),
    t('2026-07-19', 'Maple St co-op \u2014 roof share', 'housing', -420, CHECKING),
    t('2026-07-21', 'The Times \u2014 subscription', 'subscriptions', -8, CARD),
    t('2026-07-22', 'Alder Health \u2014 physiotherapy', 'health', -140, CHECKING),
    t('2026-07-24', 'Mercado da Ribeira \u2014 gifts', 'shopping', -86.40, CARD),
    t('2026-07-26', "Trader Joe's", 'groceries', -79.60, CARD),
    t('2026-07-27', 'Bellwether Auto \u2014 transmission', 'transport', -540, CHECKING),
    t('2026-07-28', 'Versa Network \u2014 internet', 'utilities', -58, CHECKING),
    t('2026-07-29', 'Salt & Ember \u2014 dinner', 'dining', -68.40, CARD),
    t('2026-07-31', 'Savings interest', 'interest', 12.60, SAVINGS),

    /* ---- August 2026 ---- */
    t('2026-08-01', 'Payroll \u2014 Northwind Studio', 'salary', 3850, CHECKING),
    t('2026-08-01', 'Rent \u2014 Maple St, Unit 4B', 'housing', -1450, CHECKING),
    t('2026-08-02', "Trader Joe's", 'groceries', -95.20, CARD),
    t('2026-08-04', 'Corner Grocer', 'groceries', -118.40, CARD),
    t('2026-08-05', 'Xcel Energy \u2014 electric', 'utilities', -141.80, CHECKING),
    t('2026-08-07', 'Metro Transit \u2014 monthly pass', 'transport', -78, CHECKING),
    t('2026-08-08', 'Spotify Premium', 'subscriptions', -11.99, CARD),
    t('2026-08-09', 'Shell \u2014 fuel', 'transport', -50.20, CARD),
    t('2026-08-11', 'Netflix', 'subscriptions', -17.99, CARD),
    t('2026-08-12', 'Riverside farmers market', 'groceries', -42.15, CHECKING),
    t('2026-08-14', 'Willow Caf\u00e9 \u2014 brunch', 'dining', -54.60, CARD),
    t('2026-08-15', 'Riverside Gym', 'health', -39, CHECKING),
    t('2026-08-18', 'Cloudworks \u2014 typeface audit', 'freelance', 600, CHECKING),
    t('2026-08-19', 'Trail race \u2014 entry', 'health', -35, CARD),
    t('2026-08-21', 'The Times \u2014 subscription', 'subscriptions', -8, CARD),
    t('2026-08-22', 'Audio Shop \u2014 headphones', 'shopping', -189, CARD),
    t('2026-08-24', 'Corner Grocer', 'groceries', -76.90, CARD),
    t('2026-08-26', 'Kestrel Hall \u2014 two tickets', 'shopping', -68, CARD),
    t('2026-08-27', 'Air Lisbon \u2014 Chicago, wedding', 'travel', -286, CARD),
    t('2026-08-28', 'Versa Network \u2014 internet', 'utilities', -58, CHECKING),
    t('2026-08-29', 'Salt & Ember \u2014 dinner', 'dining', -72.30, CARD),
    t('2026-08-31', 'Savings interest', 'interest', 13.10, SAVINGS),

    /* ---- September 2026 ---- */
    t('2026-09-01', 'Payroll \u2014 Northwind Studio', 'salary', 3850, CHECKING),
    t('2026-09-01', 'Rent \u2014 Maple St, Unit 4B', 'housing', -1450, CHECKING),
    t('2026-09-02', 'Corner Grocer', 'groceries', -102.80, CARD),
    t('2026-09-04', 'Xcel Energy \u2014 electric', 'utilities', -126.40, CHECKING),
    t('2026-09-05', 'Metro Transit \u2014 monthly pass', 'transport', -78, CHECKING),
    t('2026-09-07', "Trader Joe's", 'groceries', -88.15, CARD),
    t('2026-09-08', 'Spotify Premium', 'subscriptions', -11.99, CARD),
    t('2026-09-09', 'Shell \u2014 fuel', 'transport', -57.60, CARD),
    t('2026-09-11', 'Netflix', 'subscriptions', -17.99, CARD),
    t('2026-09-12', 'Riverside Gym', 'health', -39, CHECKING),
    t('2026-09-14', 'Field Notes Coffee', 'dining', -18.60, CARD),
    t('2026-09-16', 'Corner Grocer', 'groceries', -94.40, CARD),
    t('2026-09-17', 'The Times \u2014 subscription', 'subscriptions', -8, CARD),
    t('2026-09-18', 'Clearview Optometry \u2014 eye exam', 'health', -210, CHECKING),
    t('2026-09-19', 'Fairweather \u2014 winter coat', 'shopping', -215, CARD),
    t('2026-09-21', 'Limoncello \u2014 dinner', 'dining', -82.40, CARD),
    t('2026-09-23', "Trader Joe's", 'groceries', -66.30, CARD),
    t('2026-09-24', 'Lumen Mobile \u2014 phone', 'utilities', -45, CHECKING),
    t('2026-09-25', 'Type West \u2014 conference & hotel', 'travel', -340, CARD),
    t('2026-09-26', 'Versa Network \u2014 internet', 'utilities', -58, CHECKING),
    t('2026-09-27', 'Cadence Cycles \u2014 tyres', 'transport', -64, CHECKING),
    t('2026-09-28', 'Corner Grocer', 'groceries', -71.85, CARD),
    t('2026-09-29', 'Blue Bottle Coffee', 'dining', -9.40, CARD),
    t('2026-09-30', 'Savings interest', 'interest', 13.40, SAVINGS),

    /* ---- October 2026 (in progress, through the 10th) ---- */
    t('2026-10-01', 'Payroll \u2014 Northwind Studio', 'salary', 3850, CHECKING),
    t('2026-10-01', 'Rent \u2014 Maple St, Unit 4B', 'housing', -1450, CHECKING),
    t('2026-10-02', 'Corner Grocer', 'groceries', -97.60, CARD),
    t('2026-10-03', 'Shell \u2014 fuel', 'transport', -54.20, CARD),
    t('2026-10-04', 'Spotify Premium', 'subscriptions', -11.99, CARD),
    t('2026-10-05', 'Xcel Energy \u2014 electric', 'utilities', -118.20, CHECKING),
    t('2026-10-06', 'Salt & Ember \u2014 dinner', 'dining', -76.80, CARD),
    t('2026-10-07', 'Metro Transit \u2014 monthly pass', 'transport', -78, CHECKING),
    t('2026-10-08', "Trader Joe's", 'groceries', -82.45, CARD),
    t('2026-10-08', 'Northline Outfitters \u2014 desk chair', 'shopping', -212, CARD),
    t('2026-10-09', 'Field Notes Coffee', 'dining', -21.40, CARD),
    t('2026-10-09', 'Riverside Gym', 'health', -39, CHECKING),
    t('2026-10-09', 'Oven & Oak \u2014 bakery', 'dining', -14.20, CARD),
    t('2026-10-09', 'Kaisen \u2014 sushi', 'dining', -98.60, CARD),
    t('2026-10-10', 'Corner Grocer', 'groceries', -68.30, CARD),
    t('2026-10-10', 'GreenLeaf Pharmacy', 'health', -34.50, CARD)
  ];

  /* -------------------------------------------------------------- helpers */

  var $ = function (sel) { return document.querySelector(sel); };
  var NS = 'http://www.w3.org/2000/svg';
  var money0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  var money2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function svg(tag, attrs, kids) {
    var e = document.createElementNS(NS, tag);
    if (attrs) { for (var k in attrs) { if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]); } }
    if (kids != null) {
      (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
        if (c == null) return;
        e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function sign(n) { return (n < 0 ? '\u2212' : '+'); }
  function pct(n, digits) { return (n * 100).toFixed(digits == null ? 1 : digits) + '%'; }
  function compact(n) {
    if (Math.abs(n) >= 1000) {
      var k = n / 1000;
      return '$' + (Math.abs(k) >= 10 ? k.toFixed(0) : k.toFixed(1)).replace(/\.0$/, '') + 'k';
    }
    return '$' + Math.round(n);
  }
  function dayOf(iso) { return parseInt(iso.slice(8, 10), 10); }
  function prettyDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    return DOW[d.getDay()] + ' ' + dayOf(iso) + ' ' + MON[parseInt(iso.slice(5, 7), 10) - 1];
  }
  function icon(name, cls) {
    var s = svg('svg', { 'aria-hidden': 'true', class: cls });
    s.appendChild(svg('use', { href: '#' + name }));
    return s;
  }

  /* ------------------------------------------------------------ aggregate */

  function rowsFor(monthId, throughDay) {
    return TX.filter(function (r) {
      if (r.date.slice(0, 7) !== monthId) return false;
      if (throughDay != null && dayOf(r.date) > throughDay) return false;
      return true;
    });
  }

  function aggregate(monthId, throughDay) {
    var rows = rowsFor(monthId, throughDay);
    var income = 0, spend = 0, byCat = {};
    rows.forEach(function (r) {
      if (r.amount > 0) { income += r.amount; }
      else { spend += -r.amount; byCat[r.cat] = (byCat[r.cat] || 0) + -r.amount; }
    });
    var net = income - spend;
    return {
      rows: rows, income: income, spend: spend, net: net, byCat: byCat,
      rate: income > 0 ? net / income : null
    };
  }

  function monthIndex(id) {
    for (var i = 0; i < MONTHS.length; i++) { if (MONTHS[i].id === id) return i; }
    return -1;
  }

  /* Running balance: opening + every movement up to and including the month. */
  function balanceThrough(monthId, throughDay) {
    var total = OPENING.checking + OPENING.savings;
    TX.forEach(function (r) {
      if (r.date.slice(0, 7) < monthId) total += r.amount;
      else if (r.date.slice(0, 7) === monthId && throughDay != null && dayOf(r.date) <= throughDay) total += r.amount;
    });
    return total;
  }

  /* Comparison basis: previous month, or the same 1..N day window for a partial month. */
  function previousBasis(index) {
    var cur = MONTHS[index], prev = MONTHS[index - 1];
    if (!prev) return null;
    if (cur.through == null) return { agg: aggregate(prev.id, null), label: 'vs ' + prev.long };
    var from = prev.id.slice(5) + ' ' + cur.through;
    return {
      agg: aggregate(prev.id, cur.through),
      label: 'vs ' + MON[parseInt(prev.id.slice(5, 7), 10) - 1] + ' 1\u2013' + cur.through
    };
  }

  /* --------------------------------------------------------------- state */

  var state = { month: MONTHS[MONTHS.length - 1].id, filter: 'all' };
  var tip = $('#tooltip');

  function delta(node, value, opts) {
    /* opts: {goodWhenUp:bool, suffix, digits, neutralText} */
    clear(node);
    node.className = 'kpi__delta';
    if (value === null || !isFinite(value)) {
      node.classList.add('kpi__delta--flat');
      node.appendChild(document.createTextNode(opts.neutralText || 'No prior month in view'));
      return;
    }
    var flat = Math.abs(value) < (opts.flatBelow == null ? 0.0005 : opts.flatBelow);
    var up = value > 0;
    var good = flat ? null : (opts.goodWhenUp === up);
    if (flat) node.classList.add('kpi__delta--flat');
    else if (good) node.classList.add('kpi__delta--up');
    else node.classList.add('kpi__delta--bad');
    node.appendChild(icon(flat ? 'ic-arrow-flat' : (up ? 'ic-arrow-up' : 'ic-arrow-down')));
    node.appendChild(document.createTextNode((flat ? '' : sign(value)) + opts.format(Math.abs(value))));
    if (opts.title) node.setAttribute('title', opts.title);
  }

  /* ---------------------------------------------------------------- KPIs */

  function renderHeader() {
    var i = monthIndex(state.month);
    var m = MONTHS[i];
    var agg = aggregate(m.id, m.through);
    var bal = balanceThrough(m.id, m.through);
    var basis = previousBasis(i);

    $('#pageTitleMonth').textContent = m.long;
    $('#pageTitleNet').textContent =
      'Income ' + money0.format(agg.income) + ' \u00b7 Spending ' + money0.format(agg.spend) +
      ' \u00b7 Kept ' + (agg.net < 0 ? '\u2212' + money0.format(-agg.net) : money0.format(agg.net));

    var asOf = $('#asOf');
    clear(asOf);
    if (m.through != null) {
      asOf.classList.add('tag--live');
      asOf.appendChild(icon('ic-clock'));
      asOf.appendChild(document.createTextNode('Month in progress \u00b7 day ' + m.through + ' of ' + m.days));
    } else {
      asOf.appendChild(document.createTextNode('Closed \u00b7 as of ' + m.label + ' ' + m.days + ', ' + m.id.slice(0, 4)));
    }

    /* Income */
    $('#kpiIncomeValue').textContent = money0.format(agg.income);
    $('#kpiIncomeNote').textContent = basis ? basis.label : 'First month in view';
    delta($('#kpiIncomeDelta'), basis ? agg.income - basis.agg.income : null, {
      goodWhenUp: true, format: function (v) { return money0.format(v) + ' (' + pct(Math.abs(v) / basisOr(basis, 'income') , 1) + ')'; }.bind(null),
      neutralText: 'No prior month in view'
    });

    /* Spending */
    $('#kpiSpendValue').textContent = money0.format(agg.spend);
    $('#kpiSpendNote').textContent = basis ? basis.label : 'First month in view';
    delta($('#kpiSpendDelta'), basis ? agg.spend - basis.agg.spend : null, {
      goodWhenUp: false, format: function (v) { return money0.format(v); },
      neutralText: 'No prior month in view'
    });

    /* Balance */
    $('#kpiBalanceValue').textContent = money0.format(bal);
    var prevBal = null, balNote = '';
    if (i > 0) {
      var pm = MONTHS[i - 1];
      prevBal = balanceThrough(pm.id, pm.through);
      balNote = 'vs ' + pm.label + ' close';
    } else { balNote = 'vs opening balance'; prevBal = OPENING.checking + OPENING.savings; }
    $('#kpiBalanceNote').textContent = balNote;
    delta($('#kpiBalanceDelta'), prevBal === null ? null : bal - prevBal, {
      goodWhenUp: true, format: function (v) { return money0.format(v); }
    });
    $('#spineAccounts').innerHTML = '';
    $('#spineAccounts').appendChild(accountLine('Everyday Checking', bal - m.savings));
    $('#spineAccounts').appendChild(accountLine('High-Yield Savings', m.savings));

    /* Savings rate */
    var prevRate = basis && basis.agg.income > 0 ? basis.agg.net / basis.agg.income : null;
    $('#kpiRateValue').textContent = agg.rate === null ? '\u2014' : pct(agg.rate);
    $('#kpiRateNote').textContent = (basis ? basis.label : 'First month in view') + ' \u00b7 goal 20%';
    delta($('#kpiRateDelta'), (agg.rate === null || prevRate === null) ? null : (agg.rate - prevRate), {
      goodWhenUp: true, flatBelow: 0.0005,
      format: function (v) { return (v * 100).toFixed(1) + ' pts'; }
    });
  }

  function basisOr(basis, key) {
    return (basis && basis.agg[key]) || 1;
  }

  function accountLine(name, value) {
    var s = document.createElement('span');
    s.appendChild(document.createTextNode(name + ' '));
    var b = document.createElement('b');
    b.textContent = money0.format(value);
    s.appendChild(b);
    return s;
  }

  /* ---------------------------------------------------- trend chart (SVG) */

  function niceScale(max, count) {
    if (max <= 0) return { max: 100, ticks: [0, 50, 100] };
    var raw = max / count;
    var p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var n = raw / p;
    var step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
    var top = Math.ceil(max / step) * step;
    var ticks = [];
    for (var v = 0; v <= top + step * 0.001; v += step) ticks.push(v);
    return { max: top, ticks: ticks };
  }

  function defs() {
    var d = svg('defs');
    var p1 = svg('pattern', { id: 'hatch-kept', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    p1.appendChild(svg('rect', { width: 6, height: 6, fill: css('--income-soft') }));
    p1.appendChild(svg('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: css('--kept'), 'stroke-width': 2.2 }));
    var p2 = svg('pattern', { id: 'hatch-over', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    p2.appendChild(svg('rect', { width: 6, height: 6, fill: css('--over-soft') }));
    p2.appendChild(svg('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: css('--over'), 'stroke-width': 2.2 }));
    d.appendChild(p1); d.appendChild(p2);
    return d;
  }

  function renderTrend() {
    var host = $('#trendChart');
    var w = Math.max(300, host.clientWidth || 700);
    var small = w < 560;
    var h = small ? 232 : 268;
    var pad = { t: 26, r: 8, b: 28, l: small ? 40 : 48 };
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;

    var data = MONTHS.map(function (m) {
      var a = aggregate(m.id, m.through);
      return { id: m.id, label: m.label, long: m.long, income: a.income, spend: a.spend, net: a.net, rate: a.rate, through: m.through };
    });
    var maxV = data.reduce(function (acc, d) { return Math.max(acc, d.income, d.spend); }, 0);
    var sc = niceScale(maxV, small ? 3 : 4);
    var y = function (v) { return pad.t + ih - (v / sc.max) * ih; };
    var step = iw / data.length;
    var bw = Math.min(small ? 34 : 52, step * 0.54);

    var root = svg('svg', {
      viewBox: '0 0 ' + w + ' ' + h, width: w, height: h, role: 'list',
      'aria-label': 'Monthly income against spending for the last six months. The solid part of each column is what was spent; the hatched part above it is what was kept.'
    });
    root.appendChild(defs());

    /* value-axis gridlines + labels */
    sc.ticks.forEach(function (v) {
      if (v === 0) return;
      root.appendChild(svg('line', { class: 'grid-line', x1: pad.l, x2: w - pad.r, y1: y(v), y2: y(v) }));
      root.appendChild(svg('text', { class: 'axis-major', x: pad.l - 9, y: y(v) + 4, 'text-anchor': 'end' }, compact(v)));
    });
    root.appendChild(svg('line', { class: 'baseline', x1: pad.l, x2: w - pad.r, y1: y(0), y2: y(0) }));
    root.appendChild(svg('text', { class: 'axis-major', x: pad.l - 9, y: y(0) + 4, 'text-anchor': 'end' }, '$0'));

    data.forEach(function (d, i) {
      var cx = pad.l + step * i + step / 2;
      var x0 = cx - bw / 2;
      var selected = d.id === state.month;
      var top = Math.max(d.income, d.spend);
      var g = svg('g', {
        class: 'col' + (selected ? ' is-active' : ''),
        role: 'listitem', tabindex: '0',
        'aria-label': d.long + ': earned ' + money0.format(d.income) + ', spent ' + money0.format(d.spend) +
          ', kept ' + (d.net < 0 ? 'nothing \u2014 overspent by ' + money0.format(-d.net) : money0.format(d.net)) +
          (d.rate === null ? '' : ', savings rate ' + pct(d.rate)) + (d.through != null ? ' (month in progress)' : '')
      });
      g.style.opacity = selected || !hasSelection() ? 1 : 0.55;
      g.style.animationDelay = (i * 55) + 'ms';

      var spentTop = y(Math.min(d.spend, d.income));
      g.appendChild(svg('rect', { class: 'bar-spent', x: x0, y: spentTop, width: bw, height: Math.max(1, y(0) - spentTop) }));

      if (d.spend < d.income) {
        g.appendChild(svg('rect', {
          class: 'bar-kept', x: x0, y: y(d.income), width: bw,
          height: Math.max(1, y(d.spend) - y(d.income))
        }));
      } else if (d.spend > d.income) {
        g.appendChild(svg('rect', {
          class: 'bar-over', x: x0, y: y(d.spend), width: bw,
          height: Math.max(1, y(d.income) - y(d.spend))
        }));
        g.appendChild(svg('line', { class: 'income-mark', x1: x0 - 3, x2: x0 + bw + 3, y1: y(d.income), y2: y(d.income) }));
      }

      /* labels: income above the column, kept inside the hatch when there is room */
      var lbl = svg('text', { class: 'value-label', x: cx, y: y(top) - 8, 'text-anchor': 'middle' }, money0.format(d.income));
      lbl.style.fill = css(d.spend > d.income ? '--over' : '--income-ink');
      g.appendChild(lbl);

      var bandH = Math.abs(y(d.spend) - y(d.income));
      if (d.spend < d.income && bandH >= 16) {
        var keptLbl = svg('text', {
          class: 'inner-label', x: cx, y: (y(d.income) + y(d.spend)) / 2 + 4,
          'text-anchor': 'middle', 'paint-order': 'stroke', stroke: css('--surface'), 'stroke-width': 3
        }, money0.format(d.net));
        keptLbl.style.fill = css('--income-ink');
        g.appendChild(keptLbl);
      }
      if (d.spend >= 1 && y(0) - spentTop >= 16) {
        var spentLbl = svg('text', {
          class: 'inner-label', x: cx, y: y(0) - 7, 'text-anchor': 'middle'
        }, money0.format(d.spend));
        spentLbl.style.fill = '#fff';
        g.appendChild(spentLbl);
      }

      var ml = svg('text', { class: 'month-label' + (selected ? ' is-selected' : ''), x: cx, y: h - 8, 'text-anchor': 'middle' }, d.label);
      g.appendChild(ml);
      if (selected) {
        g.appendChild(svg('rect', { x: cx - 11, y: h - 3, width: 22, height: 2, rx: 1, fill: css('--ink') }));
      }
      if (d.through != null) {
        g.appendChild(svg('text', { x: cx, y: h - 20, 'text-anchor': 'middle', class: 'month-label' }, '\u00b7'));
      }

      /* hit area: whole column band, mouse + keyboard */
      var hit = svg('rect', { class: 'hit', x: pad.l + step * i, y: pad.t - 14, width: step, height: ih + 30 });
      g.appendChild(hit);
      bindTip(g, function (ev) {
        var rows = [
          { cls: 'tooltip__row--spent', k: 'Spent', v: money2.format(d.spend) },
          { cls: 'tooltip__row--kept', k: 'Kept', v: (d.net < 0 ? '\u2212' : '') + money2.format(Math.abs(d.net)) },
          { cls: 'tooltip__row--muted', k: 'Savings rate', v: d.rate === null ? '\u2014' : pct(d.rate) }
        ];
        showTip(tipHtml(d.long + (d.through != null ? ' (in progress)' : ''), money2.format(d.income) + ' in', rows),
          host, ev.clientX, ev.clientY);
      });
      root.appendChild(g);
    });

    clear(host);
    host.appendChild(root);
    renderTrendTable(data);
  }
  function hasSelection() { return true; }

  function tipHtml(title, headline, rows, hint) {
    var box = document.createElement('div');
    var h = document.createElement('p');
    h.className = 'tooltip__title';
    h.textContent = title;
    box.appendChild(h);
    var head = document.createElement('p');
    head.className = 'tooltip__row';
    head.innerHTML = '<span>Income</span>';
    var hv = document.createElement('span');
    hv.textContent = headline;
    head.appendChild(hv);
    box.appendChild(head);
    rows.forEach(function (r) {
      var row = document.createElement('p');
      row.className = 'tooltip__row ' + (r.cls || '');
      var k = document.createElement('span'); k.textContent = r.k;
      var v = document.createElement('span'); v.textContent = r.v;
      row.appendChild(k); row.appendChild(v);
      box.appendChild(row);
    });
    if (hint) {
      var hp = document.createElement('p');
      hp.className = 'tooltip__hint';
      hp.textContent = hint;
      box.appendChild(hp);
    }
    return box;
  }

  function renderTrendTable(data) {
    var t = $('#trendTable');
    clear(t);
    var cap = document.createElement('caption');
    cap.textContent = 'Income, spending and money kept, by month';
    t.appendChild(cap);
    var head = '<tr><th scope="col">Month</th><th scope="col">Income</th><th scope="col">Spending</th><th scope="col">Kept</th><th scope="col">Savings rate</th></tr>';
    var body = data.map(function (d) {
      return '<tr><th scope="row">' + d.long + '</th><td>' + money2.format(d.income) + '</td><td>' + money2.format(d.spend) +
        '</td><td>' + money2.format(d.net) + '</td><td>' + (d.rate === null ? 'n/a' : pct(d.rate)) + '</td></tr>';
    }).join('');
    var wrap = document.createElement('tbody');
    wrap.innerHTML = head + body;
    t.appendChild(wrap);
  }

  /* ------------------------------------------------- category chart (SVG) */

  function renderCategories() {
    var host = $('#categoryChart');
    var m = MONTHS[monthIndex(state.month)];
    var agg = aggregate(m.id, m.through);
    var entries = Object.keys(agg.byCat).map(function (c) {
      return { cat: c, value: agg.byCat[c], name: CATS[c].name };
    }).sort(function (a, b) { return b.value - a.value; });

    if (!entries.length) {
      clear(host);
      var empty = svg('svg', { viewBox: '0 0 320 90', width: '100%', height: 90, role: 'img', 'aria-label': 'No spending recorded in this month.' });
      empty.appendChild(svg('text', { class: 'empty-note', x: 0, y: 24 }, 'No spending recorded in this month.'));
      host.appendChild(empty);
      clear($('#categoryTable'));
      return;
    }

    var w = Math.max(280, host.clientWidth || 420);
    var labelW = w < 380 ? 92 : 108;
    var valueW = 60;
    var rowH = 30, top = 16;
    var h = top + entries.length * rowH + 18;
    var barW = Math.max(40, w - labelW - valueW);
    var maxV = entries[0].value;
    var sc = niceScale(maxV, w < 380 ? 2 : 3);
    var x = function (v) { return (v / sc.max) * barW; };

    var root = svg('svg', {
      viewBox: '0 0 ' + w + ' ' + h, width: w, height: h, role: 'list',
      'aria-label': CATS ? 'Spending by category for ' + m.long + ', largest first.' : ''
    });
    root.appendChild(defs());

    sc.ticks.forEach(function (v) {
      var gx = labelW + x(v);
      root.appendChild(svg('line', { class: 'grid-line', x1: gx, x2: gx, y1: top - 6, y2: top + entries.length * rowH - 6 }));
      root.appendChild(svg('text', { class: 'axis-major', x: gx, y: h - 4, 'text-anchor': 'middle' }, compact(v)));
    });

    entries.forEach(function (e, i) {
      var cy = top + i * rowH;
      var color = css(CATS[e.cat].color);
      var share = e.value / agg.spend;
      var g = svg('g', {
        class: 'row-anim' + ' is-active', role: 'listitem', tabindex: '0',
        'aria-label': e.name + ': ' + money2.format(e.value) + ', ' + pct(share) + ' of spending'
      });
      g.style.animationDelay = (i * 40) + 'ms';
      g.style.opacity = 1;

      g.appendChild(svg('use', { href: '#' + CATS[e.cat].icon, x: 0, y: cy - 12, width: 15, height: 15, color: color }));
      g.appendChild(svg('text', { class: 'cat-label', x: 21, y: cy + 1 }, e.name));
      g.appendChild(svg('rect', { class: 'cat-track', x: labelW, y: cy - 8, width: barW, height: 14, rx: 4 }));
      g.appendChild(svg('rect', {
        class: 'cat-bar', x: labelW, y: cy - 8, width: Math.max(2, x(e.value)), height: 14, rx: 4, fill: color
      }));
      var vl = svg('text', { class: 'value-label', x: labelW + Math.max(2, x(e.value)) + 7, y: cy + 2 }, compact(e.value));
      vl.style.fill = css('--ink');
      g.appendChild(vl);

      var hit = svg('rect', { class: 'hit', x: 0, y: cy - 13, width: w, height: rowH });
      g.appendChild(hit);
      var budget = BUDGETS[e.cat];
      bindTip(g, function (ev) {
        var rows = [
          { cls: 'tooltip__row--muted', k: 'Share of spending', v: pct(share) },
          { cls: 'tooltip__row--muted', k: 'Transactions', v: String(TX.filter(function (r) { return r.date.slice(0, 7) === m.id && r.cat === e.cat && (m.through == null || dayOf(r.date) <= m.through); }).length) }
        ];
        if (budget != null) {
          var used = e.value / budget;
          rows.push({
            cls: used > 1 ? 'tooltip__row--over' : 'tooltip__row--muted',
            k: 'Of budget (' + money0.format(budget) + ')', v: pct(used, 0)
          });
        }
        showTip(tipHtml(e.name, money2.format(e.value), rows, budget == null ? 'No budget set for this category' : null), host, ev.clientX, ev.clientY);
      });
      root.appendChild(g);
    });

    clear(host);
    host.appendChild(root);
    renderCategoryTable(entries, agg, m);
  }

  function renderCategoryTable(entries, agg, m) {
    var t = $('#categoryTable');
    clear(t);
    var cap = document.createElement('caption');
    cap.textContent = 'Spending by category, ' + m.long;
    t.appendChild(cap);
    var html = '<tr><th scope="col">Category</th><th scope="col">Amount</th><th scope="col">Share</th></tr>';
    html += entries.map(function (e) {
      return '<tr><th scope="row">' + e.name + '</th><td>' + money2.format(e.value) + '</td><td>' + pct(e.value / agg.spend) + '</td></tr>';
    }).join('');
    var tb = document.createElement('tbody');
    tb.innerHTML = html;
    t.appendChild(tb);
  }

  /* ---------------------------------------------------------- transactions */

  function renderFilters() {
    var host = $('#txFilters');
    clear(host);
    var m = MONTHS[monthIndex(state.month)];
    var agg = aggregate(m.id, m.through);
    var all = document.createElement('button');
    all.type = 'button';
    all.className = 'chip';
    all.textContent = 'All';
    all.setAttribute('aria-pressed', state.filter === 'all' ? 'true' : 'false');
    all.addEventListener('click', function () { state.filter = 'all'; renderTransactions(); });
    host.appendChild(all);

    Object.keys(BUDGETS).concat(['travel']).forEach(function (c) {
      var n = (agg.byCat[c] || 0) > 0 ? TX.filter(function (r) {
        return r.date.slice(0, 7) === m.id && r.cat === c && (m.through == null || dayOf(r.date) <= m.through);
      }).length : 0;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('aria-pressed', state.filter === c ? 'true' : 'false');
      b.appendChild(document.createTextNode(CATS[c].name));
      var cnt = document.createElement('span');
      cnt.className = 'chip__count';
      cnt.textContent = n;
      b.appendChild(cnt);
      b.addEventListener('click', function () { state.filter = c; renderTransactions(); });
      host.appendChild(b);
    });
  }

  function renderTransactions() {
    renderFilters();
    var host = $('#txList');
    clear(host);
    var m = MONTHS[monthIndex(state.month)];
    var rows = rowsFor(m.id, m.through).slice().sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
    if (state.filter !== 'all') rows = rows.filter(function (r) { return r.cat === state.filter; });

    $('#txSub').textContent = rows.length + (rows.length === 1 ? ' entry' : ' entries') +
      ' \u00b7 ' + m.label + ' ' + (m.through != null ? '1\u2013' + m.through : '1\u2013' + m.days) +
      (state.filter === 'all' ? '' : ' \u00b7 ' + CATS[state.filter].name);

    if (!rows.length) {
      var empty = document.createElement('div');
      empty.className = 'tx__empty';
      empty.appendChild(icon('ic-basket'));
      var p = document.createElement('p');
      p.textContent = 'Nothing was spent on ' + CATS[state.filter].name.toLowerCase() +
        (m.through != null ? ' in the first ' + m.through + ' days of ' : ' in ') + m.long + '.';
      empty.appendChild(p);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = 'Show all transactions';
      btn.addEventListener('click', function () { state.filter = 'all'; renderTransactions(); });
      empty.appendChild(btn);
      host.appendChild(empty);
      return;
    }

    var lastDay = null;
    rows.forEach(function (r) {
      if (r.date !== lastDay) {
        lastDay = r.date;
        var d = document.createElement('p');
        d.className = 'tx__day';
        d.appendChild(document.createTextNode(prettyDate(r.date)));
        host.appendChild(d);
      }
      var c = CATS[r.cat];
      var row = document.createElement('div');
      row.className = 'tx__row';
      var ic = document.createElement('span');
      ic.className = 'tx__icon';
      ic.style.setProperty('--cat', css(c.color));
      ic.style.setProperty('--cat-soft', r.amount > 0 ? css('--income-soft') : css('--bg-sunken'));
      ic.appendChild(icon(c.icon));
      row.appendChild(ic);

      var main = document.createElement('div');
      main.className = 'tx__main';
      var mer = document.createElement('p');
      mer.className = 'tx__merchant';
      mer.textContent = r.merchant;
      var meta = document.createElement('p');
      meta.className = 'tx__meta';
      meta.textContent = c.name + ' \u00b7 ' + r.account;
      main.appendChild(mer); main.appendChild(meta);
      row.appendChild(main);

      var amt = document.createElement('p');
      amt.className = 'tx__amount' + (r.amount > 0 ? ' tx__amount--in' : '');
      amt.textContent = (r.amount > 0 ? '+' : '') + money2.format(r.amount);
      row.appendChild(amt);

      host.appendChild(row);
    });
  }

  /* -------------------------------------------------------------- budgets */

  function renderBudgets() {
    var list = $('#budgetList');
    clear(list);
    var m = MONTHS[monthIndex(state.month)];
    var agg = aggregate(m.id, m.through);
    var totalLimit = 0, totalSpent = 0, flagged = 0;

    BUDGET_ORDER.forEach(function (c) {
      var limit = BUDGETS[c];
      var spent = agg.byCat[c] || 0;
      var ratio = spent / limit;
      var stateKey = ratio > 1 ? 'over' : (ratio >= 0.8 ? 'near' : 'ok');
      totalLimit += limit; totalSpent += spent;
      if (stateKey !== 'ok') flagged++;

      var li = document.createElement('li');
      li.className = 'budget';
      li.setAttribute('data-state', stateKey);

      var top = document.createElement('div');
      top.className = 'budget__top';
      var name = document.createElement('span');
      name.className = 'budget__name';
      name.appendChild(icon(CATS[c].icon));
      name.appendChild(document.createTextNode(CATS[c].name));
      top.appendChild(name);
      var fig = document.createElement('span');
      fig.className = 'budget__figure';
      var b = document.createElement('b');
      b.textContent = money0.format(spent);
      fig.appendChild(b);
      fig.appendChild(document.createTextNode(' / ' + money0.format(limit) + ' \u00b7 ' + pct(ratio, 0)));
      top.appendChild(fig);
      li.appendChild(top);

      var track = document.createElement('div');
      track.className = 'budget__track';
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-valuenow', Math.round(ratio * 100));
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', '100');
      track.setAttribute('aria-label', CATS[c].name + ': ' + money0.format(spent) + ' of ' + money0.format(limit));
      var fill = document.createElement('div');
      fill.className = 'budget__fill';
      fill.style.width = Math.min(100, ratio * 100) + '%';
      track.appendChild(fill);
      if (m.through != null) {
        var pace = document.createElement('span');
        pace.className = 'budget__pace';
        pace.style.left = 'calc(' + ((m.through / m.days) * 100).toFixed(1) + '% - 1px)';
        pace.title = 'Day ' + m.through + ' of ' + m.days;
        track.appendChild(pace);
      }
      li.appendChild(track);

      var st = document.createElement('p');
      st.className = 'budget__status';
      if (stateKey === 'over') {
        st.appendChild(icon('ic-alert'));
        st.appendChild(document.createTextNode('Over limit by ' + money0.format(spent - limit) +
          (m.through != null ? ' with ' + (m.days - m.through) + ' days left' : '')));
      } else if (stateKey === 'near') {
        st.appendChild(icon('ic-alert'));
        st.appendChild(document.createTextNode('Near limit \u00b7 ' + money0.format(limit - spent) + ' left'));
      } else {
        st.appendChild(document.createTextNode(money0.format(limit - spent) + ' left \u00b7 ' + pct(ratio, 0) + ' used'));
      }
      li.appendChild(st);
      list.appendChild(li);
    });

    $('#budgetSub').textContent = m.through != null
      ? 'Day ' + m.through + ' of ' + m.days + ' \u00b7 tick marks where the month is'
      : 'Limits are fixed per month';
    $('#budgetTotal').textContent = money0.format(totalSpent) + ' of ' + money0.format(totalLimit) + ' budgeted';

    var foot = $('#budgetFoot');
    clear(foot);
    var summary = document.createElement('span');
    summary.textContent = flagged === 0
      ? 'All categories under their limits.'
      : flagged + (flagged === 1 ? ' category is' : ' categories are') + ' at, near or over their limit';
    foot.appendChild(summary);
    if (m.through != null) {
      var key = document.createElement('span');
      key.className = 'pace-key';
      var i = document.createElement('i');
      key.appendChild(i);
      key.appendChild(document.createTextNode('Month position \u00b7 day ' + m.through + ' of ' + m.days));
      foot.appendChild(key);
    }
  }

  /* ------------------------------------------------------------- tooltips */

  var hideTimer = null;
  function showTip(content, host, clientX, clientY) {
    clearTimeout(hideTimer);
    clear(tip);
    tip.appendChild(content);
    tip.hidden = false;
    var box = host.getBoundingClientRect();
    var hostPad = 0;
    var left = clientX - box.left + hostPad + 14;
    var topPos = clientY - box.top - 12;
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    if (left + tw > box.width) left = clientX - box.left - tw - 14;
    if (left < 0) left = 4;
    if (topPos + th > box.height) topPos = box.height - th - 4;
    if (topPos < 0) topPos = 4;
    tip.style.left = left + 'px';
    tip.style.top = topPos + 'px';
    tip.classList.add('is-on');
  }
  function hideTip() {
    tip.classList.remove('is-on');
    hideTimer = setTimeout(function () { tip.hidden = true; }, 140);
  }
  function bindTip(group, buildContent) {
    var host = group.closest('.chart');
    group.addEventListener('pointerenter', function (e) { buildContent(e); });
    group.addEventListener('pointermove', function (e) { buildContent(e); });
    group.addEventListener('pointerdown', function (e) { e.preventDefault(); buildContent(e); });
    group.addEventListener('pointerleave', hideTip);
    group.addEventListener('focus', function () {
      var r = group.getBoundingClientRect();
      buildContent({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
    });
    group.addEventListener('blur', hideTip);
  }
  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest || !e.target.closest('.chart')) hideTip();
  });

  /* ---------------------------------------------------------------- wire */

  function render() {
    renderHeader();
    renderTrend();
    renderCategories();
    renderTransactions();
    renderBudgets();
  }

  var select = $('#monthSelect');
  MONTHS.forEach(function (m) {
    var o = document.createElement('option');
    o.value = m.id;
    o.textContent = m.long + (m.through != null ? ' \u00b7 in progress' : '');
    select.appendChild(o);
  });
  select.value = state.month;
  select.addEventListener('change', function () {
    state.month = select.value;
    state.filter = 'all';
    render();
  });

  function step(delta) {
    var i = monthIndex(state.month) + delta;
    if (i < 0 || i >= MONTHS.length) return;
    state.month = MONTHS[i].id;
    state.filter = 'all';
    select.value = state.month;
    render();
    $('#prevMonth').focus();
  }
  $('#prevMonth').addEventListener('click', function () { step(-1); });
  $('#nextMonth').addEventListener('click', function () { step(1); });

  function syncSteppers() {
    var i = monthIndex(state.month);
    $('#prevMonth').disabled = i === 0;
    $('#nextMonth').disabled = i === MONTHS.length - 1;
  }
  var _render = render;
  render = function () { _render(); syncSteppers(); };

  var raf = null, lastW = 0;
  function onResize() {
    var w = $('#trendChart').clientWidth;
    if (Math.abs(w - lastW) < 2) return;
    lastW = w;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () { renderTrend(); renderCategories(); });
  }
  if (window.ResizeObserver) {
    new ResizeObserver(onResize).observe($('#trendChart'));
  } else {
    window.addEventListener('resize', onResize);
  }

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', function () { renderTrend(); renderCategories(); });
  }

  render();
})();
