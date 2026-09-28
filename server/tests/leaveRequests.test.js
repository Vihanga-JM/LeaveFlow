const { app, request, loginAs, apply, ISHARA, DILINI } = require("./helpers");

describe("POST /api/leave-requests", () => {
  test("creates a PENDING request for a valid submission", async () => {
    const token = await loginAs(ISHARA);
    const res = await apply(token, { start_date: "2026-03-09", end_date: "2026-03-13" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("PENDING");
  });

  test("returns dates exactly as submitted (no timezone shift)", async () => {
    const token = await loginAs(ISHARA);
    const res = await apply(token, { start_date: "2026-03-09", end_date: "2026-03-10" });
    expect(res.body.start_date).toBe("2026-03-09");
    expect(res.body.end_date).toBe("2026-03-10");
  });

  test("rejects end_date before start_date with 400", async () => {
    const token = await loginAs(ISHARA);
    const res = await apply(token, { start_date: "2026-03-06", end_date: "2026-03-02" });
    expect(res.status).toBe(400);
  });

  test("rejects a badly formatted date with 400 naming the field", async () => {
    const token = await loginAs(ISHARA);
    const res = await apply(token, { start_date: "2026-03-06", end_date: "next week" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/^end_date/);
  });

  test("rejects an unknown leave type with 400 BAD_TYPE", async () => {
    const token = await loginAs(ISHARA);
    const res = await apply(token, { leave_type_id: 99, start_date: "2026-03-09", end_date: "2026-03-09" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_TYPE");
  });

  test("refuses more days than the allocation with 409 INSUFFICIENT_BALANCE", async () => {
    const token = await loginAs(ISHARA);
    // Casual allocation is 7; this span is 10 working days.
    const res = await apply(token, { leave_type_id: 2, start_date: "2026-03-09", end_date: "2026-03-20" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INSUFFICIENT_BALANCE");
  });

  test("refuses an overlapping request with 409 OVERLAPPING_REQUEST", async () => {
    const token = await loginAs(ISHARA);
    await apply(token, { start_date: "2026-03-09", end_date: "2026-03-11" });
    const res = await apply(token, { start_date: "2026-03-11", end_date: "2026-03-12" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("OVERLAPPING_REQUEST");
  });

  test("rejects a missing token with 401", async () => {
    const res = await request(app).post("/api/leave-requests").send({});
    expect(res.status).toBe(401);
  });
});

describe("GET /api/leave-requests", () => {
  test("an employee sees only their own requests; HR sees everyone's", async () => {
    const ishara = await loginAs(ISHARA);
    const dilini = await loginAs(DILINI);
    await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-09" });
    await apply(dilini, { start_date: "2026-03-10", end_date: "2026-03-10" });

    const mine = await request(app).get("/api/leave-requests").set("Authorization", `Bearer ${ishara}`);
    const all = await request(app).get("/api/leave-requests").set("Authorization", `Bearer ${dilini}`);

    expect(mine.body).toHaveLength(1);
    expect(all.body).toHaveLength(2);
  });
});
