const { app, request, loginAs, apply, decide, ISHARA, RUWAN, DILINI } = require("./helpers");

function calendar(token, month) {
  const r = request(app).get(`/api/calendar${month ? `?month=${month}` : ""}`);
  return token ? r.set("Authorization", `Bearer ${token}`) : r;
}

const names = (res) => res.body.leave.map((l) => l.employee_name).sort();

describe("GET /api/calendar (US-7 team calendar)", () => {
  test("each role sees the right people: own / team / everyone", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const dilini = await loginAs(DILINI);
    const a = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-10" });
    await decide(ruwan, a.body.id, "approve");
    await apply(ruwan, { start_date: "2026-03-12", end_date: "2026-03-12" });
    await apply(dilini, { start_date: "2026-03-16", end_date: "2026-03-16" });

    expect(names(await calendar(ishara, "2026-03"))).toEqual(["Ishara Fernando"]);
    expect(names(await calendar(ruwan, "2026-03"))).toEqual(["Ishara Fernando", "Ruwan Jayasuriya"]);
    expect(names(await calendar(dilini, "2026-03"))).toEqual([
      "Dilini Weerasinghe", "Ishara Fernando", "Ruwan Jayasuriya",
    ]);
  });

  test("shows PENDING and APPROVED with their status; cancelled leave is not absence", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const approved = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    await decide(ruwan, approved.body.id, "approve");
    await apply(ishara, { start_date: "2026-03-10", end_date: "2026-03-10", day_part: "AM" });
    const cancelled = await apply(ishara, { start_date: "2026-03-11", end_date: "2026-03-11" });
    await decide(ishara, cancelled.body.id, "cancel");

    const res = await calendar(ishara, "2026-03");
    expect(res.status).toBe(200);
    expect(res.body.leave.map((l) => [l.start_date, l.status, l.day_part])).toEqual([
      ["2026-03-09", "APPROVED", "FULL"],
      ["2026-03-10", "PENDING", "AM"],
    ]);
    expect(res.body.leave[0].leave_type).toBe("Annual");
    expect(Number(res.body.leave[0].days)).toBe(1);
  });

  test("a request crossing a month boundary appears in both months", async () => {
    const ishara = await loginAs(ISHARA);
    await apply(ishara, { start_date: "2026-03-30", end_date: "2026-04-02" });
    expect((await calendar(ishara, "2026-03")).body.leave).toHaveLength(1);
    expect((await calendar(ishara, "2026-04")).body.leave).toHaveLength(1);
    expect((await calendar(ishara, "2026-05")).body.leave).toHaveLength(0);
  });

  test("includes the month's public holidays and its first/last day", async () => {
    const ishara = await loginAs(ISHARA);
    const res = await calendar(ishara, "2026-05");
    expect(res.body).toMatchObject({ month: "2026-05", first: "2026-05-01", last: "2026-05-31" });
    expect(res.body.holidays.map((h) => h.holiday_date)).toContain("2026-05-01"); // Vesak
    expect(res.body.holidays.every((h) => h.holiday_date.startsWith("2026-05"))).toBe(true);
  });

  test("February knows its length, including leap years", async () => {
    const ishara = await loginAs(ISHARA);
    expect((await calendar(ishara, "2026-02")).body.last).toBe("2026-02-28");
    expect((await calendar(ishara, "2028-02")).body.last).toBe("2028-02-29");
  });

  test("a bad month is a 400 and no token is a 401", async () => {
    const ishara = await loginAs(ISHARA);
    expect((await calendar(ishara, "2026-13")).status).toBe(400);
    expect((await calendar(ishara, "march")).status).toBe(400);
    expect((await calendar(null, "2026-03")).status).toBe(401);
  });

  test("defaults to the current month", async () => {
    const ishara = await loginAs(ISHARA);
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect((await calendar(ishara)).body.month).toBe(expected);
  });
});
