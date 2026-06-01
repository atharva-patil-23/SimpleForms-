/**
 * Open-redirect guard tests (CSO Finding 1). Pins down that only same-site
 * relative paths survive; every cross-host trick falls back to /dashboard.
 */
import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/safe-redirect";

describe("safeNext", () => {
  it("allows same-site relative paths", () => {
    expect(safeNext("/dashboard")).toBe("/dashboard");
    expect(safeNext("/forms/abc/results")).toBe("/forms/abc/results");
  });

  it("blocks the userinfo trick (@evil.com → app.com@evil.com)", () => {
    expect(safeNext("@evil.com")).toBe("/dashboard");
  });

  it("blocks scheme-relative and backslash hosts", () => {
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
  });

  it("blocks absolute URLs and junk", () => {
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("javascript:alert(1)")).toBe("/dashboard");
    expect(safeNext("evil.com")).toBe("/dashboard");
  });

  it("defaults when missing", () => {
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext(undefined)).toBe("/dashboard");
    expect(safeNext("")).toBe("/dashboard");
  });
});
