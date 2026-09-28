const request = require("supertest");
const app = require("../src/app");

// Seed users from 002_seed.sql — all share the demo password.
const ISHARA = "ishara@ceylonroots.lk"; // EMPLOYEE, reports to Ruwan
const RUWAN = "ruwan@ceylonroots.lk"; // MANAGER
const DILINI = "dilini@ceylonroots.lk"; // HR_ADMIN

async function loginAs(email) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "password123" });
  return res.body.token;
}

function apply(token, body) {
  return request(app)
    .post("/api/leave-requests")
    .set("Authorization", `Bearer ${token}`)
    .send({ leave_type_id: 1, reason: "Test", ...body });
}

function decide(token, id, action, extra = {}) {
  return request(app)
    .patch(`/api/leave-requests/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ action, ...extra });
}

async function balanceOf(token, leaveTypeId) {
  const res = await request(app)
    .get("/api/balances")
    .set("Authorization", `Bearer ${token}`);
  return Number(res.body.find((b) => b.id === leaveTypeId).used_days);
}

module.exports = { app, request, loginAs, apply, decide, balanceOf, ISHARA, RUWAN, DILINI };
