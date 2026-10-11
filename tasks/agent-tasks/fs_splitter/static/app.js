import { api } from "./api.js";
import { formatCents, parseAmount } from "./money.js";

const $ = (id) => document.getElementById(id);
let group = null;

function showError(err) {
  $("error").textContent = err ? err.message : "";
}

function memberName(id) {
  return group.members.find((m) => m.id === id)?.name ?? "?";
}

async function render() {
  const [balances, expenses] = await Promise.all([
    api("GET", `/api/groups/${group.id}/balances`),
    api("GET", `/api/groups/${group.id}/expenses`),
  ]);
  $("group-title").textContent = group.name;
  $("balances").replaceChildren(
    ...balances.map((b) => {
      const li = document.createElement("li");
      const amount = document.createElement("span");
      amount.className = b.balance_cents >= 0 ? "owed" : "owes";
      amount.textContent = formatCents(b.balance_cents);
      li.append(b.name, amount);
      return li;
    }),
  );
  $("expenses").replaceChildren(
    ...expenses.map((e) => {
      const li = document.createElement("li");
      const who = document.createElement("span");
      who.className = "muted";
      who.textContent = `${memberName(e.payer_id)} paid ${formatCents(e.amount_cents)}`;
      li.append(e.description, who);
      return li;
    }),
  );
}

async function openGroup(id) {
  group = await api("GET", `/api/groups/${id}`);
  $("payer").replaceChildren(
    ...group.members.map((m) => {
      const opt = document.createElement("option");
      opt.value = String(m.id);
      opt.textContent = m.name;
      return opt;
    }),
  );
  $("start").hidden = true;
  $("group").hidden = false;
  await render();
}

$("group-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  try {
    const members = $("group-members").value.split("\n").map((s) => s.trim()).filter(Boolean);
    const created = await api("POST", "/api/groups", { name: $("group-name").value, members });
    history.pushState(null, "", `/groups/${created.id}`);
    showError(null);
    await openGroup(created.id);
  } catch (err) {
    showError(err);
  }
});

$("expense-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const amount = parseAmount($("amount").value);
  if (amount === null || amount <= 0) return showError(new Error("Enter an amount like 12.50"));
  try {
    await api("POST", `/api/groups/${group.id}/expenses`, {
      payer_id: Number($("payer").value),
      description: $("description").value,
      amount_cents: amount,
    });
    $("expense-form").reset();
    showError(null);
    await render();
  } catch (err) {
    showError(err);
  }
});

const match = /^\/groups\/(\d+)$/.exec(location.pathname);
if (match) openGroup(Number(match[1])).catch(showError);
