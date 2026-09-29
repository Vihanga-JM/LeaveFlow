const { app, request, loginAs, apply, decide, balanceOf, ISHARA, RUWAN, DILINI } = require("./helpers");

describe("PATCH /api/leave-requests/:id — approve / reject", () => {
  test("manager approving a report's request deducts the working days", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const { body } = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-13" });

    const res = await decide(ruwan, body.id, "approve");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("APPROVED");
    expect(res.body.decided_by).toBe(1);
    expect(await balanceOf(ishara, 1)).toBe(5);
  });

  test("a public holiday inside the range is not deducted (Vesak)", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    // Wed 29 Apr – Mon 4 May: 4 working days, minus Vesak on Fri 1 May = 3.
    const { body } = await apply(ishara, { start_date: "2026-04-29", end_date: "2026-05-04" });
    await decide(ruwan, body.id, "approve");
    expect(await balanceOf(ishara, 1)).toBe(3);
  });

  test("forbids an EMPLOYEE approving with 403", async () => {
    const ishara = await loginAs(ISHARA);
    const { body } = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    const res = await decide(ishara, body.id, "approve");
    expect(res.status).toBe(403);
  });

  test("forbids a manager deciding for someone who is not their report", async () => {
    const dilini = await loginAs(DILINI);
    const ruwan = await loginAs(RUWAN);
    const { body } = await apply(dilini, { start_date: "2026-03-09", end_date: "2026-03-09" });
    const res = await decide(ruwan, body.id, "approve");
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe("Not your report");
  });

  test("HR_ADMIN may decide anyone else's request", async () => {
    const ishara = await loginAs(ISHARA);
    const dilini = await loginAs(DILINI);
    const { body } = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    const res = await decide(dilini, body.id, "approve");
    expect(res.status).toBe(200);
  });

  test("HR approves a manager's own leave (managers have no manager)", async () => {
    const ruwan = await loginAs(RUWAN);
    const dilini = await loginAs(DILINI);
    const { body } = await apply(ruwan, { start_date: "2026-03-09", end_date: "2026-03-09" });
    const res = await decide(dilini, body.id, "approve");
    expect(res.status).toBe(200);
  });

  test("nobody approves or rejects their own request — not even HR", async () => {
    const dilini = await loginAs(DILINI);
    const ruwan = await loginAs(RUWAN);
    const own = await apply(dilini, { start_date: "2026-03-09", end_date: "2026-03-09" });
    const ruwansOwn = await apply(ruwan, { start_date: "2026-03-10", end_date: "2026-03-10" });

    const hrApprove = await decide(dilini, own.body.id, "approve");
    expect(hrApprove.status).toBe(403);
    expect(hrApprove.body.error.code).toBe("SELF_DECISION");

    const hrReject = await decide(dilini, own.body.id, "reject", { decision_note: "no" });
    expect(hrReject.status).toBe(403);

    const managerApprove = await decide(ruwan, ruwansOwn.body.id, "approve");
    expect(managerApprove.body.error.code).toBe("SELF_DECISION");

    // ...but cancelling your own pending request is still allowed.
    expect((await decide(dilini, own.body.id, "cancel")).status).toBe(200);
  });

  test("your own pending requests don't appear in your approvals inbox", async () => {
    const dilini = await loginAs(DILINI);
    const ishara = await loginAs(ISHARA);
    await apply(dilini, { start_date: "2026-03-09", end_date: "2026-03-09" });
    await apply(ishara, { start_date: "2026-03-10", end_date: "2026-03-10" });

    const inbox = await request(app).get("/api/team/requests").set("Authorization", `Bearer ${dilini}`);
    expect(inbox.body.map((r) => r.employee_name)).toEqual(["Ishara Fernando"]);
  });

  test("rejecting without a decision_note is a 400", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const { body } = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    const res = await decide(ruwan, body.id, "reject");
    expect(res.status).toBe(400);
  });

  test("rejecting stores the note and leaves the balance untouched", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const { body } = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-10" });
    const res = await decide(ruwan, body.id, "reject", { decision_note: "Stock-take week" });
    expect(res.body.status).toBe("REJECTED");
    expect(res.body.decision_note).toBe("Stock-take week");
    expect(await balanceOf(ishara, 1)).toBe(0);
  });

  test("a second decision on a decided request is 409 INVALID_STATE", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const { body } = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    await decide(ruwan, body.id, "approve");
    const res = await decide(ruwan, body.id, "approve");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATE");
    expect(await balanceOf(ishara, 1)).toBe(1); // not deducted twice
  });

  test("an unknown action is a 400", async () => {
    const ruwan = await loginAs(RUWAN);
    const res = await decide(ruwan, 1, "delete");
    expect(res.status).toBe(400);
  });

  test("a missing request is a 404", async () => {
    const ruwan = await loginAs(RUWAN);
    const res = await decide(ruwan, 9999, "approve");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/leave-requests/:id — cancel", () => {
  test("the owner cancels their PENDING request", async () => {
    const ishara = await loginAs(ISHARA);
    const { body } = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    const res = await decide(ishara, body.id, "cancel");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELLED");
  });

  test("cancelling an APPROVED request is 409", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const { body } = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    await decide(ruwan, body.id, "approve");
    const res = await decide(ishara, body.id, "cancel");
    expect(res.status).toBe(409);
  });

  test("cancelling someone else's request is 403", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const { body } = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    const res = await decide(ruwan, body.id, "cancel");
    expect(res.status).toBe(403);
  });
});
