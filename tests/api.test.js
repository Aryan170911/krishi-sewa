import assert from "assert";
import { spawn } from "child_process";
import { setTimeout as delay } from "timers/promises";

const PORT = 3456;
let proc;
before(async () => {
  proc = spawn("node", ["server.js"], { cwd: "server", env: { ...process.env, PORT: String(PORT) } });
  await delay(2000);
});
after(() => proc && proc.kill());

describe("Krishi Sewa API (Node)", () => {
  it("health", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "ok");
  });
  it("products", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/products`);
    const data = await res.json();
    assert.ok(Array.isArray(data) && data.length >= 6);
  });
  it("create order validation", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [], address: {}, paymentMethod: "cod" })
    });
    assert.equal(res.status, 400);
  });
});
