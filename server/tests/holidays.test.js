const pool = require("../src/db/pool");
const { app, request, loginAs, apply, decide, balanceOf, ISHARA, RUWAN, DILINI } = require("./helpers");

const TEST_DATE = "2026-03-11"; // a Wednesday with no seeded holiday

afterEach(async () => {
  // public_holidays is seed data, not truncated per test — undo what we add.
  await pool.query("DELETE FROM public_holidays WHERE holiday_date = $1", [TEST_DATE]);
});

function addHoliday(token, body) {
  return request(app).post("/api/holidays").set("Authorization", `Bearer ${token}`).send(body);
}

describe("GET /api/holidays", () => {
  test("any logged-in user reads the year's calendar, including Vesak", async () => {
    const ishara = await loginAs(ISHARA);
    const res = await request(app).get("/api/holidays?year=2026").set("Authorization", `Bearer ${ishara}`);
    expect(res.status).toBe(200);
    expect(res.body).toContainEqual({ holiday_date: "2026-05-01", name: "Vesak Full Moon Poya Day / May Day" });
  });

  test("requires login", async () => {
    const res = await request(app).get("/api/holidays");
    expect(res.status).toBe(401);
  });
});

describe("managing holidays", () => {
  test("HR adds a holiday, sees it, and deletes it", async () => {
    const dilini = await loginAs(DILINI);

    const created = await addHoliday(dilini, { holiday_date: TEST_DATE, name: "Special bank holiday" });
    expect(created.status).toBe(201);

    const list = await request(app).get("/api/holidays?year=2026").set("Authorization", `Bearer ${dilini}`);
    expect(list.body).toContainEqual({ holiday_date: TEST_DATE, name: "Special bank holiday" });

    const del = await request(app).delete(`/api/holidays/${TEST_DATE}`).set("Authorization", `Bearer ${dilini}`);
    expect(del.status).toBe(204);
  });

  test("a second holiday on the same date is 409", async () => {
    const dilini = await loginAs(DILINI);
    await addHoliday(dilini, { holiday_date: TEST_DATE, name: "First" });
    const dup = await addHoliday(dilini, { holiday_date: TEST_DATE, name: "Second" });
    expect(dup.status).toBe(409);
  });

  test("bad input is 400; deleting a missing date is 404", async () => {
    const dilini = await loginAs(DILINI);
    expect((await addHoliday(dilini, { holiday_date: "2026-02-30", name: "x" })).status).toBe(400);
    expect((await addHoliday(dilini, { holiday_date: TEST_DATE, name: "  " })).status).toBe(400);
    const del = await request(app).delete("/api/holidays/2026-08-05").set("Authorization", `Bearer ${dilini}`);
    expect(del.status).toBe(404);
  });

  test("managers and employees cannot add or delete (403)", async () => {
    const ruwan = await loginAs(RUWAN);
    const ishara = await loginAs(ISHARA);
    expect((await addHoliday(ruwan, { holiday_date: TEST_DATE, name: "x" })).status).toBe(403);
    const del = await request(app).delete("/api/holidays/2026-05-01").set("Authorization", `Bearer ${ishara}`);
    expect(del.status).toBe(403);
  });

  test("a holiday HR adds is not deducted from a request made afterwards", async () => {
    const dilini = await loginAs(DILINI);
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    await addHoliday(dilini, { holiday_date: TEST_DATE, name: "Special bank holiday" });

    // Mon 9 – Fri 13 Mar = 5 weekdays, minus Wed 11 = 4.
    const { body } = await apply(ishara, { start_date: "2026-03-09", end_date: "2026-03-13" });
    await decide(ruwan, body.id, "approve");
    expect(await balanceOf(ishara, 1)).toBe(4);
  });
});
