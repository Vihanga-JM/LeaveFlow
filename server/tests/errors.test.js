const { errorHandler } = require("../src/middleware/errors");
const { loginAs, apply, ISHARA } = require("./helpers");

// Coverage lab: the 500 branch of errorHandler was never executed by any test.
// The bug it was hiding: an impossible calendar date ("2026-02-30") passed the
// YYYY-MM-DD regex, JavaScript silently rolled it to 2 March, and Postgres then
// rejected the INSERT — so the user got "500 Something went wrong", not a 400.

function fakeRes() {
  return {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe("errorHandler", () => {
  test("a 500 hides the internal message from the client", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = fakeRes();
    errorHandler(new Error("relation users does not exist"), {}, res, () => {});
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: { code: "INTERNAL", message: "Something went wrong" } });
    expect(spy).toHaveBeenCalled(); // but it is logged for us
    spy.mockRestore();
  });

  test("a deliberate 4xx keeps its code and message", () => {
    const err = Object.assign(new Error("Nope"), { status: 409, code: "INVALID_STATE" });
    const res = fakeRes();
    errorHandler(err, {}, res, () => {});
    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: { code: "INVALID_STATE", message: "Nope" } });
  });
});

describe("impossible calendar dates", () => {
  test("30 February is a 400, not a 500", async () => {
    const token = await loginAs(ISHARA);
    const res = await apply(token, { start_date: "2026-02-30", end_date: "2026-03-02" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/^start_date/);
  });
});
