const { app, request, loginAs, apply, decide, ISHARA, RUWAN, DILINI } = require("./helpers");

function absences(token, from, to) {
  return request(app)
    .get(`/api/team/absences?from=${from}&to=${to}`)
    .set("Authorization", `Bearer ${token}`);
}

describe("GET /api/team/absences", () => {
  test("a manager sees their report's approved leave overlapping the week", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const { body } = await apply(ishara, { start_date: "2026-03-10", end_date: "2026-03-11" });
    await decide(ruwan, body.id, "approve");

    const res = await absences(ruwan, "2026-03-09", "2026-03-13");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ employee_name: "Ishara Fernando", start_date: "2026-03-10" });
  });

  test("pending (not yet approved) leave is not listed", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    await apply(ishara, { start_date: "2026-03-10", end_date: "2026-03-11" });
    const res = await absences(ruwan, "2026-03-09", "2026-03-13");
    expect(res.body).toEqual([]);
  });

  test("returns an empty array when nobody is off", async () => {
    const ruwan = await loginAs(RUWAN);
    const res = await absences(ruwan, "2026-08-03", "2026-08-07");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("a manager does not see people who are not their reports", async () => {
    const dilini = await loginAs(DILINI);
    const ruwan = await loginAs(RUWAN);
    const { body } = await apply(dilini, { start_date: "2026-03-10", end_date: "2026-03-10" });
    await decide(dilini, body.id, "approve"); // HR approving her own, for the fixture
    const asRuwan = await absences(ruwan, "2026-03-09", "2026-03-13");
    const asHr = await absences(dilini, "2026-03-09", "2026-03-13");
    expect(asRuwan.body).toEqual([]);
    expect(asHr.body).toHaveLength(1);
  });

  test("an EMPLOYEE gets 403", async () => {
    const ishara = await loginAs(ISHARA);
    const res = await absences(ishara, "2026-03-09", "2026-03-13");
    expect(res.status).toBe(403);
  });

  test("missing or reversed dates are a 400", async () => {
    const ruwan = await loginAs(RUWAN);
    expect((await absences(ruwan, "2026-03-13", "2026-03-09")).status).toBe(400);
    expect((await absences(ruwan, "soon", "2026-03-09")).status).toBe(400);
  });
});
