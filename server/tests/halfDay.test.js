const { app, request, loginAs, apply, decide, ISHARA, RUWAN } = require("./helpers");

async function balance(token, leaveTypeId = 1) {
  const res = await request(app).get("/api/balances").set("Authorization", `Bearer ${token}`);
  const row = res.body.find((b) => b.id === leaveTypeId);
  return { used: Number(row.used_days), reserved: Number(row.reserved_days) };
}

describe("half-day requests (CS-1, CS-2)", () => {
  test("a PM half day is created with 0.5 days and shows as reserved", async () => {
    const ishara = await loginAs(ISHARA);
    const res = await apply(ishara, { start_date: "2026-10-09", end_date: "2026-10-09", day_part: "PM" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ day_part: "PM", days: "0.5", status: "PENDING" });
    expect(await balance(ishara)).toEqual({ used: 0, reserved: 0.5 });
  });

  test("approving a half day deducts exactly 0.5 (14 → 13.5)", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const { body } = await apply(ishara, { start_date: "2026-10-09", end_date: "2026-10-09", day_part: "AM" });

    await decide(ruwan, body.id, "approve");

    expect(await balance(ishara)).toEqual({ used: 0.5, reserved: 0 });
  });

  test("cancelling a pending half day gives the 0.5 back", async () => {
    const ishara = await loginAs(ISHARA);
    const { body } = await apply(ishara, { start_date: "2026-10-09", end_date: "2026-10-09", day_part: "PM" });
    expect((await balance(ishara)).reserved).toBe(0.5);

    await decide(ishara, body.id, "cancel");

    expect(await balance(ishara)).toEqual({ used: 0, reserved: 0 });
  });

  test("a half day across two dates is a 400", async () => {
    const ishara = await loginAs(ISHARA);
    const res = await apply(ishara, { start_date: "2026-10-08", end_date: "2026-10-09", day_part: "AM" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/single date/);
  });

  test("an unknown day_part is a 400", async () => {
    const ishara = await loginAs(ISHARA);
    const res = await apply(ishara, { start_date: "2026-10-09", end_date: "2026-10-09", day_part: "EVENING" });
    expect(res.status).toBe(400);
  });

  test("AM and PM on the same date are both allowed; a second AM is 409", async () => {
    const ishara = await loginAs(ISHARA);
    const am = await apply(ishara, { start_date: "2026-10-09", end_date: "2026-10-09", day_part: "AM" });
    const pm = await apply(ishara, { start_date: "2026-10-09", end_date: "2026-10-09", day_part: "PM" });
    const am2 = await apply(ishara, { start_date: "2026-10-09", end_date: "2026-10-09", day_part: "AM" });

    expect(am.status).toBe(201);
    expect(pm.status).toBe(201);
    expect(am2.status).toBe(409);
    expect(am2.body.error.code).toBe("OVERLAPPING_REQUEST");
  });

  test("a full day overlapping a half day on the same date is 409", async () => {
    const ishara = await loginAs(ISHARA);
    await apply(ishara, { start_date: "2026-10-09", end_date: "2026-10-09", day_part: "AM" });
    const full = await apply(ishara, { start_date: "2026-10-08", end_date: "2026-10-09" });
    expect(full.status).toBe(409);
  });

  test("managers see AM/PM and the day count in their inbox (CS-5)", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    await apply(ishara, { start_date: "2026-10-09", end_date: "2026-10-09", day_part: "PM" });
    const res = await request(app).get("/api/team/requests").set("Authorization", `Bearer ${ruwan}`);
    expect(res.body[0]).toMatchObject({ day_part: "PM", days: "0.5" });
  });
});

describe("working-day rules (CS-4)", () => {
  test("a half day on a public holiday is refused with NO_WORKING_DAYS", async () => {
    const ishara = await loginAs(ISHARA);
    const res = await apply(ishara, { start_date: "2026-05-01", end_date: "2026-05-01", day_part: "AM" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_WORKING_DAYS");
  });

  test("a weekend-only request is refused with NO_WORKING_DAYS", async () => {
    const ishara = await loginAs(ISHARA);
    const res = await apply(ishara, { start_date: "2026-10-10", end_date: "2026-10-11" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_WORKING_DAYS");
  });

  test("Fri–Tue over a holiday Monday stores and deducts 2 days", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    // Fri 26 Jun, (Sat, Sun), Mon 29 Jun poya, Tue 30 Jun → Fri + Tue = 2.
    const { body } = await apply(ishara, { start_date: "2026-06-26", end_date: "2026-06-30" });
    expect(body.days).toBe("2.0");
    await decide(ruwan, body.id, "approve");
    expect((await balance(ishara)).used).toBe(2);
  });

  test("pending days count toward the balance check", async () => {
    const ishara = await loginAs(ISHARA);
    // Casual = 7. Reserve 5, then ask for 3 more → only 2 left.
    await apply(ishara, { leave_type_id: 2, start_date: "2026-10-12", end_date: "2026-10-16" });
    const res = await apply(ishara, { leave_type_id: 2, start_date: "2026-10-19", end_date: "2026-10-21" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INSUFFICIENT_BALANCE");
  });
});
