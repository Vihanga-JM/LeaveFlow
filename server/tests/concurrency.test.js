const { loginAs, apply, ISHARA } = require("./helpers");

// Review finding: overlap check, balance check and insert were separate queries,
// so two simultaneous submissions could both pass. These fire requests in
// parallel; exactly one may win.

describe("simultaneous submissions", () => {
  test("two parallel requests for the last day: one 201, one 409", async () => {
    const ishara = await loginAs(ISHARA);
    // Casual = 7. Reserve 6 (Mon 12 – Mon 19 Oct, 6 working days), leaving 1.
    const first = await apply(ishara, { leave_type_id: 2, start_date: "2026-10-12", end_date: "2026-10-19" });
    expect(first.status).toBe(201);

    const [a, b] = await Promise.all([
      apply(ishara, { leave_type_id: 2, start_date: "2026-11-02", end_date: "2026-11-02" }),
      apply(ishara, { leave_type_id: 2, start_date: "2026-11-03", end_date: "2026-11-03" }),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });

  test("the same request double-submitted: one 201, one 409 OVERLAPPING_REQUEST", async () => {
    const ishara = await loginAs(ISHARA);
    const body = { start_date: "2026-11-09", end_date: "2026-11-10" };

    const results = await Promise.all([apply(ishara, body), apply(ishara, body)]);

    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409).body.error.code).toBe("OVERLAPPING_REQUEST");
  });
});
