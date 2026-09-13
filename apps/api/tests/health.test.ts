import { afterAll, describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";

describe("health endpoint", () => {
  const { app } = createServer();
  it("reports service health", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
  afterAll(async () => app.close());
});
