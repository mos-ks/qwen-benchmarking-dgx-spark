---
name: dataviz
description: Use before writing any chart, graph, plot, dashboard, KPI tile or data table in any library (Recharts, Chart.js, D3, Plotly, matplotlib, Victory, react-native-svg). Picks the right chart for the data, sets readable color and labels, and checks the result renders.
license: MIT
---

# Data visualization

## 1. Pick the form from the question, not the data

| The reader asks | Use | Avoid |
|---|---|---|
| How does it change over time? | line (continuous), column (few periods) | pie, area stacks with more than 3 series |
| How do these compare? | horizontal bar, sorted | 3D, radar for more than 5 items |
| What is the share of a whole? | single stacked bar, or a pie with at most 4 slices | donut with 8 slices |
| How is it distributed? | histogram, box plot, strip plot | bar of means without spread |
| Do two numbers relate? | scatter, add a trend line only if fitted | dual y-axes |
| One number that matters | KPI tile: value, unit, delta vs a stated baseline, sparkline | gauge |

Two series or fewer that share a unit go on one axis. Never use two y-axes; use two small charts that share the x-axis.

## 2. Color

- Encode one variable with color at most. Series identity: a categorical palette of at most 6 hues. Magnitude: one sequential hue (light to dark). Signed change: diverging, neutral at zero.
- Default categorical palette (colorblind-safe, Okabe-Ito): `#0072B2 #E69F00 #009E73 #CC79A7 #56B4E9 #D55E00`. Neutral/other: `#9CA3AF`.
- Never carry meaning by red vs green alone. Add a sign, an icon or a label.
- Define colors as theme tokens (CSS variables or the project's theme file) and read them in the chart. Both light and dark mode must stay readable: check text and gridline contrast in each.

## 3. Labels and ink

- Title states the finding ("Signups doubled after the March launch"), not the variable name.
- Label axes with units. Format numbers for humans: `1.2k`, `€3.4M`, `12%`. Dates in the user's locale.
- Label lines directly at their end when there are 4 series or fewer; drop the legend.
- Start bar charts at zero. Lines may start elsewhere but say so.
- Light gridlines on the value axis only. No borders, shadows, gradients or 3D.
- Sort bars by value unless the category has a natural order.

## 4. Interaction (web and mobile)

- Tooltip shows the exact value, unit and label for the hovered point; on touch, tap to show and tap elsewhere to hide.
- Every chart has an empty state, a loading state and an error state. Never render a blank box.
- Responsive: test at 375 px wide. Reduce tick count on small screens rather than shrinking text below 11 px.
- Provide a text alternative: an `aria-label` summary or a visually hidden table of the data.

## 5. Verify before you say it works

- Render the chart in a test or a running page and look at the output (screenshot with the playwright-cli skill when available).
- Feed it real-shaped data including: empty array, one point, a negative value, a very large value, and a long label. Fix anything that overflows or crashes.
- Check the numbers on screen match the source data for at least two points.
