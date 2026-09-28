const { app, request, loginAs, ISHARA, RUWAN } = require("./helpers");

describe("authentication", () => {
  test("login returns a token and the user without the password hash", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: ISHARA, password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toEqual({ id: 2, name: "Ishara Fernando", role: "EMPLOYEE" });
  });

  test("wrong password and unknown email give the same 401", async () => {
    const wrongPw = await request(app).post("/api/auth/login").send({ email: ISHARA, password: "nope" });
    const noUser = await request(app).post("/api/auth/login").send({ email: "ghost@ceylonroots.lk", password: "nope" });
    expect(wrongPw.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPw.body).toEqual(noUser.body);
  });

  test("no token → 401 NO_TOKEN; forged token → 401 BAD_TOKEN", async () => {
    const none = await request(app).get("/api/me");
    const forged = await request(app).get("/api/me").set("Authorization", "Bearer garbage");
    expect(none.body.error.code).toBe("NO_TOKEN");
    expect(forged.body.error.code).toBe("BAD_TOKEN");
  });

  test("GET /api/me returns the logged-in user", async () => {
    const token = await loginAs(ISHARA);
    const res = await request(app).get("/api/me").set("Authorization", `Bearer ${token}`);
    expect(res.body.email).toBe(ISHARA);
  });
});

describe("role-gated endpoints", () => {
  test("/api/team/requests is 403 for an EMPLOYEE, 200 for a MANAGER", async () => {
    const ishara = await loginAs(ISHARA);
    const ruwan = await loginAs(RUWAN);
    const asEmployee = await request(app).get("/api/team/requests").set("Authorization", `Bearer ${ishara}`);
    const asManager = await request(app).get("/api/team/requests").set("Authorization", `Bearer ${ruwan}`);
    expect(asEmployee.status).toBe(403);
    expect(asManager.status).toBe(200);
  });

  test("/api/admin/requests lists every request with names for HR_ADMIN", async () => {
    const dilini = await loginAs("dilini@ceylonroots.lk");
    const ishara = await loginAs(ISHARA);
    await request(app).post("/api/leave-requests").set("Authorization", `Bearer ${ishara}`)
      .send({ leave_type_id: 1, start_date: "2026-03-09", end_date: "2026-03-09" });
    const res = await request(app).get("/api/admin/requests").set("Authorization", `Bearer ${dilini}`);
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ employee_name: "Ishara Fernando", leave_type: "Annual" });
  });

  test("/api/admin/requests is 403 for a MANAGER", async () => {
    const ruwan = await loginAs(RUWAN);
    const res = await request(app).get("/api/admin/requests").set("Authorization", `Bearer ${ruwan}`);
    expect(res.status).toBe(403);
  });

  test("unknown endpoints return the JSON 404 shape", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
