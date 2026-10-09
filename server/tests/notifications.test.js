const { app, request, loginAs, apply, decide, ISHARA, RUWAN, DILINI } = require("./helpers");

function inbox(token) {
  return request(app).get("/api/notifications").set("Authorization", `Bearer ${token}`);
}

const kinds = (res) => res.body.items.map((n) => n.kind);

describe("notifications (US-8)", () => {
  test("a new request notifies the requester's manager, not HR or the requester", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const dilini = await loginAs(DILINI);
    await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-10", day_part: "FULL" });

    const res = await inbox(ruwan);
    expect(res.status).toBe(200);
    expect(res.body.unread).toBe(1);
    expect(res.body.items[0]).toMatchObject({
      kind: "SUBMITTED",
      actor_name: "Ishara Fernando",
      employee_name: "Ishara Fernando",
      leave_type: "Annual",
      start_date: "2026-03-09",
      end_date: "2026-03-10",
      read_at: null,
    });
    expect((await inbox(ishara)).body.items).toHaveLength(0);
    expect((await inbox(dilini)).body.items).toHaveLength(0);
  });

  test("a manager's own request goes to HR, because they have no manager", async () => {
    const ruwan = await loginAs(RUWAN);
    const dilini = await loginAs(DILINI);
    await apply(ruwan, { start_date: "2026-03-12", end_date: "2026-03-12" });

    expect(kinds(await inbox(dilini))).toEqual(["SUBMITTED"]);
    expect((await inbox(ruwan)).body.items).toHaveLength(0);
  });

  test("approve and reject tell the requester, with the rejection note", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const a = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    const b = await apply(ishara, { start_date: "2026-03-16", end_date: "2026-03-16" });
    await decide(ruwan, a.body.id, "approve");
    await decide(ruwan, b.body.id, "reject", { decision_note: "Release week" });

    const res = await inbox(ishara);
    expect(res.body.unread).toBe(2);
    expect(res.body.items.map((n) => [n.kind, n.actor_name, n.decision_note])).toEqual([
      ["REJECTED", "Ruwan Jayasuriya", "Release week"],
      ["APPROVED", "Ruwan Jayasuriya", null],
    ]);
  });

  test("cancelling tells the approver the request was withdrawn", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const a = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    await decide(ishara, a.body.id, "cancel");

    expect(kinds(await inbox(ruwan))).toEqual(["CANCELLED", "SUBMITTED"]);
    expect((await inbox(ishara)).body.items).toHaveLength(0);
  });

  test("a refused request or decision leaves no notification behind", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const a = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    expect((await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" })).status).toBe(409);
    await decide(ruwan, a.body.id, "approve");
    expect((await decide(ruwan, a.body.id, "approve")).status).toBe(409);

    expect(kinds(await inbox(ruwan))).toEqual(["SUBMITTED"]);
    expect(kinds(await inbox(ishara))).toEqual(["APPROVED"]);
  });

  test("mark one read, then mark all read", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    await apply(ishara, { start_date: "2026-03-16", end_date: "2026-03-16" });

    const [newest] = (await inbox(ruwan)).body.items;
    const one = await request(app)
      .patch(`/api/notifications/${newest.id}/read`)
      .set("Authorization", `Bearer ${ruwan}`);
    expect(one.status).toBe(204);

    let res = await inbox(ruwan);
    expect(res.body.unread).toBe(1);
    expect(res.body.items[0].read_at).not.toBeNull();
    expect(res.body.items[1].read_at).toBeNull();

    const all = await request(app)
      .post("/api/notifications/read-all")
      .set("Authorization", `Bearer ${ruwan}`);
    expect(all.status).toBe(204);
    res = await inbox(ruwan);
    expect(res.body.unread).toBe(0);
  });

  test("you can't read someone else's notification, and a bad id is a 400", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    const [n] = (await inbox(ruwan)).body.items;

    const res = await request(app)
      .patch(`/api/notifications/${n.id}/read`)
      .set("Authorization", `Bearer ${ishara}`);
    expect(res.status).toBe(404);
    expect((await inbox(ruwan)).body.unread).toBe(1);

    const bad = await request(app)
      .patch("/api/notifications/abc/read")
      .set("Authorization", `Bearer ${ruwan}`);
    expect(bad.status).toBe(400);
  });

  test("no token is a 401", async () => {
    expect((await request(app).get("/api/notifications")).status).toBe(401);
  });
});
