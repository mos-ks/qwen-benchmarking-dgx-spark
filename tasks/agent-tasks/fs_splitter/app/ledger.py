"""Money logic. Everything is integer cents; nothing here touches the database."""


def equal_shares(amount_cents: int, member_ids: list[int]) -> dict[int, int]:
    """Split an amount equally across members."""
    each = amount_cents // len(member_ids)
    return {m: each for m in sorted(member_ids)}


def balances(member_ids: list[int], expenses: list[dict]) -> dict[int, int]:
    """Paid minus owed per member. `expenses` items have payer_id and amount_cents."""
    out = {m: 0 for m in member_ids}
    for e in expenses:
        out[e["payer_id"]] += e["amount_cents"]
        for m, share in equal_shares(e["amount_cents"], member_ids).items():
            out[m] -= share
    return out
