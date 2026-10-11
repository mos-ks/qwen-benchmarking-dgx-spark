from tests.helpers import ServerTestCase


class GroupTests(ServerTestCase):
    def test_create_and_read_group(self):
        g = self.group(" Ann ", "Bob")
        self.assertEqual([m["name"] for m in g["members"]], ["Ann", "Bob"])
        status, again = self.call("GET", f"/api/groups/{g['id']}")
        self.assertEqual((status, again), (200, g))

    def test_group_validation(self):
        for body in (
            {"name": "", "members": ["a", "b"]},
            {"name": "x", "members": ["a"]},
            {"name": "x", "members": ["a", "a"]},
        ):
            status, err = self.call("POST", "/api/groups", body)
            self.assertEqual((status, err["error"]["code"]), (400, "validation"), body)

    def test_unknown_group(self):
        status, err = self.call("GET", "/api/groups/999")
        self.assertEqual((status, err["error"]["code"]), (404, "not_found"))


class ExpenseTests(ServerTestCase):
    def test_expense_and_balances(self):
        g = self.group("Ann", "Bob", "Cy")
        ann, bob, cy = (m["id"] for m in g["members"])
        status, e = self.call(
            "POST",
            f"/api/groups/{g['id']}/expenses",
            {"payer_id": ann, "description": "Dinner", "amount_cents": 3000},
        )
        self.assertEqual(status, 201, e)
        self.assertEqual(
            (e["payer_id"], e["amount_cents"], e["description"]), (ann, 3000, "Dinner")
        )
        status, b = self.call("GET", f"/api/groups/{g['id']}/balances")
        self.assertEqual(
            {x["member_id"]: x["balance_cents"] for x in b}, {ann: 2000, bob: -1000, cy: -1000}
        )

    def test_expenses_newest_first(self):
        g = self.group("Ann", "Bob")
        ann = g["members"][0]["id"]
        for d in ("first", "second"):
            self.call(
                "POST",
                f"/api/groups/{g['id']}/expenses",
                {"payer_id": ann, "description": d, "amount_cents": 200},
            )
        status, items = self.call("GET", f"/api/groups/{g['id']}/expenses")
        self.assertEqual([e["description"] for e in items], ["second", "first"])

    def test_expense_validation(self):
        g = self.group("Ann", "Bob")
        other = self.group("Zed", "Yan")["members"][0]["id"]
        ann = g["members"][0]["id"]
        for body in (
            {"payer_id": other, "description": "x", "amount_cents": 100},
            {"payer_id": ann, "description": " ", "amount_cents": 100},
            {"payer_id": ann, "description": "x", "amount_cents": 0},
            {"payer_id": ann, "description": "x", "amount_cents": 1.5},
        ):
            status, err = self.call("POST", f"/api/groups/{g['id']}/expenses", body)
            self.assertEqual((status, err["error"]["code"]), (400, "validation"), body)
